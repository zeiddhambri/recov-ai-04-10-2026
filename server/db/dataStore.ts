import fs from 'fs';
import path from 'path';

export interface DataStoreSchema {
  dossiers: any[];
  leasing: any[];
  factoringDebtors: any[];
  factoringInvoices: any[];
  factoringRequests: any[];
  microfinanceClients: any[];
  microfinanceLoans: any[];
  microfinanceInstallments: any[];
  litigationCases: any[];
  lawyers: any[];
  bailiffs: any[];
  templates: any[];
  escalationRules: any[];
  creditDossiers: any[];
  relanceLogs: any[];
  auditLogs: any[];
  reportingDefinitions: any[];
  generatedReports: any[];
  scheduledReports: any[];
}

const DB_DIR = (process.env.RECOVAI_DATA_DIR && process.env.RECOVAI_DATA_DIR !== '0000')
  ? path.resolve(process.env.RECOVAI_DATA_DIR)
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'recovai_db.json');

// --- INITIAL SEED DATA ---
const INITIAL_DOSSIERS = [
  {
    id: '1',
    user_id: 'usr-amen-01',
    client_code: 'RCV-2026-001',
    debtor_name: 'STE MEDITERRANEE TEXTILE SARL',
    debtor_email: 'direction@med-textile.tn',
    debtor_phone: '+216 71 840 220',
    amount: 145000,
    recovered_amount: 0,
    status: 'a_relancer',
    management_level: 'directeur',
    assigned_to: 'Kamel Riahi',
    due_date: '2026-09-15',
    portfolio: 'Factoring',
    institution: 'Amen Bank',
    branch: 'Tunis Belvédère',
    risk_level: 'Critique',
    delay_days: 45,
    notes: 'Factures impayées sur grand donneur d’ordre. Relance niveau direction recommandée.',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-10-01T10:00:00Z'
  },
  {
    id: '2',
    user_id: 'usr-leasing-01',
    client_code: 'RCV-2026-002',
    debtor_name: 'SOCIETE COMMERCIALE DU SUD SARL',
    debtor_email: 'contact@sc-sud.tn',
    debtor_phone: '+216 73 225 110',
    amount: 68000,
    recovered_amount: 0,
    status: 'a_relancer',
    management_level: 'comite',
    assigned_to: 'Sonia Ben Amor',
    due_date: '2026-09-20',
    portfolio: 'Leasing',
    institution: 'Tunisie Leasing',
    branch: 'Sousse Corniche',
    risk_level: 'Moyen',
    delay_days: 38,
    notes: '2 loyers impayés sur matériel industriel. Contact pris avec le gérant.',
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-10-01T09:30:00Z'
  },
  {
    id: '3',
    user_id: 'usr-amen-01',
    client_code: 'RCV-2026-003',
    debtor_name: 'COMPTOIR TUNISIEN DU BOIS SA',
    debtor_email: 'finance@ctb-tunisie.com',
    debtor_phone: '+216 71 960 450',
    amount: 320000,
    recovered_amount: 0,
    status: 'en_relance',
    management_level: 'recouvreur',
    assigned_to: 'Karim Mansour',
    due_date: '2026-08-30',
    portfolio: 'Factoring',
    institution: 'Amen Bank',
    branch: 'Lac Tunis',
    risk_level: 'Élevé',
    delay_days: 62,
    notes: 'En attente de déblocage d’une situation de marché public.',
    created_at: '2026-08-05T09:00:00Z',
    updated_at: '2026-10-02T11:00:00Z'
  },
  {
    id: '4',
    user_id: 'usr-amen-01',
    client_code: 'RCV-2026-004',
    debtor_name: 'POLYCLINIQUE LES BERGES DU LAC',
    debtor_email: 'recouvrement@polyclinique-lac.tn',
    debtor_phone: '+216 71 860 300',
    amount: 89000,
    recovered_amount: 0,
    status: 'a_relancer',
    management_level: 'recouvreur',
    assigned_to: 'Kamel Riahi',
    due_date: '2026-09-28',
    portfolio: 'Factoring',
    institution: 'Amen Bank',
    branch: 'Lac Tunis',
    risk_level: 'Moyen',
    delay_days: 28,
    notes: 'Créance cédée certifiée, notification amiable en cours.',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-10-01T14:00:00Z'
  },
  {
    id: '5',
    user_id: 'usr-enda-01',
    client_code: 'RCV-2026-005',
    debtor_name: 'STE EL NOUR AGRO-INDUSTRIE',
    debtor_email: 'direction@elnour-agro.tn',
    debtor_phone: '+216 74 400 350',
    amount: 42000,
    recovered_amount: 0,
    status: 'a_relancer',
    management_level: 'directeur',
    assigned_to: 'Amel Bouslama',
    due_date: '2026-09-10',
    portfolio: 'Microfinance',
    institution: 'Enda Tamweel',
    branch: 'Sfax El Jadida',
    risk_level: 'Moyen',
    delay_days: 48,
    notes: 'Échéance microfinance groupement agricole. Visite de terrain planifiée.',
    created_at: '2026-08-12T08:30:00Z',
    updated_at: '2026-10-03T10:00:00Z'
  },
  {
    id: '6',
    user_id: 'usr-leasing-01',
    client_code: 'RCV-2026-006',
    debtor_name: 'DR. MOHAMED BEN SALEM',
    debtor_email: 'dr.bensalem.cabinet@gnet.tn',
    debtor_phone: '+216 98 420 150',
    amount: 28000,
    recovered_amount: 0,
    status: 'a_relancer',
    management_level: 'recouvreur',
    assigned_to: 'Sonia Ben Amor',
    due_date: '2026-09-30',
    portfolio: 'Leasing',
    institution: 'Tunisie Leasing',
    branch: 'Tunis Centre',
    risk_level: 'Faible',
    delay_days: 22,
    notes: 'Équipement médical de cabinet. Relance amiable par appel/SMS.',
    created_at: '2026-08-25T11:00:00Z',
    updated_at: '2026-10-02T16:00:00Z'
  },
  {
    id: '7',
    user_id: 'usr-enda-01',
    client_code: 'RCV-2026-007',
    debtor_name: 'TRANSIT DU NORD EXPRESS',
    debtor_email: 'operations@transit-nord.tn',
    debtor_phone: '+216 72 430 180',
    amount: 78000,
    recovered_amount: 0,
    status: 'en_relance',
    management_level: 'directeur',
    assigned_to: 'Amel Bouslama',
    due_date: '2026-09-18',
    portfolio: 'Microfinance',
    institution: 'Enda Tamweel',
    branch: 'Tunis Centre',
    risk_level: 'Élevé',
    delay_days: 40,
    notes: 'Relance téléphonique effectuée, attente visa trésorerie.',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-10-02T15:00:00Z'
  }
];

const INITIAL_LAWYERS = [
  { id: 'l1', name: 'Maître Moncef Trabelsi', firm: 'Cabinet Trabelsi & Associés', phone: '+216 71 330 140', email: 'contact@cabinet-trabelsi.tn', city: 'Tunis', activeCasesCount: 14, created_at: '2026-01-01T00:00:00Z' },
  { id: 'l2', name: 'Maître Leila Ben Cheikh', firm: 'Cabinet Ben Cheikh', phone: '+216 73 224 890', email: 'avocat@bencheikh-associes.tn', city: 'Sousse', activeCasesCount: 9, created_at: '2026-01-01T00:00:00Z' },
  { id: 'l3', name: 'Maître Hichem Guermazi', firm: 'Cabinet Guermazi', phone: '+216 74 200 450', email: 'contact@cabinet-guermazi.tn', city: 'Sfax', activeCasesCount: 6, created_at: '2026-01-01T00:00:00Z' }
];

const INITIAL_BAILIFFS = [
  { id: 'b1', name: 'Huissier Mohamed Jaziri', firm: 'Étude Maître Jaziri', phone: '+216 71 830 220', email: 'etude.jaziri@huissiers.tn', city: 'Tunis', assignedActs: 28 },
  { id: 'b2', name: 'Huissier Tarek Khemir', firm: 'Étude Maître Khemir', phone: '+216 73 331 400', email: 'etude.khemir@huissiers.tn', city: 'Sousse', assignedActs: 19 },
  { id: 'b3', name: 'Huissier Riadh Bouazizi', firm: 'Étude Maître Bouazizi', phone: '+216 74 410 200', email: 'etude.bouazizi@huissiers.tn', city: 'Sfax', assignedActs: 15 }
];

const INITIAL_LITIGATION_CASES = [
  {
    id: 'LIT-2026-0001',
    debtor: { id: 'D-145', name: 'STE MEDITERRANEE TEXTILE SARL', siren: '0123456789', address: '12 Rue de l’Industrie', city: 'Tunis', zip: '1000', contact: 'M. Sami Trabelsi', email: 'direction@med-textile.tn', phone: '+216 71 840 220' },
    type: 'payment_injunction',
    stage: 'in_process',
    filingDate: '2026-09-01',
    lastUpdate: '2026-09-28',
    amount: { principal: 145000, interest: 4200, legalFees: 2500, bailiffFees: 650 },
    interestRate: 8.5,
    portfolio: 'Factoring',
    institution: 'Amen Bank',
    branch: 'Tunis Belvédère',
    lawyer: INITIAL_LAWYERS[0],
    bailiff: INITIAL_BAILIFFS[0],
    manager: 'Kamel Riahi',
    riskLevel: 'Critique',
    collateral: { type: 'Hypothèque commerciale', value: 180000, status: 'active' },
    hearings: [
      { id: 'h1', date: '2026-11-15', time: '10:00', court: 'Tribunal de Première Instance de Tunis', type: 'Plaidoirie', judge: 'Mme Ben Cheikh', status: 'scheduled' }
    ],
    documents: [
      { id: 'd1', name: 'Mise en demeure.pdf', category: 'Lettre', status: 'sent', date: '2026-09-02' },
      { id: 'd2', name: 'Requête injonction.pdf', category: 'Procédure', status: 'filed', date: '2026-09-10' }
    ],
    payments: []
  },
  {
    id: 'LIT-2026-0002',
    debtor: { id: 'D-201', name: 'SOCIETE COMMERCIALE DU SUD SARL', address: '4 Avenue Habib Bourguiba', city: 'Sousse', zip: '4000', email: 'contact@sc-sud.tn', phone: '+216 73 225 110' },
    type: 'payment_injunction',
    stage: 'pre_litigation',
    filingDate: '2026-09-12',
    lastUpdate: '2026-10-01',
    amount: { principal: 68000, interest: 1850, legalFees: 1200, bailiffFees: 450 },
    interestRate: 8.2,
    portfolio: 'Leasing',
    institution: 'Tunisie Leasing',
    branch: 'Sousse Corniche',
    lawyer: INITIAL_LAWYERS[1],
    bailiff: INITIAL_BAILIFFS[1],
    manager: 'Sonia Ben Amor',
    riskLevel: 'Moyen',
    collateral: { type: 'Garantie matérielle (Véhicule)', value: 75000, status: 'active' },
    hearings: [],
    documents: [
      { id: 'd5', name: 'Contrat de leasing certifié.pdf', category: 'Contrat', status: 'filed', date: '2026-09-15' }
    ],
    payments: []
  }
];

const INITIAL_LEASING = [
  {
    id: 'LSG-2026-001',
    contract_ref: 'LSG-2026-001',
    lessee: { id: 'LES-01', name: 'SOCIETE COMMERCIALE DU SUD SARL', siren: '1122334455', contact: 'M. Ridha Mansour', phone: '+216 73 225 110', email: 'contact@sc-sud.tn', address: '4 Avenue Habib Bourguiba', city: 'Sousse', zip: '4000' },
    asset: { type: 'industrial', description: 'Centre d\'usinage numérique 5 axes', brand: 'DMG Mori', model: 'DMU 50', acquisitionValue: 320000, residualValue: 32000 },
    financials: { monthlyRent: 6850, interestRate: 8.5, deposit: 32000, totalFinanced: 320000, remainingCapital: 215000, overdueAmount: 13700, overdueDays: 38 },
    status: 'late',
    portfolio: 'Leasing',
    institution: 'Tunisie Leasing',
    branch: 'Sousse Corniche',
    startDate: '2025-06-01',
    maturityDate: '2029-06-01',
    durationMonths: 48,
    insuranceActive: true,
    riskLevel: 'Moyen',
    created_at: '2025-06-01T00:00:00Z'
  },
  {
    id: 'LSG-2026-002',
    contract_ref: 'LSG-2026-002',
    lessee: { id: 'LES-02', name: 'DR. MOHAMED BEN SALEM', contact: 'Dr. Mohamed Ben Salem', phone: '+216 98 420 150', email: 'dr.bensalem.cabinet@gnet.tn', address: '18 Avenue de la Liberté', city: 'Tunis', zip: '1002' },
    asset: { type: 'equipment', description: 'Équipement d\'échographie Doppler couleur 4D', brand: 'GE Healthcare', model: 'Voluson E8', acquisitionValue: 145000, residualValue: 14500 },
    financials: { monthlyRent: 3800, interestRate: 8.0, deposit: 14500, totalFinanced: 145000, remainingCapital: 92000, overdueAmount: 7600, overdueDays: 22 },
    status: 'late',
    portfolio: 'Leasing',
    institution: 'Tunisie Leasing',
    branch: 'Tunis Centre',
    startDate: '2025-01-15',
    maturityDate: '2028-01-15',
    durationMonths: 36,
    insuranceActive: true,
    riskLevel: 'Faible',
    created_at: '2025-01-15T00:00:00Z'
  }
];

const INITIAL_FACTORING_DEBTORS = [
  {
    id: 'd-1',
    name: 'STE MEDITERRANEE TEXTILE SARL',
    registrationNumber: 'B1812811996',
    taxId: '0001235F/A/M/000',
    address: 'Zone Industrielle, Tunis Belvédère, Tunisie',
    riskScore: 78,
    riskGrade: 'B',
    approvedLimit: 500000,
    usedLimit: 145000,
    paymentDelayAverage: 45,
    status: 'approved'
  },
  {
    id: 'd-2',
    name: 'COMPTOIR TUNISIEN DU BOIS SA',
    registrationNumber: 'B1123451995',
    taxId: '0456123D/A/C/000',
    address: 'Zone Portuaire, Rades, Tunis, Tunisie',
    riskScore: 88,
    riskGrade: 'A',
    approvedLimit: 800000,
    usedLimit: 320000,
    paymentDelayAverage: 62,
    status: 'approved'
  },
  {
    id: 'd-3',
    name: 'POLYCLINIQUE LES BERGES DU LAC',
    registrationNumber: 'B245672002',
    taxId: '1023456K/B/M/000',
    address: 'Les Berges du Lac II, Tunis, Tunisie',
    riskScore: 92,
    riskGrade: 'A',
    approvedLimit: 400000,
    usedLimit: 89000,
    paymentDelayAverage: 28,
    status: 'approved'
  }
];

const INITIAL_FACTORING_INVOICES = [
  {
    id: 'inv-1',
    invoiceNumber: 'FAC-2026-0891',
    debtorId: 'd-1',
    debtorName: 'STE MEDITERRANEE TEXTILE SARL',
    amount: 145000,
    financedAmount: 130500,
    issueDate: '2026-08-01',
    dueDate: '2026-09-15',
    status: 'overdue',
    overdueDays: 45,
    disputeStatus: 'none'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FAC-2026-0942',
    debtorId: 'd-2',
    debtorName: 'COMPTOIR TUNISIEN DU BOIS SA',
    amount: 320000,
    financedAmount: 288000,
    issueDate: '2026-07-15',
    dueDate: '2026-08-30',
    status: 'overdue',
    overdueDays: 62,
    disputeStatus: 'none'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'FAC-2026-1015',
    debtorId: 'd-3',
    debtorName: 'POLYCLINIQUE LES BERGES DU LAC',
    amount: 89000,
    financedAmount: 80100,
    issueDate: '2026-08-15',
    dueDate: '2026-09-28',
    status: 'overdue',
    overdueDays: 28,
    disputeStatus: 'none'
  }
];

const INITIAL_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Rappel préventif J-3 (Échéance imminente)',
    channel: 'sms',
    category: 'preventif',
    subject: 'Rappel de votre échéance',
    content: 'Bonjour {{debiteur}}, votre échéance de {{montant}} TND arrive à échéance le {{echeance}}. Pour éviter des frais de retard, merci d\'effectuer le règlement. Réf: {{reference}}.',
    variables: ['debiteur', 'montant', 'echeance', 'reference'],
    active: true
  },
  {
    id: 'tpl-2',
    name: 'Relance 1er Niveau J+7 (Amiable courtois)',
    channel: 'sms',
    category: 'amiable',
    subject: 'Échéance en retard',
    content: 'Cher client {{debiteur}}, votre échéance de {{montant}} TND du {{echeance}} demeure impayée. Merci de régulariser par virement sur le RIB {{rib}} ou en agence. Contact: 30 000 000.',
    variables: ['debiteur', 'montant', 'echeance', 'rib'],
    active: true
  },
  {
    id: 'tpl-3',
    name: 'Sommation ferme J+30 (Pré-contentieux)',
    channel: 'email',
    category: 'ferme',
    subject: 'SOMMATION DE PAYER SOUS 48H - Dossier {{reference}}',
    content: 'Madame, Monsieur {{debiteur}},\n\nMalgré nos précédentes relances, nous constatons le non-règlement de votre créance de {{montant}} TND exigible depuis le {{echeance}}.\n\nNous vous mettons formellement en demeure de régler ladite somme sous 48 heures ouvrables, faute de quoi votre dossier sera immédiatement transmis à notre direction du Contentieux pour assignation judiciaire et exécution forcée.\n\nDirection du Recouvrement RecovAI',
    variables: ['debiteur', 'montant', 'echeance', 'reference'],
    active: true
  },
  {
    id: 'tpl-4',
    name: 'Mise en demeure par huissier J+45',
    channel: 'lettre',
    category: 'contentieux',
    subject: 'MISE EN DEMEURE AVANT ACTION EN JUSTICE',
    content: 'PAR EXPLOIT D\'HUISSIER DE JUSTICE\n\nÀ la requête de l\'institution bancaire / de crédit,\nNous sommons {{debiteur}}, domicilié(e) à {{adresse}}, de payer la somme principale de {{montant}} TND, outre les intérêts de retard conventionnels.\n\nÀ défaut, une requête en injonction de payer sera déposée auprès de Monsieur le Président du Tribunal de Première Instance compétent.',
    variables: ['debiteur', 'adresse', 'montant'],
    active: true
  }
];

const INITIAL_ESCALATION_RULES = [
  {
    id: 'esc-1',
    name: 'Escalade Recouvreur vers Superviseur à J+30',
    triggerDays: 30,
    condition: 'retard > 30 jours ET solde > 10 000 TND',
    action: 'Réaffectation au chef de groupe + SMS ferme',
    targetLevel: 'superviseur',
    active: true
  },
  {
    id: 'esc-2',
    name: 'Basculement Pré-contentieux à J+60',
    triggerDays: 60,
    condition: 'retard > 60 jours ET absence d\'engagement respecté',
    action: 'Envoi d\'une mise en demeure recommandée + Alerte Direction Risques',
    targetLevel: 'directeur',
    active: true
  },
  {
    id: 'esc-3',
    name: 'Transmission Contentieux Judiciaire à J+90',
    triggerDays: 90,
    condition: 'retard > 90 jours OU incident de paiement non régularisé',
    action: 'Création automatique du dossier contentieux + Mandatement d\'avocat',
    targetLevel: 'contentieux',
    active: true
  }
];

class DataStore {
  private data: DataStoreSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DataStoreSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          dossiers: parsed.dossiers || INITIAL_DOSSIERS,
          leasing: parsed.leasing || INITIAL_LEASING,
          factoringDebtors: parsed.factoringDebtors || INITIAL_FACTORING_DEBTORS,
          factoringInvoices: parsed.factoringInvoices || INITIAL_FACTORING_INVOICES,
          factoringRequests: parsed.factoringRequests || [],
          microfinanceClients: parsed.microfinanceClients || [],
          microfinanceLoans: parsed.microfinanceLoans || [],
          microfinanceInstallments: parsed.microfinanceInstallments || [],
          litigationCases: parsed.litigationCases || INITIAL_LITIGATION_CASES,
          lawyers: parsed.lawyers || INITIAL_LAWYERS,
          bailiffs: parsed.bailiffs || INITIAL_BAILIFFS,
          templates: parsed.templates || INITIAL_TEMPLATES,
          escalationRules: parsed.escalationRules || INITIAL_ESCALATION_RULES,
          creditDossiers: parsed.creditDossiers || [],
          relanceLogs: parsed.relanceLogs || [],
          auditLogs: parsed.auditLogs || [],
          reportingDefinitions: parsed.reportingDefinitions || [],
          generatedReports: parsed.generatedReports || [],
          scheduledReports: parsed.scheduledReports || []
        };
      }
    } catch (err) {
      console.warn('[DataStore] Error loading DB file, fallback to initial seed:', err);
    }

    const initial: DataStoreSchema = {
      dossiers: INITIAL_DOSSIERS,
      leasing: INITIAL_LEASING,
      factoringDebtors: INITIAL_FACTORING_DEBTORS,
      factoringInvoices: INITIAL_FACTORING_INVOICES,
      factoringRequests: [],
      microfinanceClients: [],
      microfinanceLoans: [],
      microfinanceInstallments: [],
      litigationCases: INITIAL_LITIGATION_CASES,
      lawyers: INITIAL_LAWYERS,
      bailiffs: INITIAL_BAILIFFS,
      templates: INITIAL_TEMPLATES,
      escalationRules: INITIAL_ESCALATION_RULES,
      creditDossiers: [],
      relanceLogs: [],
      auditLogs: [],
      reportingDefinitions: [],
      generatedReports: [],
      scheduledReports: []
    };

    this.saveDataSync(initial);
    return initial;
  }

  private saveDataSync(payload: DataStoreSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Failed to write database to disk:', err);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDataSync(this.data);
    }, 150);
  }

  // --- GETTERS ---
  public getDossiers() { return this.data.dossiers; }
  public getLeasing() { return this.data.leasing; }
  public getFactoringDebtors() { return this.data.factoringDebtors; }
  public getFactoringInvoices() { return this.data.factoringInvoices; }
  public getFactoringRequests() { return this.data.factoringRequests; }
  public getLitigationCases() { return this.data.litigationCases; }
  public getLawyers() { return this.data.lawyers; }
  public getBailiffs() { return this.data.bailiffs; }
  public getTemplates() { return this.data.templates; }
  public getEscalationRules() { return this.data.escalationRules; }
  public getCreditDossiers() { return this.data.creditDossiers; }
  public getRelanceLogs() { return this.data.relanceLogs; }
  public getAuditLogs() { return this.data.auditLogs; }

  // Generic access
  public getCollection(name: keyof DataStoreSchema): any[] {
    return this.data[name] || [];
  }

  public setCollection(name: keyof DataStoreSchema, items: any[]) {
    this.data[name] = items;
    this.save();
  }

  public resetToInitial(mode: 'realistic' | 'empty' = 'realistic'): DataStoreSchema {
    if (mode === 'empty') {
      this.data = {
        dossiers: [],
        leasing: [],
        factoringDebtors: [],
        factoringInvoices: [],
        factoringRequests: [],
        microfinanceClients: [],
        microfinanceLoans: [],
        microfinanceInstallments: [],
        litigationCases: [],
        lawyers: JSON.parse(JSON.stringify(INITIAL_LAWYERS)),
        bailiffs: JSON.parse(JSON.stringify(INITIAL_BAILIFFS)),
        templates: JSON.parse(JSON.stringify(INITIAL_TEMPLATES)),
        escalationRules: JSON.parse(JSON.stringify(INITIAL_ESCALATION_RULES)),
        creditDossiers: [],
        relanceLogs: [],
        auditLogs: [],
        reportingDefinitions: [],
        generatedReports: [],
        scheduledReports: []
      };
      this.saveDataSync(this.data);
      return this.data;
    }

    this.data = {
      dossiers: JSON.parse(JSON.stringify(INITIAL_DOSSIERS)),
      leasing: JSON.parse(JSON.stringify(INITIAL_LEASING)),
      factoringDebtors: JSON.parse(JSON.stringify(INITIAL_FACTORING_DEBTORS)),
      factoringInvoices: JSON.parse(JSON.stringify(INITIAL_FACTORING_INVOICES)),
      factoringRequests: [],
      microfinanceClients: [],
      microfinanceLoans: [],
      microfinanceInstallments: [],
      litigationCases: JSON.parse(JSON.stringify(INITIAL_LITIGATION_CASES)),
      lawyers: JSON.parse(JSON.stringify(INITIAL_LAWYERS)),
      bailiffs: JSON.parse(JSON.stringify(INITIAL_BAILIFFS)),
      templates: JSON.parse(JSON.stringify(INITIAL_TEMPLATES)),
      escalationRules: JSON.parse(JSON.stringify(INITIAL_ESCALATION_RULES)),
      creditDossiers: [],
      relanceLogs: [],
      auditLogs: [],
      reportingDefinitions: [],
      generatedReports: [],
      scheduledReports: []
    };
    this.saveDataSync(this.data);
    return this.data;
  }

  public stats() {
    return {
      dossiersCount: this.data.dossiers.length,
      leasingCount: this.data.leasing.length,
      factoringInvoicesCount: this.data.factoringInvoices.length,
      litigationCasesCount: this.data.litigationCases.length,
      lawyersCount: this.data.lawyers.length,
      bailiffsCount: this.data.bailiffs.length,
      templatesCount: this.data.templates.length,
      escalationRulesCount: this.data.escalationRules.length,
      creditDossiersCount: this.data.creditDossiers.length,
      relanceLogsCount: this.data.relanceLogs.length,
      dbFileSize: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const db = new DataStore();
