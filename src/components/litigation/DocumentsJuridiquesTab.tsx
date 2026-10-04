import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Search, Plus, CheckCircle, AlertTriangle, 
  XSquare, Trash2, Eye, ShieldAlert, BadgeHelp, Upload 
} from 'lucide-react';
import { LegalDocument, LitigationStore, LegalCase } from '@/lib/litigation-store';
import { cn } from '@/lib/utils';

interface DocumentsJuridiquesTabProps {
  onRefreshAll: () => void;
  userEmail?: string;
}

const DOC_TYPES: Record<string, string> = {
  loan_contract: 'Contrat de prêt / ligne',
  leasing_contract: 'Contrat de Leasing matériel',
  factoring_assignment: 'Bordereau de cession Factoring',
  invoice: 'Facture impayée certifiée',
  repayment_schedule: 'Tableau d\'amortissement initial',
  payment_history: 'Relevé historique de compte',
  reminder_history: 'Historique des lettres de rappel',
  formal_notice: 'Mise en demeure exploit huissier',
  client_id_document: 'Pièce d\'identité / Statuts STE',
  collateral_document: 'Titre de propriété / Hypothèque',
  guarantor_agreement: 'Acte de caution solidaire',
  court_filing: 'Copie requête enregistrée au greffe',
  court_summons: 'Assignation à comparaître signifiée',
  judgment: 'Copie officielle du Jugement rendu',
  enforcement_order: 'Titre exécutoire certifié conforme',
  bailiff_report: 'Procès-verbal d\'huissier',
  settlement_agreement: 'Protocole transactionnel signé',
  write_off_approval: 'Accord écrit de passage en perte'
};

const VERIF_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  missing: { label: 'Manquant', bg: 'bg-red-50 text-red-700', color: 'text-crimson' },
  uploaded: { label: 'Reçu / À valider', bg: 'bg-amber-100 text-amber-800', color: 'text-amber-600' },
  under_review: { label: 'En cours d\'examen', bg: 'bg-blue-50 text-blue-700', color: 'text-blue-500' },
  verified: { label: 'Vérifié & Conforme', bg: 'bg-emerald-100 text-emerald-800', color: 'text-emerald' },
  rejected: { label: 'Refusé / Non-conforme', bg: 'bg-crimson/15 text-crimson', color: 'text-crimson' },
  expired: { label: 'Expiré', bg: 'bg-neutral-100 text-neutral-600', color: 'text-neutral-500' }
};

export default function DocumentsJuridiquesTab({ onRefreshAll, userEmail }: DocumentsJuridiquesTabProps) {
  const [documents, setDocuments] = useState<LegalDocument[]>(() => LitigationStore.getLegalDocuments());
  const [legalCases] = useState<LegalCase[]>(() => LitigationStore.getLegalCases());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals status
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [modalType, setModalType] = useState<'upload' | 'verify' | null>(null);

  // Form - New Upload Document
  const [caseId, setCaseId] = useState('');
  const [docType, setDocType] = useState<keyof typeof DOC_TYPES>('loan_contract');
  const [docName, setDocName] = useState('');
  const [notes, setNotes] = useState('');

  // Form - Verify
  const [verifStatus, setVerifStatus] = useState<string>('verified');
  const [verifNotes, setVerifNotes] = useState('');

  // ─── HANDLERS ───────────────────────────────────────
  
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !docName) return;

    const list = [...documents];
    const targetCase = legalCases.find(c => c.id === caseId);

    const newDoc: LegalDocument = {
      id: `DOC-${Math.floor(10000 + Math.random() * 90000)}`,
      legal_case_id: caseId,
      client_name: targetCase ? targetCase.client_name : "Client Inconnu",
      document_type: docType,
      document_name: docName,
      required: true,
      verified: false,
      verification_status: 'uploaded',
      uploaded_by: userEmail || "Juriste RecovAI",
      uploaded_at: new Date().toISOString().slice(0, 10),
      notes: notes
    };

    list.unshift(newDoc);
    LitigationStore.saveLegalDocuments(list);
    setDocuments(list);

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Dépôt document', 
      `Téléchargement du document "${DOC_TYPES[docType]}" (${docName}) pour le cas ${caseId}`
    );

    // Reset
    setCaseId('');
    setDocName('');
    setNotes('');
    setModalType(null);
    onRefreshAll();
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const list = [...documents];
    const index = list.findIndex(d => d.id === selectedDoc.id);
    if (index === -1) return;

    list[index].verification_status = verifStatus as any;
    list[index].verified = verifStatus === 'verified';
    list[index].verified_by = userEmail || 'Juriste Expert';
    list[index].verified_at = new Date().toISOString().slice(0, 10);
    if (verifNotes) {
      list[index].notes = verifNotes;
    }

    // Adapt case missing docs counts
    const legalCasesList = LitigationStore.getLegalCases();
    const caseIdx = legalCasesList.findIndex(c => c.id === selectedDoc.legal_case_id);
    if (caseIdx !== -1) {
      // recount missing docs
      const caseDocs = list.filter(d => d.legal_case_id === selectedDoc.legal_case_id);
      const missingCount = caseDocs.filter(d => d.verification_status === 'missing' || d.verification_status === 'rejected').length;
      legalCasesList[caseIdx].missing_docs_count = missingCount;
      LitigationStore.saveLegalCases(legalCasesList);
    }

    LitigationStore.saveLegalDocuments(list);
    setDocuments(list);

    LitigationStore.logAction(
      userEmail || 'user@recovai.com', 
      'Audit de conformité', 
      `Document ${selectedDoc.id} vérifié : résultat ${verifStatus}`
    );

    // Reset
    setSelectedDoc(null);
    setModalType(null);
    setVerifNotes('');
    onRefreshAll();
  };

  const handleDeleteDoc = (id: string) => {
    if(!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette pièce administrative ?")) return;
    const list = documents.filter(d => d.id !== id);
    LitigationStore.saveLegalDocuments(list);
    setDocuments(list);
    LitigationStore.logAction(userEmail || 'user@recovai.com', 'Suppression document', `Destruction physique du document ID ${id}`);
    onRefreshAll();
  };

  // ─── FILTER COMPUTATION ─────────────────────────────
  
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = !search ||
        d.client_name.toLowerCase().includes(search.toLowerCase()) ||
        d.document_name.toLowerCase().includes(search.toLowerCase()) ||
        d.legal_case_id.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'All' || d.verification_status === statusFilter;
      const matchType = typeFilter === 'All' || d.document_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [documents, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter(d => d.verification_status === 'verified').length;
    const pending = documents.filter(d => d.verification_status === 'uploaded' || d.verification_status === 'under_review').length;
    const missing = documents.filter(d => d.verification_status === 'missing').length;
    const rejected = documents.filter(d => d.verification_status === 'rejected').length;
    return { total, verified, pending, missing, rejected };
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* ─── KPIS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-[10px] font-black uppercase text-muted-foreground">Classeur de pièces</p>
          <p className="text-xl font-bold text-foreground mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm border-l-emerald/50">
          <p className="text-[10px] font-black uppercase text-emerald">Actes conformes audités</p>
          <p className="text-xl font-bold text-emerald mt-0.5">{stats.verified}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm border-l-amber-500/50">
          <p className="text-[10px] font-black uppercase text-amber-500">Documents à auditer</p>
          <p className="text-xl font-bold text-amber-500 mt-0.5">{stats.pending}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm border-l-crimson/50">
          <p className="text-[10px] font-black uppercase text-crimson">Créances sans contrat (Manquantes)</p>
          <p className="text-xl font-bold text-crimson mt-0.5">{stats.missing}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm col-span-2 lg:col-span-1 border-l-red-500/50">
          <p className="text-[10px] font-black uppercase text-red-650 font-black">Actes non-conformes rejetés</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{stats.rejected}</p>
        </div>
      </div>

      {/* ─── SHIELD BANNER FOR MISSING ACTS ─── */}
      {stats.missing > 0 && (
        <div className="bg-gradient-to-r from-crimson/5 to-transparent border-l-4 border-crimson p-4 rounded-r-xl flex items-start gap-3">
          <ShieldAlert className="text-crimson shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-crimson">Alerte de sécurité d'Audit Légal</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-semibold">
              Attention, {stats.missing} pièces substantielles d'activation commerciale (contrats caducs, bordereaux manquants) ne sont pas chargées ou sont marqués conformes.
              Le tribunal rejeterait toute créance sans les originaux de contrats de crédit dument signés.
            </p>
          </div>
        </div>
      )}

      {/* ─── FILTERS BAR ─── */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher document (Nom, Client, N° dossier)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border/60 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tout type de pièce</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-xs border border-border/60 focus:outline-none cursor-pointer font-semibold"
        >
          <option value="All">Tout statut d'audit</option>
          {Object.entries(VERIF_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <button 
          onClick={() => { setModalType('upload'); }}
          className="px-4 py-2 bg-crimson hover:bg-crimson/95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
        >
          <Upload size={14} /> Ajouter un acte juridique
        </button>
      </div>

      {/* ─── DOCUMENTS TABLE ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/40 text-[10px] font-black uppercase text-muted-foreground border-b border-border">
                <th className="py-3.5 px-4 font-black">ID Pièce</th>
                <th className="py-3.5 px-2 font-black">Dossier juridique</th>
                <th className="py-3.5 px-2 font-black">Type administratif</th>
                <th className="py-3.5 px-2 font-black">Nom de fichier</th>
                <th className="py-3.5 px-2 font-black">Chargé par</th>
                <th className="py-3.5 px-2 font-black">Date chargement</th>
                <th className="py-3.5 px-2 font-black text-center whitespace-nowrap border-l">Statut audit juridique</th>
                <th className="py-3.5 px-2 font-black">Conformateur</th>
                <th className="py-3.5 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium text-foreground">
              {filteredDocs.map(d => {
                const sCfg = VERIF_STATUS[d.verification_status] || { label: d.verification_status, bg: 'bg-secondary', color: 'text-muted-foreground' };
                return (
                  <tr key={d.id} className="hover:bg-secondary/15 transition-all">
                    <td className="py-4 px-4 font-mono text-muted-foreground">{d.id}</td>
                    <td className="py-4 px-2">
                      <Link to={`/litigation/${d.legal_case_id}`} className="hover:underline text-crimson font-bold">{d.legal_case_id}</Link>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{d.client_name}</div>
                    </td>
                    <td className="py-4 px-2 text-neutral-800 font-semibold">
                      {DOC_TYPES[d.document_type] || d.document_type}
                    </td>
                    <td className="py-4 px-2 text-[11px] font-mono text-cobalt flex items-center gap-1.5 break-all">
                      <FileText size={14} className="shrink-0" />
                      <div>{d.document_name}</div>
                    </td>
                    <td className="py-4 px-2 text-neutral-600 font-normal">
                      {d.uploaded_by || "—"}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground whitespace-nowrap">
                      {d.uploaded_at || "—"}
                    </td>
                    <td className="py-4 px-2 border-l text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                        sCfg.bg
                      )}>
                        {sCfg.label}
                      </span>
                    </td>
                    <td className="py-4 px-2 font-bold whitespace-nowrap text-[11px]">
                      {d.verified ? d.verified_by : "—"}
                      <div className="text-[9px] text-muted-foreground font-normal">{d.verified ? d.verified_at : ''}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedDoc(d); setModalType('verify'); }}
                          className="px-2 py-1 bg-secondary text-foreground rounded hover:bg-neutral-200 transition text-[10px] font-bold"
                          title="Auditer/Certifier le document"
                        >
                          Conformité
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(d.id)}
                          className="p-1 px-1.5 text-crimson hover:bg-crimson/5 rounded hover:text-crimson transition"
                          title="Supprimer la pièce"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground font-semibold">
                    Aucune pièce d'exécution n'a été répertoriée.
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
              {modalType === 'upload' ? (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Numériser / Déposer un acte au dossier</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Dossier Juridique Ciblé</label>
                      <select
                        value={caseId}
                        onChange={e => setCaseId(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none"
                        required
                      >
                        <option value="">Sélectionner un dossier...</option>
                        {legalCases.map(c => (
                          <option key={c.id} value={c.id}>{c.id} - {c.client_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Nature de la pièce déposée</label>
                      <select
                        value={docType}
                        onChange={e => setDocType(e.target.value as any)}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none"
                      >
                        {Object.entries(DOC_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Intitulé du Fichier (Simulé)</label>
                      <input
                        value={docName}
                        onChange={e => setDocName(e.target.value)}
                        placeholder="Ex: Contrat_Cession_No211_Signe.pdf"
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Notes explicatives complémentaires</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Document paraphé original scellé reçu par messagerie..."
                        rows={2}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-medium resize-none text-foreground"
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
                      Démarrer le dépôt
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-foreground leading-tight">Vérification de la Conformité administrative</h3>

                  <p className="text-xs text-muted-foreground">
                    Fichier : <strong className="font-mono">{selectedDoc?.document_name}</strong>
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Décision d'audit Juridique</label>
                      <select
                        value={verifStatus}
                        onChange={e => setVerifStatus(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none font-bold"
                        required
                      >
                        <option value="verified">✓ Conforme & Valide (Pièce signée de contrat d'origine)</option>
                        <option value="under_review">↺ Pièce suspecte (Placée en cours d'examen)</option>
                        <option value="rejected">☠ Rejeté (Copie non signée, illisible ou caduque)</option>
                        <option value="expired">⚠ Acte expiré / caduc</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Justification du statut de conformité</label>
                      <textarea
                        value={verifNotes}
                        onChange={e => setVerifNotes(e.target.value)}
                        placeholder="Saisissez la raison légale de non-conformité ou la validation d'audit..."
                        rows={3}
                        className="w-full bg-secondary border border-border rounded-lg p-2 text-xs focus:outline-none font-medium resize-none text-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => { setSelectedDoc(null); setModalType(null); }}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground bg-secondary rounded-lg hover:bg-neutral-200 cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-emerald text-white rounded-lg hover:brightness-110 cursor-pointer"
                    >
                      Enregistrer la décision
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
