import { Debtor, Invoice, FactoringRequest, Dispute, AccountingEntry, AuditLog } from '../types/factoring';

// Standard Tunisian companies as Debtors for Factoring
export const initialDebtors: Debtor[] = [
  {
    id: 'd-1',
    name: 'SOCIETE TUNISIENNE DE SIDERURGIE S.A. (EL FOULADH)',
    registrationNumber: 'B1812811996',
    taxId: '0001235F/A/M/000',
    address: 'Zone Industrielle, Menzel Bourguiba, Tunisie',
    riskScore: 82,
    riskGrade: 'B',
    approvedLimit: 500000,
    usedLimit: 145000,
    paymentDelayAverage: 45,
    status: 'approved'
  },
  {
    id: 'd-2',
    name: 'OPERATEUR TELECOM DEMO S.A.',
    registrationNumber: 'B1123451995',
    taxId: '0456123D/A/C/000',
    address: 'Rue Asdrubal, Belvédère, Tunis, Tunisie',
    riskScore: 95,
    riskGrade: 'A',
    approvedLimit: 1200000,
    usedLimit: 320000,
    paymentDelayAverage: 28,
    status: 'approved'
  },
  {
    id: 'd-3',
    name: 'CERAMIQUE DEMO SARL',
    registrationNumber: 'B245672002',
    taxId: '1023456K/B/M/000',
    address: 'Zone Industrielle Charguia II, Tunis, Tunisie',
    riskScore: 68,
    riskGrade: 'C',
    approvedLimit: 300000,
    usedLimit: 85000,
    paymentDelayAverage: 58,
    status: 'approved'
  },
  {
    id: 'd-4',
    name: 'STE EXPORT-SUD TUNISIE',
    registrationNumber: 'B189032015',
    taxId: '1290345Y/D/N/000',
    address: 'Route de Gabès, Sfax, Tunisie',
    riskScore: 45,
    riskGrade: 'D',
    approvedLimit: 150000,
    usedLimit: 120000,
    paymentDelayAverage: 78,
    status: 'approved'
  },
  {
    id: 'd-5',
    name: 'SOCIETE GENERALE TRADING CO.',
    registrationNumber: 'B221142018',
    taxId: '1543890H/R/M/000',
    address: 'Avenue de Paris, Tunis, Tunisie',
    riskScore: 25,
    riskGrade: 'E',
    approvedLimit: 50000,
    usedLimit: 48000,
    paymentDelayAverage: 95,
    status: 'blocked'
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'FAC-2026-101',
    clientCode: 'CLI-9902',
    debtorId: 'd-2',
    debtorName: 'OPERATEUR TELECOM DEMO S.A.',
    issueDate: '2026-05-15',
    dueDate: '2026-07-15',
    amount: 120000,
    remainingAmount: 120000,
    status: 'eligible',
    eligibilityStatus: 'eligible',
    eligibilityReasons: ['Facture non échue', 'Débiteur validé avec score élevé (Grade A)', 'Solde disponible suffisant dans le plafond débiteur'],
    created_at: '2026-05-15T10:00:00Z'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FAC-2026-102',
    clientCode: 'CLI-4401',
    debtorId: 'd-1',
    debtorName: 'SOCIETE TUNISIENNE DE SIDERURGIE S.A. (EL FOULADH)',
    issueDate: '2026-05-20',
    dueDate: '2026-08-20',
    amount: 85000,
    remainingAmount: 85000,
    status: 'eligible',
    eligibilityStatus: 'eligible',
    eligibilityReasons: ['Facture non échue', 'Débiteur approuvé (Grade B)'],
    created_at: '2026-05-20T09:30:00Z'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'FAC-2026-103',
    clientCode: 'CLI-9902',
    debtorId: 'd-3',
    debtorName: 'CERAMIQUE DEMO SARL',
    issueDate: '2026-05-10',
    dueDate: '2026-07-10',
    amount: 45000,
    remainingAmount: 45000,
    status: 'eligible',
    eligibilityStatus: 'eligible',
    eligibilityReasons: ['Facture non échue', 'Débiteur acceptable sous contrôle de plafond (Grade C)'],
    created_at: '2026-05-10T14:20:00Z'
  },
  {
    id: 'inv-4',
    invoiceNumber: 'FAC-2026-098',
    clientCode: 'CLI-5520',
    debtorId: 'd-5',
    debtorName: 'SOCIETE GENERALE TRADING CO.',
    issueDate: '2026-03-01',
    dueDate: '2026-05-01',
    amount: 22000,
    remainingAmount: 22000,
    status: 'ineligible',
    eligibilityStatus: 'ineligible',
    eligibilityReasons: ['Facture déjà échue (retard)', 'Débiteur bloqué / Risque critique (Grade E)'],
    created_at: '2026-03-01T11:00:00Z'
  },
  {
    id: 'inv-5',
    invoiceNumber: 'FAC-2026-095',
    clientCode: 'CLI-9902',
    debtorId: 'd-4',
    debtorName: 'STE EXPORT-SUD TUNISIE',
    issueDate: '2026-05-01',
    dueDate: '2026-07-01',
    amount: 95000,
    remainingAmount: 95000,
    status: 'eligible',
    eligibilityStatus: 'eligible',
    eligibilityReasons: ['Facture dans les critères d\'échéance', 'Plafond disponible restant suffisant'],
    created_at: '2026-05-01T08:00:00Z'
  }
];

export const initialRequests: FactoringRequest[] = [
  {
    id: 'req-1',
    requestNumber: 'REQ-FACT-2026-001',
    companyName: 'RecovAI Cédant Démo',
    debtorNames: ['OPERATEUR TELECOM DEMO S.A.'],
    totalInvoiceAmount: 240000,
    requestedAdvanceRate: 0.85,
    approvedAdvanceRate: 0.85,
    estimatedFees: 4800,
    reserveAmount: 36000,
    netDisbursedAmount: 199200,
    status: 'funded',
    submittedAt: '2026-05-25T09:00:00Z',
    approvedAt: '2026-05-25T11:30:00Z',
    signedAt: '2026-05-26T14:15:00Z',
    fundedAt: '2026-05-26T16:00:00Z',
    invoices: [
      {
        id: 'inv-ref-1',
        invoiceNumber: 'FAC-2026-088',
        clientCode: 'CLI-9902',
        debtorId: 'd-2',
        debtorName: 'OPERATEUR TELECOM DEMO S.A.',
        issueDate: '2026-05-01',
        dueDate: '2026-07-01',
        amount: 240000,
        remainingAmount: 240000,
        status: 'financed',
        eligibilityStatus: 'eligible',
        eligibilityReasons: ['Débiteur Grade A', 'Montant éligible'],
        created_at: '2026-05-01T09:00:00Z'
      }
    ]
  }
];

export const initialDisputes: Dispute[] = [];

export const initialAccounting: AccountingEntry[] = [
  {
    id: 'acc-1',
    requestId: 'req-1',
    entryDate: '2026-05-26',
    description: 'Versement de l\'avance & Financement REQ-FACT-2026-001',
    transactions: [
      { accountNumber: '512100', accountLabel: 'Banque - Compte Courant TND', debit: 199200, credit: 0 },
      { accountNumber: '627800', accountLabel: 'Commissions d\'affacturage & Frais', debit: 4800, credit: 0 },
      { accountNumber: '275000', accountLabel: 'Fonds de Garantie (Réserves bloquées)', debit: 36000, credit: 0 },
      { accountNumber: '411100', accountLabel: 'Cession de Créance Débiteur TT', debit: 0, credit: 240000 }
    ]
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-05-25T09:00:00Z',
    user: 'zeid.dhambri@gmail.com',
    action: 'Dépôt de demande de financement',
    details: 'Demande REQ-FACT-2026-001 de 240,000 TND créée.',
    category: 'request'
  },
  {
    id: 'log-2',
    timestamp: '2026-05-25T11:30:00Z',
    user: 'Factor Risques Tunis',
    action: 'Score & Limitation validés',
    details: 'Limite de financement validée à 85% avec de faibles commissions.',
    category: 'request'
  }
];

// Helper to load/save state in localStorage
export function getFactoringState() {
  const debtors = localStorage.getItem('fact_debtors');
  const invoices = localStorage.getItem('fact_invoices');
  const requests = localStorage.getItem('fact_requests');
  const disputes = localStorage.getItem('fact_disputes');
  const accounting = localStorage.getItem('fact_accounting');
  const auditLogs = localStorage.getItem('fact_auditLogs');

  return {
    debtors: debtors ? JSON.parse(debtors) : initialDebtors,
    invoices: invoices ? JSON.parse(invoices) : initialInvoices,
    requests: requests ? JSON.parse(requests) : initialRequests,
    disputes: disputes ? JSON.parse(disputes) : initialDisputes,
    accounting: accounting ? JSON.parse(accounting) : initialAccounting,
    auditLogs: auditLogs ? JSON.parse(auditLogs) : initialAuditLogs
  };
}

export function saveFactoringState(state: {
  debtors: Debtor[];
  invoices: Invoice[];
  requests: FactoringRequest[];
  disputes: Dispute[];
  accounting: AccountingEntry[];
  auditLogs: AuditLog[];
}) {
  localStorage.setItem('fact_debtors', JSON.stringify(state.debtors));
  localStorage.setItem('fact_invoices', JSON.stringify(state.invoices));
  localStorage.setItem('fact_requests', JSON.stringify(state.requests));
  localStorage.setItem('fact_disputes', JSON.stringify(state.disputes));
  localStorage.setItem('fact_accounting', JSON.stringify(state.accounting));
  localStorage.setItem('fact_auditLogs', JSON.stringify(state.auditLogs));
}

// Check eligibility of an invoice
export function checkInvoiceEligibility(invoice: { amount: number; dueDate: string }, debtor: Debtor): {
  status: 'eligible' | 'ineligible';
  reasons: string[];
} {
  const reasons: string[] = [];
  let eligible = true;

  // Rule 1: Check due date is in the future
  const today = new Date('2026-05-30'); // System constant date for consistency
  const due = new Date(invoice.dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    eligible = false;
    reasons.push('La facture est déjà échue.');
  } else if (diffDays > 120) {
    eligible = false;
    reasons.push(`L'échéance (${diffDays} jours) dépasse la limite maximale autorisée (120 jours).`);
  } else {
    reasons.push(`Échéance valide dans ${diffDays} jours (limite standard de 120 jours respectée).`);
  }

  // Rule 2: Minimum and Maximum Invoice Amount
  const MIN_AMOUNT = 1000;
  const MAX_AMOUNT = 500000;
  if (invoice.amount < MIN_AMOUNT) {
    eligible = false;
    reasons.push(`Le montant de la facture est inférieur au minimum éligible de ${MIN_AMOUNT} TND.`);
  } else if (invoice.amount > MAX_AMOUNT) {
    eligible = false;
    reasons.push(`Le montant dépasse la taille maximale éligible de ${MAX_AMOUNT} TND.`);
  } else {
    reasons.push(`Montant de ${invoice.amount.toLocaleString()} TND vérifié dans la fourchette d'éligibilité.`);
  }

  // Rule 3: Debtor Status and Risk
  if (debtor.status === 'blocked') {
    eligible = false;
    reasons.push(`Le débiteur est actuellement bloqué (Score Grade E, risque critique de défaut).`);
  } else if (debtor.status === 'under_review') {
    eligible = false;
    reasons.push(`Le débiteur est en cours d'audit juridique. Financement suspendu temporairement.`);
  } else {
    reasons.push(`Débiteur certifié actif (Plafond disponible restant: ${(debtor.approvedLimit - debtor.usedLimit).toLocaleString()} TND).`);
  }

  // Rule 4: Plafond de concentration
  const availableLimit = debtor.approvedLimit - debtor.usedLimit;
  if (invoice.amount > availableLimit) {
    eligible = false;
    reasons.push(`Le montant de la facture dépasse l'encours disponible autorisé pour ce débiteur (${availableLimit.toLocaleString()} TND restant).`);
  }

  return {
    status: eligible ? 'eligible' : 'ineligible',
    reasons
  };
}

// Calculate precise costing of factoring
export function calculateFactoringCosts(amount: number, advanceRate: number, riskGrade: Debtor['riskGrade']) {
  // Config rates based on Risk Grade
  const ratesConfig = {
    A: { factoringFeeRate: 0.012, interestAnnualRate: 0.055 }, // Low risk (1.2% commission, 5.5% financing interest)
    B: { factoringFeeRate: 0.016, interestAnnualRate: 0.065 },
    C: { factoringFeeRate: 0.022, interestAnnualRate: 0.075 },
    D: { factoringFeeRate: 0.035, interestAnnualRate: 0.090 },
    E: { factoringFeeRate: 0.050, interestAnnualRate: 0.120 }
  };

  const currentRates = ratesConfig[riskGrade] || ratesConfig.C;

  const advanceAmount = amount * advanceRate;
  const reserveAmount = amount * (1 - advanceRate);

  // Commision d'affacturage
  const factoringFee = amount * currentRates.factoringFeeRate;

  // Interêts de financement (Simulated for average Credit Term of 60 days)
  const CreditTermDays = 60;
  const financingFee = (advanceAmount * currentRates.interestAnnualRate / 365) * CreditTermDays;

  const estimatedFees = factoringFee + financingFee;
  const netDisbursedAmount = advanceAmount - estimatedFees;

  return {
    advanceAmount,
    reserveAmount,
    factoringFee,
    financingFee,
    estimatedFees,
    netDisbursedAmount,
    rates: currentRates
  };
}
