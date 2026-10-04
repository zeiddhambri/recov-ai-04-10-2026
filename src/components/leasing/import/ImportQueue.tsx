import { CheckCircle2, X, AlertCircle, Loader2, FileText } from 'lucide-react';
import type { FileJob } from './types';

const LABEL: Record<FileJob['status'], string> = {
  queued: 'En attente',
  reading: 'Lecture',
  analyzing: 'Analyse IA',
  uploading: 'Upload',
  inserting: 'Intégration',
  done: 'Terminé',
  error: 'Erreur',
};

export function ImportQueue({ jobs, onRemove, onClearDone }: { jobs: FileJob[]; onRemove: (id: string) => void; onClearDone: () => void }) {
  if (jobs.length === 0) return null;
  const doneCount = jobs.filter(j => j.status === 'done').length;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-bold text-[hsl(var(--charcoal))]">File d'attente ({jobs.length})</h3>
        {doneCount > 0 && (
          <button onClick={onClearDone} className="text-xs font-bold text-teal-700 hover:underline">
            Effacer terminés ({doneCount})
          </button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {jobs.map(j => {
          const isError = j.status === 'error';
          const isDone = j.status === 'done';
          const isProcessing = !isError && !isDone;
          return (
            <li key={j.id} className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isError ? 'bg-red-100 text-red-600' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'
              }`}>
                {isError ? <AlertCircle size={16} /> : isDone ? <CheckCircle2 size={16} /> : isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[hsl(var(--charcoal))] truncate">{j.file.name}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isError ? 'bg-red-100 text-red-700' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'
                  }`}>{LABEL[j.status]}</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${
                    isError ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-teal-500'
                  }`} style={{ width: `${j.progress}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {j.message || (j.inserted > 0 ? `${j.inserted} contrat(s) importé(s)` : '')}
                </p>
              </div>
              <button onClick={() => onRemove(j.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <X size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
