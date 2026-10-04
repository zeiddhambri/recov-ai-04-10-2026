import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Sparkles, FileText, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fileToText, ExtractedDossier } from '@/lib/file-extract';
import { cn } from '@/lib/utils';

type Props = { open: boolean; onClose: () => void; onCreated: () => void };

const STATUSES = [
  { v: 'a_relancer', l: 'À relancer' },
  { v: 'en_relance', l: 'En relance' },
  { v: 'promesse_paiement', l: 'Promesse de paiement' },
  { v: 'partiellement_paye', l: 'Partiellement payé' },
  { v: 'paye', l: 'Payé' },
  { v: 'contentieux', l: 'Contentieux' },
];
const LEVELS = ['recouvreur', 'directeur', 'comite'];
const ASSIGNEES = ['Non assigné', 'Ahmed B.', 'Sami K.', 'Leila M.'];

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2";
const inputCls = "w-full px-4 py-2.5 rounded-lg bg-[#161b22] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky/40 focus:border-sky transition placeholder:text-white/30";

function emptyRow(): ExtractedDossier {
  return { debtor_name: '', debtor_email: '', debtor_phone: '+216', amount: 0, due_date: '' };
}

export default function NouveauDossierModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'manual' | 'import'>('manual');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDossier[] | null>(null);

  const [form, setForm] = useState({
    debtor_name: '', debtor_email: '', debtor_phone: '+216', amount: 0,
    due_date: '', assigned_to: 'Non assigné', management_level: 'recouvreur', status: 'a_relancer',
  });

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setAnalyzing(true);
    try {
      const { text } = await fileToText(file);
      const { data, error } = await supabase.functions.invoke('extract-dossier', {
        body: { content: text, filename: file.name },
      });
      if (error) throw error;
      const list: ExtractedDossier[] = (data?.dossiers || []).map((d: any) => ({
        debtor_name: d.debtor_name || '',
        debtor_email: d.debtor_email || '',
        debtor_phone: d.debtor_phone || '+216',
        amount: Number(d.amount) || 0,
        due_date: d.due_date || '',
      }));
      setExtracted(list.length ? list : [emptyRow()]);
      toast({ title: 'Analyse terminée', description: `${list.length} dossier(s) détecté(s).` });
    } catch (e: any) {
      toast({ title: 'Erreur d\'extraction', description: e.message || 'Veuillez réessayer.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  if (!open) return null;

  const handleManualSave = async () => {
    if (!user || !form.debtor_name) {
      toast({ title: 'Nom du débiteur requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Persistance via l'API RecovAI authentifiée (lot P0 : voie de données unique).
      await api.dossiers.create({
        client_code: `RCV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        debtor_name: form.debtor_name, debtor_email: form.debtor_email || null,
        debtor_phone: form.debtor_phone || null, amount: form.amount,
        due_date: form.due_date || null, assigned_to: form.assigned_to,
        management_level: form.management_level, status: form.status,
      });
      toast({ title: 'Dossier créé' });
      onCreated(); onClose();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Création impossible', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleImportSave = async () => {
    if (!user || !extracted) return;
    setSaving(true);
    const year = new Date().getFullYear();
    const rows = extracted.filter(d => d.debtor_name).map((d) => ({
      user_id: user.id,
      client_code: `RCV-${year}-${Math.floor(Math.random() * 9000 + 1000)}`,
      debtor_name: d.debtor_name,
      debtor_email: d.debtor_email || null,
      debtor_phone: d.debtor_phone || null,
      amount: Number(d.amount) || 0,
      due_date: d.due_date || null,
      assigned_to: 'Non assigné',
      management_level: 'recouvreur',
      status: 'a_relancer',
    }));
    if (!rows.length) { setSaving(false); toast({ title: 'Aucune ligne valide', variant: 'destructive' }); return; }
    try {
      for (const row of rows) await api.dossiers.create(row);
      toast({ title: `${rows.length} dossier(s) importé(s)` });
      onCreated(); onClose();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Import partiellement enregistré', variant: 'destructive' });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold">Nouveau dossier</h2>
            <p className="text-xs text-white/50 mt-0.5">Créez manuellement ou importez via IA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={20} /></button>
        </div>

        <div className="flex border-b border-white/10 px-6">
          {(['manual', 'import'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition",
                tab === t ? "border-sky text-white" : "border-transparent text-white/50 hover:text-white")}>
              {t === 'manual' ? 'Saisie manuelle' : '✨ Import IA'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {tab === 'manual' && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Nom du débiteur *</label>
                <input className={inputCls} placeholder="Ex: Société Alpha"
                  value={form.debtor_name} onChange={(e) => setForm({ ...form, debtor_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email débiteur</label>
                  <input type="email" className={inputCls} placeholder="email@exemple.com"
                    value={form.debtor_email} onChange={(e) => setForm({ ...form, debtor_email: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Téléphone débiteur</label>
                  <input className={inputCls} placeholder="+216 ..."
                    value={form.debtor_phone} onChange={(e) => setForm({ ...form, debtor_phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Montant (TND) *</label>
                  <input type="number" min="0" step="0.01" className={inputCls}
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Échéance initiale</label>
                  <input type="date" className={inputCls}
                    value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Assigné à</label>
                  <select className={inputCls} value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                    {ASSIGNEES.map(a => <option key={a} value={a} className="bg-[#161b22]">{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Niveau de gestion</label>
                  <select className={inputCls} value={form.management_level} onChange={(e) => setForm({ ...form, management_level: e.target.value })}>
                    {LEVELS.map(l => <option key={l} value={l} className="bg-[#161b22]">{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status initial</label>
                  <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s.v} value={s.v} className="bg-[#161b22]">{s.l}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5">Annuler</button>
                <button onClick={handleManualSave} disabled={saving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-sky text-white hover:bg-sky/90 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Créer le dossier
                </button>
              </div>
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-4">
              {!extracted && (
                <div {...getRootProps()}
                  className={cn("border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition",
                    isDragActive ? "border-sky bg-sky/5" : "border-white/15 hover:border-white/30 bg-white/[0.02]")}>
                  <input {...getInputProps()} />
                  {analyzing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-sky" size={36} />
                      <p className="text-sm text-white/70">Analyse IA en cours...</p>
                      <p className="text-xs text-white/40">Extraction des données du document</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-sky/10 flex items-center justify-center">
                        <Upload className="text-sky" size={24} />
                      </div>
                      <p className="text-sm font-semibold">Glissez votre document ici</p>
                      <p className="text-xs text-white/50">PDF, Excel (.xlsx), CSV, Word (.docx)</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-sky">
                        <Sparkles size={12} /> Extraction automatique par IA
                      </div>
                    </div>
                  )}
                </div>
              )}

              {extracted && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-sky" />
                      <span className="text-sm font-semibold">{extracted.length} dossier(s) extrait(s)</span>
                    </div>
                    <button onClick={() => setExtracted([...extracted, emptyRow()])}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-1">
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {extracted.map((row, i) => (
                      <div key={i} className="bg-[#161b22] border border-white/10 rounded-lg p-3 grid grid-cols-12 gap-2">
                        <input className="col-span-12 md:col-span-4 px-2 py-1.5 rounded bg-[#0d1117] border border-white/10 text-xs"
                          placeholder="Débiteur" value={row.debtor_name}
                          onChange={(e) => { const c = [...extracted]; c[i].debtor_name = e.target.value; setExtracted(c); }} />
                        <input className="col-span-12 md:col-span-3 px-2 py-1.5 rounded bg-[#0d1117] border border-white/10 text-xs"
                          placeholder="Email" value={row.debtor_email}
                          onChange={(e) => { const c = [...extracted]; c[i].debtor_email = e.target.value; setExtracted(c); }} />
                        <input className="col-span-6 md:col-span-2 px-2 py-1.5 rounded bg-[#0d1117] border border-white/10 text-xs"
                          placeholder="Tel" value={row.debtor_phone}
                          onChange={(e) => { const c = [...extracted]; c[i].debtor_phone = e.target.value; setExtracted(c); }} />
                        <input type="number" className="col-span-3 md:col-span-1 px-2 py-1.5 rounded bg-[#0d1117] border border-white/10 text-xs"
                          value={row.amount}
                          onChange={(e) => { const c = [...extracted]; c[i].amount = Number(e.target.value); setExtracted(c); }} />
                        <input type="date" className="col-span-2 md:col-span-1 px-2 py-1.5 rounded bg-[#0d1117] border border-white/10 text-xs"
                          value={row.due_date}
                          onChange={(e) => { const c = [...extracted]; c[i].due_date = e.target.value; setExtracted(c); }} />
                        <button onClick={() => setExtracted(extracted.filter((_, j) => j !== i))}
                          className="col-span-1 flex items-center justify-center text-white/40 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                    <button onClick={() => setExtracted(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5">Recommencer</button>
                    <button onClick={handleImportSave} disabled={saving}
                      className="px-5 py-2 text-sm font-semibold rounded-lg bg-sky text-white hover:bg-sky/90 disabled:opacity-50 flex items-center gap-2">
                      {saving && <Loader2 size={14} className="animate-spin" />} Importer {extracted.filter(d => d.debtor_name).length} dossier(s)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
