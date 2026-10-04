import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, BarChart3, AlertCircle, Sparkles, HelpCircle, HardDrive, 
  CheckCircle2, AlertOctagon, Scale, ShieldAlert, Cpu, Download, FileSpreadsheet, Play, MailCheck,
  FolderTree, Layers, FolderPlus
} from 'lucide-react';
import { PilotageFilters } from '@/components/pilotage/PilotageFilters';
import { HierarchicalPortfolioExplorer } from '@/components/pilotage/HierarchicalPortfolioExplorer';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useToast } from '@/components/ui/use-toast';

// Color Palette for Charts
const PORTFOLIO_COLORS = ['#10b981', '#3b82f6', '#f59e0b']; // emerald-500, blue-500, amber-500
const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TableauDeBordGlobal() {
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
  const [criticalItems, setCriticalItems] = useState<any[]>([]);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchDashboardData = async (currentFilters: any) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.keys(currentFilters).forEach(key => {
        if (currentFilters[key]) {
          queryParams.append(key, currentFilters[key]);
        }
      });

      const [resSummary, resCharts, resCritical] = await Promise.all([
        fetch(`/api/pilotage/tableau-de-bord-global/summary?${queryParams.toString()}`),
        fetch(`/api/pilotage/tableau-de-bord-global/charts?${queryParams.toString()}`),
        fetch(`/api/pilotage/tableau-de-bord-global/critical-items?${queryParams.toString()}`)
      ]);

      if (!resSummary.ok || !resCharts.ok || !resCritical.ok) {
        throw new Error('Erreur de chargement des données de pilotage');
      }

      const summaryData = await resSummary.json();
      const chartsData = await resCharts.json();
      const criticalData = await resCritical.json();

      setSummary(summaryData);
      setCharts(chartsData);
      const itemsList = Array.isArray(criticalData) 
        ? criticalData 
        : (Array.isArray(criticalData?.items) ? criticalData.items : []);
      setCriticalItems(itemsList);
    } catch (err: any) {
      toast({
        title: "Erreur de synchronisation",
        description: err.message || "Impossible de joindre l'API de consolidation.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(filters);
  }, [filters]);

  const runAiAudit = async () => {
    if (!summary) return;
    setAnalyzing(true);
    setAiAnalysis('');
    try {
      const response = await fetch('/api/pilotage/tableau-de-bord-global/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, filters })
      });
      if (!response.ok) throw new Error("Échec de l'audit IA");
      const data = await response.json();
      setAiAnalysis(data.result || "Aucun résultat généré.");
      toast({
        title: "Audit IA Terminé",
        description: "L'analyse prédictive consolidée est disponible.",
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

  const handleSelectTaxonomyLevel = (levels: {
    portfolioL1?: string;
    categoryL2?: string;
    subCategoryL3?: string;
    productL4?: string;
  }) => {
    const targetSelection = levels.productL4 || levels.subCategoryL3 || levels.categoryL2 || levels.portfolioL1 || 'All';
    const updated = {
      ...filters,
      ...levels,
      portfolio: targetSelection,
    };
    setFilters(updated);
    toast({
      title: "Filtre Portefeuille Appliqué",
      description: `Niveau sélectionné : ${targetSelection}`,
    });
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/pilotage/rapports/export?format=${format}`);
      if (!response.ok) throw new Error("Échec de l'exportation");
      const data = await response.json();
      toast({
        title: `Export de synthèse prêt (${format.toUpperCase()})`,
        description: data.message || "Le fichier a été dirigé vers vos téléchargements.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'exportation",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Helper formatting values in Tunisian Dinars
  const formatTND = (val: number) => {
    if (!val && val !== 0) return '-';
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(val);
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="text-xs text-gray-400 font-mono">Consolidation multisectorielle en cours...</p>
      </div>
    );
  }

  // Fallback structures if mock calculations fail
  const pKPI = summary?.portfolio || { outstanding: 0, overdue: 0, recovered: 0, overdueRate: 0, recoveryRate: 0, totalExposures: 0, overdueExposures: 0, criticalExposures: 0, par30: 0 };
  const rKPI = summary?.recovery || { totalCases: 0, inProgressCases: 0, amountInRecovery: 0, amountRecovered: 0, overdueActions: 0, brokenPromises: 0, fieldVisitsPlanned: 0 };
  const lKPI = summary?.litigation || { totalCases: 0, totalClaimAmount: 0, totalRecoveredAmount: 0, feesEngaged: 0, overdueActionsCount: 0, totalGuaranteesValue: 0 };
  const aKPI = summary?.automation || { sentToday: 0, successRate: 0, activeWorkflows: 0, errors: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="tableau-de-bord-global-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tableau de bord global</h1>
          <p className="text-xs text-gray-500 font-mono">Supervision multi-portefeuilles consolidée en temps réel | RecovAI</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/litigation?tab=nouveaux-dossiers"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            id="btn-nouveaux-dossiers-dashboard"
          >
            <FolderPlus size={13} />
            Nouveaux dossiers
          </Link>
          <button 
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all"
            id="btn-export-excel"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            Synthèse Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            id="btn-export-pdf"
          >
            <Download size={13} />
            Synthèse PDF
          </button>
        </div>
      </div>

      {/* Shared Consolidation Filters */}
      <PilotageFilters onFilter={(updatedFilters) => setFilters(updatedFilters)} />

      {/* Main Grid: 4 Top KPI Cards mapped precisely to User request */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Portefeuilles Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-emerald-200 transition-colors"
          id="kpi-card-portefeuilles"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">Portefeuilles financier</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase font-mono">Encours total sous gestion</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{formatTND(pKPI.outstanding)}</h2>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 text-xs">
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Taux de retard</p>
              <p className="font-semibold text-amber-600 font-mono mt-0.5">{pKPI.overdueRate}%</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Taux d'apurement</p>
              <p className="font-semibold text-emerald-600 font-mono mt-0.5">{pKPI.recoveryRate}%</p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Expositions totales :</span>
            <span className="font-bold font-mono text-gray-700">{pKPI.totalExposures}</span>
          </div>
        </motion.div>

        {/* 2. Recouvrement (Amiable) Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 transition-colors"
          id="kpi-card-recouvrement"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md mb-0.5">Recouvrement Amiable</span>
            <BarChart3 size={16} className="text-blue-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase font-mono">Volume en recouvrement</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{formatTND(rKPI.amountInRecovery)}</h2>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 text-xs">
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Apurement amiable</p>
              <p className="font-semibold text-emerald-600 font-mono mt-0.5">{formatTND(rKPI.amountRecovered)}</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Actions en retard</p>
              <p className="font-semibold text-red-500 font-mono mt-0.5">{rKPI.overdueActions}</p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Visites d'agents :</span>
            <span className="font-bold font-mono text-gray-700">{rKPI.fieldVisitsPlanned}</span>
          </div>
        </motion.div>

        {/* 3. Contentieux (Judiciaire) Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 transition-colors"
          id="kpi-card-contentieux"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">Contentieux Judiciaire</span>
            <Scale size={16} className="text-purple-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase font-mono">Montant réclamé (Tribunaux)</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{formatTND(lKPI.totalClaimAmount)}</h2>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 text-xs">
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Frais de justice engagés</p>
              <p className="font-semibold text-purple-600 font-mono mt-0.5">{formatTND(lKPI.feesEngaged)}</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Garanties couvertes</p>
              <p className="font-semibold text-emerald-600 font-mono mt-0.5">{formatTND(lKPI.totalGuaranteesValue)}</p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Procès en retard :</span>
            <span className="font-bold font-mono text-red-500">{lKPI.overdueActionsCount}</span>
          </div>
        </motion.div>

        {/* 4. Automatisation Relances Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-amber-200 transition-colors"
          id="kpi-card-automatisation"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">Moteur Automatisation</span>
            <Cpu size={16} className="text-amber-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase font-mono">Relances envoyées aujourd'hui</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{aKPI.sentToday} relances</h2>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 text-xs">
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Taux d'Aboutissement</p>
              <p className="font-semibold text-emerald-600 font-mono mt-0.5">{aKPI.successRate}%</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono text-[10px]">Scénarios Actifs</p>
              <p className="font-semibold text-gray-800 font-mono mt-0.5">{aKPI.activeWorkflows}</p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Erreurs d'envois :</span>
            <span className="font-bold font-mono text-amber-600">{aKPI.errors}</span>
          </div>
        </motion.div>
      </div>

      {/* 4-Level Hierarchical Portfolio Architecture Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <HierarchicalPortfolioExplorer
          selectedPortfolioL1={filters.portfolioL1}
          selectedCategoryL2={filters.categoryL2}
          selectedSubCategoryL3={filters.subCategoryL3}
          selectedProductL4={filters.productL4}
          onSelectLevel={handleSelectTaxonomyLevel}
        />
      </motion.div>

      {/* Interactive Recharts Section */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend lines Area chart */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
              Évolution mensuelle des encours et recouvrements (TND)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyTrend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => formatTND(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" name="Encours total" dataKey="outstanding" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutstanding)" strokeWidth={2} />
                  <Area type="monotone" name="Arriérés cumulés" dataKey="overdue" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" name="Encaissements effectifs" dataKey="recovered" stroke="#10b981" fillOpacity={1} fill="url(#colorRecovered)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Allocation by Portefeuille Pie list */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Expositions par division</h3>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.portfolioShare || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(charts.portfolioShare || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatTND(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {(charts.portfolioShare || []).map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length] }}></span>
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-800 font-bold font-mono">{formatTND(entry.value)}</p>
                    <p className="text-[9px] text-red-500 font-mono font-medium">Arriérés: {formatTND(entry.overdue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row grid: Critical exposures & AI audit panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 10 Critical files */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-7">
          <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Dossiers prioritaires haut risque</h3>
              <p className="text-[10px] font-mono text-gray-500">Flux d'urgences prioritaires à élever</p>
            </div>
            <span className="px-2 py-0.5 font-mono text-[10px] font-bold text-red-600 bg-red-50 rounded-full">Top 10 Critique</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 font-mono">
                  <th className="pb-2">Débiteur</th>
                  <th className="pb-2">Division</th>
                  <th className="pb-2 text-right">Encours Restant</th>
                  <th className="pb-2 text-center">Retard</th>
                  <th className="pb-2 text-right">Action requise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {(!Array.isArray(criticalItems) || criticalItems.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400 font-mono">Aucun dossier critique détecté sous ces critères.</td>
                  </tr>
                ) : (
                  criticalItems.map((item, idx) => (
                    <tr key={item.id + idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-semibold text-gray-800 max-w-[150px] truncate">
                        {item.debtorName}
                        <span className="block text-[9px] text-gray-400 font-mono">{item.id}</span>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.origin === 'Contentieux' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {item.origin}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-gray-900 font-mono">
                        {formatTND(item.outstandingAmount)}
                      </td>
                      <td className="py-2.5 text-center font-semibold font-mono text-amber-600">
                        {item.delayDays}j
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-500 max-w-[150px] truncate">
                        {item.nextAction}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Predictor Audit framework */}
        <div className="bg-gradient-to-br from-emerald-950 via-gray-900 to-slate-900 rounded-xl shadow-lg p-6 lg:col-span-5 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Conseiller IA Décisionnel</h3>
                  <p className="text-[9px] font-mono text-emerald-400/80">Modèle analytique Gemini-3.5-flash</p>
                </div>
              </div>
              <button
                onClick={runAiAudit}
                disabled={analyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-gray-950 font-bold rounded-lg text-xs transition-colors shadow-md"
                id="btn-run-ai-audit"
              >
                {analyzing ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-b border-gray-950"></div>
                    Calculs...
                  </>
                ) : (
                  <>
                    <Play size={10} fill="currentColor" />
                    Lancer l'audit
                  </>
                )}
              </button>
            </div>

            {/* Response console area */}
            <div className="bg-black/40 border border-emerald-500/10 rounded-lg p-4 h-[240px] overflow-y-auto text-xs font-mono leading-relaxed text-gray-300">
              {analyzing ? (
                <div className="space-y-2 pt-2 text-emerald-400 font-mono">
                  <p className="animate-pulse">&gt; Initialisation du payload consolidé...</p>
                  <p className="delay-100 animate-pulse">&gt; Indexation des buckets de risque sectoriels MFI/Factoring/Leasing...</p>
                  <p className="delay-200 animate-pulse">&gt; Analyse des garanties collatérales de secours...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-3 font-sans text-gray-200">
                  {aiAnalysis.split('\n').map((line, index) => {
                    if (line.startsWith('###')) {
                      return <h4 key={index} className="text-emerald-400 font-bold text-sm mt-3 border-b border-white/5 pb-1">{line.replace('###', '')}</h4>;
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
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 font-mono gap-1.5">
                  <Sparkles size={24} className="text-gray-600 animate-pulse mb-1" />
                  Prêt à auditer l'exposition.
                  <span className="text-[10px] text-emerald-400/50">Cliquez sur "Lancer l'audit" pour interroger l'IA.</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span>Rapport réglementaire BCT</span>
            <span className="text-emerald-400/60 flex items-center gap-1"><ShieldAlert size={10} /> RecovAI Cognitive Core v3.5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
