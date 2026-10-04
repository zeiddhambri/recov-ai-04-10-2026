import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, findUserByEmail, verifyPassword, audit } from './auth';
import { db } from './db/dataStore';
import { createDossierSchema, relanceSendSchema, validate } from './validation';

describe('auth — jetons signés (P0)', () => {
  it('émet et vérifie un jeton round-trip', () => {
    const user = { id: 'u1', email: 'agent@recovai.tn', name: 'Agent', role: 'agent' as const };
    const { token, expiresAt } = signToken(user, 60);
    expect(expiresAt).toBeGreaterThan(Date.now());
    const payload = verifyToken(token);
    expect(payload?.email).toBe('agent@recovai.tn');
    expect(payload?.role).toBe('agent');
  });

  it('rejette un jeton altéré (signature)', () => {
    const { token } = signToken({ id: 'u1', email: 'a@b.tn', name: 'A', role: 'agent' }, 60);
    const [body, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), role: 'admin' })).toString('base64url')}.${sig}`;
    expect(verifyToken(forged)).toBeNull();
  });

  it('rejette un jeton expiré', () => {
    const { token } = signToken({ id: 'u1', email: 'a@b.tn', name: 'A', role: 'agent' }, -5);
    expect(verifyToken(token)).toBeNull();
  });
});

describe('auth — comptes de démonstration (P0)', () => {
  it('valide le bon mot de passe et rejette le mauvais', () => {
    const user = findUserByEmail('AGENT@recovai.tn');
    expect(user).toBeTruthy();
    const pass = (process.env.DEMO_AGENT_PASSWORD && process.env.DEMO_AGENT_PASSWORD !== '0000')
      ? process.env.DEMO_AGENT_PASSWORD
      : 'RecovAI#Agent!2026';
    expect(verifyPassword(user!, pass)).toBe(true);
    expect(verifyPassword(user!, 'mauvais-mot-de-passe')).toBe(false);
  });
});

describe('validation — schémas zod (P0)', () => {
  it('refuse un dossier sans nom de débiteur', () => {
    expect(createDossierSchema.safeParse({ amount: 500 }).success).toBe(false);
  });

  it('accepte un dossier minimal et normalise les montants', () => {
    const parsed = createDossierSchema.parse({ debtor_name: 'DEBITEUR ALPHA DEMO', amount: '145000' });
    expect(parsed.amount).toBe(145000);
  });

  it('impose un canal de relance connu', () => {
    expect(relanceSendSchema.safeParse({ dossierId: '1', channel: 'carrier-pigeon' }).success).toBe(false);
    expect(relanceSendSchema.parse({ dossierId: '1' }).channel).toBe('sms');
  });

  it('middleware validate renvoie 400 + détails sur payload invalide', async () => {
    const mw = validate(createDossierSchema);
    let status = 0;
    let json: any = null;
    let nextCalled = false;
    const req: any = { body: { amount: -12 } };
    let finish: () => void = () => {};
    const res: any = {
      status: (s: number) => { status = s; return res; },
      json: (j: any) => { json = j; finish(); },
    };
    await new Promise<void>(resolve => {
      finish = resolve;
      mw(req, res, () => { nextCalled = true; resolve(); });
    });
    expect(status).toBe(400);
    expect(nextCalled).toBe(false);
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details.length).toBeGreaterThan(0);
  });
});

describe('audit journal (P0)', () => {
  it('horodate, attribue l\'auteur et chaîne les entrées', () => {
    const before = db.getAuditLogs().length;
    audit('TEST_ACTION', 'entrée de test', { email: 'agent@recovai.tn', role: 'agent' });
    audit('TEST_ACTION_2', 'seconde entrée', { email: 'admin@recovai.tn', role: 'admin' });
    const logs = db.getAuditLogs();
    expect(logs.length).toBe(before + 2);
    expect(logs[0].actor).toBe('admin@recovai.tn');
    expect(logs[0].prevHash).toBe(logs[1].hash);
    expect(logs[1].hash).toHaveLength(64); // SHA-256 complet depuis P1
  });
});

describe('rateLimit — cloisonnement des compteurs (correctif P1)', () => {
  it('deux limiteurs partagés sur la même IP ne consomment pas le même bucket', async () => {
    const { rateLimit } = await import('./auth');
    const strict = rateLimit(2, 60_000);
    const large = rateLimit(50, 60_000);
    const req = { headers: { 'x-forwarded-for': '9.9.9.9' }, ip: '9.9.9.9' } as any;
    const res: any = { status() { return res; }, json() { return res; } };
    let nextCalls = 0;
    const next = () => { nextCalls++; };
    strict(req, res, next);
    strict(req, res, next);
    strict(req, res, next); // 3e sur le strict -> 429, next non appelé
    expect(nextCalls).toBe(2);
    for (let i = 0; i < 10; i++) large(req, res, next); // le large ne doit pas être épuisé
    expect(nextCalls).toBe(12);
  });
});
