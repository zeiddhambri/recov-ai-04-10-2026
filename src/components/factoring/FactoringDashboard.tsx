import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Banknote, TrendingUp, ShieldCheck, AlertOctagon, Landmark, Calendar, Scale, Coins } from 'lucide-react';
import { Debtor, Invoice, FactoringRequest } from '../../types/factoring';

interface FactoringDashboardProps {
  debtors: Debtor[];
  invoices: Invoice[];
  requests: FactoringRequest[];
}

export default function FactoringDashboard({ debtors, invoices, requests }: FactoringDashboardProps) {
  // Calculations
  const fundedRequests = requests.filter(r => r.status === 'funded');
  
  const totalInvoicesValue = invoices.reduce((sum, item) => sum + item.amount, 0);
  const totalFinancedValue = fundedRequests.reduce((sum, item) => sum + item.totalInvoiceAmount, 0);
  const totalReserveValue = fundedRequests.reduce((sum, item) => sum + item.reserveAmount, 0);
  const totalFeesPaid = fundedRequests.reduce((sum, item) => sum + item.estimatedFees, 0);
  const totalNetFinanced = fundedRequests.reduce((sum, item) => sum + item.netDisbursedAmount, 0);

  // Status Metrics
  const pendingRequestsCount = requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const eligibleInvoicesCount = invoices.filter(inv => inv.status === 'eligible').length;
  const eligibleInvoicesValue = invoices.filter(inv => inv.status === 'eligible').reduce((sum, item) => sum + item.amount, 0);

  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const totalOverdueValue = overdueInvoices.reduce((sum, item) => sum + item.amount, 0);

  // Charts data
  // 1. Debtor exposure chart
  const debtorExposureData = debtors.map(debtor => ({
    name: debtor.name.split(' ')[0] + ' ' + (debtor.name.split(' ')[1] || ''),
    Limite: debtor.approvedLimit,
    Utilise: debtor.usedLimit,
  }));

  // 2. Invoice eligibility breakdown
  const invoiceSplitData = [
    { name: 'Éligibles', value: invoices.filter(inv => inv.status === 'eligible' || inv.status === 'issued').reduce((sum, item) => sum + item.amount, 0) },
    { name: 'Financées', value: invoices.filter(inv => inv.status === 'financed' || inv.status === 'partially_paid').reduce((sum, item) => sum + item.amount, 0) },
    { name: 'Réglées (Closes)', value: invoices.filter(inv => inv.status === 'paid').reduce((sum, item) => sum + item.amount, 0) },
    { name: 'Non éligibles / Bloquées', value: invoices.filter(inv => inv.status === 'ineligible' || inv.status === 'disputed').reduce((sum, item) => sum + item.amount, 0) },
  ].filter(item => item.value > 0);

  const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444'];

  const stats = [
    { title: 'Volume Financé (Brut)', value: `${totalFinancedValue.toLocaleString()} TND`, icon: TrendingUp, color: 'sky' },
    { title: 'Avance Nette Décaissée', value: `${totalNetFinanced.toLocaleString()} TND`, icon: Coins, color: 'emerald' },
    { title: 'Réserves Détenues (Garantie)', value: `${totalReserveValue.toLocaleString()} TND`, icon: Landmark, color: 'gold' },
    { title: 'Commissions & Intérêts Factor', value: `${totalFeesPaid.toLocaleString()} TND`, icon: Scale, color: 'rose' },
  ];

  return (
    <div className="space-y-8">
      {/* 4 Cards Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">{stat.title}</span>
              <div className={`p-2.5 rounded-xl ${
                stat.color === 'sky' ? 'bg-sky/10 text-sky' :
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'gold' ? 'bg-gold/10 text-gold' : 'bg-red-50 text-red-500'
              }`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-black text-navy">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Overview alerts & action summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-sky/5 border border-sky/20 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-sky/15 text-sky rounded-2xl shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">Disponibilité Financement</h3>
            <p className="text-2xl font-black mt-1 text-sky">
              {eligibleInvoicesValue.toLocaleString()} <span className="text-xs font-normal">TND</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Vous possédez <strong>{eligibleInvoicesCount}</strong> factures éligibles prêtes pour cession.
            </p>
          </div>
        </div>

        <div className="bg-gold/5 border border-gold/20 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-gold/15 text-gold rounded-2xl shrink-0">
            <Landmark size={24} />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">Demandes en Attente</h3>
            <p className="text-2xl font-black mt-1 text-gold">{pendingRequestsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Dossiers actuellement soumis à l'évaluation du comité de risques du Factor.
            </p>
          </div>
        </div>

        <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-red-100/60 text-red-600 rounded-2xl shrink-0">
            <AlertOctagon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">Échues / Risques</h3>
            <p className="text-2xl font-black mt-1 text-red-600">
              {totalOverdueValue.toLocaleString()} <span className="text-xs font-normal">TND</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Portefeuille en retard ou non éligible nécessitant des procédures de recouvrement.
            </p>
          </div>
        </div>
      </div>

      {/* Graphics container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recharts Debtor Exposure */}
        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-black text-navy font-syne">Exposition Crédit par Débiteur</h3>
            <p className="text-xs text-muted-foreground">Comparatif de la limite accordée face aux encours tirés.</p>
          </div>
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtorExposureData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: number) => [`${val.toLocaleString()} TND`]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Limite" fill="#e2e8f0" name="Plafond Autorisé" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Utilise" fill="#0ea5e9" name="Encours Finance" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Allocation Donut */}
        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-black text-navy font-syne">Structure de Cession du Portefeuille</h3>
            <p className="text-xs text-muted-foreground">Cycle complet d'allocation financière de vos créances.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-1">
            <div className="h-64 md:col-span-7 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceSplitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {invoiceSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val.toLocaleString()} TND`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block">Volume Total</span>
                <span className="text-xl font-extrabold text-navy font-syne">{(totalInvoicesValue).toLocaleString()}</span>
                <span className="text-[10px] block text-muted-foreground">TND</span>
              </div>
            </div>

            <div className="md:col-span-5 space-y-3">
              {invoiceSplitData.map((item, idx) => (
                <div key={item.name} className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs font-semibold text-navy truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 pl-5">
                    {item.value.toLocaleString()} TND
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({Math.round((item.value / totalInvoicesValue) * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
