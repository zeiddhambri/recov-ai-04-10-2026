// RecovAI — lot P1 : tests d'intégration de l'API complète (mode store JSON,
// sans DATABASE_URL) via supertest : authentification, cloisonnement institution,
// pagination, verrou optimiste, soft-delete, export CSV et journal d'audit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RECOVAI_NO_LISTEN = '1';
process.env.RECOVAI_SKIP_VITE = '1';
process.env.RECOVAI_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'recovai-it-'));
delete process.env.DATABASE_URL; // ce fichier teste exclusivement le mode JSON

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { resetLockouts } from './lib/lockout';

let app: any;

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status, `login ${email} -> ${res.status} ${JSON.stringify(res.body)}`).toBe(200);
  return res.body.token as string;
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('API RecovAI — durcissement P1 (store JSON)', () => {
  let tokAmen: string;   // agent rattaché à Amen Bank
  let tokOther: string;  // agent rattaché à Enda Tamweel
  let tokAll: string;    // agent transverse (compte de démo historique)
  let tokManager: string;

  beforeAll(async () => {
    resetLockouts();
    const mod = await import('../server');
    app = await (mod as any).createApp();
    const tenantPass = (process.env.DEMO_TENANT_PASSWORD && process.env.DEMO_TENANT_PASSWORD !== '0000') ? process.env.DEMO_TENANT_PASSWORD : 'RecovAI#Tenant!2026';
    const agentPass = (process.env.DEMO_AGENT_PASSWORD && process.env.DEMO_AGENT_PASSWORD !== '0000') ? process.env.DEMO_AGENT_PASSWORD : 'RecovAI#Agent!2026';
    const managerPass = (process.env.DEMO_MANAGER_PASSWORD && process.env.DEMO_MANAGER_PASSWORD !== '0000') ? process.env.DEMO_MANAGER_PASSWORD : 'RecovAI#Manager!2026';

    tokAmen = await login('agent.amen@recovai.tn', tenantPass);
    tokOther = await login('agent.tunisiemf@recovai.tn', tenantPass);
    tokAll = await login('agent@recovai.tn', agentPass);
    tokManager = await login('directeur@recovai.tn', managerPass);
  });

  it('refuse l’accès sans jeton (401)', async () => {
    const res = await request(app).get('/api/dossiers');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('cloisonne la liste par institution et retourne l’enveloppe de pagination', async () => {
    const res = await request(app).get('/api/dossiers').set(auth(tokAmen));
    expect(res.status).toBe(200);
    expect(res.body.scope).toEqual({ institution: 'Amen Bank' });
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const d of res.body.data) expect(d.institution).toBe('Amen Bank');

    const resOther = await request(app).get('/api/dossiers').set(auth(tokOther));
    for (const d of resOther.body.data) expect(d.institution).toBe('Enda Tamweel');

    const resAll = await request(app).get('/api/dossiers').set(auth(tokAll));
    expect(resAll.body.count).toBeGreaterThanOrEqual(res.body.count + resOther.body.count);
  });

  it('page avec limit/offset et hasMore', async () => {
    const full = await request(app).get('/api/dossiers').set(auth(tokAll));
    const total = full.body.count as number;
    const page = await request(app).get('/api/dossiers?limit=2&offset=0').set(auth(tokAll));
    expect(page.body.data.length).toBe(Math.min(2, total));
    expect(page.body.hasMore).toBe(total > 2);
    const rest = await request(app).get(`/api/dossiers?limit=1000&offset=2`).set(auth(tokAll));
    expect(page.body.data.length + rest.body.data.length).toBe(total);
  });

  it('force l’institution du créateur à celle de son compte (anti-fraude de rattachement)', async () => {
    const payload = {
      debtor_name: 'Société Test Cloisonnement',
      amount: 1500,
      institution: 'Enda Tamweel', // tentative de rattachement frauduleux
    };
    const res = await request(app).post('/api/dossiers').set(auth(tokAmen)).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.institution).toBe('Amen Bank');
    expect(res.body.client_code).toMatch(/^RCV-\d{4}-\d{4}$/);
    expect(res.body.created_by).toBe('agent.amen@recovai.tn');

    // invisible pour l’autre locataire
    const other = await request(app).get(`/api/dossiers?search=${encodeURIComponent('Société Test Cloisonnement')}`).set(auth(tokOther));
    expect(other.body.count).toBe(0);
  });

  it('valide les entrées (400 + VALIDATION_ERROR)', async () => {
    const res = await request(app).post('/api/dossiers').set(auth(tokAmen)).send({ debtor_name: 'A', amount: -5 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('applique le verrou optimiste (409 sur version obsolète, 200 à la bonne version)', async () => {
    const created = await request(app).post('/api/dossiers').set(auth(tokAmen))
      .send({ debtor_name: 'Client Verrou Optimiste', amount: 900 });
    const id = created.body.id;
    expect(created.body.version).toBe(1);

    const stale = await request(app).patch(`/api/dossiers/${id}`).set(auth(tokAmen)).send({ status: 'en_relance', version: 42 });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('VERSION_CONFLICT');

    const ok = await request(app).patch(`/api/dossiers/${id}`).set(auth(tokAmen)).send({ status: 'en_relance', version: 1 });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('en_relance');
    expect(ok.body.version).toBe(2);

    const etag = await request(app).patch(`/api/dossiers/${id}`).set({ ...auth(tokAmen), 'If-Match': '2' }).send({ notes: 'touché via If-Match' });
    expect(etag.status).toBe(200);
    expect(etag.body.version).toBe(3);
  });

  it('soft-delete réservé au manager ; le dossier disparaît des listes et reste audité', async () => {
    const created = await request(app).post('/api/dossiers').set(auth(tokAmen))
      .send({ debtor_name: 'Client A Supprimer', amount: 100 });
    const id = created.body.id;

    const denied = await request(app).delete(`/api/dossiers/${id}`).set(auth(tokAmen));
    expect(denied.status).toBe(403);

    const ok = await request(app).delete(`/api/dossiers/${id}`).set(auth(tokManager));
    expect(ok.status).toBe(200);
    expect(ok.body.softDelete).toBe(true);

    const gone = await request(app).get(`/api/dossiers/${id}`).set(auth(tokAmen));
    expect(gone.status).toBe(404);
  });

  it('journalise les écritures avec différentiels et chaînage (lecture manager/admin uniquement)', async () => {
    const denied = await request(app).get('/api/audit?limit=50').set(auth(tokAmen));
    expect(denied.status).toBe(403);

    const res = await request(app).get('/api/audit?limit=200').set(auth(tokManager));
    expect(res.status).toBe(200);
    const actions = res.body.data.map((l: any) => l.action);
    expect(actions).toContain('CREATE_DOSSIER');
    expect(actions).toContain('UPDATE_DOSSIER');
    expect(actions).toContain('DELETE_DOSSIER');

    const upd = res.body.data.find((l: any) => l.action === 'UPDATE_DOSSIER');
    expect(upd.beforeState || upd.before).toBeTruthy();
    expect(upd.afterState || upd.after).toBeTruthy();
    expect(upd.hash).toMatch(/^[0-9a-f]{64}$/);

    // chaînage : chaque hash couple avec le prev_hash du précédent (ordre magasin)
    const chrono = [...res.body.data].reverse();
    for (let i = 1; i < Math.min(chrono.length, 10); i++) {
      expect(chrono[i].prevHash).toBe(chrono[i - 1].hash);
    }
  });

  it('exporte le portefeuille en CSV cloisonné (batch SFTP-ready)', async () => {
    const res = await request(app).get('/api/export/dossiers.csv').set(auth(tokAmen));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.split(/\r?\n/).filter(Boolean);
    expect(lines[0]).toContain('client_code;institution;');
    const dataRows = lines.slice(1);
    expect(dataRows.length).toBeGreaterThan(0);
    for (const line of dataRows) expect(line).toContain('Amen Bank');
    expect(Number(res.headers['x-recovai-rows'])).toBe(dataRows.length);
  });

  it('enregistre une action sur dossier (paiement → statut) et la journalise', async () => {
    const created = await request(app).post('/api/dossiers').set(auth(tokAmen))
      .send({ debtor_name: 'Client Paiement Partiel', amount: 1000 });
    const res = await request(app).post(`/api/dossiers/${created.body.id}/actions`).set(auth(tokAmen))
      .send({ type: 'payment', amount: 400, note: 'Acompte chèque 12345' });
    expect(res.status).toBe(201);
    expect(res.body.dossier.status).toBe('partiellement_paye');
    expect(res.body.dossier.recovered_amount).toBe(400);
    expect(res.body.action.performedBy).toBe('agent.amen@recovai.tn');
  });

  it('couche de compat Supabase : protégée, tables connues seulement', async () => {
    const unauth = await request(app).get('/rest/v1/dossiers');
    expect(unauth.status).toBe(401);
    const unknown = await request(app).get('/rest/v1/secrets_secrets').set(auth(tokAll));
    expect(unknown.status).toBe(501);
    const select = await request(app).get('/rest/v1/dossiers?limit=3').set(auth(tokAll));
    expect(select.status).toBe(200);
    expect(Array.isArray(select.body)).toBe(true);
  });
});
