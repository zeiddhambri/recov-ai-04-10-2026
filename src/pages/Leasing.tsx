import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import {
  Plus, Search, Download, ChevronRight, AlertCircle, Calendar,
  TrendingUp, Wallet, Clock, Activity, FileX, ShieldAlert, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  leasingContracts, STATUS_CONFIG, ASSET_TYPE_CONFIG, NOTIFICATION_CONFIG,
  totalOverdue, overdueCount, daysOverdue, nextInstallment,
  type LeasingStatus, type AssetType,
} from '@/lib/leasing-mock';

const fmtTND = (n: number) => `${(n / 1000).toFixed(0)}k TND`;
const fmtFull = (n: number) => `${n.toLocaleString('fr-FR')} TND`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

const PIE_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#64748b'];

export default function Leasing() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeasingStatus | 'all'>('all');
  const [assetFilter, setAssetFilter] = useState<AssetType | 'all'>('all');

  // ─── KPI computations ───
  const stats = useMemo(() => {
    const active = leasingContracts.filter(c => c.status === 'active');
    const byAsset = active.reduce<Record<string, number>>((acc, c) => {
      acc[c.asset.type] = (acc[c.asset.type] || 0) + 1;
      return acc;
    }, {});
    const totalRemaining = leasingContracts.reduce((s, c) => s + c.financials.remainingCapital, 0);
    const allOverdueCount = leasingContracts.reduce((s, c) => s + overdueCount(c), 0);
    const allOverdueAmount = leasingContracts.reduce((s, c) => s + totalOverdue(c), 0);
    const criticalOverdue = leasingContracts.some(c => daysOverdue(c) > 60);

    // recovery rate = total collected / total expected (across all due installments)
    let collected = 0, expected = 0;
    const now = new Date();
    leasingContracts.forEach(c => {
      c.installments.forEach(i => {
        if (new Date(i.dueDate) <= now) {
          expected += i.amount;
          collected += i.paidAmount;
        }
      });
    });
    const recRate = expected === 0 ? 0 : Math.round((collected / expected) * 100);

    const terminations = leasingContracts.filter(c => c.status === 'early_termination');
    const indemnityTotal = terminations.reduce((s, c) => s + (c.termination?.indemnityAmount || 0), 0);

    return {
      activeCount: active.length, byAsset, totalRemaining,
      allOverdueCount, allOverdueAmount, criticalOverdue,
      recRate, terminationCount: terminations.length, indemnityTotal,
    };
  }, []);

  const filtered = useMemo(() => {
    return leasingContracts.filter(c => {
      const q = search.toLowerCase();
      const ok = !q || c.id.toLowerCase().includes(q) || c.lessee.name.toLowerCase().includes(q);
      const okStatus = statusFilter === 'all' || c.status === statusFilter;
      const okAsset = assetFilter === 'all' || c.asset.type === assetFilter;
      return ok && okStatus && okAsset;
    });
  }, [search, statusFilter, assetFilter]);

  // Right widgets data
  const upcoming = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now); in30.setDate(now.getDate() + 30);
    const list: { contractId: string; lessee: string; date: string; amount: number }[] = [];
    leasingContracts.forEach(c => {
      c.installments.forEach(i => {
        const d = new Date(i.dueDate);
        if (i.status === 'pending' && d >= now && d <= in30) {
          list.push({ contractId: c.id, lessee: c.lessee.name, date: i.dueDate, amount: i.amount });
        }
      });
    });
    return list.sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 6);
  }, []);

  const assetPie = useMemo(() => {
    const counts: Record<string, number> = {};
    leasingContracts.forEach(c => { counts[c.asset.type] = (counts[c.asset.type] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: ASSET_TYPE_CONFIG[k as AssetType].label, value: v, key: k }));
  }, []);

  const criticalAlerts = useMemo(() => {
    const out: { contractId: string; lessee: string; type: string; message: string; severity: string }[] = [];
    leasingContracts.forEach(c => {
      c.notifications.filter(n => n.severity === 'critical').forEach(n => {
        out.push({ contractId: c.id, lessee: c.lessee.name, type: n.type, message: n.message, severity: n.severity });
      });
    });
    return out.slice(0, 5);
  }, []);

  const exportCsv = () => {
    const header = ['Contrat', 'Preneur', 'Bien', 'Statut', 'Capital restant', 'Loyer', 'Retard (j)', 'Score', 'Agent'];
    const rows = filtered.map(c => [
      c.id, c.lessee.name, ASSET_TYPE_CONFIG[c.asset.type].label,
      STATUS_CONFIG[c.status].label, c.financials.remainingCapital, c.financials.monthlyRent,
      daysOverdue(c), c.riskScore, c.agent,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leasing_portfolio.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">Portefeuille Leasing</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestion des contrats de crédit-bail.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/leasing/import" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-sm font-bold shadow-sm hover:opacity-90 transition">
            <Sparkles size={16} /> Import IA
          </Link>
          <Link to="/leasing/new" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold shadow-sm hover:bg-teal-700 transition">
            <Plus size={16} /> Nouveau contrat
          </Link>
        </div>
      </div>

      {/* 5 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Active */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Contrats actifs</p>
            <Activity size={16} className="text-teal-600" />
          </div>
          <p className="text-3xl font-serif-display text-[hsl(var(--charcoal))] mt-2">{stats.activeCount}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(stats.byAsset).map(([k, v]) => {
              const cfg = ASSET_TYPE_CONFIG[k as AssetType];
              const Icon = cfg.icon;
              return (
                <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold">
                  <Icon size={10} /> {v}
                </span>
              );
            })}
          </div>
        </div>

        {/* 2. Outstanding */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Encours total</p>
            <Wallet size={16} className="text-teal-600" />
          </div>
          <p className="text-3xl font-serif-display text-[hsl(var(--charcoal))] mt-2">{fmtTND(stats.totalRemaining)}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{fmtFull(stats.totalRemaining)}</p>
        </div>

        {/* 3. Overdue */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Loyers en retard</p>
            <Clock size={16} className={stats.criticalOverdue ? 'text-red-600' : 'text-amber-600'} />
          </div>
          <motion.p
            key={stats.allOverdueCount}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-serif-display text-[hsl(var(--charcoal))] mt-2"
          >
            {stats.allOverdueCount}
          </motion.p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[11px] text-muted-foreground">{fmtTND(stats.allOverdueAmount)}</p>
            {stats.criticalOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">
                <AlertCircle size={10} /> &gt; 60j
              </span>
            )}
          </div>
        </div>

        {/* 4. Recovery rate (radial) */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Taux recouvrement</p>
            <TrendingUp size={16} className="text-teal-600" />
          </div>
          <div className="flex-1 flex items-center justify-center -mt-2 -mb-2">
            <ResponsiveContainer width="100%" height={90}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ value: stats.recRate, fill: stats.recRate >= 80 ? '#0d9488' : stats.recRate >= 60 ? '#f59e0b' : '#ef4444' }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={10} isAnimationActive />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-2xl font-serif-display text-[hsl(var(--charcoal))] -mt-12 pointer-events-none">{stats.recRate}%</p>
        </div>

        {/* 5. Terminations */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Résiliations</p>
            <FileX size={16} className="text-rose-600" />
          </div>
          <p className="text-3xl font-serif-display text-[hsl(var(--charcoal))] mt-2">{stats.terminationCount}</p>
          <p className="text-[11px] text-muted-foreground mt-2">Indemnités : {fmtTND(stats.indemnityTotal)}</p>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — Contracts table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Contrat, preneur…"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeasingStatus | 'all')}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border-0 focus:outline-none cursor-pointer">
              <option value="all">Tous statuts</option>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
            <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value as AssetType | 'all')}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border-0 focus:outline-none cursor-pointer">
              <option value="all">Tous biens</option>
              {Object.entries(ASSET_TYPE_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
            </select>
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition">
              <Download size={13} /> CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left py-3 px-4">Contrat</th>
                  <th className="text-left px-2">Bien</th>
                  <th className="text-left px-2">Statut</th>
                  <th className="text-right px-2">Capital restant</th>
                  <th className="text-right px-2">Loyer</th>
                  <th className="text-left px-2">Retard</th>
                  <th className="text-left px-2">Score</th>
                  <th className="text-right px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cfg = STATUS_CONFIG[c.status];
                  const assetCfg = ASSET_TYPE_CONFIG[c.asset.type];
                  const AssetIcon = assetCfg.icon;
                  const lateDays = daysOverdue(c);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition">
                      <td className="py-3 px-4">
                        <Link to={`/leasing/${c.id}`} className="text-teal-700 font-bold hover:underline block">{c.id}</Link>
                        <span className="text-[11px] text-muted-foreground">{c.lessee.name}</span>
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <AssetIcon size={13} className="text-teal-600" />
                          <span className="text-[hsl(var(--charcoal))] font-medium">{c.asset.brand || assetCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-2">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap", cfg.bg, cfg.color)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, c.status === 'recovery' || c.status === 'litigation' ? 'animate-pulse' : '')} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-2 text-right font-bold tabular-nums">{fmtTND(c.financials.remainingCapital)}</td>
                      <td className="px-2 text-right tabular-nums text-muted-foreground text-xs">{fmtTND(c.financials.monthlyRent)}</td>
                      <td className="px-2">
                        {lateDays > 0 ? (
                          <span className={cn("text-xs font-bold", lateDays > 60 ? "text-red-600" : lateDays > 30 ? "text-orange-600" : "text-amber-600")}>
                            {lateDays}j
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${c.riskScore}%` }} transition={{ duration: 0.8 }}
                              className={cn("h-full rounded-full", c.riskScore > 70 ? "bg-red-500" : c.riskScore > 40 ? "bg-amber-500" : "bg-teal-500")}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{c.riskScore}</span>
                        </div>
                      </td>
                      <td className="px-4 text-right">
                        <Link to={`/leasing/${c.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--charcoal))] hover:text-teal-700 transition">
                          Ouvrir <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Aucun contrat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — Widgets */}
        <div className="space-y-5">
          {/* Upcoming installments */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[hsl(var(--charcoal))] flex items-center gap-1.5"><Calendar size={14} className="text-teal-600" /> Échéances 30j</h3>
              <span className="text-[11px] font-bold text-muted-foreground">{upcoming.length}</span>
            </div>
            <div className="space-y-2">
              {upcoming.map((u, i) => (
                <Link key={i} to={`/leasing/${u.contractId}`} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-secondary/50 transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[hsl(var(--charcoal))] truncate">{u.lessee}</p>
                    <p className="text-muted-foreground text-[10px]">{fmtDate(u.date)}</p>
                  </div>
                  <span className="text-teal-700 font-bold tabular-nums">{fmtTND(u.amount)}</span>
                </Link>
              ))}
              {upcoming.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucune échéance.</p>}
            </div>
          </div>

          {/* Asset distribution */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold text-[hsl(var(--charcoal))] mb-2">Répartition par actif</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={assetPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} isAnimationActive>
                  {assetPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {assetPie.map((d, i) => (
                <span key={d.key} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name} · {d.value}
                </span>
              ))}
            </div>
          </div>

          {/* Critical alerts */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold text-[hsl(var(--charcoal))] mb-3 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-red-600 animate-pulse" /> Alertes prioritaires
            </h3>
            <div className="space-y-2">
              {criticalAlerts.map((a, i) => (
                <Link key={i} to={`/leasing/${a.contractId}`} className="block p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold uppercase text-red-700">{NOTIFICATION_CONFIG[a.type as keyof typeof NOTIFICATION_CONFIG]?.label || a.type}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[9px] font-bold">LEASING</span>
                  </div>
                  <p className="text-xs font-semibold text-[hsl(var(--charcoal))] truncate">{a.lessee}</p>
                  <p className="text-[10px] text-muted-foreground">{a.message}</p>
                </Link>
              ))}
              {criticalAlerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucune alerte critique.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
