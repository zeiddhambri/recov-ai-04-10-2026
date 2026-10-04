import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { mockDossiers } from '@/lib/mock-data';
import {
  RelanceScenario, RelanceExecution, RelanceEtape,
  mockScenarios, mockRelanceExecutions,
  canalConfig, statutRelanceConfig,
} from '@/lib/relance';
import { classificationConfig, ClientClassification } from '@/lib/scoring';
import {
  Zap, Play, Pause, ChevronRight, ChevronDown,
  Clock, CheckCircle2, XCircle, AlertCircle,
  MessageSquare, Mail, Phone, Send, Eye,
  ArrowRight, Filter, Search, Brain,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NouveauScenarioModal from '@/components/relance/NouveauScenarioModal';

const canalIcons: Record<string, typeof Mail> = {
  sms: MessageSquare, email: Mail, whatsapp: Send, appel: Phone,
};

export default function Relances() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'suivi' | 'historique'>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [scenarios, setScenarios] = useState<RelanceScenario[]>(mockScenarios);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne">Moteur de Relance</h1>
          <p className="text-muted-foreground mt-1">Scénarios de relance automatisés multicanaux.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/relances/decision-credit" className="flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/20">
            <Brain size={18} />
            Moteur Décision Crédit
          </Link>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-xl text-sm font-bold hover:bg-sky/90 transition-all shadow-lg shadow-sky/20">
            <Zap size={18} />
            Nouveau scénario
          </button>
        </div>
      </div>

      <NouveauScenarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(sc) => setScenarios([sc, ...scenarios])}
      />

      {/* Stats bar */}
      <RelanceStats />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          { key: 'scenarios', label: 'Scénarios', icon: Zap },
          { key: 'suivi', label: 'Suivi en cours', icon: Play },
          { key: 'historique', label: 'Historique', icon: Clock },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px",
              activeTab === tab.key ? "border-sky text-sky" : "border-transparent text-muted-foreground hover:text-navy")}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scenarios' && (
        <ScenariosTab scenarios={scenarios} selectedScenario={selectedScenario} onSelect={setSelectedScenario} />
      )}
      {activeTab === 'suivi' && (
        <SuiviTab selectedDossier={selectedDossier} onSelect={setSelectedDossier} searchQuery={searchQuery} onSearch={setSearchQuery} />
      )}
      {activeTab === 'historique' && (
        <HistoriqueTab searchQuery={searchQuery} onSearch={setSearchQuery} />
      )}
    </div>
  );
}

function RelanceStats() {
  const total = mockRelanceExecutions.length;
  const envoyees = mockRelanceExecutions.filter(r => r.statut === 'envoyee').length;
  const repondues = mockRelanceExecutions.filter(r => r.statut === 'repondue').length;
  const echouees = mockRelanceExecutions.filter(r => r.statut === 'echouee').length;
  const planifiees = mockRelanceExecutions.filter(r => r.statut === 'planifiee').length;
  const tauxReponse = total > 0 ? Math.round((repondues / (total - planifiees)) * 100) : 0;

  const stats = [
    { label: 'Relances totales', value: total, icon: Send, accent: 'text-sky', bg: 'bg-sky/10' },
    { label: 'Envoyées', value: envoyees, icon: CheckCircle2, accent: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Répondues', value: repondues, icon: MessageSquare, accent: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Taux réponse', value: `${tauxReponse}%`, icon: Zap, accent: 'text-gold', bg: 'bg-gold/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
            <s.icon size={20} className={s.accent} />
          </div>
          <div>
            <p className="text-xl font-black text-navy font-syne">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScenariosTab({ scenarios, selectedScenario, onSelect }: { scenarios: RelanceScenario[]; selectedScenario: string | null; onSelect: (id: string | null) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Scenario list */}
      <div className="lg:col-span-1 space-y-4">
        {scenarios.map((sc, i) => (
          <motion.div key={sc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(selectedScenario === sc.id ? null : sc.id)}
            className={cn("bg-card rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md",
              selectedScenario === sc.id ? "border-sky shadow-lg shadow-sky/10" : "border-border")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className={sc.actif ? 'text-sky' : 'text-muted-foreground'} />
                <h3 className="font-bold text-sm text-navy">{sc.nom}</h3>
              </div>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                sc.actif ? "text-green-600 bg-green-50" : "text-muted-foreground bg-muted")}>
                {sc.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{sc.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {sc.cibleClassification.map(c => {
                const cfg = classificationConfig[c];
                return (
                  <span key={c} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.bgClass, cfg.colorClass)}>
                    {cfg.label}
                  </span>
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-auto">{sc.etapes.length} étapes</span>
            </div>
            <div className="flex items-center gap-1 mt-3">
              {sc.etapes.map(e => {
                const Icon = canalIcons[e.canal];
                return <div key={e.id} className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px]", canalConfig[e.canal].color)}>
                  <Icon size={12} />
                </div>;
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scenario detail - workflow timeline */}
      <div className="lg:col-span-2">
        {selectedScenario ? (
          <ScenarioDetail scenario={scenarios.find(s => s.id === selectedScenario)!} />
        ) : (
          <div className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
            <Eye size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">Sélectionnez un scénario pour voir le workflow détaillé</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioDetail({ scenario }: { scenario: RelanceScenario }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-navy font-syne">{scenario.nom}</h3>
          <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg text-xs font-bold bg-sky/10 text-sky hover:bg-sky/20 transition-all">
            Modifier
          </button>
          <button className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all",
            scenario.actif ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-green-50 text-green-600 hover:bg-green-100")}>
            {scenario.actif ? <><Pause size={12} className="inline mr-1" />Désactiver</> : <><Play size={12} className="inline mr-1" />Activer</>}
          </button>
        </div>
      </div>

      {scenario.arretSiPaiement && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl mb-6 text-xs text-green-700 font-medium">
          <CheckCircle2 size={14} />
          Arrêt automatique en cas de paiement
        </div>
      )}

      {/* Workflow timeline */}
      <div className="relative">
        {scenario.etapes.map((etape, i) => {
          const Icon = canalIcons[etape.canal];
          const isLast = i === scenario.etapes.length - 1;
          const jourLabel = etape.jour < 0 ? `J${etape.jour}` : `J+${etape.jour}`;

          return (
            <motion.div key={etape.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex gap-4 mb-0">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center w-12 shrink-0">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border-2 z-10 bg-card",
                  etape.estObligatoire ? 'border-sky' : 'border-border')}>
                  <Icon size={16} className={etape.estObligatoire ? 'text-sky' : 'text-muted-foreground'} />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[24px]" />}
              </div>

              {/* Content */}
              <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-navy font-mono bg-navy/5 px-2 py-0.5 rounded">{jourLabel}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", canalConfig[etape.canal].color)}>
                    {canalConfig[etape.canal].label}
                  </span>
                  {!etape.estObligatoire && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Conditionnel</span>
                  )}
                </div>
                <p className="text-sm font-bold text-navy">{etape.titre}</p>
                <p className="text-xs text-muted-foreground mt-1">{etape.message}</p>
                {etape.conditionClassification && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertCircle size={10} className="text-gold" />
                    <span className="text-[10px] text-gold font-medium">
                      Uniquement : {etape.conditionClassification.map(c => classificationConfig[c].label).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function SuiviTab({ selectedDossier, onSelect, searchQuery, onSearch }: {
  selectedDossier: string | null; onSelect: (id: string | null) => void;
  searchQuery: string; onSearch: (q: string) => void;
}) {
  // Get dossiers with active relances (not payé/contentieux)
  const activeDossiers = useMemo(() => {
    return mockDossiers
      .filter(d => !['paye', 'contentieux'].includes(d.status))
      .filter(d => !searchQuery || d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientCode.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Rechercher un dossier..." value={searchQuery} onChange={e => onSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
        />
      </div>

      {activeDossiers.map((d, i) => {
        const executions = mockRelanceExecutions.filter(r => r.dossierId === d.id);
        const isOpen = selectedDossier === d.id;
        const derniere = executions[executions.length - 1];
        const scenario = derniere ? mockScenarios.find(s => s.id === derniere.scenarioId) : null;

        return (
          <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border overflow-hidden">
            <div onClick={() => onSelect(isOpen ? null : d.id)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-mist transition-colors">
              {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-navy">{d.debtorName}</span>
                  <span className="text-xs font-mono text-muted-foreground">{d.clientCode}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.amount.toLocaleString()} TND • Score: {d.scoringResult.score}/100
                  {scenario && <> • Scénario: <span className="font-medium text-navy">{scenario.nom}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {executions.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky/10 text-sky">
                    {executions.length} relances
                  </span>
                )}
                <RelanceProgressBar executions={executions} scenario={scenario} />
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border">
                  <div className="p-5">
                    {executions.length > 0 ? (
                      <div className="space-y-3">
                        {executions.map(rx => {
                          const etape = mockScenarios.flatMap(s => s.etapes).find(e => e.id === rx.etapeId);
                          const Icon = canalIcons[rx.canal];
                          const stCfg = statutRelanceConfig[rx.statut];
                          return (
                            <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl bg-mist">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", canalConfig[rx.canal].color)}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-navy">{etape?.titre || 'Relance'}</p>
                                <p className="text-[11px] text-muted-foreground">{rx.dateEnvoi} • {canalConfig[rx.canal].label}</p>
                              </div>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", stCfg.color)}>
                                {stCfg.label}
                              </span>
                              {rx.commentaire && (
                                <span className="text-[10px] text-muted-foreground italic max-w-[200px] truncate">{rx.commentaire}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucune relance encore effectuée pour ce dossier.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function RelanceProgressBar({ executions, scenario }: { executions: RelanceExecution[]; scenario: RelanceScenario | null | undefined }) {
  if (!scenario) return null;
  const total = scenario.etapes.length;
  const done = executions.filter(e => e.statut !== 'planifiee').length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-sky rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">{done}/{total}</span>
    </div>
  );
}

function HistoriqueTab({ searchQuery, onSearch }: { searchQuery: string; onSearch: (q: string) => void }) {
  const allExecs = useMemo(() => {
    let execs = [...mockRelanceExecutions].sort((a, b) => b.dateEnvoi.localeCompare(a.dateEnvoi));
    if (searchQuery) {
      execs = execs.filter(rx => {
        const dossier = mockDossiers.find(d => d.id === rx.dossierId);
        return dossier && (dossier.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || dossier.clientCode.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    }
    return execs;
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => onSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Dossier</th>
              <th className="text-left p-4">Canal</th>
              <th className="text-left p-4">Étape</th>
              <th className="text-left p-4">Statut</th>
              <th className="text-left p-4">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {allExecs.map((rx, i) => {
              const dossier = mockDossiers.find(d => d.id === rx.dossierId);
              const etape = mockScenarios.flatMap(s => s.etapes).find(e => e.id === rx.etapeId);
              const Icon = canalIcons[rx.canal];
              const stCfg = statutRelanceConfig[rx.statut];

              return (
                <motion.tr key={rx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border hover:bg-mist transition-colors">
                  <td className="p-4 text-xs font-mono text-muted-foreground">{rx.dateEnvoi}</td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-navy">{dossier?.debtorName || '—'}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{dossier?.clientCode}</p>
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", canalConfig[rx.canal].color)}>
                      <Icon size={10} /> {canalConfig[rx.canal].label}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-navy">{etape?.titre || '—'}</td>
                  <td className="p-4">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", stCfg.color)}>{stCfg.label}</span>
                  </td>
                  <td className="p-4 text-[11px] text-muted-foreground italic max-w-[200px] truncate">{rx.commentaire || '—'}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
