import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Workflow, Zap, Play, Pause, Trash2, Edit, Plus, X, ArrowRight, Clock, 
  HelpCircle, AlertCircle, CheckCircle, Database, PhoneCall, Mail, Send, Sparkles, Filter, Settings
} from 'lucide-react';
import { AutomationStore } from '@/lib/automation-store';
import { Workflow as WorkflowType, WorkflowNode, WorkflowEdge } from '@/types/automation';
import { toast } from '@/hooks/use-toast';

const nodeTypeColors: Record<string, { bg: string, text: string, border: string, icon: any }> = {
  trigger: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: Zap },
  condition: { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', icon: Filter },
  action: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', icon: Play },
  delay: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock }
};

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowType[]>(() => AutomationStore.getWorkflows());
  const [selectedWf, setSelectedWf] = useState<WorkflowType | null>(() => workflows[0] || null);
  const [activeTraceStep, setActiveTraceStep] = useState<string | null>(null);
  const [traceLog, setTraceLog] = useState<string[]>([]);
  const [tracing, setTracing] = useState(false);

  // Modal configuration states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWfName, setNewWfName] = useState('');
  const [newWfDesc, setNewWfDesc] = useState('');
  const [newWfPortfolio, setNewWfPortfolio] = useState<'all' | 'microfinance' | 'factoring' | 'leasing'>('all');

  const handleToggleWfStatus = (wf: WorkflowType) => {
    const nextStatus = wf.status === 'active' ? 'paused' : 'active';
    const updated = { ...wf, status: nextStatus };
    AutomationStore.updateWorkflow(updated);
    setWorkflows(AutomationStore.getWorkflows());
    setSelectedWf(updated);
    toast({
      title: nextStatus === 'active' ? 'Flux en service' : 'Flux suspendu',
      description: `Le workflow "${wf.name}" a été mis à jour.`
    });
  };

  const handleDeleteWf = (id: string) => {
    if (confirm('Voulez-vous détruire ce workflow d\'automatisation ?')) {
      AutomationStore.deleteWorkflow(id);
      const update = AutomationStore.getWorkflows();
      setWorkflows(update);
      setSelectedWf(update[0] || null);
      toast({ title: 'Workflow supprimé' });
    }
  };

  const handleCreateBlueprint = () => {
    if (!newWfName || !newWfDesc) {
      toast({ title: 'Nom et description requis', variant: 'destructive' });
      return;
    }

    // Default template nodes for a leasing workflow
    const defaultNodes: WorkflowNode[] = [
      { id: '1', type: 'trigger', label: 'Création Dossier Impayé', description: 'Détecte la création d\'un retard', config: { target: 'case_created' } },
      { id: '2', type: 'action', label: 'Envoi SMS Immédiat', description: 'Template de relance doux', config: { channel: 'sms', template_id: 'tmpl-01' } },
      { id: '3', type: 'delay', label: 'Attente 5 Jours', description: 'Laisse le temps de régulariser', config: { durationDays: 5 } },
      { id: '4', type: 'condition', label: 'Facture Soldée ?', description: 'Vérifie si versement reçu', config: { query: 'check_payment' } },
      { id: '5', type: 'action', label: 'Alerte WhatsApp Forte', description: 'Relance pré-contentieuse', config: { channel: 'whatsapp', template_id: 'tmpl-03' } }
    ];

    const defaultEdges: WorkflowEdge[] = [
      { from: '1', to: '2' },
      { from: '2', to: '3' },
      { from: '3', to: '4' },
      { from: '4', to: '5', conditionValue: 'non' }
    ];

    const entry = AutomationStore.addWorkflow({
      name: newWfName,
      description: newWfDesc,
      portfolio_type: newWfPortfolio,
      status: 'draft',
      nodes: defaultNodes,
      edges: defaultEdges,
      created_by: 'Ahmed B.'
    });

    setWorkflows(AutomationStore.getWorkflows());
    setSelectedWf(entry);
    setIsModalOpen(false);
    setNewWfName('');
    setNewWfDesc('');
    toast({ title: 'Schéma de workflow initialisé !' });
  };

  // Run execution path visual simulation tracer
  const handleStartTrace = async () => {
    if (!selectedWf) return;
    setTracing(true);
    setTraceLog([]);
    setActiveTraceStep(null);

    const logMsg = (msg: string) => setTraceLog(prev => [...prev, msg]);

    logMsg("🏁 Initialisation de la trace d'exécution pour le workflow...");
    await delay(600);

    // Node 1
    const n1 = selectedWf.nodes[0];
    if (n1) {
      setActiveTraceStep(n1.id);
      logMsg(`🔍 Étape 1 : [Déclencheur] ${n1.label} s'exécute.`);
      logMsg(`👉 Dossier filtré: DOS-2026-0442 en retard de 7 jours.`);
      await delay(1200);
    }

    // Node 2
    const n2 = selectedWf.nodes[1];
    if (n2) {
      setActiveTraceStep(n2.id);
      logMsg(`⚡ Étape 2 : [Action] ${n2.label} déclenché.`);
      logMsg(`📤 SMS envoyé avec succès au destinataire via plateforme Tunisia Telecom.`);
      await delay(1200);
    }

    // Node 3
    const n3 = selectedWf.nodes[2];
    if (n3) {
      setActiveTraceStep(n3.id);
      logMsg(`⏳ Étape 3 : [Attente] ${n3.label} engagé.`);
      logMsg(`⏱️ Simulation temporelle achevée avec succès.`);
      await delay(1200);
    }

    // Node 4
    const n4 = selectedWf.nodes[3];
    if (n4) {
      setActiveTraceStep(n4.id);
      logMsg(`⚖️ Étape 4 : [Condition Or] Évaluation de "${n4.label}" de conformité.`);
      logMsg(`⚠️ Solde débiteur toujours détecté (Règlement Non Renseigné).`);
      await delay(1200);
    }

    // Node 5 (Condition path yes matches first matching edge with conditionValue: 'non')
    const n5 = selectedWf.nodes[4];
    if (n5) {
      setActiveTraceStep(n5.id);
      logMsg(`⚡ Étape 5 : [Branche Non] Lancement de l'action "${n5.label}".`);
      logMsg(`📱 WhatsApp d'office envoyé et distribué.`);
      await delay(800);
    }

    // Done
    setActiveTraceStep(null);
    setTracing(false);
    logMsg("🎉 Trace analytique achevée. Les logs de simulation sont conformes aux règles configurées.");
    
    // Log history
    AutomationStore.logExecution({
      workflow_id: selectedWf.id,
      type: 'workflow',
      dossier_id: 'DOS-2026-0442',
      debtor_name: 'STE EL NOUR SARL',
      portfolio_type: selectedWf.portfolio_type,
      action_taken: `Workflow: ${selectedWf.name}`,
      status: 'success',
      details: 'Exécution simulée complète de bout-en-bout avec relances multicanales.'
    });

    setWorkflows(AutomationStore.getWorkflows());
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne flex items-center gap-2">
            Workflows Automatisés <span className="bg-sky/15 text-sky text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Couture Or</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Orchestrez des chaînes de rappel et d\'escalades complexes combinant délais, canaux et conditions.</p>
        </div>
        <div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95 shadow-md shadow-sky/15"
          >
            <Plus size={15} />
            Nouveau schéma de workflow
          </button>
        </div>
      </div>

      {/* Grid: Left Column Selector, Right Column Flow Diagram */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Selector Panel */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block">Flux d\'orchestrations</span>
            
            <div className="space-y-2">
              {workflows.map(wf => (
                <div
                  key={wf.id}
                  onClick={() => setSelectedWf(wf)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                    selectedWf?.id === wf.id 
                      ? 'border-sky bg-sky/5 shadow-sm' 
                      : 'border-border hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 max-w-[80%]">
                    <h4 className="text-xs font-black text-navy leading-tight">{wf.name}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{wf.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        wf.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {wf.status === 'active' ? 'EN SERVICE' : 'BROUILLON'}
                      </span>
                      <span className="text-[8px] font-black uppercase text-violet-600 bg-violet-50 px-1.5 rounded">{wf.portfolio_type}</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteWf(wf.id); }}
                    className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trace logger display */}
          {traceLog.length > 0 && (
            <div className="bg-slate-950 text-slate-50 rounded-2xl p-4 space-y-3 border border-slate-800 font-mono text-[10px] shadow-lg max-h-[300px] overflow-y-auto">
              <div className="flex justify-between items-center text-sky font-extrabold uppercase text-[9px] border-b border-white/10 pb-2">
                <span>Simulation Diagnostic Trace</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky animate-ping" />
              </div>
              <div className="space-y-1.5 leading-relaxed">
                {traceLog.map((log, index) => (
                  <div key={index} className={log.startsWith('🏁') || log.startsWith('🎉') ? 'text-emerald-400 font-extrabold' : log.includes('Étape') ? 'text-sky' : 'text-slate-300'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visualizer flow diagram */}
        <div className="xl:col-span-8">
          {selectedWf ? (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-6">
              
              {/* Toolbar in visualizer */}
              <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3 border-border">
                <div>
                  <span className="text-[9px] font-black uppercase text-sky bg-sky/10 px-2 py-0.5 rounded-full">Scénario de cheminement</span>
                  <h3 className="font-extrabold text-xs text-navy font-syne mt-0.5">{selectedWf.name}</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartTrace}
                    disabled={tracing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-xs font-black text-white hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={11} />
                    {tracing ? 'Déclenchement...' : 'Démarrer Trace diagnostic'}
                  </button>

                  <button
                    onClick={() => handleToggleWfStatus(selectedWf)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all ${
                      selectedWf.status === 'active' 
                        ? 'bg-amber-50 hover:bg-amber-100/75 border-amber-200 text-amber-900' 
                        : 'bg-green-50 hover:bg-green-150 border-green-200 text-green-700'
                    }`}
                  >
                    {selectedWf.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
                    {selectedWf.status === 'active' ? 'Suspendre' : 'Mettre en Service'}
                  </button>
                </div>
              </div>

              {/* Dynamic steps grid */}
              <div className="flex flex-col items-center py-6 space-y-6 relative">
                
                {selectedWf.nodes.map((node, index) => {
                  const colors = nodeTypeColors[node.type] || nodeTypeColors.action;
                  const NodeIcon = colors.icon;
                  const isCurrent = activeTraceStep === node.id;

                  // Find link arrow paths where applicable
                  const linkEdge = selectedWf.edges.find(e => e.from === node.id);

                  return (
                    <div key={node.id} className="flex flex-col items-center w-full max-w-sm">
                      
                      {/* Node representation box */}
                      <motion.div
                        animate={isCurrent ? { scale: [1, 1.03, 1], borderColor: '#0ea5e9', borderWidth: '3px' } : {}}
                        transition={{ repeat: isCurrent ? Infinity : 0, duration: 1 }}
                        className={`w-full p-4 rounded-xl border flex items-start gap-3.5 shadow-sm transition-all relative ${colors.bg} ${colors.border} ${
                          isCurrent ? 'ring-4 ring-sky/15 z-10' : ''
                        }`}
                      >
                        {isCurrent && <span className="absolute top-2 right-2 flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>}

                        <div className={`p-2 rounded-xl shrink-0 ${colors.text} bg-white border border-border shadow-sm`}>
                          <NodeIcon size={16} />
                        </div>

                        <div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[9px] uppercase font-black text-muted-foreground mr-1">Étape {index + 1} • {node.type}</span>
                          </div>
                          <h4 className="text-xs font-black text-navy">{node.label}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{node.description}</p>
                        </div>
                      </motion.div>

                      {/* Connection arrow pointing to next step */}
                      {index < selectedWf.nodes.length - 1 && (
                        <div className="flex flex-col items-center py-2 h-10 select-none">
                          <div className={`w-0.5 h-full ${isCurrent ? 'bg-sky-500' : 'bg-slate-300'}`} />
                          <ArrowRight size={14} className="rotate-90 text-slate-300 -mt-1" />
                          
                          {/* If path forks onto conditional branches */}
                          {linkEdge && linkEdge.conditionValue && (
                            <span className="bg-white border rounded px-1.5 py-0.5 text-[8px] text-violet-600 font-extrabold uppercase -mt-7 -ml-8 z-10 leading-none">
                              SI: "{linkEdge.conditionValue}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>

            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-xs min-h-[300px] flex flex-col justify-center items-center">
              <Workflow size={40} className="text-muted-foreground/30 mb-3" />
              Sélectionnez ou créez un workflow pour entamer l'exploration visualisée.
            </div>
          )}
        </div>
      </div>

      {/* CREATE WORKFLOW DIAGRAM BLUEPRINT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden text-navy text-xs"
            >
              {/* Header */}
              <div className="bg-navy p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold font-syne text-sm flex items-center gap-2">
                    <Workflow size={16} className="text-sky" />
                    Créer un nouveau schéma
                  </h3>
                  <p className="text-[11px] text-white/60">Générez un workflow standard à adapter ultérieurement.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Nom du workflow</label>
                  <input 
                    type="text" 
                    value={newWfName}
                    onChange={(e) => setNewWfName(e.target.value)}
                    placeholder="Ex: Flux de Relance Standard"
                    className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs text-navy font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Description explicite</label>
                  <textarea 
                    rows={2}
                    value={newWfDesc}
                    onChange={(e) => setNewWfDesc(e.target.value)}
                    placeholder="Identifiez le rôle opérationnel attendu pour ce flux de rappel..."
                    className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Portefeuille ciblé</label>
                  <select 
                    value={newWfPortfolio} 
                    onChange={(e) => setNewWfPortfolio(e.target.value as any)}
                    className="w-full px-3 py-1.8 bg-mist rounded-xl border text-xs text-navy font-bold focus:outline-none"
                  >
                    <option value="all">Tous portefeuilles</option>
                    <option value="microfinance">Microfinance</option>
                    <option value="factoring">Factoring</option>
                    <option value="leasing">Leasing</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-border">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateBlueprint}
                  className="px-5 py-2 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95"
                >
                  Générer le blueprint
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
