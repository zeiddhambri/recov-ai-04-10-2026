import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceDot, LineChart,
  BarChart, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie,
} from 'recharts';
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Target, Download, Calendar,
  Users, Filter, FileText, Mail, ChevronDown, Award, AlertCircle, X, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  kpis, cashFlowData, cashFlowSummary, recoveryByAgent, channelEffectiveness,
  agentPerformance, funnelData, agingHeatmap, agingBuckets, AGENTS,
} from '@/lib/analytics-mock';
import AnalyticsContentieux from '@/components/analytics/AnalyticsContentieux';

const fmtTND = (v: number) => `${(v / 1000).toFixed(0)}k TND`;
const fmtTNDfull = (v: number) => `${v.toLocaleString('fr-FR')} TND`;

type DatePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function Analytics() {
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'recouvrement';

  // ─── Global filters ───────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [comparison, setComparison] = useState<'period' | 'year'>('period');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ risk: string; bucket: string } | null>(null);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAiAnalysis(
        "📊 Synthèse IA du portefeuille\n\n• Le taux de recouvrement progresse de +4.6 pts vs trimestre précédent (32.4%)\n• Leila M. surperforme : 35.8% de recouvrement vs 28% benchmark sectoriel\n• Risque concentré sur la cellule Critique × > 180j (encours estimé : 1.2M TND)\n• Le canal WhatsApp affiche le meilleur ROI : 47.4% de réponse pour un coût marginal\n• Recommandation : réallouer 15% du budget SMS vers WhatsApp + escalade téléphonique sur les 38 dossiers Critiques > 90j",
      );
      setIsAnalyzing(false);
    }, 1500);
  };

  if (currentTab === 'contentieux') {
    return <AnalyticsContentieux />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── STICKY TOP BAR : GLOBAL FILTERS ─── */}
      <div className="sticky top-0 z-30 -mx-8 px-8 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary rounded-full p-1">
            {(['week', 'month', 'quarter', 'year', 'custom'] as DatePreset[]).map(p => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                  datePreset === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {{ week: 'Semaine', month: 'Mois', quarter: 'Trimestre', year: 'Année', custom: 'Personnalisé' }[p]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium">
            <Users size={14} className="text-muted-foreground" />
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les agents</option>
              {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-secondary rounded-full p-1 ml-auto">
            <button
              onClick={() => setComparison('period')}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", comparison === 'period' ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              vs période préc.
            </button>
            <button
              onClick={() => setComparison('year')}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", comparison === 'year' ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              vs N-1
            </button>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[hsl(var(--charcoal))] to-[hsl(var(--cobalt))] text-white shadow-sm hover:shadow-md transition"
          >
            {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
            Analyse IA
          </button>

          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[hsl(var(--crimson))] text-white shadow-sm hover:shadow-md transition"
          >
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* ─── HEADER ─── */}
      <div>
        <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">Analyses & Intelligence</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pilotage avancé du recouvrement — vision unifiée portefeuille, agents et trésorerie.</p>
      </div>

      {/* ─── AI ANALYSIS PANEL ─── */}
      <AnimatePresence>
        {aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-br from-[hsl(var(--charcoal))] to-[hsl(var(--cobalt))] rounded-2xl p-6 text-white overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain size={20} className="text-[hsl(var(--crimson))]" />
                <h3 className="text-base font-semibold">Synthèse intelligente</h3>
              </div>
              <button onClick={() => setAiAnalysis(null)} className="text-white/60 hover:text-white"><X size={16} /></button>
            </div>
            <pre className="text-sm text-white/85 whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════ SECTION 1 — KPI TICKER ═════════ */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(kpis).map(([key, kpi], i) => {
            const delta = ((kpi.value - kpi.prevValue) / kpi.prevValue) * 100;
            const isInverse = key === 'dso' || key === 'resolution';
            const isPositive = isInverse ? delta < 0 : delta > 0;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-2xl p-5 border border-border shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <motion.span
                    key={kpi.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-serif-display text-[hsl(var(--charcoal))]"
                  >
                    {kpi.value}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-semibold mt-2", isPositive ? "text-emerald-600" : "text-[hsl(var(--crimson))]")}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(delta).toFixed(1)}% {comparison === 'period' ? 'vs période préc.' : 'vs N-1'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═════════ SECTION 2 — CASH FLOW FORECAST ═════════ */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-serif-display text-[hsl(var(--charcoal))]">Prévision de trésorerie · 90 jours</h2>
            <p className="text-xs text-muted-foreground mt-1">Encaissements confirmés vs attendus, basés sur les promesses de paiement et le taux historique de recouvrement par niveau de risque.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[hsl(var(--cobalt))]" />Confirmés</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t border-dashed border-[hsl(var(--cobalt))]" />Attendus</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-muted" />Dû</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={cashFlowData} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="uncertainty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220, 60%, 55%)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(220, 60%, 55%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtTND} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
              formatter={(v: number, name: string) => [fmtTNDfull(v), name]}
            />
            <Bar dataKey="due" fill="hsl(var(--muted))" name="Dû" barSize={6} />
            <Area type="monotone" dataKey="uncertaintyHigh" stroke="none" fill="url(#uncertainty)" name="Plage incertitude" isAnimationActive animationDuration={900} />
            <Line type="monotone" dataKey="confirmed" stroke="hsl(var(--cobalt))" strokeWidth={2.5} dot={false} name="Confirmés" isAnimationActive animationDuration={1100} />
            <Line type="monotone" dataKey="expected" stroke="hsl(220, 60%, 55%)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Attendus" isAnimationActive animationDuration={1300} />
            <ReferenceLine x={cashFlowData.find(d => d.isToday)?.date} stroke="hsl(var(--crimson))" strokeDasharray="4 4" label={{ value: "Aujourd'hui", position: 'top', fill: 'hsl(var(--crimson))', fontSize: 11, fontWeight: 600 }} />
            {cashFlowData.filter(d => d.annotation).map(d => (
              <ReferenceDot key={d.date} x={d.date} y={d.expected} r={5} fill="hsl(var(--crimson))" stroke="white" strokeWidth={2}>
              </ReferenceDot>
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Confirmé · 30 jours', value: 1245000, color: 'text-cobalt', icon: Check },
            { label: 'Attendu · 30 jours', value: 1820000, color: 'text-foreground', icon: TrendingUp },
            { label: 'À risque · 90 jours', value: 4350000, color: 'text-[hsl(var(--crimson))]', icon: AlertCircle },
          ].map((c) => (
            <div key={c.label} className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-card flex items-center justify-center", c.color)}>
                <c.icon size={18} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="text-lg font-serif-display text-[hsl(var(--charcoal))]">{fmtTNDfull(c.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════ SECTION 3 — Two columns ═════════ */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3a Recovery rate by agent */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))] mb-1">Taux de recouvrement · 12 mois</h3>
          <p className="text-xs text-muted-foreground mb-4">Performance individuelle vs benchmark secteur bancaire (28%).</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recoveryByAgent} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
              {AGENTS.map((a, i) => (
                <Line key={a} type="monotone" dataKey={a} stroke={`hsl(${200 + i * 25}, 55%, 50%)`} strokeWidth={1.5} dot={false} isAnimationActive animationDuration={900 + i * 100} />
              ))}
              <Line type="monotone" dataKey="Moyenne" stroke="hsl(var(--charcoal))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Benchmark" stroke="hsl(var(--crimson))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3b Channel effectiveness */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))] mb-1">Efficacité par canal</h3>
          <p className="text-xs text-muted-foreground mb-4">Taux de réponse mesuré sur les 30 derniers jours, classé par performance.</p>
          <div className="space-y-3">
            {channelEffectiveness.map((c, i) => (
              <motion.div
                key={c.channel}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[hsl(var(--charcoal))]">{c.channel}</span>
                    <span className="text-muted-foreground">{c.sent.toLocaleString('fr-FR')} envoyés</span>
                  </div>
                  <span className="font-bold text-[hsl(var(--charcoal))]">{c.rate.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.rate}%` }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, hsl(${220 - i * 15}, 60%, 50%), hsl(${220 - i * 15}, 60%, 60%))` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{c.success.toLocaleString('fr-FR')} succès</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ SECTION 4 — Agent performance table ═════════ */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))]">Performance équipe</h3>
            <p className="text-xs text-muted-foreground mt-1">Classement et tendance individuelle sur 12 mois.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2.5 pr-4">Agent</th>
                <th className="text-right px-2">Dossiers</th>
                <th className="text-right px-2">Encours</th>
                <th className="text-right px-2">Recouvré</th>
                <th className="text-right px-2">Taux</th>
                <th className="text-right px-2">Actions</th>
                <th className="text-right px-2">Réponse moy.</th>
                <th className="text-right pl-2">Tendance 12m</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map((a) => (
                <tr key={a.agent} className="border-b border-border last:border-0 hover:bg-secondary/30 transition">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[hsl(var(--charcoal))]">{a.agent}</span>
                      {a.top && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Award size={10} /> Top</span>}
                      {a.improvement && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700"><AlertCircle size={10} /> À soutenir</span>}
                    </div>
                  </td>
                  <td className="text-right px-2 text-muted-foreground">{a.assigned}</td>
                  <td className="text-right px-2 font-medium">{fmtTND(a.totalManaged)}</td>
                  <td className="text-right px-2 font-medium">{fmtTND(a.recovered)}</td>
                  <td className="text-right px-2">
                    <span className={cn("font-bold", a.recoveryRate >= 30 ? "text-emerald-600" : a.recoveryRate >= 25 ? "text-[hsl(var(--charcoal))]" : "text-[hsl(var(--crimson))]")}>
                      {a.recoveryRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right px-2 text-muted-foreground">{a.actions.toLocaleString('fr-FR')}</td>
                  <td className="text-right px-2 text-muted-foreground">{a.avgResponse}j</td>
                  <td className="pl-2 text-right">
                    <Sparkline data={a.sparkline} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═════════ SECTION 5 — Resolution funnel ═════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))] mb-1">Funnel de résolution</h3>
          <p className="text-xs text-muted-foreground mb-4">Conversion étape par étape du cycle de recouvrement.</p>
          <div className="space-y-2">
            {funnelData.map((f, i) => {
              const pct = (f.value / funnelData[0].value) * 100;
              const dropOff = i > 0 ? ((funnelData[i - 1].value - f.value) / funnelData[i - 1].value) * 100 : 0;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[hsl(var(--charcoal))]">{f.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{f.value.toLocaleString('fr-FR')}</span>
                        <span className="font-bold text-[hsl(var(--charcoal))] tabular-nums w-12 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="relative h-9 bg-secondary rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                        className="h-full rounded-lg flex items-center px-3"
                        style={{ backgroundColor: f.fill }}
                      />
                    </div>
                    {i > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        Drop-off : <span className="text-[hsl(var(--crimson))] font-semibold">-{dropOff.toFixed(1)}%</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aging heatmap */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))] mb-1">Aging × Risque</h3>
          <p className="text-xs text-muted-foreground mb-4">Encours croisé par tranche d'antériorité et niveau de risque. Cliquez sur une cellule pour explorer.</p>
          <HeatmapTable selected={selectedCell} onSelect={setSelectedCell} />
          {selectedCell && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 rounded-lg bg-secondary/60 text-xs flex items-center justify-between">
              <span>Sélection : <strong>{selectedCell.risk}</strong> × <strong>{selectedCell.bucket}</strong></span>
              <button className="text-[hsl(var(--crimson))] font-semibold">Voir dossiers →</button>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── REPORT MODAL ─── */}
      <AnimatePresence>
        {reportModalOpen && <ReportModal onClose={() => setReportModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SPARKLINE COMPONENT
// ═════════════════════════════════════════════════════════
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 80},${24 - ((v - min) / range) * 22}`).join(' ');
  const trend = data[data.length - 1] - data[0];
  const color = trend >= 0 ? 'hsl(150, 60%, 40%)' : 'hsl(354, 87%, 44%)';
  return (
    <svg width="80" height="24" className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy={24 - ((data[data.length - 1] - min) / range) * 22} r="2" fill={color} />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════
// HEATMAP COMPONENT
// ═════════════════════════════════════════════════════════
function HeatmapTable({ selected, onSelect }: { selected: { risk: string; bucket: string } | null; onSelect: (s: { risk: string; bucket: string } | null) => void }) {
  const allAmounts = agingHeatmap.flatMap(r => r.cells.map(c => c.amount));
  const max = Math.max(...allAmounts);
  const total = allAmounts.reduce((s, v) => s + v, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th></th>
            {agingBuckets.map(b => (
              <th key={b} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agingHeatmap.map(row => (
            <tr key={row.risk}>
              <td className="text-[11px] font-semibold text-[hsl(var(--charcoal))] pr-2 whitespace-nowrap">{row.risk}</td>
              {row.cells.map(cell => {
                const intensity = cell.amount / max;
                const isSelected = selected?.risk === row.risk && selected?.bucket === cell.bucket;
                return (
                  <td key={cell.bucket} className="p-0">
                    <button
                      onClick={() => onSelect(isSelected ? null : { risk: row.risk, bucket: cell.bucket })}
                      title={`${cell.amount.toLocaleString('fr-FR')} TND · ${cell.count} dossiers · ${((cell.amount / total) * 100).toFixed(1)}%`}
                      className={cn(
                        "w-full h-14 rounded-md flex flex-col items-center justify-center text-[10px] font-bold transition-all",
                        isSelected && "ring-2 ring-[hsl(var(--crimson))] ring-offset-1",
                      )}
                      style={{
                        backgroundColor: `hsl(354, 87%, ${Math.max(96 - intensity * 50, 46)}%)`,
                        color: intensity > 0.5 ? 'white' : 'hsl(220, 25%, 18%)',
                      }}
                    >
                      <span>{(cell.amount / 1000).toFixed(0)}k</span>
                      <span className="font-normal opacity-75">{cell.count}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// REPORT MODAL
// ═════════════════════════════════════════════════════════
function ReportModal({ onClose }: { onClose: () => void }) {
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'custom'>('monthly');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'pptx'>('pdf');
  const [schedule, setSchedule] = useState<'once' | 'monthly'>('once');
  const [recipients, setRecipients] = useState<string[]>(['direction@bank.tn']);
  const [newRecipient, setNewRecipient] = useState('');
  const [sections, setSections] = useState({
    kpi: true, cashflow: true, recovery: true, channel: true, agents: true, funnel: true, aging: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[hsl(var(--charcoal))]/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[hsl(var(--crimson))]" />
            <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))]">Générer un rapport</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type de rapport</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(['monthly', 'quarterly', 'custom'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={cn("p-3 rounded-xl border text-sm font-semibold transition", reportType === t ? "border-[hsl(var(--crimson))] bg-[hsl(var(--crimson))]/5 text-[hsl(var(--crimson))]" : "border-border text-muted-foreground hover:border-[hsl(var(--charcoal))]")}
                >
                  {{ monthly: 'Mensuel', quarterly: 'Trimestriel', custom: 'Personnalisé' }[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sections incluses</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries({ kpi: 'KPIs', cashflow: 'Trésorerie', recovery: 'Recouvrement', channel: 'Canaux', agents: 'Équipe', funnel: 'Funnel', aging: 'Aging' }).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 p-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary/40 text-sm">
                  <input
                    type="checkbox"
                    checked={sections[k as keyof typeof sections]}
                    onChange={(e) => setSections({ ...sections, [k]: e.target.checked })}
                    className="accent-[hsl(var(--crimson))]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(['pdf', 'excel', 'pptx'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn("p-3 rounded-xl border text-sm font-semibold uppercase transition", format === f ? "border-[hsl(var(--crimson))] bg-[hsl(var(--crimson))]/5 text-[hsl(var(--crimson))]" : "border-border text-muted-foreground hover:border-[hsl(var(--charcoal))]")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinataires</label>
            <div className="flex gap-2 mt-2">
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="email@banque.tn"
                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-[hsl(var(--crimson))]"
              />
              <button
                onClick={() => { if (newRecipient) { setRecipients([...recipients, newRecipient]); setNewRecipient(''); } }}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--charcoal))] text-white text-sm font-semibold"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {recipients.map(r => (
                <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs">
                  <Mail size={11} /> {r}
                  <button onClick={() => setRecipients(recipients.filter(x => x !== r))} className="text-muted-foreground hover:text-[hsl(var(--crimson))]"><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planification</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['once', 'monthly'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSchedule(s)}
                  className={cn("p-3 rounded-xl border text-sm font-semibold transition", schedule === s ? "border-[hsl(var(--crimson))] bg-[hsl(var(--crimson))]/5 text-[hsl(var(--crimson))]" : "border-border text-muted-foreground hover:border-[hsl(var(--charcoal))]")}
                >
                  {s === 'once' ? 'Génération unique' : 'Auto · le 1er du mois'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground">Annuler</button>
          <button className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[hsl(var(--crimson))] text-white text-sm font-bold shadow-sm hover:shadow-md transition">
            <Download size={14} /> Générer le rapport
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
