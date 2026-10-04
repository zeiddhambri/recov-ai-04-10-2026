// RecovAI — SSO OIDC / SAML stub + SCIM (P1.7)
// Fournit les endpoints de configuration et de callback pour brancher un IdP d'entreprise
// (Entra ID / AD FS / Okta). En mode P1.7, c'est un stub documenté qui journalise et
// prépare le provisionnement, pas une implémentation complète OIDC (qui nécessite
// client secret managé via Vault + JWKS).

import { Router } from 'express';
import { audit, requireAuth, signShortToken, findUserByEmail } from '../auth';
import { getRepository } from '../db/repo';

const router = Router();

// Découverte OIDC (well-known) — sert la config de RecovAI en tant que RP
router.get('/.well-known/openid-configuration', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/api/auth/oidc/authorize`,
    token_endpoint: `${base}/api/auth/oidc/token`,
    userinfo_endpoint: `${base}/api/auth/oidc/userinfo`,
    jwks_uri: `${base}/api/auth/oidc/jwks`,
    registration_endpoint: `${base}/api/auth/oidc/register`,
    scopes_supported: ['openid', 'profile', 'email', 'groups'],
    response_types_supported: ['code', 'id_token', 'code id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'HS256'],
    claims_supported: ['sub', 'email', 'name', 'groups', 'institution', 'role'],
    recovai: {
      sso_providers_configured: Boolean(process.env.OIDC_ISSUER || process.env.SAML_IDP_METADATA_URL),
      oidc_issuer: process.env.OIDC_ISSUER || null,
      saml_idp_metadata_url: process.env.SAML_IDP_METADATA_URL || null,
      scim_enabled: process.env.SCIM_ENABLED === '1',
      note: 'P1.7 : stub documenté. Configurer OIDC_ISSUER + OIDC_CLIENT_ID/SECRET pour activer le flux réel. Voir docs/DEMO-MULTI-TENANT-MFA.md',
    },
  });
});

// Simulation d'un login OIDC (pour démo sans IdP réel)
router.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state } = req.query as any;
  // En vrai, on redirigerait vers l'IdP. Ici on affiche une page d'info
  res.send(`
    <html><head><title>RecovAI SSO — P1.7</title></head><body style="font-family: sans-serif; padding: 2rem;">
      <h1>RecovAI — SSO OIDC (P1.7 stub)</h1>
      <p>Ce endpoint simule l'initiation d'un flux OIDC. En production, il redirige vers l'IdP configuré.</p>
      <ul>
        <li>Issuer configuré : ${process.env.OIDC_ISSUER || '<non configuré>'}</li>
        <li>Client ID : ${client_id || process.env.OIDC_CLIENT_ID || '<non configuré>'}</li>
        <li>Redirect URI : ${redirect_uri || '<non fourni>'}</li>
        <li>State : ${state || '<non fourni>'}</li>
      </ul>
      <p>Pour activer le SSO réel, renseignez dans .env : OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_SCOPES.</p>
      <p><a href="/auth">Retour login</a></p>
    </body></html>
  `);
});

router.post('/callback', async (req, res) => {
  // Callback OIDC — recevrait code, state, id_token
  // Stub : journalise et renvoie une erreur explicite
  const { code, state, id_token } = req.body || {};
  await getRepository().appendAudit({
    action: 'SSO_CALLBACK_RECEIVED',
    details: `Callback OIDC reçu (code=${code ? 'présent' : 'absent'}, state=${state || 'n/a'}) — stub P1.7`,
    actorEmail: 'sso-system', actorRole: 'system', actorId: 'sso',
    entityType: 'sso', entityId: 'oidc',
  });
  res.status(501).json({
    error: 'SSO OIDC non configuré — stub P1.7',
    code: 'SSO_NOT_CONFIGURED',
    details: 'Configurer OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET dans .env et brancher la vérification JWKS. Voir docs/ARCHITECTURE-P1.md et docs/DEMO-MULTI-TENANT-MFA.md',
    received: { hasCode: Boolean(code), hasIdToken: Boolean(id_token), state: state || null },
  });
});

// SCIM — provisionnement d'utilisateurs depuis l'IdP
router.get('/scim/v2/Users', requireAuth, (req, res) => {
  if (process.env.SCIM_ENABLED !== '1') return res.status(501).json({ error: 'SCIM non activé — mettre SCIM_ENABLED=1' });
  // Stub : renvoie les utilisateurs démo au format SCIM
  const users = [
    { id: '1', userName: 'admin@recovai.tn', name: { formatted: 'Administrateur (Démo)' }, emails: [{ value: 'admin@recovai.tn', primary: true }], active: true, groups: [{ value: 'admin' }] },
  ];
  res.json({ totalResults: users.length, Resources: users, schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'] });
});

router.post('/scim/v2/Users', requireAuth, (req, res) => {
  if (process.env.SCIM_ENABLED !== '1') return res.status(501).json({ error: 'SCIM non activé' });
  audit('SCIM_USER_CREATED', `Provisionnement SCIM reçu pour ${req.body?.userName || 'unknown'}`, req.auth);
  res.status(201).json({ id: 'scim-' + Date.now(), ...req.body, meta: { resourceType: 'User', created: new Date().toISOString() } });
});

// Informations sur la politique SSO & session (publique, pour le front)
router.get('/policy', (req, res) => {
  res.json({
    sso: {
      oidc_configured: Boolean(process.env.OIDC_ISSUER),
      saml_configured: Boolean(process.env.SAML_IDP_METADATA_URL),
      scim_enabled: process.env.SCIM_ENABLED === '1',
      providers: [
        process.env.OIDC_ISSUER ? { type: 'oidc', issuer: process.env.OIDC_ISSUER } : null,
        process.env.SAML_IDP_METADATA_URL ? { type: 'saml', metadataUrl: process.env.SAML_IDP_METADATA_URL } : null,
      ].filter(Boolean),
    },
    mfa: {
      enforced_roles: (process.env.MFA_ENFORCED_ROLES || 'admin,manager').split(','),
      issuer: 'RecovAI',
      totp_period: 30,
      backup_codes: 8,
    },
    session: {
      access_ttl_seconds: Number(process.env.AUTH_ACCESS_TTL_SECONDS || 900),
      refresh_ttl_seconds: Number(process.env.AUTH_REFRESH_TTL_SECONDS || 604800),
      lockout_max_failures: Number(process.env.AUTH_MAX_FAILURES || 5),
      lockout_window_seconds: Number(process.env.AUTH_FAILURE_WINDOW_MS || 900000) / 1000,
    },
    documentation: '/docs/DEMO-MULTI-TENANT-MFA.md',
  });
});

export default router;
