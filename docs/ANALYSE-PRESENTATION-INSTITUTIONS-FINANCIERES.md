# RecovAI — Analyse de préparation à une présentation devant des institutions financières

**Audience cible** : banques, sociétés de leasing/crédit-bail, sociétés d'affacturage, institutions de microfinance (Tunisie).
**Objet** : évaluer la plateforme `RecovAI` (version du dépôt, commit `4c05937`) selon les critères réels d'un comité d'engagement bancaire / DSI / risk management, et produire une feuille de route priorisée pour neutraliser les objections prévisibles.
**Méthode** : audit du code source (frontend React/Vite, backend Express, base Postgres/Supabase, edge functions, migrations, données de démo). Chaque affirmation ci-dessous est sourcée par fichier.

---

## 0. Synthèse exécutive (à lire avant tout rendez-vous)

**Ce que RecovAI est aujourd'hui** : un prototype fonctionnel de bout en bout, remarquablement aligné sur le **métier** du recouvrement et du risque crédit pour le marché tunaisien (cycle pré-octroi → recouvrement amiable → pré-contentieux → contentieux judiciaire → reporting de pilotage), avec une couverture Leasing / Factoring / Microfinance et un catalogue de 35 institutions tunisiennes (banques résidentes, offshore, IMF, leasing/factoring).

**Ce qu'il n'est pas encore** : un produit « installable en banque ». L'API backend est **entièrement non protégée** (aucune authentification côté serveur), la persistance de démonstration est un **fichier JSON en clair**, la transmission de documents au module IA sort du périmètre sans anonymisation documentée, et plusieurs **allégations de conformité (« Certifié conforme normes BCT & Bâle III ») sont inscrites dans le code sans aucune certification sous-jacente** — le point le plus dangereux politiquement avant une présentation.

**Verdict** : l'adéquation métier est un avantage concurrentiel réel et démontrable. La posture sécurité/conformité est, en l'état, **éliminatoire** pour un appel d'offres bancaire. La bonne nouvelle : les écarts les plus critiques (P0 ci-dessous) sont des corrections de quelques jours à quelques semaines, pas des reconstructions. Une présentation « démo sécurisée + roadmap de conformité chiffrée » est crédible dès que le lot P0 est terminé ; ne présenter le produit que sur données synthétiques.

> ### ✅ Statut 2026-09-22 — LOT P0 IMPLÉMENTÉ
>
> Les actions P0.1 → P0.7 sont livrées sur cette branche (voir commits) :
> - **Auth API** : jetons signés HMAC-SHA256 (`server/auth.ts`), `requireAuth` sur 100 % des routes `/api/*` et `/rest/v1/*`, RBAC serveur (`requireRole`) sur les actes sensibles (suppression de dossiers, modèles de messages, règles d'escalade, institutions), vérification optionnelle des JWT Supabase (`SUPABASE_JWT_SECRET`), limitation de débit (8 logins/5 min + 300 req/min), secrets scrypt, rejet des jetons forgés (tests unitaires + smoke tests).
> - **Allégations retirées** : plus aucun « certifié conforme BCT/Bâle III » ni validation prudentielle fabriquée (`pilotage.ts`, `client.ts`, landing, pricing → mentions roadmap, Ifrs9Engine → « aligné », FactoringRequests → « simulation », Client360 → « brouillon »). Les texteurs IA de repli sont marqués « ⚠️ texte de démonstration — aucun modèle exécuté » ; `POST /rapports/:id/ai-analysis` renvoie 503 explicite sans clé IA.
> - **Contournement d'authentification supprimé** : plus aucun fallback « mot de passe erroné → démo » ; le mode démo est un double opt-in (`VITE_DEMO_MODE=1` **et** `ALLOW_DEMO_TOKEN=1`) avec bandeau « données 100 % synthétiques » permanent sur l'instance de présentation.
> - **Durcissement HTTP** : CORS par allowlist (`ALLOWED_ORIGINS`), en-têtes `nosniff`/`DENY`/`no-referrer`/`no-store`, CSP restreinte sur les routes JSON, body 2 Mo, `x-powered-by` coupé, `/api/health` minimal (plus de stats internes).
> - **Validation zod** des corps d'écriture critiques (400 + détails par champ) ; `user_id` dérivé du jeton et plus du client ; faux `{success:true}` de `supabaseCompat` remplacé par 501 explicite.
> - **Audit v1** : auteur + horodatage + chaînage de hash sur login/create/update/delete/escalade/imports ; endpoint `GET /api/audit` (manager/admin) pour la démo.
> - **Données** : `data/` gitignoré ; toutes les entités de démonstration renommées en DEMO/SYNTH avec e-mails `@*.example.test` et téléphones normalisés (aucune entreprise ni personne réelle dans les seeds et les mocks).
> - **KPIs** : suppression des valeurs câblées de remplissage (PAR30, frais, taux…) ; `generated_by` = compte authentifié ; série « charts » explicitement étiquetée `syntheticSeries`.
> - **Qualité** : 10 tests unitaires vitest (auth, RBAC, validation, audit), lint sans erreur, build OK ; README d'architecture + posture sécurité (table P0 ✅ / P1-P2 🔜).
>
> **Restant pour la démo** : basculer Litigation/Automation/IFRS-9 locales sur l'API (prévu P1.1/P1.2 avec Postgres), ajouter les tests E2E Playwright, et préparer le dossier de présentation papier (note de sécurité, DFD) listé en §4.3.

> ### 🔷 Statut 2026-09-22 — LOT P1 EN COURS DE LIVRAISON (cette branche)
>
> - **P1.1 ✅** `server/db/repo.ts` : interface Repository, implémentation Postgres (`DATABASE_URL`) **et** store JSON de démo conservé ; `version` (verrou optimiste → `409 VERSION_CONFLICT`, header `If-Match` accepté), pagination serveur `limit/offset`+`hasMore` sur toutes les listes, soft-delete (`deleted_at/deleted_by`, réversible, audité), empreinte `row_hash` SHA-256 par trigger ; migration `server/db/migrations/001_p1_core.sql`.
> - **P1.2 ✅** Cloisonnement par institution : claim `institution` dans le jeton, GUC `app.institution` posé par transaction, politiques **RLS USING + WITH CHECK** (écriture cross-tenant refusée par le moteur), rôle applicatif non-priviliégié `recovai_app`. Comptes de démo `agent.amen@recovai.tn` / `agent.tunisiemf@recovai.tn` pour démontrer l'isolation en direct ; badge « Périmètre cloisonné » dans l'UI Dossiers. Vérifié par tests d'intégration Postgres (CI + `npm run test:pg:local`).
> - **P1.3 ✅** Journal `audit_events` **append-only garanti par trigger** (UPDATE/DELETE = exception moteur), différentiels `before_state/after_state`, chaînage SHA-256 complet, `GET /api/audit?format=csv` pour SIEM ; l'API écriture ne dépend plus d'aucun champ client pour l'auteur.
> - **P1.4 🔶** `server/redact.ts` : pseudonymisation serveur des prompts IA (tél TN, e-mails, CIN 8 chiffres, comptes 20+ chiffres, civilités+noms, raisons sociales), `AI_REDACT=on` par défaut, `off` pour LLM interne. Reste : ROPA, chiffrement au repos, Vault (sujets de projet pilote).
> - **P1.6 🔶** Exports batch `GET /api/export/dossiers.csv` (séparateur `;`, cloisonné, `X-Recovai-Rows`) et `.json` horodaté ; OpenAPI 3.1 commité (`public/openapi.yaml`, servi en `/openapi.yaml`) ; couche de compat `/rest/v1` neutralisée (501) en mode Postgres pour éviter deux sources de vérité. SFTP managé + OAuth2 tiers = suite du lot.
> - **P1.8 ✅** CI GitHub Actions (lint, `tsc` strict serveur **0 erreur**, 34 tests dont intégration Postgres, build, `npm audit` runtime, SBOM CycloneDX) ; `Dockerfile` (node:22-alpine non-root + healthcheck) et `docker-compose.yml` (app+Postgres 16, migrations auto) ; `xlsx` remplacé par `exceljs` ; docs `ARCHITECTURE-P1.md` + 4 ADR.
> - **P1.9 🔶** Tests d'intégration HTTP (supertest : 401/403/404/400/409, pagination, cloisonnement, soft-delete, chaînage d'audit, export CSV) + suite PgRepo sur vraie base (embedded-postgres local, service postgres:16 en CI). Reste : E2E Playwright, cahier de recette IFRS 9 complet.
>
> Non fait dans ce lot : P1.5 (passerelles SMS/e-mail — dépend d'un contrat agrégateur), P1.7 SSO/MFA (dossier à part), migration des tables contentieux/leasing/factoring vers Postgres (journal et API restent cohérents, cf. ADR-001).

### Grille d'évaluation (état actuel / attendu par une institution financière)

| Axe | État actuel | Attendu secteur financier | Écart |
|---|---|---|---|
| Adéquation métier (recouvrement, leasing, factoring, IMF, contentieux) | ●●●●○ | Cycle complet, taxonomies de place, BCT/IFRS 9 dans le vocabulaire et les règles | **Faible** — c'est le point fort |
| Authentification & contrôle d'accès | ●○○○○ | SSO (OIDC/SAML/LDAP), RBAC appliqué serveur, MFA, sessions courtes | **Critique** |
| Chiffrement (transit & repos) | ●○○○○ | TLS 1.2+, chiffrement au repos, secrets gérés (Vault/KMS) | **Critique** |
| Cloisonnement multi-tenant | ●○○○○ | Isolation par institution au niveau des données (RLS/tenant_id) | **Majeur** |
| Audit trail & traçabilité | ●●○○○ | Journal immuable, qui/quoi/quand/avant-après, export SIEM | **Majeur** |
| IFRS 9 / scoring crédit | ●●●○○ | Moteur explicable, gouvernance de modèle, validation | Moyen — base solide à documenter |
| Intégrations legacy (core banking, SFTP, SWIFT/SIBTEL) | ●○○○○ | Imports exportables, API authentifiées, connecteurs certificats | **Majeur** |
| Performance & disponibilité | ●●○○○ | HA, DR (RPO/RTO), pagination, monitoring, SLA contractuel | **Majeur** |
| Documentation technique & conformité | ●○○○○ | Doc DSI, OpenAPI, pentest, matrice de conformité, réponse questionnaire sécurité | **Critique** |
| Protection des données (loi 2004-63 / INPDP) | ●○○○○ | Registre, minimisation, flux IA documentés, durées de conservation | **Majeur** |

---

## 1. Points forts — ce qui répond déjà aux préoccupations du secteur financier

### 1.1 Couverture métier du cycle complet, avec le vocabulaire et les règles de la place

C'est l'argument d'ouverture : peu d'éditeurs régionaux couvrent **le pré-octroi, l'amiable et le judiciaire dans un même outil**.

- **Cycle complet implémenté** : décision de crédit / IFRS 9 (`src/pages/DecisionCredit.tsx`, `src/pages/Ifrs9Engine.tsx`, moteur ECL dans `server/routes/creditIfrs9.ts`), relances multicanal (`src/pages/MoteurRelance.tsx`, `src/lib/relance.ts`), escalade hiérarchique (`src/pages/ReglesEscalade.tsx` + moteur de règles réel dans `server/routes/relances.ts:224` `run-engine`), contentieux judiciaire avec avocats, huissiers, audiences, pièces, paiements (`src/pages/Litigation.tsx`, `server/routes/contentieux.ts`), pilotage & reporting (`server/routes/pilotage.ts`).
- **Matrice d'escalade par niveaux de management** (recouvreur → superviseur → directeur → comité) conforme aux pratiques de gouvernance du recouvrement bancaire (`server/db/dataStore.ts`, `INITIAL_ESCALATION_RULES` : J+30/J+60/J+90 avec bascule automatique en contentieux et mandatement d'avocat). Les seuils 30/60/90 jours reflètent la logique de déclassement de la circulaire BCT 2013-21 (classes 2/3/4 à 20 %/50 %/100 % de provision) — à présenter explicitement comme tel.
- **Portefeuilles spécialisés** : leasing (actif financé, valeur résiduelle, loyers, capital restant dû, saisie, calcul de résiliation anticipée dans `server/routes/portefeuilles.ts:136`), factoring (débiteur adhéré/approuvé, limites de crédit, litiges facture, aging — `INITIAL_FACTORING_DEBTORS/INVOICES`), microfinance (garanties solidaires, AGR). Ces champs sont ceux d'un métier réel, pas d'un generic CRM.
- **Connaissance du marché tunisien** : catalogue de 35 institutions structuré par catégorie réglementaire (banque résidente / offshore / IMF / leasing-factoring) avec autorité de contrôle, forme juridique, SWIFT — `server/routes/institutions.ts` et `src/data/institutions.ts`. Utile en démo pour dire « votre établissement est déjà modélisé ».

### 1.2 IA encadrée : « aide à la décision », explicabilité et garde-fous non financiers

Le prompt système des fonctions `supabase/functions/credit-decision/index.ts` et `ifrs9-engine/index.ts` est conçu comme un régulateur aimerait le lire :

- **Rôle explicitement non substitutif** : « Outil d'AIDE À LA DÉCISION exclusivement. Jamais de décision finale. Révisable par un analyste humain, soumise à validation institutionnelle obligatoire. »
- **Scoring transparent et reproductible** : 5 piliers pondérés (Capacité de remboursement 30 %, Endettement 25 %, Historique/ASRC 20 %, Garanties 15 %, Risque sectoriel 10 %), échelles de qualification définies, seuils de décision explicites.
- **Garde-fous éthiques** : interdiction d'utiliser sexe, origine, religion, nationalité, handicap — critères économiques objectifs uniquement.
- **Traitement des données manquantes** : signalement de chaque absence, principe de conservatisme, escalade au-delà de 30 % de données manquantes.
- **Sortie structurée avec audit_trail** : logique décisionnelle, hypothèses appliquées, version du moteur, horodatage (visible dans la réponse mock du client Supabase, `src/integrations/supabase/client.ts`).

**Message pour la banque** : « l'IA ne décide pas ; elle produit une note argumentée, traçable et recalculable que votre comité peut auditer. »

### 1.3 Un moteur ECL IFRS 9 déterministe, en dur et non via LLM — auditable

`server/routes/creditIfrs9.ts:10` (`POST /api/credit-ifrs9/calculate-ecl`) implémente un calcul **programmétique** : classification Bucket via SICR (>30 j → Bucket 2, >90 j → Bucket 3), test SPPI, PD 12 mois / lifetime calibrées, multiplicateur de scénario macro (central/optimiste/adverse ±35 %), LGD = (EAD − collatéral net de haircut)/EAD avec plancher prudentiel 25 %, actualisation au taux effectif. C'est exactement le type d'artefact qu'un auditeur peut recalculer à la main. La voie IA (Gemini) est séparée et additive — bonne architecture pour un futur dossier de validation de modèle.

### 1.4 Scoring recouvrement transparent

`src/lib/scoring.ts` : score 0-100 par pondérations fixes documentées (montant 25 %, ancienneté 20 %, historique 25 %, réactivité 20 %, typologie 10 %), classification fiable/à surveiller/à risque et recommandations actionnables. Explicable par construction — pas de boîte noire.

### 1.5 Fondations Back-end prêtes pour l'industrialisation

- **Deux jeux de fondations coexistent** : (a) la voie Supabase/Postgres avec migrations propres — schéma typé (`supabase/migrations/*.sql`), contraintes de clés étrangères, triggers `updated_at`, **politiques RLS activées sur toutes les tables**, roles applicatifs `admin|manager|agent` avec fonction de vérification `security definer` (`20260504150336...sql`), buckets de stockage avec cloisonnement par préfixe utilisateur ; (b) une API REST Express documentée par type (`src/services/api.ts`) avec une **couche de compatibilité PostgREST** (`server/routes/supabaseCompat.ts`) montrant une intention d'intégrabilité par standards.
- **Import documentaire large** : parsing XLSX/CSV/DOCX/PDF côté navigateur (`src/lib/file-extract.ts` avec pdf.js, mammoth, SheetJS, PapaParse) — l'extraction texte s'effectue **sans que le fichier ne transite par le serveur**, un argument de minimisation des données à faire valoir (le contenu part ensuite vers l'IA — cf. faiblesse 2.5).
- **Génération de documents** : exports PDF contractuels (leases, contentieux) via `@react-pdf/renderer` (`src/lib/leasing-pdf.tsx`, `litigation-pdf.tsx`).
- **Validation d'entrée côté auth** : schémas zod sur email/mot de passe/nom (`src/pages/Auth.tsx:14-17`).
- **Extraction IA structurée par tool-calling** avec `additionalProperties: false` et champs requis (`supabase/functions/extract-*/index.ts`) : la sortie est contrainte par schéma, pas du texte libre — bon point d'intégrité des données d'import.

### 1.6 Productisation déjà esquissée

Tarification segmentée par type d'institution (IMF/leasing → banques), SLA 99,9 % et account manager évoqués, portail avocats/huissiers au catalogue (`src/components/landing/Pricing.tsx`) — le vocabulaire d'un vendeur qui connaît les circuits de décision bancaires. ⚠️ À condition de traiter chaque item comme un **engagement roadmap daté**, pas comme une capacité livrée (cf. 2.8).

---

## 2. Points faibles — ce qui ferait échouer un comité d'engagement aujourd'hui

Classés par gravité croissante pour le décideur financier. Chaque point est vérifié dans le code.

### 2.1 ⛔ Éliminatoire n° 1 : API backend sans aucune authentification ni autorisation

- `server.ts` : aucun middleware d'auth avant les routeurs `/api/*` et `/rest/v1/*`. Vérification par grep : **zéro** référence à auth/JWT/bearer dans `server/routes/*.ts`.
- Conséquence : tout acteur réseau atteignant le port 3000 peut **lire, créer, modifier, supprimer** l'intégralité des dossiers de recouvrement (noms, adresses, téléphones, e-mails, montants dus de débiteurs réels si des données de production y étaient injectées) via `GET /api/dossiers`, `DELETE /api/dossiers/:id`, ou `GET /rest/v1/dossiers`.
- CORS `Access-Control-Allow-Origin: *` sans allowlist (`server.ts:26`), pas de `helmet` (en-têtes de sécurité), pas de rate limiting, pas de protection CSRF, aucune validation zod des corps d'API (les POST acceptent n'importe quoi).
- `/api/health` expose des statistiques internes de la base (compteurs par collection, **taille du fichier de base**) publiquement (`server/routes/health.ts`).
- Les politiques RLS Supabase (`auth.uid() = user_id`) ne protègent que la **voie Supabase** ; la voie Express/`supabaseCompat` les contourne totalement. De plus, même sur la voie Supabase, une isolation « par utilisateur individuel » est **le mauvais modèle de location** pour une institution : le dossier créé par un agent devient invisible à son directeur, et aucun contrôle de rôle (`admin/manager/agent`) n'est appliqué dans les routes ni réellement dans l'UI (la gestion des rôles de `src/pages/Settings.tsx` est une liste codée en dur).

**Objection type du banquier** : « Que se passe-t-il si quelqu'un accède à votre URL ? » En l'état : fuite totale des données clients de la banque. **Impresentable sans correction.**

### 2.2 ⛔ Éliminatoire n° 2 : contournement d'authentification intégré au produit (« mode démo » silencieux)

- `src/pages/Auth.tsx:88-105` : si la connexion Supabase échoue (mauvais mot de passe, n'importe lequel), l'application **connecte l'utilisateur en mode démo** avec le message « Connexion réussie en mode hors-ligne ». Le bouton « Se connecter en tant qu'Administrateur » (`handleDemoSignIn('admin')`) ouvre un rôle admin **sans aucun identifiant**.
- Le « token » de session est une chaîne statique (`access_token: "demo-token"`) persistée dans **localStorage** (`src/contexts/AuthContext.tsx:59-84`) — pas de rotation, pas d'expiration appliquée, lisible par toute XSS, aucun logout côté serveur.
- Même le client Supabase (src/integrations/supabase/client.ts`) embarque un **placeholder JWT « dummy_key »** et un intercepteur `safeFetch` qui, en l'absence de backend configuré, **répond des données factices** aux requêtes `/token`, aux fonctions edge, etc.

**Risque en démo live** : si l'environnement de démonstration n'est pas parfaitement configuré, la banque voit (a) une entrée sans mot de passe en accès admin, et (b) des écrans remplis de données simulées **sans marquage**. Perte de confiance immédiate et durable.

### 2.3 ⛔ Allégations de conformité non étayées, inscrites dans le produit

- Téléchargement de rapport : `Statut: Certifié conforme normes BCT & Bâle III` en dur dans `server/routes/pilotage.ts:604`.
- Analyse IA de rapport : réponse **codée en dur** « Le rapport a été validé selon les critères prudentiels de la Banque Centrale de Tunisie avec une couverture des provisions à 100 %... » (`server/routes/pilotage.ts:596`).
- Mocks : « Calibrage Bâle III approuvé » (`src/integrations/supabase/client.ts`), « conformes aux directives BCT » (landing page), pricing promettant « Rapports BCT automatiques », « Connecteur BCT/SIBTEL », « SLA 99,9 % », « API JSON/XML export », « IA Prédictive V2 ML/NLP » — **aucun de ces connecteurs/garanties n'existe dans le code**.

**Pourquoi c'est le piège le plus grave** : une institution soumettra l'outil à sa conformité interne et à son audit. Une mention « certifié conforme BCT » non soutenue par un mandat, un avis d'auditeur ou un rapport de validation = soupçon de déclaration trompeuse, et en contexte d'appel d'offres public (banques d'État tunisiennes), risque juridique. **Règle absolue : « prêt à assister la conformité », jamais « certifié conforme ».**

### 2.4 Chiffrement, protection des données au repos et persistance de démonstration

- **Base = fichier JSON en clair** `data/recovai_db.json` (`server/db/dataStore.ts:29-30`), sans chiffrement au repos, sans `data/` dans `.gitignore` → toute donnée injectée en démo finit potentiellement **commitée dans le repository**. Sauvegarde par `writeFileSync` complet, débouncé de 150 ms : aucune transaction, aucune isolation, **perte de données garantie en concurrence** (deux écritures simultanées → lost updates, fichier corrompu si crash en cours d'écriture).
- Des pans entiers de l'état vivent dans le **localStorage du navigateur** : litige store (`src/lib/litigation-store.ts` avec ses propres « audit logs » en localStorage, lignes 160 et 624-637), automation store, dossiers IFRS 9 (`src/pages/credit_ifrs9/*`). Les données d'une banque ne peuvent pas résider dans le cache d'un navigateur : pas d'effacement à distance, pas de sauvegarde, pas de DLP, pas de multi-postes.
- **Aucune politique de conservation, d'anonymisation ou de suppression** (droits de la loi organique 2004-63 art. 44-45 : droit d'accès, rectification, destruction à l'échéance de conservation). Les mocks de données de démo utilisent des noms de personnes réelles plausibles (BEN SALEM AHMED, numéros de téléphone) — à remplacer par des identifiants explicitement synthétiques.
- `express.json({ limit: '10mb' })` sans validation de schéma ni limites par route ; `xlsx@0.18.5` (SheetJS) — la version npm n'a jamais reçu les correctifs des avis connus (ReDoS / prototype pollution), publiés seulement sur le CDN de l'éditeur.

### 2.5 Flux IA : données de débiteurs envoyées à un fournisseur tiers sans garanties documentées

- Les fonctions edge appellent `https://ai.gateway.lovable.dev/v1/chat/completions` (modèle `google/gemini-2.5-flash`) avec **le contenu intégral des documents** (`String(content).slice(0, 100000)`) : contrats, jugements, mises en demeure — soit des données personnelles sensibles (loi 2004-63) et du secret des affaires.
- Les routes Express pilotage/crédit appellent **directement** l'API Gemini avec `GEMINI_API_KEY` (`server/routes/pilotage.ts:167`, `creditIfrs9.ts:136`, `portefeuilles.ts:293`).
- Aucun registre de sous-traitance, aucune clause de suppression des prompts côté fournisseur, pas de pseudonymisation/anonymisation avant appel, pas de scénario d'hébergement du modèle in situ. Le **transfert hors de Tunisie** (Google via gateway Lovable) relève d'une autorisation préalable INPDP — sujet classique de rejet par la DSI.

### 2.6 Audit trail et traçabilité : l'intention existe, l'implémentation est décorative

- Une collection `auditLogs` existe (`server/db/dataStore.ts`) mais une seule action est journalisée (`CREATE_DOSSIER`, `server/routes/dossiers.ts:119-128`), **sans identifiant d'auteur** (tout est attribué à `user_id: 'system-user'`), sans IP, sans diff avant/après, sans intégrité (modifiable/supprimable avec le fichier JSON), et **sans endpoint pour la consulter ni l'exporter**.
- `PATCH`, `PUT`, `DELETE` sur les dossiers ne journalisent **rien** ; les envois de relances sont marqués `status: 'delivered'` par simple écriture locale, **sans aucun connecteur SMS/e-mail réel** (`server/routes/relances.ts:20-70`) : la « preuve d'envoi » en cas de contestation du débiteur ou de contrôle BCT n'existe pas.
- En contentieux, les pièces (`documents`) sont stockées comme **métadonnées texte sans fichier binaire côté Express** (`server/routes/contentieux.ts:211-235`) : pas de hachage, pas de chaînage, pas de date d'horodatage qualifiée (type signature électronique) — inacceptable comme preuve judiciaire.

**Exigence bancaire type** : journal append-only, non répudiable, horodatage, export SIEM/syslog, rétention ≥ 5-10 ans. Écart majeur.

### 2.7 Intégrations legacy : rien de bancaire côté connecteurs

- Pas d'export normalisé (aucun CFONB-style, MT940, fichier de transmission SIBTEL/STELCOM — même simulé), pas de SFTP batch (mode d'échange n° 1 des banques pour le core banking), pas d'API authentifiée pour tiers (client credentials / OAuth2), pas de webhooks sortants, pas de moteur de mapping de fichiers paramétrable côté serveur (l'import XLSX/CSV existe côté navigateur, couplé à l'IA — bien, mais pas industrialisable).
- `API JSON/XML export` figure au pricing professionnel sans endpoint XML. La couche PostgREST `supabaseCompat` ne couvre que 4 tables et **ignore silencieusement le reste** (`res.json({ success: true ... })` en fallback, `server/routes/supabaseCompat.ts`) : un évaluateur technique qui teste l'API verra des écritures fantômes réussir.

### 2.8 Performance, disponibilité, exploitation : non démontrées et non démontrables

- Serveur mono-processus Express, `PORT = 3000` codé en dur, état applicatif en mémoire + fichier : **aucune scalabilité horizontale, aucune HA, pas de conteneur** (ni Dockerfile, ni docker-compose), **aucune CI/CD** (pas de `.github/workflows`), aucun fichier IaC.
- Aucun mécanisme de pagination sur les listes (`GET /api/dossiers` renvoie le tableau complet) : linéaire aujourd'hui, à refondre avant le premier volume réel.
- Pas de monitoring, pas de logging structuré (console.log), pas de métriques, pas de backup/DR documenté (RPO/RTO), pas de tests de charge. Le pricing promet « SLA 99,9 % » sans une seule brique pour le tenir.
- **Qualité logicielle** : une seule unité de test, décorative (`src/test/example.test.ts` = `expect(true)`), Playwright installé sans aucun test E2E, `tsc` non vérifié en CI, README = « TODO: Document your project here ». Un questionnaire DSI bancaire (type RFp questionnaire sécurité) serait **impossible à remplir aujourd'hui** faute de docs d'architecture, de data flow diagrams et de politique de secrets.

### 2.9 Hygiène produit qui use la crédibilité en salle

- Mélange de 4 sources de vérité (Supabase direct / API Express / localStorage / mocks) avec fusion de données réelles et mock à l'écran (`src/pages/Dossiers.tsx:54` : `[...dbDossiers, ...mockDossiers]`) : en démo, impossible de jurer que le chiffre affiché vient du moteur. À figer pour la démo : une seule voie de données, identifiée.
- KPIs de tableau de bord **câblés en dur par défaut** quand la base est vide (`|| 5800000`, `|| 1420000`, `par30: 14.8` dans `server/routes/pilotage.ts:47-99`) : à remplacer par un état vide explicite ou des données de démonstration **marquées « SYNTHÉTIQUE »**.

---

## 3. Pistes d'amélioration priorisées (impact × effort)

### 3.1 Matrice de décision

```
IMPACT
 ÉLEVÉ │ [3] Retirer/étayer        [1] Auth API + RBAC      [9] Audit trail immuable
       │ les allégations          [2] Supprimer le         [10] Multi-tenant + SSO
       │ (« certifié BCT »)       fallback démo          [11] Anonymisation +
       │ [6] .gitignore data/     [4] Postgres unique      hébergement IA
       │                          source de vérité        [15] Pentest + ISO 27001
       │ [12] Connecteurs legacy  [5] Durcissement        [16] Dossier modèle
       │ (SFTP/batch/OAuth2)      HTTP (helmet, CORS,     (validation IFRS 9)
       │                          rate-limit, zod)        [14] HA/DR/monitoring
 MOYEN │ [8] Pagination,          [7] OpenAPI +            [13] CI/CD + SBOM
       │ soft-delete,              documentation          [17] Soutien + SLA
       │ transactions              architecture           [18] Double contrôle
 FAIBLE│ [19] Nettoyage UI démo                            (4-eyes) (→ moyen-bas)
       └──────────────────────────────────────────────────────────────────────
          EFFORT XS (jours)          S-M (1-4 sem.)           L-XL (1-6 mois)
```

### 3.2 Feuille de route en 3 lots

#### LOT P0 — « Ne pas se faire éliminer » (avant la première présentation ; ~2-3 semaines)

| # | Action | Impact | Effort | Détails d'implémentation |
|---|--------|--------|--------|--------------------------|
| P0.1 ✅ | **Retirer toute allégation de conformité non étayée** | Critique | **XS (1 jour)** | Supprimer « Certifié conforme normes BCT & Bâle III » (`pilotage.ts:604`), la validation IA en dur (`pilotage.ts:596`), « Calibrage Bâle III approuvé » (client mock). Remplacer partout par : « outil d'assistance conforme aux **principes** de la circulaire BCT 2013-21 et d'IFRS 9 — sans certification à ce jour, roadmap ISO 27001 en cours ». Gains : neutralise l'objection n° 1 de conformité, coûte zéro. |
| P0.2 ✅ | **Supprimer le contournement de login** | Critique | **XS (1 jour)** | Retirer `signInWithDemo` automatique au catch (`Auth.tsx:88-105`) ; mode démo = flag d'environnement `VITE_DEMO_MODE=1` **uniquement** sur l'instance de démo, avec **bandeau permanent « ENVIRONNEMENT DE DÉMONSTRATION — DONNÉES SYNTHÉTIQUES »**, et bouton admin démo supprimé de la build de production. |
| P0.3 ✅ | **Authentifier et autoriser l'API Express** | Critique | **M (1-2 sem.)** | Middleware `requireAuth` sur tous les routers : vérification du JWT Supabase (ou token émis par l'app) signature + audience + expiration ; injection `req.user` ; RBAC par rôle (agent ne voit que ses dossiers, directeur son agence, admin l'institution) ; `apikey` refusée si absente. En attendant : auth basique par token de service + allowlist IP suffit pour verrouiller la démo. |
| P0.4 ✅ | **Durcir le transport** | Élevé | **S (2-3 jours)** | `helmet`, CORS par allowlist d'origines (pas `*`), `express-rate-limit` (ex. 100 req/min/IP, 10/min sur l'auth), validation zod de **chaque** corps de POST/PATCH (les schémas existent déjà pour l'auth — les étendre), `limit` JSON par route (≤ 1 Mo sauf import), masquer `/api/health` (ou le limiter aux admins et supprimer les stats internes). |
| P0.5 ✅ | **Sécuriser la donnée de démo** | Élevé | **S (2-3 jours)** | Ajouter `data/` au `.gitignore` ; remplacer tous les noms/télés/e-mails des seeds par des entités synthétiques non ambiguës (`DÉBITEUR-TEST-01`, `555-0000`) ; désactiver `db.save()` d'écriture réelle en mode démo ou écrire vers un volume éphémère. |
| P0.6 🔶 | **Figure la voie de données unique en démo** (fait pour Dossiers ; Litigation/Automation/IFRS9 → P1) | Élevé | **S (3-5 jours)** | Soit tout par API Express, soit tout par Supabase — pas de fusion `[...dbDossiers, ...mockDossiers]`, pas de localStorage pour les litiges/automation (lesStores Express existent déjà, brancher les pages). Remplacer les valeurs plancher câblées des tableaux de bord par l'état vide réel. |
| P0.7 ✅ | **Quota de crédibilité : inventaire des promesses** | Moyen | **XS (1 jour)** | Relire `Pricing.tsx` / landing : marquer chaque feature non livrée « roadmap Qx 2026 » ou la retirer. Un décideur qui découvre un « SLA 99,9 % » non tenu perd foi dans tout le reste. |

#### LOT P1 — « Passable en comité projet / pilote bancaire » (1–3 mois)

| # | Action | Impact | Effort | Détails |
|---|--------|--------|--------|---------|
| P1.1 ✅ | **Postgres comme source unique de vérité** | Élevé | **L** | Abandonner `dataStore` JSON au profit des migrations existantes (schéma déjà écrit) ; transactions pour toute mutation multi-objets ; contrainte de version (`version`/`updated_at` optimiste) contre les lost updates ; pagination serveur (`limit/offset` ou cursor) partout ; soft-delete + champ `retention_until`. |
| P1.2 ✅ | **Multi-tenancy institutionnelle** | Élevé | **L** | Colonne `institution_id` sur toutes les tables métier ; RLS par appartenance d'organisation (`user_roles` + jointure institution) plutôt que par `user_id` seul ; sélecteur d'institution au login ; isolation vérifiée par test automatisé (un agent de la banque A ne voit jamais B). |
| P1.3 ✅ | **Audit trail véritable** | Élevé | **M** | Table `audit_events` append-only (REVOKE UPDATE/DELETE ; triggers sur toutes les tables métier capturant actor, role, IP, action, diff JSONB avant/après, hash chaîné `prev_hash`), endpoint de consultation + export CSV/SIEM, rétention paramétrable (défaut 10 ans) ; journaliser les envois de communication avec statut réel (cf. P1.5). |
| P1.4 🔶 | **Protection des données & flux IA** | Élevé | **M** | Pseudonymisation avant appel LLM (masks regex : CIN/RI, téléphones, e-mails, montants conservés sous forme de tranches) ; documentation des flux (ROPA, sous-traitants, pays, durées) ; autorisation INPDP pour tout transfert hors Tunisie, ou option « LLM local » (Ollama/vLLM sur GPU interne) pour la cible banques ; chiffrement au repos Postgres (LUKS/pgcrypto ou managé), TLS imposé, secrets via Vault/Secret Manager + rotation. |
| P1.5 | **Connecteurs de communication réels** | Élevé | **M** | Intégration passerelle SMS (ex. API d'un agrégateur tunisien) + SMTP transactionnel avec webhooks de statut (délivré/échoué/rebond) et **statut stocké depuis le webhook, pas simulé** ; horodatage des preuves d'envoi (base légale du « durable » du contentieux). |
| P1.6 🔶 | **Intégrations legacy socle** | Élevé | **L** | Batch SFTP inbound/outbound (dépôt/retrait + traitement planifié), format d'échange **paramétrable** (mapping colonnes, gabarits CSV/Excel documentés), API OAuth2 client-credentials pour les tiers (avocats/huissiers), webhooks sortants signés (HMAC), exports PDF/xlsx horodatés et signés côté serveur. Vis-à-vis du core banking : commencer par l'import/export fichier + API — la connexion temps réel se négocie projet par projet. |
| P1.7 | **SSO & comptes d'entreprise** | Moyen-élevé | **M** | OIDC/SAML (AD/Entra), provisionnement SCIM optionnel, MFA TOTP, politique de session (expiration courte, refresh tournant, révocation server-side), verrouillage après N tentatives. |
| P1.8 ✅ | **Socle d'exigence technique** | Moyen | **S-M** | OpenAPI 3 généré + spec commitée ; ADR (architecture decision records) ; diagrammes C4 + data flow diagrams ; README/Dockerfile/docker-compose ; CI (lint + typecheck + tests + `npm audit --audit-level=high` + SBOM CycloneDX) ; remplacer `xlsx` par `exceljs` ; mise à jour des dépendances. |
| P1.9 🔶 | **Qualité** | Moyen | **M** | Tests du moteur ECL/IFRS 9 et des règles d'escalade (cas limites : 30/90 j, collatéral nul, scénarios macro) — un **cahier de tests de recette** est un livrable d'appel d'offres ; tests API d'isolation multi-tenant ; 10+ tests E2E critiques (login, créer dossier, relancer, escalader, exporter). |

#### LOT P2 — « Contractable avec une banque » (3–12 mois)

| # | Action | Impact | Effort | Détails |
|---|--------|--------|--------|---------|
| P2.1 | **Pentest externe + plan ISO 27001** | Élevé | **L-XL** | Pentest (résecurisation post-P0/P1) avec lettre d'accompagnement pour la DSI cliente ; mise en place SMSI : politique de sécurité, gestion des incidents + **notification d'incident à l'heure près** (obligation contractuelle type BCT), continuité (PCA/PRA documentés, tests annuels), 8 principes ISO 27001/27017. |
| P2.2 | **HA / DR / observabilité** | Élevé | **M-L** | App stateless multi-réplica + LoadBalancer ; Postgres managé avec réplicas + PITR ; RPO ≤ 15 min / RTO ≤ 4 h chiffrés et contractuels ; métriques Prometheus/Grafana, traces OpenTelemetry, journalisation structurée (JSON), alerting, page de statut publique ; tests de charge k6 au-delà de 50 000 dossiers. |
| P2.3 | **Dossier de validation du modèle crédit** | Élevé | **L** | Spécification du modèle (variables, pondérations, justifications), jeux de données d'entraînement/calibration, limites connues, plan de backtesting sur données clients anonymisées, versionnement des paramètres (les champs version/timestamp existent déjà dans la sortie IA), processus de revue comité modèles ; alignement déclaratif sur BCT 2013-21 (classes/provisions) et IFRS 9 (SICR, ECL lifetime, forward-looking) avec tableau de correspondance exigence → fonctionnalité. |
| P2.4 | **Contrôles de séparation & 4-eyes** | Moyen-élevé | **M** | Double validation sur les actes sensibles (mise en demeure, rééchelonnement, abandon partiel, clôture contentieux, suppression de dossier) : workflow maker/checker enregistré dans l'audit ; limites montants par rôle. |
| P2.5 | **Support industrialisé** | Moyen | **M (org.)** | Niveaux L1/L2/L3, SLA contractuels (P1 : 1 h de réponse, etc.), portail tickets, astreinte, release notes sémantiques, contrat d'escrow du code (exigence fréquente des banques pour un éditeur non coté). |
| P2.6 | **Références & conformité sectorielle** | Moyen | **M** | 1-2 pilotes non bancaires (IMF, société de leasing) pour références chiffrées (taux de récupération amélioré, délais) ; questionnaire DSI pré-rempli ; clause de réversibilité (export SQL + docs) désamorce l'objection lock-in. |

### 3.3 Ce qu'il ne faut **pas** tenter de compenser par des promesses

- Un SLA ou une certification « en cours » sans preuve ; une « connectivité SIBTEL » sans lettre d'intention d'un partenaire ; l'auto-déclaration de conformité « suffisante pour la BCT » — le régulateur tunisien juge les banques, pas l'éditeur : le bon cadrage est « nous **accélérons votre** conformité (reporting, déclassement, traçabilité), nous ne nous y substituons pas ».
-brancher des données réelles d'une banque avant le lot P1 (Postgres + RLS + audit + chiffrement).

---

## 4. Préparation concrète de la présentation

### 4.1 Scénario de démo recommandé (30 min)

1. **Contexte** : 3 slide max — cycle de la créance couvert, les 3 segments (banque/leasing/IMF), les seuils BCT/IFRS 9 intégrés. Aucune mention « certifié ».
2. **Live** : import d'un échéancier XLSX de leasing → extraction IA avec revue humaine obligatoire → création dossier → moteur de relance (montrer la **règle J+30 → superviseur**) → bascule contentieux avec dossier avocat/huissier/audience → **écran « Journal d'audit »** (le montrer même s'il est minimal : c'est LE signal compris par un risk manager) → tableau de bord PAR30 / taux de recouvrement / matrice de déclassement.
3. **Architecture** (slide unique) : Front React → API REST authentifiée → Postgres + RLS multi-tenant → files de traitement ; encadré « Sécurité : état actuel / état cible » en honnête : c'est un positionnement qui **rassure** un DSI, la dissimulation le tue.
4. **Roadmap contractuelle** : P0 livré, P1 daté, pilotes nommés (IMF/leasing d'abord, plus faciles à convaincre que la banque ; les banques suivront avec la référence).

### 4.2 Objections prévisibles — réponses prêtes

| Objection du comité | Réponse recommandée | Prérequis (lot) |
|---|---|---|
| « Comment protégez-vous les données de nos clients ? » | « Démo sur données 100 % synthétiques ; en production, Postgres chiffré au repos, TLS systématique, RBAC + isolation par institution, MFA/SSO, audit immuable ; pentest externe planifié [date]. » | P0.1-0.5, P1.1-4 |
| « Êtes-vous certifiés / conformes ? » | « Aucune certification n'est revendiquée à ce jour — voici la matrice de correspondance fonctionnalité ↔ exigences BCT 2013-21, IFRS 9, loi 2004-63, et notre trajectoire ISO 27001. La responsabilité de conformité reste la vôtre, l'outil la facilite. » | P2.1, P2.3 |
| « Où sont hébergées les données ? Nos régulateurs n'aiment pas le cloud étranger. » | « Cible : hébergement souverain/on-prem (K8s + Postgres managé local ou LLM interne). Aucune architecture cloud foreign lock-in. » | P1.4, P2.2 |
| « Et si votre éditeur disparaît ? » | « Postgres standard + exports documentés + escrow code + réversibilité contractuelle. » | P2.5-6 |
| « Combien de temps pour nous intégrer ? » | « Mode dégradé : import/export batch SFTP + gabarits en 2-4 semaines ; API OAuth2 et connecteurs cœur de métier en projet pilote. Nous ne demandons pas d'accès au core banking en Phase 1. » | P1.6 |
| « Qui a vu quoi, quand ? » | Ouvrir le journal d'audit en live pendant la réponse. | P1.3 |
| « L'IA peut-elle refuser un crédit ? » | « Non : aucune décision automatisée. Recommandation pondérée + explication + garde-fous non-financiers, revue humaine obligatoire, moteur ECL parallèle déterministe et recalculable sans IA. » | déjà vrai (1.2, 1.3) |

### 4.3 Livrables papier à joindre au dossier de présentation

1. Note de sécurité (2-4 p.) : modèle de menaces simplifié (STRIDE), contrôle d'accès, chiffrement, journalisation — état actuel **et** cible datée.
2. Data flow diagram (données entrantes → stockage → sorties IA/tiers) + registre de traitement (loi 2004-63).
3. Matrice de conformité « exigences métier → où c'est dans l'app » (1 page, avec références aux règles BCT/IFRS 9).
4. Cahier de tests de recette du moteur ECL/escalade + sortie d'un recalcul manuel d'un cas Bucket 2.
5. DPA (accord de traitement des données) + liste des sous-traitants IA — même en version « projet ».
6. Roadmap produit signée des lots P1/P2 avec jalons.

---

## 5. Annexe — Evidence register (pour revue interne, ne pas distribuer)

| Constat | Fichier : repère |
|---|---|
| API sans auth, CORS `*`, 10 Mo JSON sans schéma | `server.ts:18-38` |
| Stockage JSON en clair, save débouncé, pas de transactions | `server/db/dataStore.ts:29-30, 596-631` |
| Fallback « n'importe quel mot de passe → démo » + bouton admin sans identifiants | `src/pages/Auth.tsx:26-36, 88-105` |
| Tokens démo statiques en localStorage | `src/contexts/AuthContext.tsx:59-84` |
| Placeholder JWT dummy + réponses mock silencieuses aux calls de fonctions | `src/integrations/supabase/client.ts` (safeFetch, `getMockFunctionsResponse`) |
| « Certifié conforme BCT & Bâle III » en dur | `server/routes/pilotage.ts:604` |
| Validation IA de rapport en dur | `server/routes/pilotage.ts:596` |
| Audit : 1 action seulement, sans auteur, sans endpoint | `server/routes/dossiers.ts:119-128` ; `dataStore.ts:656` |
| Relances marquées « delivered » sans passerelle | `server/routes/relances.ts:20-70` |
| Pièces contentieux = métadonnées sans binaire ni hash | `server/routes/contentieux.ts:211-235` |
| RLS par `user_id` (mauvais scope multi-institution) | `supabase/migrations/20260507100534...sql:21-24`, `20260508074331...sql:46-53` |
| Rôles admin/manager/agent définis mais non appliqués ; UI rôles fake | `20260504150336...sql` ; `src/pages/Settings.tsx:16-46` |
| KPIs câblés en dur en fallback | `server/routes/pilotage.ts:47-99` |
| Fusion données réelles + mocks à l'écran | `src/pages/Dossiers.tsx:54` |
| Envoi du contenu document aux LLM tiers (100 k caractères) | `supabase/functions/extract-*/index.ts` ; appels directs Gemini dans `server/routes/pilotage.ts:167`, `creditIfrs9.ts:136`, `portefeuilles.ts:293` |
| Compat PostgREST partielle avec fallback trompeur `{success:true}` | `server/routes/supabaseCompat.ts:131` |
| Health endpoint exposant les stats de base | `server/routes/health.ts:6-16` |
| Suite de tests = 1 test décoratif ; README vide ; pas de CI/Docker | `src/test/example.test.ts`, `README.md` |
| xlsx@0.18.5 (advisories connus non corrigés sur npm) | `package.json` |
| Moteur ECL déterministe (point fort, à documenter) | `server/routes/creditIfrs9.ts:10-98` |
| Moteur d'escalade à règles réel (point fort) | `server/routes/relances.ts:224-256` |
| IA cadrée « aide à la décision » + garde-fous | `supabase/functions/credit-decision/index.ts` (SYSTEM_PROMPT), `ifrs9-engine/index.ts` |

---

*Document généré le 2026-09-22 sur la base du dépôt `zeiddhambri/ZEID-DHAMBRI-30-05-2026`, branche `arena/01a0ca8d...`, commit `4c05937`. À réactualiser après chaque lot livré.*
