export interface Debtor {
  id: string;
  name: string;
  registrationNumber: string;
  taxId: string;
  address: string;
  riskScore: number; // 0 - 100 where higher is safer
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  approvedLimit: number;
  usedLimit: number;
  paymentDelayAverage: number; // in days
  status: 'new' | 'under_review' | 'approved' | 'rejected' | 'blocked';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientCode: string;
  debtorId: string;
  debtorName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  remainingAmount: number;
  status: 'draft' | 'issued' | 'eligible' | 'ineligible' | 'submitted' | 'financed' | 'partially_paid' | 'paid' | 'overdue' | 'disputed';
  eligibilityStatus: 'eligible' | 'ineligible' | 'checking';
  eligibilityReasons: string[];
  documentUrl?: string;
  created_at: string;
}

export interface FactoringRequest {
  id: string;
  requestNumber: string;
  companyName: string;
  debtorNames: string[];
  totalInvoiceAmount: number;
  requestedAdvanceRate: number; // e.g., 0.85 (85%)
  approvedAdvanceRate: number; // e.g., 0.85
  estimatedFees: number;
  reserveAmount: number; // e.g., 15%
  netDisbursedAmount: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'signed' | 'funded' | 'closed';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  signedAt?: string;
  fundedAt?: string;
  invoices: Invoice[];
}

export interface Funding {
  id: string;
  requestId: string;
  requestNumber: string;
  grossAmount: number;
  advanceRate: number;
  advanceAmount: number;
  reserveAmount: number;
  factoringFee: number;
  financingFee: number;
  netDisbursedAmount: number;
  status: 'pending' | 'approved' | 'disbursed' | 'failed';
  disbursedAt?: string;
}

export interface Dispute {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  debtorName: string;
  reason: 'disagreement_amount' | 'undelivered_goods' | 'damaged_goods' | 'late_delivery' | 'other';
  description: string;
  disputedAmount: number;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  openedAt: string;
  resolvedAt?: string;
}

export interface AccountingEntry {
  id: string;
  requestId?: string;
  invoiceId?: string;
  entryDate: string;
  description: string;
  transactions: {
    accountNumber: string;
    accountLabel: string;
    debit: number;
    credit: number;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  category: 'invoice' | 'request' | 'payment' | 'dispute' | 'accounting';
}
