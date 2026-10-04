import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { mockDossiers, DossierComplet } from '@/lib/mock-data';
import { ClientClassification, classificationConfig } from '@/lib/scoring';
import { Target, TrendingUp, AlertTriangle, ShieldCheck, Users, ArrowUpDown, Search, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const classificationIcons: Record<ClientClassification, typeof ShieldCheck> = {
  fiable: ShieldCheck,
  a_surveiller: AlertTriangle,
  a_risque: Target,
};

const PIE_COLORS = ['hsl(142, 76%, 36%)', 'hsl(40, 58%, 55%)', 'hsl(0, 84%, 60%)'];

export default function Scoring() {
  const [sortBy, setSortBy] = useState<'score' | 'montant' | 'anciennete'>('score');
  const [filterClass, setFilterClass] = useState<ClientClassification | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(() => {
    let items = [...mockDossiers];
    if (filterClass !== 'all') items = items.filter(d => d.scoringResult.classification === filterClass);
    if (searchQuery) items = items.filter(d =>
      d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.clientCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
    items.sort((a, b) => {
      if (sortBy === 'score') return b.scoringResult.score - a.scoringResult.score;
      if (sortBy === 'montant') return b.amount - a.amount;
      return b.scoring.ancienneteJours - a.scoring.ancienneteJours;
    });
    return items;
  }, [sortBy, filterClass, searchQuery]);

  const stats = useMemo(() => {
    const counts: Record<ClientClassification, number> = { fiable: 0, a_surveiller: 0, a_risque: 0 };
    const totalByClass: Record<ClientClassification, number> = { fiable: 0, a_surveiller: 0, a_risque: 0 };
    mockDossiers.forEach(d => {
      counts[d.scoringResult.classification]++;
      totalByClass[d.scoringResult.classification] += d.amount;
    });
    const avgScore = Math.round(mockDossiers.reduce((s, d) => s + d.scoringResult.score, 0) / mockDossiers.length);
    return { counts, totalByClass, avgScore };
  }, []);

  const pieData = [
    { name: 'Fiable', value: stats.counts.fiable },
    { name: 'À surveiller', value: stats.counts.a_surveiller },
    { name: 'À risque', value: stats.counts.a_risque },
  ];

  const barData = [
    { name: 'Fiable', montant: stats.totalByClass.fiable / 1000 },
    { name: 'À surveiller', montant: stats.totalByClass.a_surveiller / 1000 },
    { name: 'À risque', montant: stats.totalByClass.a_risque / 1000 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-navy tracking-tight font-syne">Scoring & Segmentation</h1>
        <p className="text-muted-foreground mt-1">Analyse de risque et classification des clients débiteurs.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="Score moyen" value={`${stats.avgScore}/100`} accent="text-sky" />
        <KpiCard icon={ShieldCheck} label="Clients fiables" value={String(stats.counts.fiable)} accent="text-green-600" />
        <KpiCard icon={AlertTriangle} label="À surveiller" value={String(stats.counts.a_surveiller)} accent="text-gold" />
        <KpiCard icon={Target} label="À risque" value={String(stats.counts.a_risque)} accent="text-destructive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-sm font-bold text-navy mb-4">Répartition par classification</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-muted-foreground">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-sm font-bold text-navy mb-4">Montant exposé par segment (K TND)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)} K TND`} />
              <Bar dataKey="montant" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Rechercher un client..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'fiable', 'a_surveiller', 'a_risque'] as const).map(c => (
            <button key={c} onClick={() => setFilterClass(c)}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all",
                filterClass === c ? "bg-navy text-white" : "bg-card border border-border text-muted-foreground hover:bg-mist")}>
              {c === 'all' ? 'Tous' : classificationConfig[c].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['score', 'montant', 'anciennete'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                sortBy === s ? "bg-sky text-white" : "bg-card border border-border text-muted-foreground hover:bg-mist")}>
              <ArrowUpDown size={12} />
              {s === 'score' ? 'Score' : s === 'montant' ? 'Montant' : 'Ancienneté'}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((d, i) => (
          <ClientScoringCard key={d.id} dossier={d} index={i} />
        ))}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: typeof Target; label: string; value: string; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", accent === 'text-sky' ? 'bg-sky/10' : accent === 'text-green-600' ? 'bg-green-50' : accent === 'text-gold' ? 'bg-gold/10' : 'bg-destructive/10')}>
        <Icon size={22} className={accent} />
      </div>
      <div>
        <p className="text-2xl font-black text-navy font-syne">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

function ClientScoringCard({ dossier, index }: { dossier: DossierComplet; index: number }) {
  const { scoringResult } = dossier;
  const config = classificationConfig[scoringResult.classification];
  const Icon = classificationIcons[scoringResult.classification];

  const radarData = [
    { axis: 'Montant', value: scoringResult.details.scoreMontant },
    { axis: 'Ancienneté', value: scoringResult.details.scoreAnciennete },
    { axis: 'Historique', value: scoringResult.details.scoreHistorique },
    { axis: 'Réactivité', value: scoringResult.details.scoreReactivite },
    { axis: 'Typologie', value: scoringResult.details.scoreTypologie },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm text-navy">{dossier.debtorName}</p>
          <p className="text-xs text-muted-foreground font-mono">{dossier.clientCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold px-3 py-1 rounded-full", config.bgClass, config.colorClass)}>
            <Icon size={12} className="inline mr-1" />
            {config.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-14 h-14">
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={scoringResult.score >= 70 ? 'hsl(0, 84%, 60%)' : scoringResult.score >= 40 ? 'hsl(40, 58%, 55%)' : 'hsl(142, 76%, 36%)'}
              strokeWidth="3" strokeDasharray={`${scoringResult.score}, 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-navy">{scoringResult.score}</span>
        </div>
        <div className="flex-1 text-xs space-y-1 text-muted-foreground">
          <p><span className="font-medium text-navy">Montant:</span> {dossier.amount.toLocaleString()} TND</p>
          <p><span className="font-medium text-navy">Ancienneté:</span> {dossier.scoring.ancienneteJours}j</p>
          <p><span className="font-medium text-navy">Agent:</span> {dossier.agent}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
          <Radar dataKey="value" stroke="hsl(var(--sky))" fill="hsl(var(--sky))" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-muted-foreground mt-2 italic">{scoringResult.recommandation}</p>
    </motion.div>
  );
}
