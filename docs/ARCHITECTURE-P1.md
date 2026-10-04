# Architecture technique — lot P1 (sécurité, données, exploitation)

> Complément de `docs/ANALYSE-PRESENTATION-INSTITUTIONS-FINANCIERES.md`.
> Ce document décrit l'état d'architecture après le lot P1 (septembre 2026).

## 1. Vue d'ensemble

```
 Navigateur (React 18 + Vite + Tailwind)
        │  fetch + Bearer jeton (authorizedFetch)
        ▼
 Express (server.ts — fabrique createApp() testable)
 ├── /api/auth      login/refresh — scrypt + jeton HMAC 8 h + institution claim
 ├── /api/dossiers  CRUD paginé sur Repository (soft-delete, verrou optimiste, audit diff)
 ├── /api/audit     journal manager/admin, export CSV
 ├── /api/export    fichiers plats CSV/JSON cloisonnés (pré-échanges SFTP batch)
 ├── /api/*         pilotage, contentieux, relances, IFRS 9, clients…
 ├── /rest/v1       couche de compat Supabase (désactivée en mode Postgres)
 └── Repository (server/db/repo.ts)
      ├── JsonRepo  — store fichier data/recovai_db.json (démo, défaut)
      └── PgRepo    — Postgres, activé par DATABASE_URL (source de vérité cible)
                │  GUC app.institution par transaction
                ▼
        Postgres : table dossiers (+version/soft-delete), audit_events append-only,
                   politiques RLS par institution, trigger anti-mutation du journal.
```

## 2. Persistance et multi-tenancy

- **Bascule par configuration** : sans `DATABASE_URL`, l'app tourne sur le store JSON
  (démo, données synthétiques). Avec, tout le parcours *dossiers* (liste, détail,
  création, patch, suppression, export, audit) passe par Postgres.
- **Cloisonnement** : le claim `institution` du jeton est injecté dans la transaction
  (`set_config('app.institution', …, true)`) ; les politiques RLS `USING + WITH CHECK`
  filtrent les lectures **et** empêchent toute écriture cross-institution au niveau
  moteur (défense en profondeur : le contrôle existe aussi au niveau applicatif).
  Les comptes transverses (institution nulle : direction des risques, administration)
  voient l'ensemble du portefeuille.
- **Rôle applicatif** : `recovai_app` (créé par la migration) n'est ni owner ni
  superuser → la RLS s'applique réellement. Le superuser ne doit servir qu'aux
  migrations/administration.

## 3. Intégrité et preuve

- **Verrou optimiste** : colonne `version`, incrémentée par trigger ; le client passe
  `version` (ou l'en-tête `If-Match`) ; conflit → `409 VERSION_CONFLICT`.
- **Suppression logique** : `deleted_at/deleted_by`, les lignes restent interrogables
  (`includeDeleted`) pour la conservation légale ; purge matérielle = procédure
  documentée à l'exploitation (art. 45 loi 2004-63).
- **Empreintes** : `row_hash` (SHA-256 de la ligne stable, côté trigger `pgcrypto` et
  côté app en mode JSON) ; journal `audit_events` chaîné (`prev_hash`/`hash`) avec
  différentiels `before_state`/`after_state` ; trigger `BEFORE UPDATE OR DELETE` qui
  **lève une erreur** : le journal est inviolable côté moteur.

## 4. Journal d'audit — contrat

Chaque écriture API produit une entrée : `action, details, actor, actor_role,
entity_type, entity_id, before_state, after_state, prev_hash, hash, created_at`.
Lecture réservée manager/admin (`GET /api/audit`), export `?format=csv` pour SIEM
et contrôle interne. En mode Postgres : `bigserial` monotone + RLS (un tenant locataire
ne voit que ses propres événements via `app.actor`).

## 5. IA et minimisation (INPDP)

`server/redact.ts` pseudonymise les prompts sortants vers le modèle tiers
(téléphones tunisiens, e-mails, CIN/blocs 8 chiffres, comptes 20+ chiffres,
civilités+noms, raisons sociales). Désactivable (`AI_REDACT=off`) quand le LLM est
hébergé chez l'institution. Les appels IA ne portent **que** sur des agrégats et
données de portefeuille quand c'est possible ; l'authentification est exigée sur
toutes les routes IA. Rappel : un transfert hors Tunisie de données nominatives
relève d'une autorisation INPDP (loi organique 2004-63) — la redaction réduit le
risque sans la remplacer.

## 6. Qualité et exploitation

- Tests : unitaires (scoring, redaction, auth) + **intégration HTTP supertest**
  (store JSON) + **intégration Postgres** (`npm run test:pg:local` via
  embedded-postgres ; CI : service postgres:16 + `scripts/migrate-pg.mjs`).
- CI GitHub Actions (`.github/workflows/ci.yml`) : lint, `tsc` strict du serveur,
  tests, build, audit SCA runtime, SBOM CycloneDX.
- Conteneurs : `Dockerfile` (node:22-alpine, utilisateur dédié, healthcheck) et
  `docker-compose.yml` (app + Postgres 16, migrations auto-chargées via
  `docker-entrypoint-initdb.d`).
- Contrat API : `public/openapi.yaml` (servi sur `/openapi.yaml`), à consommer par
  les DSI (génération de clients, tests contractuels).

## 7. Limites assumées à ce stade

- Contentieux, contrats leasing/factoring, templates et règles d'escalade vivent
  encore dans le store JSON v1 (collections non migrées) : en mode Postgres, les
  routes qui *écrivent* dans les deux mondes à la fois sont neutralisées
  (couche `/rest/v1` → 501) plutôt que de créer deux sources de vérité.
- MFA/SSO entreprise, DLP sortante, HSM pour la clé de signature des jetons et
  bascule des vues front multi-pages sur Postgres = lot P2.
