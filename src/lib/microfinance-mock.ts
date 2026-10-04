import { 
  MfiClient, LoanAccount, RepaymentInstallment, CollectionCase, 
  CollectionAction, PromiseToPay, FieldVisit, RecoveryPayment, 
  LegalCase, LegalAction, LegalDocument, Collateral, Guarantor, 
  MfiAuditLog, MfiSettings 
} from '../types/microfinance';

const LOCAL_STORAGE_KEY = 'recov_mfi_state';

export interface MfiState {
  clients: MfiClient[];
  loans: LoanAccount[];
  installments: RepaymentInstallment[];
  cases: CollectionCase[];
  actions: CollectionAction[];
  promises: PromiseToPay[];
  visits: FieldVisit[];
  payments: RecoveryPayment[];
  legalCases: LegalCase[];
  legalActions: LegalAction[];
  legalDocuments: LegalDocument[];
  collaterals: Collateral[];
  guarantors: Guarantor[];
  auditLogs: MfiAuditLog[];
  settings: MfiSettings;
}

const INITIAL_CLIENTS: MfiClient[] = [
  { id: 'cli-1', name: 'Amel Bouslama', email: 'amel.bouslama@ar-boutique.tn', phone: '+216 30 000 000', nationalId: '08342110', branch: 'Ariana Centre', businessSector: 'Commerce de détails - Prêt-à-porter' },
  { id: 'cli-2', name: 'Mohamed Ben Ali', email: 'med.ali.agri@zaghouan.org', phone: '+216 30 000 000', nationalId: '04219904', branch: 'Zaghouan Ville', businessSector: 'Agriculture - Production d\'olives' },
  { id: 'cli-3', name: 'Sofiène Chaâri', email: 'sof.chaari.wood@gmail.com', phone: '+216 30 000 000', nationalId: '11029113', branch: 'Sfax El-Jadida', businessSector: 'Artisanat - Menuiserie bois' },
  { id: 'cli-4', name: 'Rim El-Heni', email: 'rim.heni.beauty@outlook.com', phone: '+216 30 000 000', nationalId: '09123844', branch: 'Tunis Lafayette', businessSector: 'Soin & Services - Salon de coiffure' },
  { id: 'cli-5', name: 'Fethi Gharbi', email: 'fethi.bakery@gmail.com', phone: '+216 30 000 000', nationalId: '05118943', branch: 'Bizerte Ville', businessSector: 'Alimentation - Boulangerie pâtisserie' },
  { id: 'cli-6', name: 'Zohra Mansour', email: 'zohra.couture@topnet.tn', phone: '+216 30 000 000', nationalId: '07198305', branch: 'Kairouan Sud', businessSector: 'Artisanat - Atelier de couture' }
];

const INITIAL_LOANS: LoanAccount[] = [
  {
    id: 'loan-1',
    clientId: 'cli-1',
    clientName: 'Amel Bouslama',
    loanNumber: 'CR-MFI-2025-098',
    originalAmount: 8000,
    outstandingPrincipal: 2400,
    outstandingInterest: 120,
    outstandingFees: 30,
    totalOutstanding: 2550,
    disbursementDate: '2025-01-15',
    maturityDate: '2026-07-15',
    status: 'active',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Mohamed Rezgui'
  },
  {
    id: 'loan-2',
    clientId: 'cli-2',
    clientName: 'Mohamed Ben Ali',
    loanNumber: 'CR-MFI-2024-512',
    originalAmount: 15000,
    outstandingPrincipal: 6200,
    outstandingInterest: 450,
    outstandingFees: 80,
    totalOutstanding: 6730,
    disbursementDate: '2024-05-10',
    maturityDate: '2026-05-10',
    status: 'in_arrears',
    assignedAgentId: 'agent-2',
    assignedAgentName: 'Yassine Touati'
  },
  {
    id: 'loan-3',
    clientId: 'cli-3',
    clientName: 'Sofiène Chaâri',
    loanNumber: 'CR-MFI-2023-889',
    originalAmount: 12000,
    outstandingPrincipal: 8500,
    outstandingInterest: 920,
    outstandingFees: 150,
    totalOutstanding: 9570,
    disbursementDate: '2023-11-20',
    maturityDate: '2025-11-20',
    status: 'litigation',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'Nadia Sassi'
  },
  {
    id: 'loan-4',
    clientId: 'cli-4',
    clientName: 'Rim El-Heni',
    loanNumber: 'CR-MFI-2025-045',
    originalAmount: 6000,
    outstandingPrincipal: 3500,
    outstandingInterest: 180,
    outstandingFees: 40,
    totalOutstanding: 3720,
    disbursementDate: '2025-02-01',
    maturityDate: '2026-08-01',
    status: 'watchlist',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Mohamed Rezgui'
  },
  {
    id: 'loan-5',
    clientId: 'cli-5',
    clientName: 'Fethi Gharbi',
    loanNumber: 'CR-MFI-2025-101',
    originalAmount: 25000,
    outstandingPrincipal: 18000,
    outstandingInterest: 800,
    outstandingFees: 120,
    totalOutstanding: 18920,
    disbursementDate: '2025-03-01',
    maturityDate: '2027-03-01',
    status: 'active',
    assignedAgentId: 'agent-2',
    assignedAgentName: 'Yassine Touati'
  },
  {
    id: 'loan-6',
    clientId: 'cli-6',
    clientName: 'Zohra Mansour',
    loanNumber: 'CR-MFI-2025-015',
    originalAmount: 5000,
    outstandingPrincipal: 2800,
    outstandingInterest: 320,
    outstandingFees: 60,
    totalOutstanding: 3180,
    disbursementDate: '2025-01-05',
    maturityDate: '2026-07-05',
    status: 'in_arrears',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'Nadia Sassi'
  }
];

const INITIAL_INSTALLMENTS: RepaymentInstallment[] = [
  // Amel Bouslama - Active, upcoming
  { id: 'inst-1', loanAccountId: 'loan-1', installmentNumber: 15, dueDate: '2026-06-15', principalDue: 300, interestDue: 20, totalDue: 320, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 0, daysPastDue: 0, status: 'upcoming' },
  // Mohamed Ben Ali - Overdue by 32 days
  { id: 'inst-2', loanAccountId: 'loan-2', installmentNumber: 22, dueDate: '2026-04-10', principalDue: 600, interestDue: 45, totalDue: 645, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 645, daysPastDue: 50, status: 'overdue' },
  { id: 'inst-3', loanAccountId: 'loan-2', installmentNumber: 23, dueDate: '2026-05-10', principalDue: 600, interestDue: 45, totalDue: 645, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 645, daysPastDue: 20, status: 'overdue' },
  // Sofiène Chaâri - 180 days overdue (litigation candidate)
  { id: 'inst-4', loanAccountId: 'loan-3', installmentNumber: 14, dueDate: '2025-12-20', principalDue: 800, interestDue: 90, totalDue: 890, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 890, daysPastDue: 161, status: 'overdue' },
  { id: 'inst-5', loanAccountId: 'loan-3', installmentNumber: 15, dueDate: '2026-01-20', principalDue: 800, interestDue: 90, totalDue: 890, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 890, daysPastDue: 130, status: 'overdue' },
  { id: 'inst-6', loanAccountId: 'loan-3', installmentNumber: 16, dueDate: '2026-02-20', principalDue: 800, interestDue: 90, totalDue: 890, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 890, daysPastDue: 99, status: 'overdue' },
  // Rim El-Heni - Short overdue
  { id: 'inst-7', loanAccountId: 'loan-4', installmentNumber: 4, dueDate: '2026-05-15', principalDue: 400, interestDue: 25, totalDue: 425, principalPaid: 200, interestPaid: 25, totalPaid: 225, overdueAmount: 200, daysPastDue: 15, status: 'partially_paid' },
  // Zohra Mansour - Overdue by 25 days
  { id: 'inst-8', loanAccountId: 'loan-6', installmentNumber: 16, dueDate: '2026-05-05', principalDue: 350, interestDue: 30, totalDue: 380, principalPaid: 0, interestPaid: 0, totalPaid: 0, overdueAmount: 380, daysPastDue: 25, status: 'overdue' }
];

const INITIAL_CASES: CollectionCase[] = [
  {
    id: 'case-2',
    loanAccountId: 'loan-2',
    loanNumber: 'CR-MFI-2024-512',
    clientId: 'cli-2',
    clientName: 'Mohamed Ben Ali',
    assignedAgentId: 'agent-2',
    assignedAgentName: 'Yassine Touati',
    overdueAmount: 1290,
    daysPastDue: 50,
    priorityLevel: 'high',
    status: 'in_progress',
    openedAt: '2026-04-12',
    parBucket: 'PAR_31_90'
  },
  {
    id: 'case-3',
    loanAccountId: 'loan-3',
    loanNumber: 'CR-MFI-2023-889',
    clientId: 'cli-3',
    clientName: 'Sofiène Chaâri',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'Nadia Sassi',
    overdueAmount: 2670,
    daysPastDue: 161,
    priorityLevel: 'critical',
    status: 'transferred_to_litigation',
    openedAt: '2025-12-25',
    parBucket: 'PAR_90_plus'
  },
  {
    id: 'case-4',
    loanAccountId: 'loan-4',
    loanNumber: 'CR-MFI-2025-045',
    clientId: 'cli-4',
    clientName: 'Rim El-Heni',
    assignedAgentId: 'agent-1',
    assignedAgentName: 'Mohamed Rezgui',
    overdueAmount: 200,
    daysPastDue: 15,
    priorityLevel: 'medium',
    status: 'promise_to_pay',
    openedAt: '2026-05-16',
    parBucket: 'PAR_8_30'
  },
  {
    id: 'case-6',
    loanAccountId: 'loan-6',
    loanNumber: 'CR-MFI-2025-015',
    clientId: 'cli-6',
    clientName: 'Zohra Mansour',
    assignedAgentId: 'agent-3',
    assignedAgentName: 'Nadia Sassi',
    overdueAmount: 380,
    daysPastDue: 25,
    priorityLevel: 'medium',
    status: 'new',
    openedAt: '2026-05-06',
    parBucket: 'PAR_8_30'
  }
];

const INITIAL_ACTIONS: CollectionAction[] = [
  {
    id: 'act-1',
    collectionCaseId: 'case-2',
    actionType: 'phone_call',
    actorName: 'Yassine Touati',
    actionDate: '2026-04-14T10:30:00Z',
    result: 'client_reached',
    comment: 'Client indique que la récolte d\'olives a été tardive. Promet de régulariser la moitié sous peu.',
    nextActionDate: '2026-04-25'
  },
  {
    id: 'act-2',
    collectionCaseId: 'case-2',
    actionType: 'sms_sent',
    actorName: 'Système RecovAI',
    actionDate: '2026-05-11T08:00:00Z',
    result: 'client_unreachable',
    comment: 'Notification automatique de mise en demeure envoyée au client.',
  },
  {
    id: 'act-3',
    collectionCaseId: 'case-4',
    actionType: 'phone_call',
    actorName: 'Mohamed Rezgui',
    actionDate: '2026-05-18T14:15:00Z',
    result: 'promise_to_pay',
    comment: 'Le client s\'engage à payer 200 TND le 31 Mai après avoir sécurisé le paiement d\'un client récurrent.',
    nextActionDate: '2026-05-31'
  }
];

const INITIAL_PROMISES: PromiseToPay[] = [
  {
    id: 'prom-1',
    collectionCaseId: 'case-4',
    clientName: 'Rim El-Heni',
    promisedAmount: 200,
    promisedDate: '2026-05-31',
    status: 'pending',
    createdAt: '2026-05-18T14:15:00Z'
  },
  {
    id: 'prom-2',
    collectionCaseId: 'case-2',
    clientName: 'Mohamed Ben Ali',
    promisedAmount: 645,
    promisedDate: '2026-04-28',
    status: 'broken',
    createdAt: '2026-04-14T10:30:00Z'
  }
];

const INITIAL_VISITS: FieldVisit[] = [
  {
    id: 'vis-1',
    collectionCaseId: 'case-2',
    clientName: 'Mohamed Ben Ali',
    assignedAgentName: 'Yassine Touati',
    plannedDate: '2026-05-15',
    actualVisitDate: '2026-05-15',
    visitStatus: 'completed',
    result: 'Visite fructueuse de l\'exploitation agricole. Le cheptel est en règle, mais la trésorerie est effectivement tendue jusqu\'au début des ventes de blé en Juin.',
    notes: 'Priorité moyenne. Éviter d\'envoyer un huissier pour l\'instant, négocier un plan partiel.'
  },
  {
    id: 'vis-2',
    collectionCaseId: 'case-6',
    clientName: 'Zohra Mansour',
    assignedAgentName: 'Nadia Sassi',
    plannedDate: '2026-06-03',
    visitStatus: 'planned'
  }
];

const INITIAL_PAYMENTS: RecoveryPayment[] = [
  {
    id: 'pay-1',
    collectionCaseId: 'case-4',
    loanAccountId: 'loan-4',
    clientName: 'Rim El-Heni',
    amount: 225,
    paymentMethod: 'mobile_money',
    receivedBy: 'Caisse Lafayette / Wave',
    receivedAt: '2026-05-15T11:40:00Z',
    status: 'confirmed',
    receiptNumber: 'REC-MFI-2026-192'
  }
];

const INITIAL_LEGAL: LegalCase[] = [
  {
    id: 'leg-1',
    collectionCaseId: 'case-3',
    loanAccountId: 'loan-3',
    clientName: 'Sofiène Chaâri',
    legalCaseNumber: 'MFI-TPI-2026-103',
    legalOfficerName: 'Adel Dridi',
    externalLawyerName: 'Maître Leila Ben Youssef',
    principalDue: 8500,
    interestDue: 920,
    legalFees: 350,
    totalClaimAmount: 9770,
    status: 'filed_to_court',
    openedAt: '2026-02-10'
  }
];

const INITIAL_LEGAL_ACTIONS: LegalAction[] = [
  {
    id: 'lact-1',
    legalCaseId: 'leg-1',
    actionType: 'formal_notice',
    actionDate: '2026-01-05',
    performedBy: 'Adel Dridi (Interne MFI)',
    result: 'Délai d\'interpellation expiré',
    notes: 'Mise en demeure adressée par lettre recommandée avec accusé de réception infructueuse.'
  },
  {
    id: 'lact-2',
    legalCaseId: 'leg-1',
    actionType: 'court_filing',
    actionDate: '2026-02-10',
    performedBy: 'Maître Leila Ben Youssef',
    result: 'Dossier inscrit au TPI de Sfax',
    notes: 'Dépôt de la requête d\'ordonnance d\'injonction de payer.'
  }
];

const INITIAL_LEGAL_DOCUMENTS: LegalDocument[] = [
  { id: 'ldoc-1', legalCaseId: 'leg-1', documentType: 'contract', documentName: 'Contrat_Pret_CR-MFI-2023-889.pdf', uploadedAt: '2026-02-12', sizeKb: 1420 },
  { id: 'ldoc-2', legalCaseId: 'leg-1', documentType: 'notice', documentName: 'Mise_en_Demeure_LettreAR.pdf', uploadedAt: '2026-02-12', sizeKb: 380 }
];

const INITIAL_COLLATERALS: Collateral[] = [
  { id: 'col-1', loanAccountId: 'loan-3', collateralType: 'equipment', description: 'Scies électriques et perceuses industrielles de menuiserie', estimatedValue: 5000, status: 'active' }
];

const INITIAL_GUARANTORS: Guarantor[] = [
  { id: 'gua-1', loanAccountId: 'loan-3', name: 'Habib Chaâri (Frère)', phone: '+216 30 000 000', relationship: 'Famille / Garant', guaranteeAmount: 4000, status: 'contacted' }
];

const INITIAL_LOGS: MfiAuditLog[] = [
  { id: 'l-1', timestamp: '2026-05-30T10:00:00Z', user: 'zeid.dhambri@gmail.com', action: 'Accès Module MFI', details: 'Initialisation du module de gestion de microfinance.', category: 'system' }
];

const DEFAULT_SETTINGS: MfiSettings = {
  gracePeriodDays: 3,
  litigationThresholdDays: 90,
  maxBrokenPromises: 2,
  smsEnabled: true,
  whatsappEnabled: true
};

export const getMfiState = (): MfiState => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const defaultState: MfiState = {
      clients: INITIAL_CLIENTS,
      loans: INITIAL_LOANS,
      installments: INITIAL_INSTALLMENTS,
      cases: INITIAL_CASES,
      actions: INITIAL_ACTIONS,
      promises: INITIAL_PROMISES,
      visits: INITIAL_VISITS,
      payments: INITIAL_PAYMENTS,
      legalCases: INITIAL_LEGAL,
      legalActions: INITIAL_LEGAL_ACTIONS,
      legalDocuments: INITIAL_LEGAL_DOCUMENTS,
      collaterals: INITIAL_COLLATERALS,
      guarantors: INITIAL_GUARANTORS,
      auditLogs: INITIAL_LOGS,
      settings: DEFAULT_SETTINGS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
  
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse Mfi state:", err);
    return {
      clients: INITIAL_CLIENTS,
      loans: INITIAL_LOANS,
      installments: INITIAL_INSTALLMENTS,
      cases: INITIAL_CASES,
      actions: INITIAL_ACTIONS,
      promises: INITIAL_PROMISES,
      visits: INITIAL_VISITS,
      payments: INITIAL_PAYMENTS,
      legalCases: INITIAL_LEGAL,
      legalActions: INITIAL_LEGAL_ACTIONS,
      legalDocuments: INITIAL_LEGAL_DOCUMENTS,
      collaterals: INITIAL_COLLATERALS,
      guarantors: INITIAL_GUARANTORS,
      auditLogs: INITIAL_LOGS,
      settings: DEFAULT_SETTINGS
    };
  }
};

export const saveMfiState = (state: MfiState) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};
