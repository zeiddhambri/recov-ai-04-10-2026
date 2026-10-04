import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, Search, Plus, CheckCircle, XCircle, 
  CreditCard, Sparkles, TrendingUp, HelpCircle 
} from 'lucide-react';
import { LegalFee, LitigationStore, LegalCase } from '@/lib/litigation-store';
import { cn } from '@/lib/utils';

interface FraisContentieuxTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

const F_TYPES: Record<string, string> = {
  lawyer_fee: 'Honoraires avocat conseil',
  bailiff_fee: 'Actes d\'huissier de justice (LRAR/PV)',
  court_fee: 'Frais de greffe / enregistrement tribunal',
  travel_fee: 'Frais de transport & vacations',
  administrative_fee: 'Frais postaux & Secrétariat judiciaire',
  collateral_seizure_fee: 'Frais de mise en fourrière / séquestre',
  collateral_sale_fee: 'Honoraires commissaire-priseur (ventes)',
  other: 'Divers frais judiciaires'
};

const F_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'En attente d\'approbation', bg: 'bg-yellow-50 text-yellow-700', color: 'text-yellow-600' },
  approved: { label: 'Approuvé (À ordonnancer)', bg: 'bg-blue-50 text-blue-700', color: 'text-blue-500' },
  paid: { label: 'Réglé par Banque', bg: 'bg-emerald-100 text-emerald-800', color: 'text-emerald' },
  recovered: { label: 'Récupéré auprès du débiteur', bg: 'bg-purple-100 text-purple-800', color: 'text-purple-700' },
  rejected: { label: 'Refusé / Rejeté', bg: 'bg-crimson/15 text-crimson', color: 'text-white' },
  written_off: { label: 'Passé en perte (Non recouvrable)', bg: 'bg-neutral-100 text-neutral-600', color: 'text-neutral-500' }
};

export default function FraisContentieuxTab({ onRefreshAll, userEmail }: FraisContentieuxTabProps) {
  const [fees, setFees] = useState<LegalFee[]>(() => LitigationStore.getLegalFees());
  const [legalCases] = useState<LegalCase[]>(() => LitigationStore.getLegalCases());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals status
  const [selectedFee, setSelectedFee] = useState<LegalFee | null>(null);
  const [modalType, setModalType] = useState<'new_fee' | 'decide' | null>(null);

  // Form values - New Fee
  const [caseId, setCaseId] = useState('');
  const [feeType, setFeeType] = useState<keyof typeof F_TYPES>('lawyer_fee');
  const [feeAmount, setFeeAmount] = useState('');
  const [recoverable, setRecoverable] = useState(true);
  const [notes, setNotes] = useState('');

  // Form values - Action Decision
  const [decisionType, setDecisionType] = useState<string>('paid');
  const [recoveredAmount, setRecoveredAmount] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  // ─── HANDLERS ───────────────────────────────────────
  
  const handleAddNewFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !feeAmount) return;

    const list = [...fees];
    const targetCase = legalCases.find(c => c.id === caseId);

    const newFee: LegalFee = {
      id: `FEE-${Math.floor(10000 + Math.random() * 90000)}`,
      legal_case_id: caseId,
      client_name: targetCase ? targetCase.client_name : "Client Inconnu",
      fee_type: feeType,
      amount: parseFloat(feeAmount),
      currency: "TND",
      incurred_at: new Date().toISOString().slice(0, 10),
      recoverable_from_client: recoverable,
      recovered_amount: 0,
      status: 'pending',
      notes: notes
    };

    list.unshift(newFee);
    LitigationStore.saveLegalFees(list);
    setFees(list);

    // Increment local legal_case fees engaged
    const legalCasesList = LitigationStore.getLegalCases();
    const caseIdx = legalCasesList.findIndex(c => c.id === caseId);
    if (caseIdx !== -1) {
      legalCasesList[caseIdx].legal_fees_due += parseFloat(feeAmount);
      legalCasesList[caseIdx].total_claim_amount += parseFloat(feeAmount);
      legalCasesList[caseIdx].remaining_amount += parseFloat(feeAmount);
      LitigationStore.saveLegalCases(legalCasesList);
    }

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Enregistrement frais', 
      `Engagement de charge pour "${F_TYPES[feeType]}" valued at ${parseFloat(feeAmount).toLocaleString()} TND (Numéro d'affaire : ${caseId})`
    );

    // reset Form
    setCaseId('');
    setFeeAmount('');
    setNotes('');
    setModalType(null);
    onRefreshAll();
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    const list = [...fees];
    const index = list.findIndex(f => f.id === selectedFee.id);
    if (index === -1) return;

    list[index].status = decisionType as any;
    
    if (decisionType === 'paid') {
      list[index].paid_at = new Date().toISOString().slice(0, 10);
      list[index].paid_by = userEmail || "Trésorerie Centrale";
    }
    
    if (decisionType === 'recovered') {
      const recAmt = parseFloat(recoveredAmount) || selectedFee.amount;
      list[index].recovered_amount = recAmt;
      
      // Amortize on case
      const legalCasesList = LitigationStore.getLegalCases();
      const caseIdx = legalCasesList.findIndex(c => c.id === selectedFee.legal_case_id);
      if (caseIdx !== -1) {
        legalCasesList[caseIdx].recovered_amount += recAmt;
        legalCasesList[caseIdx].remaining_amount = Math.max(0, legalCasesList[caseIdx].total_claim_amount - legalCasesList[caseIdx].recovered_amount);
        legalCasesList[caseIdx].recovery_rate = (legalCasesList[caseIdx].recovered_amount / legalCasesList[caseIdx].total_claim_amount) * 100;
        LitigationStore.saveLegalCases(legalCasesList);
      }
    }

    if (decisionType === 'written_off') {
      // passed as loss
    }

    if (decisionNotes) {
      list[index].notes = decisionNotes;
    }

    LitigationStore.saveLegalFees(list);
    setFees(list);

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Règlement de frais', 
      `Arbitrage des frais contentieux pour la charge ${selectedFee.id} : validation en état "${decisionType}"`
    );

    // Reset Form
    setSelectedFee(null);
    setModalType(null);
    setRecoveredAmount('');
    onRefreshAll();
  };

  // ─── FILTER COMPUTATIONS ─────────────────────────────
  
  const filteredFees = useMemo(() => {
    return fees.filter(f => {
      const matchSearch = !search ||
        f.client_name.toLowerCase().includes(search.toLowerCase()) ||
        f.id.toLowerCase().includes(search.toLowerCase()) ||
        f.legal_case_id.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchType = typeFilter === 'All' || f.fee_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [fees, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const totalEngaged = fees.filter(f => f.status === 'paid' || f.status === 'recovered').reduce((sum, f) => sum + f.amount, 0);
    const totalRecoveredSum = fees.reduce((sum, f) => sum + f.recovered_amount, 0);
    const pendingSum = fees.filter(f => f.status === 'pending' || f.status === 'approved').reduce((sum, f) => sum + f.amount, 0);
    const lostSum = fees.filter(f => f.status === 'written_off').reduce((sum, f) => sum + f.amount, 0);
    
    // calcul ratio d'efficience globale des frais vis à vis du recouvrement des frais
    const efficiencyRatio = totalEngaged > 0 ? (totalRecoveredSum / totalEngaged) * 100 : 0;
    
    return { totalEngaged, totalRecoveredSum, pendingSum, lostSum, efficiencyRatio };
  }, [fees]);

  return (
    <div className="space-y-6">
      {/* ─── KPIS GRIDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Frais judiciaires avancés</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalEngaged.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-purple-750">Frais re-encaissés (Recouvrés)</p>
          <p className="text-xl font-bold text-purple-700 mt-0.5">{stats.totalRecoveredSum.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-amber-500">Avances en cours d'accord</p>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{stats.pendingSum.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground mr-1">perte sèche contentieuse</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{stats.lostSum.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm col-span-2 lg:col-span-1 border-l-emerald/50">
          <p className="text-[10px] font-black uppercase text-emerald">Taux récupération des coûts</p>
          <p className="text-xl font-bold text-emerald mt-0.5">{stats.efficiencyRatio.toFixed(1)} %</p>
        </div>
      </div>

      {/* ─── FILTERS ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher des charges contentieuses (Client, Code charge, N° de cas)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border/60 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tout type de charge</option>
          {Object.entries(F_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tous les états comptables</option>
          {Object.entries(F_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <button 
          onClick={() => { setModalType('new_fee'); }}
          className="px-4 py-2 bg-crimson hover:bg-crimson/95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
        >
          <Plus size={14} /> Engager des frais
        </button>
      </div>

      {/* ─── DATA REGISTER TABLE ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3 px-4 font-black">N° Facture / Charge</th>
                <th className="py-3 px-2 font-black">Dossier juridique</th>
                <th className="py-3 px-2 font-black">Typologie comptable</th>
                <th className="py-3 px-2 font-black">Bénéficiaire & Notes de paiement</th>
                <th className="py-3 px-2 font-black text-right">Montant déboursé</th>
                <th className="py-3 px-2 font-black text-right">Montant récupéré client</th>
                <th className="py-3 px-2 font-black text-center border-l whitespace-nowrap">Récupérabilité</th>
                <th className="py-3 px-2 font-black text-center whitespace-nowrap">État comptable</th>
                <th className="py-3 px-4 font-black text-right">Arbitrage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium text-foreground">
              {filteredFees.map(f => {
                const sCfg = F_STATUS[f.status] || { label: f.status, bg: 'bg-secondary', color: 'text-muted-foreground' };
                return (
                  <tr key={f.id} className="hover:bg-secondary/15 transition font-medium">
                    <td className="py-4 px-4 font-mono font-bold text-muted-foreground">{f.id}</td>
                    <td className="py-4 px-2">
                      <Link to={`/litigation/${f.legal_case_id}`} className="hover:underline text-crimson font-bold">{f.legal_case_id}</Link>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{f.client_name}</div>
                    </td>
                    <td className="py-4 px-2 font-semibold">
                      {F_TYPES[f.fee_type] || f.fee_type}
                    </td>
                    <td className="py-4 px-2 text-neutral-800 font-semibold max-w-sm truncate text-[11px]">
                      {f.notes || "—"}
                      {f.paid_at && <div className="text-[9px] text-emerald mt-1 font-mono">Date règlement trésorerie : {f.paid_at}</div>}
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-foreground">
                      {f.amount.toLocaleString('fr-FR')} TND
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-emerald">
                      {f.recovered_amount ? `${f.recovered_amount.toLocaleString('fr-FR')} TND` : '—'}
                    </td>
                    <td className="py-4 px-2 text-center border-l">
                      {f.recoverable_from_client ? (
                        <span className="text-[9px] font-black uppercase text-emerald bg-emerald/10 border border-emerald/20 px-1.5 py-0.5 rounded">
                          RÉCUPÉRABLE
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/40">
                          CHARGE RECOV
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase px-2 py-0.5 rounded border whitespace-nowrap",
                        sCfg.bg
                      )}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {f.status !== 'recovered' && f.status !== 'written_off' ? (
                        <button
                          onClick={() => { setSelectedFee(f); setModalType('decide'); }}
                          className="px-2.5 py-1.5 bg-secondary hover:bg-neutral-200 border border-border text-[10px] font-black rounded transition cursor-pointer"
                        >
                          Décider
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-black flex items-center justify-end gap-1 select-none">
                          <CheckCircle className="text-emerald" size={13} /> Arbitré
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground font-semibold">
                    Aucune charge ou taxe d'adjudication répertoriée.
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
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl text-card-foreground"
            >
              {modalType === 'new_fee' ? (
                <form onSubmit={handleAddNewFee} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Engager / Saisir une charge judiciaire</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Dossier Juridique Ciblé</label>
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
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Type de frais</label>
                        <select
                          value={feeType}
                          onChange={e => setFeeType(e.target.value as any)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-semibold text-foreground"
                        >
                          {Object.entries(F_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Montant réclamé (TND)</label>
                        <input
                          type="number"
                          value={feeAmount}
                          onChange={e => setFeeAmount(e.target.value)}
                          placeholder="Ex: 1500"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-bold focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rec"
                        checked={recoverable}
                        onChange={e => setRecoverable(e.target.checked)}
                        className="rounded border border-border focus:ring-cobalt focus:ring-1 bg-secondary text-cobalt h-4 w-4"
                      />
                      <label htmlFor="rec" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Frais récupérables auprès du débiteur (Client)
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground mb-1">Libellé / Destinataire des fonds</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Facture d'honoraires SCP Sonia Trabelsi n°125..."
                        rows={2}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none resize-none font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200"
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
                <form onSubmit={handleDecisionSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Arbitrage comptable des frais</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed animate-fade-in">
                    Frais visé : <strong>{selectedFee ? F_TYPES[selectedFee.fee_type] : ''}</strong> ({selectedFee?.id}) · Coût : <span className="font-bold text-foreground">{selectedFee?.amount.toLocaleString()} TND</span>
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Décision d'Ordonnancement</label>
                      <select
                        value={decisionType}
                        onChange={e => setDecisionType(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground font-black focus:outline-none"
                        required
                      >
                        <option value="paid">✓ Ordonner le paiement par la Banque (Réglé)</option>
                        <option value="recovered">✓ Encaisser le remboursement total/partiel du débiteur (Récupéré)</option>
                        <option value="written_off">☠ Passer définitivement en perte sèche</option>
                        <option value="rejected">☒ Rejeter la dépense (Refusé)</option>
                      </select>
                    </div>

                    {decisionType === 'recovered' && (
                      <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Montant perçu remboursé par le client (TND)</label>
                        <input
                          type="number"
                          value={recoveredAmount}
                          onChange={e => setRecoveredAmount(e.target.value)}
                          placeholder={`Laisser vide pour solder totalement (${selectedFee?.amount} TND)`}
                          className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground font-black focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Raison administrative ou justificatif</label>
                      <textarea
                        value={decisionNotes}
                        onChange={e => setDecisionNotes(e.target.value)}
                        placeholder="Ex: Facture réglée par virement du compte d'exploitation RecovAI..."
                        rows={2}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none resize-none font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedFee(null); setModalType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Enregistrer décisions
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
