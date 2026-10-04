import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderLock, Search, Plus, Gavel, RefreshCcw, 
  Send, Users, CheckCircle2, ShieldAlert, Coins, HelpCircle 
} from 'lucide-react';
import { Collateral, Guarantor, LitigationStore, LegalCase } from '@/lib/litigation-store';
import { cn } from '@/lib/utils';

interface GarantiesCautionsTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

const COLLATERAL_TYPES: Record<string, string> = {
  equipment: 'Matériel industriel / outillage',
  vehicle: 'Véhicule de transport / logistique',
  inventory: 'Nantissement de stock',
  land: 'Hypothèque foncière terrain',
  building: 'Hypothèque lourde immobilier commercial',
  savings_deposit: 'Gage sur dépôt d\'épargne',
  salary_assignment: 'Cession de rémunération',
  invoice_receivable: 'Nantissement de créances / factures',
  other: 'Autre gage mobilier'
};

const COLLATERAL_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Active / Non saisie', bg: 'bg-emerald-100 text-emerald-800', color: 'text-emerald' },
  under_review: { label: 'Audit d\'évaluation', bg: 'bg-blue-50 text-blue-700', color: 'text-blue-500' },
  seizure_recommended: { label: 'Saisie recommandée', bg: 'bg-orange-50 text-orange-700', color: 'text-orange-600' },
  seizure_started: { label: 'Commandement de saisie signifié', bg: 'bg-purple-100 text-purple-800', color: 'text-purple-700' },
  seized: { label: 'Saisie conservatoire physique', bg: 'bg-indigo-100 text-indigo-800', color: 'text-indigo-600' },
  sold: { label: 'Collatéral réalisé / Vendu aux enchères', bg: 'bg-neutral-100 text-neutral-600', color: 'text-neutral-500' },
  released: { label: 'Garantie libérée (Mainlevée)', bg: 'bg-emerald-50 text-emerald-700', color: 'text-emerald' }
};

const GUARANTOR_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Mise en demeure envoyée', bg: 'bg-amber-100 text-amber-800' },
  payment_requested: { label: 'Appel en règlement exigé', bg: 'bg-purple-100 text-purple-800' },
  paid: { label: 'Apuré par la caution', bg: 'bg-emerald-100 text-emerald-800' },
  refused: { label: 'Refus de payer / Obstruction', bg: 'bg-crimson/10 text-crimson' },
  legal_action_started: { label: 'Poursuite individuelle engagée', bg: 'bg-indigo-100 text-indigo-800' },
  released: { label: 'Déchargé de caution d\'Amende', bg: 'bg-neutral-100 text-neutral-600' }
};

export default function GarantiesCautionsTab({ onRefreshAll, userEmail }: GarantiesCautionsTabProps) {
  const [collaterals, setCollaterals] = useState<Collateral[]>(() => LitigationStore.getCollaterals());
  const [guarantors, setGuarantors] = useState<Guarantor[]>(() => LitigationStore.getGuarantors());
  const [legalCases] = useState<LegalCase[]>(() => LitigationStore.getLegalCases());

  const [search, setSearch] = useState('');
  
  // Modals active state
  const [selectedCol, setSelectedCol] = useState<Collateral | null>(null);
  const [selectedGua, setSelectedGua] = useState<Guarantor | null>(null);
  const [modalType, setModalType] = useState<'new_collateral' | 'new_guarantor' | 'seizure' | 'guarantor_summon' | null>(null);

  // Form values - Collateral
  const [caseId, setCaseId] = useState('');
  const [colType, setColType] = useState<keyof typeof COLLATERAL_TYPES>('building');
  const [colDesc, setColDesc] = useState('');
  const [colVal, setColVal] = useState('');

  // Form values - Guarantor
  const [guaName, setGuaName] = useState('');
  const [guaPhone, setGuaPhone] = useState('');
  const [guaRelation, setGuaRelation] = useState('');
  const [guaAmt, setGuaAmt] = useState('');

  // Form values - Action Summons
  const [saleAmount, setSaleAmount] = useState('');
  const [summonNotes, setSummonNotes] = useState('');

  // ─── HANDLERS ───────────────────────────────────────
  
  const handleAddCollateralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !colDesc || !colVal) return;

    const list = [...collaterals];
    const targetCase = legalCases.find(c => c.id === caseId);

    const newCol: Collateral = {
      id: `COL-${Math.floor(1000 + Math.random() * 9000)}`,
      legal_case_id: caseId,
      client_name: targetCase ? targetCase.client_name : "Client Inconnu",
      collateral_type: colType,
      description: colDesc,
      estimated_value: parseFloat(colVal),
      current_value: parseFloat(colVal),
      status: 'active'
    };

    list.unshift(newCol);
    LitigationStore.saveCollaterals(list);
    setCollaterals(list);

    // mark case as having collateral
    const legalCasesList = LitigationStore.getLegalCases();
    const caseIdx = legalCasesList.findIndex(c => c.id === caseId);
    if (caseIdx !== -1) {
      legalCasesList[caseIdx].has_collateral = true;
      LitigationStore.saveLegalCases(legalCasesList);
    }

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Enregistrement garantie', 
      `Assujettissement d'une garantie de type "${COLLATERAL_TYPES[colType]}" valued at ${parseFloat(colVal).toLocaleString()} TND pour ${caseId}`
    );

    // reset
    setCaseId('');
    setColDesc('');
    setColVal('');
    setModalType(null);
    onRefreshAll();
  };

  const handleAddGuarantorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !guaName || !guaAmt) return;

    const list = [...guarantors];
    const targetCase = legalCases.find(c => c.id === caseId);

    const newGua: Guarantor = {
      id: `GUA-${Math.floor(1000 + Math.random() * 9000)}`,
      legal_case_id: caseId,
      client_name: targetCase ? targetCase.client_name : "Client Inconnu",
      full_name: guaName,
      phone: guaPhone || '—',
      address: 'Tunis, Tunisie',
      relationship: guaRelation || 'Cautionnaire',
      guarantee_amount: parseFloat(guaAmt),
      status: 'active'
    };

    list.unshift(newGua);
    LitigationStore.saveGuarantors(list);
    setGuarantors(list);

    // mark case as having guarantor
    const legalCasesList = LitigationStore.getLegalCases();
    const caseIdx = legalCasesList.findIndex(c => c.id === caseId);
    if (caseIdx !== -1) {
      legalCasesList[caseIdx].has_guarantor = true;
      LitigationStore.saveLegalCases(legalCasesList);
    }

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Enregistrement caution', 
      `Cautionnement solidaire de ${guaName} enregistré (${parseFloat(guaAmt).toLocaleString()} TND)`
    );

    // reset
    setCaseId('');
    setGuaName('');
    setGuaPhone('');
    setGuaRelation('');
    setGuaAmt('');
    setModalType(null);
    onRefreshAll();
  };

  const handleSeizureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCol) return;

    const list = [...collaterals];
    const idx = list.findIndex(c => c.id === selectedCol.id);
    if (idx === -1) return;

    // advance physical seizure or record sale
    const currentStatus = list[idx].status;
    if (currentStatus === 'active' || currentStatus === 'under_review') {
      list[idx].status = 'seizure_started';
      list[idx].seizure_started_at = new Date().toISOString().slice(0, 10);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Saisie de garantie', `Signification du commandement aux fins de saisie immobilière/mobilière pour ${selectedCol.id}`);
    } 
    else if (currentStatus === 'seizure_started') {
      list[idx].status = 'seized';
      list[idx].seized_at = new Date().toISOString().slice(0, 10);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Saisie de garantie', `PV de saisie conservatoire physique par huissier scellant l'actif ${selectedCol.id}`);
    } 
    else if (currentStatus === 'seized') {
      const realSaleAmt = parseFloat(saleAmount);
      if (realSaleAmt) {
        list[idx].status = 'sold';
        list[idx].sold_at = new Date().toISOString().slice(0, 10);
        list[idx].sale_amount = realSaleAmt;
        
        // Simuler versement de la vente aux enchere sur le dossier contentieux pour l'amortir
        const legalCasesList = LitigationStore.getLegalCases();
        const caseIdx = legalCasesList.findIndex(c => c.id === selectedCol.legal_case_id);
        if (caseIdx !== -1) {
          legalCasesList[caseIdx].recovered_amount += realSaleAmt;
          legalCasesList[caseIdx].remaining_amount = Math.max(0, legalCasesList[caseIdx].total_claim_amount - legalCasesList[caseIdx].recovered_amount);
          legalCasesList[caseIdx].recovery_rate = (legalCasesList[caseIdx].recovered_amount / legalCasesList[caseIdx].total_claim_amount) * 100;
          if (legalCasesList[caseIdx].remaining_amount === 0) {
            legalCasesList[caseIdx].status = 'closed';
          }
          LitigationStore.saveLegalCases(legalCasesList);
        }
        
        LitigationStore.logAction(userEmail || 'user@recovai.com', 'Vente forcée de garantie', `Réalisation aux enchères de ${selectedCol.id} : adjudication prononcée pour ${realSaleAmt.toLocaleString()} TND créditée au solde restant.`);
      }
    }

    LitigationStore.saveCollaterals(list);
    setCollaterals(list);

    // reset
    setSelectedCol(null);
    setModalType(null);
    setSaleAmount('');
    onRefreshAll();
  };

  const handleGuarantorClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGua) return;

    const list = [...guarantors];
    const idx = list.findIndex(g => g.id === selectedGua.id);
    if (idx === -1) return;

    const currentStatus = list[idx].status;
    if (currentStatus === 'active') {
      list[idx].status = 'contacted';
      list[idx].contacted_at = new Date().toISOString().slice(0, 10);
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Mise en cause caution', `Envoi de la mise en demeure de payer par lettre recommandée AR à la caution solidaire ${selectedGua.full_name}`);
    } 
    else if (currentStatus === 'contacted') {
      list[idx].status = 'payment_requested';
      LitigationStore.logAction(userEmail || 'user@recovai.com', 'Commandement caution', `Assignation formelle devant la cour d'Amende commerciale visant la caution solidaire ${selectedGua.full_name}`);
    }

    LitigationStore.saveGuarantors(list);
    setGuarantors(list);

    // Reset
    setSelectedGua(null);
    setModalType(null);
    onRefreshAll();
  };

  // ─── FILTER COMPUTATION ─────────────────────────────
  
  const filteredCollaterals = useMemo(() => {
    return collaterals.filter(c => {
      return !search ||
        c.client_name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.legal_case_id.toLowerCase().includes(search.toLowerCase());
    });
  }, [collaterals, search]);

  const filteredGuarantors = useMemo(() => {
    return guarantors.filter(g => {
      return !search ||
        g.client_name.toLowerCase().includes(search.toLowerCase()) ||
        g.full_name.toLowerCase().includes(search.toLowerCase()) ||
        g.legal_case_id.toLowerCase().includes(search.toLowerCase());
    });
  }, [guarantors, search]);

  const totals = useMemo(() => {
    const value = collaterals.reduce((sum, c) => sum + c.estimated_value, 0);
    const mobilized = collaterals.filter(c => c.status === 'seized' || c.status === 'sold').length;
    const soldSum = collaterals.filter(c => c.status === 'sold').reduce((sum, c) => sum + (c.sale_amount || 0), 0);
    return { value, mobilized, soldSum };
  }, [collaterals]);

  return (
    <div className="space-y-6">
      {/* ─── KPIS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Valeur active sous garantie</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{totals.value.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-purple-700">Garanties en cours de saisie</p>
          <p className="text-xl font-bold text-purple-700 mt-0.5">{totals.mobilized} garanties</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-emerald">Montant réalisé (Ventes)</p>
          <p className="text-xl font-bold text-emerald mt-0.5">{totals.soldSum.toLocaleString('fr-FR')} TND</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground mr-1">Taux de couverture</p>
          <p className="text-xl font-bold text-foreground mt-0.5">127 %</p>
        </div>
      </div>

      {/* ─── FILTERS ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher garanties ou cautions solidaires (Client, Nom, N° d'affaire)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border/60 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('new_collateral'); }}
            className="px-4 py-2 bg-crimson hover:bg-crimson/95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Associer garantie
          </button>
          <button 
            onClick={() => { setModalType('new_guarantor'); }}
            className="px-4 py-2 bg-secondary text-foreground hover:bg-neutral-200 border border-border/60 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Associer caution
          </button>
        </div>
      </div>

      {/* ─── SECTION 1: REAL COLLATERALS ─── */}
      <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 bg-secondary/20 border-b border-border">
          <h3 className="text-xs font-black uppercase text-[hsl(var(--charcoal))] flex items-center gap-2">
            <FolderLock size={15} className="text-cobalt" />
            Registre des Garanties Réelles (Hypothèques, Gages, Nantissements)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3 px-4 font-black">ID Garantie</th>
                <th className="py-3 px-2 font-black">Client lié (ID Case)</th>
                <th className="py-3 px-2 font-black">Type administratif</th>
                <th className="py-3 px-2 font-black">Description & Détails de l'actif</th>
                <th className="py-3 px-2 font-black text-right">Valeur d'expertise</th>
                <th className="py-3 px-2 font-black text-right">Montant d'adjudication</th>
                <th className="py-3 px-2 font-black text-center whitespace-nowrap border-l">Statut de saisie</th>
                <th className="py-3 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCollaterals.map(c => {
                const sCfg = COLLATERAL_STATUS[c.status] || { label: c.status, bg: 'bg-secondary', color: 'text-muted' };
                return (
                  <tr key={c.id} className="hover:bg-secondary/15 transition font-medium text-foreground">
                    <td className="py-4 px-4 font-mono font-bold text-muted-foreground">{c.id}</td>
                    <td className="py-4 px-2">
                      <div className="font-bold">{c.client_name}</div>
                      <Link to={`/litigation/${c.legal_case_id}`} className="text-[10px] text-crimson hover:underline font-mono">{c.legal_case_id}</Link>
                    </td>
                    <td className="py-4 px-2 font-semibold">
                      {COLLATERAL_TYPES[c.collateral_type] || c.collateral_type}
                    </td>
                    <td className="py-4 px-2 text-neutral-800 font-semibold max-w-sm shrink-0">
                      {c.description}
                      {c.seizure_started_at && <div className="text-[9px] text-purple-650 mt-1 font-mono">Date commandement d'huissier : {c.seizure_started_at}</div>}
                      {c.seized_at && <div className="text-[9px] text-indigo-650 font-mono">Date PV de saisie conservatoire : {c.seized_at}</div>}
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-foreground">
                      {c.estimated_value.toLocaleString('fr-FR')} TND
                    </td>
                    <td className="py-4 px-2 text-right font-bold text-emerald">
                      {c.sale_amount ? `${c.sale_amount.toLocaleString('fr-FR')} TND` : '—'}
                    </td>
                    <td className="py-4 px-2 border-l text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap",
                        sCfg.bg
                      )}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {c.status !== 'sold' && c.status !== 'released' ? (
                        <button
                          onClick={() => { setSelectedCol(c); setModalType('seizure'); }}
                          className="px-2.5 py-1.5 bg-purple-100 border border-purple-300 text-purple-700 hover:bg-purple-200 text-[10px] font-black rounded transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Gavel size={11} />
                          {c.status === 'active' && 'Lancer saisie'}
                          {c.status === 'seizure_started' && 'Dresser PV Saisie'}
                          {c.status === 'seized' && 'Prononcer adjudication'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-black flex items-center justify-end gap-1 select-none">
                          <CheckCircle2 size={13} className="text-emerald" /> Garantie close (liquidée)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCollaterals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground font-semibold">
                    Aucune garantie réelle sur ces affaires.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── SECTION 2: PERSONAL GUARANTORS ─── */}
      <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 bg-secondary/20 border-b border-border">
          <h3 className="text-xs font-black uppercase text-[hsl(var(--charcoal))] flex items-center gap-2">
            <Users size={15} className="text-cobalt" />
            Registre des Cautions Personnelles & Solidaires (Organes dirrigants, Garants externes)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3 px-4 font-black">ID Caution</th>
                <th className="py-3 px-2 font-black">Client lié (ID Case)</th>
                <th className="py-3 px-2 font-black">Nom complet de la caution</th>
                <th className="py-3 px-2 font-black">Téléphone</th>
                <th className="py-3 px-2 font-black">Lien avec l'affaire</th>
                <th className="py-3 px-2 font-black text-right">Couverture cautionnée</th>
                <th className="py-3 px-2 font-black text-center border-l">Statut de réclamation</th>
                <th className="py-3 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredGuarantors.map(g => {
                const sCfg = GUARANTOR_STATUS[g.status] || { label: g.status, bg: 'bg-secondary' };
                return (
                  <tr key={g.id} className="hover:bg-secondary/15 transition font-medium text-foreground">
                    <td className="py-4 px-4 font-mono font-bold text-muted-foreground">{g.id}</td>
                    <td className="py-4 px-2">
                      <div className="font-bold">{g.client_name}</div>
                      <Link to={`/litigation/${g.legal_case_id}`} className="text-[10px] text-crimson hover:underline font-mono">{g.legal_case_id}</Link>
                    </td>
                    <td className="py-4 px-2 font-bold text-neutral-800">
                      {g.full_name}
                    </td>
                    <td className="py-4 px-2 font-bold">
                      {g.phone}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground">
                      {g.relationship}
                      {g.contacted_at && <div className="text-[9px] text-amber-500 mt-1 font-mono">Relancé le : {g.contacted_at}</div>}
                    </td>
                    <td className="py-4 px-2 text-right font-black text-foreground">
                      {g.guarantee_amount.toLocaleString('fr-FR')} TND
                    </td>
                    <td className="py-4 px-2 border-l text-center">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase px-2 py-0.5 rounded border whitespace-nowrap",
                        sCfg.bg
                      )}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {g.status !== 'paid' && g.status !== 'released' ? (
                        <button
                          onClick={() => { setSelectedGua(g); setModalType('guarantor_summon'); }}
                          className="px-2.5 py-1.5 bg-secondary hover:bg-neutral-200 border border-border text-[10px] font-black rounded transition cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <Send size={11} className="text-muted-foreground" />
                          {g.status === 'active' && 'Envoyer mise en demeure'}
                          {g.status === 'contacted' && 'Assigner en justice'}
                          {g.status === 'payment_requested' && 'Relancer de paiement'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end gap-1 select-none">
                          <CheckCircle2 size={13} className="text-emerald" /> caution libérée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredGuarantors.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground font-semibold">
                    Aucune caution personnelle enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
              {modalType === 'new_collateral' && (
                <form onSubmit={handleAddCollateralSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground">Assujettir un Collatéral de garantie</h3>
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
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Typologie du gage</label>
                        <select
                          value={colType}
                          onChange={e => setColType(e.target.value as any)}
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-semibold text-foreground"
                        >
                          {Object.entries(COLLATERAL_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Estimation expert (TND)</label>
                        <input
                          type="number"
                          value={colVal}
                          onChange={e => setColVal(e.target.value)}
                          placeholder="Ex: 120000"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-bold focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground mb-1">Description physique de l'Actif mobilisé</label>
                      <textarea
                        value={colDesc}
                        onChange={e => setColDesc(e.target.value)}
                        placeholder="Ex: Titre foncier n°155502, Immeuble à usage professionnel R+2 Belvédère..."
                        rows={3}
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
              )}

              {modalType === 'new_guarantor' && (
                <form onSubmit={handleAddGuarantorSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground">Initialiser un acte de caution solidaire</h3>
                  
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

                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground mb-1">Nom complet du garant caution</label>
                      <input
                        value={guaName}
                        onChange={e => setGuaName(e.target.value)}
                        placeholder="Ex: Sami Cherif"
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-bold focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Téléphone portable garant</label>
                        <input
                          value={guaPhone}
                          onChange={e => setGuaPhone(e.target.value)}
                          placeholder="Ex: +216 98..."
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground mb-1">Plafond cautionné (TND)</label>
                        <input
                          type="number"
                          value={guaAmt}
                          onChange={e => setGuaAmt(e.target.value)}
                          placeholder="Ex: 50000"
                          className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-bold focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground mb-1">Lien de parenté / Relation commerciale</label>
                      <input
                        value={guaRelation}
                        onChange={e => setGuaRelation(e.target.value)}
                        placeholder="Ex: Gérant associé, Conjoint..."
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-semibold focus:outline-none"
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
              )}

              {modalType === 'seizure' && (
                <form onSubmit={handleSeizureSubmit} className="space-y-4 font-medium">
                  <h3 className="text-sm font-black uppercase text-foreground">Action d'exécution forcée sur collatéral</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Garantie visée : <strong>{selectedCol?.description}</strong> ({selectedCol?.id}) · Valeur expert : <span className="font-bold">{selectedCol?.estimated_value.toLocaleString()} TND</span>
                  </p>

                  <div className="p-3 bg-secondary/40 border border-border text-xs rounded-xl space-y-1.5 text-neutral-805 leading-relaxed">
                    {selectedCol?.status === 'active' && (
                      <p>✓ Étape 1 : <strong>Signification de commandement d'huissier</strong>. Cette étape lance officiellement la procédure d'inscription de saisie immobilière/mobilière au registre légal.</p>
                    )}
                    {selectedCol?.status === 'seizure_started' && (
                      <p>✓ Étape 2 : <strong>Dressage du procès-verbal de saisie</strong>. L'huissier de justice dresse le PV scellant physiquement l'actif sur place.</p>
                    )}
                    {selectedCol?.status === 'seized' && (
                      <p>✓ Étape 3 : <strong>Réalisation judiciaire (Vente aux enchères)</strong>. L'actif est adjugé sous autorité de justice au plus offrant, et les fonds de recouvrement sont perçus.</p>
                    )}
                  </div>

                  {selectedCol?.status === 'seized' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Montant perçu lors de l'adjudication (TND)</label>
                      <input
                        type="number"
                        value={saleAmount}
                        onChange={e => setSaleAmount(e.target.value)}
                        placeholder="Ex: 145000"
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground font-black focus:outline-none focus:ring-1 focus:ring-cobalt"
                        required
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedCol(null); setModalType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-purple-750 text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Confirmer l'avancement
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'guarantor_summon' && (
                <form onSubmit={handleGuarantorClaimSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Relancer / Assigner la caution solidaire</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Garant : <strong>{selectedGua?.full_name}</strong> · Plafond engagement : <span className="font-bold text-foreground">{selectedGua?.guarantee_amount.toLocaleString()} TND</span>
                  </p>

                  <div className="p-3 bg-secondary/40 border border-border text-xs rounded-xl space-y-1.5 text-neutral-805 leading-relaxed font-semibold">
                    {selectedGua?.status === 'active' && (
                      <p>✓ Étape 1 : <strong>Lettre de mise en demeure formelle</strong> exigant la couverture immédiate de la créance due par le débiteur principal.</p>
                    )}
                    {selectedGua?.status === 'contacted' && (
                      <p>✓ Étape 2 : <strong>Assignation d'Amende solidaire</strong>. Dépôt de requête devant la cour de commerce demandant la condamnation solidaire de la caution.</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4 font-medium">
                    <button
                      type="button"
                      onClick={() => { setSelectedGua(null); setModalType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Exécuter la sommation
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
