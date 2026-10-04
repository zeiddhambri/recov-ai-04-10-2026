import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PhoneCall, MessageSquare, Map, Landmark, Plus, FileSpreadsheet, Download,
  Users, CheckCircle, Clock, AlertTriangle, Play, Sparkles, Send, ShieldCheck
} from 'lucide-react';
import { PilotageFilters } from '@/components/pilotage/PilotageFilters';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useToast } from '@/components/ui/use-toast';
import { authorizedFetch } from '@/lib/authorizedFetch';

const SHIELD_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'];

export default function IndicateursRecouvrement() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<any>({
    startDate: '',
    endDate: '',
    portfolio: 'All',
    institution: 'All',
    branch: 'All',
    riskLevel: 'All',
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  
  // AI Advice State
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async (currentFilters: any) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) {
          queryParams.append(key, currentFilters[key]);
        }
      });

      const [resSummary, resCharts, resTable] = await Promise.all([
        authorizedFetch(`/api/pilotage/indicateurs-recouvrement/summary?${queryParams.toString()}`),
        authorizedFetch(`/api/pilotage/indicateurs-recouvrement/charts?${queryParams.toString()}`),
        authorizedFetch(`/api/pilotage/indicateurs-recouvrement/table?${queryParams.toString()}`)
      ]);

      if (!resSummary.ok || !resCharts.ok || !resTable.ok) {
        throw new Error('Erreur de chargement des indicateurs de recouvrement');
      }

      const summaryData = await resSummary.json();
      const chartsData = await resCharts.json();
      const tableRaw = await resTable.json();

      setSummary(summaryData);
      setCharts(chartsData);
      const list = Array.isArray(tableRaw) ? tableRaw : (Array.isArray(tableRaw?.data) ? tableRaw.data : []);
      setTableData(list);
    } catch (err: any) {
      toast({
        title: "Erreur de synchronisation",
        description: err.message || "Impossible de charger les données amiables.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  const handleRunAiAnalysis = async () => {
    if (!summary) return;
    setAnalyzing(true);
    setAiAdvice('');
    try {
      const response = await authorizedFetch('/api/pilotage/indicateurs-recouvrement/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, filters })
      });
      if (!response.ok) throw new Error("Échec de l'audit amiable de l'IA");
      const data = await response.json();
      setAiAdvice(data.result);
      toast({
        title: "Conseiller Diagnostic Terminé",
        description: "Recommandations d'engagement prêtes.",
      });
    } catch (err: any) {
      toast({
        title: "Échec de l'analyse IA",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/pilotage/indicateurs-recouvrement/export?format=${format}`);
      if (!response.ok) throw new Error("Échec de l'exportation amiable");
      const data = await response.json();
      toast({
        title: `Export amiable prêt (${format.toUpperCase()})`,
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'exportation",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const formatTND = (val: number) => {
    if (!val && val !== 0) return '-';
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(val);
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="text-xs text-gray-400 font-mono">Chargement de la balance amiable consolidée...</p>
      </div>
    );
  }

  const s = summary || { totalCases: 0, newCases: 0, inProgressCases: 0, recoveredCases: 0, partialCases: 0, escalatedCases: 0, amountInRecovery: 0, amountRecovered: 0, recoveryRate: 0, pendingPromises: 0, brokenPromises: 0, overdueActions: 0, noNextAction: 0, fieldVisitsPlanned: 0, fieldVisitsDone: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="indicateurs-recouvrement-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Indicateurs de recouvrement</h1>
          <p className="text-xs text-gray-500 font-mono">Consolidation des dossiers et d'échéances amiables (Soft & Field Collections)</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            Exporter Balance
          </button>
        </div>
      </div>

      {/* Shared filters */}
      <PilotageFilters onFilter={(updated) => setFilters(updated)} />

      {/* Amiable Metrics Grid precisely representing spec */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total folders */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-mono font-bold text-gray-400">Total dossiers amiables</p>
          <p className="text-lg font-bold text-gray-800 font-mono mt-1">{s.totalCases}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400 font-mono">
            <span>Nouveaux : {s.newCases}</span>
            <span>&bull;</span>
            <span>Escaladés : {s.escalatedCases}</span>
          </div>
        </div>

        {/* Amount in collection */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-mono font-bold text-gray-400">Encours à récupérer</p>
          <p className="text-lg font-bold text-gray-800 font-mono mt-1">{formatTND(s.amountInRecovery)}</p>
          <div className="text-[10px] text-emerald-600 font-mono mt-2 flex items-center justify-between font-bold">
            <span>Récupéré à ce jour :</span>
            <span>{formatTND(s.amountRecovered)}</span>
          </div>
        </div>

        {/* Promises tracking */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-mono font-bold text-gray-400 font-bold text-amber-600">Promesses de paye</p>
          <p className="text-lg font-bold text-gray-800 font-mono mt-1">{s.pendingPromises} <span className="text-[11px] font-normal text-gray-400">en attente</span></p>
          <div className="text-[10px] text-red-500 font-mono mt-2 flex items-center justify-between font-bold">
            <span>Promesses Rompues :</span>
            <span>{s.brokenPromises}</span>
          </div>
        </div>

        {/* Activities and bottlenecks */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-mono font-bold text-gray-400 font-bold text-red-500">Goulots opérationnels</p>
          <p className="text-lg font-bold text-red-600 font-mono mt-1">{s.overdueActions} <span className="text-[11px] font-normal text-gray-400">en retard</span></p>
          <div className="text-[10px] text-gray-400 font-mono mt-2 flex items-center justify-between">
            <span>Orphelins (Sans Action) :</span>
            <span className="font-bold text-gray-700">{s.noNextAction}</span>
          </div>
        </div>

        {/* Field visits */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[10px] uppercase font-mono font-bold text-gray-400">Visites terrain</p>
          <p className="text-lg font-bold text-emerald-700 font-mono mt-1">{s.fieldVisitsDone} / {s.fieldVisitsPlanned}</p>
          <div className="text-[10px] text-emerald-600 font-mono mt-2 flex items-center justify-between font-bold">
            <span>Taux de réalisation :</span>
            <span>{s.fieldVisitsPlanned > 0 ? ((s.fieldVisitsDone / s.fieldVisitsPlanned) * 100).toFixed(0) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Recoveries graphs framework */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly curves Target vs Achieved */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono mb-4">
              Cibles budgétaires vs Encaissements amiables accomplis (TND)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.monthlyRecoveryTrend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => formatTND(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name="Objectif Mensuel" dataKey="target" fill="#9ca3af" opacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar name="Encaissé Effectif" dataKey="achieved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visits Outcomes share Pie */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono mb-4">
              Retombées des Descentes de Terrain
            </h3>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.visitOutcomes || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(charts.visitOutcomes || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={SHIELD_COLORS[index % SHIELD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-3 text-[11px]">
              {(charts.visitOutcomes || []).map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SHIELD_COLORS[index % SHIELD_COLORS.length] }}></span>
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-bold text-gray-800 font-mono">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Dossier Table and AI Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Table representation */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Portefeuille amiable sous surveillance</h3>
                <p className="text-[10px] font-mono text-gray-500">Liste exhaustive des expositions amiables</p>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-50 rounded-full text-amber-700">Dossiers actifs ({tableData.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 font-mono uppercase">
                    <th className="pb-2">Dossier</th>
                    <th className="pb-2 text-center">Tireur</th>
                    <th className="pb-2 text-right">Créance brute</th>
                    <th className="pb-2 text-right">Reste à payer</th>
                    <th className="pb-2 text-center">Retard</th>
                    <th className="pb-2 text-right">Prochaine action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400 font-mono">Aucun dossier trouvé sous ces filtres.</td>
                    </tr>
                  ) : (
                    tableData.map((d) => {
                      const bp = d.hasBrokenPromise;
                      return (
                        <tr key={d.id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-semibold text-gray-800 max-w-[130px] truncate">
                            {d.name}
                            <span className="block text-[9px] text-gray-400 font-mono uppercase">{d.code}</span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-700 font-bold rounded">
                              {d.portfolio}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-gray-600">
                            {formatTND(d.amount)}
                          </td>
                          <td className="py-3 text-right font-bold text-gray-900 font-mono">
                            {formatTND(d.amount - d.recovered)}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                              d.status === 'recovered' ? 'bg-emerald-50 text-emerald-700' :
                              d.delayDays > 60 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {d.status === 'recovered' ? 'Soldé' : `${d.delayDays}j`}
                            </span>
                          </td>
                          <td className="py-3 text-right text-gray-500 font-medium">
                            {d.nextAction}
                            {bp && (
                              <span className="block text-[9px] text-red-500 font-mono font-bold">
                                Promesse rompue!
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Action Script Console */}
        <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 text-white p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-400 rounded-md">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight">Optimiseur Tactique</h4>
                  <p className="text-[9px] font-mono text-gray-400">Gemini Soft-Collection Module</p>
                </div>
              </div>
              <button
                onClick={handleRunAiAnalysis}
                disabled={analyzing}
                className="px-2.5 py-1 text-[10px] font-bold text-gray-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-gray-500 transition-colors rounded-md"
              >
                {analyzing ? 'Analyse...' : 'Tracer'}
              </button>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-lg p-3.5 h-[280px] overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-300">
              {analyzing ? (
                <div className="space-y-1.5 text-emerald-400">
                  <p className="animate-pulse">&gt; Analyse des promesses rompues...</p>
                  <p className="delay-100 animate-pulse">&gt; Ordonnancement des plans de relance SMS...</p>
                  <p className="delay-200 animate-pulse">&gt; Chargement du script d'appels coercitif...</p>
                </div>
              ) : aiAdvice ? (
                <div className="space-y-3 font-sans text-gray-200 leading-normal">
                  {aiAdvice.split('\n').map((line, index) => {
                    if (line.startsWith('###')) {
                      return <h4 key={index} className="text-emerald-400 font-bold text-[13px] mt-3 border-b border-white/5 pb-1">{line.replace('###', '')}</h4>;
                    }
                    if (line.startsWith('####')) {
                      return <h5 key={index} className="text-emerald-300 font-semibold text-xs mt-2">{line.replace('####', '')}</h5>;
                    }
                    if (line.startsWith('* ')) {
                      return <li key={index} className="ml-3 list-disc text-gray-300">{line.replace('* ', '')}</li>;
                    }
                    return <p key={index} className="text-xs text-gray-300 leading-relaxed">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-1">
                  <PhoneCall size={18} className="text-gray-600 mb-1" />
                  <span>Calcul d'ordonnancement d'appels et d'automatisation.</span>
                  <span className="text-[9px] text-emerald-400/50">Cliquez sur "Tracer" pour synthétiser un plan d'action.</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[9px] text-gray-500 font-mono mt-4">
            <span className="flex items-center gap-1"><ShieldCheck size={9} /> Conforme RGPD & BCT</span>
            <span>v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
