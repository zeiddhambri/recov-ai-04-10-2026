// automation-store.ts
// Robust client-side persistent store for the Automation (Automatisation) module of RecovAI.
import { ReminderRule, EscalationRule, MessageTemplate, Workflow, ExecutionHistory } from '@/types/automation';

const STORAGE_KEYS = {
  REMINDER_RULES: 'recov_reminder_rules',
  ESCALATION_RULES: 'recov_escalation_rules',
  MESSAGE_TEMPLATES: 'recov_message_templates',
  WORKFLOWS: 'recov_workflows',
  EXECUTION_HISTORY: 'recov_automation_history',
};

// --- DEFAULT DATA FOR SEEDING ---

const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: 'rule-01',
    tenant_id: 'ten-recov',
    institution_id: 'inst-01',
    name: 'SMS de Rappel J-3',
    description: 'Envoi d\'un SMS de courtoisie de rappel d\'échéance 3 jours avant celle-ci',
    portfolio_type: 'all',
    trigger_event: 'due_soon',
    days_offset: -3,
    condition_config: {
      risk_level: 'all',
      has_active_promise: false,
    },
    channel: 'sms',
    template_id: 'tmpl-01',
    priority: 'low',
    active: true,
    status: 'active',
    execution_window_start: '08:30',
    execution_window_end: '19:00',
    max_attempts: 1,
    retry_policy: 'stop',
    created_by: 'Agent Démo 1',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-20T14:30:00Z',
    executions_count: 147,
    success_rate: 98.4,
    last_executed: '2026-05-30T09:12:00Z'
  },
  {
    id: 'rule-02',
    tenant_id: 'ten-recov',
    institution_id: 'inst-01',
    name: 'WhatsApp Relance Forte J+3',
    description: 'Envoi d\'un avertissement ferme via WhatsApp pour retard de paiement',
    portfolio_type: 'leasing',
    trigger_event: 'overdue',
    days_offset: 3,
    condition_config: {
      min_overdue_amount: 1500,
      risk_level: 'Moyen',
    },
    channel: 'whatsapp',
    template_id: 'tmpl-03',
    priority: 'high',
    active: true,
    status: 'active',
    execution_window_start: '09:00',
    execution_window_end: '18:00',
    max_attempts: 2,
    retry_policy: 'retry_3_times_1h',
    created_by: 'Agent Démo 3',
    created_at: '2026-05-05T08:00:00Z',
    updated_at: '2026-05-05T08:00:00Z',
    executions_count: 64,
    success_rate: 89.1,
    last_executed: '2026-05-29T11:45:00Z'
  },
  {
    id: 'rule-03',
    tenant_id: 'ten-recov',
    institution_id: 'inst-02',
    name: 'Mise en Demeure Email J+15',
    description: 'Envoi d\'une mise en demeure par email officiel pour les montants élevés',
    portfolio_type: 'factoring',
    trigger_event: 'overdue',
    days_offset: 15,
    condition_config: {
      min_overdue_amount: 10000,
      risk_level: 'Élevé',
    },
    channel: 'email',
    template_id: 'tmpl-04',
    priority: 'high',
    active: true,
    status: 'active',
    execution_window_start: '08:00',
    execution_window_end: '17:00',
    max_attempts: 1,
    retry_policy: 'escalate',
    created_by: 'Agent Démo 1',
    created_at: '2026-05-10T11:20:00Z',
    updated_at: '2026-05-12T09:15:00Z',
    executions_count: 12,
    success_rate: 83.3,
    last_executed: '2026-05-28T10:00:00Z'
  },
  {
    id: 'rule-04',
    tenant_id: 'ten-recov',
    institution_id: 'inst-01',
    name: 'Asséner appel téléphonique J+7',
    description: 'Création d\'une tâche d\'appel prioritaire pour l\'agent assigné',
    portfolio_type: 'microfinance',
    trigger_event: 'overdue',
    days_offset: 7,
    condition_config: {
      risk_level: 'Critique',
    },
    channel: 'task',
    template_id: 'tmpl-02',
    priority: 'critical',
    active: false,
    status: 'paused',
    execution_window_start: '08:00',
    execution_window_end: '18:00',
    max_attempts: 3,
    retry_policy: 'escalate',
    created_by: 'Agent Démo 2',
    created_at: '2026-05-12T16:00:00Z',
    updated_at: '2026-05-25T10:20:00Z',
    executions_count: 38,
    success_rate: 76.8,
    last_executed: '2026-05-24T14:15:00Z'
  },
  {
    id: 'rule-05',
    tenant_id: 'ten-recov',
    institution_id: 'inst-01',
    name: 'Alerte Promesse Rompue WhatsApp',
    description: 'Envoi d\'une relance automatisée immédiate suite à promesse non respectée',
    portfolio_type: 'all',
    trigger_event: 'promise_broken',
    days_offset: 0,
    condition_config: {
      has_broken_promise: true,
    },
    channel: 'whatsapp',
    template_id: 'tmpl-03',
    priority: 'critical',
    active: true,
    status: 'active',
    execution_window_start: '08:00',
    execution_window_end: '20:00',
    max_attempts: 1,
    retry_policy: 'stop',
    created_by: 'Agent Démo 3',
    created_at: '2026-05-15T09:30:00Z',
    updated_at: '2026-05-15T09:30:00Z',
    executions_count: 29,
    success_rate: 93.1,
    last_executed: '2026-05-30T10:05:00Z'
  }
];

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'esc-01',
    name: 'Visite terrain obligatoire si J+7 sans paiement',
    description: 'Lorsque le retard atteint 7 jours sans aucune promesse active, planifier une visite terrain obligatoire',
    trigger_condition: 'Retard de 7 jours et absence de promesse de paiement',
    portfolio_type: 'microfinance',
    min_overdue_amount: 100,
    min_days_past_due: 7,
    actions: ['plan_visit', 'create_urgent_task'],
    active: true,
    status: 'active',
    created_at: '2026-05-01T11:00:00Z',
    updated_at: '2026-05-01T11:00:00Z',
    last_triggered: '2026-05-29T14:35:00Z',
    trigger_count: 42
  },
  {
    id: 'esc-02',
    name: 'Alerte Superviseur si Promesse Rompue J+15',
    description: 'Si le client a rompu sa promesse et le retard dépasse 15 jours, affecter à un superviseur et augmenter la priorité',
    trigger_condition: 'Retard de 15 jours ET promesse de paiement rompue',
    portfolio_type: 'all',
    min_overdue_amount: 500,
    min_days_past_due: 15,
    actions: ['affect_supervisor', 'increase_priority', 'create_urgent_task'],
    active: true,
    status: 'active',
    created_at: '2026-05-04T13:45:00Z',
    updated_at: '2026-05-22T10:30:00Z',
    last_triggered: '2026-05-30T09:40:00Z',
    trigger_count: 18
  },
  {
    id: 'esc-03',
    name: 'Passage pré-contentieux automatique + Gel de relances',
    description: 'Transférer le dossier au pré-contentieux si retard de 30 jours pour montant > 10,000 TND avec blocage d\'actions programmées',
    trigger_condition: 'Retard de 30 jours ET encours > 10,000 TND',
    portfolio_type: 'leasing',
    min_overdue_amount: 10000,
    min_days_past_due: 30,
    actions: ['transfer_pre_litigation', 'notify_legal', 'freeze_automation'],
    active: true,
    status: 'active',
    created_at: '2026-05-08T09:12:00Z',
    updated_at: '2026-05-08T09:12:00Z',
    last_triggered: '2026-05-28T16:22:00Z',
    trigger_count: 5
  },
  {
    id: 'esc-04',
    name: 'Recommandation contentieux pour double promesses rompues',
    description: 'Lorsque deux promesses de règlement de suite sont rompues, proposer directement le lancement contentieux judiciaire obligatoire',
    trigger_condition: 'Deux promesses rompues consécutives',
    portfolio_type: 'factoring',
    min_overdue_amount: 5000,
    min_days_past_due: 20,
    actions: ['recommend_litigation', 'create_urgent_task'],
    active: false,
    status: 'draft',
    created_at: '2026-05-15T15:00:00Z',
    updated_at: '2026-05-15T15:00:00Z',
    trigger_count: 0
  }
];

const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl-01',
    name: 'SMS de Rappel Courtois Pré-Échéance',
    description: 'Rappel d\'échéance cordial sans insister sur le retard',
    channel: 'sms',
    content: 'Bonjour {client_name}, nous vous rappelons que votre prochaine échéance RecovAI de {montant} TND arrive le {date_echeance}. Nous vous remercions pour votre fidélité.',
    placeholders: ['client_name', 'montant', 'date_echeance'],
    category: 'standard_reminder',
    language: 'fr',
    created_at: '2026-05-01T09:00:00Z',
    updated_at: '2026-05-01T09:00:00Z'
  },
  {
    id: 'tmpl-02',
    name: 'Notification Urgente Échéance Impayée',
    description: 'Email formel notifiant le retard d\'une échéance',
    channel: 'email',
    subject: 'Régularisation urgente de votre échéance de crédit',
    content: 'Bonjour {client_name},\n\nSauf erreur de notre part, votre règlement de {montant} TND adossé au dossier {dossier_id} n\'a pas été réceptionné le {date_echeance}.\n\nNous vous prions de régulariser cette créance immédiatement afin d\'éviter d\'éventuels frais de pénalité additionnels.\n\nCordialement,\nService Recouvrement RecovAI',
    placeholders: ['client_name', 'montant', 'dossier_id', 'date_echeance'],
    category: 'alert',
    language: 'fr',
    created_at: '2026-05-02T10:30:00Z',
    updated_at: '2026-05-18T14:00:00Z'
  },
  {
    id: 'tmpl-03',
    name: 'WhatsApp Alerte Retard / Risque Élevé',
    description: 'Alerte forte avertissant du risque juridique ou pré-contentieux',
    channel: 'whatsapp',
    content: '⚠️ *Alerte RecovAI* - {client_name}.\n\nVotre retard accumulé s\'élève à *{montant} TND* sur votre compte. Sans action immédiate de votre part, votre dossier sera transmis au service Pré-Contentieux judiciaire sous 48 heures.\n\nContactez votre conseiller RecovAI de toute urgence.',
    placeholders: ['client_name', 'montant'],
    category: 'pre_litigation',
    language: 'fr',
    created_at: '2026-05-05T14:15:00Z',
    updated_at: '2026-05-12T11:00:00Z'
  },
  {
    id: 'tmpl-04',
    name: 'Mise en Demeure Officielle',
    description: 'Email de mise en demeure formel avant procédure de saisie',
    channel: 'email',
    subject: 'MISE EN DEMEURE FORMELLE - PROCEDURE CONTENTIEUSE',
    content: 'MISE EN DEMEURE OFFICIELLE\n\nÀ l\'attention de la direction de {client_name},\n\nMises en demeure antérieures étant restées vaines, votre créance s\'élève à ce jour à {montant} TND.\n\nPar la présente, RecovAI vous met en demeure formelle de régler ce montant sous 5 jours ouvrés.\n\nÀ défaut, nous entamerons d\'office la dénonciation de vos contrats judiciaires et le cas échéant, la saisie conservatoire ou la réalisation de vos garanties.\n\nFait pour servir et valoir ce que de droit.',
    placeholders: ['client_name', 'montant'],
    category: 'pre_litigation',
    language: 'fr',
    created_at: '2026-05-10T09:30:00Z',
    updated_at: '2026-05-10T09:30:00Z'
  },
  {
    id: 'tmpl-05',
    name: 'Rappel SMS de Courtoisie en Arabe',
    description: 'Template de relance courtoise rédigé en arabe',
    channel: 'sms',
    content: 'مرحباً {client_name}، نذكركم بأن موعد سداد دفعتكم القادمة بقيمة {montant} د.ت هو {date_echeance}. نشكركم على ثقتكم وتواصلكم معنا. RecovAI',
    placeholders: ['client_name', 'montant', 'date_echeance'],
    category: 'standard_reminder',
    language: 'ar',
    created_at: '2026-05-15T10:00:00Z',
    updated_at: '2026-05-15T10:00:00Z'
  }
];

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-01',
    name: 'Flux de Relance Standard (Multi-canal)',
    description: 'Scénario complet alternant SMS courtois, rappel email, WhatsApp et escalade tâche',
    portfolio_type: 'leasing',
    status: 'active',
    created_by: 'Agent Démo 1',
    created_at: '2026-05-10T09:00:00Z',
    updated_at: '2026-05-25T14:30:00Z',
    executions_count: 82,
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Option J-3 Échéance', description: 'Événement Échéance dans 3 jours', config: { target: 'due_soon', days: -3 } },
      { id: 'n2', type: 'action', label: 'Envoi SMS Courtois', description: 'Envoie Tmpl SMS de Rappel', config: { channel: 'sms', template_id: 'tmpl-01' } },
      { id: 'n3', type: 'delay', label: 'Attente 4 jours', description: 'Attendre l\'échéance contractuelle', config: { durationDays: 4 } },
      { id: 'n4', type: 'condition', label: 'Facture Soldée ?', description: 'Vérifier si le paiement a été reçu', config: { query: 'check_payment' } },
      { id: 'n5', type: 'action', label: 'Alerte WhatsApp Retard', description: 'Envoie Tmpl WhatsApp Retard', config: { channel: 'whatsapp', template_id: 'tmpl-03' } },
      { id: 'n6', type: 'delay', label: 'Attente 10 jours', description: 'Attendre réponse', config: { durationDays: 10 } },
      { id: 'n7', type: 'condition', label: 'Niveau Risque Élevé ?', description: 'Vérifier si le score est critique', config: { query: 'check_risk_crit' } },
      { id: 'n8', type: 'action', label: 'Créer Tâche Appel Agent', description: 'Assigne à l\'administrateur de portefeuille', config: { channel: 'task', priority: 'high' } }
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5', conditionValue: 'non' },
      { from: 'n5', to: 'n6' },
      { from: 'n6', to: 'n7' },
      { from: 'n7', to: 'n8', conditionValue: 'oui' }
    ]
  },
  {
    id: 'wf-02',
    name: 'Alerte Escalade Immédiate Factoring',
    description: 'Procédure critique à fort encours pour l\'affacturage impliquant huissiers et avocats',
    portfolio_type: 'factoring',
    status: 'paused',
    created_by: 'Agent Démo 3',
    created_at: '2026-05-18T10:15:00Z',
    updated_at: '2026-05-18T10:15:00Z',
    executions_count: 14,
    nodes: [
      { id: 'wf2-n1', type: 'trigger', label: 'Dossier créé', description: 'Détecte la création d\'un impayé factoring', config: { target: 'case_created' } },
      { id: 'wf2-n2', type: 'condition', label: 'Montant > 15K TND ?', description: 'Vérifie si la créance est substantielle', config: { limit: 15000 } },
      { id: 'wf2-n3', type: 'action', label: 'Notifier Juridique & Avocat d\'office', description: 'Alerte immédiate Maître Demo Alpha', config: { channel: 'email', template_id: 'tmpl-04' } },
      { id: 'wf2-n4', type: 'action', label: 'SMS Relance Forte', description: 'Template de mise en demeure client', config: { channel: 'sms', template_id: 'tmpl-02' } }
    ],
    edges: [
      { from: 'wf2-n1', to: 'wf2-n2' },
      { from: 'wf2-n2', to: 'wf2-n3', conditionValue: 'oui' },
      { from: 'wf2-n2', to: 'wf2-n4', conditionValue: 'non' }
    ]
  }
];

const DEFAULT_HISTORY: ExecutionHistory[] = [
  {
    id: 'hist-01',
    rule_id: 'rule-01',
    type: 'reminder',
    dossier_id: 'DOS-2026-0442',
    debtor_name: 'STE EL NOUR SARL',
    portfolio_type: 'Microfinance',
    channel: 'SMS',
    action_taken: 'Envoi SMS de Rappel J-3',
    status: 'success',
    timestamp: '2026-05-30T09:12:00Z',
    details: 'Destinataire: +216 30 000 000. Message envoyé et délivré avec succès (Opérateur Tunisie Telecom).'
  },
  {
    id: 'hist-02',
    rule_id: 'rule-05',
    type: 'reminder',
    dossier_id: 'DOS-2026-0155',
    debtor_name: 'BEN AMER SALMA',
    portfolio_type: 'Leasing',
    channel: 'WhatsApp',
    action_taken: 'Relance Forte Promesse Rompue',
    status: 'success',
    timestamp: '2026-05-30T10:05:00Z',
    details: 'Destinataire: +216 30 000 000. Message WhatsApp lu (double coche bleue) à 10:14.'
  },
  {
    id: 'hist-03',
    rule_id: 'rule-03',
    type: 'reminder',
    dossier_id: 'LIT-2024-0003',
    debtor_name: 'TECH GLOBAL DEMO',
    portfolio_type: 'Factoring',
    channel: 'Email',
    action_taken: 'Envoi Mise en Demeure Officielle J+15',
    status: 'success',
    timestamp: '2026-05-28T10:00:00Z',
    details: 'Destinataire: contact@globaltech-tunisie.tn. Email signé numériquement et transmis avec succès (SMTP).'
  },
  {
    id: 'hist-04',
    rule_id: 'rule-02',
    type: 'reminder',
    dossier_id: 'LIT-2024-0001',
    debtor_name: 'DEBITEUR ALPHA DEMO',
    portfolio_type: 'Factoring',
    channel: 'WhatsApp',
    action_taken: 'WhatsApp Relance Forte J+3',
    status: 'failed',
    timestamp: '2026-05-29T11:45:00Z',
    details: 'Échec d\'envoi: Numéro de téléphone WhatsApp incomplet ou invalide (+216 012345678).'
  },
  {
    id: 'hist-05',
    rule_id: 'esc-02',
    type: 'escalation',
    dossier_id: 'LIT-2024-0001',
    debtor_name: 'DEBITEUR ALPHA DEMO',
    action_taken: 'Règle d’escalade: Alerte Superviseur si Promesse Rompue J+15',
    status: 'success',
    timestamp: '2026-05-30T09:40:00Z',
    details: 'Dossier ré-affecté à Agent Démo 3 (Superviseuse Recouvrement). Priorité augmentée de "Normale" à "Urgente". Tâche prioritaire créée.'
  },
  {
    id: 'hist-06',
    rule_id: 'esc-01',
    type: 'escalation',
    dossier_id: 'DOS-2026-0442',
    debtor_name: 'STE EL NOUR SARL',
    action_taken: 'Règle d’escalade: Visite terrain J+7',
    status: 'success',
    timestamp: '2026-05-29T14:35:00Z',
    details: 'Génération automatique d\'un ordre de visite terrain pour l\'agent d\'agence. Affecté pour exécution immédiate.'
  }
];

// --- STORAGE IMPLEMENTATION Helper ---

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

// ─── STATE CLASS / AUTOMATION STORE EXPORTS ───

export const AutomationStore = {
  // --- REMINDER RULES ---
  getReminderRules(): ReminderRule[] {
    return initStorage(STORAGE_KEYS.REMINDER_RULES, DEFAULT_REMINDER_RULES);
  },
  saveReminderRules(list: ReminderRule[]) {
    localStorage.setItem(STORAGE_KEYS.REMINDER_RULES, JSON.stringify(list));
  },
  addReminderRule(rule: Omit<ReminderRule, 'id' | 'created_at' | 'updated_at' | 'executions_count' | 'success_rate'>): ReminderRule {
    const list = this.getReminderRules();
    const newRule: ReminderRule = {
      ...rule,
      id: `rule-${Math.floor(10 + Math.random() * 89)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executions_count: 0,
      success_rate: 100.0,
      status: rule.active ? 'active' : 'draft',
    };
    list.unshift(newRule);
    this.saveReminderRules(list);
    return newRule;
  },
  updateReminderRule(rule: ReminderRule) {
    const list = this.getReminderRules();
    const idx = list.findIndex(r => r.id === rule.id);
    if (idx !== -1) {
      list[idx] = {
        ...rule,
        updated_at: new Date().toISOString(),
        status: rule.active ? 'active' : rule.status === 'active' ? 'draft' : rule.status
      };
      this.saveReminderRules(list);
    }
  },
  deleteReminderRule(id: string) {
    const list = this.getReminderRules();
    const filtered = list.filter(r => r.id !== id);
    this.saveReminderRules(filtered);
  },

  // --- ESCALATION RULES ---
  getEscalationRules(): EscalationRule[] {
    return initStorage(STORAGE_KEYS.ESCALATION_RULES, DEFAULT_ESCALATION_RULES);
  },
  saveEscalationRules(list: EscalationRule[]) {
    localStorage.setItem(STORAGE_KEYS.ESCALATION_RULES, JSON.stringify(list));
  },
  addEscalationRule(rule: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at' | 'trigger_count'>): EscalationRule {
    const list = this.getEscalationRules();
    const newRule: EscalationRule = {
      ...rule,
      id: `esc-${Math.floor(10 + Math.random() * 89)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trigger_count: 0,
    };
    list.unshift(newRule);
    this.saveEscalationRules(list);
    return newRule;
  },
  updateEscalationRule(rule: EscalationRule) {
    const list = this.getEscalationRules();
    const idx = list.findIndex(e => e.id === rule.id);
    if (idx !== -1) {
      list[idx] = {
        ...rule,
        updated_at: new Date().toISOString()
      };
      this.saveEscalationRules(list);
    }
  },
  deleteEscalationRule(id: string) {
    const list = this.getEscalationRules();
    const filtered = list.filter(e => e.id !== id);
    this.saveEscalationRules(filtered);
  },

  // --- MESSAGE TEMPLATES ---
  getMessageTemplates(): MessageTemplate[] {
    return initStorage(STORAGE_KEYS.MESSAGE_TEMPLATES, DEFAULT_MESSAGE_TEMPLATES);
  },
  saveMessageTemplates(list: MessageTemplate[]) {
    localStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(list));
  },
  addMessageTemplate(tmpl: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>): MessageTemplate {
    const list = this.getMessageTemplates();
    const newTmpl: MessageTemplate = {
      ...tmpl,
      id: `tmpl-${Math.floor(10 + Math.random() * 89)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.unshift(newTmpl);
    this.saveMessageTemplates(list);
    return newTmpl;
  },
  updateMessageTemplate(tmpl: MessageTemplate) {
    const list = this.getMessageTemplates();
    const idx = list.findIndex(t => t.id === tmpl.id);
    if (idx !== -1) {
      list[idx] = {
        ...tmpl,
        updated_at: new Date().toISOString()
      };
      this.saveMessageTemplates(list);
    }
  },
  deleteMessageTemplate(id: string) {
    const list = this.getMessageTemplates();
    const filtered = list.filter(t => t.id !== id);
    this.saveMessageTemplates(filtered);
  },

  // --- WORKFLOWS ---
  getWorkflows(): Workflow[] {
    return initStorage(STORAGE_KEYS.WORKFLOWS, DEFAULT_WORKFLOWS);
  },
  saveWorkflows(list: Workflow[]) {
    localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(list));
  },
  addWorkflow(wf: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'executions_count'>): Workflow {
    const list = this.getWorkflows();
    const newWf: Workflow = {
      ...wf,
      id: `wf-${Math.floor(10 + Math.random() * 89)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executions_count: 0
    };
    list.unshift(newWf);
    this.saveWorkflows(list);
    return newWf;
  },
  updateWorkflow(wf: Workflow) {
    const list = this.getWorkflows();
    const idx = list.findIndex(w => w.id === wf.id);
    if (idx !== -1) {
      list[idx] = {
        ...wf,
        updated_at: new Date().toISOString()
      };
      this.saveWorkflows(list);
    }
  },
  deleteWorkflow(id: string) {
    const list = this.getWorkflows();
    const filtered = list.filter(w => w.id !== id);
    this.saveWorkflows(filtered);
  },

  // --- EXECUTION HISTORY ---
  getExecutionHistory(): ExecutionHistory[] {
    return initStorage(STORAGE_KEYS.EXECUTION_HISTORY, DEFAULT_HISTORY);
  },
  saveExecutionHistory(list: ExecutionHistory[]) {
    localStorage.setItem(STORAGE_KEYS.EXECUTION_HISTORY, JSON.stringify(list));
  },
  logExecution(item: Omit<ExecutionHistory, 'id' | 'timestamp'>): ExecutionHistory {
    const list = this.getExecutionHistory();
    const newLog: ExecutionHistory = {
      ...item,
      id: `hist-${Math.floor(1000 + Math.random() * 8999)}`,
      timestamp: new Date().toISOString()
    };
    list.unshift(newLog);
    this.saveExecutionHistory(list);
    
    // Increment stats in associated rule if any
    if (item.rule_id) {
      if (item.type === 'reminder') {
        const rules = this.getReminderRules();
        const rIdx = rules.findIndex(r => r.id === item.rule_id);
        if (rIdx !== -1) {
          rules[rIdx].executions_count++;
          rules[rIdx].last_executed = new Date().toISOString();
          this.saveReminderRules(rules);
        }
      } else if (item.type === 'escalation') {
        const escRules = this.getEscalationRules();
        const eIdx = escRules.findIndex(e => e.id === item.rule_id);
        if (eIdx !== -1) {
          escRules[eIdx].trigger_count++;
          escRules[eIdx].last_triggered = new Date().toISOString();
          this.saveEscalationRules(escRules);
        }
      }
    } else if (item.workflow_id) {
      const workflows = this.getWorkflows();
      const wIdx = workflows.findIndex(w => w.id === item.workflow_id);
      if (wIdx !== -1) {
        workflows[wIdx].executions_count++;
        this.saveWorkflows(workflows);
      }
    }
    
    return newLog;
  },
  clearHistory() {
    this.saveExecutionHistory([]);
  },

  // --- SIMULATION LOGIC ---
  simulateRuleImpact(rule: ReminderRule | EscalationRule): {
    totalEligible: number,
    potentialMatches: { id: string, name: string, overdueDays: number, overdueAmount: number, portfolio: string }[],
    messagesPreview: string[],
    estimatedCostTND: number,
    potentialRecoveryTND: number
  } {
    // Basic simulation logic based on mock dossiers in other modules
    // Since we import mock data or can simulate, we can return dynamic simulation outcomes
    const isReminder = 'channel' in rule;
    const portfolioType = rule.portfolio_type;
    
    // Simulate list of matching mock clients
    const mockClients = [
      { id: '1', name: 'DEBITEUR ALPHA DEMO', overdueDays: 145, overdueAmount: 145000, portfolio: 'factoring', risk: 'Critique' },
      { id: '2', name: 'PARTICULIER DEMO 01', overdueDays: 95, overdueAmount: 22000, portfolio: 'leasing', risk: 'Moyen' },
      { id: '3', name: 'TECH GLOBAL DEMO', overdueDays: 130, overdueAmount: 320000, portfolio: 'factoring', risk: 'Élevé' },
      { id: '4', name: 'STE EL NOUR SARL', overdueDays: 110, overdueAmount: 14200, portfolio: 'microfinance', risk: 'Faible' },
      { id: '5', name: 'BEN AMER SALMA', overdueDays: 95, overdueAmount: 28000, portfolio: 'leasing', risk: 'Élevé' }
    ];

    const filtered = mockClients.filter(c => {
      // Filter by portfolio
      if (portfolioType !== 'all' && c.portfolio !== portfolioType) return false;
      
      if (isReminder) {
        const remRule = rule as ReminderRule;
        // Filter by conditions
        const minAmt = remRule.condition_config.min_overdue_amount || 0;
        if (c.overdueAmount < minAmt) return false;
        
        const rRisk = remRule.condition_config.risk_level || 'all';
        if (rRisk !== 'all' && c.risk !== rRisk) return false;
      } else {
        const escRule = rule as EscalationRule;
        if (c.overdueAmount < escRule.min_overdue_amount) return false;
        if (c.overdueDays < escRule.min_days_past_due) return false;
      }
      return true;
    });

    // Estimate cost & recovery
    const estimatedCostTND = isReminder ? filtered.length * ( (rule as ReminderRule).channel === 'sms' ? 0.05 : (rule as ReminderRule).channel === 'whatsapp' ? 0.08 : 0.005 ) : 0;
    const potentialRecoveryTND = filtered.reduce((sum, c) => sum + c.overdueAmount, 0) * (isReminder ? 0.08 : 0.15); // probability estimated

    const messagesPreview: string[] = [];
    if (isReminder) {
      const remRule = rule as ReminderRule;
      const templates = initStorage(STORAGE_KEYS.MESSAGE_TEMPLATES, DEFAULT_MESSAGE_TEMPLATES);
      const tmpl = templates.find(t => t.id === remRule.template_id);
      
      filtered.forEach(c => {
        let content = tmpl ? tmpl.content : "Notification Standard";
        content = content.replace('{client_name}', c.name)
                         .replace('{montant}', c.overdueAmount.toLocaleString())
                         .replace('{date_echeance}', '2026-06-05')
                         .replace('{dossier_id}', c.id);
        messagesPreview.push(content);
      });
    }

    return {
      totalEligible: filtered.length,
      potentialMatches: filtered,
      messagesPreview,
      estimatedCostTND: parseFloat(estimatedCostTND.toFixed(3)),
      potentialRecoveryTND: parseFloat(potentialRecoveryTND.toFixed(1))
    };
  }
};
