import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../auth';
import { getRepository } from '../db/repo';

const router = Router();

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Consultation du journal d'audit — réservé manager/admin (P1.3).
// mode=json (défaut) | csv (export SIEM/contrôle interne)
router.get('/', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 10000);
    const logs = await getRepository().listAudit(limit);

    if (req.query.format === 'csv') {
      const header = ['timestamp', 'action', 'actor', 'actor_role', 'entity_type', 'entity_id', 'details', 'hash', 'prev_hash'].join(',');
      const lines = logs.map(l => [
        l.timestamp, l.action, l.actor, l.actorRole, l.entityType ?? '', l.entityId ?? '',
        (l.details || '').replace(/[\r\n]+/g, ' '), l.hash, l.prevHash,
      ].map(csvEscape).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="recovai_audit_${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send([header, ...lines].join('\n'));
    }

    res.json({
      count: logs.length,
      disclaimer: getRepository().kind === 'postgres'
        ? 'Journal Postgres append-only (trigger anti-mutation) avec différentiels avant/après et chaînage SHA-256.'
        : 'Journal v1 de démonstration (store JSON) : horodatage, auteur et chaînage actifs ; version Postgres append-only livrée avec la bascule DATABASE_URL.',
      data: logs,
    });
  } catch (e: any) {
    console.error('[audit.list]', e?.message);
    res.status(500).json({ error: 'Lecture du journal impossible.' });
  }
});

export default router;
