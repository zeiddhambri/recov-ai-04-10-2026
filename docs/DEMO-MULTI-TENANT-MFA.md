# RecovAI — Déroulé de Démo Multi-Tenant + MFA (P1.5 & P1.7)

> **Objectif** : démontrer en 20 minutes le cloisonnement par institution (P1.2), les connecteurs de communication réels avec preuves d'envoi (P1.5) et l'authentification renforcée MFA TOTP + session courte + refresh tournant (P1.7) devant un comité DSI / Risques bancaire.

---

## 1. Contexte & Prérequis

- **Environnement** : `docker compose up --build` ou `npm run dev` avec `DATABASE_URL` pour activer Postgres RLS.
- **Variables** (extrait `.env.example` mis à jour) :
  ```env
  DATABASE_URL=postgres://recovai:recovai@localhost:5432/recovai
  APP_AUTH_SECRET=<32+ chars via Vault>
  SMS_PROVIDER=console          # console | http | twilio | orange_tn
  SMS_API_URL=https://api.aggregateur.tn/sms
  SMS_API_KEY=<clé>
  EMAIL_PROVIDER=console        # console | smtp | sendgrid
  SMTP_HOST=smtp.recovai.tn
  COMM_WEBHOOK_SECRET=<secret partagé pour HMAC webhook>
  AUTH_ACCESS_TTL_SECONDS=900   # 15 min (P1.7)
  AUTH_REFRESH_TTL_SECONDS=604800 # 7 j
  AUTH_MAX_FAILURES=5
  MFA_ENFORCED_ROLES=admin,manager
  OIDC_ISSUER=https://login.microsoftonline.com/<tenant>/v2.0
  SCIM_ENABLED=0
  ```
- **Comptes démo** (mots de passe surchargeables) :
  - `admin@recovai.tn` / `RecovAI#Admin!2026` — transverse (voit tout)
  - `agent.amen@recovai.tn` / `RecovAI#Tenant!2026` — cloisonné Amen Bank
  - `agent.tunisiemf@recovai.tn` / `RecovAI#Tenant!2026` — cloisonné Enda Tamweel

---

## 2. Déroulé 20 min (script minute-par-minute)

### 0-2 min — Pitch sécurité

- Slide : architecture Front → API JWT HMAC 15 min + refresh tournant 7 j + RLS Postgres par institution + audit append-only chaîné + MFA TOTP.
- Insister : **aucune donnée réelle**, 100% synthétique, bandeau démo.

### 2-6 min — Multi-tenant (P1.2)

1. Login `agent.amen@recovai.tn` → `/dossiers` → montrer badge **« Périmètre cloisonné : Amen Bank »**, filtre institution.
2. Chercher `RCV-2024-004` (Enda Tamweel) → **404** (RLS + filtrage applicatif).
3. Ouvrir DevTools → `GET /api/dossiers?limit=100` → vérifier `institution: Amen Bank` partout.
4. Déconnexion, login `agent.tunisiemf@recovai.tn` → ne voit que Enda Tamweel.
5. Login `admin@recovai.tn` → voit tout + peut exporter CSV cloisonné (`GET /api/export/dossiers.csv` → header `X-Recovai-Rows`).

**Preuve technique** : montrer `server/db/migrations/001_p1_core.sql` — `USING (institution = current_setting('app.institution'))` + `WITH CHECK`.

### 6-12 min — Communication réelle (P1.5)

1. Aller dans `/relances` ou `/automatisation/moteur-relance`.
2. `GET /api/relances/providers/status` → montrer `console` en démo, `http`/`smtp` en prod.
3. Créer une relance SMS sur dossier `RCV-2024-001` :
   ```bash
   curl -X POST /api/relances/send -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"dossierId":"1","channel":"sms","customMessage":"Bonjour {{debiteur}}, échéance {{montant}} TND due le {{echeance}} — réf {{reference}}."}'
   ```
   → Réponse `status: sent`, `provider: console`, `providerMessageId: SMS-...`, `proof.hash`.
4. Montrer log dans `GET /api/relances` → `statusHistory`, `proof.hash`, `queuedAt/sentAt`.
5. Simuler webhook delivery :
   ```bash
   curl -X POST /api/relances/webhooks/sms -H "Content-Type: application/json" -H "X-Webhook-Signature: sha256=$(echo -n '{"providerMessageId":"SMS-xxx","status":"delivered"}' | openssl dgst -sha256 -hmac $COMM_WEBHOOK_SECRET | cut -d' ' -f2)" \
     -d '{"providerMessageId":"SMS-xxx","status":"delivered","timestamp":"2026-09-23T10:00:00Z"}'
   ```
   → Log passe à `delivered`, `deliveredAt` rempli, audit `RELANCE_WEBHOOK_SMS`.
6. Expliquer mode prod : `SMS_PROVIDER=http` → appel agrégateur tunisien (Orange/Tunisie Telecom/Ooredoo) avec `X-API-Key`, réponse webhook asynchrone → statut stocké depuis webhook, pas simulé.

### 12-18 min — MFA TOTP + Session (P1.7)

1. Aller dans `/settings?tab=mfa` (ou `/totp-assistant`).
2. `POST /api/auth/mfa/setup` → secret Base32 + `otpauth://` + QR + 8 backup codes.
3. Scanner QR avec Google Authenticator / Authy / 1Password.
4. `POST /api/auth/mfa/verify` avec code 6 chiffres → MFA activé, token court avec `mfaVerified:true`.
5. Déconnexion, reconnexion :
   - `POST /api/auth/login` → `mfaRequired:true`, `mfaToken` temporaire 5 min.
   - `POST /api/auth/login/mfa` avec code → token final 15 min + refresh token 7 j.
6. Démo verrouillage :
   - 5 échecs MFA → `423 ACCOUNT_LOCKED`, `retryAfterSeconds`.
   - Montrer `server/lib/lockout.ts` — fenêtre 15 min, backoff exponentiel 15 min → 2h.
7. Démo refresh tournant :
   ```bash
   curl -X POST /api/auth/mfa/refresh -d '{"refreshToken":"..."}'
   ```
   → nouveau `token` + nouveau `refreshToken`, ancien révoqué (`replacedBy`).
8. Démo révocation :
   - `GET /api/auth/mfa/sessions` → liste sessions actives.
   - `POST /api/auth/mfa/logout?all=1` → révocation globale.

### 18-20 min — SSO & Clôture

1. `GET /api/auth/oidc/.well-known/openid-configuration` → stub documenté P1.7, prêt pour Entra ID.
2. `GET /api/auth/sso/policy` → politique MFA, session, lockout.
3. Ouvrir journal d'audit `/api/audit?format=csv` → montrer `MFA_ENABLED`, `LOGIN_MFA_SUCCESS`, `RELANCE_SENT`, `ESCALATION_APPLIED` chaînés.

---

## 3. Matrice de preuves (à montrer en live)

| Exigence BCT / DSI | Où c'est dans le code | Comment le démontrer |
|---|---|---|
| Isolation locataire | `repo.ts` + `001_p1_core.sql` RLS | Login cloisonné + 404 cross-tenant |
| Preuve d'envoi opposable | `communication.ts` + `relances.ts` + `proof.hash` | `statusHistory` + webhook `deliveredAt` + audit |
| MFA TOTP | `totp.ts` + `mfaStore.ts` + `mfa.ts` | Setup QR + verify + backup codes |
| Session courte + refresh tournant | `refreshTokens.ts` + `auth.ts` `signShortToken` | 15 min access, 7 j refresh, rotation |
| Verrouillage | `lockout.ts` | 5 échecs → 423 |
| Révocation server-side | `refreshTokens.ts` `revokeAllForUser` | `/sessions` + `/logout?all=1` |
| SSO entreprise | `sso.ts` + `/.well-known` | Stub OIDC + doc |

---

## 4. Commandes de préparation

```bash
# 1. Reset base démo
rm -rf data/recovai_db.json data/mfa_store.json data/refresh_tokens.json
npm run dev

# 2. Activer Postgres RLS
docker compose up --build
# Vérifier RLS :
psql $DATABASE_URL -c "SELECT * FROM dossiers WHERE institution='Amen Bank' LIMIT 1;"

# 3. Activer MFA pour admin
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@recovai.tn","password":"RecovAI#Admin!2026"}'
# → token, puis
curl -X POST http://localhost:3000/api/auth/mfa/setup -H "Authorization: Bearer $TOKEN"
# → secret, puis
curl -X POST http://localhost:3000/api/auth/mfa/verify -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"code":"123456"}'

# 4. Tester TOTP assistant côté client
# Ouvrir http://localhost:3000/totp-assistant → générer secret → code → utiliser dans /auth
```

---

## 5. Objections & Réponses

- **« SMS réel ? »** : En démo `console` (journalisé, preuve serveur). En prod `http` → agrégateur tunisien avec webhook HMAC. Coût TND par SMS loggé.
- **« MFA obligatoire ? »** : Configurable par rôle (`MFA_ENFORCED_ROLES`). Admin/manager forcés, agent optionnel. Backup codes 8, usage unique, hashés SHA-256.
- **« Session 15 min trop court ? »** : Access court + refresh tournant 7 j + révocation server-side = compromis sécurité/UX. Ajustable via env.
- **« SSO ? »** : Stub OIDC prêt, JWKS à brancher via `OIDC_ISSUER`. SCIM pour provisionnement. En P2 : SAML + Vault pour secrets.

---

## 6. Livrables

- Code : `server/lib/communication.ts` (P1.5), `server/lib/totp.ts`, `mfaStore.ts`, `refreshTokens.ts`, `lockout.ts`, `routes/mfa.ts`, `sso.ts`, `relances.ts` webhooks.
- Front : `src/components/auth/MfaSetup.tsx`, `MfaVerify.tsx`, `src/lib/totpAssistant.ts`, `src/pages/TotpAssistant.tsx`, `src/pages/Auth.tsx` MFA flow, `Settings.tsx` onglet MFA.
- Docs : ce fichier + `DEMO-MULTI-TENANT-MFA.docx` (même contenu, format papier).
- Tests : à ajouter — `npm run test` (unitaires TOTP, lockout, communication) + `npm run test:pg:local` (RLS).

---

*Document généré pour lot P1.5 & P1.7 — 2026-09-23 — RecovAI*
