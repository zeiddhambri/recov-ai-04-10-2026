import { Router } from 'express';
import { db } from '../db/dataStore';
import { audit } from '../auth';
import { scopedDossiers } from '../db/repo';
import { validate, leasingImportSchema, factoringInvoiceSchema, lawyerBailiffSchema } from '../validation';
import { redactForPrompt } from '../redact';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// ==========================================
// 1. LEASING PORTFOLIO
// ==========================================

// GET all leasing contracts
router.get('/leasing', (req, res) => {
  const { status, search, asset_type } = req.query;
  let list = [...db.getLeasing()];

  if (status && status !== 'all') {
    list = list.filter(c => c.status === status);
  }

  if (asset_type && asset_type !== 'all') {
    list = list.filter(c => c.asset?.type === asset_type);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(c =>
      c.contract_ref.toLowerCase().includes(q) ||
      (c.lessee?.name || '').toLowerCase().includes(q) ||
      (c.asset?.description || '').toLowerCase().includes(q)
    );
  }

  res.json({
    count: list.length,
    data: list
  });
});

// GET leasing statistics
router.get('/leasing/stats', (req, res) => {
  const contracts = db.getLeasing();
  const totalFinanced = contracts.reduce((acc, c) => acc + (c.financials?.totalFinanced || 0), 0);
  const remainingCapital = contracts.reduce((acc, c) => acc + (c.financials?.remainingCapital || 0), 0);
  const overdueTotal = contracts.reduce((acc, c) => acc + (c.financials?.overdueAmount || 0), 0);
  const lateContractsCount = contracts.filter(c => c.status === 'late' || c.status === 'litigation' || c.status === 'recovery').length;

  res.json({
    totalContracts: contracts.length,
    totalFinanced,
    remainingCapital,
    overdueTotal,
    lateContractsCount,
    parRate: totalFinanced > 0 ? ((overdueTotal / totalFinanced) * 100).toFixed(2) + '%' : '0%'
  });
});

// GET single leasing contract by ID
router.get('/leasing/:id', (req, res) => {
  const contracts = db.getLeasing();
  const contract = contracts.find(c => c.id === req.params.id || c.contract_ref === req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contrat leasing introuvable' });
  }

  res.json(contract);
});

// POST create new leasing contract
router.post('/leasing', (req, res) => {
  const { lessee_name, asset_description, asset_type, asset_value, residual_value, monthly_rent, duration_months, start_date } = req.body;

  if (!lessee_name || !asset_description) {
    return res.status(400).json({ error: 'Le nom du preneur et la description du bien sont obligatoires' });
  }

  const contracts = db.getLeasing();
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 9000 + 1000);
  const contract_ref = req.body.contract_ref || `LSG-${year}-${randomNum}`;

  const acqVal = Number(asset_value) || 100000;
  const resVal = Number(residual_value) || Math.round(acqVal * 0.1);
  const rent = Number(monthly_rent) || Math.round(acqVal / (Number(duration_months) || 48) * 1.15);

  const newContract = {
    id: contract_ref,
    contract_ref,
    lessee: {
      id: `LES-${Date.now()}`,
      name: lessee_name,
      siren: req.body.lessee_id || '0000000',
      contact: req.body.contact || lessee_name,
      phone: req.body.lessee_phone || '+216 71 000 000',
      email: req.body.lessee_email || 'client@leasing.tn',
      address: req.body.address || 'Tunis, Tunisie',
      city: req.body.city || 'Tunis',
      zip: req.body.zip || '1000'
    },
    asset: {
      type: asset_type || 'industrial',
      description: asset_description,
      brand: req.body.asset_brand || 'Standard',
      model: req.body.asset_model || 'Modèle 2024',
      acquisitionValue: acqVal,
      residualValue: resVal
    },
    financials: {
      monthlyRent: rent,
      interestRate: Number(req.body.interest_rate) || 8.5,
      deposit: resVal,
      totalFinanced: acqVal,
      remainingCapital: acqVal,
      overdueAmount: 0,
      overdueDays: 0
    },
    status: 'active',
    portfolio: 'Leasing',
    institution: req.body.institution || 'Tunisie Leasing',
    branch: req.body.branch || 'Tunis Centre',
    startDate: start_date || new Date().toISOString().slice(0, 10),
    maturityDate: req.body.end_date || new Date(Date.now() + 48 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    durationMonths: Number(duration_months) || 48,
    insuranceActive: true,
    riskLevel: 'Faible',
    created_at: new Date().toISOString()
  };

  contracts.unshift(newContract);
  db.save();

  audit('CREATE_LEASING', `Création du contrat de leasing ${contract_ref} (${lessee_name})`, req.auth);

  res.status(201).json(newContract);
});

// POST simulation résiliation anticipée (Early Termination)
router.post('/leasing/:id/early-termination', (req, res) => {
  const contracts = db.getLeasing();
  const contract = contracts.find(c => c.id === req.params.id || c.contract_ref === req.params.id);

  if (!contract) {
    return res.status(404).json({ error: 'Contrat leasing introuvable' });
  }

  const { formula = 'remaining_capital', penaltyRate = 5 } = req.body;
  const remCap = contract.financials?.remainingCapital || 0;
  const overdue = contract.financials?.overdueAmount || 0;
  const monthlyRent = contract.financials?.monthlyRent || 0;

  let indemnity = 0;
  if (formula === 'capital_plus_3rents') {
    indemnity = monthlyRent * 3;
  } else if (formula === 'flat_indemnity') {
    indemnity = remCap * (penaltyRate / 100);
  } else {
    indemnity = remCap * 0.03; // standard 3% BCT
  }

  const totalPayable = remCap + overdue + indemnity;

  res.json({
    contract_ref: contract.contract_ref,
    lessee: contract.lessee.name,
    formula,
    remainingCapital: remCap,
    overdueAmount: overdue,
    indemnity,
    totalPayable,
    recommendation: 'Établir quittance de solde subordonnée au virement irrévocable sous 15 jours.'
  });
});

// ==========================================
// 2. FACTORING (AFFACTURAGE) PORTFOLIO
// ==========================================

// GET factoring debtors & limits
router.get('/factoring/debtors', (req, res) => {
  const debtors = db.getFactoringDebtors();
  res.json({
    count: debtors.length,
    data: debtors
  });
});

// GET factoring invoices
router.get('/factoring/invoices', (req, res) => {
  const { status, debtorId } = req.query;
  let invoices = [...db.getFactoringInvoices()];

  if (status && status !== 'all') {
    invoices = invoices.filter(inv => inv.status === status);
  }

  if (debtorId) {
    invoices = invoices.filter(inv => inv.debtorId === debtorId);
  }

  res.json({
    count: invoices.length,
    data: invoices
  });
});

// POST assign new factoring invoice (Cession de créance)
router.post('/factoring/invoices', (req, res) => {
  const { debtorId, amount, invoiceNumber, dueDate } = req.body;

  if (!debtorId || !amount || !invoiceNumber) {
    return res.status(400).json({ error: 'Débiteur, montant et numéro de facture obligatoires' });
  }

  const debtors = db.getFactoringDebtors();
  const debtor = debtors.find(d => d.id === debtorId);

  if (!debtor) {
    return res.status(404).json({ error: 'Débiteur d\'affacturage introuvable' });
  }

  const amt = Number(amount);
  const financed = Math.round(amt * 0.9); // 90% financed immediately

  const newInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    debtorId: debtor.id,
    debtorName: debtor.name,
    amount: amt,
    financedAmount: financed,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: dueDate || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    status: 'funded',
    overdueDays: 0,
    disputeStatus: 'none'
  };

  debtor.usedLimit = (debtor.usedLimit || 0) + amt;

  db.getFactoringInvoices().unshift(newInvoice);
  db.save();

  audit('FACTORING_INVOICE_FUNDED', `Cession financée ${invoiceNumber} — ${amt.toLocaleString('fr-TN')} TND (débiteur ${debtor.name}, limite consommée ${debtor.usedLimit})`, req.auth);

  res.status(201).json(newInvoice);
});

// ==========================================
// 3. MICROFINANCE PORTFOLIO
// ==========================================

// GET microfinance loans & clients
router.get('/microfinance/loans', async (req, res) => {
  const dossiers = (await scopedDossiers(req.auth?.institution || null)).filter(d => d.portfolio === 'Microfinance');
  res.json({
    count: dossiers.length,
    data: dossiers
  });
});

// ==========================================
// 4. CROSS-PORTFOLIO CONSOLIDATED STATS
// ==========================================
router.get('/stats', async (req, res) => {
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const leasing = db.getLeasing();
  const invoices = db.getFactoringInvoices();

  const totalDossiersAmount = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalLeasingOverdue = leasing.reduce((acc, l) => acc + (l.financials?.overdueAmount || 0), 0);
  const totalFactoringOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0);

  res.json({
    overallExposure: totalDossiersAmount,
    sectorBreakdown: {
      leasing: { count: leasing.length, overdue: totalLeasingOverdue },
      factoring: { count: invoices.length, overdue: totalFactoringOverdue },
      microfinance: { count: dossiers.filter(d => d.portfolio === 'Microfinance').length, active: true }
    },
    riskDistribution: {
      critique: dossiers.filter(d => d.risk_level === 'Critique').length,
      eleve: dossiers.filter(d => d.risk_level === 'Élevé').length,
      moyen: dossiers.filter(d => d.risk_level === 'Moyen').length,
      faible: dossiers.filter(d => d.risk_level === 'Faible').length
    }
  });
});

// ==========================================
// 5. AI PORTFOLIO ANALYSIS
// ==========================================
router.post('/ai-analysis', async (req, res) => {
  const { portfolioType = 'Leasing', riskMetrics } = req.body;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Tu es l'expert en chef du risque de crédit et de recouvrement bancaire pour la Tunisie.
Analyse ce portefeuille: "${portfolioType}".
Métriques fournies (pseudonymisées — lot P1.4): ${redactForPrompt(riskMetrics || {}).text}.
Rédige un avis synthétique structuré en français avec:
1. Diagnostic de vulnérabilité sectorielle (en tenant compte de la conjoncture tunisienne et de la BCT)
2. Détection des signaux faibles de sinistralité
3. Recommandations concrètes de mitigation (renforcement sûretés, action amiable ciblée, rééchelonnement).
Sois concis, direct et professionnel.`;

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
      console.warn('[Gemini AI Portfolio Error]', error.message);
    }
  }

  // Fallback honnête : texte de démonstration explicitement marqué.
  res.json({
    demoFallback: true,
    analysis: `> ⚠️ **Texte de démonstration** — aucun modèle d'analyse n'a été exécuté (clé GEMINI_API_KEY non configurée). Outil d'aide à la décision uniquement.

### Diagnostic Stratégique du Portefeuille ${portfolioType}

1. **Vulnérabilité Sectorielle**:
Le portefeuille affiche une sensibilité accrue aux délais de paiement dans les secteurs BTP et sous-traitance industrielle. Le taux de retard moyen s'établit à 42 jours, en ligne avec la médiane du secteur financier tunisien.

2. **Signaux Faibles & Concentration**:
- Concentration sur les tranches d'impayés 60-90 jours requérant une bascule immédiate en pré-contentieux.
- Dégradation modérée de la couverture par les sûretés réelles sur le segment matériel roulant.

3. **Recommandations d'Action Immédiate**:
- Lancer un plan d'apurement négocié pour les créances entre 20k et 100k TND avec protocole transactionnel notifié.
- Automatiser les notifications SMS préventives à J-3 pour réduire les incidents techniques d'échéance.
- Exiger la revalidation des cautions solidaires des dirigeants.`,
    source: 'recovai-risk-engine-v2',
    timestamp: new Date().toISOString()
  });
});

export default router;
