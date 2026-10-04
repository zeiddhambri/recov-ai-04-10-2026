// RecovAI — Exports de place (lot P1.6, socle) : fichiers plats horodatés prêts
// pour un échange batch SFTP avec le core banking / l'entrepôt de données.
// Volontairement en LECTURE SEULE et cloisonnés par institution comme l'API.

import { Router, Request, Response } from 'express';
import { getRepository } from '../db/repo';

const router = Router();

const CSV_COLUMNS = [
  'client_code', 'institution', 'branch', 'portfolio', 'debtor_name', 'debtor_email', 'debtor_phone',
  'amount', 'recovered_amount', 'status', 'management_level', 'assigned_to', 'risk_level',
  'delay_days', 'due_date', 'created_at', 'updated_at', 'version',
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fetchAll(req: Request): Promise<any[]> {
  const rows: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  // Paginations successives — borne dure 50 000 pour protéger l'instance.
  while (rows.length < 50_000) {
    const page = await getRepository().listDossiers({
      institution: req.auth?.institution || null,
      limit: pageSize,
      offset,
    });
    rows.push(...page.items);
    if (page.items.length === 0 || offset + page.items.length >= page.total) break;
    offset += pageSize;
  }
  return rows;
}

// GET /api/export/dossiers.csv
router.get('/dossiers.csv', async (req: Request, res: Response) => {
  try {
    const rows = await fetchAll(req);
    const header = CSV_COLUMNS.join(';');
    const lines = rows.map(r => CSV_COLUMNS.map(c => csvEscape(r[c])).join(';'));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="recovai_dossiers_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('X-Recovai-Rows', String(rows.length));
    res.send(['# RecovAI export — données limitées au périmètre du compte — horodatage du fichier en nom', header, ...lines].filter((l, i) => i > 0).join('\r\n'));
  } catch (e: any) {
    console.error('[export.csv]', e?.message);
    res.status(500).json({ error: 'Export impossible.' });
  }
});

// GET /api/export/dossiers.json — flux de repli pour intergations REST
router.get('/dossiers.json', async (req: Request, res: Response) => {
  try {
    const rows = await fetchAll(req);
    res.setHeader('Content-Disposition', `attachment; filename="recovai_dossiers_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      count: rows.length,
      scope: req.auth?.institution ?? 'transverse',
      data: rows,
    });
  } catch (e: any) {
    console.error('[export.json]', e?.message);
    res.status(500).json({ error: 'Export impossible.' });
  }
});

export default router;
