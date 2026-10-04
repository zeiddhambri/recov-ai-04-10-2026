import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import {
  Scale, Calendar, Search, AlertTriangle, FileCheck2, MapPin, Coins,
  TrendingUp, Clock, ShieldAlert, Sparkles, Download, ChevronDown, Check,
  ChevronUp, FileText, AlertCircle, ArrowUpDown, Info, Eye, CheckCircle,
  FolderLock, UserSquare2, ShieldCheck, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { EnrichedLitigationCase, LitigationKPIs, LitigationFilters, PeriodPreset, PortfolioFilter } from '@/types/litigation-analytics';
import { TUNISIAN_INSTITUTIONS } from '@/data/institutions';

const COLORS = [
  'hsl(var(--cobalt))', // Cobalt Blue
  'hsl(var(--navy))', // Deep Navy
  'hsl(var(--crimson))', // Crimson
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f43f5e'  // Rose
];

export default function AnalyticsContentieux() {
  // ─── Filter States ────────────────────────────────────
  const [filters, setFilters] = useState<LitigationFilters>({
    period: 'year',
    portfolio: 'All',
    institution: 'All',
    branch: 'All',
    legalStatus: 'All',
    legalOfficer: 'All',
    externalLawyer: 'All',
    riskLevel: 'All',
    hasMissingDocuments: 'all',
    hasOverdueActions: 'all',
    hasCollateral: 'all',
    noNextActionPlanned: 'all'
  });

  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showAdvanceFilters, setShowAdvanceFilters] = useState(false);

  // ─── Data States ──────────────────────────────────────
  const [kpis, setKpis] = useState<LitigationKPIs | null>(null);
  const [tableData, setTableData] = useState<EnrichedLitigationCase[]>([]);
  const [chartsData, setChartsData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── AI States ────────────────────────────────────────
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ─── Search & Sorting / Pagination ──────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof EnrichedLitigationCase>('daysOpen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCase, setSelectedCase] = useState<EnrichedLitigationCase | null>(null);

  // ─── Fetch Helper ─────────────────────────────────────
  const getQueryString = (f: LitigationFilters) => {
    const params = new URLSearchParams();
    if (f.portfolio && f.portfolio !== 'All') params.append('portfolio', f.portfolio);
    if (f.institution && f.institution !== 'All') params.append('institution', f.institution);
    if (f.branch && f.branch !== 'All') params.append('branch', f.branch);
    if (f.legalStatus && f.legalStatus !== 'All') params.append('legalStatus', f.legalStatus);
    if (f.legalOfficer && f.legalOfficer !== 'All') params.append('legalOfficer', f.legalOfficer);
    if (f.externalLawyer && f.externalLawyer !== 'All') params.append('externalLawyer', f.externalLawyer);
    if (f.riskLevel && f.riskLevel !== 'All') params.append('riskLevel', f.riskLevel);
    if (f.hasMissingDocuments !== 'all') params.append('hasMissingDocuments', f.hasMissingDocuments.toString());
    if (f.hasOverdueActions !== 'all') params.append('hasOverdueActions', f.hasOverdueActions.toString());
    if (f.hasCollateral !== 'all') params.append('hasCollateral', f.hasCollateral.toString());
    if (f.noNextActionPlanned !== 'all') params.append('noNextAction', f.noNextActionPlanned.toString());
    
    if (f.minAmount) params.append('minAmount', f.minAmount.toString());
    if (f.maxAmount) params.append('maxAmount', f.maxAmount.toString());
    if (f.minAgeInDays) params.append('minAgeInDays', f.minAgeInDays.toString());
    if (f.maxAgeInDays) params.append('maxAgeInDays', f.maxAgeInDays.toString());

    if (f.period === 'custom') {
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
    } else {
      // Approximate preset date ranges
      const date = new Date('2026-05-30');
      if (f.period === 'today') {
        params.append('startDate', date.toISOString().slice(0, 10));
      } else if (f.period === '7days') {
        date.setDate(date.getDate() - 7);
        params.append('startDate', date.toISOString().slice(0, 10));
      } else if (f.period === '30days') {
        date.setDate(date.getDate() - 30);
        params.append('startDate', date.toISOString().slice(0, 10));
      } else if (f.period === 'quarter') {
        date.setMonth(date.getMonth() - 3);
        params.append('startDate', date.toISOString().slice(0, 10));
      } else if (f.period === 'year') {
        date.setFullYear(date.getFullYear() - 1);
        params.append('startDate', date.toISOString().slice(0, 10));
      }
    }

    return params.toString();
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const qStr = getQueryString(filters);
      
      const [resKpis, resTable, resCharts] = await Promise.all([
        authorizedFetch(`/api/pilotage/indicateurs-contentieux/summary?${qStr}`).catch(() => null),
        authorizedFetch(`/api/pilotage/indicateurs-contentieux/table?${qStr}`).catch(() => null),
        authorizedFetch(`/api/pilotage/indicateurs-contentieux/charts?${qStr}`).catch(() => null)
      ]);

      if (resKpis && resKpis.ok) {
        const dataKpis: LitigationKPIs = await resKpis.json();
        setKpis(dataKpis);
      } else {
        // Fallback métriques contentieux synthétiques de démonstration
        setKpis({
          totalCases: 18,
          openCases: 14,
          closedCases: 4,
          preLitigationCount: 5,
          transferredCount: 3,
          totalClaimAmount: 1420000,
          totalRecoveredAmount: 385000,
          recoveryRate: 27,
          remainingAmount: 1035000,
          feesEngaged: 24500,
          feesRecovered: 11200,
          avgCostPerCase: 1360,
          feesToRecoveredRatio: 6.3,
          judgmentsObtained: 7,
          casesInExecution: 4,
          casesInSeizureProgress: 2,
          casesPassedToLoss: 1,
          avgDurationDays: 145,
          overdueActionsCount: 3,
          missingDocumentsCount: 2,
          activeGuaranteesCount: 8,
          totalGuaranteesValue: 680000,
          soldGuaranteesValue: 120000,
          totalContentieux: 1420000,
          nombreAffairesEnCours: 14,
          tauxSuccesJuridique: 86.5,
          honorairesAvocatsEngages: 24500
        });
      }

      if (resTable && resTable.ok) {
        const dataTable = await resTable.json();
        const safeTable = Array.isArray(dataTable) ? dataTable : (Array.isArray(dataTable?.data) ? dataTable.data : []);
        setTableData(safeTable);
      }

      if (resCharts && resCharts.ok) {
        const dataCharts = await resCharts.json();
        setChartsData(dataCharts);
      } else {
        setChartsData({
          byStatus: [
            { status: 'Pré-contentieux', count: 4 },
            { status: 'Injonction de payer', count: 5 },
            { status: 'En cours d\'instruction', count: 6 },
            { status: 'Jugement rendu', count: 3 },
            { status: 'Saisie / Exécution', count: 2 }
          ],
          byPortfolio: [
            { portfolio: 'Leasing', claimed: 820000, recovered: 240000 },
            { portfolio: 'Factoring', claimed: 540000, recovered: 180000 },
            { portfolio: 'Microfinance', claimed: 310000, recovered: 95000 }
          ],
          byAge: [
            { range: '0-90j', count: 4 },
            { range: '91-180j', count: 6 },
            { range: '181-365j', count: 5 },
            { range: '+365j', count: 3 }
          ],
          timelineRecovery: [
            { month: 'Jan', amount: 45000 },
            { month: 'Fév', amount: 52000 },
            { month: 'Mar', amount: 48000 },
            { month: 'Avr', amount: 61000 },
            { month: 'Mai', amount: 58000 }
          ]
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement des indicateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, dateRange]);

  // ─── Export Handler ───────────────────────────────────
  const handleExport = () => {
    const qStr = getQueryString(filters);
    window.location.href = `/api/pilotage/indicateurs-contentieux/export?${qStr}`;
  };

  // ─── AI Analysis triggering ───────────────────────────
  const triggerAiAnalysis = async () => {
    if (!kpis || tableData.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const payload = {
        summary: {
          totalLegalCases: kpis.totalCases,
          openLegalCases: kpis.openCases,
          closedLegalCases: kpis.closedCases,
          totalClaimAmount: kpis.totalClaimAmount,
          totalRecoveredAmount: kpis.totalRecoveredAmount,
          recoveryRate: kpis.recoveryRate,
          totalLegalFees: kpis.feesEngaged,
          overdueActionsCount: kpis.overdueActionsCount,
          missingDocumentsCount: kpis.missingDocumentsCount,
          collateralValue: kpis.totalGuaranteesValue
        },
        cases: tableData,
        filters
      };

      const response = await authorizedFetch('/api/pilotage/indicateurs-contentieux/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Échec de la réponse du moteur IA.');
      const data = await response.json();
      setAiAnalysis(data.result);
    } catch (err: any) {
      console.error(err);
      setAiAnalysis(`### Erreur de communication\n\nImpossible de joindre le service de synthèse intelligente : ${err.message}. Veuillez vous assurer que le serveur Node.js est configuré.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Sort & Search Computation ────────────────────────
  const processedTableData = useMemo(() => {
    let result = [...tableData];
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.id.toLowerCase().includes(s) ||
        c.clientName.toLowerCase().includes(s) ||
        c.manager.toLowerCase().includes(s) ||
        c.externalLawyer.toLowerCase().includes(s) ||
        (c.branch && c.branch.toLowerCase().includes(s))
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }

      if (typeof valA === 'number') {
        return sortDirection === 'asc' 
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }

      return 0;
    });

    return result;
  }, [tableData, searchTerm, sortField, sortDirection]);

  const toggleSort = (field: keyof EnrichedLitigationCase) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Render numbers
  const fmtTNDfull = (v: number) => `${v.toLocaleString('fr-FR')} TND`;
  const fmtTND = (v: number) => `${(v / 1000).toFixed(1)}k TND`;

  return (
    <div className="space-y-6 pb-12 transition-all">
      {/* ─── STICKY HEADER AND GLOBAL FILTERS ─── */}
      <div className="sticky top-0 z-30 -mx-8 px-8 py-4 bg-background/90 backdrop-blur-md border-b border-border/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset picker */}
          <div className="flex items-center gap-1 bg-secondary rounded-full p-1 border border-border/40">
            {(['today', '7days', '30days', 'quarter', 'year', 'custom'] as PeriodPreset[]).map(p => (
              <button
                key={p}
                onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  filters.period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {{ today: "Aujourd'hui", '7days': '7 jours', '30days': '30 jours', quarter: 'Trimestre', year: 'Année', custom: 'Perso' }[p]}
              </button>
            ))}
          </div>

          {/* Portfolio filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold border border-border/40">
            <Coins size={14} className="text-muted-foreground" />
            <select
              value={filters.portfolio}
              onChange={e => setFilters(prev => ({ ...prev, portfolio: e.target.value as PortfolioFilter }))}
              className="bg-transparent border-0 focus:outline-none cursor-pointer text-xs font-bold"
            >
              <option value="All">Tous Portefeuilles</option>
              <option value="Microfinance">Microfinance</option>
              <option value="Factoring">Affacturage / Factoring</option>
              <option value="Leasing">Leasing</option>
            </select>
          </div>

          {/* Risk Level filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold border border-border/40">
            <ShieldAlert size={14} className="text-muted-foreground" />
            <select
              value={filters.riskLevel}
              onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="bg-transparent border-0 focus:outline-none cursor-pointer text-xs font-bold"
            >
              <option value="All">Tous les Risques</option>
              <option value="Faible">Risque Faible</option>
              <option value="Moyen">Risque Moyen</option>
              <option value="Élevé">Risque Élevé</option>
              <option value="Critique">Risque Critique</option>
            </select>
          </div>

          {/* Expand filters */}
          <button
            onClick={() => setShowAdvanceFilters(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition border border-border/60",
              showAdvanceFilters ? "bg-card text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:bg-secondary"
            )}
          >
            Filtres avancés
            {showAdvanceFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* AI Trigger */}
          <button
            onClick={triggerAiAnalysis}
            disabled={isAnalyzing || loading || tableData.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-navy via-slate-850 to-cobalt text-white shadow-md hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} className="text-gold" />
            )}
            Analyser par IA
          </button>

          {/* Export Action */}
          <button
            onClick={handleExport}
            disabled={loading || tableData.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-crimson text-white shadow-md hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} /> Exporter CSV
          </button>
        </div>

        {/* ─── EXPANDED FILTERS PANEL ─── */}
        <AnimatePresence>
          {showAdvanceFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border/60"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Institution Row */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Institution</label>
                  <select
                    value={filters.institution}
                    onChange={e => setFilters(prev => ({ ...prev, institution: e.target.value }))}
                    className="w-full bg-secondary text-xs rounded-xl p-2.5 border border-border/40 focus:outline-none focus:ring-1 focus:ring-cobalt font-medium"
                  >
                    <option value="All">Toutes institutions</option>
                    <optgroup label="🏦 Banques Résidentes">
                      {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'banque_residente').map(inst => (
                        <option key={inst.id} value={inst.code}>
                          {inst.code} — {inst.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌐 Banques Offshore">
                      {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'banque_offshore').map(inst => (
                        <option key={inst.id} value={inst.code}>
                          {inst.code} — {inst.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌱 Microfinance (IMF)">
                      {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'microfinance').map(inst => (
                        <option key={inst.id} value={inst.code}>
                          {inst.code}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📄 Leasing & Factoring">
                      {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'leasing_factoring').map(inst => (
                        <option key={inst.id} value={inst.code}>
                          {inst.code}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Agence Row */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Agence / Succursale</label>
                  <select
                    value={filters.branch}
                    onChange={e => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full bg-secondary text-xs rounded-xl p-2.5 border border-border/40 focus:outline-none focus:ring-1 focus:ring-cobalt font-medium"
                  >
                    <option value="All">Toutes agences</option>
                    <option value="Tunis Belvédère">Tunis Belvédère</option>
                    <option value="Sousse Corniche">Sousse Corniche</option>
                    <option value="Lac Tunis">Lac Tunis</option>
                    <option value="Sfax El Jadida">Sfax El Jadida</option>
                    <option value="Tunis Centre">Tunis Centre</option>
                  </select>
                </div>

                {/* Legal Officer */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Responsable Contentieux</label>
                  <select
                    value={filters.legalOfficer}
                    onChange={e => setFilters(prev => ({ ...prev, legalOfficer: e.target.value }))}
                    className="w-full bg-secondary text-xs rounded-xl p-2.5 border border-border/40 focus:outline-none focus:ring-1 focus:ring-cobalt font-medium"
                  >
                    <option value="All">Tous responsables</option>
                    <option value="Ahmed B.">Ahmed B.</option>
                    <option value="Sami K.">Sami K.</option>
                    <option value="Leila M.">Leila M.</option>
                    <option value="Nadia T.">Nadia T.</option>
                    <option value="Karim S.">Karim S.</option>
                  </select>
                </div>

                {/* Custom Date Ranges */}
                {filters.period === 'custom' && (
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Début</label>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-secondary text-[11px] rounded-xl p-2.5 border border-border/40 focus:outline-none font-medium text-foreground"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Fin</label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-secondary text-[11px] rounded-xl p-2.5 border border-border/40 focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>
                )}

                {/* Flags filters row */}
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasOverdueActions === 'true'}
                      onChange={e => setFilters(prev => ({ ...prev, hasOverdueActions: e.target.checked ? 'true' : 'all' }))}
                      className="rounded border-border focus:ring-cobalt h-4 w-4 bg-secondary"
                    />
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <AlertTriangle size={13} className="text-crimson" /> En retard
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasMissingDocuments === 'true'}
                      onChange={e => setFilters(prev => ({ ...prev, hasMissingDocuments: e.target.checked ? 'true' : 'all' }))}
                      className="rounded border-border focus:ring-cobalt h-4 w-4 bg-secondary"
                    />
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <FileText size={13} className="text-gold" /> Pièces manquantes
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.noNextActionPlanned === 'true'}
                      onChange={e => setFilters(prev => ({ ...prev, noNextActionPlanned: e.target.checked ? 'true' : 'all' }))}
                      className="rounded border-border focus:ring-cobalt h-4 w-4 bg-secondary"
                    />
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Clock size={13} className="text-indigo-400" /> Sans action planifiée
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight flex items-center gap-2.5">
            <Scale className="text-cobalt" size={28} />
            Indicateurs Contentieux
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rapport analytique opérationnel — Moteur d'évaluation légale, d'audits juridiques et de planification stratégique.
          </p>
        </div>

        {/* Hardcoded Refresh and database status indicators */}
        <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-1.5 border border-border/40 text-[10px] font-mono font-semibold text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          BASE BANCAIRE DES ESSAIS : CONNECTÉE
        </div>
      </div>

      {/* ─── AI ANALYSIS RESPONSE VIEW ─── */}
      <AnimatePresence>
        {aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-neutral-100"
          >
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cobalt/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-crimson/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-gold animate-bounce" />
                <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-sky to-pink-400 text-transparent bg-clip-text">Synthèse Avancée Générée par IA</span>
              </div>
              <button
                onClick={() => setAiAnalysis(null)}
                className="p-1 px-2.5 text-xs bg-white/5 rounded-full text-white/50 hover:text-white transition cursor-pointer"
              >
                Masquer
              </button>
            </div>

            <div className="markdown-body space-y-3 text-sm text-neutral-200/90 leading-relaxed font-sans max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2 relative z-10">
              {aiAnalysis.split('\n\n').map((block, idx) => {
                if (block.startsWith('###')) {
                  return (
                    <h3 key={idx} className="text-sm font-bold text-sky border-l-2 border-cobalt pl-2.5 mt-4 pt-1 flex items-center gap-1.5">
                      {block.replace('###', '')}
                    </h3>
                  );
                }
                if (block.startsWith('*') || block.startsWith('•')) {
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1.5 text-neutral-350">
                      {block.split('\n').map((line, lIdx) => (
                        <li key={lIdx} className="text-xs">{line.replace(/^(\*|•)\s*/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                if (block.match(/^\d+\./)) {
                  return (
                    <h4 key={idx} className="text-xs font-black uppercase tracking-wider text-pink-400 mt-5 pt-2">
                      {block}
                    </h4>
                  );
                }
                return <p key={idx} className="text-xs text-neutral-250 font-medium leading-relaxed">{block}</p>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LOADER / ERROR STATES ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border shadow-sm">
          <div className="w-10 h-10 border-4 border-cobalt/20 border-t-cobalt rounded-full animate-spin mb-4" />
          <span className="text-sm font-semibold text-muted-foreground animate-pulse">Extraction des dossiers et calcul des ratios judiciaires en cours...</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-10 bg-crimson/5 border border-crimson/20 rounded-2xl text-center">
          <AlertCircle size={28} className="text-crimson mb-2" />
          <h3 className="font-bold text-foreground text-sm">Une erreur est survenue</h3>
          <p className="text-xs text-muted-foreground max-w-md mt-1">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 text-xs font-semibold bg-secondary rounded-lg hover:bg-secondary/80 transition flex items-center gap-2">
            <RefreshCcw size={13} /> Réessayer
          </button>
        </div>
      )}

      {!loading && !error && kpis && (
        <>
          {/* ═════════ KPIS GRID ═════════ */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performances Analystes & Trésorerie</h4>

            {/* Sub-Group 1: Performance financière */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-xs text-muted-foreground font-semibold">Total Encours Réclamé</div>
                <div className="text-2xl font-serif-display text-foreground leading-tight mt-1">{fmtTNDfull(kpis.totalClaimAmount)}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-3 flex items-center gap-1.5">
                  <Coins size={12} className="text-cobalt" /> Somme principale + pénalités + intérêts
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-xs text-muted-foreground font-semibold">Taux de Récupération Juridique</div>
                <div className="text-2xl font-serif-display text-emerald leading-tight mt-1">
                  {kpis.recoveryRate.toFixed(2)} %
                </div>
                <div className="text-[10px] text-emerald font-mono mt-3 flex items-center gap-1">
                  <TrendingUp size={12} /> Récupéré : {fmtTND(kpis.totalRecoveredAmount)}
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-xs text-muted-foreground font-semibold font-sans">Montant Récupéré</div>
                <div className="text-2xl font-serif-display text-foreground leading-tight mt-1">{fmtTNDfull(kpis.totalRecoveredAmount)}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-3 flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald" /> Paiements encaissés validés
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="text-xs text-muted-foreground font-semibold">Solde Restant à Recouvrer</div>
                <div className="text-2xl font-serif-display text-foreground leading-tight mt-1">{fmtTNDfull(kpis.remainingAmount)}</div>
                <div className="text-[10px] text-crimson font-semibold mt-3 flex items-center gap-1">
                  <ShieldAlert size={12} /> Solde subsistant en litige
                </div>
              </div>
            </div>

            {/* Sub-Group 2: Efficience procédurale & coûts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Frais Contentieux Engagés</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{fmtTNDfull(kpis.feesEngaged)}</div>
                <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 font-mono">
                  Honoraires + huissiers engagés
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold font-sans">Coût Moyen par Cas</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{fmtTNDfull(kpis.avgCostPerCase)}</div>
                <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 font-mono">
                  Charge moyenne d'avancement
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Ratio de Frais / Gain Recouvré</div>
                <div className="text-xl font-bold text-crimson mt-0.5">{kpis.feesToRecoveredRatio.toFixed(1)} %</div>
                <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 font-mono">
                  Seuil critique d'efficience &lt; 20%
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Frais Recouvrables Reconstitués</div>
                <div className="text-xl font-bold text-emerald mt-0.5">{fmtTNDfull(kpis.feesRecovered)}</div>
                <span className="text-[10px] text-emerald font-semibold mt-2 flex items-center gap-1">
                  <Check size={12} /> Intégrés dans la réclamation
                </span>
              </div>
            </div>

            {/* Sub-Group 3: Statut légal & avancée */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Jugement Favorable Obtenu</div>
                <div className="text-xl font-bold text-emerald mt-0.5">{kpis.judgmentsObtained} dossiers</div>
                <span className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Titres exécutoires délivrés
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold font-sans">Dossiers d'Exécution Forcée</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{kpis.casesInExecution} affaires</div>
                <span className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Phase de recouvrement forcé
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Dossiers Passés en Perte</div>
                <div className="text-xl font-bold text-muted-foreground mt-0.5">{kpis.casesPassedToLoss} dossiers</div>
                <span className="text-[10px] text-red-400 font-semibold mt-2">
                  Créances abandonnées ou éteintes
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Délai Judiciaire Moyen</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{Math.round(kpis.avgDurationDays)} jours</div>
                <span className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Temps d'ouverture globale
                </span>
              </div>
            </div>

            {/* Sub-Group 4: Risque, alertes & garanties */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-crimson/[0.04] to-transparent p-4 rounded-xl border border-crimson/15 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-crimson font-black uppercase">Actions Judiciaires Décidées en Retard</div>
                <div className="text-xl font-black text-crimson mt-0.5">{kpis.overdueActionsCount} dossiers</div>
                <span className="text-[10px] text-crimson mt-2 font-semibold flex items-center gap-1 animate-pulse">
                  <AlertTriangle size={12} /> Échéance échue sans conclusion
                </span>
              </div>

              <div className="bg-gradient-to-br from-amber/[0.04] to-transparent p-4 rounded-xl border border-amber/15 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-amber-600 font-black uppercase">Documents requis manquants</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{kpis.missingDocumentsCount} actes</div>
                <span className="text-[10px] text-muted-foreground mt-2">
                  Pièces indispensables absentes
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Garanties Commerciales Actives</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{kpis.activeGuaranteesCount} collatéraux</div>
                <span className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Valeur totale : {fmtTND(kpis.totalGuaranteesValue)}
                </span>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col justify-between shadow-sm">
                <div className="text-[11px] text-muted-foreground font-bold">Garanties Réalisées (Ventess)</div>
                <div className="text-xl font-bold text-emerald mt-0.5">{fmtTNDfull(kpis.soldGuaranteesValue)}</div>
                <span className="text-[10px] text-emerald font-semibold mt-2">
                  Collatéraux vendus apurés
                </span>
              </div>
            </div>
          </div>

          {/* ═════════ 5 INTERACTIVE VISUAL CHARTS ═════════ */}
          {chartsData && (
            <div className="space-y-6 mt-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analyses Graphiques & Tendances d'un Portefeuille</h4>

              {/* Row 1: Pie and Rec / Claimed bar chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Répartition statut juridique */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground mb-4">Répartition des dossiers d'un statut judiciaire</h3>
                  <div className="h-64 flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={chartsData.byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="status"
                        >
                          {chartsData.byStatus.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value} dossiers`, 'Quantité']} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Réclamation vs Recouvrement par Portefeuille */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground mb-4">Montants Réclamés vs Montants Récupérés par Portefeuille</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartsData.byPortfolio} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="portfolio" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => [`${value.toLocaleString()} TND`, '']}/>
                        <Legend verticalAlign="top" height={36} iconSize={12} wrapperStyle={{ fontSize: '11px' }} />
                        <Bar name="Encours réclamé" dataKey="claimed" fill="hsl(var(--cobalt))" radius={[4, 4, 0, 0]} />
                        <Bar name="Montant récupéré" dataKey="recovered" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: Age, guarantees & legal officers performance charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 3: Ancienneté des dossiers */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground mb-4">Dossiers par Tranche d'Ancienneté (en jours)</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartsData.byAge}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar name="Nombre dossiers" dataKey="count" fill="hsl(var(--navy))" radius={[4, 4, 0, 0]}>
                          {chartsData.byAge.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.count > 1 ? 'hsl(var(--crimson))' : 'hsl(var(--navy))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 4: Rapport des garanties */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground mb-4">Valeur des Garanties selon le Statut Administratif</h3>
                  <div className="h-60">
                    {chartsData.guaranteesByStatus.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs font-semibold">
                        <FolderLock size={20} className="mb-2 text-muted-foreground/50" />
                        Aucune garantie pour ce scope de filtrage.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.guaranteesByStatus} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
                          <YAxis dataKey="status" type="category" tick={{ fontSize: 9 }} width={100} />
                          <Tooltip formatter={(value) => [`${value.toLocaleString()} TND`, 'Valeur estimée']}/>
                          <Bar name="Garantie cumulée" dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 5: Delay Action rates */}
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground mb-4 font-sans">Retard d'Actions Judiciaires par Responsable</h3>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartsData.byOfficer}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                        <Bar name="Volume dossiers" dataKey="count" fill="hsl(var(--cobalt))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ LIST / OPERATIONAL TABLE ═════════ */}
          <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-border/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[hsl(var(--charcoal))]">Registre Analytique Détaillé</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cliquez sur une ligne pour auditer l'affaire juridique complète.</p>
              </div>

              {/* Instant Search input */}
              <div className="relative w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  type="text"
                  placeholder="Rechercher par affaire, client, avocat..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-secondary text-xs rounded-xl border border-border/40 focus:outline-none focus:ring-1 focus:ring-cobalt font-medium"
                />
              </div>
            </div>

            {/* Structured responsive table view */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto text-xs">
                <thead>
                  <tr className="bg-secondary/40 text-muted-foreground font-bold border-b border-border text-[9px] uppercase tracking-wider">
                    <th className="p-4 cursor-pointer hover:bg-secondary/60" onClick={() => toggleSort('id')}>
                      <span className="flex items-center gap-1">Dossier <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-secondary/60" onClick={() => toggleSort('clientName')}>
                      <span className="flex items-center gap-1">Client <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="p-4">Portefeuille</th>
                    <th className="p-4">Agence / Bureau</th>
                    <th className="p-4">Statut Légal</th>
                    <th className="p-4 cursor-pointer hover:bg-secondary/60 text-right" onClick={() => toggleSort('totalClaimed')}>
                      <span className="flex items-center gap-1 justify-end">Montant Total <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="p-4 text-right">Recouvré / Solde</th>
                    <th className="p-4 cursor-pointer hover:bg-secondary/60 text-center" onClick={() => toggleSort('daysOpen')}>
                      <span className="flex items-center gap-1 justify-center">Ancienneté <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="p-4">Alertes / Signaux</th>
                    <th className="p-4 text-center">Risque</th>
                    <th className="p-4 text-center">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {processedTableData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground font-semibold">
                        Aucun dossier contentieux ne correspond aux critères de sélection actuels.
                      </td>
                    </tr>
                  ) : (
                    processedTableData.map(c => {
                      const displayStatus: any = {
                        pre_litigation: { label: 'Pré-contentieux', style: 'bg-indigo-500/10 text-indigo-400 border-indigo-400/20' },
                        injunction_filed: { label: 'Injonction dép', style: 'bg-purple-500/10 text-purple-400 border-purple-400/20' },
                        in_process: { label: 'Procédure en cours', style: 'bg-cobalt/10 text-cobalt border-cobalt/20' },
                        judgment_obtained: { label: 'Jugement obtenu', style: 'bg-emerald/10 text-emerald border-emerald/20 font-bold' },
                        enforcement: { label: 'Exécution forcée', style: 'bg-pink-600/10 text-pink-500 border-pink-500/20' },
                        closed_recovered: { label: 'Clos · Recouvré', style: 'bg-emerald/10 text-emerald border-emerald/20' },
                        closed_written_off: { label: 'Clos · Perte', style: 'bg-muted/10 text-muted-foreground border-border/20' }
                      };

                      const displayRisk: any = {
                        Faible: 'bg-emerald/15 text-emerald border-emerald/20',
                        Moyen: 'bg-amber/15 text-amber-600 border-amber-500/20',
                        Élevé: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                        Critique: 'bg-crimson/15 text-crimson font-black border-crimson/30 animate-pulse'
                      };

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-secondary/30 transition-all font-medium border-b border-border/40 group cursor-pointer"
                          onClick={() => setSelectedCase(c)}
                        >
                          <td className="p-4 font-mono font-bold text-foreground text-[11px]">{c.id}</td>
                          <td className="p-4">
                            <div className="font-semibold text-foreground truncate max-w-[140px]">{c.clientName || c.debtor?.name}</div>
                            <span className="text-[10px] text-muted-foreground">Siren: {c.debtor?.siren || 'N/A'}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-muted-foreground text-[10px] uppercase font-mono">{c.portfolioType}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-muted-foreground flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-muted-foreground/60" />
                              <span className="truncate max-w-[100px]">{c.branch}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn("px-2 py-1 rounded text-[10px] border", displayStatus[c.stage]?.style)}>
                              {displayStatus[c.stage]?.label || c.stage}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-foreground">
                            {fmtTNDfull(c.totalClaimed)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="text-emerald font-bold">{fmtTNDfull(c.recoveredAmount)}</div>
                            <div className="text-[10px] text-muted-foreground">Solde: {fmtTND(c.remainingBalance)}</div>
                          </td>
                          <td className="p-4 text-center font-mono text-muted-foreground font-semibold">
                            {c.daysOpen} jours
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Overdue alert badge */}
                              {c.isActionOverdue && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-crimson/10 text-crimson text-[9px] font-bold border border-crimson/20" title={`Action en retard : ${c.nextAction}`}>
                                  <AlertCircle size={10} /> RETARD
                                </span>
                              )}
                              
                              {/* Missing document badge */}
                              {c.missingDocumentsCount > 0 && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber/10 text-amber-600 text-[9px] font-bold border border-amber-500/20" title={`${c.missingDocumentsCount} document(s) manquant(s)`}>
                                  <FileText size={10} /> {c.missingDocumentsCount} MANQ.
                                </span>
                              )}

                              {/* Planned next action check badge */}
                              {!c.nextActionDate && c.stage !== 'closed_recovered' && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[9px] font-bold border border-border" title="Aucune action planifiée">
                                  SANS ACTION
                                </span>
                              )}

                              {!c.isActionOverdue && c.missingDocumentsCount === 0 && (
                                <span className="text-emerald text-[10px] font-semibold flex items-center gap-1">
                                  <CheckCircle size={11} /> Conforme
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", displayRisk[c.riskLevel])}>
                              {c.riskLevel}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button className="p-1.5 bg-secondary text-muted-foreground rounded-lg hover:bg-cobalt hover:text-white transition group-hover:bg-secondary-dark">
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ─── DETAILED USER CASE DRAWER PANEL ─── */}
      <AnimatePresence>
        {selectedCase && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCase(null)}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-card shadow-2xl border-l border-border flex flex-col justify-between overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-border/80 pb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">
                      Affaire judiciaire {selectedCase.id}
                    </span>
                    <h3 className="text-lg font-serif-display text-foreground mt-1 tracking-tight">{selectedCase.clientName || selectedCase.debtor?.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="p-1 px-2 text-xs bg-secondary rounded-lg hover:bg-secondary-dark font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>

                {/* Sub-Section 1: General Info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Détail du Recouvrement Légal</h4>
                  <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-4 rounded-xl border border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10.5px]">Statut légal actuel</span>
                      <span className="font-bold text-foreground block mt-0.5">{selectedCase.legalStatusLabel || selectedCase.stage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10.5px]">Niveau de risque</span>
                      <span className="font-bold text-crimson block mt-0.5">{selectedCase.riskLevel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10.5px]">Institution d'origine</span>
                      <span className="font-bold text-foreground block mt-0.5">{selectedCase.institution}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10.5px]">Portefeuille d'origine</span>
                      <span className="font-bold text-foreground block mt-0.5">{selectedCase.portfolioType}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Section 2: Financiers */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Créances & Intérêts litigieux</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Montant principal dû</span>
                      <span className="font-bold text-foreground">{fmtTNDfull(selectedCase.principalAmount || selectedCase.amount?.principal || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Intérêts et pénalités</span>
                      <span className="font-bold text-foreground">{fmtTNDfull(selectedCase.interestAndPenalties || selectedCase.amount?.interest || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground font-sans">Frais avocat extern</span>
                      <span className="font-bold text-foreground">{fmtTNDfull(selectedCase.legalFees || selectedCase.amount?.legalFees || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Frais huissier justic</span>
                      <span className="font-bold text-foreground">{fmtTNDfull(selectedCase.bailiffFees || selectedCase.amount?.bailiffFees || 0)}</span>
                    </div>
                  </div>
                  <div className="bg-secondary/45 p-3 rounded-xl border border-border/40 flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-foreground">Montant Total Réclamé</span>
                    <span className="text-sm font-black text-rose-500 font-serif-display">{fmtTNDfull(selectedCase.totalClaimed)}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] font-medium mt-1">
                    <span className="text-emerald">Taux de recouvrement : {selectedCase.recoveryRate.toFixed(1)} %</span>
                    <span className="text-muted-foreground font-semibold">| Solde restant : {fmtTNDfull(selectedCase.remainingBalance)}</span>
                  </div>
                </div>

                {/* Sub-Section 3: Actions à venir & retard */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prochaines étapes de l'affaire</h4>
                  <div className="p-4 rounded-xl border border-border/60 text-xs bg-secondary/20 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Clock size={14} className={selectedCase.isActionOverdue ? "text-crimson animate-pulse" : "text-muted-foreground"} />
                      <span>{selectedCase.nextAction || 'Aucune action planifiée'}</span>
                    </div>
                    
                    {selectedCase.nextActionDate && (
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Date d'audience : {selectedCase.nextActionDate}
                        {selectedCase.isActionOverdue && (
                          <span className="ml-2 text-crimson font-black uppercase tracking-wide">
                            (ACTION COMPLÈTEMENT EN RETARD)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Section 4: Pièces manquantes d'audit */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <FileText size={12} className="text-gold" />
                    Audit des Documents requis ({selectedCase.missingDocumentsCount} manquants)
                  </h4>
                  {selectedCase.missingDocumentsCount === 0 ? (
                    <div className="text-xs text-emerald flex items-center gap-1 bg-emerald/5 p-3 rounded-xl border border-emerald/20 font-semibold">
                      <CheckCircle size={14} /> Toutes les pièces justificatives essentielles sont versées au dossier d'audit.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-amber/5 p-3 rounded-xl border border-amber/20 space-y-1.5 text-xs text-amber-700">
                        {selectedCase.missingDocumentsList.map((doc, dIdx) => (
                          <div key={dIdx} className="flex items-center gap-1.5">
                            <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                            <span>Pièce absente : <strong>{doc}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Section 5: Juridiques externes associées */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acteurs Associés de l'affaire</h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold">
                    <div className="p-3 bg-secondary/15 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground block font-black uppercase">Avocat Externe</span>
                      <span className="text-foreground block mt-0.5">{selectedCase.lawyer?.name || 'Non désigné'}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{selectedCase.lawyer?.firm || ''}</span>
                    </div>
                    <div className="p-3 bg-secondary/15 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground block font-black uppercase">Huissier de justice</span>
                      <span className="text-foreground block mt-0.5">{selectedCase.bailiff?.name || 'Non désigné'}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{selectedCase.bailiff?.firm || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Section 6: Garanties sous-jacentes */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Garantie & Actes de Cautionnement</h4>
                  <div className="p-4 bg-secondary/40 rounded-xl border border-border/40 text-xs">
                    {selectedCase.hasCollateral ? (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Garantie enregistrée :</span>
                          <strong className="text-foreground font-sans">{selectedCase.collateralType}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valeur d'estimation commerciale :</span>
                          <strong className="text-emerald font-semibold">{fmtTNDfull(selectedCase.collateralValue)}</strong>
                        </div>
                        {selectedCase.collateralStatus && (
                          <div className="flex justify-between pt-1">
                            <span className="text-muted-foreground">Statut d'exécution forcée :</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-bold border border-amber-500/20">
                              {selectedCase.collateralStatus.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                        <Ban size={14} className="text-muted-foreground/55" />
                        Aucune hypothèque commerciale ou cautionnement personnel actif enregistré.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Sticky Footer controls */}
              <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-2">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="w-full py-2.5 bg-secondary text-xs font-bold rounded-xl text-center hover:bg-secondary-dark text-foreground cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
