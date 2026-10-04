// Frontend-only mock store for the Leasing module.
// Realistic Tunisian banking leasing portfolio. No backend wiring.

import {
  Car, Factory, Building2, Monitor, Settings as SettingsIcon, Package,
  type LucideIcon,
} from 'lucide-react';

// ───────── Types ─────────
export type LeasingStatus =
  | 'active'
  | 'late'
  | 'recovery'
  | 'early_termination'
  | 'litigation'
  | 'closed_paid'
  | 'written_off'
  | 'asset_recovered';

export type AssetType = 'vehicle' | 'equipment' | 'real_estate' | 'it_hardware' | 'industrial' | 'other';

export type InstallmentStatus = 'pending' | 'paid' | 'partial' | 'late';

export type ActionChannel = 'call' | 'sms' | 'email' | 'whatsapp' | 'letter' | 'visit';
export type ActionOutcome = 'no_response' | 'promise' | 'partial_payment' | 'paid' | 'refused' | 'callback';

export type TerminationFormula = 'remaining_capital' | 'capital_plus_3rents' | 'flat_indemnity';

export type NotificationType =
  | 'overdue_d1' | 'overdue_d8' | 'overdue_d30' | 'overdue_d60'
  | 'insurance_expiry' | 'maturity_warning' | 'broken_promise';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface Lessee {
  id: string;
  name: string;
  siren?: string;
  address: string;
  city: string;
  zip: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export interface LeasingAsset {
  type: AssetType;
  description: string;
  brand?: string;
  model?: string;
  serial?: string;
  acquisitionValue: number;
  residualValue?: number;
}

export interface LeasingFinancials {
  monthlyRent: number;
  interestRate: number;       // annual %
  deposit: number;
  totalCapital: number;
  remainingCapital: number;
  terminationFormula: TerminationFormula;
}

export interface LeasingGuarantor {
  name: string;
  type: 'personal' | 'corporate' | 'bank';
  guaranteedAmount: number;
  contact?: string;
}

export interface LeasingInsurance {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverageAmount: number;
}

export interface LeasingInstallment {
  id: string;
  number: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  amount: number;
  status: InstallmentStatus;
  paidAmount: number;
  paidDate?: string;
  daysLate: number;
}

export interface LeasingAction {
  id: string;
  date: string;
  channel: ActionChannel;
  outcome: ActionOutcome;
  agent: string;
  notes?: string;
}

export interface LeasingTermination {
  id: string;
  requestDate: string;
  reason: string;
  step: 'requested' | 'indemnity_calculated' | 'asset_returned' | 'guarantor_activated' | 'closed';
  indemnityAmount: number;
  formulaUsed: TerminationFormula;
  assetReturn?: { date: string; condition: 'good' | 'fair' | 'damaged'; notes?: string };
  guarantorActivated: boolean;
}

export interface LeasingDocument {
  id: string;
  name: string;
  template?: 'mise_en_demeure_leasing' | 'lettre_resiliation' | 'pv_restitution';
  type: 'generated' | 'uploaded';
  category: string;
  date: string;
  status: 'draft' | 'sent' | 'signed' | 'filed';
  size?: string;
}

export interface LeasingNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  date: string;
  message: string;
  read: boolean;
}

export interface LeasingContract {
  id: string;                        // LEAS-YYYY-XXXX
  lessee: Lessee;
  lessor: string;                    // bank or leasing co.
  status: LeasingStatus;
  startDate: string;
  endDate: string;
  firstDueDate: string;
  paymentFrequency: 'monthly' | 'quarterly';
  asset: LeasingAsset;
  financials: LeasingFinancials;
  guarantor?: LeasingGuarantor;
  insurance?: LeasingInsurance;
  riskScore: number;                 // 0-100 (higher = riskier)
  agent: string;
  installments: LeasingInstallment[];
  actions: LeasingAction[];
  termination?: LeasingTermination;
  documents: LeasingDocument[];
  notifications: LeasingNotification[];
  litigationCaseId?: string;         // link to LIT-XXXX
}

// ───────── Configuration ─────────
export const STATUS_CONFIG: Record<LeasingStatus, { label: string; color: string; bg: string; ring: string; dot: string }> = {
  active:            { label: 'Actif',              color: 'text-teal-700',    bg: 'bg-teal-100',    ring: 'ring-teal-300',    dot: 'bg-teal-500' },
  late:              { label: 'En retard',          color: 'text-amber-700',   bg: 'bg-amber-100',   ring: 'ring-amber-300',   dot: 'bg-amber-500' },
  recovery:          { label: 'En recouvrement',    color: 'text-orange-700',  bg: 'bg-orange-100',  ring: 'ring-orange-300',  dot: 'bg-orange-500' },
  early_termination: { label: 'Résiliation',        color: 'text-rose-700',    bg: 'bg-rose-100',    ring: 'ring-rose-300',    dot: 'bg-rose-500' },
  litigation:        { label: 'Contentieux',        color: 'text-red-700',     bg: 'bg-red-100',     ring: 'ring-red-300',     dot: 'bg-red-500' },
  closed_paid:       { label: 'Soldé',              color: 'text-emerald-700', bg: 'bg-emerald-100', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
  written_off:       { label: 'Passé en perte',     color: 'text-slate-700',   bg: 'bg-slate-200',   ring: 'ring-slate-400',   dot: 'bg-slate-500' },
  asset_recovered:   { label: 'Bien récupéré',      color: 'text-purple-700',  bg: 'bg-purple-100',  ring: 'ring-purple-300',  dot: 'bg-purple-500' },
};

export const ASSET_TYPE_CONFIG: Record<AssetType, { label: string; icon: LucideIcon }> = {
  vehicle:     { label: 'Véhicule',         icon: Car },
  equipment:   { label: 'Équipement',       icon: SettingsIcon },
  real_estate: { label: 'Immobilier',       icon: Building2 },
  it_hardware: { label: 'Matériel IT',      icon: Monitor },
  industrial:  { label: 'Industriel',       icon: Factory },
  other:       { label: 'Autre',            icon: Package },
};

export const CHANNEL_CONFIG: Record<ActionChannel, { label: string; color: string }> = {
  call:     { label: 'Appel',     color: 'bg-blue-100 text-blue-700' },
  sms:      { label: 'SMS',       color: 'bg-cyan-100 text-cyan-700' },
  email:    { label: 'Email',     color: 'bg-indigo-100 text-indigo-700' },
  whatsapp: { label: 'WhatsApp',  color: 'bg-emerald-100 text-emerald-700' },
  letter:   { label: 'Courrier',  color: 'bg-amber-100 text-amber-700' },
  visit:    { label: 'Visite',    color: 'bg-purple-100 text-purple-700' },
};

export const OUTCOME_LABELS: Record<ActionOutcome, string> = {
  no_response:     'Sans réponse',
  promise:         'Promesse',
  partial_payment: 'Paiement partiel',
  paid:            'Payé',
  refused:         'Refus',
  callback:        'Rappel demandé',
};

export const TERMINATION_FORMULA_LABELS: Record<TerminationFormula, string> = {
  remaining_capital:    'Capital restant dû',
  capital_plus_3rents:  'Capital + 3 loyers',
  flat_indemnity:       'Indemnité forfaitaire',
};

export const NOTIFICATION_CONFIG: Record<NotificationType, { label: string; severity: NotificationSeverity }> = {
  overdue_d1:        { label: 'Retard J+1',                  severity: 'info' },
  overdue_d8:        { label: 'Retard J+8',                  severity: 'warning' },
  overdue_d30:       { label: 'Retard J+30',                 severity: 'warning' },
  overdue_d60:       { label: 'Retard J+60',                 severity: 'critical' },
  insurance_expiry:  { label: 'Expiration assurance',        severity: 'warning' },
  maturity_warning:  { label: 'Échéance contrat proche',     severity: 'info' },
  broken_promise:    { label: 'Promesse non tenue',          severity: 'critical' },
};

export const LEASING_AGENTS = ['Amel Ben Ali', 'Agent Démo 2', 'Agent Démo 3', 'Karim S.', 'Agent Démo 4', 'Agent Démo 1'];

// ───────── Helpers ─────────
const today = () => new Date();
const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86_400_000);

export const findLeasingContract = (id: string) => leasingContracts.find(c => c.id === id);

export const totalOverdue = (c: LeasingContract) =>
  c.installments.filter(i => i.status === 'late' || (i.status === 'partial' && i.daysLate > 0))
    .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

export const overdueCount = (c: LeasingContract) =>
  c.installments.filter(i => i.status === 'late').length;

export const daysOverdue = (c: LeasingContract) => {
  const lateOnes = c.installments.filter(i => i.status === 'late');
  return lateOnes.length === 0 ? 0 : Math.max(...lateOnes.map(i => i.daysLate));
};

export const nextInstallment = (c: LeasingContract): LeasingInstallment | undefined =>
  c.installments
    .filter(i => i.status === 'pending')
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];

export const recoveryRate = (c: LeasingContract) => {
  const due = c.installments.filter(i => new Date(i.dueDate) <= today());
  if (due.length === 0) return 100;
  const expected = due.reduce((s, i) => s + i.amount, 0);
  const collected = due.reduce((s, i) => s + i.paidAmount, 0);
  return expected === 0 ? 100 : Math.round((collected / expected) * 100);
};

export const calcIndemnity = (c: LeasingContract, formula?: TerminationFormula): number => {
  const f = formula ?? c.financials.terminationFormula;
  const cap = c.financials.remainingCapital;
  if (f === 'remaining_capital')   return cap;
  if (f === 'capital_plus_3rents') return cap + 3 * c.financials.monthlyRent;
  return Math.round(cap * 0.85); // flat indemnity = 85% of remaining capital
};

// Generate a linear amortization schedule.
export function generatePaymentSchedule(opts: {
  startDate: string;
  monthlyRent: number;
  interestRate: number;
  durationMonths: number;
  totalCapital: number;
}): LeasingInstallment[] {
  const out: LeasingInstallment[] = [];
  const start = new Date(opts.startDate);
  const principalPart = opts.totalCapital / opts.durationMonths;
  const monthlyInterestRate = opts.interestRate / 100 / 12;
  let remaining = opts.totalCapital;
  for (let i = 0; i < opts.durationMonths; i++) {
    const due = new Date(start);
    due.setMonth(start.getMonth() + i);
    const interest = Math.round(remaining * monthlyInterestRate);
    const principal = Math.round(principalPart);
    remaining -= principal;
    out.push({
      id: `ins-${i + 1}`,
      number: i + 1,
      dueDate: due.toISOString().slice(0, 10),
      principal,
      interest,
      fees: 0,
      amount: opts.monthlyRent,
      status: 'pending',
      paidAmount: 0,
      daysLate: 0,
    });
  }
  return out;
}

// ───────── Seed data ─────────
function seedInstallments(opts: {
  start: string; rent: number; rate: number; months: number; capital: number;
  paidUpTo: number;          // index up to which paid
  lateCount?: number;        // how many late after paidUpTo
  partialOnLast?: boolean;
}): LeasingInstallment[] {
  const items = generatePaymentSchedule({
    startDate: opts.start, monthlyRent: opts.rent,
    interestRate: opts.rate, durationMonths: opts.months,
    totalCapital: opts.capital,
  });
  const now = today();
  for (let i = 0; i < items.length; i++) {
    const due = new Date(items[i].dueDate);
    if (i < opts.paidUpTo) {
      items[i].status = 'paid';
      items[i].paidAmount = items[i].amount;
      const pd = new Date(due); pd.setDate(pd.getDate() - 2);
      items[i].paidDate = pd.toISOString().slice(0, 10);
    } else if (opts.lateCount && i < opts.paidUpTo + opts.lateCount && due <= now) {
      items[i].status = 'late';
      items[i].daysLate = daysBetween(due, now);
    } else if (opts.partialOnLast && i === opts.paidUpTo && due <= now) {
      items[i].status = 'partial';
      items[i].paidAmount = Math.round(items[i].amount * 0.4);
      items[i].daysLate = daysBetween(due, now);
    }
  }
  return items;
}

function buildLessee(
  id: string, name: string, address: string, city: string, zip: string,
  extras: Partial<Lessee> = {},
): Lessee {
  return { id, name, address, city, zip, ...extras };
}

const baseDoc = (id: string, name: string, category: string, daysAgo: number, status: LeasingDocument['status']): LeasingDocument => ({
  id, name, type: 'uploaded', category, status, size: `${100 + Math.floor(Math.random() * 200)} Ko`,
  date: new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10),
});

// 12 contracts covering the full spectrum
export const leasingContracts: LeasingContract[] = [
  // ───── 4 active healthy ─────
  {
    id: 'LEAS-2024-0001',
    lessee: buildLessee('D-145', 'DEBITEUR ALPHA DEMO', '12 Rue de la République', 'Tunis', '1000', { siren: '0123456789', contact: 'M. Contact Demo 1', email: 'contact@demo-sarl.example.test', phone: '+216 30 000 000' }),
    lessor: 'BANQUE RECOVAI',
    status: 'active',
    startDate: '2023-06-01', endDate: '2027-06-01', firstDueDate: '2023-07-01',
    paymentFrequency: 'monthly',
    asset: { type: 'vehicle', description: 'Renault Trafic L2H1 utilitaire', brand: 'Renault', model: 'Trafic L2H1', serial: 'VF1FL000123456789', acquisitionValue: 95000, residualValue: 12000 },
    financials: { monthlyRent: 2350, interestRate: 7.5, deposit: 9500, totalCapital: 95000, remainingCapital: 68000, terminationFormula: 'capital_plus_3rents' },
    guarantor: { name: 'M. Contact Demo 1', type: 'personal', guaranteedAmount: 30000, contact: '+216 30 000 000' },
    insurance: { provider: 'STAR Assurances', policyNumber: 'STAR-2023-AUTO-9821', expiryDate: '2025-06-01', coverageAmount: 95000 },
    riskScore: 22,
    agent: 'Amel Ben Ali',
    installments: seedInstallments({ start: '2023-07-01', rent: 2350, rate: 7.5, months: 48, capital: 95000, paidUpTo: 10 }),
    actions: [],
    documents: [baseDoc('ld1', 'Contrat signé.pdf', 'Contrat', 320, 'signed'), baseDoc('ld2', 'Police assurance.pdf', 'Assurance', 318, 'filed')],
    notifications: [],
  },
  {
    id: 'LEAS-2024-0002',
    lessee: buildLessee('D-202', 'BIO PHARMA TUNISIE', '7 Rue Ibn Sina', 'Sfax', '3000', { siren: '5544332211', contact: 'Dr. Hela Mansouri', email: 'h.mansouri@biopharma.tn' }),
    lessor: 'BANQUE RECOVAI',
    status: 'active',
    startDate: '2023-01-15', endDate: '2028-01-15', firstDueDate: '2023-02-15',
    paymentFrequency: 'monthly',
    asset: { type: 'industrial', description: 'Ligne d\'embouteillage flacons 50ml', brand: 'KHS', model: 'Innofill PET', serial: 'KHS-2023-0091', acquisitionValue: 480000 },
    financials: { monthlyRent: 9200, interestRate: 6.8, deposit: 48000, totalCapital: 480000, remainingCapital: 380000, terminationFormula: 'remaining_capital' },
    guarantor: { name: 'BIO PHARMA HOLDING', type: 'corporate', guaranteedAmount: 200000 },
    insurance: { provider: 'COMAR', policyNumber: 'COMAR-2023-IND-1142', expiryDate: '2025-01-15', coverageAmount: 500000 },
    riskScore: 18,
    agent: 'Agent Démo 2',
    installments: seedInstallments({ start: '2023-02-15', rent: 9200, rate: 6.8, months: 60, capital: 480000, paidUpTo: 14 }),
    actions: [],
    documents: [baseDoc('ld3', 'Contrat signé.pdf', 'Contrat', 460, 'signed'), baseDoc('ld4', 'PV mise en service.pdf', 'Technique', 440, 'filed')],
    notifications: [],
  },
  {
    id: 'LEAS-2024-0003',
    lessee: buildLessee('D-318', 'TECH GLOBAL DEMO', '15 Rue du Lac', 'Tunis', '1053', { siren: '0987654321', contact: 'Mme Contact Demo 2', email: 'nadia@globaltech.tn' }),
    lessor: 'BANQUE RECOVAI',
    status: 'active',
    startDate: '2024-01-10', endDate: '2027-01-10', firstDueDate: '2024-02-10',
    paymentFrequency: 'monthly',
    asset: { type: 'it_hardware', description: 'Parc serveurs Dell PowerEdge x12 + baies stockage', brand: 'Dell', model: 'PowerEdge R750', serial: 'DELL-LOT-2024-0091', acquisitionValue: 220000 },
    financials: { monthlyRent: 6800, interestRate: 7.2, deposit: 22000, totalCapital: 220000, remainingCapital: 198000, terminationFormula: 'capital_plus_3rents' },
    guarantor: undefined,
    insurance: { provider: 'GAT Assurances', policyNumber: 'GAT-2024-IT-007', expiryDate: '2025-01-10', coverageAmount: 220000 },
    riskScore: 35,
    agent: 'Agent Démo 3',
    installments: seedInstallments({ start: '2024-02-10', rent: 6800, rate: 7.2, months: 36, capital: 220000, paidUpTo: 3 }),
    actions: [],
    documents: [baseDoc('ld5', 'Contrat signé.pdf', 'Contrat', 105, 'signed')],
    notifications: [{ id: 'n1', type: 'maturity_warning', severity: 'info', date: new Date().toISOString().slice(0, 10), message: 'Contrat arrive à échéance dans 90 jours', read: false }],
  },
  {
    id: 'LEAS-2024-0004',
    lessee: buildLessee('D-510', 'CARTHAGE LOGISTICS', '4 Avenue de Carthage', 'Tunis', '2025', { siren: '4433221100', contact: 'M. Imed Sfar', email: 'i.sfar@carthage-log.tn' }),
    lessor: 'BANQUE RECOVAI',
    status: 'active',
    startDate: '2022-09-01', endDate: '2027-09-01', firstDueDate: '2022-10-01',
    paymentFrequency: 'monthly',
    asset: { type: 'vehicle', description: 'Flotte 5 camions Iveco Daily 35S14', brand: 'Iveco', model: 'Daily 35S14', serial: 'FLOTTE-CL-2022', acquisitionValue: 380000 },
    financials: { monthlyRent: 7400, interestRate: 7.0, deposit: 38000, totalCapital: 380000, remainingCapital: 230000, terminationFormula: 'capital_plus_3rents' },
    guarantor: { name: 'M. Imed Sfar', type: 'personal', guaranteedAmount: 100000 },
    insurance: { provider: 'STAR Assurances', policyNumber: 'STAR-2022-FLT-441', expiryDate: '2025-09-01', coverageAmount: 380000 },
    riskScore: 28,
    agent: 'Karim S.',
    installments: seedInstallments({ start: '2022-10-01', rent: 7400, rate: 7.0, months: 60, capital: 380000, paidUpTo: 19 }),
    actions: [],
    documents: [baseDoc('ld6', 'Contrat signé.pdf', 'Contrat', 580, 'signed'), baseDoc('ld7', 'Police assurance flotte.pdf', 'Assurance', 575, 'filed')],
    notifications: [],
  },

  // ───── 2 light late (<30j) ─────
  {
    id: 'LEAS-2024-0005',
    lessee: buildLessee('D-422', 'ENTREPRISE K DEMO', '8 Rue Ibn Khaldoun', 'Sfax', '3000', { siren: '5566778899', contact: 'M. Karim Jelassi' }),
    lessor: 'BANQUE RECOVAI',
    status: 'late',
    startDate: '2023-04-01', endDate: '2026-04-01', firstDueDate: '2023-05-01',
    paymentFrequency: 'monthly',
    asset: { type: 'equipment', description: 'Imprimante grand format Roland VG3-640', brand: 'Roland', model: 'VG3-640', acquisitionValue: 78000 },
    financials: { monthlyRent: 2650, interestRate: 7.8, deposit: 7800, totalCapital: 78000, remainingCapital: 42000, terminationFormula: 'remaining_capital' },
    guarantor: { name: 'M. Karim Jelassi', type: 'personal', guaranteedAmount: 25000 },
    insurance: { provider: 'COMAR', policyNumber: 'COMAR-2023-EQ-882', expiryDate: '2025-04-01', coverageAmount: 78000 },
    riskScore: 48,
    agent: 'Agent Démo 4',
    installments: seedInstallments({ start: '2023-05-01', rent: 2650, rate: 7.8, months: 36, capital: 78000, paidUpTo: 11, lateCount: 1 }),
    actions: [
      { id: 'a1', date: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10), channel: 'sms', outcome: 'no_response', agent: 'Agent Démo 4' },
      { id: 'a2', date: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10), channel: 'call', outcome: 'promise', agent: 'Agent Démo 4', notes: 'Promet de régulariser sous 7 jours.' },
    ],
    documents: [baseDoc('ld8', 'Contrat signé.pdf', 'Contrat', 380, 'signed')],
    notifications: [{ id: 'n2', type: 'overdue_d8', severity: 'warning', date: new Date().toISOString().slice(0, 10), message: 'Loyer en retard de 12 jours', read: false }],
  },
  {
    id: 'LEAS-2024-0006',
    lessee: buildLessee('D-601', 'ATELIER MOSAIQUE', '22 Avenue de la Liberté', 'Sousse', '4000', { contact: 'Mme Sonia Khelifi' }),
    lessor: 'BANQUE RECOVAI',
    status: 'late',
    startDate: '2023-09-01', endDate: '2026-09-01', firstDueDate: '2023-10-01',
    paymentFrequency: 'monthly',
    asset: { type: 'equipment', description: 'Four à céramique Kanthal 1300°C', brand: 'Kanthal', model: 'KX-1300', acquisitionValue: 42000 },
    financials: { monthlyRent: 1380, interestRate: 8.0, deposit: 4200, totalCapital: 42000, remainingCapital: 30000, terminationFormula: 'flat_indemnity' },
    guarantor: undefined,
    insurance: { provider: 'GAT', policyNumber: 'GAT-2023-EQ-118', expiryDate: '2024-09-01', coverageAmount: 42000 },
    riskScore: 55,
    agent: 'Agent Démo 3',
    installments: seedInstallments({ start: '2023-10-01', rent: 1380, rate: 8.0, months: 36, capital: 42000, paidUpTo: 6, partialOnLast: true }),
    actions: [
      { id: 'a3', date: new Date(Date.now() - 18 * 86_400_000).toISOString().slice(0, 10), channel: 'whatsapp', outcome: 'partial_payment', agent: 'Agent Démo 3', notes: '40% versés, solde sous 15j.' },
    ],
    documents: [baseDoc('ld9', 'Contrat signé.pdf', 'Contrat', 220, 'signed')],
    notifications: [
      { id: 'n3', type: 'overdue_d30', severity: 'warning', date: new Date().toISOString().slice(0, 10), message: 'Loyer partiellement réglé · 22 jours de retard', read: false },
      { id: 'n4', type: 'insurance_expiry', severity: 'warning', date: new Date().toISOString().slice(0, 10), message: 'Assurance expire dans 18 jours', read: false },
    ],
  },

  // ───── 2 in recovery (>60j) ─────
  {
    id: 'LEAS-2024-0007',
    lessee: buildLessee('D-712', 'TRANSPORT EL FATEH', '11 Route de Sousse', 'Monastir', '5000', { contact: 'M. Mohamed Lahbib' }),
    lessor: 'BANQUE RECOVAI',
    status: 'recovery',
    startDate: '2022-03-01', endDate: '2026-03-01', firstDueDate: '2022-04-01',
    paymentFrequency: 'monthly',
    asset: { type: 'vehicle', description: 'Bus Mercedes Sprinter 19 places', brand: 'Mercedes', model: 'Sprinter 519 CDI', serial: 'WDB9066351N123456', acquisitionValue: 145000 },
    financials: { monthlyRent: 3120, interestRate: 7.6, deposit: 14500, totalCapital: 145000, remainingCapital: 92000, terminationFormula: 'capital_plus_3rents' },
    guarantor: { name: 'M. Mohamed Lahbib', type: 'personal', guaranteedAmount: 50000 },
    insurance: { provider: 'STAR Assurances', policyNumber: 'STAR-2022-PSG-771', expiryDate: '2025-03-01', coverageAmount: 145000 },
    riskScore: 78,
    agent: 'Karim S.',
    installments: seedInstallments({ start: '2022-04-01', rent: 3120, rate: 7.6, months: 48, capital: 145000, paidUpTo: 22, lateCount: 3 }),
    actions: [
      { id: 'a4', date: new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10), channel: 'sms', outcome: 'no_response', agent: 'Karim S.' },
      { id: 'a5', date: new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10), channel: 'call', outcome: 'promise', agent: 'Karim S.', notes: 'Promesse non tenue.' },
      { id: 'a6', date: new Date(Date.now() - 25 * 86_400_000).toISOString().slice(0, 10), channel: 'letter', outcome: 'no_response', agent: 'Karim S.', notes: 'Lettre simple envoyée.' },
      { id: 'a7', date: new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10), channel: 'visit', outcome: 'callback', agent: 'Karim S.', notes: 'Visite domicile, absent.' },
    ],
    documents: [
      baseDoc('ld10', 'Contrat signé.pdf', 'Contrat', 760, 'signed'),
      baseDoc('ld11', 'Mise en demeure leasing.pdf', 'Lettre', 8, 'sent'),
    ],
    notifications: [
      { id: 'n5', type: 'overdue_d60', severity: 'critical', date: new Date().toISOString().slice(0, 10), message: '3 loyers impayés · 78 jours de retard cumulés', read: false },
      { id: 'n6', type: 'broken_promise', severity: 'critical', date: new Date().toISOString().slice(0, 10), message: 'Promesse de paiement non tenue', read: false },
    ],
  },
  {
    id: 'LEAS-2024-0008',
    lessee: buildLessee('D-820', 'CONSTRUCTION HEDI', '5 Rue de l\'Industrie', 'Bizerte', '7000', { siren: '7788990011' }),
    lessor: 'BANQUE RECOVAI',
    status: 'recovery',
    startDate: '2022-11-01', endDate: '2027-11-01', firstDueDate: '2022-12-01',
    paymentFrequency: 'monthly',
    asset: { type: 'industrial', description: 'Pelle hydraulique Caterpillar 320D', brand: 'Caterpillar', model: '320D', serial: 'CAT320D-2022-441', acquisitionValue: 320000 },
    financials: { monthlyRent: 6850, interestRate: 7.4, deposit: 32000, totalCapital: 320000, remainingCapital: 215000, terminationFormula: 'remaining_capital' },
    guarantor: { name: 'CONSTRUCTION GROUP HOLDING', type: 'corporate', guaranteedAmount: 150000 },
    insurance: { provider: 'COMAR', policyNumber: 'COMAR-2022-BTP-552', expiryDate: '2024-11-01', coverageAmount: 320000 },
    riskScore: 82,
    agent: 'Agent Démo 2',
    installments: seedInstallments({ start: '2022-12-01', rent: 6850, rate: 7.4, months: 60, capital: 320000, paidUpTo: 14, lateCount: 4 }),
    actions: [
      { id: 'a8', date: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10), channel: 'email',  outcome: 'no_response', agent: 'Agent Démo 2' },
      { id: 'a9', date: new Date(Date.now() - 70 * 86_400_000).toISOString().slice(0, 10), channel: 'call',   outcome: 'callback',    agent: 'Agent Démo 2' },
      { id: 'a10', date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), channel: 'letter', outcome: 'no_response', agent: 'Agent Démo 2', notes: 'Mise en demeure leasing envoyée LRAR.' },
    ],
    documents: [baseDoc('ld12', 'Contrat signé.pdf', 'Contrat', 530, 'signed'), baseDoc('ld13', 'Mise en demeure leasing.pdf', 'Lettre', 28, 'sent')],
    notifications: [{ id: 'n7', type: 'overdue_d60', severity: 'critical', date: new Date().toISOString().slice(0, 10), message: '4 loyers impayés · escalade contentieux à envisager', read: false }],
  },

  // ───── 1 early termination in progress ─────
  {
    id: 'LEAS-2024-0009',
    lessee: buildLessee('D-901', 'RESTAURANT SAMARA', '18 Rue Mokhtar Attia', 'Tunis', '1002'),
    lessor: 'BANQUE RECOVAI',
    status: 'early_termination',
    startDate: '2022-06-01', endDate: '2026-06-01', firstDueDate: '2022-07-01',
    paymentFrequency: 'monthly',
    asset: { type: 'equipment', description: 'Cuisine professionnelle complète Rational', brand: 'Rational', model: 'iCombi Pro 10-1/1', acquisitionValue: 68000 },
    financials: { monthlyRent: 1850, interestRate: 7.8, deposit: 6800, totalCapital: 68000, remainingCapital: 38000, terminationFormula: 'remaining_capital' },
    guarantor: { name: 'M. Anis Samara', type: 'personal', guaranteedAmount: 30000 },
    insurance: { provider: 'GAT', policyNumber: 'GAT-2022-RST-099', expiryDate: '2025-06-01', coverageAmount: 68000 },
    riskScore: 72,
    agent: 'Amel Ben Ali',
    installments: seedInstallments({ start: '2022-07-01', rent: 1850, rate: 7.8, months: 48, capital: 68000, paidUpTo: 18, lateCount: 2 }),
    actions: [
      { id: 'a11', date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), channel: 'letter', outcome: 'no_response', agent: 'Amel Ben Ali', notes: 'Notification de résiliation envoyée.' },
    ],
    termination: {
      id: 't1', requestDate: new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10),
      reason: 'Non-paiement de 2 loyers consécutifs malgré relances et mise en demeure.',
      step: 'asset_returned', formulaUsed: 'remaining_capital', indemnityAmount: 38000,
      assetReturn: { date: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10), condition: 'fair', notes: 'Légères traces d\'usure normales, fonctionnement OK.' },
      guarantorActivated: false,
    },
    documents: [
      baseDoc('ld14', 'Contrat signé.pdf', 'Contrat', 670, 'signed'),
      baseDoc('ld15', 'Lettre de résiliation.pdf', 'Lettre', 28, 'sent'),
      baseDoc('ld16', 'PV de restitution.pdf', 'Procédure', 7, 'signed'),
    ],
    notifications: [
      { id: 'n8', type: 'overdue_d30', severity: 'warning', date: new Date().toISOString().slice(0, 10), message: 'Procédure de résiliation en cours', read: false },
    ],
  },

  // ───── 2 litigation ─────
  {
    id: 'LEAS-2024-0010',
    lessee: buildLessee('D-201', 'PARTICULIER DEMO 01', '4 Avenue Habib Bourguiba', 'Sousse', '4000', { email: 'particulier.demo@example.test' }),
    lessor: 'BANQUE RECOVAI',
    status: 'litigation',
    startDate: '2021-08-01', endDate: '2025-08-01', firstDueDate: '2021-09-01',
    paymentFrequency: 'monthly',
    asset: { type: 'vehicle', description: 'Peugeot 308 Diesel', brand: 'Peugeot', model: '308 1.6 BlueHDi', serial: 'VF3LJ5HZP12345', acquisitionValue: 58000 },
    financials: { monthlyRent: 1280, interestRate: 8.2, deposit: 5800, totalCapital: 58000, remainingCapital: 22000, terminationFormula: 'capital_plus_3rents' },
    guarantor: undefined,
    insurance: { provider: 'STAR Assurances', policyNumber: 'STAR-2021-AUTO-441', expiryDate: '2024-08-01', coverageAmount: 58000 },
    riskScore: 91,
    agent: 'Agent Démo 2',
    installments: seedInstallments({ start: '2021-09-01', rent: 1280, rate: 8.2, months: 48, capital: 58000, paidUpTo: 28, lateCount: 6 }),
    actions: [
      { id: 'a12', date: new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10), channel: 'letter', outcome: 'no_response', agent: 'Agent Démo 2', notes: 'Mise en demeure LRAR.' },
      { id: 'a13', date: new Date(Date.now() - 150 * 86_400_000).toISOString().slice(0, 10), channel: 'visit',  outcome: 'refused',     agent: 'Agent Démo 2' },
    ],
    documents: [baseDoc('ld17', 'Contrat signé.pdf', 'Contrat', 990, 'signed'), baseDoc('ld18', 'Mise en demeure.pdf', 'Lettre', 200, 'sent')],
    notifications: [{ id: 'n9', type: 'overdue_d60', severity: 'critical', date: new Date().toISOString().slice(0, 10), message: 'Dossier transféré au contentieux', read: true }],
    litigationCaseId: 'LIT-2024-0002',
  },
  {
    id: 'LEAS-2024-0011',
    lessee: buildLessee('D-098', 'ETOILE LOGISTIQUE DEMO', '20 Rue de Marseille', 'Tunis', '1002', { siren: '6677889900' }),
    lessor: 'BANQUE RECOVAI',
    status: 'litigation',
    startDate: '2020-03-01', endDate: '2025-03-01', firstDueDate: '2020-04-01',
    paymentFrequency: 'monthly',
    asset: { type: 'industrial', description: 'Chariot élévateur Toyota 8FBE20T', brand: 'Toyota', model: '8FBE20T', serial: 'TOY-8FBE-2020-771', acquisitionValue: 88000 },
    financials: { monthlyRent: 1620, interestRate: 7.9, deposit: 8800, totalCapital: 88000, remainingCapital: 35000, terminationFormula: 'remaining_capital' },
    guarantor: { name: 'STAR LOG HOLDING', type: 'corporate', guaranteedAmount: 50000 },
    insurance: { provider: 'GAT', policyNumber: 'GAT-2020-IND-339', expiryDate: '2024-03-01', coverageAmount: 88000 },
    riskScore: 88,
    agent: 'Karim S.',
    installments: seedInstallments({ start: '2020-04-01', rent: 1620, rate: 7.9, months: 60, capital: 88000, paidUpTo: 42, lateCount: 5 }),
    actions: [],
    documents: [baseDoc('ld19', 'Contrat signé.pdf', 'Contrat', 1480, 'signed')],
    notifications: [],
    litigationCaseId: 'LIT-2023-0078',
  },

  // ───── 1 fully paid ─────
  {
    id: 'LEAS-2023-0012',
    lessee: buildLessee('D-501', 'FONDS MARINA DEMO', '3 Avenue de Carthage', 'Tunis', '1001', { siren: '1122334455' }),
    lessor: 'BANQUE RECOVAI',
    status: 'closed_paid',
    startDate: '2020-01-01', endDate: '2024-01-01', firstDueDate: '2020-02-01',
    paymentFrequency: 'monthly',
    asset: { type: 'it_hardware', description: 'Suite logicielle ERP SAP Business One', brand: 'SAP', model: 'Business One', acquisitionValue: 165000 },
    financials: { monthlyRent: 3700, interestRate: 7.0, deposit: 16500, totalCapital: 165000, remainingCapital: 0, terminationFormula: 'remaining_capital' },
    guarantor: undefined,
    insurance: { provider: 'STAR Assurances', policyNumber: 'STAR-2020-IT-007', expiryDate: '2024-01-01', coverageAmount: 165000 },
    riskScore: 5,
    agent: 'Agent Démo 3',
    installments: seedInstallments({ start: '2020-02-01', rent: 3700, rate: 7.0, months: 48, capital: 165000, paidUpTo: 48 }),
    actions: [],
    documents: [baseDoc('ld20', 'Contrat signé.pdf', 'Contrat', 1550, 'signed'), baseDoc('ld21', 'Quittance finale.pdf', 'Quittance', 110, 'filed')],
    notifications: [],
  },
];
