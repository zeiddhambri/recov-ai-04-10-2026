// RecovAI — Routes MFA TOTP + Refresh tournant + Sessions (P1.7)

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../validation';
import { audit, findUserByEmail, requireAuth, signShortToken, signToken, getAccessTtl } from '../auth';
import { verifyTotp, buildOtpauthUri, remainingSeconds } from '../lib/totp';
import { createMfaSetup, getMfaRecord, getDecryptedSecret, enableMfa, disableMfa, isMfaEnabled, verifyBackupCode, listMfa } from '../lib/mfaStore';
import { createRefreshToken, findRefreshRecordByToken, rotateRefreshToken, revokeRefreshToken, revokeAllForUser, listActiveSessions, getSessionPolicy } from '../lib/refreshTokens';
import { checkLockout, recordFailure, recordSuccess } from '../lib/lockout';
import { getRepository } from '../db/repo';

const router = Router();

// ---------- Schemas ----------
const totpVerifySchema = z.object({
  code: z.string().trim().min(6).max(8), // 6 digits ou 8 backup
  // pour setup, on peut aussi envoyer le secret temporaire (côté serveur on le retrouve via userId)
});

const refreshSchema = z.object({
  refreshToken: z.string().trim().min(10),
});

// ---------- MFA Setup ----------
router.post('/setup', requireAuth, async (req, res) => {
  const auth = req.auth!;
  const existing = getMfaRecord(auth.sub);
  if (existing && existing.enabled) {
    return res.status(400).json({ error: 'MFA déjà activé pour ce compte', code: 'MFA_ALREADY_ENABLED' });
  }
  const { secret, record, backupCodes } = createMfaSetup(auth.sub, auth.email);
  const otpauthUri = buildOtpauthUri(secret, auth.email, 'RecovAI');
  // Audit
  await getRepository().appendAudit({
    action: 'MFA_SETUP_INITIATED',
    details: `Initialisation MFA TOTP pour ${auth.email}`,
    actorEmail: auth.email, actorRole: auth.role, actorId: auth.sub,
    entityType: 'user', entityId: auth.sub,
  });
  audit('MFA_SETUP_INITIATED', `MFA setup initié pour ${auth.email}`, auth);

  res.json({
    secret, // à afficher une seule fois, ou encodé en QR côté front
    otpauthUri,
    qrData: otpauthUri, // le front génère le QR
    backupCodes, // à afficher une seule fois
    remainingSeconds: remainingSeconds(),
    message: 'Scannez le QR code avec Google Authenticator / Authy / 1Password. Conservez les codes de secours.',
  });
});

router.post('/verify', requireAuth, validate(totpVerifySchema), async (req, res) => {
  const auth = req.auth!;
  const { code } = req.body;
  const rec = getMfaRecord(auth.sub);
  if (!rec) return res.status(404).json({ error: 'Aucune configuration MFA trouvée — appelez /setup d\'abord', code: 'MFA_NOT_FOUND' });

  const secret = getDecryptedSecret(auth.sub);
  if (!secret) return res.status(500).json({ error: 'Secret MFA illisible', code: 'MFA_SECRET_ERROR' });

  // Vérif TOTP ou backup code
  let valid = false;
  let method: 'totp' | 'backup' = 'totp';
  const totpCheck = verifyTotp(code, secret, { window: 1 });
  if (totpCheck.valid) {
    valid = true;
  } else if (verifyBackupCode(auth.sub, code)) {
    valid = true;
    method = 'backup';
  }

  if (!valid) {
    audit('MFA_VERIFY_FAILED', `Échec vérification MFA pour ${auth.email}`, auth);
    return res.status(401).json({ error: 'Code invalide ou expiré', code: 'MFA_INVALID' });
  }

  // Si pas encore activé, on l'active maintenant
  const wasEnabled = rec.enabled;
  if (!wasEnabled) enableMfa(auth.sub);

  // Émettre un nouveau jeton court avec mfaVerified=true
  const user = findUserByEmail(auth.email);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const { token, expiresAt } = signShortToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    institution: user.institution,
    mfaVerified: true,
    amr: method === 'backup' ? ['pwd', 'mfa', 'backup'] : ['pwd', 'mfa', 'otp'],
  });

  await getRepository().appendAudit({
    action: wasEnabled ? 'MFA_VERIFIED' : 'MFA_ENABLED',
    details: wasEnabled ? `MFA vérifié (${method}) pour ${auth.email}` : `MFA activé pour ${auth.email}`,
    actorEmail: auth.email, actorRole: auth.role, actorId: auth.sub,
    entityType: 'user', entityId: auth.sub,
  });
  audit(wasEnabled ? 'MFA_VERIFIED' : 'MFA_ENABLED', `${wasEnabled ? 'Vérification' : 'Activation'} MFA réussie pour ${auth.email}`, auth);

  res.json({
    token,
    expiresAt,
    mfaEnabled: true,
    method,
    remainingSeconds: remainingSeconds(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution },
  });
});

router.post('/disable', requireAuth, validate(totpVerifySchema), async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'admin' && auth.role !== 'manager') {
    // en P1.7, seul l'utilisateur lui-même ou admin peut désactiver ; ici on exige confirmation TOTP
  }
  const { code } = req.body;
  const rec = getMfaRecord(auth.sub);
  if (!rec || !rec.enabled) return res.status(400).json({ error: 'MFA non activé', code: 'MFA_NOT_ENABLED' });

  const secret = getDecryptedSecret(auth.sub);
  if (!secret) return res.status(500).json({ error: 'Secret illisible' });

  const check = verifyTotp(code, secret, { window: 1 });
  const backupOk = !check.valid ? verifyBackupCode(auth.sub, code) : false;

  if (!check.valid && !backupOk) {
    audit('MFA_DISABLE_FAILED', `Tentative désactivation MFA échouée pour ${auth.email}`, auth);
    return res.status(401).json({ error: 'Code invalide — désactivation refusée', code: 'MFA_INVALID' });
  }

  disableMfa(auth.sub);
  await getRepository().appendAudit({
    action: 'MFA_DISABLED',
    details: `MFA désactivé pour ${auth.email}`,
    actorEmail: auth.email, actorRole: auth.role, actorId: auth.sub,
    entityType: 'user', entityId: auth.sub,
  });
  audit('MFA_DISABLED', `MFA désactivé pour ${auth.email}`, auth);

  res.json({ message: 'MFA désactivé', mfaEnabled: false });
});

router.get('/status', requireAuth, (req, res) => {
  const auth = req.auth!;
  const rec = getMfaRecord(auth.sub);
  res.json({
    enabled: rec ? rec.enabled : false,
    createdAt: rec?.createdAt || null,
    lastVerifiedAt: rec?.lastVerifiedAt || null,
    hasBackupCodes: rec ? rec.backupCodesHashed.length > 0 : false,
    remainingBackupCodes: rec ? rec.backupCodesHashed.length : 0,
    totpRemainingSeconds: remainingSeconds(),
    policy: {
      issuer: 'RecovAI',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
      windowTolerance: 1,
    },
  });
});

// ---------- Refresh tournant ----------
router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  const rec = findRefreshRecordByToken(refreshToken);
  if (!rec) return res.status(401).json({ error: 'Refresh token invalide ou révoqué', code: 'INVALID_REFRESH' });

  const rotated = rotateRefreshToken(refreshToken, ip, ua);
  if (!rotated) return res.status(401).json({ error: 'Rotation échouée', code: 'ROTATION_FAILED' });

  const user = findUserByEmail(rec.email);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  // Vérifier MFA : si MFA activé, le nouveau access token doit refléter l'état précédent ?
  // Ici on conserve mfaVerified si l'ancien token l'avait, sinon on exige re-vérif.
  // Pour simplifier, on exige que le refresh ait été émis après MFA (on stocke amr dans refresh ?)
  // V1 : on émet un token avec mfaVerified = isMfaEnabled ? false : true ? Non, on conserve la logique :
  // Si MFA est activé, on ne délivre qu'un token non-MFA-vérifié qui devra refaire /mfa/verify, sauf si on a un flag.
  // Pour l'instant, on délivre un token avec mfaVerified = !isMfaEnabled(userId) (si pas de MFA, ok)

  const mfaEnabled = isMfaEnabled(user.id);
  const { token, expiresAt } = signShortToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    institution: user.institution,
    mfaVerified: !mfaEnabled, // si MFA non activé, considéré vérifié ; sinon false -> front doit refaire MFA
    amr: !mfaEnabled ? ['pwd'] : ['pwd'],
  });

  res.json({
    token,
    expiresAt,
    refreshToken: rotated.newRawToken,
    refreshExpiresAt: rotated.newRecord.expiresAt,
    mfaRequired: mfaEnabled,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution },
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  const auth = req.auth!;
  const { refreshToken } = req.body || {};
  if (refreshToken) revokeRefreshToken(refreshToken);
  // optionnellement révoquer toutes les sessions si ?all=1
  if (req.query.all === '1') {
    const count = revokeAllForUser(auth.sub);
    audit('LOGOUT_ALL', `Déconnexion globale (${count} sessions révoquées) pour ${auth.email}`, auth);
    return res.json({ message: `Déconnecté — ${count} sessions révoquées`, revoked: count });
  }
  audit('LOGOUT', `Déconnexion pour ${auth.email}`, auth);
  res.json({ message: 'Déconnecté' });
});

router.get('/sessions', requireAuth, (req, res) => {
  const auth = req.auth!;
  const sessions = listActiveSessions(auth.sub);
  res.json({
    count: sessions.length,
    policy: getSessionPolicy(),
    sessions: sessions.map(s => ({
      id: s.id,
      createdAt: new Date(s.createdAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
      lastUsedAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : null,
      ip: s.ip,
      userAgent: s.userAgent,
    })),
  });
});

// Admin : lister tous les MFA (manager/admin)
router.get('/admin/list', requireAuth, (req, res) => {
  if (req.auth!.role !== 'admin' && req.auth!.role !== 'manager') return res.status(403).json({ error: 'Forbidden' });
  const all = listMfa();
  res.json({ count: all.length, data: all });
});

export default router;
