# RecovAI — Plateforme de recouvrement, contentieux et risque crédit (Tunisie)

Application web couvrant le cycle de vie de la créance pour les **banques, sociétés de leasing/factoring et institutions de microfinance** : pré-octroi & provisionnement IFRS 9 (aide à la décision), recouvrement amiable multi-canal, escalade hiérarchique, contentieux judiciaire (avocats, huissiers, audiences, pièces), pilotage et reporting.

> ⚠️ **Statut : prototype durci « lots P1.5 & P1.7 livrés » (sept. 2026).** Adapté aux démonstrations commerciales sur **données synthétiques**. Ne doit **pas** être exposé à des données réelles d'établissement avant les lots P2 (pentest, chiffrement KMS/HSM, SFTP managé) — voir le plan de durcissement ci-dessous.

## Architecture (P1.5 + P1.7)

```
┌─────────────────────────────┐      ┌──────────────────────────────────────────────────────────────┐
│ Front React 18 + Vite       │ ───► │ Backend Express (server.ts, port 3000)                     │
│ + Tailwind + shadcn/ui      │ HTTP │  /api/auth        login + MFA TOTP (P1.7) + lockout         │
│ src/                        │      │  /api/auth/mfa    setup/verify/refresh tournant (15min/7j) │
│  - services/api.ts (client  │      │  /api/auth/oidc   OIDC discovery stub + SCIM (P1.7)        │
│    typé, Bearer auto,       │      │  /api/dossiers    CRUD paginé RLS multi-tenant (P1.2)      │
│    refresh auto)            │      │  /api/relances    send via provider réel + webhooks (P1.5) │
│  - lib/totpAssistant.ts     │      │  /api/audit       journal append-only + export CSV         │
│    (génération TOTP client) │      │  /rest/v1         compat. PostgREST protégée               │
│  - components/auth/Mfa*     │      │  /api/export      CSV/JSON cloisonnés                      │
│  - pages/TotpAssistant.tsx  │      │                                                            │
└─────────────────────────────┘      └──────────────────────────────────────────────────────────────┘
                                              │ (P1 : store JSON de démo ou Postgres RLS)
                                              ▼
                                   ┌─────────────────────────┐   ┌──────────────────────────┐
                                   │ data/recovai_db.json    │   │ Postgres + RLS + audit   │
                                   │ data/mfa_store.json     │   │ trigger anti-mutation    │
                                   │ data/refresh_tokens.json│   │ role recovai_app         │
                                   │ (gitignoré, démo seule) │   │                          │
                                   └─────────────────────────┘   └──────────────────────────┘
                                                        │
                                   ┌────────────────────┴────────────────────┐
                                   │ Providers P1.5                          │
                                   │ SMS: console | http (agrégateur TN)     │
                                   │ Email: console | smtp | sendgrid        │
                                   │ Webhooks HMAC SHA256 → statusHistory    │
                                   └─────────────────────────────────────────┘
```

- `supabase/functions/*` — fonctions Edge (extraction documentaire IA, note de crédit, moteur IFRS 9) ; **ne décident jamais** : elles produisent des recommandations explicables soumises à validation humaine.
- Les imports de documents (XLSX/CSV/PDF/DOCX) sont extraits **dans le navigateur** (`src/lib/file-extract.ts`) avant toute transmission structurée.
- **P1.5** : `server/lib/communication.ts` abstraction SMS/Email/WhatsApp avec preuve opposable `proof.hash` + `statusHistory`.
- **P1.7** : `server/lib/totp.ts` (RFC 6238), `mfaStore.ts` (AES-256-GCM au repos), `refreshTokens.ts` (rotation + révocation), `lockout.ts` (5 échecs → 423), `routes/mfa.ts` & `sso.ts`.

## Sécurité & données — posture actuelle (lots P0 → P1.7, sept. 2026)

| Contrôle | État |
|---|---|
| Authentification API (HMAC-SHA256, access 15 min + refresh 7 j tournant, révocation server-side) | ✅ P1.7 — `signShortToken` + `refreshTokens.ts` + `/api/auth/mfa/refresh` |
| Mots de passe hachés (scrypt, sel aléatoire), comparaison à temps constant | ✅ |
| MFA TOTP (RFC 6238, Base32, fenêtre ±1, QR otpauth://, backup codes 8 usage unique hashés) | ✅ P1.7 — `/api/auth/mfa/setup` + `/verify` + `src/components/auth/MfaSetup.tsx` + `/totp-assistant` |
| Verrouillage après N échecs (5 / 15 min → 15 min lockout exponentiel 2h max) + rate limiting global | ✅ P1.7 — `server/lib/lockout.ts` + `loginRateLimit` |
| RBAC serveur par rôle (`admin` / `manager` / `agent`) sur actes sensibles | ✅ |
| Journal d'audit avec auteur, horodatage, chaînage hash, export CSV | ✅ append-only trigger Postgres |
| Limitation débit (8 login / 5 min / IP ; 300 req/min globales) | ✅ |
| CORS allowlist, en-têtes sécurité, body JSON borné + rawBody pour HMAC webhook | ✅ P1.5 |
| Validation zod tous corps d'écriture | ✅ |
| Mode démo explicite (`VITE_DEMO_MODE=1` + `ALLOW_DEMO_TOKEN=1`), bandeau synthétique | ✅ |
| Données démo 100% synthétiques (`example.test`) | ✅ |
| Isolation multi-institution RLS Postgres (`USING`+`WITH CHECK`, rôle non-privilégié) | ✅ P1.2 — démo `agent.amen@` / `agent.tunisiemf@` |
| Verrou optimiste (`version`/`If-Match` → 409), pagination serveur, soft-delete auditable | ✅ |
| Exports batch cloisonnés CSV (`;`) + JSON horodaté | ✅ |
| **Connecteurs communication réels (P1.5)** : SMS/Email/WhatsApp via provider configurable (console/http/smtp), statuts depuis webhook HMAC, `statusHistory`, `proof.hash` opposable, `deliveredAt` | ✅ P1.5 — `communication.ts` + `relances.ts` `/webhooks/*` + `GET /providers/status` |
| Pseudonymisation prompts IA (`server/redact.ts`, `AI_REDACT=on`) | ✅ |
| Contrat API `public/openapi.yaml` + ADR + CI (lint, tsc strict, tests, SBOM) + Dockerfile + docker-compose | ✅ |
| SSO OIDC/SAML + SCIM (stub documenté, prêt pour Entra ID) | ✅ P1.7 — `sso.ts` `/.well-known/openid-configuration` + `/policy` |
| Chiffrement au repos KMS/HSM, SFTP managé + OAuth2 tiers, pentest externe, ISO 27001 | 🔜 P2 — plan : `docs/ANALYSE-PRESENTATION-INSTITUTIONS-FINANCIERES.md` |

**Conformité** : assistance aux référentiels (BCT 2013-21, IFRS 9 ECL, loi 2004-63). Aucune certification revendiquée ; responsabilité = établissements utilisateurs.

## P1.5 — Connecteurs de communication réels

- **Abstraction** : `server/lib/communication.ts` — `sendViaProvider()` supporte `console` (démo, journalisé avec preuve), `http` (agrégateur tunisien Orange/Tunisie Telecom/Ooredoo), `smtp`/`sendgrid`.
- **Preuve opposable** : chaque envoi génère `providerMessageId`, `queuedAt/sentAt`, `proof.hash = SHA256(client_code|recipient|content|providerMessageId)`, `statusHistory[]`.
- **Webhooks** : `POST /api/relances/webhooks/sms|email|whatsapp` vérifiés HMAC `sha256=` (secret `COMM_WEBHOOK_SECRET`). Statut stocké depuis webhook, **pas simulé**.
- **Endpoints** :
  - `POST /api/relances/send` — envoi réel
  - `GET /api/relances/providers/status` — config provider
  - `GET /api/relances/logs/:id` — historique statuts
- **Env** : `SMS_PROVIDER`, `SMS_API_URL`, `SMS_API_KEY`, `EMAIL_PROVIDER`, `SMTP_HOST`, `COMM_WEBHOOK_SECRET`.

## P1.7 — SSO & MFA

- **TOTP** : `server/lib/totp.ts` — RFC 6238/4226, Base32, HMAC-SHA1, `otpauth://` URI, `remainingSeconds()`. Secret chiffré AES-256-GCM au repos (clé dérivée `APP_AUTH_SECRET`) via `mfaStore.ts`. Backup codes 8, hash SHA-256, usage unique.
- **Login flow** :
  1. `POST /api/auth/login` → si MFA actif : `mfaRequired:true` + `mfaToken` 5 min.
  2. `POST /api/auth/login/mfa` {email, mfaCode, mfaToken} → token court 15 min + refresh token 7 j.
- **Refresh tournant** : `server/lib/refreshTokens.ts` — token opaque 32 bytes hex, `tokenHash` SHA-256 stocké, rotation (`replacedBy`), révocation, `listActiveSessions`, `revokeAllForUser`.
- **Verrouillage** : `lockout.ts` — 5 échecs / 15 min → 423 + `retryAfterMs`, backoff exponentiel jusqu'à 2h, nettoyage périodique.
- **Frontend** :
  - `src/components/auth/MfaSetup.tsx` — setup QR (api.qrserver.com), secret, backup codes, verify.
  - `src/components/auth/MfaVerify.tsx` — second step login.
  - `src/lib/totpAssistant.ts` — génération TOTP côté navigateur (WebCrypto) pour démo.
  - `src/pages/TotpAssistant.tsx` — page `/totp-assistant` avec compte à rebours 30s, QR, copie code.
  - `src/pages/Auth.tsx` — gère `mfaRequired` → écran TOTP.
  - `src/pages/Settings.tsx` — onglet **MFA TOTP (P1.7)** NOUVEAU.
- **SSO** : `server/routes/sso.ts` — `/.well-known/openid-configuration` (stub documenté), `/authorize`, `/callback` 501 explicite, `/scim/v2/Users`, `/policy` (MFA, session, lockout). Prêt pour Entra ID / AD FS / Okta. Secrets via Vault en P2.
- **CLI assistant** : `scripts/totp-assistant.mjs` — `node scripts/totp-assistant.mjs --secret JBSWY3DPEHPK3PXP --watch` génère code + QR URL.

## Démarrage

```bash
npm install
cp .env.example .env          # renseigner GEMINI_API_KEY si besoin

# Démo commerciale (données synthétiques) :
#   dans .env : VITE_DEMO_MODE=1 et ALLOW_DEMO_TOKEN=1
npm run dev                   # http://localhost:3000

# Assistant TOTP CLI (P1.7) :
node scripts/totp-assistant.mjs --random --watch
```

Comptes backend de démonstration :

| Rôle | Email | Mot de passe | MFA |
|---|---|---|---|
| Agent | `agent@recovai.tn` | `RecovAI#Agent!2026` | optionnel |
| Directeur (manager) | `directeur@recovai.tn` | `RecovAI#Manager!2026` | recommandé |
| Admin | `admin@recovai.tn` | `RecovAI#Admin!2026` | forcé (`MFA_ENFORCED_ROLES`) |
| Agent — Amen Bank uniquement | `agent.amen@recovai.tn` | `RecovAI#Tenant!2026` | optionnel, démo multi-tenant |
| Agent — Enda Tamweel uniquement | `agent.tunisiemf@recovai.tn` | `RecovAI#Tenant!2026` | optionnel, démo multi-tenant |

> Les deux comptes cloisonnés démontrent P1.2 : RLS + filtrage applicatif. Testez MFA sur chacun via `/settings?tab=mfa`.

## Déroulé de démo multi-tenant + MFA (20 min)

**Livrables** : `docs/DEMO-MULTI-TENANT-MFA.md` (markdown) + `docs/DEMO-MULTI-TENANT-MFA.docx` (papier, généré via `python3 scripts/generate-demo-docx.py`).

Script résumé :

1. **2 min** pitch sécurité : JWT 15 min + refresh 7 j tournant + RLS + MFA.
2. **2-6 min** multi-tenant : login `agent.amen@` → badge cloisonné, 404 cross-tenant, admin voit tout, export CSV.
3. **6-12 min** P1.5 : `GET /providers/status`, `POST /relances/send` → `providerMessageId` + `proof.hash`, `POST /webhooks/sms` → `delivered`.
4. **12-18 min** P1.7 : `/settings?tab=mfa` setup QR, `/totp-assistant` génère code, re-login → MFA required, 5 échecs → 423 lockout, `POST /mfa/refresh` rotation, `GET /sessions`, `POST /logout?all=1`.
5. **18-20 min** SSO stub : `/.well-known/openid-configuration`, `/sso/policy`, audit CSV.

Voir `docs/DEMO-MULTI-TENANT-MFA.md` pour commandes curl complètes.

## Persistance (lot P1)

Sans `DATABASE_URL` : store JSON démo (`data/recovai_db.json`, `mfa_store.json`, `refresh_tokens.json`).
Avec Postgres :

```bash
npm run test:pg:local
docker compose up --build     # app:3000 + postgres:16, migrations auto, RLS actif
DATABASE_URL=postgres://user:pass@host:5432/recovai npm run migrate:pg
```

`DATABASE_URL` présent ⇒ dossiers/audit/export sur Postgres (RLS par GUC `app.institution`, rôle `recovai_app`) ; collections non migrées restent JSON — voir `docs/adr/0001-postgres-source-de-verite.md`.

## Production

```bash
npm run build && NODE_ENV=production npm start     # ou : docker compose up --build
```

Variables d'environnement (voir `.env.example` mis à jour) :

- `APP_AUTH_SECRET` (≥32 chars, Vault/KMS)
- `ALLOWED_ORIGINS`, `PORT`, `GEMINI_API_KEY`, `SUPABASE_JWT_SECRET`
- **P1.5** : `SMS_PROVIDER`, `SMS_API_URL`, `SMS_API_KEY`, `EMAIL_PROVIDER`, `SMTP_HOST`, `COMM_WEBHOOK_SECRET`, `SMS_SENDER`
- **P1.7** : `AUTH_ACCESS_TTL_SECONDS` (900), `AUTH_REFRESH_TTL_SECONDS` (604800), `AUTH_MAX_FAILURES` (5), `MFA_ENFORCED_ROLES`, `OIDC_ISSUER`, `OIDC_CLIENT_ID/SECRET`, `SCIM_ENABLED`

## Qualité

```bash
npm run lint        # ESLint
npm run test        # Vitest — unités (auth, RBAC, validation, audit, redaction, moteur ECL, TOTP, lockout, communication)
                    # + intégration HTTP supertest (401/403/400/409, pagination, cloisonnement, soft-delete, audit chaîné, export CSV, MFA flow, webhooks)
npm run test:pg:local   # + suite PgRepo sur Postgres embarqué (RLS, append-only, triggers)
npx tsc --noEmit -p tsconfig.server.json   # typecheck strict backend (CI)
```

E2E Playwright : `npm run test:e2e` (login, MFA, créer dossier, relancer, escalader, exporter) — planifié P1.8.

## Documentation

- `docs/ANALYSE-PRESENTATION-INSTITUTIONS-FINANCIERES.md` — audit complet + roadmap.
- `docs/ARCHITECTURE-P1.md` — archi technique après P1.
- `docs/DEMO-MULTI-TENANT-MFA.md` + `.docx` — **NOUVEAU P1.5/P1.7** déroulé démo 20 min.
- `docs/adr/` — ADR.
- `supabase/migrations/` — schéma Postgres cible.
- `public/openapi.yaml` — contrat API (servi `/openapi.yaml`), à compléter avec routes MFA & webhooks P1.5/P1.7.
- `scripts/totp-assistant.mjs` — **NOUVEAU** assistant TOTP CLI.
- `scripts/generate-demo-docx.py` — génère docx depuis md.
- `src/lib/totpAssistant.ts` + `src/pages/TotpAssistant.tsx` — assistant TOTP front.

## Licence / contact

Projet commercial — tous droits réservés.
