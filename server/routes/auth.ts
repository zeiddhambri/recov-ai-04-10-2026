import { Router } from 'express';
import { findUserByEmail, verifyPassword, signToken, signShortToken, loginRateLimit, requireAuth, audit, getAccessTtl } from '../auth';
import { validate, loginSchema } from '../validation';
import { checkLockout, recordFailure, recordSuccess, getLockoutConfig } from '../lib/lockout';
import { isMfaEnabled, getDecryptedSecret, verifyBackupCode } from '../lib/mfaStore';
import { verifyTotp } from '../lib/totp';
import { createRefreshToken, getSessionPolicy } from '../lib/refreshTokens';
import { getRepository } from '../db/repo';
import { z } from 'zod';

const router = Router();

const loginMfaSchema = z.object({
  email: z.string().trim().min(3),
  mfaCode: z.string().trim().min(6).max(8),
  mfaToken: z.string().trim().min(10).optional(), // token temporaire émis lors du 1er step si MFA requis
});

// POST /api/auth/login — unique point d'entrée d'authentification du backend (P1.7 avec MFA + lockout + refresh tournant).
router.post('/login', loginRateLimit, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  // Vérif lockout
  const lockCheck = checkLockout(email, ip);
  if (lockCheck.locked) {
    audit('LOGIN_LOCKED', `Tentative login sur compte verrouillé « ${email} » depuis ${ip}`, null);
    return res.status(423).json({
      error: 'Compte temporairement verrouillé après plusieurs échecs. Réessayez ultérieurement.',
      code: 'ACCOUNT_LOCKED',
      retryAfterMs: lockCheck.retryAfterMs,
      retryAfterSeconds: Math.ceil((lockCheck.retryAfterMs || 0) / 1000),
    });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    const fail = recordFailure(email, ip);
    audit('LOGIN_FAILED', `Échec d'authentification pour « ${email} » depuis ${ip}`, null);
    if (fail.locked) {
      return res.status(423).json({
        error: 'Compte verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
        code: 'ACCOUNT_LOCKED',
        retryAfterMs: (fail.lockedUntil || 0) - Date.now(),
      });
    }
    // Message générique : ne pas révéler si l'adresse existe.
    return res.status(401).json({ error: 'Identifiants invalides', code: 'INVALID_CREDENTIALS' });
  }

  // Succès password — check MFA
  const mfaActive = isMfaEnabled(user.id);

  if (mfaActive) {
    // On émet un token temporaire avec mfaVerified=false et courte durée (5 min) pour le second step
    const { token: mfaToken, expiresAt: mfaExpiresAt } = signToken(
      { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution, mfaVerified: false, amr: ['pwd'] },
      5 * 60
    );
    // On ne crée pas encore de refresh token — il sera créé après MFA
    audit('LOGIN_MFA_REQUIRED', `Connexion password OK, MFA requis pour ${email}`, { email: user.email, role: user.role });
    await getRepository().appendAudit({
      action: 'LOGIN_MFA_REQUIRED',
      details: `Password OK, MFA requis pour ${email} depuis ${ip}`,
      actorEmail: user.email, actorRole: user.role, actorId: user.id,
      entityType: 'user', entityId: user.id,
    });
    return res.json({
      mfaRequired: true,
      mfaToken,
      mfaExpiresAt,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution ?? null },
      message: 'MFA requis — veuillez fournir le code TOTP',
    });
  }

  // Pas de MFA — login complet
  recordSuccess(email, ip);
  const { token, expiresAt } = signShortToken({ id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution, mfaVerified: true, amr: ['pwd'] });
  const { refreshToken, record } = createRefreshToken({ id: user.id, email: user.email, role: user.role, institution: user.institution }, ip, ua);

  audit('LOGIN_SUCCESS', `Connexion réussie pour ${email}`, { email: user.email, role: user.role });
  await getRepository().appendAudit({
    action: 'LOGIN_SUCCESS',
    details: `Connexion réussie pour ${email} depuis ${ip}`,
    actorEmail: user.email, actorRole: user.role, actorId: user.id,
    entityType: 'user', entityId: user.id,
  });

  res.json({
    token,
    expiresAt,
    refreshToken,
    refreshExpiresAt: record.expiresAt,
    accessTtlSeconds: getAccessTtl(),
    refreshTtlSeconds: getSessionPolicy().REFRESH_TTL_SECONDS,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution ?? null },
    mfaEnabled: false,
  });
});

// POST /api/auth/login/mfa — second step après password quand MFA actif
router.post('/login/mfa', validate(loginMfaSchema), async (req, res) => {
  const { email, mfaCode, mfaToken } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  // Vérif lockout aussi sur ce endpoint
  const lockCheck = checkLockout(email, ip);
  if (lockCheck.locked) return res.status(423).json({ error: 'Compte verrouillé', code: 'ACCOUNT_LOCKED', retryAfterMs: lockCheck.retryAfterMs });

  // Vérif que le mfaToken est valide si fourni (optionnel mais recommandé)
  // On vérifie le TOTP
  const secret = getDecryptedSecret(user.id);
  if (!secret) return res.status(400).json({ error: 'MFA non configuré pour ce compte', code: 'MFA_NOT_CONFIGURED' });

  let valid = false;
  let method: 'totp' | 'backup' = 'totp';
  const totpCheck = verifyTotp(mfaCode, secret, { window: 1 });
  if (totpCheck.valid) valid = true;
  else if (verifyBackupCode(user.id, mfaCode)) { valid = true; method = 'backup'; }

  if (!valid) {
    recordFailure(email, ip);
    audit('MFA_LOGIN_FAILED', `Échec MFA pour ${email} depuis ${ip}`, { email: user.email, role: user.role });
    return res.status(401).json({ error: 'Code MFA invalide', code: 'MFA_INVALID' });
  }

  recordSuccess(email, ip);
  const { token, expiresAt } = signShortToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    institution: user.institution,
    mfaVerified: true,
    amr: method === 'backup' ? ['pwd', 'mfa', 'backup'] : ['pwd', 'mfa', 'otp'],
  });
  const { refreshToken, record } = createRefreshToken({ id: user.id, email: user.email, role: user.role, institution: user.institution }, ip, ua);

  audit('LOGIN_MFA_SUCCESS', `Connexion MFA réussie pour ${email} (${method})`, { email: user.email, role: user.role });
  await getRepository().appendAudit({
    action: 'LOGIN_MFA_SUCCESS',
    details: `MFA ${method} OK pour ${email} depuis ${ip}`,
    actorEmail: user.email, actorRole: user.role, actorId: user.id,
    entityType: 'user', entityId: user.id,
  });

  res.json({
    token,
    expiresAt,
    refreshToken,
    refreshExpiresAt: record.expiresAt,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution ?? null },
    mfaEnabled: true,
    mfaMethod: method,
  });
});

// GET /api/auth/me — session courante (utilisé par le front pour valider le jeton).
router.get('/me', requireAuth, (req, res) => {
  const auth = req.auth!;
  res.json({
    user: { id: auth.sub, email: auth.email, name: auth.name, role: auth.role, institution: auth.institution ?? null, mfaVerified: auth.mfaVerified ?? false, amr: auth.amr || [] },
    expiresAt: auth.exp * 1000,
    mfaEnabled: isMfaEnabled(auth.sub),
    sessionPolicy: getSessionPolicy(),
  });
});

// GET /api/auth/policy — politique de session & lockout (publique)
router.get('/policy', (req, res) => {
  res.json({
    lockout: getLockoutConfig(),
    session: getSessionPolicy(),
    mfa: {
      issuer: 'RecovAI',
      period: 30,
      digits: 6,
      enforced: (process.env.MFA_ENFORCED_ROLES || 'admin,manager').split(','),
    },
  });
});

export default router;
