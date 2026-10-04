import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles } from 'lucide-react';

export function ImportDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
        isDragActive ? 'border-teal-500 bg-teal-50' : 'border-border hover:border-teal-400 bg-card'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
          <Upload size={24} />
        </div>
        <div>
          <p className="text-base font-bold text-[hsl(var(--charcoal))] flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-amber-500" /> Import intelligent par IA
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Glissez-déposez ou cliquez pour sélectionner plusieurs fichiers
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">PDF · Excel · CSV · Word — max 20MB par fichier</p>
        </div>
      </div>
    </div>
  );
}
