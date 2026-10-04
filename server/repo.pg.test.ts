// RecovAI — lot P1 : tests d'intégration Postgres (PgRepo + RLS + append-only).
// Nécessite DATABASE_URL (CI : service postgres:16 + migrations ; local : npm run test:pg:local).
// Sans DATABASE_URL, la suite est ignorée pour ne pas casser `npm run test`.
import { describe, it, expect, beforeAll } from 'vitest';
import { isValidPostgresUrl } from './db/repo';

const url = (process.env.DATABASE_URL || '').trim();
const maybe = isValidPostgresUrl(url) ? describe : describe.skip;

maybe('PgRepo — source de vérité Postgres', () => {
  let repo: any;
  const stamp = Date.now();
  const INST_A = `IT-Amen-${stamp}`;
  const INST_B = `IT-Enda-${stamp}`;
  const actorA = { sub: 'it-a', email: `agent.a${stamp}@recovai.test`, role: 'agent' as const, institution: INST_A };
  const actorB = { sub: 'it-b', email: `agent.b${stamp}@recovai.test`, role: 'agent' as const, institution: INST_B };
  const actorAdmin = { sub: 'it-root', email: `root${stamp}@recovai.test`, role: 'admin' as const, institution: null };

  // Les politiques RLS ne s'appliquent pas au superuser/owner : on teste avec le rôle
  // applicatif non privilégié créé par la migration (recovai_app).
  const appUrl = process.env.DATABASE_URL_APP || url.replace(/\/\/[^@/]+@/, '//recovai_app:change_me_in_deployment@');

  beforeAll(async () => {
    const { PgRepo } = await import('./db/repo');
    repo = new PgRepo(appUrl);
  }, 30_000);

  it('insère et relit un dossier (round-trip, version 1)', async () => {
    const code = `IT-${stamp}-1`;
    const { record } = await repo.insertDossier({
      client_code: code, debtor_name: 'Client It Test', amount: 1234.56,
      status: 'a_relancer', delay_days: 35, due_date: '2026-12-31', institution: INST_A,
    }, actorA);
    expect(record.version).toBe(1);
    expect(Number(record.amount)).toBeCloseTo(1234.56);
    expect(record.institution).toBe(INST_A);

    const back = await repo.getDossier(code);
    expect(back.id).toBe(record.id);
    expect(back.row_hash).toMatch(/^[0-9a-f]{64}$/); // trigger digest pgcrypto
  });

  it('cloisonne strictement les listes par institution (RLS via GUC)', async () => {
    const pageA = await repo.listDossiers({ institution: INST_A, limit: 100, offset: 0 });
    expect(pageA.total).toBe(1);
    const pageB = await repo.listDossiers({ institution: INST_B, limit: 100, offset: 0 });
    expect(pageB.total).toBe(0);
    // un agent B qui tente de lire le dossier A par id : RLS le masque
    const hidden = await repo.getDossierForInstitution(`IT-${stamp}-1`, INST_B);
    expect(hidden).toBeNull();
    // un transverse (admin, institution null) voit les deux mondes
    const pageAll = await repo.listDossiers({ institution: null, limit: 1000, offset: 0 });
    expect(pageAll.total).toBeGreaterThanOrEqual(1);
  });

  it('refuse l’écriture cross-institution (WITH CHECK RLS) côté insertion', async () => {
    await expect(
      repo.insertDossier({
        client_code: `IT-${stamp}-evil`, debtor_name: 'Écriture cross tenant', amount: 1,
        institution: INST_B, // l'acteur est rattaché à A : la politique WITH CHECK doit refuser
      }, actorA)
    ).rejects.toThrow();
  });

  it('applique le verrou optimiste et incrémente version (trigger)', async () => {
    const first = await repo.patchDossier(`IT-${stamp}-1`, { status: 'en_relance' }, actorA, 1);
    expect(first.ok).toBe(true);
    expect(first.after.version).toBe(2);

    const stale = await repo.patchDossier(`IT-${stamp}-1`, { status: 'paye' }, actorA, 1);
    expect(stale.ok).toBe(false);
    expect(stale.conflict).toBe(true);
  });

  it('soft-delete : disparaît des listes, reste en base pour l’audit légal', async () => {
    const del = await repo.softDeleteDossier(`IT-${stamp}-1`, actorA);
    expect(del.ok).toBe(true);
    const page = await repo.listDossiers({ institution: INST_A, limit: 10, offset: 0 });
    expect(page.total).toBe(0);
    const pageDel = await repo.listDossiers({ institution: INST_A, limit: 10, offset: 0, includeDeleted: true });
    expect(pageDel.items[0].deleted_at).toBeTruthy();
  });

  it('journalise en append-only, chaîné et horodaté', async () => {
    const before = (await repo.listAudit(500)).length;
    await repo.appendAudit({
      action: 'IT_TEST', details: `entrée de test ${stamp}`,
      actorEmail: actorA.email, actorRole: 'agent', actorId: actorA.sub,
      entityType: 'dossier', entityId: `IT-${stamp}-1`,
      before: { status: 'en_relance' }, after: { status: 'paye', note: 'quittance' },
    });
    const logs = await repo.listAudit(500);
    expect(logs.length).toBe(before + 1);
    const mine = logs.find((l: any) => l.action === 'IT_TEST' && (l.details || '').includes(String(stamp)));
    expect(mine).toBeTruthy();
    expect(mine.prevHash).toMatch(/^[0-9a-f]{64}$|^GENESIS$/);
    expect(mine.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('la base refuse UPDATE/DELETE sur audit_events (preuve append-only côté moteur)', async () => {
    const pg = await import('pg');
    const P = (pg as any).default ?? pg;
    const client = new P.Client({ connectionString: url }); // owner : la preuve vient du TRIGGER, pas de RLS
    await client.connect();
    await client.query(`INSERT INTO audit_events (action, details, actor, actor_role, prev_hash, hash) VALUES ('IT_PROBE','probe','root','admin','GENESIS','x')`);
    await expect(client.query(`UPDATE audit_events SET details = 'altéré' WHERE action = 'IT_PROBE'`)).rejects.toThrow(/append-only/);
    await expect(client.query(`DELETE FROM audit_events WHERE action = 'IT_PROBE'`)).rejects.toThrow(/append-only/);
    await client.end();
  });
});
