import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Scale, User, Wallet, Gavel, Shield, FileText, Calendar, AlertTriangle, Loader2, Sparkles, Upload, Mail, Phone, Hash, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fileToText } from '@/lib/file-extract';

type Lawyer = { id: string; name: string; firm: string | null };

type Extracted = {
  debtor_name: string;
  debtor_email?: string;
  debtor_phone?: string;
  amount: number;
  due_date?: string;
  reference?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'precontentieux', label: 'Précontentieux' },
  { value: 'contentieux', label: 'Contentieux' },
  { value: 'recouvrement_force', label: 'Recouvrement forcé' },
];
const COURT_LEVELS = [
  { value: 'tpi', label: 'Tribunal de Première Instance' },
  { value: 'appel', label: "Cour d'Appel" },
  { value: 'cassation', label: 'Cassation' },
];
const GUARANTEES = [
  { value: 'aucune', label: 'Aucune garantie' },
  { value: 'hypotheque', label: 'Hypothèque' },
  { value: 'nantissement', label: 'Nantissement' },
  { value: 'caution', label: 'Caution personnelle' },
];

function estimateLegalFees(amount: number) {
  if (!amount || amount <= 0) return 0;
  const proportional = amount * 0.01;
  const fixed = 150;
  const pleading = Math.max(80, Math.min(amount * 0.005, 1500));
  return Math.round((proportional + fixed + pleading) * 1000) / 1000;
}

function prescriptionAlert(dateStr: string | undefined): { level: 'ok' | 'warn' | 'danger'; msg: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 86400000);
  if (years >= 5) return { level: 'danger', msg: `⚠ Délai de prescription quinquennale dépassé (${years.toFixed(1)} ans).` };
  if (years >= 4) return { level: 'warn', msg: `Attention : ${(5 - years).toFixed(1)} an(s) avant prescription quinquennale.` };
  if (years >= 14) return { level: 'danger', msg: `⚠ Approche de la prescription longue — vérifier le régime applicable.` };
  return { level: 'ok', msg: `Reconnaissance valide depuis ${years.toFixed(1)} an(s).` };
}

export default function NouveauDossierContentieuxModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // AI import state
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<Extracted[] | null>(null);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Form state
  const [debtorName, setDebtorName] = useState('');
  const [debtorEmail, setDebtorEmail] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('+216 ');
  const [reference, setReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [status, setStatus] = useState('precontentieux');
  const [lawyerId, setLawyerId] = useState<string>('');
  const [courtLevel, setCourtLevel] = useState('tpi');
  const [guarantee, setGuarantee] = useState('aucune');
  const [recommendation, setRecommendation] = useState('');
  const [observations, setObservations] = useState('');
  const [lastAck, setLastAck] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.from('lawyers').select('id,name,firm').order('name').then(({ data }) => {
      if (data) setLawyers(data as Lawyer[]);
    });
  }, [open]);

  const estimatedFees = useMemo(() => estimateLegalFees(amount), [amount]);
  const presc = useMemo(() => prescriptionAlert(lastAck), [lastAck]);

  const reset = () => {
    setDebtorName(''); setDebtorEmail(''); setDebtorPhone('+216 '); setReference(''); setDueDate('');
    setAmount(0); setStatus('precontentieux');
    setLawyerId(''); setCourtLevel('tpi'); setGuarantee('aucune');
    setRecommendation(''); setObservations(''); setLastAck('');
    setFile(null); setCandidates(null); setAiFields(new Set()); setProgress(0);
  };

  const applyExtracted = (e: Extracted) => {
    const ai = new Set<string>();
    if (e.debtor_name) { setDebtorName(e.debtor_name); ai.add('debtor_name'); }
    if (e.debtor_email) { setDebtorEmail(e.debtor_email); ai.add('debtor_email'); }
    if (e.debtor_phone) { setDebtorPhone(e.debtor_phone); ai.add('debtor_phone'); }
    if (e.reference) { setReference(e.reference); ai.add('reference'); }
    if (e.due_date) { setDueDate(e.due_date); ai.add('due_date'); }
    if (e.amount) { setAmount(Number(e.amount)); ai.add('amount'); }
    setAiFields(ai);
    setCandidates(null);
    toast.success('Champs pré-remplis. Vérifiez puis enregistrez.');
  };

  const onDrop = (accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setCandidates(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const analyze = async () => {
    if (!file) { toast.error('Sélectionnez un fichier'); return; }
    setAnalyzing(true);
    setProgress(15);
    try {
      toast.message('Lecture du fichier en cours...');
      const { text } = await fileToText(file);
      setProgress(50);
      toast.message('Analyse IA en cours...');
      const { data, error } = await supabase.functions.invoke('extract-contentieux', {
        body: { content: text, filename: file.name },
      });
      setProgress(90);
      if (error) throw new Error(error.message);
      const dossiers: Extracted[] = data?.dossiers ?? [];
      if (!dossiers.length) { toast.error('Aucun dossier détecté'); setAnalyzing(false); setProgress(0); return; }
      toast.success(`Analyse terminée : ${dossiers.length} dossier(s) détecté(s).`);
      if (dossiers.length === 1) applyExtracted(dossiers[0]);
      else setCandidates(dossiers);
    } catch (e: any) {
      toast.error(e?.message || 'Échec analyse');
    } finally {
      setAnalyzing(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const uploadSourceFile = async (): Promise<{ url: string | null; name: string | null }> => {
    if (!file || !user) return { url: null, name: null };
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('contentieux-files').upload(path, file, { upsert: false });
    if (error) { toast.error(`Upload fichier: ${error.message}`); return { url: null, name: file.name }; }
    const { data } = await supabase.storage.from('contentieux-files').createSignedUrl(path, 60 * 60 * 24 * 365);
    return { url: data?.signedUrl || path, name: file.name };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Vous devez être connecté.'); return; }
    if (!debtorName.trim()) { toast.error('Le nom du débiteur est requis.'); return; }

    setSubmitting(true);
    const source = await uploadSourceFile();

    const { error } = await supabase.from('dossiers_contentieux').insert({
      user_id: user.id,
      debtor_name: debtorName.trim(),
      debtor_email: debtorEmail.trim() || null,
      debtor_phone: debtorPhone.trim() || null,
      reference: reference.trim() || null,
      due_date: dueDate || null,
      amount,
      status,
      lawyer_id: lawyerId || null,
      court_level: courtLevel,
      guarantee,
      recommendation: recommendation.trim() || null,
      observations: observations.trim() || null,
      last_acknowledgment_date: lastAck || null,
      estimated_legal_fees: estimatedFees,
      source_file_url: source.url,
      source_file_name: source.name,
    } as any);
    setSubmitting(false);

    if (error) { toast.error(`Erreur : ${error.message}`); return; }
    toast.success('Dossier contentieux créé avec succès.');
    reset();
    onCreated?.();
    onClose();
  };

  if (!open) return null;

  const aiCls = (k: string) => aiFields.has(k) ? 'border-sky-400 ring-1 ring-sky-400/40 bg-sky-500/5' : 'border-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-3xl bg-[#0d1117] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Scale size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau dossier contentieux</h2>
              <p className="text-xs text-slate-400">Importez un document ou saisissez manuellement.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* AI Import Dropzone */}
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-300 font-semibold">
              <Sparkles size={14} className="text-amber-400" /> Import intelligent par IA
            </div>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition ${
                isDragActive ? 'border-rose-500 bg-rose-500/5' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={22} className="mx-auto text-slate-400 mb-2" />
              {file ? (
                <p className="text-sm text-slate-200 font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Glissez-déposez ou cliquez pour sélectionner</p>
                  <p className="text-[11px] text-slate-500 mt-1">PDF, Excel (.xlsx), CSV, Word (.docx)</p>
                </>
              )}
            </div>
            {file && (
              <div className="space-y-2">
                <button
                  type="button" onClick={analyze} disabled={analyzing}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {analyzing ? 'Analyse en cours...' : "Analyser avec l'IA"}
                </button>
                {progress > 0 && (
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Mapping multi-row */}
            {candidates && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-slate-300 font-semibold">{candidates.length} lignes détectées — choisissez la ligne à importer :</p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
                  {candidates.map((c, i) => (
                    <button key={i} type="button" onClick={() => applyExtracted(c)}
                      className="w-full text-left p-3 hover:bg-slate-800/60 transition flex items-start justify-between gap-3">
                      <div className="text-xs space-y-0.5">
                        <p className="text-slate-200 font-medium">{c.debtor_name || '—'}</p>
                        <p className="text-slate-400">{c.amount?.toLocaleString('fr-FR')} TND {c.reference ? `· Réf ${c.reference}` : ''}</p>
                        <p className="text-slate-500">{c.debtor_email || ''} {c.debtor_phone || ''}</p>
                      </div>
                      <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Field icon={User} label="Nom du débiteur / Client *">
            <input value={debtorName} onChange={(e) => { setDebtorName(e.target.value); aiFields.delete('debtor_name'); }}
              placeholder="Ex: Ahmed Ben Salem" required
              className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('debtor_name')}`} />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={Mail} label="Email débiteur">
              <input type="email" value={debtorEmail} onChange={(e) => { setDebtorEmail(e.target.value); aiFields.delete('debtor_email'); }}
                placeholder="email@exemple.com"
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('debtor_email')}`} />
            </Field>
            <Field icon={Phone} label="Téléphone débiteur">
              <input value={debtorPhone} onChange={(e) => { setDebtorPhone(e.target.value); aiFields.delete('debtor_phone'); }}
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('debtor_phone')}`} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={Hash} label="Référence (contrat / dossier)">
              <input value={reference} onChange={(e) => { setReference(e.target.value); aiFields.delete('reference'); }}
                placeholder="Ex: CTR-2024-001"
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('reference')}`} />
            </Field>
            <Field icon={Calendar} label="Échéance / Date d'impayé">
              <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); aiFields.delete('due_date'); }}
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('due_date')}`} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={Wallet} label="Montant de la créance (TND) *">
              <input type="number" min={0} step="0.001" value={amount}
                onChange={(e) => { setAmount(parseFloat(e.target.value) || 0); aiFields.delete('amount'); }}
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 ${aiCls('amount')}`} />
            </Field>
            <Field icon={Gavel} label="Statut initial *">
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={User} label="Avocat chargé">
              <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500">
                <option value="">Sélectionner un avocat</option>
                {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}{l.firm ? ` — ${l.firm}` : ''}</option>)}
              </select>
            </Field>
            <Field icon={Scale} label="Niveau du dossier *">
              <select value={courtLevel} onChange={(e) => setCourtLevel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500">
                {COURT_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field icon={Shield} label="Garanties *">
              <select value={guarantee} onChange={(e) => setGuarantee(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500">
                {GUARANTEES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field icon={FileText} label="Recommandation initiale">
              <input value={recommendation} onChange={(e) => setRecommendation(e.target.value)}
                placeholder="Ex: Mise en demeure envoyée"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500" />
            </Field>
          </div>

          <Field icon={Calendar} label="Date de la dernière reconnaissance de dette">
            <input type="date" value={lastAck} onChange={(e) => setLastAck(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500" />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
                <Sparkles size={13} className="text-amber-400" /> Frais de justice estimés
              </div>
              <p className="text-xl font-bold text-amber-300 mt-1">
                {estimatedFees.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Droit proportionnel + plaidoirie + greffe (estimation).</p>
            </div>
            {presc && (
              <div className={`rounded-lg p-3 border flex gap-2 items-start ${
                presc.level === 'danger' ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' :
                presc.level === 'warn' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' :
                'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              }`}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Alerte de prescription</p>
                  <p className="text-xs mt-1">{presc.msg}</p>
                </div>
              </div>
            )}
          </div>

          <Field icon={FileText} label="Observations">
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={4}
              placeholder="Notes libres sur le dossier, contexte, stratégie..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-500 resize-none" />
          </Field>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Annuler</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Créer le dossier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
        <Icon size={13} className="text-slate-400" /> {label}
      </label>
      {children}
    </div>
  );
}
