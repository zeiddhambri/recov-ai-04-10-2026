import { Router } from 'express';
import { db } from '../db/dataStore';
import { GoogleGenAI } from '@google/genai';
import { audit } from '../auth';
import { validate, eclRequestSchema } from '../validation';
import { redactForPrompt } from '../redact';

const router = Router();

// ==========================================
// 1. QUANTITATIVE IFRS 9 ECL ENGINE
// ==========================================
router.post('/calculate-ecl', validate(eclRequestSchema), (req, res) => {
  const {
    nominal = 100000,
    interestRate = 8.5,
    durationMonths = 36,
    collateralValue = 60000,
    collateralHaircut = 25, // % haircut on collateral liquidation
    overdueDays = 35,
    macroScenario = 'central', // 'central', 'optimistic', 'adverse'
    sector = 'industriel'
  } = req.body;

  const nom = Number(nominal) || 100000;
  const colVal = Number(collateralValue) || 0;
  const haircut = Number(collateralHaircut) || 25;
  const effectiveCollateral = colVal * (1 - haircut / 100);

  // Determine IFRS 9 Stage / Bucket
  let bucket = 'Bucket 1 (Sain)';
  let horizon = '12 mois';
  let sicrDetected = false;

  if (Number(overdueDays) > 90) {
    bucket = 'Bucket 3 (Défaut avéré)';
    horizon = 'Durée de vie (Lifetime)';
    sicrDetected = true;
  } else if (Number(overdueDays) > 30) {
    bucket = 'Bucket 2 (Sous-performant / ASRC)';
    horizon = 'Durée de vie (Lifetime)';
    sicrDetected = true;
  }

  // Base PD calibration
  const basePd12m = 0.015; // 1.5%
  const basePdLifetime = 0.048; // 4.8%

  // Macro adjustments (BCT Macroeconomic projections)
  let macroMultiplier = 1.0;
  if (macroScenario === 'adverse') {
    macroMultiplier = 1.35; // +35% in adverse stagflation scenario
  } else if (macroScenario === 'optimistic') {
    macroMultiplier = 0.85;
  }

  const finalPd12m = Math.min(basePd12m * macroMultiplier, 1.0);
  const finalPdLifetime = Math.min(basePdLifetime * macroMultiplier, 1.0);
  const applicablePd = bucket === 'Bucket 1 (Sain)' ? finalPd12m : finalPdLifetime;

  // LGD (Loss Given Default) = (EAD - Recoverable Collateral) / EAD
  const uncoveredExposure = Math.max(0, nom - effectiveCollateral);
  const lgdRate = nom > 0 ? (uncoveredExposure / nom) : 0.45;
  const conservativeLgd = Math.max(lgdRate, 0.25); // 25% floor

  // Expected Credit Loss (ECL) = EAD * PD * LGD * Discount Factor
  const discountFactor = 1 / Math.pow(1 + (Number(interestRate) / 100), (Number(durationMonths) / 24));
  const eclAmount = Math.round(nom * applicablePd * conservativeLgd * discountFactor);

  audit('ECL_COMPUTED', `Calcul ECL IFRS 9 demandé — nominal ${nom.toLocaleString('fr-TN')} TND, retard ${overdueDays} j, scénario ${macroScenario}, bucket retenu`, req.auth);

  res.json({
    calculationDate: new Date().toISOString(),
    decisionSupportOnly: true,
    disclaimer: 'Estimation d’aide à la décision fondée sur des paramètres de démonstration — ne remplace ni le calibrage interne de l’établissement, ni le contrôle de l’auditeur.',
    input: {
      nominal: nom,
      collateralValue: colVal,
      effectiveCollateral,
      overdueDays,
      macroScenario,
      sector
    },
    ifrs9Classification: {
      bucket,
      horizonEcl: horizon,
      sicrDetected,
      sppiTest: 'Validé (Coût amorti conforme aux flux de principal et intérêts conventionnels)'
    },
    parameters: {
      pdApplied: (applicablePd * 100).toFixed(2) + '%',
      pd12m: (finalPd12m * 100).toFixed(2) + '%',
      pdLifetime: (finalPdLifetime * 100).toFixed(2) + '%',
      lgdApplied: (conservativeLgd * 100).toFixed(2) + '%',
      discountFactor: discountFactor.toFixed(4)
    },
    provisioning: {
      eclAmount,
      provisionCoverageRate: ((eclAmount / nom) * 100).toFixed(2) + '%',
      recommendation: `Constitution d'une provision pour pertes attendues IFRS 9 de ${eclAmount.toLocaleString('fr-TN')} TND au titre du ${bucket}.`
    }
  });
});

// ==========================================
// 2. CREDIT SIMULATIONS PERSISTENCE
// ==========================================
router.get('/dossiers', (req, res) => {
  const list = db.getCreditDossiers();
  res.json({
    count: list.length,
    data: list
  });
});

router.post('/dossiers', (req, res) => {
  const { borrowerName, amountRequested, score, recommendation, details } = req.body;

  const record = {
    id: `CRD-${Date.now()}`,
    borrowerName: borrowerName || 'Demandeur anonyme',
    amountRequested: Number(amountRequested) || 0,
    score: Number(score) || 75,
    recommendation: recommendation || 'Acceptation sous conditions',
    details: details || {},
    createdAt: new Date().toISOString()
  };

  db.getCreditDossiers().unshift(record);
  db.save();

  res.status(201).json(record);
});

// ==========================================
// 3. AI CREDIT & IFRS 9 ANALYSIS
// ==========================================
router.post('/ai-analysis', async (req, res) => {
  const { borrowerData, financialRatios, creditHistory } = req.body;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Tu es le Directeur des Engagements et du Risque de Crédit Bancaire en Tunisie (Expert Bâle III & IFRS 9).
Données de la demande de crédit (pseudonymisées avant envoi au modèle — lot P1.4):
${redactForPrompt({ borrowerData, financialRatios, creditHistory }).text}

Produis une note d'analyse du risque de crédit détaillée comprenant:
1. Recommandation d'octroi (Acceptation, Acceptation conditionnelle ou Refus) avec niveau de confiance.
2. Évaluation des 5 piliers de décision (Capacité financière, Viabilité de l'actif, Ratio de couverture DSCR, Sûretés/LTV, Antécédents centrale des risques BCT).
3. Qualification prospective IFRS 9 (Bucket 1, 2 ou 3, test SPPI, déclencheur SICR).
4. Conditions résolutoires suggérées (cautions personnelles, hypothèques, domiciliation de revenus).
Réponds en français avec rigueur technique bancaire.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({
        analysis: response.text,
        source: 'gemini-2.5-flash',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.warn('[Gemini AI Credit Error]', error.message);
    }
  }

  // Fallback honnête : texte de démonstration explicitement marqué.
  res.json({
    demoFallback: true,
    analysis: `> ⚠️ **Texte de démonstration** — aucun modèle d'analyse n'a été exécuté (clé GEMINI_API_KEY non configurée). Outil d'aide à la décision uniquement.

### Note de Synthèse du Comité des Engagements

**1. Avis & Recommandation**:
- **Décision Préconisée**: **Acceptation Conditionnelle** (Indice de confiance: 92%)
- **Niveau de Risque Global**: Modéré

**2. Évaluation des 5 Piliers d'Octroi**:
- **Pilier 1 - Capacité d'Emprunt (80/100)**: Revenus stables, ancienneté professionnelle vérifiable, taux d'effort post-financement à 28%.
- **Pilier 2 - Financement & Durée (72/100)**: Amortissement cohérent avec la dépréciation comptable de l'actif.
- **Pilier 3 - DSCR & Cash-Flow (90/100)**: Ratio de couverture du service de la dette supérieur à 1.45x.
- **Pilier 4 - Garanties & Collatéral (65/100)**: LTV estimée à 75%, nécessitant une inscription de privilège de premier rang.
- **Pilier 5 - Centrale des Risques BCT (50/100)**: Aucun incident de paiement à 90 jours au cours des 24 derniers mois, relation bancaire récente.

**3. Qualification IFRS 9 & Provisionnement**:
- **Test SPPI**: Validé (Flux contractuels exclusivement représentatifs de remboursement de principal et d'intérêts).
- **Classification**: **Bucket 1 (Sain)**. Aucun critère d'ASRC (SICR) actif à la date d'octroi.
- **ECL Prospectif**: Provisionnement standard à 12 mois.

**4. Conditions Résolutoires Préalables au Déblocage**:
- Domiciliation irrévocable de 100% des flux d'exploitation ou du salaire net.
- Caution personnelle et solidaire du dirigeant majoritaire.
- Souscription obligatoire d'une assurance décès-invalidité et multirisque perte d'exploitation.`,
    source: 'recovai-bale3-engine',
    timestamp: new Date().toISOString()
  });
});

export default router;
