// RecovAI — Gestion des refresh tokens tournants + révocation server-side (P1.7)
// - Refresh token opaque (32 bytes hex), stocké côté serveur avec métadonnées
// - Rotation : chaque usage génère un nouveau refresh token, l'ancien est invalidé
// - Révocation : logout, révocation globale par utilisateur, expiration
// - Politique de session : access court (15 min), refresh 7 jours, révocation server-side

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RefreshTokenRecord {
  id: string; // jti
  tokenHash: string; // SHA-256 du token opaque
  userId: string;
  email: string;
  role: string;
  institution: string | null;
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  replacedBy: string | null; // id du nouveau token issu de la rotation
  ip: string;
  userAgent: string;
}

const DATA_DIR = (process.env.RECOVAI_DATA_DIR && process.env.RECOVAI_DATA_DIR !== '0000') ? path.resolve(process.env.RECOVAI_DATA_DIR) : path.join(process.cwd(), 'data');
const REFRESH_FILE = path.join(DATA_DIR, 'refresh_tokens.json');

const rawAccess = Number(process.env.AUTH_ACCESS_TTL_SECONDS);
const ACCESS_TTL_SECONDS = (Number.isFinite(rawAccess) && rawAccess > 0) ? rawAccess : 15 * 60; // 15 min
const rawRefresh = Number(process.env.AUTH_REFRESH_TTL_SECONDS);
const REFRESH_TTL_SECONDS = (Number.isFinite(rawRefresh) && rawRefresh > 0) ? rawRefresh : 7 * 24 * 3600; // 7 jours

let store: Map<string, RefreshTokenRecord> = new Map(); // key = id
let hashIndex: Map<string, string> = new Map(); // tokenHash -> id

function loadStore() {
  try {
    if (fs.existsSync(REFRESH_FILE)) {
      const raw = fs.readFileSync(REFRESH_FILE, 'utf-8');
      const arr = JSON.parse(raw) as RefreshTokenRecord[];
      store = new Map(arr.map(r => [r.id, r]));
      hashIndex = new Map(arr.map(r => [r.tokenHash, r.id]));
    }
  } catch (e) {
    console.warn('[refreshTokens] load failed:', (e as Error).message);
    store = new Map();
    hashIndex = new Map();
  }
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const arr = Array.from(store.values());
    // ne garder que les non expirés + 30 jours de grace pour audit
    const cutoff = Date.now() - 30 * 24 * 3600_000;
    const filtered = arr.filter(r => r.expiresAt > cutoff || (r.revokedAt && r.revokedAt > cutoff));
    fs.writeFileSync(REFRESH_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[refreshTokens] persist failed:', (e as Error).message);
  }
}

loadStore();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getSessionPolicy() {
  return { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS };
}

export function createRefreshToken(user: { id: string; email: string; role: string; institution?: string | null }, ip = 'unknown', userAgent = 'unknown'): { refreshToken: string; record: RefreshTokenRecord } {
  const raw = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const id = crypto.randomUUID();
  const now = Date.now();
  const rec: RefreshTokenRecord = {
    id,
    tokenHash: hashToken(raw),
    userId: user.id,
    email: user.email,
    role: user.role,
    institution: user.institution ?? null,
    createdAt: now,
    expiresAt: now + REFRESH_TTL_SECONDS * 1000,
    lastUsedAt: null,
    revokedAt: null,
    replacedBy: null,
    ip,
    userAgent,
  };
  store.set(id, rec);
  hashIndex.set(rec.tokenHash, id);
  persist();
  return { refreshToken: raw, record: rec };
}

export function findRefreshRecordByToken(rawToken: string): RefreshTokenRecord | null {
  const h = hashToken(rawToken);
  const id = hashIndex.get(h);
  if (!id) return null;
  const rec = store.get(id) || null;
  if (!rec) return null;
  if (rec.revokedAt) return null;
  if (rec.expiresAt < Date.now()) return null;
  return rec;
}

export function rotateRefreshToken(oldRawToken: string, ip = 'unknown', userAgent = 'unknown'): { newRawToken: string; newRecord: RefreshTokenRecord; oldRecord: RefreshTokenRecord } | null {
  const oldRec = findRefreshRecordByToken(oldRawToken);
  if (!oldRec) return null;
  // révoquer l'ancien
  oldRec.revokedAt = Date.now();
  oldRec.lastUsedAt = Date.now();

  const raw = crypto.randomBytes(32).toString('hex');
  const id = crypto.randomUUID();
  const now = Date.now();
  const newRec: RefreshTokenRecord = {
    id,
    tokenHash: hashToken(raw),
    userId: oldRec.userId,
    email: oldRec.email,
    role: oldRec.role,
    institution: oldRec.institution,
    createdAt: now,
    expiresAt: now + REFRESH_TTL_SECONDS * 1000,
    lastUsedAt: null,
    revokedAt: null,
    replacedBy: null,
    ip,
    userAgent,
  };
  oldRec.replacedBy = id;
  store.set(id, newRec);
  hashIndex.set(newRec.tokenHash, id);
  persist();
  return { newRawToken: raw, newRecord: newRec, oldRecord: oldRec };
}

export function revokeRefreshToken(rawToken: string): boolean {
  const rec = findRefreshRecordByToken(rawToken);
  if (!rec) return false;
  rec.revokedAt = Date.now();
  persist();
  return true;
}

export function revokeAllForUser(userId: string) {
  let count = 0;
  for (const rec of store.values()) {
    if (rec.userId === userId && !rec.revokedAt && rec.expiresAt > Date.now()) {
      rec.revokedAt = Date.now();
      count++;
    }
  }
  if (count) persist();
  return count;
}

export function listActiveSessions(userId: string): RefreshTokenRecord[] {
  const now = Date.now();
  return Array.from(store.values())
    .filter(r => r.userId === userId && !r.revokedAt && r.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function cleanupExpired() {
  const now = Date.now();
  let removed = 0;
  for (const [id, rec] of store.entries()) {
    if (rec.expiresAt < now - 7 * 24 * 3600_000) { // 7 jours après expiration, purge
      store.delete(id);
      hashIndex.delete(rec.tokenHash);
      removed++;
    }
  }
  if (removed) persist();
}

setInterval(cleanupExpired, 60 * 60_000).unref?.();
