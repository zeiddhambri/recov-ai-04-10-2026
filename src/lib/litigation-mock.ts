// Mock data + in-memory store for the Litigation module.
// Pure frontend — no backend wiring. Replace with Supabase later.

export type CaseStage =
  | 'pre_litigation'
  | 'injunction_filed'
  | 'in_process'
  | 'judgment_obtained'
  | 'enforcement'
  | 'closed_recovered'
  | 'closed_written_off';

export type CaseType = 'payment_injunction' | 'summary_proceedings' | 'other';

export const STAGE_CONFIG: Record<CaseStage, { label: string; color: string; bg: string; ring: string }> = {
  pre_litigation:     { label: 'Pré-contentieux',     color: 'text-purple-700', bg: 'bg-purple-100', ring: 'ring-purple-300' },
  injunction_filed:   { label: 'Injonction déposée',  color: 'text-blue-700',   bg: 'bg-blue-100',   ring: 'ring-blue-300' },
  in_process:         { label: 'En cours',            color: 'text-orange-700', bg: 'bg-orange-100', ring: 'ring-orange-300' },
  judgment_obtained:  { label: 'Jugement obtenu',     color: 'text-emerald-700',bg: 'bg-emerald-100',ring: 'ring-emerald-300' },
  enforcement:        { label: 'Exécution',           color: 'text-teal-700',   bg: 'bg-teal-100',   ring: 'ring-teal-300' },
  closed_recovered:   { label: 'Clos · Recouvré',     color: 'text-emerald-800',bg: 'bg-emerald-200',ring: 'ring-emerald-400' },
  closed_written_off: { label: 'Clos · Abandonné',    color: 'text-slate-700',  bg: 'bg-slate-200',  ring: 'ring-slate-400' },
};

export const TYPE_LABELS: Record<CaseType, string> = {
  payment_injunction: 'Injonction de payer',
  summary_proceedings: 'Procédure de référé',
  other: 'Autre',
};

export const KANBAN_STAGES: CaseStage[] = [
  'pre_litigation', 'injunction_filed', 'in_process',
  'judgment_obtained', 'enforcement', 'closed_recovered',
];

// ─────────────────────────────────────────────
export interface Party {
  id: string;
  name: string;
  firm?: string;
  phone: string;
  email: string;
}

export interface Hearing {
  id: string;
  date: string;       // ISO
  time: string;       // HH:mm
  court: string;
  type: string;
  judge?: string;
  status: 'scheduled' | 'held' | 'postponed' | 'cancelled';
  notes?: string;
}

export interface CaseEvent {
  id: string;
  date: string;
  type: 'opened' | 'document_filed' | 'hearing_scheduled' | 'judgment' | 'payment' | 'note';
  description: string;
  author: string;
  attachment?: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  template?: 'mise_en_demeure' | 'relance_pre_contentieux' | 'injonction_de_payer';
  type: 'generated' | 'uploaded';
  category: string;
  date: string;
  status: 'draft' | 'sent' | 'signed' | 'filed';
  size?: string;
}

export interface CaseNote {
  id: string;
  date: string;
  author: string;
  content: string;
  visibility: 'internal' | 'lawyer' | 'bailiff';
  mentions?: string[];
}

export interface CasePayment {
  id: string;
  date: string;
  amount: number;
  reference: string;
  type: 'principal' | 'partial' | 'interest';
}

export interface LitigationCase {
  id: string;                 // LIT-2024-XXXX
  debtor: {
    id: string;
    name: string;
    siren?: string;
    address: string;
    city: string;
    zip: string;
    contact?: string;
    email?: string;
  };
  type: CaseType;
  stage: CaseStage;
  filingDate: string;
  lastUpdate: string;
  court: { name: string; jurisdiction: string };
  amount: {
    principal: number;
    interest: number;
    legalFees: number;
    bailiffFees: number;
  };
  interestRate: number;       // annual %
  lawyer: Party;
  bailiff: Party;
  manager: string;
  invoices: { ref: string; date: string; dueDate: string; amount: number }[];
  hearings: Hearing[];
  events: CaseEvent[];
  documents: CaseDocument[];
  notes: CaseNote[];
  payments: CasePayment[];
}

// ─── Sample lawyers / bailiffs ───
const LAWYERS: Party[] = [
  { id: 'l1', name: 'Maître Demo Alpha', firm: 'Cabinet Demo Alpha', phone: '+216 30 000 000', email: 'contact@cabinet-demo-alpha.example.test' },
  { id: 'l2', name: 'Maître Demo Bravo',   firm: 'Cabinet Demo Bravo',                phone: '+216 30 000 000', email: 'contact@cabinet-demo-bravo.example.test' },
];
const BAILIFFS: Party[] = [
  { id: 'b1', name: 'Huissier Demo 1',  firm: 'Étude Demo Nord',     phone: '+216 30 000 000', email: 'contact@etude-demo-nord.example.test' },
  { id: 'b2', name: 'Huissier Demo 2',  firm: 'Étude Demo Centre',     phone: '+216 30 000 000', email: 'contact@etude-demo-centre.example.test' },
];

const COURTS = [
  { name: 'Tribunal de Première Instance de Tunis', jurisdiction: 'Tunis' },
  { name: 'Tribunal de Commerce de Sfax',           jurisdiction: 'Sfax' },
  { name: 'Tribunal de Première Instance de Sousse',jurisdiction: 'Sousse' },
];

// ─── Cases ───
export const litigationCases: LitigationCase[] = [
  {
    id: 'LIT-2024-0001',
    debtor: { id: 'D-145', name: 'DEBITEUR ALPHA DEMO', siren: '0123456789', address: '12 Rue de la République', city: 'Tunis', zip: '1000', contact: 'M. Contact Demo 1', email: 'contact@demo-sarl.example.test' },
    type: 'payment_injunction',
    stage: 'in_process',
    filingDate: '2024-01-15',
    lastUpdate: '2024-04-10',
    court: COURTS[0],
    amount: { principal: 145000, interest: 8200, legalFees: 3500, bailiffFees: 850 },
    interestRate: 5.6,
    lawyer: LAWYERS[0],
    bailiff: BAILIFFS[0],
    manager: 'Amel Ben Ali',
    invoices: [
      { ref: 'FAC-2023-118', date: '2023-08-12', dueDate: '2023-09-12', amount: 75000 },
      { ref: 'FAC-2023-142', date: '2023-09-30', dueDate: '2023-10-30', amount: 70000 },
    ],
    hearings: [
      { id: 'h1', date: '2024-05-15', time: '10:00', court: COURTS[0].name, type: 'Plaidoirie',         judge: 'Juge El Mahdi',     status: 'scheduled', notes: 'Préparer pièces complémentaires.' },
      { id: 'h2', date: '2024-02-20', time: '09:30', court: COURTS[0].name, type: 'Audience d\'examen', judge: 'Juge El Mahdi',     status: 'held' },
    ],
    events: [
      { id: 'e1', date: '2024-01-15', type: 'opened',           description: 'Ouverture du dossier contentieux',   author: 'Amel Ben Ali' },
      { id: 'e2', date: '2024-01-20', type: 'document_filed',   description: 'Mise en demeure envoyée par LRAR',  author: 'Amel Ben Ali' },
      { id: 'e3', date: '2024-02-05', type: 'document_filed',   description: 'Requête en injonction déposée',     author: 'Maître Trabelsi' },
      { id: 'e4', date: '2024-02-20', type: 'hearing_scheduled',description: 'Audience d\'examen tenue',          author: 'Maître Trabelsi' },
      { id: 'e5', date: '2024-04-10', type: 'note',             description: 'Réception de pièces du débiteur',   author: 'Amel Ben Ali' },
    ],
    documents: [
      { id: 'd1', name: 'Mise en demeure - ALPHA SARL.pdf',     template: 'mise_en_demeure',         type: 'generated', category: 'Lettre',    date: '2024-01-20', status: 'sent',  size: '124 Ko' },
      { id: 'd2', name: 'Requête en injonction de payer.pdf',   template: 'injonction_de_payer',     type: 'generated', category: 'Procédure', date: '2024-02-05', status: 'filed', size: '210 Ko' },
      { id: 'd3', name: 'Accusé de réception greffe.pdf',                                            type: 'uploaded',  category: 'Pièce',     date: '2024-02-08', status: 'filed', size: '89 Ko' },
      { id: 'd4', name: 'Convocation audience 2024-05-15.pdf',                                       type: 'uploaded',  category: 'Convocation',date: '2024-04-01', status: 'filed', size: '45 Ko' },
    ],
    notes: [
      { id: 'n1', date: '2024-04-10', author: 'Amel Ben Ali',     content: 'Le débiteur a transmis ses comptes 2023. Vérifier la solvabilité avant l\'audience.', visibility: 'internal' },
      { id: 'n2', date: '2024-04-12', author: 'Maître Trabelsi',  content: 'Préparer conclusions pour le 15/05. Argumenter sur la prescription écartée.',         visibility: 'lawyer' },
    ],
    payments: [],
  },
  {
    id: 'LIT-2024-0002',
    debtor: { id: 'D-201', name: 'PARTICULIER DEMO 01', address: '4 Avenue Habib Bourguiba', city: 'Sousse', zip: '4000', email: 'particulier.demo@example.test' },
    type: 'payment_injunction',
    stage: 'enforcement',
    filingDate: '2023-11-20',
    lastUpdate: '2024-04-05',
    court: COURTS[2],
    amount: { principal: 22000, interest: 1450, legalFees: 1200, bailiffFees: 620 },
    interestRate: 5.6,
    lawyer: LAWYERS[1],
    bailiff: BAILIFFS[1],
    manager: 'Agent Démo 2',
    invoices: [{ ref: 'FAC-2023-051', date: '2023-04-01', dueDate: '2023-05-01', amount: 22000 }],
    hearings: [
      { id: 'h3', date: '2024-01-10', time: '14:00', court: COURTS[2].name, type: 'Délibéré', status: 'held' },
    ],
    events: [
      { id: 'e6', date: '2023-11-20', type: 'opened',           description: 'Ouverture du dossier',                author: 'Agent Démo 2' },
      { id: 'e7', date: '2024-01-10', type: 'judgment',         description: 'Jugement favorable rendu',            author: 'Maître Belhaj' },
      { id: 'e8', date: '2024-03-15', type: 'document_filed',   description: 'Saisie-attribution diligentée',       author: 'Étude Demo Centre' },
      { id: 'e9', date: '2024-04-05', type: 'payment',          description: 'Paiement partiel reçu : 5 000 TND',  author: 'Système' },
    ],
    documents: [
      { id: 'd5', name: 'Jugement définitif.pdf',         type: 'uploaded',  category: 'Jugement', date: '2024-01-15', status: 'filed', size: '320 Ko' },
      { id: 'd6', name: 'Procès-verbal de saisie.pdf',    type: 'uploaded',  category: 'Exécution',date: '2024-03-15', status: 'filed', size: '180 Ko' },
    ],
    notes: [
      { id: 'n3', date: '2024-04-05', author: 'Agent Démo 2', content: 'Solde restant 19 270 TND. Plan d\'apurement à proposer.', visibility: 'internal' },
    ],
    payments: [
      { id: 'p1', date: '2024-04-05', amount: 5000, reference: 'VIR-04052024', type: 'partial' },
    ],
  },
  {
    id: 'LIT-2024-0003',
    debtor: { id: 'D-318', name: 'TECH GLOBAL DEMO', siren: '0987654321', address: '15 Rue du Lac', city: 'Tunis', zip: '1053', contact: 'Mme Contact Demo 2' },
    type: 'summary_proceedings',
    stage: 'pre_litigation',
    filingDate: '2024-04-01',
    lastUpdate: '2024-04-15',
    court: COURTS[0],
    amount: { principal: 320000, interest: 2400, legalFees: 0, bailiffFees: 0 },
    interestRate: 5.6,
    lawyer: LAWYERS[0],
    bailiff: BAILIFFS[0],
    manager: 'Agent Démo 3',
    invoices: [{ ref: 'FAC-2024-009', date: '2024-01-15', dueDate: '2024-02-15', amount: 320000 }],
    hearings: [],
    events: [
      { id: 'e10', date: '2024-04-01', type: 'opened',         description: 'Ouverture pré-contentieux',     author: 'Agent Démo 3' },
      { id: 'e11', date: '2024-04-15', type: 'document_filed', description: 'Mise en demeure générée',       author: 'Agent Démo 3' },
    ],
    documents: [
      { id: 'd7', name: 'Mise en demeure - GLOBAL TECH.pdf', template: 'mise_en_demeure', type: 'generated', category: 'Lettre', date: '2024-04-15', status: 'draft', size: '118 Ko' },
    ],
    notes: [],
    payments: [],
  },
  {
    id: 'LIT-2024-0004',
    debtor: { id: 'D-422', name: 'ENTREPRISE K DEMO', siren: '5566778899', address: '8 Rue Ibn Khaldoun', city: 'Sfax', zip: '3000' },
    type: 'payment_injunction',
    stage: 'judgment_obtained',
    filingDate: '2023-09-10',
    lastUpdate: '2024-03-28',
    court: COURTS[1],
    amount: { principal: 56000, interest: 3700, legalFees: 1800, bailiffFees: 0 },
    interestRate: 5.6,
    lawyer: LAWYERS[1],
    bailiff: BAILIFFS[1],
    manager: 'Agent Démo 1',
    invoices: [{ ref: 'FAC-2023-088', date: '2023-06-15', dueDate: '2023-07-15', amount: 56000 }],
    hearings: [
      { id: 'h4', date: '2024-03-20', time: '11:00', court: COURTS[1].name, type: 'Délibéré', status: 'held' },
    ],
    events: [
      { id: 'e12', date: '2023-09-10', type: 'opened',           description: 'Ouverture du dossier',         author: 'Agent Démo 1' },
      { id: 'e13', date: '2024-03-20', type: 'judgment',         description: 'Jugement favorable',            author: 'Maître Belhaj' },
    ],
    documents: [
      { id: 'd8', name: 'Jugement.pdf', type: 'uploaded', category: 'Jugement', date: '2024-03-28', status: 'filed', size: '290 Ko' },
    ],
    notes: [],
    payments: [],
  },
  {
    id: 'LIT-2024-0005',
    debtor: { id: 'D-501', name: 'FONDS MARINA DEMO', siren: '1122334455', address: '3 Avenue de Carthage', city: 'Tunis', zip: '1001' },
    type: 'summary_proceedings',
    stage: 'injunction_filed',
    filingDate: '2024-02-28',
    lastUpdate: '2024-04-12',
    court: COURTS[0],
    amount: { principal: 89000, interest: 1100, legalFees: 2200, bailiffFees: 0 },
    interestRate: 5.6,
    lawyer: LAWYERS[0],
    bailiff: BAILIFFS[0],
    manager: 'Agent Démo 4',
    invoices: [{ ref: 'FAC-2024-002', date: '2024-01-05', dueDate: '2024-02-05', amount: 89000 }],
    hearings: [
      { id: 'h5', date: '2024-06-12', time: '09:00', court: COURTS[0].name, type: 'Plaidoirie', status: 'scheduled' },
    ],
    events: [
      { id: 'e14', date: '2024-02-28', type: 'opened',           description: 'Ouverture du dossier',         author: 'Agent Démo 4' },
      { id: 'e15', date: '2024-04-12', type: 'document_filed',   description: 'Requête déposée au greffe',    author: 'Maître Trabelsi' },
    ],
    documents: [
      { id: 'd9', name: 'Requête de référé.pdf', type: 'uploaded', category: 'Procédure', date: '2024-04-12', status: 'filed', size: '160 Ko' },
    ],
    notes: [],
    payments: [],
  },
  {
    id: 'LIT-2023-0078',
    debtor: { id: 'D-098', name: 'ETOILE LOGISTIQUE DEMO', siren: '6677889900', address: '20 Rue de Marseille', city: 'Tunis', zip: '1002' },
    type: 'payment_injunction',
    stage: 'closed_recovered',
    filingDate: '2023-05-12',
    lastUpdate: '2024-01-30',
    court: COURTS[0],
    amount: { principal: 41000, interest: 2200, legalFees: 1500, bailiffFees: 800 },
    interestRate: 5.6,
    lawyer: LAWYERS[1],
    bailiff: BAILIFFS[0],
    manager: 'Karim S.',
    invoices: [{ ref: 'FAC-2023-021', date: '2023-02-01', dueDate: '2023-03-01', amount: 41000 }],
    hearings: [],
    events: [
      { id: 'e16', date: '2023-05-12', type: 'opened',  description: 'Ouverture',         author: 'Karim S.' },
      { id: 'e17', date: '2024-01-30', type: 'payment', description: 'Solde recouvré intégralement', author: 'Système' },
    ],
    documents: [],
    notes: [],
    payments: [{ id: 'p2', date: '2024-01-30', amount: 45500, reference: 'VIR-30012024', type: 'principal' }],
  },
];

// ─── Helpers ───
export const totalAmount = (c: LitigationCase) =>
  c.amount.principal + c.amount.interest + c.amount.legalFees + c.amount.bailiffFees;

export const totalRecovered = (c: LitigationCase) =>
  c.payments.reduce((s, p) => s + p.amount, 0);

export const findCase = (id: string) => litigationCases.find(c => c.id === id);

// ─── Creditor (for PDF templates) ───
export const CREDITOR = {
  name: 'BANQUE RECOVAI',
  address: 'Avenue Mohamed V, Tour Banque Centrale',
  city: 'Tunis',
  zip: '1001',
  phone: '+216 30 000 000',
  email: 'contentieux@recovai.com',
  siren: 'TN-RC-B112233',
  rib: 'TN59 0000 0000 1234 5678 9012',
};
