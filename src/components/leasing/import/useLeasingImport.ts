import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fileToText } from '@/lib/file-extract';
import type { FileJob, ExtractedContract } from './types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_EXT = ['pdf', 'xlsx', 'xls', 'csv', 'docx'];

function uid() { return Math.random().toString(36).slice(2, 11); }

function validate(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ACCEPTED_EXT.includes(ext)) return `Format .${ext} non supporté`;
  if (file.size > MAX_FILE_SIZE) return 'Fichier trop volumineux (>20MB)';
  if (file.size === 0) return 'Fichier vide';
  return null;
}

export function useLeasingImport(onInserted?: () => void) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<FileJob[]>([]);

  const updateJob = useCallback((id: string, patch: Partial<FileJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const processFile = useCallback(async (job: FileJob) => {
    if (!user) {
      updateJob(job.id, { status: 'error', error: 'Non authentifié' });
      return;
    }
    try {
      // 1. read
      updateJob(job.id, { status: 'reading', progress: 10, message: 'Lecture du fichier...' });
      const { text } = await fileToText(job.file);
      if (!text || text.length < 10) throw new Error('Contenu illisible');

      // 2. AI
      updateJob(job.id, { status: 'analyzing', progress: 35, message: "Analyse IA en cours..." });
      const { data, error } = await supabase.functions.invoke('extract-leasing', {
        body: { content: text, filename: job.file.name },
      });
      if (error) throw new Error(error.message);
      const contracts: ExtractedContract[] = data?.contracts ?? [];
      if (!contracts.length) throw new Error('Aucun contrat détecté');

      // 3. upload source
      updateJob(job.id, { status: 'uploading', progress: 65, message: 'Sauvegarde du fichier...', extracted: contracts });
      const path = `${user.id}/${Date.now()}-${job.file.name}`;
      const up = await supabase.storage.from('leasing-files').upload(path, job.file, { upsert: false });
      let signedUrl: string | null = null;
      if (!up.error) {
        const s = await supabase.storage.from('leasing-files').createSignedUrl(path, 60 * 60 * 24 * 365);
        signedUrl = s.data?.signedUrl ?? null;
      }

      // 4. insert
      updateJob(job.id, { status: 'inserting', progress: 85, message: 'Intégration au tableau...' });
      const rows = contracts.map(c => ({
        user_id: user.id,
        lessee_name: c.lessee_name || 'Inconnu',
        lessee_id: c.lessee_id || null,
        lessee_email: c.lessee_email || null,
        lessee_phone: c.lessee_phone || null,
        contract_ref: c.contract_ref || null,
        contract_status: c.contract_status || 'active',
        start_date: c.start_date || null,
        end_date: c.end_date || null,
        maturity_date: c.maturity_date || c.end_date || null,
        duration_months: c.duration_months || null,
        asset_type: c.asset_type || null,
        asset_description: c.asset_description || null,
        asset_value: c.asset_value || 0,
        residual_value: c.residual_value || 0,
        monthly_rent: c.monthly_rent || 0,
        total_amount: c.total_amount || 0,
        remaining_capital: c.remaining_capital || 0,
        interest_rate: c.interest_rate || null,
        payment_frequency: c.payment_frequency || 'monthly',
        next_payment_date: c.next_payment_date || null,
        overdue_amount: c.overdue_amount || 0,
        overdue_days: c.overdue_days || 0,
        risk_score: Math.max(0, Math.min(100, Math.round(c.risk_score || 0))),
        risk_level: c.risk_level || 'low',
        ai_confidence: c.ai_confidence ?? null,
        notes: c.notes || null,
        source_file_url: signedUrl,
        source_file_name: job.file.name,
      }));
      const { error: insErr } = await supabase.from('leasing_portfolio').insert(rows);
      if (insErr) throw new Error(insErr.message);

      updateJob(job.id, { status: 'done', progress: 100, message: `${contracts.length} contrat(s) importé(s)`, inserted: contracts.length });
      toast.success(`${job.file.name} : ${contracts.length} contrat(s) ajouté(s)`);
      onInserted?.();
    } catch (e: any) {
      const msg = e?.message || 'Échec';
      updateJob(job.id, { status: 'error', error: msg, message: msg });
      toast.error(`${job.file.name} : ${msg}`);
    }
  }, [user, updateJob, onInserted]);

  const addFiles = useCallback((files: File[]) => {
    const valid: FileJob[] = [];
    files.forEach(f => {
      const err = validate(f);
      if (err) { toast.error(`${f.name} : ${err}`); return; }
      valid.push({ id: uid(), file: f, status: 'queued', progress: 0, extracted: [], inserted: 0 });
    });
    if (!valid.length) return;
    setJobs(prev => [...prev, ...valid]);
    // process concurrently (limit 3)
    const queue = [...valid];
    const runNext = async () => {
      const next = queue.shift();
      if (!next) return;
      await processFile(next);
      await runNext();
    };
    Promise.all([runNext(), runNext(), runNext()]);
  }, [processFile]);

  const clearDone = useCallback(() => setJobs(prev => prev.filter(j => j.status !== 'done')), []);
  const removeJob = useCallback((id: string) => setJobs(prev => prev.filter(j => j.id !== id)), []);

  return { jobs, addFiles, clearDone, removeJob };
}
