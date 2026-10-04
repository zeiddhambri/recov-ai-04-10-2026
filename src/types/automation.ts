export interface ReminderRule {
  id: string;
  tenant_id: string;
  institution_id: string;
  name: string;
  description: string;
  portfolio_type: 'all' | 'microfinance' | 'factoring' | 'leasing';
  trigger_event: 'due_soon' | 'overdue' | 'case_created' | 'promise_created' | 'promise_broken' | 'payment_received' | 'no_next_action' | 'risk_escalated' | 'visit_missed' | 'action_overdue' | 'doc_missing';
  days_offset: number;
  condition_config: {
    min_overdue_amount?: number;
    max_overdue_amount?: number;
    min_days_past_due?: number;
    max_days_past_due?: number;
    case_status?: string;
    risk_level?: 'all' | 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
    priority_level?: 'all' | 'Normale' | 'Haute' | 'Urgente';
    has_active_promise?: boolean;
    has_broken_promise?: boolean;
    has_payment_recently?: boolean;
    preferred_channel?: 'all' | 'sms' | 'email' | 'whatsapp';
  };
  channel: 'sms' | 'email' | 'whatsapp' | 'in_app' | 'task' | 'webhook';
  template_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  status: 'draft' | 'active' | 'paused' | 'archived';
  execution_window_start: string;
  execution_window_end: string;
  max_attempts: number;
  retry_policy: 'retry_3_times_1h' | 'stop' | 'escalate';
  created_by: string;
  created_at: string;
  updated_at: string;
  executions_count: number;
  success_rate: number;
  last_executed?: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  trigger_condition: string;
  portfolio_type: 'all' | 'microfinance' | 'factoring' | 'leasing';
  min_overdue_amount: number;
  min_days_past_due: number;
  actions: ('affect_supervisor' | 'increase_priority' | 'create_urgent_task' | 'plan_visit' | 'transfer_pre_litigation' | 'notify_legal' | 'recommend_litigation' | 'freeze_automation')[];
  active: boolean;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'in_app';
  subject?: string;
  content: string;
  placeholders: string[];
  category: 'pre_litigation' | 'standard_reminder' | 'alert' | 'transactional';
  language: 'ar' | 'fr';
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  label: string;
  description: string;
  config: any;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  conditionValue?: string; // e.g., "oui", "non"
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  portfolio_type: 'all' | 'microfinance' | 'factoring' | 'leasing';
  status: 'draft' | 'active' | 'paused';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_by: string;
  created_at: string;
  updated_at: string;
  executions_count: number;
}

export interface ExecutionHistory {
  id: string;
  rule_id?: string;
  workflow_id?: string;
  type: 'reminder' | 'escalation' | 'workflow';
  dossier_id: string;
  debtor_name: string;
  portfolio_type: string;
  channel?: string;
  action_taken: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  details: string;
}
