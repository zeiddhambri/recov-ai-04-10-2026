// RecovAI — Politique de verrouillage & rate limiting métier (P1.7)
// - Verrouillage après N tentatives échouées par utilisateur + IP
// - Fenêtre glissante, durée de blocage exponentielle
// - Stockage en mémoire (mode JSON) + persistance optionnelle en fichier pour démo

interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lastFailureAt: number;
  lockedUntil: number | null;
}

const attemptsByUser = new Map<string, AttemptRecord>();
const attemptsByIp = new Map<string, AttemptRecord>();

// Config par env, valeurs par défaut conformes aux recommandations ANSSI/BCT
const parsePositiveInt = (v: string | undefined, def: number): number => {
  if (!v || v === '0000' || v.trim() === '') return def;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

const MAX_FAILURES = parsePositiveInt(process.env.AUTH_MAX_FAILURES, 5);
const WINDOW_MS = parsePositiveInt(process.env.AUTH_FAILURE_WINDOW_MS, 15 * 60_000); // 15 min
const LOCKOUT_BASE_MS = parsePositiveInt(process.env.AUTH_LOCKOUT_BASE_MS, 15 * 60_000); // 15 min
const LOCKOUT_MAX_MS = parsePositiveInt(process.env.AUTH_LOCKOUT_MAX_MS, 2 * 60 * 60_000); // 2h

export function resetLockouts(): void {
  attemptsByUser.clear();
  attemptsByIp.clear();
}

function getRecord(map: Map<string, AttemptRecord>, key: string): AttemptRecord {
  let rec = map.get(key);
  if (!rec) {
    rec = { failures: 0, firstFailureAt: 0, lastFailureAt: 0, lockedUntil: null };
    map.set(key, rec);
  }
  return rec;
}

function isLocked(rec: AttemptRecord, now: number): boolean {
  if (rec.lockedUntil && rec.lockedUntil > now) return true;
  // si fenêtre expirée, reset
  if (rec.firstFailureAt && now - rec.firstFailureAt > WINDOW_MS) {
    rec.failures = 0;
    rec.firstFailureAt = 0;
    rec.lockedUntil = null;
  }
  return false;
}

export function checkLockout(userKey: string, ipKey: string): { locked: boolean; retryAfterMs?: number; reason?: string } {
  const now = Date.now();
  const userRec = getRecord(attemptsByUser, userKey.toLowerCase());
  const ipRec = getRecord(attemptsByIp, ipKey);

  if (isLocked(userRec, now)) {
    return { locked: true, retryAfterMs: userRec.lockedUntil! - now, reason: `Compte verrouillé après ${MAX_FAILURES} échecs (politique P1.7)` };
  }
  if (isLocked(ipRec, now)) {
    return { locked: true, retryAfterMs: ipRec.lockedUntil! - now, reason: `IP temporairement bloquée` };
  }
  return { locked: false };
}

export function recordFailure(userKey: string, ipKey: string): { locked: boolean; lockedUntil?: number } {
  const now = Date.now();
  const userRec = getRecord(attemptsByUser, userKey.toLowerCase());
  const ipRec = getRecord(attemptsByIp, ipKey);

  // init fenêtre
  if (userRec.failures === 0) userRec.firstFailureAt = now;
  if (ipRec.failures === 0) ipRec.firstFailureAt = now;

  userRec.failures += 1;
  userRec.lastFailureAt = now;
  ipRec.failures += 1;
  ipRec.lastFailureAt = now;

  // dépassement fenêtre ? reset si hors fenêtre
  if (now - userRec.firstFailureAt > WINDOW_MS) {
    userRec.failures = 1;
    userRec.firstFailureAt = now;
    userRec.lockedUntil = null;
  }
  if (now - ipRec.firstFailureAt > WINDOW_MS) {
    ipRec.failures = 1;
    ipRec.firstFailureAt = now;
    ipRec.lockedUntil = null;
  }

  if (userRec.failures >= MAX_FAILURES) {
    // backoff exponentiel : base * 2^(failures - MAX)
    const exponent = Math.min(userRec.failures - MAX_FAILURES, 4);
    const duration = Math.min(LOCKOUT_BASE_MS * Math.pow(2, exponent), LOCKOUT_MAX_MS);
    userRec.lockedUntil = now + duration;
    return { locked: true, lockedUntil: userRec.lockedUntil };
  }
  if (ipRec.failures >= MAX_FAILURES * 2) {
    const duration = LOCKOUT_BASE_MS;
    ipRec.lockedUntil = now + duration;
    return { locked: true, lockedUntil: ipRec.lockedUntil };
  }
  return { locked: false };
}

export function recordSuccess(userKey: string, ipKey: string) {
  attemptsByUser.delete(userKey.toLowerCase());
  // on ne reset pas l'IP immédiatement pour éviter le contournement par changement d'utilisateur,
  // mais on décrémente partiellement
  const ipRec = attemptsByIp.get(ipKey);
  if (ipRec) {
    ipRec.failures = Math.max(0, ipRec.failures - 1);
    if (ipRec.failures === 0) attemptsByIp.delete(ipKey);
  }
}

export function getLockoutConfig() {
  return { MAX_FAILURES, WINDOW_MS, LOCKOUT_BASE_MS, LOCKOUT_MAX_MS };
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attemptsByUser.entries()) {
    if (v.lockedUntil && v.lockedUntil < now && now - v.lastFailureAt > WINDOW_MS) attemptsByUser.delete(k);
    else if (!v.lockedUntil && now - v.firstFailureAt > WINDOW_MS) attemptsByUser.delete(k);
  }
  for (const [k, v] of attemptsByIp.entries()) {
    if (v.lockedUntil && v.lockedUntil < now && now - v.lastFailureAt > WINDOW_MS) attemptsByIp.delete(k);
    else if (!v.lockedUntil && now - v.firstFailureAt > WINDOW_MS) attemptsByIp.delete(k);
  }
}, 60_000).unref?.();
