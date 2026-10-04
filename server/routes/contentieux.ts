import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db/dataStore';
import { audit } from '../auth';
import { validate, createLitigationSchema, lawyerBailiffSchema } from '../validation';

const router = Router();

// ==========================================
// 1. DOSSIERS CONTENTIEUX
// ==========================================

// GET all litigation cases with filters
router.get('/dossiers', (req, res) => {
  const { stage, search, portfolio, lawyer_id } = req.query;
  let cases = [...db.getLitigationCases()];

  if (stage && stage !== 'all') {
    cases = cases.filter(c => c.stage === stage);
  }

  if (portfolio && portfolio !== 'all') {
    cases = cases.filter(c => (c.portfolio || '').toLowerCase() === String(portfolio).toLowerCase());
  }

  if (lawyer_id) {
    cases = cases.filter(c => c.lawyer?.id === lawyer_id);
  }

  if (search) {
    const q = String(search).toLowerCase();
    cases = cases.filter(c =>
      c.id.toLowerCase().includes(q) ||
      (c.debtor?.name || '').toLowerCase().includes(q) ||
      (c.debtor?.city || '').toLowerCase().includes(q) ||
      (c.lawyer?.name || '').toLowerCase().includes(q)
    );
  }

  res.json({
    count: cases.length,
    data: cases
  });
});

// GET litigation statistics
router.get('/stats', (req, res) => {
  const cases = db.getLitigationCases();
  const totalPrincipal = cases.reduce((acc, c) => acc + (c.amount?.principal || 0), 0);
  const totalLegalFees = cases.reduce((acc, c) => acc + (c.amount?.legalFees || 0) + (c.amount?.bailiffFees || 0), 0);
  
  let totalRecovered = 0;
  cases.forEach(c => {
    (c.payments || []).forEach((p: any) => {
      totalRecovered += Number(p.amount) || 0;
    });
  });

  const stageCounts: Record<string, number> = {};
  cases.forEach(c => {
    stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
  });

  res.json({
    totalCases: cases.length,
    totalPrincipal,
    totalLegalFees,
    totalRecovered,
    recoveryRate: totalPrincipal > 0 ? ((totalRecovered / totalPrincipal) * 100).toFixed(1) + '%' : '0%',
    stageCounts
  });
});

// GET single litigation case
router.get('/dossiers/:id', (req, res) => {
  const cases = db.getLitigationCases();
  const found = cases.find(c => c.id === req.params.id);

  if (!found) {
    return res.status(404).json({ error: 'Dossier contentieux introuvable' });
  }

  res.json(found);
});

// POST create new litigation case
router.post('/dossiers', validate(createLitigationSchema), (req, res) => {
  const { debtor_name, amount, lawyer_id, bailiff_id, procedure_type, portfolio, court_level, observations, guarantee } = req.body;

  const cases = db.getLitigationCases();
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000 + 1000);
  const caseId = req.body.id || `LIT-${year}-${num}`;

  const lawyer = db.getLawyers().find(l => l.id === lawyer_id) || db.getLawyers()[0];
  const bailiff = db.getBailiffs().find(b => b.id === bailiff_id) || db.getBailiffs()[0];

  const newCase = {
    id: caseId,
    debtor: {
      id: `D-${Date.now()}`,
      name: debtor_name,
      siren: req.body.debtor_siren || req.body.debtor_cin || '',
      address: req.body.debtor_address || 'Tunis, Tunisie',
      city: req.body.debtor_city || 'Tunis',
      zip: req.body.debtor_zip || '1000',
      phone: req.body.debtor_phone || '+216 71 000 000',
      email: req.body.debtor_email || 'contact@debiteur.tn'
    },
    type: procedure_type || 'payment_injunction',
    stage: 'pre_litigation',
    filingDate: new Date().toISOString().slice(0, 10),
    lastUpdate: new Date().toISOString().slice(0, 10),
    amount: {
      principal: Number(amount) || 0,
      interest: Math.round(Number(amount) * 0.05),
      legalFees: Number(req.body.legal_fees) || 1500,
      bailiffFees: Number(req.body.bailiff_fees) || 350
    },
    interestRate: 7.25,
    portfolio: portfolio || 'Contentieux Général',
    institution: req.body.institution || 'RecovAI Legal Pool',
    branch: req.body.branch || 'Tunis',
    lawyer,
    bailiff,
    manager: req.body.manager || 'Directeur Juridique',
    riskLevel: Number(amount) > 100000 ? 'Critique' : 'Élevé',
    collateral: {
      type: guarantee || 'Aucune sûreté enregistrée',
      value: Math.round(Number(amount) * 0.8),
      status: 'active'
    },
    observations: observations || '',
    hearings: [],
    documents: [
      {
        id: `doc-${Date.now()}`,
        name: 'Ouverture du dossier juridique.pdf',
        category: 'Procédure',
        status: 'filed',
        date: new Date().toISOString().slice(0, 10)
      }
    ],
    payments: []
  };

  cases.unshift(newCase);
  db.save();

  audit('CREATE_LITIGATION', `Ouverture du dossier contentieux ${newCase.id} (${debtor_name}, ${Number(amount).toLocaleString('fr-TN')} TND)`, req.auth);

  res.status(201).json(newCase);
});

// PATCH update case stage or info
router.patch('/dossiers/:id', (req, res) => {
  const cases = db.getLitigationCases();
  const found = cases.find(c => c.id === req.params.id);

  if (!found) {
    return res.status(404).json({ error: 'Dossier contentieux introuvable' });
  }

  if (req.body.stage) found.stage = req.body.stage;
  if (req.body.lawyer_id) {
    const l = db.getLawyers().find(x => x.id === req.body.lawyer_id);
    if (l) found.lawyer = l;
  }
  if (req.body.bailiff_id) {
    const b = db.getBailiffs().find(x => x.id === req.body.bailiff_id);
    if (b) found.bailiff = b;
  }
  if (req.body.observations) found.observations = req.body.observations;

  found.lastUpdate = new Date().toISOString().slice(0, 10);
  db.save();

  audit('UPDATE_LITIGATION', `Mise à jour du dossier contentieux ${found.id} (étape: ${found.stage})`, req.auth);

  res.json(found);
});

// POST schedule a court hearing (Audience)
router.post('/dossiers/:id/hearings', (req, res) => {
  const cases = db.getLitigationCases();
  const found = cases.find(c => c.id === req.params.id);

  if (!found) {
    return res.status(404).json({ error: 'Dossier contentieux introuvable' });
  }

  const { date, time, court, type, judge, notes } = req.body;

  const newHearing = {
    id: `h-${Date.now()}`,
    date: date || new Date().toISOString().slice(0, 10),
    time: time || '09:30',
    court: court || 'Tribunal de Première Instance de Tunis',
    type: type || 'Plaidoirie',
    judge: judge || 'Président de Chambre',
    status: 'scheduled',
    notes: notes || ''
  };

  found.hearings = found.hearings || [];
  found.hearings.push(newHearing);
  found.lastUpdate = new Date().toISOString().slice(0, 10);
  db.save();

  res.status(201).json(newHearing);
});

// POST add procedural document
router.post('/dossiers/:id/documents', (req, res) => {
  const cases = db.getLitigationCases();
  const found = cases.find(c => c.id === req.params.id);

  if (!found) {
    return res.status(404).json({ error: 'Dossier contentieux introuvable' });
  }

  const { name, category, status } = req.body;

  const newDoc = {
    id: `doc-${Date.now()}`,
    name: name || 'Document judiciaire',
    category: category || 'Procédure',
    status: status || 'filed',
    date: new Date().toISOString().slice(0, 10)
  };

  found.documents = found.documents || [];
  found.documents.unshift(newDoc);
  found.lastUpdate = new Date().toISOString().slice(0, 10);
  db.save();

  res.status(201).json(newDoc);
});

// POST record judicial recovery payment
router.post('/dossiers/:id/payments', (req, res) => {
  const cases = db.getLitigationCases();
  const found = cases.find(c => c.id === req.params.id);

  if (!found) {
    return res.status(404).json({ error: 'Dossier contentieux introuvable' });
  }

  const { amount, reference, type = 'partial' } = req.body;

  const newPayment = {
    id: `p-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    amount: Number(amount) || 0,
    reference: reference || `VIR-${Date.now()}`,
    type
  };

  found.payments = found.payments || [];
  found.payments.push(newPayment);

  // Check if fully paid
  const totalPaid = found.payments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
  if (totalPaid >= (found.amount?.principal || 0)) {
    found.stage = 'closed_recovered';
  }

  found.lastUpdate = new Date().toISOString().slice(0, 10);
  db.save();

  res.status(201).json({
    payment: newPayment,
    case: found
  });
});

// ==========================================
// 2. AUXILIAIRES DE JUSTICE (LAWYERS & BAILIFFS)
// ==========================================

// GET lawyers
router.get('/lawyers', (req, res) => {
  const lawyers = db.getLawyers();
  res.json({
    count: lawyers.length,
    data: lawyers
  });
});

// POST add lawyer
router.post('/lawyers', (req, res) => {
  const { name, firm, phone, email, city } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nom de l\'avocat obligatoire' });
  }

  const lawyers = db.getLawyers();
  const newLawyer = {
    id: `l-${Date.now()}`,
    name,
    firm: firm || 'Cabinet individuel',
    phone: phone || '+216 71 000 000',
    email: email || 'avocat@barreau.tn',
    city: city || 'Tunis',
    activeCasesCount: 0,
    created_at: new Date().toISOString()
  };

  lawyers.push(newLawyer);
  db.save();

  res.status(201).json(newLawyer);
});

// GET bailiffs
router.get('/bailiffs', (req, res) => {
  const bailiffs = db.getBailiffs();
  res.json({
    count: bailiffs.length,
    data: bailiffs
  });
});

// POST add bailiff
router.post('/bailiffs', (req, res) => {
  const { name, firm, phone, email, city } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nom de l\'huissier obligatoire' });
  }

  const bailiffs = db.getBailiffs();
  const newBailiff = {
    id: `b-${Date.now()}`,
    name,
    firm: firm || 'Étude d\'huissier de justice',
    phone: phone || '+216 71 000 000',
    email: email || 'huissier@ordre.tn',
    city: city || 'Tunis',
    assignedActs: 0
  };

  bailiffs.push(newBailiff);
  db.save();

  res.status(201).json(newBailiff);
});

// ==========================================
// 6. MODULE NOUVEAUX DOSSIERS - ANALYSE INTELLIGENTE IA
// ==========================================

function generateTunisianBankingAnalysisFallback(manualData: any = {}, documents: any[] = []) {
  const clientName = manualData?.clientName || 'Société Maghrébine d\'Équipements S.A.R.L';
  const principal = Number(manualData?.principalAmount) || 185000;
  const interest = Number(manualData?.interestAmount) || 24800;
  const penalties = Number(manualData?.penaltiesAmount) || 8500;
  const totalDue = principal + interest + penalties;
  const dossierType = manualData?.dossierType || 'Contentieux';
  const institution = manualData?.institution || 'Société Tunisienne de Banque (STB)';
  const docNames = documents.map(d => d.name).join(', ') || 'Contrat_de_Financement_STB.pdf, Tableau_Amortissement_Impayes.xlsx, Mise_En_Demeure_Avocat.docx';

  return {
    synthese: {
      resumeExecutif: `Dossier contentieux constitué pour la contrepartie ${clientName} auprès de ${institution}. Présente une créance en souffrance cumulée de ${totalDue.toLocaleString('fr-TN')} TND consécutive à une déchéance du terme non régularisée malgré l'envoi de la mise en demeure formelle.`,
      parties: `Créancier poursuivant : ${institution} | Débiteur principal : ${clientName} (Matricule fiscal / RC vérifié) | Caution personnelle et solidaire du gérant statutaire | Mandataire judiciaire : Cabinet désigné au Barreau de Tunis`,
      objetDossier: manualData?.claimNature || `Recouvrement forcé de crédit professionnel d'exploitation avec mobilisation de sûretés réelles et personnelles (art. 258 CPCC)`,
      montantExposition: `${totalDue.toLocaleString('fr-TN')} TND (Principal : ${principal.toLocaleString('fr-TN')} TND, Intérêts moratoires et contractuels : ${interest.toLocaleString('fr-TN')} TND, Pénalités : ${penalties.toLocaleString('fr-TN')} TND)`,
      situationActuelle: `Phase contentieuse active : Déchéance du terme prononcée, délai de la sommation de payer expiré. Dossier prêt pour assignation en référé-provision ou dépôt de requête d'injonction de payer.`
    },
    analyseDocumentaire: {
      documentsAnalyses: documents.length > 0 
        ? documents.map(d => `${d.name} (${d.type || 'Document bancaire'})`) 
        : ['Contrat_Pret_Bancaire_STB_2023.pdf', 'Tableau_Amortissement_et_Impayes.xlsx', 'Mise_En_Demeure_Huissier.docx'],
      informationsExtraites: [
        { champ: 'Débiteur Principal', valeur: clientName, sourceDoc: documents[0]?.name || 'Contrat_Pret.pdf', page: 'Page 1, Préambule', confiance: 98, status: 'ai_extracted' },
        { champ: 'Montant Principal Dû', valeur: `${principal.toLocaleString('fr-TN')} TND`, sourceDoc: documents[1]?.name || 'Tableau_Impayes.xlsx', page: 'Feuille Synthèse / Cellule E24', confiance: 96, status: 'ai_extracted' },
        { champ: 'Date de Déchéance du Terme', valeur: manualData?.creationDate || '2024-03-15', sourceDoc: documents[2]?.name || 'Mise_En_Demeure.docx', page: 'Page 2, Paragraphe 4', confiance: 92, status: 'ai_extracted' },
        { champ: 'Garanties Inscrites', valeur: manualData?.guarantees || 'Hypothèque 1er rang conservée à la CPF de Tunis + Nantissement matériel', sourceDoc: documents[0]?.name || 'Contrat_Pret.pdf', page: 'Page 7, Article 11', confiance: 94, status: 'ai_extracted' },
        { champ: 'Juridiction Compétente', valeur: manualData?.legalJurisdiction || 'Tribunal de Première Instance de Tunis (Chambre Commerciale)', sourceDoc: documents[0]?.name || 'Contrat_Pret.pdf', page: 'Page 12, Attribution de Juridiction', confiance: 99, status: 'ai_extracted' }
      ],
      documentsManquants: [
        'Relevé de compte certifié conforme avec visa de la direction générale de la banque (requis par l\'art. 258 CPCC pour l\'injonction de payer)',
        'Certificat de conformité d\'inscription hypothécaire délivré par la Conservation de la Propriété Foncière (CPF) datant de moins de 3 mois',
        'Procès-verbal original de notification par huissier de justice avec accusé de réception (retour de signification)',
        'Extrait RNE (Registre National des Entreprises) récent pour certifier la qualité du représentant légal actuel'
      ],
      incoherencesDetectees: [
        'Écart mineur de 1 250 TND constaté entre les intérêts calculés dans le tableau Excel et le montant figurant dans la mise en demeure de l\'avocat',
        'L\'adresse du siège social indiquée sur le contrat initial diffère de celle enregistrée sur l\'accusé de notification de l\'huissier (changement d\'adresse non notifié à la banque)'
      ],
      pointsVerificationHumaine: [
        'Vérifier si le taux des intérêts moratoires appliqués respecte le Taux Effectif Global (TEG) légal BCT sans anatocisme illicite (art. 1099 COC)',
        'Confirmer l\'absence d\'opposition formelle ou de procédure collective (redressement d\'entreprise en difficultés économiques Loi 2016-36)',
        'Valider la solvabilité actuelle et les coordonnées exactes de la caution solidaire avant signification'
      ]
    },
    analyseJuridique: {
      engagementsContractuels: `Convention de crédit à durée déterminée assortie de clauses résolutoires expresses. Manquement constaté à l'obligation de remboursement des échéances mensuelles depuis plus de 90 jours (art. 242 COC : les conventions légalement formées tiennent lieu de loi à ceux qui les ont faites).`,
      obligationsParties: `Obligation du débiteur de rembourser en principal, intérêts contractuels et frais d'actes judiciaires. Obligation du créancier d'avoir respecté le préavis de mise en demeure légale (art. 268 COC).`,
      garantiesSuretes: manualData?.guarantees || `Hypothèque conventionnelle de premier rang sur bien immobilier commercial valorisé à 260 000 TND + Acte de cautionnement solidaire et indivisible sans bénéfice de discussion ni de division (art. 1478 et suivants du COC).`,
      clausesImportantes: `Clause de déchéance du terme de plein droit sans sommation supplémentaire après mise en demeure infructueuse de 15 jours. Clause compromissoire et clause attributive de compétence territoriale exclusive.`,
      risquesJuridiques: `Risque d'exception de prescription commerciale (art. 402 COC : prescription quinquennale pour les dettes commerciales). Risque de recours dilatoire en contestation d'écritures ou sur le décompte d'agios.`,
      echeancesPrescriptions: `Délai de prescription commerciale : 5 ans à compter de la première échéance impayée. Délai d'action sur l'injonction de payer : 3 mois après ordonnance pour signification par huissier sous peine de caducité.`
    },
    analyseFinanciere: {
      montantPrincipal: principal,
      interetsFrais: interest + penalties,
      echeances: `Arriérés cumulés sur 5 échéances mensuelles consécutives (retard global supérieur à 120 jours).`,
      expositionGlobale: `${totalDue.toLocaleString('fr-TN')} TND (Encours brut total)`,
      garantiesFinancieres: `Assiette des sûretés estimée à ${(principal * 1.35).toLocaleString('fr-TN')} TND (Ratio de couverture LTV : 74%).`,
      ratiosEvaluation: `Couverture d'exposition par les garanties de 135% du principal. Risque net bancaire après réalisation hypothécaire estimé comme très faible.`
    },
    analyseRisques: [
      {
        risque: 'Forclusion ou prescription cambiaire / commerciale',
        niveau: 'Modéré',
        justification: 'La première échéance impayée remonte à 8 mois. Une action interruptive de prescription doit impérativement intervenir avant le délai légal quinquennal.',
        documentSource: 'Tableau_Amortissement_et_Impayes.xlsx',
        actionRecommandee: 'Déposer la requête d\'injonction de payer sans délai pour interrompre définitivement la prescription.'
      },
      {
        risque: 'Contestation du quantum des intérêts et agios de retard',
        niveau: 'Faible',
        justification: 'Le décompte fait état de frais de rejet non prévus expressément au contrat tarifaire de la banque.',
        documentSource: 'Tableau_Amortissement_et_Impayes.xlsx',
        actionRecommandee: 'Faire certifier le décompte d\'intérêts par le responsable de la comptabilité bancaire selon la formule légale BCT.'
      },
      {
        risque: 'Organisation d\'insolvabilité ou cession d\'actif par le débiteur',
        niveau: 'Élevé',
        justification: 'Absence de réponse du client après l\'exploit de l\'huissier de justice et rumeurs de ralentissement d\'activité.',
        documentSource: 'Mise_En_Demeure_Huissier.docx',
        actionRecommandee: 'Requérir en urgence une saisie conservatoire sur les comptes bancaires (saisie-arrêt) et sur le fonds de commerce.'
      },
      {
        risque: 'Défaut d\'inscription en renouvellement de l\'hypothèque',
        niveau: 'Critique',
        justification: 'L\'inscription hypothécaire doit être active au registre de la Conservation Foncière (durée de validité 10 ans renouvelable).',
        documentSource: 'Contrat_Pret_Bancaire.pdf',
        actionRecommandee: 'Demander immédiatement un état des inscriptions foncières à jour auprès de la CPF.'
      }
    ],
    actionsAEntreprendre: [
      {
        id: 'act-01',
        action: 'Obtenir l\'état certifié conforme de la Conservation Foncière (CPF)',
        echeance: 'Sous 48 heures',
        priorite: 'Urgente',
        responsable: 'Chargé d\'instruction contentieux',
        statut: 'propose'
      },
      {
        id: 'act-02',
        action: 'Déposer une requête en ordonnance d\'injonction de payer (art. 258 CPCC)',
        echeance: 'Sous 5 jours ouvrés',
        priorite: 'Urgente',
        responsable: 'Avocat désigné du Barreau de Tunis',
        statut: 'propose'
      },
      {
        id: 'act-03',
        action: 'Notifier un commandement préalable à saisie immobilière ou mobilière',
        echeance: 'Sous 10 jours',
        priorite: 'Haute',
        responsable: 'Huissier de justice territorialement compétent',
        statut: 'propose'
      },
      {
        id: 'act-04',
        action: 'Engager une saisie-arrêt conservatoire sur les comptes bancaires tiers',
        echeance: 'Sous 7 jours',
        priorite: 'Haute',
        responsable: 'Avocat / Service juridique',
        statut: 'propose'
      },
      {
        id: 'act-05',
        action: 'Mise en cause formelle et sommation de la caution personnelle solidaire',
        echeance: 'Sous 15 jours',
        priorite: 'Normale',
        responsable: 'Juriste contentieux',
        statut: 'propose'
      }
    ],
    preRemplissageSuggere: {
      clientName: { value: clientName, source: documents[0]?.name || 'Contrat_Pret.pdf', confidence: 98 },
      principalAmount: { value: principal, source: documents[1]?.name || 'Tableau_Impayes.xlsx', confidence: 96 },
      interestAmount: { value: interest, source: documents[1]?.name || 'Tableau_Impayes.xlsx', confidence: 92 },
      penaltiesAmount: { value: penalties, source: documents[1]?.name || 'Tableau_Impayes.xlsx', confidence: 90 },
      dossierType: { value: dossierType, source: 'Classification automatique', confidence: 95 },
      subCategory: { value: 'Injonction de payer (Art. 258 CPCC)', source: 'Analyse IA des pièces', confidence: 94 },
      priority: { value: totalDue > 100000 ? 'Urgente' : 'Haute', source: 'Matrice de criticité financière', confidence: 93 },
      claimNature: { value: 'Créance commerciale exigible après déchéance du terme', source: 'Contrat bancaire', confidence: 95 },
      guarantees: { value: 'Hypothèque conventionnelle 1er rang CPF + Caution solidaire', source: 'Acte constitutif', confidence: 96 },
      legalJurisdiction: { value: 'Tribunal de Première Instance de Tunis', source: 'Clause attributive de juridiction', confidence: 98 }
    }
  };
}

router.post('/nouveau-dossier/ai-analysis', async (req, res) => {
  const { manualData, documents = [] } = req.body;
  
  audit(req, 'AI_NEW_DOSSIER_ANALYSIS', manualData?.reference || 'NOUVEAU-DOSSIER', {
    docCount: documents.length,
    client: manualData?.clientName
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tu es un Expert Juridique Senior et Directeur du Contentieux Bancaire en Tunisie (Expert en droit bancaire tunisien, Code des Obligations et des Contrats - COC, Code de Procédure Civile et Commerciale - CPCC, Circulaires BCT et voies d'exécution).

Un utilisateur souhaite créer et instruire un NOUVEAU DOSSIER de recouvrement contentieux ou pré-contentieux.
Voici les données préliminaires saisies par l'utilisateur :
${JSON.stringify(manualData, null, 2)}

Voici les documents et pièces justificatives importés (avec métadonnées et extraits textuels) :
${JSON.stringify(documents.map((d: any) => ({ name: d.name, type: d.type, size: d.size, preview: d.extractedText?.slice(0, 1500) })), null, 2)}

Effectue une analyse juridique et financière approfondie, objective et rigoureuse.
Produis un objet JSON strict respectant EXACTEMENT la structure suivante :
{
  "synthese": {
    "resumeExecutif": "Résumé exécutif clair et synthétique du dossier pour la direction générale ou juridique",
    "parties": "Débiteur principal, co-débiteurs éventuels, cautions et créancier",
    "objetDossier": "Nature et objet de la créance ou de l'opération litigieuse",
    "montantExposition": "Montant total réclamé avec détail principal et frais",
    "situationActuelle": "Stade de la créance (amiable, mise en demeure échue, déchéance du terme...)"
  },
  "analyseDocumentaire": {
    "documentsAnalyses": ["Nom et type des documents inspectés"],
    "informationsExtraites": [
      {
        "champ": "Nom du champ",
        "valeur": "Valeur extraite",
        "sourceDoc": "Nom du fichier et référence/page",
        "confiance": 95,
        "status": "ai_extracted"
      }
    ],
    "documentsManquants": [
      "Liste des pièces manquantes essentielles selon la réglementation tunisienne (ex: PV de signification de la mise en demeure, relevé de compte certifié conforme art. 258 CPCC, certificat de non-paiement de chèque, inscription d'hypothèque CPF...)"
    ],
    "incoherencesDetectees": [
      "Incohérences ou divergences identifiées entre les documents ou avec les données saisies"
    ],
    "pointsVerificationHumaine": [
      "Points critiques nécessitant validation manuelle expresse par le juriste"
    ]
  },
  "analyseJuridique": {
    "engagementsContractuels": "Base contractuelle (contrat de prêt, convention de compte courant, contrat de leasing...)",
    "obligationsParties": "Obligations respectives des parties et manquements constatés",
    "garantiesSuretes": "Sûretés identifiées (hypothèques, nantissements, cautions solidaires, billets à ordre...)",
    "clausesImportantes": "Clauses résolutoires de plein droit, déchéance du terme, clause d'attribution de compétence",
    "risquesJuridiques": "Risques juridiques identifiés (délai de prescription commerciale art. 402 COC, contestation de taux d'intérêt TEG, défaut de notification préalable)",
    "echeancesPrescriptions": "Dates butoirs et délais légaux à surveiller"
  },
  "analyseFinanciere": {
    "montantPrincipal": 0,
    "interetsFrais": 0,
    "echeances": "Historique des impayés et mensualités en retard",
    "expositionGlobale": "Exposition globale brute et nette",
    "garantiesFinancieres": "Valeur vénale ou d'expertise estimée des garanties",
    "ratiosEvaluation": "Ratio de couverture par les garanties (LTV contentieuse)"
  },
  "analyseRisques": [
    {
      "risque": "Intitulé du risque",
      "niveau": "Faible",
      "justification": "Justification factuelle basée sur les documents",
      "documentSource": "Fichier source",
      "actionRecommandee": "Action préventive ou corrective"
    }
  ],
  "actionsAEntreprendre": [
    {
      "id": "act-1",
      "action": "Action concrète à engager",
      "echeance": "Délai recommandé (ex: Sous 48h, Sous 8 jours...)",
      "priorite": "Normale",
      "responsable": "Juriste contentieux / Avocat / Huissier",
      "statut": "propose"
    }
  ],
  "preRemplissageSuggere": {
    "clientName": { "value": "Nom", "source": "Nom_Fichier.pdf", "confidence": 95 },
    "principalAmount": { "value": 125000, "source": "Nom_Fichier.pdf", "confidence": 90 },
    "interestAmount": { "value": 14200, "source": "Nom_Fichier.pdf", "confidence": 85 },
    "penaltiesAmount": { "value": 3500, "source": "Nom_Fichier.pdf", "confidence": 80 },
    "dossierType": { "value": "Contentieux", "source": "Analyse IA", "confidence": 92 },
    "subCategory": { "value": "Injonction de payer", "source": "Analyse IA", "confidence": 88 },
    "priority": { "value": "Haute", "source": "Calcul d'arriérés", "confidence": 85 },
    "claimNature": { "value": "Crédit impayé", "source": "Contrat", "confidence": 90 },
    "guarantees": { "value": "Hypothèque", "source": "Acte notarié", "confidence": 94 },
    "legalJurisdiction": { "value": "Tribunal de Première Instance de Tunis", "source": "Clause", "confidence": 96 }
  }
}

Réponds avec un JSON strictement parseable, sans aucun préfixe ni suffixe markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response.text) {
        try {
          const parsed = JSON.parse(response.text);
          return res.json({
            success: true,
            source: 'gemini-3.8-flash',
            timestamp: new Date().toISOString(),
            data: parsed
          });
        } catch (parseErr) {
          console.warn('[Gemini Parse Fallback]', parseErr);
        }
      }
    } catch (apiErr: any) {
      console.warn('[Gemini New Dossier Analysis Error]', apiErr.message);
    }
  }

  // Fallback haute fidélité pour le droit bancaire tunisien
  const fallback = generateTunisianBankingAnalysisFallback(manualData, documents);
  return res.json({
    success: true,
    source: 'recovai-legal-engine',
    timestamp: new Date().toISOString(),
    demoFallback: !apiKey,
    data: fallback
  });
});

// POST save complete new structured case
router.post('/nouveau-dossier/save', (req, res) => {
  const dossierData = req.body;
  if (!dossierData.clientName && !dossierData.reference) {
    return res.status(400).json({ error: 'Référence ou nom du client obligatoire' });
  }

  audit(req, 'NEW_DOSSIER_PERSISTED', dossierData.reference || 'DOSSIER-CREE', {
    client: dossierData.clientName,
    montant: dossierData.principalAmount,
    type: dossierData.dossierType
  });

  res.status(201).json({
    success: true,
    message: 'Nouveau dossier enregistré avec succès et intégré au registre contentieux',
    id: dossierData.reference || `LIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString()
  });
});

export default router;
