// litigation-store.ts
// Client-side robust persistent store using localStorage to manage Litigation module lifecycle

export interface PreLitigationCase {
  id: string;
  case_number: string;
  client_name: string;
  portfolio_type: 'Microfinance' | 'Factoring' | 'Leasing';
  institution: string;
  branch: string;
  overdue_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  reason_for_escalation: string;
  formal_notice_status: 'draft' | 'pending' | 'sent' | 'received';
  formal_notice_sent_at?: string;
  final_deadline_date?: string;
  client_response?: string;
  guarantor_contacted: boolean;
  documents_checked: boolean;
  recommended_action: string;
  approved_by?: string;
  status: 'opened' | 'formal_notice_pending' | 'formal_notice_sent' | 'waiting_client_response' | 'payment_plan_negotiated' | 'documents_missing' | 'ready_for_litigation' | 'approved_for_litigation' | 'rejected' | 'closed';
  opened_at: string;
  approved_at?: string;
  closed_at?: string;
}

export interface LegalCase {
  id: string; // e.g., LIT-2024-0001
  client_name: string;
  portfolio_type: 'Microfinance' | 'Factoring' | 'Leasing';
  institution: string;
  branch: string;
  legal_case_number: string;
  legal_officer_id: string; // manager
  external_lawyer_id: string; // lawyer name
  principal_due: number;
  interest_due: number;
  penalties_due: number;
  legal_fees_due: number;
  recoverable_fees: number;
  total_claim_amount: number;
  recovered_amount: number;
  remaining_amount: number;
  recovery_rate: number;
  risk_level: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  priority_level: 'Normale' | 'Haute' | 'Urgente';
  status: 'draft' | 'opened' | 'under_review' | 'formal_notice' | 'amicable_legal_settlement' | 'filed_to_court' | 'court_hearing' | 'judgment_pending' | 'judgment_obtained' | 'enforcement' | 'collateral_seizure' | 'payment_plan' | 'partially_recovered' | 'fully_recovered' | 'write_off_recommended' | 'written_off' | 'closed' | 'cancelled';
  opened_at: string;
  last_action_at?: string;
  next_action_at?: string;
  closed_at?: string;
  closure_reason?: string;
  has_collateral: boolean;
  has_guarantor: boolean;
  missing_docs_count: number;
}

export interface LegalAction {
  id: string;
  legal_case_id: string;
  client_name: string;
  action_type: 'formal_notice' | 'lawyer_assignment' | 'legal_review' | 'court_filing' | 'hearing' | 'judgment' | 'enforcement_order' | 'bailiff_action' | 'collateral_seizure' | 'collateral_sale' | 'guarantor_claim' | 'settlement_agreement' | 'payment_plan_signed' | 'write_off_request' | 'case_closure';
  action_date: string;
  due_date: string;
  performed_by: string;
  external_party: string;
  result?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'failed';
  next_action_type?: string;
  next_action_date?: string;
  notes?: string;
  document_id?: string;
}

export interface LegalDocument {
  id: string;
  legal_case_id: string;
  client_name: string;
  document_type: 'loan_contract' | 'leasing_contract' | 'factoring_assignment' | 'invoice' | 'repayment_schedule' | 'payment_history' | 'reminder_history' | 'formal_notice' | 'client_id_document' | 'collateral_document' | 'guarantor_agreement' | 'court_filing' | 'court_summons' | 'judgment' | 'enforcement_order' | 'bailiff_report' | 'settlement_agreement' | 'write_off_approval';
  document_name: string;
  required: boolean;
  verified: boolean;
  verification_status: 'missing' | 'uploaded' | 'under_review' | 'verified' | 'rejected' | 'expired';
  uploaded_by?: string;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
  expiry_date?: string;
  notes?: string;
}

export interface Collateral {
  id: string;
  legal_case_id: string;
  client_name: string;
  collateral_type: 'equipment' | 'vehicle' | 'inventory' | 'land' | 'building' | 'savings_deposit' | 'salary_assignment' | 'invoice_receivable' | 'other';
  description: string;
  estimated_value: number;
  current_value: number;
  status: 'active' | 'under_review' | 'seizure_recommended' | 'seizure_started' | 'seized' | 'sold' | 'released' | 'invalid';
  seizure_started_at?: string;
  seized_at?: string;
  sold_at?: string;
  sale_amount?: number;
  released_at?: string;
  notes?: string;
}

export interface Guarantor {
  id: string;
  legal_case_id: string;
  client_name: string;
  full_name: string;
  phone: string;
  address: string;
  relationship: string;
  guarantee_amount: number;
  contacted_at?: string;
  status: 'active' | 'contacted' | 'payment_requested' | 'paid' | 'refused' | 'legal_action_started' | 'released';
  notes?: string;
}

export interface LegalFee {
  id: string;
  legal_case_id: string;
  client_name: string;
  fee_type: 'lawyer_fee' | 'bailiff_fee' | 'court_fee' | 'travel_fee' | 'administrative_fee' | 'collateral_seizure_fee' | 'collateral_sale_fee' | 'other';
  amount: number;
  currency: string;
  incurred_at: string;
  paid_at?: string;
  paid_by?: string;
  recoverable_from_client: boolean;
  recovered_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'partially_recovered' | 'recovered' | 'rejected' | 'written_off';
  notes?: string;
  document_id?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// ─── STORES LOAD & GENERATION ───

const STORAGE_KEYS = {
  PRE_LIT: 'recov_pre_lit_cases',
  LEGAL_CASES: 'recov_legal_cases',
  LEGAL_ACTIONS: 'recov_legal_actions',
  LEGAL_DOCS: 'recov_legal_doc_list',
  COLLATERALS: 'recov_collaterals_list',
  GUARANTORS: 'recov_guarantors_list',
  LEGAL_FEES: 'recov_legal_fees_list',
  AUDIT_LOGS: 'recov_lit_audit_logs'
};

const DEFAULT_PRE_LIT: PreLitigationCase[] = [
  {
    id: "PL-2026-0001",
    case_number: "PL-0155",
    client_name: "STE EL NOUR SARL",
    portfolio_type: "Microfinance",
    institution: "Enda Tamweel",
    branch: "Tunis Centre",
    overdue_amount: 14200,
    outstanding_amount: 18500,
    days_overdue: 110,
    reason_for_escalation: "Promesse de règlement rompue à trois reprises. Plus de contact téléphonique.",
    formal_notice_status: "sent",
    formal_notice_sent_at: "2026-05-10",
    final_deadline_date: "2026-06-05",
    client_response: "Client sollicite un énième report sans engagement financier ferme.",
    guarantor_contacted: true,
    documents_checked: false,
    recommended_action: "Ouverture judiciaire",
    status: "waiting_client_response",
    opened_at: "2026-05-02"
  },
  {
    id: "PL-2026-0002",
    case_number: "PL-0160",
    client_name: "BEN AMER SALMA",
    portfolio_type: "Leasing",
    institution: "Tunisie Leasing",
    branch: "Sousse Corniche",
    overdue_amount: 28000,
    outstanding_amount: 72000,
    days_overdue: 95,
    reason_for_escalation: "Échéances de crédit impayées depuis 3 mois. Matériel industriel localisé mais non restitué.",
    formal_notice_status: "pending",
    guarantor_contacted: false,
    documents_checked: true,
    recommended_action: "Mise en demeure par huissier",
    status: "formal_notice_pending",
    opened_at: "2026-05-15"
  },
  {
    id: "PL-2026-0003",
    case_number: "PL-0145",
    client_name: "SOCIETE MAGHREB SERVICES",
    portfolio_type: "Factoring",
    institution: "Amen Bank",
    branch: "Tunis Belvédère",
    overdue_amount: 85000,
    outstanding_amount: 85000,
    days_overdue: 130,
    reason_for_escalation: "Créance factoring approuvée mais débiteur conteste la conformité des livraisons de marchandises.",
    formal_notice_status: "received",
    formal_notice_sent_at: "2026-04-20",
    final_deadline_date: "2026-05-20",
    client_response: "Échec absolu des négociations à l'amiable.",
    guarantor_contacted: true,
    documents_checked: true,
    recommended_action: "Approbaton transfert juridique immédiat",
    status: "ready_for_litigation",
    opened_at: "2026-04-15"
  }
];

const DEFAULT_LEGAL_CASES: LegalCase[] = [
  {
    id: 'LIT-2026-0001',
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    portfolio_type: "Factoring",
    institution: "Amen Bank",
    branch: "Tunis Belvédère",
    legal_case_number: "RG-2026-8714",
    legal_officer_id: "Kamel Riahi",
    external_lawyer_id: "Maître Moncef Trabelsi",
    principal_due: 145000,
    interest_due: 4200,
    penalties_due: 2100,
    legal_fees_due: 2500,
    recoverable_fees: 3150,
    total_claim_amount: 153800,
    recovered_amount: 0,
    remaining_amount: 153800,
    recovery_rate: 0,
    risk_level: "Critique",
    priority_level: "Urgente",
    status: "in_process",
    opened_at: "2026-09-01",
    last_action_at: "2026-09-28",
    next_action_at: "2026-11-15",
    has_collateral: true,
    has_guarantor: true,
    missing_docs_count: 0
  },
  {
    id: 'LIT-2026-0002',
    client_name: "SOCIETE COMMERCIALE DU SUD SARL",
    portfolio_type: "Leasing",
    institution: "Tunisie Leasing",
    branch: "Sousse Corniche",
    legal_case_number: "RG-2026-1120",
    legal_officer_id: "Sonia Ben Amor",
    external_lawyer_id: "Maître Leila Ben Cheikh",
    principal_due: 68000,
    interest_due: 1850,
    penalties_due: 920,
    legal_fees_due: 1200,
    recoverable_fees: 1650,
    total_claim_amount: 71970,
    recovered_amount: 0,
    remaining_amount: 71970,
    recovery_rate: 0,
    risk_level: "Moyen",
    priority_level: "Normale",
    status: "pre_litigation",
    opened_at: "2026-09-12",
    last_action_at: "2026-10-01",
    next_action_at: "2026-10-20",
    has_collateral: true,
    has_guarantor: false,
    missing_docs_count: 0
  },
  {
    id: 'LIT-2026-0003',
    client_name: "COMPTOIR TUNISIEN DU BOIS SA",
    portfolio_type: "Factoring",
    institution: "Amen Bank",
    branch: "Lac Tunis",
    legal_case_number: "RG-2026-9122",
    legal_officer_id: "Karim Mansour",
    external_lawyer_id: "Maître Moncef Trabelsi",
    principal_due: 320000,
    interest_due: 5400,
    penalties_due: 0,
    legal_fees_due: 0,
    recoverable_fees: 0,
    total_claim_amount: 325400,
    recovered_amount: 0,
    remaining_amount: 325400,
    recovery_rate: 0,
    risk_level: "Élevé",
    priority_level: "Haute",
    status: "formal_notice",
    opened_at: "2026-09-10",
    last_action_at: "2026-10-02",
    has_collateral: false,
    has_guarantor: true,
    missing_docs_count: 1
  }
];

const DEFAULT_ACTIONS: LegalAction[] = [
  {
    id: "ACT-0001",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    action_type: "formal_notice",
    action_date: "2026-09-02",
    due_date: "2026-09-15",
    performed_by: "Kamel Riahi",
    external_party: "Huissier Mohamed Jaziri",
    result: "Signifiée en mains propres au gérant avec accusé.",
    status: "completed",
    notes: "Mise en demeure transmise par exploit d'huissier à Tunis."
  },
  {
    id: "ACT-0002",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    action_type: "court_filing",
    action_date: "2026-09-10",
    due_date: "2026-09-20",
    performed_by: "Maître Moncef Trabelsi",
    external_party: "Greffe TPI Tunis",
    result: "Enregistrement de la requête n°8714 au rôle.",
    status: "completed"
  },
  {
    id: "ACT-0003",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    action_type: "hearing",
    action_date: "2026-11-15",
    due_date: "2026-11-15",
    performed_by: "Maître Moncef Trabelsi",
    external_party: "Tribunal de Première Instance de Tunis",
    status: "planned",
    notes: "Audience d'examen de la requête d'injonction."
  },
  {
    id: "ACT-0004",
    legal_case_id: "LIT-2026-0002",
    client_name: "SOCIETE COMMERCIALE DU SUD SARL",
    action_type: "formal_notice",
    action_date: "2026-09-15",
    due_date: "2026-09-30",
    performed_by: "Sonia Ben Amor",
    external_party: "Huissier Tarek Khemir",
    result: "Mise en demeure notifiée avec sommation de restitution du matériel.",
    status: "completed"
  }
];

const DEFAULT_DOCUMENTS: LegalDocument[] = [
  {
    id: "DOC-0001",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    document_type: "factoring_assignment",
    document_name: "Contrat de Factoring n°FAC-2026-0891.pdf",
    required: true,
    verified: true,
    verification_status: "verified",
    uploaded_by: "Kamel Riahi",
    uploaded_at: "2026-09-02",
    verified_by: "Directeur des Risques",
    verified_at: "2026-09-03",
    notes: "Original certifié conforme."
  },
  {
    id: "DOC-0002",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    document_type: "formal_notice",
    document_name: "Exploit d'huissier - Mise en demeure.pdf",
    required: true,
    verified: true,
    verification_status: "verified",
    uploaded_by: "Huissier Mohamed Jaziri",
    uploaded_at: "2026-09-05",
    verified_by: "Kamel Riahi",
    verified_at: "2026-09-06"
  },
  {
    id: "DOC-0003",
    legal_case_id: "LIT-2026-0002",
    client_name: "SOCIETE COMMERCIALE DU SUD SARL",
    document_type: "leasing_contract",
    document_name: "Contrat de Leasing n°LSG-2026-001.pdf",
    required: true,
    verified: true,
    verification_status: "verified",
    uploaded_by: "Sonia Ben Amor",
    uploaded_at: "2026-09-15",
    verified_by: "Sonia Ben Amor",
    verified_at: "2026-09-16"
  }
];

const DEFAULT_COLLATERALS: Collateral[] = [
  {
    id: "COL-0001",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    collateral_type: "building",
    description: "Hypothèque commerciale de 1er rang sur local industriel à Tunis Belvédère.",
    estimated_value: 180000,
    current_value: 180000,
    status: "active",
    notes: "Titre foncier tunisien n°145547"
  },
  {
    id: "COL-0002",
    legal_case_id: "LIT-2026-0002",
    client_name: "SOCIETE COMMERCIALE DU SUD SARL",
    collateral_type: "equipment",
    description: "Centre d'usinage numérique DMG Mori DMU 50 gagé au profit du bailleur.",
    estimated_value: 75000,
    current_value: 65000,
    status: "active",
    notes: "Matériel localisé sur site industriel à Sousse."
  }
];

const DEFAULT_GUARANTORS: Guarantor[] = [
  {
    id: "GUA-0001",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    full_name: "Sami Trabelsi",
    phone: "+216 71 840 220",
    address: "Avenue de Carthage, Tunis",
    relationship: "Gérant majoritaire",
    guarantee_amount: 150000,
    status: "active"
  },
  {
    id: "GUA-0002",
    legal_case_id: "LIT-2026-0003",
    client_name: "COMPTOIR TUNISIEN DU BOIS SA",
    full_name: "Karim Mansour",
    phone: "+216 71 960 450",
    address: "Zone Portuaire Rades, Tunis",
    relationship: "Directeur Général associé",
    guarantee_amount: 320000,
    status: "active"
  }
];

const DEFAULT_FEES: LegalFee[] = [
  {
    id: "FEE-0001",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    fee_type: "lawyer_fee",
    amount: 2500,
    currency: "TND",
    incurred_at: "2026-09-10",
    paid_at: "2026-09-15",
    paid_by: "Banque RecovAI",
    recoverable_from_client: true,
    recovered_amount: 0,
    status: "paid",
    notes: "Provision d'ouverture d'injonction de payer - Maître Trabelsi"
  },
  {
    id: "FEE-0002",
    legal_case_id: "LIT-2026-0001",
    client_name: "STE MEDITERRANEE TEXTILE SARL",
    fee_type: "bailiff_fee",
    amount: 650,
    currency: "TND",
    incurred_at: "2026-09-05",
    paid_at: "2026-09-08",
    paid_by: "Banque RecovAI",
    recoverable_from_client: true,
    recovered_amount: 0,
    status: "paid",
    notes: "Frais de signification exploit d'huissier - Huissier Jaziri"
  },
  {
    id: "FEE-0003",
    legal_case_id: "LIT-2026-0002",
    client_name: "SOCIETE COMMERCIALE DU SUD SARL",
    fee_type: "bailiff_fee",
    amount: 450,
    currency: "TND",
    incurred_at: "2026-09-15",
    paid_at: "2026-09-18",
    paid_by: "Banque RecovAI",
    recoverable_from_client: true,
    recovered_amount: 0,
    status: "paid",
    notes: "Frais de notification mise en demeure - Huissier Tarek Khemir"
  }
];

const DEFAULT_AUDIT: AuditLog[] = [
  {
    id: "AUD-0001",
    timestamp: "2026-09-01T08:00:00Z",
    user: "admin@recovai.tn",
    action: "Ouverture du système",
    details: "Accès à l'espace d'audit contentieux"
  }
];

// Helper to check/initialize storage
function initStorage<T>(key: string, defaults: T): T {
  const existing = localStorage.getItem(key);
  if (!existing) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(existing);
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
}

// ─── STATE CLASS / EXPORTS ───

export const LitigationStore = {
  getPreLitCases(): PreLitigationCase[] {
    return initStorage(STORAGE_KEYS.PRE_LIT, DEFAULT_PRE_LIT);
  },
  savePreLitCases(list: PreLitigationCase[]) {
    localStorage.setItem(STORAGE_KEYS.PRE_LIT, JSON.stringify(list));
  },
  
  getLegalCases(): LegalCase[] {
    return initStorage(STORAGE_KEYS.LEGAL_CASES, DEFAULT_LEGAL_CASES);
  },
  saveLegalCases(list: LegalCase[]) {
    localStorage.setItem(STORAGE_KEYS.LEGAL_CASES, JSON.stringify(list));
  },

  getLegalActions(): LegalAction[] {
    return initStorage(STORAGE_KEYS.LEGAL_ACTIONS, DEFAULT_ACTIONS);
  },
  saveLegalActions(list: LegalAction[]) {
    localStorage.setItem(STORAGE_KEYS.LEGAL_ACTIONS, JSON.stringify(list));
  },

  getLegalDocuments(): LegalDocument[] {
    return initStorage(STORAGE_KEYS.LEGAL_DOCS, DEFAULT_DOCUMENTS);
  },
  saveLegalDocuments(list: LegalDocument[]) {
    localStorage.setItem(STORAGE_KEYS.LEGAL_DOCS, JSON.stringify(list));
  },

  getCollaterals(): Collateral[] {
    return initStorage(STORAGE_KEYS.COLLATERALS, DEFAULT_COLLATERALS);
  },
  saveCollaterals(list: Collateral[]) {
    localStorage.setItem(STORAGE_KEYS.COLLATERALS, JSON.stringify(list));
  },

  getGuarantors(): Guarantor[] {
    return initStorage(STORAGE_KEYS.GUARANTORS, DEFAULT_GUARANTORS);
  },
  saveGuarantors(list: Guarantor[]) {
    localStorage.setItem(STORAGE_KEYS.GUARANTORS, JSON.stringify(list));
  },

  getLegalFees(): LegalFee[] {
    return initStorage(STORAGE_KEYS.LEGAL_FEES, DEFAULT_FEES);
  },
  saveLegalFees(list: LegalFee[]) {
    localStorage.setItem(STORAGE_KEYS.LEGAL_FEES, JSON.stringify(list));
  },

  getAuditLogs(): AuditLog[] {
    return initStorage(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT);
  },
  logAction(user: string, action: string, details: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      user: user || "système@recovai.com",
      action,
      details
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  },

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.PRE_LIT, JSON.stringify(DEFAULT_PRE_LIT));
    localStorage.setItem(STORAGE_KEYS.LEGAL_CASES, JSON.stringify(DEFAULT_LEGAL_CASES));
    localStorage.setItem(STORAGE_KEYS.LEGAL_ACTIONS, JSON.stringify(DEFAULT_ACTIONS));
    localStorage.setItem(STORAGE_KEYS.LEGAL_DOCS, JSON.stringify(DEFAULT_DOCUMENTS));
    localStorage.setItem(STORAGE_KEYS.COLLATERALS, JSON.stringify(DEFAULT_COLLATERALS));
    localStorage.setItem(STORAGE_KEYS.GUARANTORS, JSON.stringify(DEFAULT_GUARANTORS));
    localStorage.setItem(STORAGE_KEYS.LEGAL_FEES, JSON.stringify(DEFAULT_FEES));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEFAULT_AUDIT));
    try {
      localStorage.removeItem('nouveau_dossier_draft');
      localStorage.removeItem('credit_analyses_history');
    } catch {
      // ignore
    }
    this.logAction("Administrateur", "Réinitialisation Démo", "Remise à zéro des dossiers contentieux et pré-contentieux pour nouvelle démo");
  },

  resetToEmpty() {
    localStorage.setItem(STORAGE_KEYS.PRE_LIT, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LEGAL_CASES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LEGAL_ACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LEGAL_DOCS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COLLATERALS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.GUARANTORS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LEGAL_FEES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    try {
      localStorage.removeItem('nouveau_dossier_draft');
      localStorage.removeItem('credit_analyses_history');
    } catch {
      // ignore
    }
    this.logAction("Administrateur", "Vidage Portefeuille", "Portefeuille entièrement vidé (0 dossier)");
  }
};
