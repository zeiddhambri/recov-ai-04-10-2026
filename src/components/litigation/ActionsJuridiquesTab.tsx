import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Calendar, CheckCircle2, AlertTriangle, 
  Clock, XCircle, MoreVertical, Edit2, Check, User 
} from 'lucide-react';
import { LegalAction, LitigationStore, LegalCase } from '@/lib/litigation-store';
import { cn } from '@/lib/utils';

interface ActionsJuridiquesTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

const ACTION_TYPES: Record<string, string> = {
  formal_notice: 'Mise en demeure (LRAR/Huissier)',
  lawyer_assignment: 'Désignation avocat externe',
  legal_review: 'Revue juridique du dossier',
  court_filing: 'Dépôt de requête au greffe',
  hearing: 'Audience de plaidoirie',
  judgment: 'Jugement rendu / Titre',
  enforcement_order: 'Signification titre exécutoire',
  bailiff_action: 'Action d\'huissier de justice',
  collateral_seizure: 'Saisie conservatoire / exécution',
  collateral_sale: 'Vente aux enchères (Collatéral)',
  guarantor_claim: 'Appel en garantie de caution',
  settlement_agreement: 'Signature protocole d\'accord',
  payment_plan_signed: 'Mise en place d\'échéancier logé',
  write_off_request: 'Requête passage en perte',
  case_closure: 'Clôture définitive'
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  planned: { label: 'Planifiée', bg: 'bg-blue-100', color: 'text-blue-700' },
  in_progress: { label: 'En cours', bg: 'bg-yellow-100', color: 'text-yellow-700' },
  completed: { label: 'Réalisée', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  overdue: { label: 'En retard', bg: 'bg-crimson/10', color: 'text-crimson' },
  cancelled: { label: 'Annulée', bg: 'bg-neutral-100', color: 'text-neutral-500' },
  failed: { label: 'Échouée', bg: 'bg-red-100', color: 'text-red-700' }
};

export default function ActionsJuridiquesTab({ onRefreshAll, userEmail }: ActionsJuridiquesTabProps) {
  const [actions, setActions] = useState<LegalAction[]>(() => LitigationStore.getLegalActions());
  const [legalCases] = useState<LegalCase[]>(() => LitigationStore.getLegalCases());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals status
  const [selectedAction, setSelectedAction] = useState<LegalAction | null>(null);
  const [modalType, setModalType] = useState<'new' | 'edit' | null>(null);

  // Form states - New Action
  const [caseId, setCaseId] = useState('');
  const [actionType, setActionType] = useState<keyof typeof ACTION_TYPES>('formal_notice');
  const [actionDate, setActionDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [externalParty, setExternalParty] = useState('');
  const [notes, setNotes] = useState('');

  // Form states - Edit/Complete Action
  const [editStatus, setEditStatus] = useState<string>('completed');
  const [editResult, setEditResult] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // ─── HANDLERS ───────────────────────────────────────
  
  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !actionDate) return;

    const list = [...actions];
    const targetCase = legalCases.find(c => c.id === caseId);
    
    const newAction: LegalAction = {
      id: `ACT-${Math.floor(10000 + Math.random() * 90000)}`,
      legal_case_id: caseId,
      client_name: targetCase ? targetCase.client_name : "Client Inconnu",
      action_type: actionType,
      action_date: actionDate,
      due_date: dueDate || actionDate,
      performed_by: performedBy || userEmail || "Ahmed B.",
      external_party: externalParty || "—",
      status: 'planned',
      notes: notes
    };

    list.unshift(newAction);
    LitigationStore.saveLegalActions(list);
    setActions(list);
    
    // Log audit log
    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Création d\'action', 
      `Planification d'une action "${ACTION_TYPES[actionType]}" pour le dossier ${caseId}`
    );

    // Reset Form
    setCaseId('');
    setActionDate('');
    setDueDate('');
    setPerformedBy('');
    setExternalParty('');
    setNotes('');
    setModalType(null);
    onRefreshAll();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    const list = [...actions];
    const index = list.findIndex(a => a.id === selectedAction.id);
    if (index === -1) return;

    list[index].status = editStatus as any;
    if (editResult) {
      list[index].result = editResult;
    }
    if (editNotes) {
      list[index].notes = editNotes;
    }

    LitigationStore.saveLegalActions(list);
    setActions(list);

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Action mise à jour', 
      `Changement d'état pour l'action ${selectedAction.id} : ${editStatus}`
    );

    // Reset Form
    setSelectedAction(null);
    setModalType(null);
    setEditResult('');
    setEditNotes('');
    onRefreshAll();
  };

  // ─── DATA COMPUTATION ───────────────────────────────
  
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const matchSearch = !searchTerm ||
        a.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.legal_case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.external_party && a.external_party.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.performed_by && a.performed_by.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchType = typeFilter === 'All' || a.action_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [actions, searchTerm, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const planned = actions.filter(a => a.status === 'planned').length;
    const progress = actions.filter(a => a.status === 'in_progress').length;
    const completed = actions.filter(a => a.status === 'completed').length;
    const overdue = actions.filter(a => a.status === 'overdue').length;
    return { planned, progress, completed, overdue, total: actions.length };
  }, [actions]);

  return (
    <div className="space-y-6">
      {/* ─── KPIS ROW ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground mr-1.5">Actions totales</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{kpis.total}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Terminées avec succès</p>
          <p className="text-xl font-bold text-emerald mt-0.5">{kpis.completed}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Planifiées à date</p>
          <p className="text-xl font-bold text-blue-500 mt-0.5">{kpis.planned}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">En cours de traitement</p>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{kpis.progress}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-black uppercase text-crimson font-black">Actions en retard</p>
          <p className="text-xl font-bold text-crimson mt-0.5 animate-pulse">{kpis.overdue}</p>
        </div>
      </div>

      {/* ─── FILTERS BAR ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher action (Client, Responsable, Intervenant)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border/60 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tout type d'action</option>
          {Object.entries(ACTION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tous les statuts</option>
          <option value="planned">Planifiée</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Réalisée</option>
          <option value="overdue">En retard</option>
          <option value="failed">Échouée</option>
        </select>

        <button 
          onClick={() => { setModalType('new'); }}
          className="px-4 py-2 bg-crimson hover:bg-crimson/95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
        >
          <Plus size={14} /> Planifier une action
        </button>
      </div>

      {/* ─── ACTIONS TIMELINE TABLE ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3.5 px-4 font-black">ID Action</th>
                <th className="py-3.5 px-2 font-black">Dossier juridique</th>
                <th className="py-3.5 px-2 font-black">Type d'acte juridique</th>
                <th className="py-3.5 px-2 font-black">Échéance</th>
                <th className="py-3.5 px-2 font-black">Agent affecté</th>
                <th className="py-3.5 px-2 font-black">Tiers externe (Avocat/Huissier)</th>
                <th className="py-3.5 px-2 font-black">Résultat noté</th>
                <th className="py-3.5 px-2 font-black text-center whitespace-nowrap">Statut d'exécution</th>
                <th className="py-3.5 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredActions.map(a => {
                const sCfg = STATUS_LABELS[a.status] || { label: a.status, bg: 'bg-secondary', color: 'text-muted' };
                return (
                  <tr key={a.id} className="hover:bg-secondary/15 transition-all font-medium">
                    <td className="py-4 px-4 font-mono font-bold text-muted-foreground">{a.id}</td>
                    <td className="py-4 px-2">
                      <div className="font-bold text-foreground">
                        <Link to={`/litigation/${a.legal_case_id}`} className="hover:underline text-crimson">{a.legal_case_id}</Link>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{a.client_name}</div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="font-semibold text-neutral-800">{ACTION_TYPES[a.action_type] || a.action_type}</span>
                      {a.notes && <div className="text-[10px] text-muted-foreground font-normal mt-0.5 max-w-xs truncate">{a.notes}</div>}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-muted-foreground" />
                        <div>{a.action_date}</div>
                      </div>
                      {a.due_date && a.due_date !== a.action_date && (
                        <div className="text-[10px] text-crimson mt-0.5">Délai : {a.due_date}</div>
                      )}
                    </td>
                    <td className="py-4 px-2 font-semibold text-foreground">
                      {a.performed_by || "—"}
                    </td>
                    <td className="py-4 px-2 text-[11px] text-neutral-800">
                      {a.external_party || "—"}
                    </td>
                    <td className="py-4 px-2 text-[11px] text-emerald-800 max-w-xs truncate">
                      {a.result || <em className="text-muted-foreground font-normal">Aucun résultat enregistré</em>}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                        sCfg.bg, sCfg.color
                      )}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {a.status !== 'completed' ? (
                        <button
                          onClick={() => { setSelectedAction(a); setModalType('edit'); }}
                          className="px-2.5 py-1.5 bg-emerald hover:bg-emerald/90 text-white rounded text-[10px] font-black transition cursor-pointer"
                        >
                          Mettre à jour
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center justify-end gap-1 select-none">
                          <CheckCircle2 size={13} className="text-emerald" /> Traité
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredActions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground font-semibold">
                    Aucune action identifiée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl relative overflow-hidden text-card-foreground"
            >
              {modalType === 'new' ? (
                <form onSubmit={handleCreateAction} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Planifier une action contentieuse</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Dossier Juridique Lié</label>
                      <select
                        value={caseId}
                        onChange={e => setCaseId(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-cobalt font-semibold"
                        required
                      >
                        <option value="">Sélectionner un dossier...</option>
                        {legalCases.map(c => (
                          <option key={c.id} value={c.id}>{c.id} - {c.client_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Type d'acte judiciaire</label>
                        <select
                          value={actionType}
                          onChange={e => setActionType(e.target.value as any)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none"
                        >
                          {Object.entries(ACTION_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Tiers d'exécution externe</label>
                        <input
                          value={externalParty}
                          onChange={e => setExternalParty(e.target.value)}
                          placeholder="Ex: Maître Sonia Trabelsi"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Date d'action</label>
                        <input
                          type="date"
                          value={actionDate}
                          onChange={e => setActionDate(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Dernier délai légal échéance</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Note explicative / Instructions</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Préciser l'objectif de l'audience ou de l'exécution..."
                        rows={3}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-medium text-foreground resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
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
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Clôturer / Finaliser l'acte Juridique</h3>
                  
                  <p className="text-xs text-muted-foreground">
                    Action : <strong>{selectedAction ? ACTION_TYPES[selectedAction.action_type] : ''}</strong> ({selectedAction?.id})
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Statut d'exécution</label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none font-semibold"
                        required
                      >
                        <option value="completed">✓ Terminée / Exécutée avec succès</option>
                        <option value="in_progress">↺ En cours d'avancement</option>
                        <option value="overdue">⚠ Échéance dépassée / Retard</option>
                        <option value="failed">☠ Échouée (Renvoyée ou rejetée)</option>
                        <option value="cancelled">☒ Annulée</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Rapport / Résultat officiel de l'acte</label>
                      <textarea
                        value={editResult}
                        onChange={e => setEditResult(e.target.value)}
                        placeholder="Ex: Le juge a rendu son ordonnance d'injonction favorable. Titre de créance dressé par l'huissier..."
                        rows={3}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none resize-none font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Notes internes complémentaires</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Notes de vigilance pour l'équipe recouvrement..."
                        rows={2}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none resize-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedAction(null); setModalType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Enregistrer le rapport
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
