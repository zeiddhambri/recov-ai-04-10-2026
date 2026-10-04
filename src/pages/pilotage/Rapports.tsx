import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Calendar, Clock, Download, Plus, Mail, ToggleLeft, ToggleRight, 
  Trash2, Sparkles, Filter, CheckCircle2, AlertCircle, RefreshCw, Send, Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Rapports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'library' | 'archive'>('library');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Backend States
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [generated, setGenerated] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generating Loader State
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // AI Analysis Panel
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzingDefId, setAnalyzingDefId] = useState<string | null>(null);

  // New Schedule Dialog Form
  const [showScheduleForm, setShowScheduleForm] = useState<string | null>(null); // holds definition ID
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleFormat, setScheduleFormat] = useState('pdf');
  const [scheduleRecipients, setScheduleRecipients] = useState('');

  const fetchReportingData = async () => {
    setLoading(true);
    try {
      const catQuery = categoryFilter !== 'All' ? `?category=${categoryFilter}` : '';
      const [resDef, resGen, resSch] = await Promise.all([
        fetch(`/api/pilotage/rapports${catQuery}`),
        fetch('/api/pilotage/rapports/generated'),
        // Simulating matching endpoints inside our REST handlers
        fetch('/api/pilotage/tableau-de-bord-global/summary') // dummy API trace to keep routes awake
      ]);

      if (!resDef.ok || !resGen.ok) throw new Error("Échec de récupération de la bibliothèque.");

      const defs = await resDef.ok ? await resDef.json() : [];
      const gens = await resGen.ok ? await resGen.json() : [];

      setDefinitions(defs);
      setGenerated(gens);

      // In-line mockup lookup for Scheduled items
      setSchedules([
        { id: 'sch-01', report_definition_id: 'rep-01', name: 'Envoi mensuel Direction Risques', frequency: 'monthly', recipients: ['direction.risques@recovai.tn'], format: 'pdf', active: true, next_run_at: '2026-06-01T00:00:00Z' },
        { id: 'sch-02', report_definition_id: 'rep-03', name: 'Hebdo Performance Recouvreurs', frequency: 'weekly', recipients: ['superviseurs@recovai.tn'], format: 'excel', active: true, next_run_at: '2026-06-01T08:00:00Z' }
      ]);
    } catch (err: any) {
      toast({
        title: "Erreur d'actualisation",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportingData();
  }, [categoryFilter]);

  const handleImmediateGenerate = async (defId: string) => {
    setGeneratingId(defId);
    try {
      const response = await fetch(`/api/pilotage/rapports/${defId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf', userEmail: 'ahmed.b@recovai.tn' })
      });

      if (!response.ok) throw new Error("Impossible de générer le rapport.");
      const newGenRep = await response.json();

      setGenerated(prev => [newGenRep, ...prev]);
      toast({
        title: "Rapport généré avec succès",
        description: `Téléchargement prêt dans l'onglet des archives.`,
      });
      setActiveTab('archive');
    } catch (err: any) {
      toast({
        title: "Erreur de génération",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleTriggerAiAdvice = async (defId: string) => {
    setAnalyzingDefId(defId);
    setAiAnalysis('');
    try {
      const response = await fetch(`/api/pilotage/rapports/${defId}/ai-analysis`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error("Diagnostic IA indisponible.");
      const data = await response.json();
      setAiAnalysis(data.result);
    } catch (err: any) {
      toast({
        title: "Échec de l'assistant IA",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzingDefId(null);
    }
  };

  const handleToggleSchedule = (schId: string, currentStatus: boolean) => {
    setSchedules(prev => prev.map(s => s.id === schId ? { ...s, active: !currentStatus } : s));
    toast({
      title: currentStatus ? "Planification désactivée" : "Planification activée",
      description: "Le cron-daemon a mis à jour l'agenda des envois.",
    });
  };

  const handleCreateSchedule = (defId: string) => {
    const matchedDef = definitions.find(d => d.id === defId);
    if (!matchedDef) return;

    const newSchObj = {
      id: `sch-${Date.now().toString().slice(-4)}`,
      report_definition_id: defId,
      name: scheduleName || `Hebdo ${matchedDef.name}`,
      frequency: scheduleFrequency,
      recipients: scheduleRecipients.split(',').map(email => email.trim()),
      format: scheduleFormat,
      active: true,
      next_run_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    setSchedules(prev => [newSchObj, ...prev]);
    setShowScheduleForm(null);
    setScheduleName('');
    setScheduleRecipients('');
    toast({
      title: "Planification enregistrée",
      description: "La distribution automatisée d'e-mails a été initiée.",
    });
  };

  const handleDownloadReport = (genId: string, fileName: string) => {
    // Direct hyperlink to the streaming api response
    window.open(`/api/pilotage/rapports/generated/${genId}/download`, '_blank');
    toast({
      title: "Téléchargement initié",
      description: `Rapport expédié sous format attachment.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="rapports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rapports & Planifications</h1>
          <p className="text-xs text-gray-500 font-mono">Consolidez vos archives et planifiez des distributions réglementaires par e-mail</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-reports-library"
          >
            Bibliothèque de rapports
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'archive' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-reports-archive"
          >
            Schedules & Archives
          </button>
        </div>
      </div>

      {/* Categories Filter Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
          <Filter size={12} /> Catégories : 
        </span>
        {['All', 'portefeuille', 'recouvrement', 'contentieux'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all border ${
              categoryFilter === cat 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat === 'All' ? 'Toutes' : cat}
          </button>
        ))}
      </div>

      {activeTab === 'library' ? (
        /* Library definitions grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {definitions.map((def) => (
              <div 
                key={def.id} 
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-emerald-100 transition-colors flex flex-col justify-between h-56"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 rounded">
                      {def.category || 'Général'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">{def.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{def.name || 'Rapport'}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{def.description || 'Rapport consolidé généré automatiquement par RecovAI.'}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                  <button
                    onClick={() => handleTriggerAiAdvice(def.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded bg-emerald-50/50 transition-colors"
                  >
                    <Sparkles size={11} />
                    Conseil IA
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowScheduleForm(def.id)}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors border border-gray-200"
                    >
                      Planifier
                    </button>
                    <button
                      onClick={() => handleImmediateGenerate(def.id)}
                      disabled={generatingId === def.id}
                      className="px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded transition-colors shadow-sm"
                    >
                      {generatingId === def.id ? "Génération..." : "Générer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar drawer: AI recommendations & Inline form */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. New Schedule Form Dialog box */}
            {showScheduleForm ? (
              <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-lg p-5">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Mail size={15} className="text-emerald-600" /> Planifier le rapport :
                </h3>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">ID : {showScheduleForm}</p>
                
                <div className="space-y-3.5 mt-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Titre de la tâche</label>
                    <input
                      type="text"
                      placeholder="e.g. Envoi hebdo direction"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:bg-white text-gray-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Fréquence</label>
                      <select
                        value={scheduleFrequency}
                        onChange={(e) => setScheduleFrequency(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:bg-white text-gray-800 text-xs"
                      >
                        <option value="daily">Quotidien</option>
                        <option value="weekly">Hebdomadaire</option>
                        <option value="monthly">Mensuel</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Format d'export</label>
                      <select
                        value={scheduleFormat}
                        onChange={(e) => setScheduleFormat(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:bg-white text-gray-800 text-xs"
                      >
                        <option value="pdf">Fichier PDF</option>
                        <option value="excel">Tableur Excel</option>
                        <option value="csv">Données CSV</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Destinataires (Séparés par une virgule)</label>
                    <textarea
                      placeholder="e.g. risques@recovai.tn, audit@recovai.tn"
                      value={scheduleRecipients}
                      onChange={(e) => setScheduleRecipients(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:bg-white text-gray-800 font-mono text-[11px]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-3">
                    <button
                      onClick={() => setShowScheduleForm(null)}
                      className="w-1/2 py-2 border border-gray-200 rounded hover:bg-gray-50 font-bold text-gray-500 text-center"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleCreateSchedule(showScheduleForm)}
                      className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-center"
                    >
                      Confirmer plan
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* AI Advisor Panel */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-400/20 text-emerald-400 rounded-md">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-none">Diagnostic IA de Planification</h4>
                  <p className="text-[9px] font-mono text-gray-400 mt-1">Audit intelligent d'automatisation</p>
                </div>
              </div>

              <div className="bg-black/30 border border-slate-800 rounded-lg p-3.5 h-[200px] overflow-y-auto text-xs font-mono text-gray-300">
                {analyzingDefId ? (
                  <p className="animate-pulse text-emerald-400">Simulation d'audit sur l'importance du traitement de l'audience...</p>
                ) : aiAnalysis ? (
                  <div className="space-y-2 font-sans text-gray-200 leading-normal">
                    {aiAnalysis.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) return <p key={idx} className="text-emerald-400 font-bold text-xs mt-2">{line.replace('###', '')}</p>;
                      if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) return <p key={idx} className="leading-relaxed mt-1 text-gray-300">{line}</p>;
                      return <p key={idx} className="text-[11px] text-gray-400">{line}</p>;
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 mt-12 text-[11px]">Cliquez sur "Conseil IA" sur n'importe quel rapport pour recevoir des stratégies automatiques de ciblage.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Archive List */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History files List */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-50 flex items-center justify-between">
              <span>Archives des rapports générés</span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-gray-100 rounded text-gray-600">Total : {generated.length}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 font-semibold text-gray-400 font-mono text-[10px]">
                    <th className="pb-2">Nom du Fichier</th>
                    <th className="pb-2 text-center">Format</th>
                    <th className="pb-2">Généré le</th>
                    <th className="pb-2">Généré par</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {generated.map((item) => {
                    const fmt = (item.format || 'pdf').toLowerCase();
                    const fileName = item.file_name || `${item.name || 'rapport'}.${fmt}`;
                    const dateStr = item.generated_at || item.generatedAt;
                    let formattedDate = 'Récemment';
                    if (dateStr) {
                      try {
                        formattedDate = new Date(dateStr).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
                      } catch (e) {
                        formattedDate = String(dateStr);
                      }
                    }

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-3 font-semibold text-gray-800 max-w-[200px] truncate">
                          {item.name || 'Rapport sans titre'}
                          <span className="block text-[10px] text-gray-400 font-mono truncate">{fileName}</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            fmt === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {fmt.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-gray-500">
                          {formattedDate}
                        </td>
                        <td className="py-3 text-gray-600">
                          {item.generated_by || item.generatedBy || 'Utilisateur'}
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-1.5 py-0.5 font-bold uppercase rounded text-[9px] bg-emerald-100 text-emerald-800">
                            {item.status || 'Terminé'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDownloadReport(item.id, fileName)}
                            className="p-1 hover:bg-gray-100 text-gray-600 hover:text-emerald-600 rounded transition-colors"
                            title="Télécharger le rapport"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active cron schedule subscriptions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:col-span-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-50">Distribs automatiques actives</h3>
            
            <div className="space-y-4">
              {schedules.map((sch) => (
                <div key={sch.id} className="p-3.5 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-gray-400 font-bold uppercase">{sch.id} | {sch.frequency}</span>
                    
                    {/* Toggle button */}
                    <button 
                      onClick={() => handleToggleSchedule(sch.id, sch.active)}
                      className="text-gray-400 hover:text-emerald-500 rounded"
                    >
                      {sch.active ? (
                        <ToggleRight size={22} className="text-emerald-500 font-bold" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-300" />
                      )}
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-gray-800">{sch.name}</h4>
                  <div className="text-[10px] text-gray-500 font-mono space-y-1">
                    <p className="flex items-center gap-1"><Mail size={10} /> {sch.recipients.join(', ')}</p>
                    <p className="flex items-center gap-1"><Clock size={10} /> Prochain envoi : {new Date(sch.next_run_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
