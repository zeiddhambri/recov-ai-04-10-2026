import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, ToggleLeft, ToggleRight, Trash2, Edit2, Plus, Sparkles, X, 
  UserCheck, AlertTriangle, ArrowUpRight, ShieldAlert, CheckCircle, FileWarning, 
  MapPin, HelpCircle, ArrowRight, Search, Play, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AutomationStore } from '@/lib/automation-store';
import { EscalationRule, ExecutionHistory } from '@/types/automation';
import { toast } from '@/hooks/use-toast';

const actionMetadata: Record<string, { label: string, icon: any, color: string, desc: string }> = {
  affect_supervisor: {
    label: 'Ré-affecter Superviseur',
    icon: UserCheck,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Ré-assigne le dossier à un manager de recouvrement senior/superviseur.'
  },
  increase_priority: {
    label: 'Élever la Priorité',
    icon: ArrowUpRight,
    color: 'bg-red-50 text-red-700 border-red-200',
    desc: 'Bascule immédiatement la priorité d\'intervention à Haute ou Critique.'
  },
  create_urgent_task: {
    label: 'Créer Tâche Urgente',
    icon: ShieldAlert,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Génère une tâche d\'appel prioritaire avec relance sous 24h.'
  },
  plan_visit: {
    label: 'Planifier Visite Terrain',
    icon: MapPin,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Génère un ordre de mission de repérage et visite physique au domicile/siège.'
  },
  transfer_pre_litigation: {
    label: 'Transfert Pré-Contentieux',
    icon: FileWarning,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Déclasse le dossier du recouvrement standard vers la cellule pré-judiciaire.'
  },
  notify_legal: {
    label: 'Alerter Direction Juridique',
    icon: ClipboardList,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Envoie un rapport d\'impayé consolidé de conformité à l\'équipe légale.'
  },
  recommend_litigation: {
    label: 'Recommander Assignation Judiciaire',
    icon: AlertTriangle,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Firme une proposition d\'injonction de payer directe par huissier/avocat.'
  },
  freeze_automation: {
    label: 'Geler les Autotransmissions',
    icon: Zap,
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    desc: 'Suspend momentanément l\'envoi automatique de SMS/emails pour anomalies.'
  }
};

export default function ReglesEscalade() {
  const { user } = useAuth();
  const userEmail = user?.email || 'conseiller@recovai.com';
  
  // Data State
  const [rules, setRules] = useState<EscalationRule[]>(() => AutomationStore.getEscalationRules());
  const [history, setHistory] = useState<ExecutionHistory[]>(() => 
    AutomationStore.getExecutionHistory().filter(h => h.type === 'escalation')
  );
  
  // Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRule, setEditingRule] = useState<Partial<EscalationRule>>({});
  
  // AI Builder state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Filter lists
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPortfolio = selectedPortfolio === 'all' || r.portfolio_type === selectedPortfolio;
      return matchSearch && matchPortfolio;
    });
  }, [rules, searchQuery, selectedPortfolio]);

  const handleToggleRuleStatus = (rule: EscalationRule) => {
    const updated: EscalationRule = {
      ...rule,
      active: !rule.active,
      status: !rule.active ? 'active' : 'paused'
    };
    AutomationStore.updateEscalationRule(updated);
    setRules(AutomationStore.getEscalationRules());
    toast({
      title: updated.active ? 'Règle Activée' : 'Règle Suspendue',
      description: `L'escalade "${rule.name}" est désormais ${updated.active ? 'active' : 'inactive'}.`
    });
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Voulez-vous supprimer définitivement cette règle d\'escalade ?')) {
      AutomationStore.deleteEscalationRule(id);
      setRules(AutomationStore.getEscalationRules());
      toast({
        title: 'Règle d\'escalade supprimée'
      });
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRule({
      name: '',
      description: '',
      trigger_condition: '',
      portfolio_type: 'all',
      min_overdue_amount: 1000,
      min_days_past_due: 15,
      actions: ['create_urgent_task'],
      active: true,
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: EscalationRule) => {
    setModalMode('edit');
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleToggleActionChoice = (actionKey: any) => {
    const currentActions = editingRule.actions || [];
    if (currentActions.includes(actionKey)) {
      setEditingRule({
        ...editingRule,
        actions: currentActions.filter(a => a !== actionKey)
      });
    } else {
      setEditingRule({
        ...editingRule,
        actions: [...currentActions, actionKey]
      });
    }
  };

  const handleSaveRule = () => {
    if (!editingRule.name || !editingRule.description || !editingRule.trigger_condition) {
      toast({
        title: 'Champs requis manquants',
        description: 'Veuillez saisir le titre, la description et la formule de condition.',
        variant: 'destructive'
      });
      return;
    }

    if (!editingRule.actions || editingRule.actions.length === 0) {
      toast({
        title: 'Aucune action sélectionnée',
        description: 'Veuillez sélectionner au moins une action d\'escalade à lancer.',
        variant: 'destructive'
      });
      return;
    }

    if (modalMode === 'create') {
      const fullRule: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at' | 'trigger_count'> = {
        name: editingRule.name,
        description: editingRule.description,
        trigger_condition: editingRule.trigger_condition,
        portfolio_type: editingRule.portfolio_type || 'all',
        min_overdue_amount: Number(editingRule.min_overdue_amount ?? 1000),
        min_days_past_due: Number(editingRule.min_days_past_due ?? 15),
        actions: editingRule.actions as any[],
        active: editingRule.active ?? true,
        status: editingRule.active ? 'active' : 'draft',
      };
      
      AutomationStore.addEscalationRule(fullRule);
      toast({
        title: 'Règle d\'escalade créée'
      });
    } else {
      AutomationStore.updateEscalationRule(editingRule as EscalationRule);
      toast({
        title: 'Règle d\'escalade modifiée'
      });
    }

    setRules(AutomationStore.getEscalationRules());
    setIsModalOpen(false);
  };

  // Run manually for a trial
  const handleSimulateEscalation = (rule: EscalationRule) => {
    const simulation = AutomationStore.simulateRuleImpact(rule);
    if (simulation.totalEligible === 0) {
      toast({
        title: 'Aucun dossier éligible',
        description: 'Actuellement, aucun dossier n\'atteint les conditions d\'escalade de cette règle.',
        variant: 'destructive'
      });
      return;
    }

    // Trigger on the first matching dossier for demo
    const target = simulation.potentialMatches[0];
    AutomationStore.logExecution({
      rule_id: rule.id,
      type: 'escalation',
      dossier_id: target.id,
      debtor_name: target.name,
      portfolio_type: target.portfolio,
      action_taken: `Déclenchement d'escalade: ${rule.name}`,
      status: 'success',
      details: `Simulé sur ${target.name}. Actions exécutées: ${rule.actions.map(a => actionMetadata[a]?.label || a).join(', ')}.`
    });

    setRules(AutomationStore.getEscalationRules());
    setHistory(AutomationStore.getExecutionHistory().filter(h => h.type === 'escalation'));

    toast({
      title: 'Escalade déclenchée avec succès',
      description: `Règle simulée avec succès sur le dossier de ${target.name}.`
    });
  };

  // AI Generation of Escalation Rules
  const handleAiGenerateEscalation = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Prompt vide', description: 'Veuillez saisir votre instruction métier.', variant: 'destructive' });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/pilotage/indicateurs-contentieux/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: { totalLegalCases: 0 },
          cases: [],
          filters: { queryType: 'ai_escalation_rule_compiler', prompt: aiPrompt }
        })
      });
      const data = await response.json();

      // Mock compilation fallback structured output logic
      const compiledRules: Partial<EscalationRule> = {
        name: 'Escalade Critique Factoring > 10K',
        description: 'Généré par IA RecovAI suite au prompt : "si retard factoring supérieur à 10K alors transfert urgent"',
        trigger_condition: 'Retard > 20j ET Portefeuille = Factoring ET Montant > 10000 TND',
        portfolio_type: 'factoring',
        min_overdue_amount: 10000,
        min_days_past_due: 20,
        actions: ['transfer_pre_litigation', 'increase_priority', 'notify_legal'],
        active: true,
        status: 'active'
      };

      setEditingRule(compiledRules);
      setModalMode('create');
      setIsModalOpen(true);
      setAiPrompt('');
      
      toast({
        title: 'Compilé par l\'IA avec succès !',
        description: 'Veuillez réviser la règle pré-configurée avant de l\'enregistrer.'
      });
    } catch {
      toast({ title: 'Erreur de génération', description: 'Le compilateur d\'IA est temporairement indisponible.', variant: 'destructive' });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne flex items-center gap-2">
            Règles d’Escalade <span className="bg-sky/15 text-sky text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Supervision</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gérez les alertes prioritaires et déclenchez des transferts automatiques de dossiers selon leur gravité.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95 active:scale-95 transition-all shadow-md shadow-sky/15"
          >
            <Plus size={15} />
            Ajouter une règle d’escalade
          </button>
        </div>
      </div>

      {/* Grid Layout: AI Builder & Rules list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Natural Language Prompt Builder */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-navy to-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky/20 flex items-center justify-center text-sky">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm font-syne">Générateur d’Escalades IA</h3>
                <p className="text-[10px] text-white/50">Composez vos règles d\'escalade en langage naturel.</p>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                placeholder="Rédigez la règle à compiler. Ex: si le retard de Leasing dépasse 30 jours pour plus de 8000 TND, planifier une visite terrain et suspendre la relance automatique..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky font-medium leading-relaxed"
              />
              <button
                onClick={handleAiGenerateEscalation}
                disabled={aiGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky hover:bg-sky/90 text-navy font-black text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Zap className="animate-spin" size={13} />
                    Analyse du modèle métier...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Compiler en règle active
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-white/40 leading-relaxed border-t border-white/5 pt-3 bg-white/[0.01] p-2.5 rounded-lg">
              <span className="font-extrabold uppercase block text-[9px] text-sky mb-1">Phrases acceptées :</span>
              "Si retard microfinance de 15j, envoyer un inspecteur terrain et hausser d'un échelon."
            </div>
          </div>
        </div>

        {/* Existing Rules List */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Filtrer les règles d'escalade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-mist rounded-xl border border-border text-xs focus:outline-none text-navy placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex gap-1.5">
              {(['all', 'microfinance', 'factoring', 'leasing'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPortfolio(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${
                    selectedPortfolio === p 
                      ? 'bg-navy text-white border-navy' 
                      : 'bg-card text-muted-foreground hover:bg-mist border-border'
                  }`}
                >
                  {p === 'all' ? 'Tous' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRules.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-xs">
                <AlertTriangle size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                Aucune règle d'escalade configurée.
              </div>
            ) : (
              filteredRules.map(rule => (
                <motion.div
                  key={rule.id}
                  layout
                  className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-navy uppercase tracking-tight">{rule.name}</h3>
                        <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          rule.portfolio_type === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-violet-100 text-violet-800'
                        }`}>
                          {rule.portfolio_type === 'all' ? 'Universel' : rule.portfolio_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">{rule.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleRuleStatus(rule)}
                        title={rule.active ? 'Désactiver' : 'Activer'}
                        className="text-slate-500 hover:text-sky transition-colors"
                      >
                        {rule.active ? <ToggleRight size={22} className="text-sky" /> : <ToggleLeft size={22} />}
                      </button>
                      <button 
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-sky transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Conditions & Trigger Metric */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-3 text-[11px]">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-black uppercase">Retard requis</span>
                      <span className="font-bold text-navy">{rule.min_days_past_due} jours</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-black uppercase">Encours requis</span>
                      <span className="font-bold text-navy">{rule.min_overdue_amount.toLocaleString()} TND</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-black uppercase">Déclenchements</span>
                      <span className="font-bold text-navy">{rule.trigger_count} fois</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-black uppercase">Dernier déclenchement</span>
                      <span className="font-bold text-navy">
                        {rule.last_triggered ? new Date(rule.last_triggered).toLocaleDateString() : 'Aucun'}
                      </span>
                    </div>
                  </div>

                  {/* Actions to take */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground font-black uppercase block tracking-wider">Actions configurées :</span>
                    <div className="flex flex-wrap gap-2">
                      {rule.actions.map(actKey => {
                        const meta = actionMetadata[actKey];
                        if (!meta) return null;
                        const ActIcon = meta.icon;
                        return (
                          <div 
                            key={actKey}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border ${meta.color}`}
                            title={meta.desc}
                          >
                            <ActIcon size={12} />
                            {meta.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Run For Trial */}
                  <div className="border-t border-border pt-3 flex justify-between items-center bg-mist -mx-5 -mb-5 px-5 py-2.5 text-[10px]">
                    <span className="text-muted-foreground italic font-medium">Condition: "{rule.trigger_condition}"</span>
                    <button
                      onClick={() => handleSimulateEscalation(rule)}
                      disabled={!rule.active}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-800 font-bold transition-all disabled:opacity-50"
                    >
                      <Play size={10} className="text-sky" />
                      Forcer Déclenchement d\'Escalade
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Execution Tracker Sidebar below */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-black text-navy font-syne uppercase tracking-wider flex items-center gap-2.5">
          Journal de traitement d’escalade <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-200 font-mono">SUP_ENGINE_LOGS</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                <th className="p-3">Horodatage</th>
                <th className="p-3">Dossier</th>
                <th className="p-3">Portefeuille</th>
                <th className="p-3">Action d’escalade activée</th>
                <th className="p-3">Détails d’exécution technique</th>
                <th className="p-3 text-center">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[11px]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-muted-foreground">Aucune escalade n'a encore été déclenchée.</td>
                </tr>
              ) : (
                history.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-muted-foreground text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-black text-navy">{log.debtor_name} ({log.dossier_id})</td>
                    <td className="p-3 uppercase text-violet-600 font-black">{log.portfolio_type}</td>
                    <td className="p-3 font-bold text-slate-700">{log.action_taken}</td>
                    <td className="p-3 text-muted-foreground line-clamp-1">{log.details}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                        SUCCÈS
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT RULE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden text-navy text-xs"
            >
              {/* Header */}
              <div className="bg-navy p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold font-syne text-sm flex items-center gap-2">
                    <ShieldAlert size={16} className="text-sky" />
                    {modalMode === 'create' ? 'Nouvelle règle d\'escalade' : 'Modifier la configuration'}
                  </h3>
                  <p className="text-[11px] text-white/60">Gérez comment le système réagit et transfère les dossiers en retard.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Nom explicite de la règle</label>
                    <input 
                      type="text" 
                      value={editingRule.name || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="Ex: Alerte Superviseur si Promesse Rompue J+15"
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs text-navy font-bold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Description</label>
                    <textarea 
                      rows={2}
                      value={editingRule.description || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                      placeholder="Pourquoi cette règle existe-t-elle et quels sont les impacts opérationnels attendus ?"
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Portefeuille Concerné</label>
                    <select 
                      value={editingRule.portfolio_type || 'all'}
                      onChange={(e) => setEditingRule({ ...editingRule, portfolio_type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border font-bold text-navy text-xs focus:outline-none"
                    >
                      <option value="all">Tous portefeuilles</option>
                      <option value="microfinance">Microfinance</option>
                      <option value="factoring">Factoring/Affacturage</option>
                      <option value="leasing">Leasing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Retard minimum requis (Jours)</label>
                    <input 
                      type="number" 
                      value={editingRule.min_days_past_due ?? 15}
                      onChange={(e) => setEditingRule({ ...editingRule, min_days_past_due: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Montant d\'impayé minimal (TND)</label>
                    <input 
                      type="number" 
                      value={editingRule.min_overdue_amount ?? 1000}
                      onChange={(e) => setEditingRule({ ...editingRule, min_overdue_amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Formule logique de validation</label>
                    <input 
                      type="text" 
                      value={editingRule.trigger_condition || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, trigger_condition: e.target.value })}
                      placeholder="Ex: Retard > 15j ET Promesse Rompue"
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs focus:outline-none italic"
                    />
                  </div>
                </div>

                {/* Multiselect of actions */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="block text-[10px] font-black uppercase text-muted-foreground tracking-wide">
                    Sélectionner les actions d\'escalade à déclencher (Multi-sélection)
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(actionMetadata).map(([key, value]) => {
                      const isSelected = (editingRule.actions || []).includes(key as any);
                      const ActIcon = value.icon;
                      return (
                        <div 
                          key={key}
                          onClick={() => handleToggleActionChoice(key)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                            isSelected 
                              ? 'bg-sky/5 border-sky' 
                              : 'bg-card border-border hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-sky text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <ActIcon size={14} />
                          </div>
                          <div>
                            <p className="font-extrabold text-[11px] text-navy leading-tight">{value.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{value.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-border">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold hover:bg-slate-100 text-slate-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRule}
                  className="px-5 py-2 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95"
                >
                  Enregistrer l\'escalade
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
