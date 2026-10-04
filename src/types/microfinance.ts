export interface MfiClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  branch: string;
  businessSector: string;
}

export interface LoanAccount {
  id: string;
  clientId: string;
  clientName: string;
  loanNumber: string;
  originalAmount: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  outstandingFees: number;
  totalOutstanding: number;
  disbursementDate: string;
  maturityDate: string;
  status: 'active' | 'watchlist' | 'in_arrears' | 'restructured' | 'litigation' | 'written_off' | 'closed';
  assignedAgentId: string;
  assignedAgentName: string;
}

export interface RepaymentInstallment {
  id: string;
  loanAccountId: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  overdueAmount: number;
  daysPastDue: number;
  status: 'upcoming' | 'paid' | 'partially_paid' | 'overdue';
}

export interface CollectionCase {
  id: string;
  loanAccountId: string;
  loanNumber: string;
  clientId: string;
  clientName: string;
  assignedAgentId: string;
  assignedAgentName: string;
  overdueAmount: number;
  daysPastDue: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'assigned' | 'in_progress' | 'promise_to_pay' | 'recovered' | 'escalated' | 'pre_litigation' | 'transferred_to_litigation';
  openedAt: string;
  lastActionAt?: string;
  parBucket: 'current' | 'PAR_1_7' | 'PAR_8_30' | 'PAR_31_90' | 'PAR_90_plus';
}

export interface CollectionAction {
  id: string;
  collectionCaseId: string;
  actionType: 'sms_sent' | 'whatsapp_sent' | 'phone_call' | 'field_visit' | 'letter_sent' | 'promise_recorded' | 'case_escalated';
  actorName: string;
  actionDate: string;
  result: 'client_reached' | 'client_unreachable' | 'promise_to_pay' | 'refuses_to_pay' | 'partial_payment' | 'full_payment' | 'escalation_required';
  comment: string;
  nextActionDate?: string;
}

export interface PromiseToPay {
  id: string;
  collectionCaseId: string;
  clientName: string;
  promisedAmount: number;
  promisedDate: string;
  status: 'pending' | 'fulfilled' | 'broken';
  createdAt: string;
}

export interface FieldVisit {
  id: string;
  collectionCaseId: string;
  clientName: string;
  assignedAgentName: string;
  plannedDate: string;
  actualVisitDate?: string;
  visitStatus: 'planned' | 'completed' | 'missed' | 'cancelled';
  result?: string;
  notes?: string;
}

export interface RecoveryPayment {
  id: string;
  collectionCaseId: string;
  loanAccountId: string;
  clientName: string;
  amount: number;
  paymentMethod: 'cash' | 'mobile_money' | 'bank_transfer';
  receivedBy: string;
  receivedAt: string;
  status: 'pending' | 'confirmed';
  receiptNumber: string;
}

export interface LegalCase {
  id: string;
  collectionCaseId: string;
  loanAccountId: string;
  clientName: string;
  legalCaseNumber: string;
  legalOfficerName: string;
  externalLawyerName: string;
  principalDue: number;
  interestDue: number;
  legalFees: number;
  totalClaimAmount: number;
  status: 'opened' | 'formal_notice' | 'filed_to_court' | 'court_hearing' | 'judgment_obtained' | 'enforcement' | 'seizure' | 'completed' | 'write_off';
  openedAt: string;
  closedAt?: string;
}

export interface LegalAction {
  id: string;
  legalCaseId: string;
  actionType: 'formal_notice' | 'court_filing' | 'hearing' | 'judgment' | 'bailiff_action' | 'seizure' | 'settlement';
  actionDate: string;
  performedBy: string;
  result: string;
  notes: string;
}

export interface LegalDocument {
  id: string;
  legalCaseId: string;
  documentType: 'contract' | 'notice' | 'complaint' | 'judgment' | 'guarantee';
  documentName: string;
  uploadedAt: string;
  sizeKb: number;
}

export interface Collateral {
  id: string;
  loanAccountId: string;
  collateralType: 'vehicle' | 'equipment' | 'inventory' | 'building' | 'savings';
  description: string;
  estimatedValue: number;
  status: 'active' | 'seized' | 'sold' | 'released';
}

export interface Guarantor {
  id: string;
  loanAccountId: string;
  name: string;
  phone: string;
  relationship: string;
  guaranteeAmount: number;
  status: 'active' | 'contacted' | 'paid' | 'released';
}

export interface MfiAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  category: 'portfolio' | 'collection' | 'promise' | 'visit' | 'payment' | 'litigation' | 'system';
}

export interface MfiSettings {
  gracePeriodDays: number;
  litigationThresholdDays: number;
  maxBrokenPromises: number;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
}
