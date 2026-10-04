import { TrendingUp, Clock, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, BarChart3, Gavel, ShieldCheck, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const cards = [
  { title: 'Encours Total', value: '4,250,000 TND', icon: TrendingUp, color: 'sky', trend: '+12%', trendUp: true },
  { title: 'Dossiers Actifs', value: '186', icon: Clock, color: 'gold', trend: '-2', trendUp: false },
  { title: 'En Litige', value: '42', icon: AlertCircle, color: 'red', trend: '+1', trendUp: true },
  { title: 'Dossiers Clos', value: '78', icon: CheckCircle2, color: 'green', trend: '+5', trendUp: true },
];

const recentDossiers = [
  { name: 'SOCIETE ALPHA SARL', code: 'RCV-2024-001', amount: '145,000', status: 'phase2', date: '2024-03-15' },
  { name: 'BEN SALEM AHMED', code: 'RCV-2024-002', amount: '22,000', status: 'litige', date: '2024-03-14' },
  { name: 'GLOBAL TECH TUNISIE', code: 'RCV-2024-003', amount: '890,000', status: 'phase1', date: '2024-03-13' },
  { name: 'KARIM ENTERPRISES', code: 'RCV-2024-004', amount: '56,000', status: 'clos', date: '2024-03-12' },
  { name: 'MEDITERANEE INVEST', code: 'RCV-2024-005', amount: '320,000', status: 'phase1', date: '2024-03-11' },
];

const upcomingEvents = [
  { title: 'Audience TPI Tunis — Dossier ALPHA', date: '25 Mars 2024', type: 'audience' },
  { title: 'Délai appel jugement Ben Salem', date: '28 Mars 2024', type: 'deadline' },
  { title: 'Visite huissier — Global Tech', date: '1 Avril 2024', type: 'visit' },
];

const statusColors: Record<string, string> = {
  phase1: 'text-sky bg-sky/10',
  phase2: 'text-gold bg-gold/10',
  litige: 'text-red-500 bg-red-50',
  clos: 'text-green-500 bg-green-50',
};

const statusLabels: Record<string, string> = {
  phase1: 'Phase 1',
  phase2: 'Phase 2',
  litige: 'Litige',
  clos: 'Clos',
};

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de votre portefeuille de recouvrement.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/analytics" className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/20">
            <BarChart3 size={14} />
            Analyses IA
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card p-6 rounded-3xl shadow-sm border border-border hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                card.color === 'sky' && "bg-sky/10 text-sky",
                card.color === 'gold' && "bg-gold/10 text-gold",
                card.color === 'red' && "bg-red-50 text-red-500",
                card.color === 'green' && "bg-green-50 text-green-500",
              )}>
                <card.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                card.trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}>
                {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {card.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{card.title}</p>
            <p className="text-2xl font-black text-navy">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Events */}
        <div className="bg-gradient-to-br from-navy to-navy/90 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Gavel size={20} className="text-sky" />
                </div>
                <h2 className="text-lg font-black tracking-tight font-syne">Prochaine Audience</h2>
              </div>
              <Link to="/legal" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Voir l'agenda</Link>
            </div>
            
            <div className="space-y-4">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-sm font-bold mb-1">{event.title}</p>
                  <div className="flex items-center gap-1.5 text-white/60 text-xs">
                    <Clock size={14} />
                    {event.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regulatory */}
        <div className="bg-card rounded-[2.5rem] p-8 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-gold" />
              </div>
              <h2 className="text-lg font-black text-navy tracking-tight font-syne">Veille Réglementaire</h2>
            </div>
            <Link to="/regulatory" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Voir tout</Link>
          </div>
          
          <div className="space-y-4">
            {[
              { ref: 'BCT 2024-05', title: 'Nouvelles normes provisionnement', date: '15/03/2024' },
              { ref: 'CTAF 2023-12', title: 'Directives PPE KYC', date: '20/11/2023' },
            ].map((c, i) => (
              <div key={i} className="p-4 bg-mist rounded-2xl border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky">{c.ref}</span>
                </div>
                <p className="text-sm font-bold text-navy mb-1">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-[2.5rem] p-8 shadow-sm border border-border">
          <h2 className="text-lg font-black text-navy tracking-tight mb-6 font-syne">Répartition par statut</h2>
          <div className="space-y-4">
            {[
              { label: 'Phase 1', pct: 45, color: 'bg-sky' },
              { label: 'Phase 2', pct: 25, color: 'bg-gold' },
              { label: 'Litige', pct: 18, color: 'bg-red-500' },
              { label: 'Clos', pct: 12, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-navy">{item.label}</span>
                  <span className="text-muted-foreground font-bold">{item.pct}%</span>
                </div>
                <div className="h-2 bg-mist rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={cn("h-full rounded-full", item.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Dossiers Table */}
      <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-black text-navy font-syne">Dossiers récents</h2>
          <Link to="/dossiers" className="text-xs font-bold text-sky hover:underline">Voir tous</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                <th className="text-left p-4">Débiteur</th>
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Montant</th>
                <th className="text-left p-4">Statut</th>
                <th className="text-left p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDossiers.map((d, i) => (
                <tr key={i} className="border-b border-border hover:bg-mist transition-colors">
                  <td className="p-4 font-bold text-sm text-navy">{d.name}</td>
                  <td className="p-4 text-sm text-muted-foreground font-mono">{d.code}</td>
                  <td className="p-4 text-sm font-mono">{d.amount} TND</td>
                  <td className="p-4">
                    <span className={cn("text-xs font-bold px-3 py-1 rounded-full", statusColors[d.status])}>
                      {statusLabels[d.status]}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
