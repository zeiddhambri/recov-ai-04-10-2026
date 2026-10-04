// Lecture de documents pour l'import de dossiers (lot P1.8 : xlsx/SheetJS —
// version npm non corrigée des avis ReDoS/prototype-pollution — remplacé par exceljs).
import Papa from 'papaparse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

export type ExtractedDossier = {
  debtor_name: string;
  tax_id?: string;
  client_type?: 'grande_entreprise' | 'pme' | 'professionnel' | 'particulier' | string;
  debtor_email?: string;
  debtor_phone?: string;
  address?: string;
  city?: string;
  amount: number;
  principal_amount?: number;
  interest_penalties?: number;
  due_date?: string;
  overdue_date?: string;
  delay_days?: number;
  portfolio?: string;
  institution?: string;
  branch?: string;
  contract_ref?: string;
  dossier_number?: string;
  guarantees?: string;
  guarantors?: string;
  payment_history?: string;
  judicial_status?: string;
  lawyer_bailiff?: string;
  court?: string;
  case_number?: string;
  notes?: string;
  provenance?: Record<string, { sourceDoc: string; confidence: number; location?: string }>;
  missing_critical_fields?: string[];
  source_documents?: Array<{ name: string; size: number; type: string }>;
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readPdfText(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist');
  // @ts-ignore
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let txt = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    txt += content.items.map((it: any) => it.str).join(' ') + '\n';
  }
  return txt;
}

function cellToString(v: any): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return cellToString((v as any).result);
    if ('text' in v) return cellToString((v as any).text);
    if ('richText' in v) return (v as any).richText.map((rt: any) => rt.text).join('');
    if ('hyperlink' in v) return String(v.hyperlink ?? v.text ?? '');
    return String(v);
  }
  return String(v);
}

function workbookToText(wb: ExcelJS.Workbook): string {
  let out = '';
  wb.eachSheet((ws: any) => {
    out += `# Feuille: ${ws.name}\n`;
    if (typeof ws.eachRow === 'function') {
      ws.eachRow({ includeEmpty: false }, (row: any) => {
        const values = row.values as any[];
        const cells: string[] = [];
        for (let i = 1; i < values.length; i++) cells.push(cellToString(values[i]));
        out += cells.join(',') + '\n';
      });
    }
  });
  return out;
}

export async function fileToText(file: File): Promise<{ text: string; isTabular: boolean; isImage?: boolean; base64?: string; mimeType?: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) {
    const base64 = await fileToBase64(file);
    return {
      text: `[Document image / scan joint: ${file.name}]`,
      isTabular: false,
      isImage: true,
      base64,
      mimeType: file.type || (ext === 'png' ? 'image/png' : 'image/jpeg')
    };
  }
  if (ext === 'pdf') return { text: await readPdfText(file), isTabular: false };
  if (ext === 'docx') {
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: r.value, isTabular: false };
  }
  if (ext === 'csv') {
    const text = await file.text();
    return { text, isTabular: true };
  }
  if (ext === 'xlsx') {
    const buf = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    return { text: workbookToText(wb), isTabular: true };
  }
  if (ext === 'xls') {
    // Le format binaire legacy (.xls) n'est pas couvert par exceljs :
    // demander un .xlsx plutôt que réintroduire SheetJS.
    throw new Error('Format .xls non pris en charge : enregistrez le classeur au format .xlsx.');
  }
  return { text: await file.text(), isTabular: false };
}

/** Parseur CSV tabulaire pour imports de dossiers (utilisé par l'écran de saisie). */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const data = (parsed.data || []) as string[][];
  if (!data.length) return { headers: [], rows: [] };
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = String(r[i] ?? '').trim(); });
    return obj;
  });
  return { headers, rows };
}
