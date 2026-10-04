// RecovAI — Couche Repository (lot P1.1/P1.2/P1.3).
//
// Deux implémentations :
//  • JsonRepo — store de démonstration (data/recovai_db.json) ; mêmes sémantiques
//    (pagination, soft-delete, verrou optimiste, cloisonnement institution) qu'en
//    Postgres, pour que la démo et les tests d'intégration partagent le contrat.
//  • PgRepo  — activé lorsque DATABASE_URL est défini. Source de vérité cible :
//    schéma `server/db/migrations/001_p1_core.sql` (RLS par GUC d'institution,
//    audit append-only). Collections leasing/factoring/contentieux : à basculer
//    dans les PR suivants (migrations fournies).
//
// Les appels Postgres utilisent SET LOCAL app.institution par transaction afin
// d'activer les politiques RLS côté serveur même si l'application détient un
// rôle privilégié (défense en profondeur).

import crypto from 'crypto';
import { db } from './dataStore';

export interface ActorRef {
  sub: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  institution?: string | null;
}

export interface DossierListQuery {
  status?: string;
  management_level?: string;
  portfolio?: string;
  search?: string;
  institution?: string | null; // cloisonnement locataire ; null = pas de filtre
  limit: number;
  offset: number;
  includeDeleted?: boolean;
}

export interface DossierPage {
  total: number;
  limit: number;
  offset: number;
  items: any[];
}

export interface AuditEntryInput {
  action: string;
  details: string;
  actorType?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  before?: any;
  after?: any;
  meta?: Record<string, unknown>;
}

export interface InsertResult { record: any }
export interface PatchResult { ok: boolean; conflict?: boolean; notFound?: boolean; before?: any; after?: any }
export interface DeleteResult { ok: boolean; notFound?: boolean }

export interface Repository {
  kind: 'json' | 'postgres';
  listDossiers(q: DossierListQuery): Promise<DossierPage>;
  getDossier(id: string): Promise<any | null>;
  /** Lecture d'un dossier sous le périmètre d'une institution (test/contrôle RLS). */
  getDossierForInstitution(id: string, institution: string | null): Promise<any | null>;
  insertDossier(row: any, actor: ActorRef): Promise<InsertResult>;
  patchDossier(id: string, patch: any, actor: ActorRef, expectedVersion?: number | null): Promise<PatchResult>;
  softDeleteDossier(id: string, actor: ActorRef): Promise<DeleteResult>;
  appendAudit(entry: AuditEntryInput): Promise<void>;
  listAudit(limit: number): Promise<any[]>;
}

// ---------- utilitaires communs ----------

function matchSearch(d: any, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    (d.debtor_name || '').toLowerCase().includes(needle) ||
    (d.client_code || '').toLowerCase().includes(needle) ||
    (d.debtor_phone || '').toLowerCase().includes(needle) ||
    (d.debtor_email || '').toLowerCase().includes(needle)
  );
}

export function computeRowHash(row: any): string {
  const { version, updated_at, ...stable } = row;
  // Empreinte complète SHA-256 (64 hex) — alignée sur digest() côté Postgres.
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export function computeAuditHash(prevHash: string, entry: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(prevHash + JSON.stringify(entry)).digest('hex');
}

// ---------- JSON (démo) ----------

export class JsonRepo implements Repository {
  readonly kind = 'json' as const;

  private all() {
    return db.getDossiers();
  }

  async listDossiers(q: DossierListQuery): Promise<DossierPage> {
    let rows = this.all().filter(d => q.includeDeleted || !d.deleted_at);

    if (q.institution) {
      const inst = q.institution.toLowerCase();
      rows = rows.filter(d => (d.institution || '').toLowerCase() === inst);
    }
    if (q.status && q.status !== 'all') rows = rows.filter(d => d.status === q.status);
    if (q.management_level && q.management_level !== 'all') rows = rows.filter(d => d.management_level === q.management_level);
    if (q.portfolio && q.portfolio !== 'all') { const pf = q.portfolio.toLowerCase(); rows = rows.filter(d => (d.portfolio || '').toLowerCase() === pf); }
    if (q.search) rows = rows.filter(d => matchSearch(d, q.search!));

    const total = rows.length;
    const items = rows.slice(q.offset, q.offset + q.limit).map(d => ({ ...d }));
    return { total, limit: q.limit, offset: q.offset, items };
  }

  async getDossierForInstitution(id: string, institution: string | null): Promise<any | null> {
    const row = await this.getDossier(id);
    if (!row) return null;
    if (institution && (row.institution || '').toLowerCase() !== institution.toLowerCase()) return null;
    return row;
  }

  async getDossier(id: string): Promise<any | null> {
    const found = this.all().find(d => !d.deleted_at && (String(d.id) === String(id) || d.client_code === id));
    return found ? { ...found } : null;
  }

  async insertDossier(row: any, actor: ActorRef): Promise<InsertResult> {
    const nowIso = new Date().toISOString();
    const record = {
      ...row,
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? nowIso,
      updated_at: nowIso,
      version: 1,
      created_by: actor.email,
      updated_by: actor.email,
      deleted_at: null,
      row_hash: '',
    };
    record.row_hash = computeRowHash(record);
    this.all().unshift(record);
    db.save();
    return { record: { ...record } };
  }

  async patchDossier(id: string, patch: any, actor: ActorRef, expectedVersion?: number | null): Promise<PatchResult> {
    const list = this.all();
    const idx = list.findIndex(d => !d.deleted_at && (String(d.id) === String(id) || d.client_code === id));
    if (idx === -1) return { ok: false, notFound: true };

    const before = { ...list[idx] };
    if (typeof expectedVersion === 'number' && Number(before.version || 1) !== expectedVersion) {
      return { ok: false, conflict: true, before };
    }

    const updated = {
      ...list[idx],
      ...patch,
      version: Number(before.version || 1) + 1,
      updated_by: actor.email,
      updated_at: new Date().toISOString(),
    };
    delete (updated as any).row_hash;
    updated.row_hash = computeRowHash(updated);
    list[idx] = updated;
    db.save();
    return { ok: true, before, after: { ...updated } };
  }

  async softDeleteDossier(id: string, actor: ActorRef): Promise<DeleteResult> {
    const list = this.all();
    const idx = list.findIndex(d => !d.deleted_at && (String(d.id) === String(id) || d.client_code === id));
    if (idx === -1) return { ok: false, notFound: true };
    list[idx] = {
      ...list[idx],
      deleted_at: new Date().toISOString(),
      deleted_by: actor.email,
      version: Number(list[idx].version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
    db.save();
    return { ok: true };
  }

  async appendAudit(entry: AuditEntryInput): Promise<void> {
    const logs = db.getAuditLogs();
    const prevHash = logs[0]?.hash || 'GENESIS';
    const base = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...entry,
      actor: entry.actorEmail || 'system',
      actorRole: entry.actorRole || 'system',
      timestamp: new Date().toISOString(),
    };
    const hash = computeAuditHash(prevHash, base as any);
    logs.unshift({ ...base, prevHash, hash });
    if (logs.length > 20000) logs.length = 20000;
    db.save();
  }

  async listAudit(limit: number): Promise<any[]> {
    return db.getAuditLogs().slice(0, limit).map(l => ({ ...l }));
  }
}

// ---------- Postgres (source de vérité cible) ----------

interface PgClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
  release(): void;
}
interface PgPoolLike {
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

const mapDossierRow = (r: any) => ({
  id: r.id,
  client_code: r.client_code,
  institution: r.institution_name || r.institution,
  branch: r.branch,
  portfolio: r.portfolio,
  debtor_name: r.debtor_name,
  debtor_email: r.debtor_email,
  debtor_phone: r.debtor_phone,
  amount: Number(r.amount),
  recovered_amount: Number(r.recovered_amount),
  status: r.status,
  management_level: r.management_level,
  assigned_to: r.assigned_to,
  risk_level: r.risk_level,
  delay_days: Number(r.delay_days),
  due_date: r.due_date,
  notes: r.notes,
  version: Number(r.version),
  created_by: r.created_by,
  updated_by: r.updated_by,
  created_at: r.created_at,
  updated_at: r.updated_at,
  deleted_at: r.deleted_at,
  deleted_by: r.deleted_by ?? null,
  row_hash: r.row_hash ?? null,
});

export class PgRepo implements Repository {
  readonly kind = 'postgres' as const;
  private pool: Promise<PgPoolLike> | null = null;
  private fallback: JsonRepo = new JsonRepo();

  constructor(private connectionString: string) {}

  private isConnectionError(err: any): boolean {
    if (!err) return false;
    const code = err.code;
    return (
      code === 'EAI_AGAIN' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      err.syscall === 'getaddrinfo' ||
      err.syscall === 'connect' ||
      (typeof err.message === 'string' && (err.message.includes('getaddrinfo') || err.message.includes('connect ECONNREFUSED')))
    );
  }

  private async getPool(): Promise<PgPoolLike> {
    if (!this.pool) {
      this.pool = import('pg').then(pg =>
        new (pg.default || pg).Pool({ connectionString: this.connectionString, max: 10, connectionTimeoutMillis: 5000 }) as unknown as PgPoolLike
      );
    }
    return this.pool;
  }

  /** Exécute une transaction avec le GUC d'institution actif (RLS). */
  private async withTx<T>(institution: string | null | undefined, fn: (client: PgClient) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.institution', $1, true)`, [institution ?? '']);
      await client.query(`SELECT set_config('app.actor', $1, true)`, ['app-server']);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listDossiers(q: DossierListQuery): Promise<DossierPage> {
    try {
      return await this.withTx(q.institution, async client => {
        const where: string[] = [q.includeDeleted ? '1 = 1' : 'deleted_at IS NULL'];
        const params: any[] = [];
        const push = (clause: string, value: any) => { params.push(value); where.push(clause.replace('?', `$${params.length}`)); };

        if (q.institution) push('institution = ?', q.institution);
        if (q.status && q.status !== 'all') push('status = ?', q.status);
        if (q.management_level && q.management_level !== 'all') push('management_level = ?', q.management_level);
        if (q.portfolio && q.portfolio !== 'all') push('LOWER(portfolio) = LOWER(?)', q.portfolio);
        if (q.search) {
          params.push(`%${q.search}%`);
          where.push(`(debtor_name ILIKE $${params.length} OR client_code ILIKE $${params.length} OR debtor_phone ILIKE $${params.length} OR debtor_email ILIKE $${params.length})`);
        }
        const whereSql = where.join(' AND ');

        const cnt = await client.query(`SELECT COUNT(*)::int AS c FROM dossiers WHERE ${whereSql}`, params);
        const total = cnt.rows[0]?.c ?? 0;
        const res = await client.query(
          `SELECT * FROM dossiers WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, q.limit, q.offset]
        );
        return { total, limit: q.limit, offset: q.offset, items: res.rows.map(mapDossierRow) };
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        console.warn(`[PgRepo] Postgres non joignable (${e.message}), bascule sur store JSON.`);
        return this.fallback.listDossiers(q);
      }
      throw e;
    }
  }

  async getDossier(id: string): Promise<any | null> {
    try {
      return await this.getDossierForInstitution(id, null);
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.getDossier(id);
      }
      throw e;
    }
  }

  async getDossierForInstitution(id: string, institution: string | null): Promise<any | null> {
    try {
      return await this.withTx(institution, async client => {
        const res = await client.query(
          `SELECT * FROM dossiers WHERE deleted_at IS NULL AND (id::text = $1 OR client_code = $1) LIMIT 1`,
          [id]
        );
        return res.rows[0] ? mapDossierRow(res.rows[0]) : null;
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.getDossierForInstitution(id, institution);
      }
      throw e;
    }
  }

  async insertDossier(row: any, actor: ActorRef): Promise<InsertResult> {
    try {
      return await this.withTx(actor.institution, async client => {
        const res = await client.query(
          `INSERT INTO dossiers (
             institution, client_code, debtor_name, debtor_email, debtor_phone,
             amount, recovered_amount, status, management_level, assigned_to,
             risk_level, delay_days, due_date, notes, portfolio, branch, created_by, updated_by, version
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,1
           ) RETURNING *`,
          [
            row.institution ?? actor.institution ?? null,
            row.client_code, row.debtor_name, row.debtor_email ?? null, row.debtor_phone ?? null,
            row.amount ?? 0, 0, row.status ?? 'a_relancer', row.management_level ?? 'recouvreur',
            row.assigned_to ?? 'Non assigné', row.risk_level ?? 'Moyen', row.delay_days ?? 0,
            row.due_date ?? null, row.notes ?? '', row.portfolio ?? null, row.branch ?? null,
            actor.email, actor.email,
          ]
        );
        return { record: mapDossierRow(res.rows[0]) };
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.insertDossier(row, actor);
      }
      throw e;
    }
  }

  async patchDossier(id: string, patch: any, actor: ActorRef, expectedVersion?: number | null): Promise<PatchResult> {
    const allowed = ['debtor_name','debtor_email','debtor_phone','amount','recovered_amount','status','management_level','assigned_to','risk_level','delay_days','due_date','notes','portfolio','branch','institution'];
    const cols = Object.keys(patch).filter(k => allowed.includes(k));
    try {
      return await this.withTx(actor.institution, async client => {
        const sel = await client.query(`SELECT * FROM dossiers WHERE deleted_at IS NULL AND (id::text = $1 OR client_code = $1) LIMIT 1`, [id]);
        if (!sel.rows[0]) return { ok: false, notFound: true };
        const before = mapDossierRow(sel.rows[0]);
        if (typeof expectedVersion === 'number' && Number(before.version) !== expectedVersion) {
          return { ok: false, conflict: true, before };
        }
        const setClauses = cols.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const res = await client.query(
          `UPDATE dossiers SET ${setClauses ? setClauses + ',' : ''} updated_by = $${cols.length + 2}, version = version + 1, updated_at = now()
           WHERE id = $1 AND version = $${cols.length + 3} RETURNING *`,
          [sel.rows[0].id, ...cols.map(k => patch[k]), actor.email, typeof expectedVersion === 'number' ? expectedVersion : before.version]
        );
        if (!res.rows[0]) return { ok: false, conflict: true, before };
        return { ok: true, before, after: mapDossierRow(res.rows[0]) };
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.patchDossier(id, patch, actor, expectedVersion);
      }
      throw e;
    }
  }

  async softDeleteDossier(id: string, actor: ActorRef): Promise<DeleteResult> {
    try {
      return await this.withTx(actor.institution, async client => {
        const res = await client.query(
          `UPDATE dossiers SET deleted_at = now(), deleted_by = $2, updated_by = $2, version = version + 1, updated_at = now()
           WHERE deleted_at IS NULL AND (id::text = $1 OR client_code = $1) RETURNING id`,
          [id, actor.email]
        );
        return res.rowCount ? { ok: true } : { ok: false, notFound: true };
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.softDeleteDossier(id, actor);
      }
      throw e;
    }
  }

  async appendAudit(entry: AuditEntryInput): Promise<void> {
    try {
      await this.withTx(null, async client => {
        const prev = await client.query(`SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1`);
        const prevHash = prev.rows[0]?.hash || 'GENESIS';
        const base = {
          action: entry.action,
          details: entry.details,
          actor: entry.actorEmail || 'system',
          actorRole: entry.actorRole || 'system',
          entityType: entry.entityType || null,
          entityId: entry.entityId || null,
          before: entry.before ?? null,
          after: entry.after ?? null,
        };
        const hash = computeAuditHash(prevHash, base as any);
        await client.query(
          `INSERT INTO audit_events (action, details, actor, actor_role, entity_type, entity_id, before_state, after_state, prev_hash, hash, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())`,
          [base.action, base.details, base.actor, base.actorRole, base.entityType, base.entityId,
           JSON.stringify(base.before), JSON.stringify(base.after), prevHash, hash]
        );
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.appendAudit(entry);
      }
      throw e;
    }
  }

  async listAudit(limit: number): Promise<any[]> {
    try {
      return await this.withTx(null, async client => {
        const res = await client.query(`SELECT * FROM audit_events ORDER BY id DESC LIMIT $1`, [limit]);
        return res.rows.map(r => ({
          id: String(r.id),
          action: r.action,
          details: r.details,
          actor: r.actor,
          actorRole: r.actor_role,
          entityType: r.entity_type,
          entityId: r.entity_id,
          before: r.before_state,
          after: r.after_state,
          prevHash: r.prev_hash,
          hash: r.hash,
          timestamp: r.created_at,
        }));
      });
    } catch (e: any) {
      if (this.isConnectionError(e)) {
        return this.fallback.listAudit(limit);
      }
      throw e;
    }
  }
}

/** Liste les dossiers du périmètre quel que soit le driver (PG => repo, JSON => store filtré). */
export async function scopedDossiers(institution: string | null, opts: { includeDeleted?: boolean } = {}): Promise<any[]> {
  const repo = getRepository();
  if (repo.kind === 'postgres') {
    const page = await repo.listDossiers({ institution, limit: 100_000, offset: 0, includeDeleted: opts.includeDeleted });
    return page.items;
  }
  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  return db.getDossiers()
    .filter(d => opts.includeDeleted || !(d as any).deleted_at)
    .filter(d => !institution || norm((d as any).institution) === norm(institution));
}

// ---------- Fabrique ----------

let repo: Repository | null = null;

export function isValidPostgresUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '0000' || trimmed === 'undefined' || trimmed === 'null') return false;
  return /^postgres(?:ql)?:\/\/.+/i.test(trimmed);
}

export function getRepository(): Repository {
  if (!repo) {
    const rawUrl = (process.env.DATABASE_URL || '').trim();
    const isPg = isValidPostgresUrl(rawUrl);
    repo = isPg ? new PgRepo(rawUrl) : new JsonRepo();
    const mode = isPg
      ? 'postgres (source de vérité cible, collections non migrées encore en JSON de démo)'
      : 'json (démonstration) — définir DATABASE_URL pour activer Postgres';
    console.log(`[repo] persistance active : ${mode}`);
  }
  return repo;
}

/** Utilisé par les tests : permet d'injecter une instance. */
export function setRepositoryForTesting(r: Repository | null) {
  repo = r;
}
