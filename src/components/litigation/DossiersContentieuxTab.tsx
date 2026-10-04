import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gavel, Scale, Clock, TrendingUp, Search, Plus, Filter,
  ChevronRight, Users, Calendar, AlertTriangle, ShieldCheck, 
  Settings, UserCheck, ShieldAlert, FolderPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LegalCase, LitigationStore } from '@/lib/litigation-store';

const STAGE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  opened: { label: 'Initié', bg: 'bg-blue-100', color: 'text-blue-700' },
  formal_notice: { label: 'Mise en demeure', bg: 'bg-yellow-100', color: 'text-yellow-700' },
  court_filing: { label: 'Requête déposée', bg: 'bg-amber-100', color: 'text-amber-700' },
  court_hearing: { label: 'Audience', bg: 'bg-indigo-100', color: 'text-indigo-700' },
  enforcement: { label: 'Exécution forcée', bg: 'bg-purple-100', color: 'text-purple-700' },
  payment_plan: { label: 'Échéancier', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  closed: { label: 'Clos', bg: 'bg-neutral-100', color: 'text-neutral-700' },
  in_process: { label: 'En cours', bg: 'bg-blue-50', color: 'text-blue-600' }
};

interface DossiersContentieuxTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

export default function DossiersContentieuxTab({ onRefreshAll, userEmail }: DossiersContentieuxTabProps) {
  const [cases, setCases] = useState<LegalCase[]>(() => LitigationStore.getLegalCases());
  const [search, setSearch] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Interactive controls
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [modalAction, setModalAction] = useState<'status' | 'lawyer' | 'new' | null>(null);
  
  // Form values
  const [newStatus, setNewStatus] = useState('');
  const [newLawyer, setNewLawyer] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPortfolio, setNewPortfolio] = useState<'Microfinance' | 'Factoring' | 'Leasing'>('Microfinance');

  // ─── HANDLERS ───────────────────────────────────────
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const list = [...cases];
    const index = list.findIndex(c => c.id === selectedCase.id);
    if (index === -1) return;

    if (modalAction === 'status' && newStatus) {
      list[index].status = newStatus as any;
      list[index].last_action_at = new Date().toISOString().slice(0, 10);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Mise à jour statut', `Statut du dossier ${selectedCase.id} modifié vers ${newStatus}`);
    } 
    else if (modalAction === 'lawyer' && newLawyer) {
      list[index].external_lawyer_id = newLawyer;
      list[index].last_action_at = new Date().toISOString().slice(0, 10);
      LitigationStore.saveLegalCases(list);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Affectation avocat', `Avocat du dossier ${selectedCase.id} modifié vers ${newLawyer}`);
    }

    LitigationStore.saveLegalCases(list);
    setCases(list);
    onRefreshAll();

    // Reset
    setSelectedCase(null);
    setModalAction(null);
    setNewStatus('');
    setNewLawyer('');
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient || !newAmount) return;

    const list = [...cases];
    const principal = parseFloat(newAmount);
    const newCase: LegalCase = {
      id: `LIT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      client_name: newClient,
      portfolio_type: newPortfolio,
      institution: newPortfolio === 'Leasing' ? 'Tunisie Leasing' : newPortfolio === 'Factoring' ? 'Amen Bank' : 'Enda Tamweel',
      branch: 'Tunis Centre',
      legal_case_number: `RG-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      legal_officer_id: userEmail || 'Amel Ben Ali',
      external_lawyer_id: 'Maître Sonia Trabelsi',
      principal_due: principal,
      interest_due: Math.round(principal * 0.05),
      penalties_due: Math.round(principal * 0.02),
      legal_fees_due: 0,
      recoverable_fees: 0,
      total_claim_amount: Math.round(principal * 1.07),
      recovered_amount: 0,
      remaining_amount: Math.round(principal * 1.07),
      recovery_rate: 0,
      risk_level: 'Moyen',
      priority_level: 'Normale',
      status: 'opened',
      opened_at: new Date().toISOString().slice(0, 10),
      has_collateral: false,
      has_guarantor: false,
      missing_docs_count: 0
    };

    list.unshift(newCase);
    LitigationStore.saveLegalCases(list);
    setCases(list);
    onRefreshAll();

    // Reset
    setNewClient('');
    setNewAmount('');
    setModalAction(null);
  };

  // ─── FILTER COMPUTATION ─────────────────────────────
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchSearch = !search ||
        c.client_name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.legal_case_number.toLowerCase().includes(search.toLowerCase()) ||
        c.external_lawyer_id.toLowerCase().includes(search.toLowerCase());

      const matchPortfolio = portfolioFilter === 'All' || c.portfolio_type === portfolioFilter;
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;

      return matchSearch && matchPortfolio && matchStatus;
    });
  }, [cases, search, portfolioFilter, statusFilter]);

  // Kanban view mapping
  const kanbanStages = ['opened', 'formal_notice', 'in_process', 'court_hearing', 'enforcement', 'payment_plan'];

  const kanbanByStage = useMemo(() => {
    return kanbanStages.reduce<Record<string, LegalCase[]>>((acc, s) => {
      acc[s] = cases.filter(c => c.status === s);
      return acc;
    }, {});
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* ─── KANBAN VIEWS ─── */}
      <section className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black uppercase text-[hsl(var(--charcoal))] tracking-wider">Pipeline de Gestion Contentieuse</h2>
            <p className="text-xs text-muted-foreground mt-1">Étapes d'avancement des dossiers judiciaires au tribunal.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kanbanStages.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || { label: stage, bg: 'bg-secondary', color: 'text-muted-foreground' };
            const stageCases = kanbanByStage[stage] || [];
            return (
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-secondary/30 p-3 min-h-[140px] border border-border/40"
              >
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/40">
                  <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md", cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{stageCases.length}</span>
                </div>
                <div className="space-y-2">
                  {stageCases.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">Aucun</p>}
                  {stageCases.slice(0, 4).map(c => (
                    <div
                      key={c.id}
                      className="block bg-card rounded-lg p-2 border border-border hover:border-cobalt/80 transition-all shadow-row"
                    >
                      <p className="text-[9px] font-bold text-muted-foreground">{c.id}</p>
                      <p className="text-[11px] font-semibold text-[hsl(var(--charcoal))] truncate mt-0.5">{c.client_name}</p>
                      <p className="text-[10px] font-bold text-cobalt mt-1">{(c.total_claim_amount / 1000).toFixed(1)}k TND</p>
                    </div>
                  ))}
                  {stageCases.length > 4 && (
                    <p className="text-[9px] text-muted-foreground text-center font-bold">+ {stageCases.length - 4} autres</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── FILTERS BAR ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dossier (Débiteur, Avocat, N° RG)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border/60 focus:outline-none"
          />
        </div>

        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tout Portefeuille</option>
          <option value="Microfinance">Microfinance</option>
          <option value="Factoring">Factoring</option>
          <option value="Leasing">Leasing</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tous les statuts</option>
          <option value="opened">Initié</option>
          <option value="formal_notice">Mise en demeure (huissier)</option>
          <option value="in_process">Arbitrage en cours</option>
          <option value="court_hearing">En audience</option>
          <option value="enforcement">Exécution forcée</option>
          <option value="payment_plan">Échéancier approuvé</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <Link 
            to="/litigation?tab=nouveaux-dossiers"
            className="px-3.5 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:brightness-110 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus size={14} className="text-blue-200" /> Nouveaux dossiers (IA)
          </Link>

          <button 
            onClick={() => { setModalAction('new'); }}
            className="px-3.5 py-2 bg-crimson hover:bg-crimson/95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus size={14} /> Saisie rapide
          </button>
        </div>
      </div>

      {/* ─── REGISTRY TABLE ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3.5 px-4 font-black">N° Dossier</th>
                <th className="py-3.5 px-2 font-black">Débiteur (Client)</th>
                <th className="py-3.5 px-2 font-black">Réclamation totale / Portefeuille</th>
                <th className="py-3.5 px-2 font-black text-right">Amorti (Payé)</th>
                <th className="py-3.5 px-2 font-black text-right">Reste dû</th>
                <th className="py-3.5 px-2 font-black text-center">Taux recov %</th>
                <th className="py-3.5 px-2 font-black text-center">Garanties</th>
                <th className="py-3.5 px-2 font-black text-center border-l whitespace-nowrap">Statut juridique</th>
                <th className="py-3.5 px-2 font-black">Procureur / Avocat</th>
                <th className="py-3.5 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCases.map(c => {
                const cfg = STAGE_CONFIG[c.status] || { label: c.status, bg: 'bg-secondary', color: 'text-muted-foreground' };
                return (
                  <tr key={c.id} className="hover:bg-secondary/15 transition-all font-medium">
                    <td className="py-4 px-4 font-mono font-bold text-foreground">
                      <Link to={`/litigation/${c.id}`} className="text-crimson hover:underline">{c.id}</Link>
                    </td>
                    <td className="py-4 px-2">
                      <div className="font-semibold text-foreground">{c.client_name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">N° RG: {c.legal_case_number}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="font-bold text-foreground">{c.total_claim_amount.toLocaleString('fr-FR')} TND</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.portfolio_type} · {c.institution}</div>
                    </td>
                    <td className="py-4 px-2 text-right font-semibold text-emerald">
                      {c.recovered_amount.toLocaleString('fr-FR')} TND
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-foreground">
                      {c.remaining_amount.toLocaleString('fr-FR')} TND
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className="font-bold text-neutral-800">{c.recovery_rate.toFixed(1)}%</div>
                      <div className="w-12 bg-secondary h-1 rounded-full overflow-hidden mx-auto mt-1">
                        <div className="bg-emerald h-1" style={{ width: `${Math.min(c.recovery_rate, 105)}%` }} />
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-muted-foreground font-semibold">
                      {c.has_collateral ? (
                        <span className="inline-block text-[10px] uppercase font-serif-display text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-black">
                          OUI
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-4 px-2 border-l text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                        cfg.bg, cfg.color
                      )}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-[11px] text-neutral-800 font-semibold">
                      <div>{c.external_lawyer_id}</div>
                      <div className="text-[9px] text-muted-foreground font-mono mt-0.5">Resp: {c.legal_officer_id}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedCase(c); setModalAction('status'); }}
                          className="px-2 py-1.5 bg-secondary text-foreground rounded hover:bg-neutral-200 transition text-[10px] font-bold"
                        >
                          Étape
                        </button>
                        <button
                          onClick={() => { setSelectedCase(c); setModalAction('lawyer'); }}
                          className="px-2 py-1.5 bg-secondary text-foreground rounded hover:bg-neutral-200 transition text-[10px] font-bold"
                        >
                          Avocat
                        </button>
                        <Link
                          to={`/litigation/${c.id}`}
                          className="p-1 px-1.5 bg-crimson text-white rounded hover:brightness-110 transition text-[10px] font-bold inline-flex items-center"
                        >
                          Détails
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground font-semibold">
                    Aucun dossier juridique identifié pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL CONTROLS ─── */}
      <AnimatePresence>
        {modalAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl text-card-foreground"
            >
              {modalAction === 'new' ? (
                <form onSubmit={handleCreateCase} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground">Initialiser un dossier légal d'Amende</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Raison Sociale Débiteur</label>
                      <input
                        value={newClient}
                        onChange={e => setNewClient(e.target.value)}
                        placeholder="Ex: BEN ALIA COMPAGNIE"
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-bold"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Portefeuille d'origine</label>
                        <select
                          value={newPortfolio}
                          onChange={e => setNewPortfolio(e.target.value as any)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="Microfinance">Microfinance</option>
                          <option value="Factoring">Factoring</option>
                          <option value="Leasing">Leasing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Montant réclamé (TND)</label>
                        <input
                          type="number"
                          value={newAmount}
                          onChange={e => setNewAmount(e.target.value)}
                          placeholder="Ex: 85000"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setModalAction(null)}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200"
                    >
                      Brouillon
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-crimson text-white rounded-lg hover:brightness-110"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground">
                    {modalAction === 'status' && 'Mise à niveau procédure'}
                    {modalAction === 'lawyer' && 'Candidature avocat externe'}
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Action légale pour le dossier : <strong>{selectedCase?.client_name}</strong>
                  </p>

                  <div className="space-y-3">
                    {modalAction === 'status' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Sélectionner l'Étape de la procédure</label>
                        <select
                          value={newStatus}
                          onChange={e => setNewStatus(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="opened">Initié</option>
                          <option value="formal_notice">Mise en demeure envoyée</option>
                          <option value="in_process">Arbitrage / Etude juridique</option>
                          <option value="court_hearing">En audience devant la cours</option>
                          <option value="enforcement">Saisie / Exécution forcenée</option>
                          <option value="payment_plan">Règlement sous moratoire de paiement</option>
                          <option value="closed">Procédure Clause (Apuré)</option>
                        </select>
                      </div>
                    )}

                    {modalAction === 'lawyer' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Sélectionner l'Avocat conseil</label>
                        <select
                          value={newLawyer}
                          onChange={e => setNewLawyer(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="Maître Sonia Trabelsi">Maître Sonia Trabelsi (Cabinet de Tunis)</option>
                          <option value="Maître Karim Belhaj">Maître Karim Belhaj (Cabinet de Sousse)</option>
                          <option value="Maître Habib Ben Romdhane">Maître Habib Ben Romdhane (Cabinet Sfax)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedCase(null); setModalAction(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Confirmer
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
