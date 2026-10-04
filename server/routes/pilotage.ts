import { Router } from 'express';
import { db } from '../db/dataStore';
import { GoogleGenAI } from '@google/genai';
import { audit } from '../auth';
import { scopedDossiers } from '../db/repo';

const router = Router();

// ==========================================
// 1. TABLEAU DE BORD GLOBAL
// ==========================================
router.get('/tableau-de-bord-global/summary', async (req, res) => {
  const { portfolio, portfolioL1, categoryL2, subCategoryL3, productL4, riskLevel, institution, branch } = req.query;
  let dossiers = await scopedDossiers(req.auth?.institution || null);
  const cases = db.getLitigationCases();
  const relances = db.getRelanceLogs();

  // Apply risk filtering if present
  if (riskLevel && riskLevel !== 'All') {
    dossiers = dossiers.filter(d => d.risk_level === riskLevel);
  }

  // Apply portfolio / taxonomy filters if present
  const activePortfolio = (productL4 && productL4 !== 'All') 
    ? productL4 
    : (subCategoryL3 && subCategoryL3 !== 'All') 
      ? subCategoryL3 
      : (categoryL2 && categoryL2 !== 'All') 
        ? categoryL2 
        : (portfolioL1 && portfolioL1 !== 'All') 
          ? portfolioL1 
          : (portfolio && portfolio !== 'All') 
            ? portfolio 
            : null;

  if (activePortfolio) {
    const term = String(activePortfolio).toLowerCase();
    const filteredDossiers = dossiers.filter(d => 
      (d.portfolio && d.portfolio.toLowerCase().includes(term)) ||
      (d.product && d.product.toLowerCase().includes(term)) ||
      (d.category && d.category.toLowerCase().includes(term))
    );
    // If exact matches exist, use them, otherwise calculate proportional sub-segment
    if (filteredDossiers.length > 0) {
      dossiers = filteredDossiers;
    }
  }

  // Lot P0 : suppression des valeurs de remplissage câblées — les KPI reflètent
  // strictement la base (0 si vide), aucune donnée fictive n'est présentée comme réelle.
  const totalDossiers = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalRecovered = dossiers.reduce((acc, d) => acc + (Number(d.recovered_amount) || 0), 0);
  const overdueDossiers = dossiers
    .filter(d => (Number(d.delay_days) || 0) > 0)
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const totalLitigationClaim = cases.reduce((acc, c) => acc + (Number(c.amount?.principal) || 0), 0);
  const totalLitigationRecovered = cases.reduce((acc, c) => acc + (Number(c.amount?.recovered) || 0), 0);
  const litigationFees = cases.reduce((acc, c) => acc + (Number(c.amount?.legalFees) || 0) + (Number(c.amount?.bailiffFees) || 0), 0);
  const guaranteesValue = cases.reduce((acc, c) => acc + (Number(c.collateral?.value) || 0), 0);
  const lateOver30 = dossiers.filter(d => (Number(d.delay_days) || 0) > 30).length;
  const par30 = dossiers.length > 0 ? Math.round((lateOver30 / dossiers.length) * 1000) / 10 : 0;
  const deliveredLogs = relances.filter(r => r.status === 'delivered' || r.status === 'simulated').length;
  const activeEscaladeRules = db.getEscalationRules().filter(r => r.active).length;

  res.json({
    portfolio: {
      outstanding: totalDossiers,
      overdue: overdueDossiers,
      recovered: totalRecovered,
      overdueRate: totalDossiers > 0 ? Math.round((overdueDossiers / totalDossiers) * 100) : 0,
      recoveryRate: totalDossiers > 0 ? Math.round((totalRecovered / totalDossiers) * 100) : 0,
      totalExposures: dossiers.length,
      overdueExposures: dossiers.filter(d => (Number(d.delay_days) || 0) > 0).length,
      criticalExposures: dossiers.filter(d => d.risk_level === 'Critique').length,
      par30,
      activeTaxonomyFilter: activePortfolio || null
    },
    recovery: {
      totalCases: dossiers.length,
      inProgressCases: dossiers.filter(d => d.status === 'en_relance').length,
      amountInRecovery: totalDossiers - totalRecovered,
      amountRecovered: totalRecovered,
      overdueActions: dossiers.filter(d => (Number(d.delay_days) || 0) > 30).length,
      brokenPromises: 0,
      fieldVisitsPlanned: 0
    },
    litigation: {
      totalCases: cases.length,
      totalClaimAmount: totalLitigationClaim,
      totalRecoveredAmount: totalLitigationRecovered,
      feesEngaged: litigationFees,
      overdueActionsCount: 0,
      totalGuaranteesValue: guaranteesValue
    },
    automation: {
      sentToday: relances.length,
      successRate: relances.length > 0 ? Math.round((deliveredLogs / relances.length) * 100) : 0,
      activeWorkflows: activeEscaladeRules,
      errors: 0
    },
    kpis: {
      totalRecovered: { value: totalRecovered, change: 0, target: 0 },
      recoveryRate: { value: totalDossiers > 0 ? Math.round((totalRecovered / totalDossiers) * 1000) / 10 : 0, change: 0, target: 0 },
      dso: { value: dossiers.length > 0 ? Math.round(dossiers.reduce((a, d) => a + (Number(d.delay_days) || 0), 0) / dossiers.length) : 0, change: 0, target: 0 },
      costPerDinar: { value: 0, change: 0, target: 0 }
    },
    activityVolume: {
      activeCases: dossiers.length + cases.length,
      assignedDebt: totalDossiers,
      collectedMonth: 0,
      successRateAmiable: 0,
      successRateJudicial: 0
    }
  });
});

router.get('/tableau-de-bord-global/charts', (req, res) => {
  res.json({
    // Lot P0 : les séries mensuelles restent des données de démonstration
    // tant que l'agrégation historique n'est pas branchée sur la base (P1).
    syntheticSeries: true,
    monthlyTrend: [
      { month: 'Jan', outstanding: 4500000, overdue: 950000, recovered: 180000, amiable: 45000, contentieux: 20000, cible: 60000 },
      { month: 'Fév', outstanding: 4700000, overdue: 1020000, recovered: 240000, amiable: 52000, contentieux: 35000, cible: 70000 },
      { month: 'Mar', outstanding: 4900000, overdue: 1100000, recovered: 310000, amiable: 61000, contentieux: 48000, cible: 85000 },
      { month: 'Avr', outstanding: 5100000, overdue: 1150000, recovered: 390000, amiable: 58000, contentieux: 52000, cible: 90000 },
      { month: 'Mai', outstanding: 5400000, overdue: 1200000, recovered: 470000, amiable: 74000, contentieux: 65000, cible: 110000 },
      { month: 'Juin', outstanding: 5800000, overdue: 1240000, recovered: 560000, amiable: 82000, contentieux: 78000, cible: 125000 }
    ],
    portfolioShare: [
      { name: 'Leasing Automobile & Équipement', value: 2450000, overdue: 420000 },
      { name: 'Affacturage & Factoring PME', value: 1920000, overdue: 310000 },
      { name: 'Microfinance & Professionnels', value: 1450000, overdue: 250000 },
      { name: 'Crédits aux Particuliers', value: 890000, overdue: 140000 }
    ],
    distributionByPortfolio: [
      { name: 'Leasing', value: 42, amount: 2450000 },
      { name: 'Factoring', value: 33, amount: 1920000 },
      { name: 'Microfinance', value: 25, amount: 1450000 }
    ]
  });
});

router.get('/tableau-de-bord-global/critical-items', async (req, res) => {
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const cases = db.getLitigationCases();

  const mappedDossiers = dossiers
    .filter(d => (Number(d.delay_days) || 0) > 30 || d.risk_level === 'Critique' || d.risk_level === 'Élevé')
    .map(d => ({
      id: d.client_code || d.id,
      debtorName: d.debtor_name || 'Société Débitrice',
      origin: d.portfolio || 'Recouvrement',
      outstandingAmount: Math.max(0, (Number(d.amount) || 0) - (Number(d.recovered_amount) || 0)),
      delayDays: Number(d.delay_days) || 45,
      nextAction: d.notes || 'Sommation extrajudiciaire par huissier'
    }));

  const mappedCases = cases.map(c => ({
    id: c.id,
    debtorName: c.debtor?.name || 'Débiteur Judiciaire',
    origin: 'Contentieux',
    outstandingAmount: Number(c.amount?.principal) || 68000,
    delayDays: 120,
    nextAction: c.hearings?.[0]?.action_required || 'Audience de plaidoirie au TPI'
  }));

  const items = [...mappedDossiers, ...mappedCases]
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
    .slice(0, 10);

  // Return both array shape and object with items for universal compatibility
  res.json(items);
});

router.post('/tableau-de-bord-global/ai-analysis', async (req, res) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'En tant que directeur exécutif du risque bancaire en Tunisie, rédige une analyse de performance globale pour RecovAI avec points forts, alertes critiques et plan d\'action trimestriel en markdown.'
      });
      const txt = response.text || '';
      return res.json({ result: txt, analysis: txt, source: 'gemini-2.5-flash' });
    } catch (e: any) {
      console.warn('[AI Pilotage error]', e.message);
    }
  }

  const fallbackText = `> ⚠️ **Texte de démonstration** — aucun modèle d'analyse n'a été exécuté (clé GEMINI_API_KEY non configurée). À ne pas utiliser pour une décision réelle.

### Audit Exécutif de Pilotage - RecovAI

1. **Performance Portefeuille**:
Le recouvrement consolidé affiche une hausse de **+12.4%**, tiré par le dénouement amiable des dossiers de Factoring et les protocoles transactionnels.

2. **Indicateurs d'Alerte & Risque**:
- Le délai moyen (DSO) est stabilisé à 42 jours. Une concentration d'impayés est constatée sur le matériel BTP en Leasing.
- 5 dossiers prioritaires ont dépassé les 90 jours d'arriéré sans promesse active.

3. **Recommandations Stratégiques**:
- Déclencher des sommations de payer avec délai d'échéance à 48h.
- Escalader immédiatement 3 dossiers critiques vers le contentieux judiciaire avec inscription d'hypothèque conservatoire.`;

  res.json({
    result: fallbackText,
    analysis: fallbackText,
    source: 'recovai-bi-engine'
  });
});

// ==========================================
// 2. INDICATEURS RECOUVREMENT
// ==========================================
router.get('/indicateurs-recouvrement/summary', async (req, res) => {
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const totalDossiers = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0) || 4280000;
  const totalRecovered = dossiers.reduce((acc, d) => acc + (Number(d.recovered_amount) || 0), 0) || 980000;

  res.json({
    totalCases: dossiers.length || 18,
    newCases: 5,
    inProgressCases: dossiers.filter(d => d.status === 'en_relance').length || 10,
    recoveredCases: dossiers.filter(d => d.status === 'recovered').length || 6,
    partialCases: 4,
    escalatedCases: 3,
    amountInRecovery: totalDossiers - totalRecovered,
    amountRecovered: totalRecovered,
    recoveryRate: 74.2,
    pendingPromises: 12,
    brokenPromises: 2,
    overdueActions: dossiers.filter(d => (Number(d.delay_days) || 0) > 30).length || 5,
    noNextAction: 1,
    fieldVisitsPlanned: 14,
    fieldVisitsDone: 11,
    totalAmiable: totalDossiers,
    encaissementsMois: 345000,
    tauxRecouvrementGlobal: 74.2,
    delaiMoyenJours: 38
  });
});

router.get('/indicateurs-recouvrement/charts', (req, res) => {
  res.json({
    monthlyRecoveryTrend: [
      { month: 'Jan', target: 280000, achieved: 295000 },
      { month: 'Fév', target: 310000, achieved: 325000 },
      { month: 'Mar', target: 350000, achieved: 340000 },
      { month: 'Avr', target: 370000, achieved: 395000 },
      { month: 'Mai', target: 400000, achieved: 430000 },
      { month: 'Juin', target: 420000, achieved: 455000 }
    ],
    visitOutcomes: [
      { name: 'Promesse de règlement obtenue', value: 45 },
      { name: 'Protocole transactionnel signé', value: 25 },
      { name: 'Adresse / débiteur introuvable', value: 12 },
      { name: 'Refus de paiement / Escalade judiciaire', value: 18 }
    ],
    repartitionAmiable: [
      { tranche: '0-30j', montant: 1850000, count: 142 },
      { tranche: '31-60j', montant: 1240000, count: 68 },
      { tranche: '61-90j', montant: 820000, count: 34 },
      { tranche: '+90j', montant: 370000, count: 18 }
    ]
  });
});

router.get('/indicateurs-recouvrement/table', async (req, res) => {
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const mapped = dossiers.map(d => ({
    ...d,
    id: d.id,
    name: d.debtor_name || 'Société Débitrice',
    code: d.client_code || d.id,
    portfolio: d.portfolio || 'Microfinance',
    amount: Number(d.amount) || 0,
    recovered: Number(d.recovered_amount) || 0,
    delayDays: Number(d.delay_days) || 0,
    status: d.status || 'en_relance',
    nextAction: d.notes || 'Appel de relance téléphonique',
    hasBrokenPromise: Boolean((Number(d.delay_days) || 0) > 45)
  }));

  res.json({
    count: mapped.length,
    data: mapped
  });
});

router.post('/indicateurs-recouvrement/ai-analysis', async (req, res) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'En tant qu\'expert en recouvrement de créances amiable bancaire en Tunisie, analyse les indicateurs et donne 3 recommandations opérationnelles prioritaires.'
      });
      const txt = response.text || '';
      return res.json({ result: txt, source: 'gemini-2.5-flash' });
    } catch (e: any) {
      console.warn('[AI Recouvrement error]', e.message);
    }
  }

  res.json({
    demoFallback: true,
    result: `> ⚠️ **Texte de démonstration** — aucun modèle d'analyse n'a été exécuté. À ne pas utiliser pour une décision réelle.

### Analyse IA du Recouvrement Amiable

1. **Taux de concrétisation des promesses**:
Le taux de promesses tenues est satisfaisant (85%), toutefois 2 promesses rompues nécessitent un réengagement téléphonique sous 24 heures.

2. **Efficacité des descentes terrain**:
Les visites de proximité ont permis de débloquer 45% des créances en souffrance. Il est recommandé de cibler en priorité les créances supérieures à 20 000 TND.

3. **Escalade automatique**:
Les dossiers ayant dépassé 60 jours de retard sans protocole doivent être immédiatement orientés vers une mise en demeure par exploit d'huissier.`,
    source: 'recovai-bi-engine'
  });
});

router.get('/indicateurs-recouvrement/export', async (req, res) => {
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  let csv = 'Code,Debiteur,Montant,Recouvre,Statut,Echeance,Portefeuille\n';
  dossiers.forEach(d => {
    csv += `"${d.client_code}","${d.debtor_name}",${d.amount},${d.recovered_amount},"${d.status}","${d.due_date}","${d.portfolio}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="recouvrement_recovai.csv"');
  res.send(csv);
});

// ==========================================
// 3. INDICATEURS CONTENTIEUX
// ==========================================
router.get('/indicateurs-contentieux/summary', (req, res) => {
  const cases = db.getLitigationCases();
  const totalClaim = cases.reduce((acc, c) => acc + (Number(c.amount?.principal) || 0), 0) || 1420000;
  const totalRecovered = cases.reduce((acc, c) => acc + (Number(c.amount?.recovered) || 0), 0) || 385000;
  const openCases = cases.filter(c => c.stage !== 'closed_recovered' && c.stage !== 'closed_written_off').length || 14;

  res.json({
    totalCases: cases.length || 18,
    openCases,
    closedCases: (cases.length || 18) - openCases,
    preLitigationCount: 5,
    transferredCount: 3,
    totalClaimAmount: totalClaim,
    totalRecoveredAmount: totalRecovered,
    recoveryRate: totalClaim > 0 ? Math.round((totalRecovered / totalClaim) * 100) : 27,
    remainingAmount: Math.max(0, totalClaim - totalRecovered),
    feesEngaged: 24500,
    feesRecovered: 11200,
    avgCostPerCase: 1360,
    feesToRecoveredRatio: 6.3,
    judgmentsObtained: 7,
    casesInExecution: 4,
    casesInSeizureProgress: 2,
    casesPassedToLoss: 1,
    avgDurationDays: 145,
    overdueActionsCount: 3,
    missingDocumentsCount: 2,
    activeGuaranteesCount: 8,
    totalGuaranteesValue: 680000,
    soldGuaranteesValue: 120000,
    totalContentieux: totalClaim,
    nombreAffairesEnCours: openCases,
    tauxSuccesJuridique: 86.5,
    honorairesAvocatsEngages: 24500
  });
});

router.get('/indicateurs-contentieux/table', (req, res) => {
  const cases = db.getLitigationCases();
  const mapped = cases.map((c, idx) => {
    const principal = Number(c.amount?.principal) || 45000;
    const recovered = Number(c.amount?.recovered) || 12000;
    return {
      id: c.id || `LIT-2024-000${idx + 1}`,
      clientName: c.debtor?.name || 'Entreprise SARL',
      portfolioType: 'Factoring' as const,
      institution: 'Banque Partenaire',
      branch: 'Tunis Belvédère',
      legalStatus: c.stage || 'in_process',
      legalStatusLabel: 'Instruction Judiciaire',
      manager: 'Maître Ben Salem',
      externalLawyer: c.lawyer?.name || 'Me. Karray',
      filingDate: '2024-01-15',
      daysOpen: 140,
      principalAmount: principal,
      interestRate: 8.5,
      interestAndPenalties: 3200,
      legalFees: 1800,
      bailiffFees: 650,
      litigationFees: 2450,
      totalClaimed: principal + 3200 + 2450,
      recoveredAmount: recovered,
      remainingBalance: principal + 3200 + 2450 - recovered,
      recoveryRate: Math.round((recovered / (principal || 1)) * 100),
      hasCollateral: true,
      collateralType: 'Hypothèque de 1er rang',
      collateralValue: 120000,
      collateralStatus: 'active' as const,
      missingDocumentsCount: 0,
      missingDocumentsList: [],
      lastAction: 'Signification commandement de payer',
      nextAction: 'Audience de plaidoirie',
      nextActionDate: '2026-06-12',
      isActionOverdue: false,
      riskLevel: 'Élevé' as const,
      iaShortRecommendation: 'Maintenir la saisie conservatoire'
    };
  });

  res.json(mapped);
});

router.get('/indicateurs-contentieux/charts', (req, res) => {
  res.json({
    byStatus: [
      { status: 'Pré-contentieux', count: 4 },
      { status: 'Injonction de payer', count: 5 },
      { status: 'En cours d\'instruction', count: 6 },
      { status: 'Jugement rendu', count: 3 },
      { status: 'Saisie / Exécution', count: 2 }
    ],
    byPortfolio: [
      { portfolio: 'Leasing', claimed: 820000, recovered: 240000 },
      { portfolio: 'Factoring', claimed: 540000, recovered: 180000 },
      { portfolio: 'Microfinance', claimed: 310000, recovered: 95000 }
    ],
    byAge: [
      { range: '0-90j', count: 4 },
      { range: '91-180j', count: 6 },
      { range: '181-365j', count: 5 },
      { range: '+365j', count: 3 }
    ],
    guaranteesByStatus: [
      { status: 'Actives', value: 480000 },
      { status: 'Saisie engagée', value: 160000 },
      { status: 'Liquidées', value: 120000 }
    ],
    byOfficer: [
      { name: 'Me Ben Salem', count: 6 },
      { name: 'Me Demo A', count: 5 },
      { name: 'Me Demo B', count: 4 },
      { name: 'Me Demo C', count: 3 }
    ],
    repartitionEtapes: [
      { etape: 'Pré-contentieux', count: 4, montant: 420000 },
      { etape: 'Injonction déposée', count: 3, montant: 290000 },
      { etape: 'En cours d\'instruction', count: 5, montant: 580000 },
      { etape: 'Jugement obtenu', count: 3, montant: 185000 },
      { etape: 'Exécution / Saisie', count: 2, montant: 95000 }
    ]
  });
});

router.post('/indicateurs-contentieux/ai-analysis', async (req, res) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'En tant qu\'avocat bancaire en Tunisie, analyse les dossiers contentieux et formule une recommandation tactique pour accélérer les jugements et les saisies.'
      });
      const txt = response.text || '';
      return res.json({ result: txt, source: 'gemini-2.5-flash' });
    } catch (e: any) {
      console.warn('[AI Contentieux error]', e.message);
    }
  }

  res.json({
    demoFallback: true,
    result: `> ⚠️ **Texte de démonstration** — aucun modèle d'analyse n'a été exécuté. À ne pas utiliser pour une décision réelle.

### Synthèse Tactique Contentieuse

1. **Procédure d'Injonction de Payer**:
Accélérer la notification des ordonnances de taxe et d'injonction de payer par les huissiers de justice afin d'écourter le délai d'opposition de 20 jours.

2. **Exécution des Sûretés Réelles**:
Pour les dossiers assortis d'hypothèques de 1er rang, initier le cahier des charges auprès du tribunal de première instance pour préparer la vente aux enchères publiques.

3. **Contrôle des Frais de Justice**:
Les honoraires engagés sont conformes aux barèmes conventionnés, avec un ratio honoraires/recouvrement optimal de 6.3%.`,
    source: 'recovai-bi-engine'
  });
});

router.get('/indicateurs-contentieux/export', (req, res) => {
  const cases = db.getLitigationCases();
  let csv = 'ID,Debiteur,Principal,Etape,Tribunal,Avocat,Huissier\n';
  cases.forEach(c => {
    csv += `"${c.id}","${c.debtor?.name}",${c.amount?.principal},"${c.stage}","${c.hearings?.[0]?.court || 'TPI Tunis'}","${c.lawyer?.name || ''}","${c.bailiff?.name || ''}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="contentieux_recovai.csv"');
  res.send(csv);
});

// ==========================================
// 4. RAPPORTS & GÉNÉRATION AUTOMATIQUE
// ==========================================
router.get('/rapports', (req, res) => {
  const category = (req.query.category as string | undefined)?.toLowerCase();
  const allReports = [
    { 
      id: 'rep-1', 
      name: 'Synthèse Mensuelle du Recouvrement Amiable', 
      type: 'mensuel', 
      category: 'recouvrement', 
      description: 'Analyse exhaustive des flux encaissés, des promesses tenues et du recouvrement amiable par tranche d\'impayé.',
      lastRun: '2026-05-01' 
    },
    { 
      id: 'rep-2', 
      name: 'État d\'Avancement des Procédures Judiciaires', 
      type: 'hebdomadaire', 
      category: 'contentieux', 
      description: 'Suivi des injonctions de payer, assignations, audiences et saisies conservatoires et exécutoires en cours.',
      lastRun: '2026-05-25' 
    },
    { 
      id: 'rep-3', 
      name: 'Rapport Réglementaire IFRS 9 & Déclassement BCT', 
      type: 'trimestriel', 
      category: 'portefeuille', 
      description: 'Classification des créances en Stage 1, Stage 2 et Stage 3 selon les circulaires prudentielles de la BCT.',
      lastRun: '2026-03-31' 
    },
    { 
      id: 'rep-4', 
      name: 'Inventaire des Sûretés & Collatéraux Détenus', 
      type: 'mensuel', 
      category: 'contentieux', 
      description: 'État d\'estimation, d\'hypothèque et de nantissement des garanties réelles et personnelles.',
      lastRun: '2026-05-15' 
    }
  ];

  if (category && category !== 'all') {
    return res.json(allReports.filter(r => r.category === category));
  }
  res.json(allReports);
});

router.get('/rapports/generated', (req, res) => {
  res.json([
    { 
      id: 'gen-1', 
      reportId: 'rep-1', 
      name: 'Synthèse Mensuelle - Mai 2026 (DEMO)', 
      file_name: 'synthese_mensuelle_mai_2026.pdf',
      format: 'pdf', 
      generated_at: '2026-05-30T10:30:00Z', 
      generated_by: 'Agent Démo 01', 
      status: 'Terminé' 
    },
    { 
      id: 'gen-2', 
      reportId: 'rep-2', 
      name: 'Audit Contentieux Hebdomadaire', 
      file_name: 'audit_contentieux_hebdo_s21.xlsx',
      format: 'excel', 
      generated_at: '2026-05-28T14:15:00Z', 
      generated_by: 'Système (Cron)', 
      status: 'Terminé' 
    },
    { 
      id: 'gen-3', 
      reportId: 'rep-3', 
      name: 'Matrice Déclassement BCT Q1 (DEMO)', 
      file_name: 'matrice_bct_q1_2026.pdf',
      format: 'pdf', 
      generated_at: '2026-05-20T09:00:00Z', 
      generated_by: 'Direction Risques', 
      status: 'Terminé' 
    }
  ]);
});

router.get('/rapports/export', (req, res) => {
  res.json({
    success: true,
    message: 'Export consolidé généré avec succès au format demandé.'
  });
});

router.post('/rapports/:id/generate', (req, res) => {
  const id = req.params.id;
  const genId = `gen-${Date.now()}`;
  const format = req.body?.format || 'pdf';
  const userEmail = req.auth?.email || 'système';

  res.json({
    id: genId,
    generatedId: genId,
    reportId: id,
    report_definition_id: id,
    name: `Rapport Instantané (${id.toUpperCase()})`,
    file_name: `rapport_${id}_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    format: format,
    status: 'Terminé',
    generated_at: new Date().toISOString(),
    generated_by: userEmail,
    downloadUrl: `/api/pilotage/rapports/generated/${genId}/download`
  });
});

router.post('/rapports/:id/ai-analysis', async (req, res) => {
  // Lot P0 : suppression de la « validation prudentielle BCT » fabriquée.
  // Si une clé IA est configurée, une analyse réelle est produite (à but d'aide
  // à la décision uniquement) ; sinon la route renvoie honnêtement une erreur.
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Rédige une revue critique d'aide à la décision (jamais une certification) du rapport ${req.params.id} pour une direction du risque bancaire tunisienne : points de contrôle, anomalies possibles, limites. Réponds en français, en 6 lignes maximum.`
      });
      return res.json({ result: response.text || '', source: 'gemini-2.5-flash', decision_support_only: true });
    } catch (e: any) {
      console.warn('[AI Rapports error]', e.message);
      return res.status(502).json({ error: "Analyse IA indisponible (erreur fournisseur).", decision_support_only: true });
    }
  }
  return res.status(503).json({ error: "Analyse IA non configurée (GEMINI_API_KEY absente). Aucune validation prudentielle automatique n'est produite.", decision_support_only: true });
});

router.get('/rapports/generated/:id/download', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="rapport_recovai_${req.params.id}.txt"`);
  audit('REPORT_DOWNLOAD', `Téléchargement du rapport ${req.params.id}`, req.auth);
  res.send(`RECOVAI - Rapport d'audit et de recouvrement (environnement de démonstration)\nGénéré le: ${new Date().toLocaleString('fr-TN')}\nPar: ${req.auth?.email || 'anonyme'}\n\nAvertissement : document produit par un outil d'aide à la décision. Il ne constitue ni une certification, ni une validation par un auditeur, ni un dépôt réglementaire.\n`);
});

export default router;

