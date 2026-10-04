import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Search, Plus, Filter, MoreVertical, 
  Send, HelpCircle, CheckCircle, XCircle, FileText, 
  Calendar, CheckSquare, Edit2, Play, Users, Trash2 
} from 'lucide-react';
import { PreLitigationCase, LitigationStore, LegalCase } from '@/lib/litigation-store';
import { cn } from '@/lib/utils';

interface PreContentieuxTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

export default function PreContentieuxTab({ onRefreshAll, userEmail }: PreContentieuxTabProps) {
  const [cases, setCases] = useState<PreLitigationCase[]>(() => LitigationStore.getPreLitCases());
  const [searchTerm, setSearchTerm] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal active states
  const [selectedCase, setSelectedCase] = useState<PreLitigationCase | null>(null);
  const [actionType, setActionType] = useState<'notice' | 'response' | 'approve' | 'reject' | 'new' | null>(null);

  // Form states
  const [clientResponse, setClientResponse] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  
  // New Case States
  const [newClientName, setNewClientName] = useState('');
  const [newPortfolio, setNewPortfolio] = useState<'Microfinance' | 'Factoring' | 'Leasing'>('Microfinance');
  const [newOverdue, setNewOverdue] = useState('');
  const [newOutstanding, setNewOutstanding] = useState('');
  const [newEscalation, setNewEscalation] = useState('');

  // ─── DATA HANDLERS ───────────────────────────────────
  
  const refreshList = () => {
    const list = LitigationStore.getPreLitCases();
    setCases(list);
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const list = [...cases];
    const itemIdx = list.findIndex(c => c.id === selectedCase.id);
    if (itemIdx === -1) return;

    const updatedCase = { ...list[itemIdx] };

    if (actionType === 'notice') {
      updatedCase.formal_notice_status = 'sent';
      updatedCase.formal_notice_sent_at = new Date().toISOString().slice(0, 10);
      updatedCase.status = 'formal_notice_sent';
      if (deadlineDate) {
        updatedCase.final_deadline_date = deadlineDate;
      }
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Mise en demeure', `Envoi d'une mise en demeure au client ${updatedCase.client_name}`);
    } 
    else if (actionType === 'response') {
      updatedCase.client_response = clientResponse;
      updatedCase.status = 'waiting_client_response';
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Réponse client', `Enregistrement de la réponse client pour ${updatedCase.client_name}`);
    } 
    else if (actionType === 'reject') {
      updatedCase.status = 'rejected';
      updatedCase.closed_at = new Date().toISOString().slice(0, 10);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Rejet pré-contentieux', `Dossier de pré-contentieux rejeté pour ${updatedCase.client_name}`);
    } 
    else if (actionType === 'approve') {
      // 1. Mark as approved for litigation
      updatedCase.status = 'approved_for_litigation';
      updatedCase.approved_at = new Date().toISOString().slice(0, 10);
      updatedCase.closed_at = new Date().toISOString().slice(0, 10);
      updatedCase.approved_by = 'Direction de recouvrement';

      // 2. Automatically create a new LegalCase in the Legal cases store!
      const legalCases = LitigationStore.getLegalCases();
      const newLegalCase: LegalCase = {
        id: `LIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        client_name: updatedCase.client_name,
        portfolio_type: updatedCase.portfolio_type,
        institution: updatedCase.institution,
        branch: updatedCase.branch,
        legal_case_number: `RG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        legal_officer_id: updatedCase.approved_by,
        external_lawyer_id: 'Maître Sonia Trabelsi', // default assign
        principal_due: updatedCase.overdue_amount,
        interest_due: Math.round(updatedCase.overdue_amount * 0.05), // nominal interest
        penalties_due: Math.round(updatedCase.overdue_amount * 0.02),
        legal_fees_due: 0,
        recoverable_fees: 0,
        total_claim_amount: updatedCase.overdue_amount + Math.round(updatedCase.overdue_amount * 0.07),
        recovered_amount: 0,
        remaining_amount: updatedCase.overdue_amount + Math.round(updatedCase.overdue_amount * 0.07),
        recovery_rate: 0,
        risk_level: 'Élevé',
        priority_level: 'Normale',
        status: 'opened',
        opened_at: new Date().toISOString().slice(0, 10),
        has_collateral: false,
        has_guarantor: updatedCase.guarantor_contacted,
        missing_docs_count: 1
      };
      
      legalCases.unshift(newLegalCase);
      LitigationStore.saveLegalCases(legalCases);
      
      LitigationStore.logAction(
        userEmail || 'user@recovai.com', 
        'Validation contentieux', 
        `Dossier ${updatedCase.client_name} approuvé pour transfert au tribunal. Création du dossier juridique ${newLegalCase.id}`
      );
    }

    list[itemIdx] = updatedCase;
    LitigationStore.savePreLitCases(list);
    setCases(list);
    onRefreshAll(); // signal parent to refresh indicators!
    
    // reset states
    setSelectedCase(null);
    setActionType(null);
    setClientResponse('');
    setDeadlineDate('');
  };

  const handleCreatePreLit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newOverdue) return;

    const newList = [...cases];
    const newItem: PreLitigationCase = {
      id: `PL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      case_number: `PL-0${Math.floor(100 + Math.random() * 900)}`,
      client_name: newClientName,
      portfolio_type: newPortfolio,
      institution: newPortfolio === 'Leasing' ? 'Tunisie Leasing' : newPortfolio === 'Factoring' ? 'Amen Bank' : 'Enda Tamweel',
      branch: 'Tunis Centre',
      overdue_amount: parseFloat(newOverdue),
      outstanding_amount: parseFloat(newOutstanding) || parseFloat(newOverdue),
      days_overdue: 90,
      reason_for_escalation: newEscalation || 'Échec du recouvrement amiable répétatif.',
      formal_notice_status: 'draft',
      guarantor_contacted: false,
      documents_checked: true,
      recommended_action: 'Mise en demeure',
      status: 'opened',
      opened_at: new Date().toISOString().slice(0, 10)
    };

    newList.unshift(newItem);
    LitigationStore.savePreLitCases(newList);
    setCases(newList);
    LitigationStore.logAction(userEmail || 'user@recovai.com', 'Création Pré-contentieux', `Nouveau cas de pré-contentieux enregistré pour ${newClientName}`);
    
    // reset
    setNewClientName('');
    setNewOverdue('');
    setNewOutstanding('');
    setNewEscalation('');
    setActionType(null);
    onRefreshAll();
  };

  // ─── FILTER COMPUTATIONS ─────────────────────────────
  
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchSearch = !searchTerm || 
        c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.case_number.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchPortfolio = portfolioFilter === 'All' || c.portfolio_type === portfolioFilter;
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;

      return matchSearch && matchPortfolio && matchStatus;
    });
  }, [cases, searchTerm, portfolioFilter, statusFilter]);

  // KPIs específico de Pré-contentieux
  const kpis = useMemo(() => {
    const total = cases.length;
    const pendingNotice = cases.filter(c => c.status === 'formal_notice_pending' || c.formal_notice_status === 'pending').length;
    const sentNotice = cases.filter(c => c.formal_notice_status === 'sent').length;
    const activeWait = cases.filter(c => c.status === 'waiting_client_response').length;
    const readyLit = cases.filter(c => c.status === 'ready_for_litigation').length;
    const totalAmount = cases.reduce((sum, c) => sum + c.overdue_amount, 0);

    return { total, pendingNotice, sentNotice, activeWait, readyLit, totalAmount };
  }, [cases]);

  return (
    <div className="space-y-6">
      {/* ─── MINI KPIS HEADER ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total dossiers</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{kpis.total}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Notice à envoyer</p>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{kpis.pendingNotice}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Défis envoyés</p>
          <p className="text-xl font-bold text-cobalt mt-0.5">{kpis.sentNotice}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Prêts au juridique</p>
          <p className="text-xl font-bold text-emerald mt-0.5">{kpis.readyLit}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Encours proposé</p>
          <p className="text-xl font-bold text-crimson mt-0.5">{(kpis.totalAmount / 1000).toFixed(0)}k TND</p>
        </div>
      </div>

      {/* ─── FILTERS BAR ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher pré-contentieux (Client, N° ID)..."
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
          <option value="opened">Nouveau</option>
          <option value="formal_notice_pending">Mise en demeure en attente</option>
          <option value="formal_notice_sent">Mise en demeure envoyée</option>
          <option value="waiting_client_response">En attente de réponse</option>
          <option value="ready_for_litigation">Prêt pour contentieux</option>
          <option value="approved_for_litigation">Transféré au juridique</option>
          <option value="rejected">Rejeté</option>
        </select>

        <button 
          onClick={() => { setActionType('new'); }}
          className="px-4 py-2 bg-crimson text-white rounded-lg text-xs font-bold hover:bg-crimson/90 transition flex items-center gap-1.5 ml-auto"
        >
          <Plus size={14} /> Proposer un dossier
        </button>
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3.5 px-4 font-black">N° Pré-contentieux</th>
                <th className="py-3.5 px-2 font-black">Client</th>
                <th className="py-3.5 px-2 font-black">Portefeuille / Institution</th>
                <th className="py-3.5 px-2 font-black text-right">Encours exigible</th>
                <th className="py-3.5 px-2 font-black text-center">Retard</th>
                <th className="py-3.5 px-2 font-black">Statut notice</th>
                <th className="py-3.5 px-2 font-black">Statut dossier</th>
                <th className="py-3.5 px-2 font-black">Décision recommandée</th>
                <th className="py-3.5 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCases.map(c => {
                const isSent = c.formal_notice_status === 'sent';
                return (
                  <tr key={c.id} className="hover:bg-secondary/20 transition-all font-medium">
                    <td className="py-4 px-4 font-mono font-bold text-foreground">{c.id}</td>
                    <td className="py-4 px-2">
                      <div className="font-semibold text-foreground">{c.client_name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Réf: {c.case_number}</div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold text-foreground border border-border/40">
                        {c.portfolio_type}
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.institution} · {c.branch}</div>
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-foreground">
                      {c.overdue_amount.toLocaleString('fr-FR')} TND
                      <div className="text-[10px] text-muted-foreground font-normal">Cap: {c.outstanding_amount.toLocaleString('fr-FR')} TND</div>
                    </td>
                    <td className="py-4 px-2 text-center text-muted-foreground font-semibold">
                      {c.days_overdue} j
                    </td>
                    <td className="py-4 px-2">
                      {c.formal_notice_status === 'sent' ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald/10 text-emerald border border-emerald/20 px-2 py-0.5 rounded">
                          Envoyée le {c.formal_notice_sent_at}
                        </span>
                      ) : c.formal_notice_status === 'pending' ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded">
                          À envoyer
                        </span>
                      ) : c.formal_notice_status === 'received' ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-cobalt/10 text-cobalt border border-cobalt/20 px-2 py-0.5 rounded">
                          Reçue & Réponse
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border/40 px-2 py-0.5 rounded">
                          Brouillon
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                        c.status === 'opened' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        c.status === 'formal_notice_sent' && "bg-cobalt/10 text-cobalt border-cobalt/20",
                        c.status === 'waiting_client_response' && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                        c.status === 'ready_for_litigation' && "bg-amber-600/10 text-amber-600 border-amber-600/20 animate-pulse",
                        c.status === 'approved_for_litigation' && "bg-purple-100 text-purple-700 border-purple-300",
                        c.status === 'rejected' && "bg-crimson/10 text-crimson border-crimson/20",
                      )}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-neutral-800">{c.recommended_action}</span>
                        {c.final_deadline_date && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">Échéance : {c.final_deadline_date}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {c.status !== 'approved_for_litigation' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {c.formal_notice_status !== 'sent' && (
                            <button
                              onClick={() => { setSelectedCase(c); setActionType('notice'); }}
                              className="px-2 py-1 bg-secondary text-foreground rounded hover:bg-neutral-200 transition text-[10px] font-bold"
                              title="Engager mise en demeure"
                            >
                              LRAR
                            </button>
                          )}
                          {c.formal_notice_status === 'sent' && !c.client_response && (
                            <button
                              onClick={() => { setSelectedCase(c); setActionType('response'); }}
                              className="px-2 py-1 bg-secondary text-foreground rounded hover:bg-neutral-200 transition text-[10px] font-bold"
                              title="Prendre note réponse client"
                            >
                              Réponse
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedCase(c); setActionType('approve'); }}
                            className="px-2.5 py-1.5 bg-emerald text-white rounded hover:brightness-110 transition text-[10px] font-bold flex items-center gap-1"
                          >
                            Transférer contentieux
                          </button>
                          <button
                            onClick={() => { setSelectedCase(c); setActionType('reject'); }}
                            className="p-1.5 text-crimson hover:bg-crimson/5 rounded transition"
                            title="Rejeter dossier"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 justify-end">
                          <CheckSquare size={13} className="text-emerald" /> Soumis au juridique
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground select-none font-semibold">
                    Aucun dossier de pré-contentieux sélectionné pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ACTION DIALOGS ─── */}
      <AnimatePresence>
        {actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl overflow-hidden text-card-foreground"
            >
              {actionType === 'new' ? (
                // FORM CREATE NEW
                <form onSubmit={handleCreatePreLit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight tracking-wider">Mettre à l'étude au Pré-Contentieux</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Raison Sociale Client</label>
                      <input
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        placeholder="Ex: STE BATIMENT TUNIS"
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Portefeuille</label>
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
                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Encours exigible (TND)</label>
                        <input
                          type="number"
                          value={newOverdue}
                          onChange={e => setNewOverdue(e.target.value)}
                          placeholder="Ex: 15400"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-bold text-foreground"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Encours total restant (TND)</label>
                      <input
                        type="number"
                        value={newOutstanding}
                        onChange={e => setNewOutstanding(e.target.value)}
                        placeholder="Laisser vide pour égaler avec exigible"
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Justificatif / Motif d'escalade</label>
                      <textarea
                        value={newEscalation}
                        onChange={e => setNewEscalation(e.target.value)}
                        placeholder="Justifier brièvement l'escalade..."
                        rows={3}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none resize-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setActionType(null)}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary hover:bg-neutral-200 rounded-lg"
                    >
                      Annuler
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
                // ACTIONS FOR EXISTING SELECTEDCASE
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground">
                    {actionType === 'notice' && 'Envoi de mise en demeure'}
                    {actionType === 'response' && 'Prendre note de la réponse débiteur'}
                    {actionType === 'approve' && 'Approbation de transfert au tribunal'}
                    {actionType === 'reject' && 'Fermer / rejeter le dossier de pré-contentieux'}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dossier ciblé : <strong>{selectedCase?.client_name}</strong> ({selectedCase?.id})
                  </p>

                  <div className="space-y-3">
                    {actionType === 'notice' && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Cette action simule l'envoi légal d'une lettre de mise en demeure par huissier de justice ou LRAR avec accusé de réception.
                        </p>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Dernier délai accordé de règlement</label>
                          <input
                            type="date"
                            value={deadlineDate}
                            onChange={(e) => setDeadlineDate(e.target.value)}
                            className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                            required
                          />
                        </div>
                      </>
                    )}

                    {actionType === 'response' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Note de la conversation / Proposition négociée</label>
                        <textarea
                          value={clientResponse}
                          onChange={(e) => setClientResponse(e.target.value)}
                          placeholder="Rentrez le retour formalisé du client défaillant..."
                          rows={4}
                          className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                          required
                        />
                      </div>
                    )}

                    {actionType === 'approve' && (
                      <div className="p-3 bg-emerald/5 border border-emerald/20 text-xs rounded-xl space-y-2 text-emerald-800 font-semibold leading-relaxed">
                        <p>✓ Validation du dossier : Prêt pour le contentieux.</p>
                        <p>✓ Cette décision va clore la phase amiable pré-contentieuse et ouvrir immédiatement une requête légale au greffe du tribunal de commerce compétent.</p>
                        <p>✓ Un dossier juridique (type LIT-YEAR-XXXX) sera automatiquement initialisé.</p>
                      </div>
                    )}

                    {actionType === 'reject' && (
                      <p className="text-xs text-crimson font-semibold">
                        Êtes-vous sûr de vouloir retirer ce dossier ? Il sera marqué comme "rejeté" et retourné au portefeuille commercial.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedCase(null); setActionType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary hover:bg-neutral-200 rounded-lg cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className={cn(
                        "px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer",
                        actionType === 'reject' ? "bg-crimson" : "bg-emerald"
                      )}
                    >
                      Confirmer la décision
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
