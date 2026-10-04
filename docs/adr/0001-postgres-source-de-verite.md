# ADR-001 — Postgres comme source de vérité, store JSON comme mode démo

Date : 2026-09-22 · Statut : **acceptée** · Lot : P1

## Contexte
L'application stockait tout dans un fichier JSON unique lu/modifié en mémoire
(choix de prototype). Une banque cible exige transactions, conciliation d'écritures
simultanées, suppression traçable, cloisonnement inter-établissements et journal
probatoire.

## Décision
1. Introduire une interface `Repository` (server/db/repo.ts) avec deux implémentations :
   `JsonRepo` (démo/dev, comportement actuel préservé) et `PgRepo` (production).
   Le choix se fait par la seule présence de `DATABASE_URL`.
2. Postgres porte la table `dossiers` + `audit_events` (migrations SQL versionnées
   dans `server/db/migrations/`). Le multi-tenant est obtenu par RLS piloté par GUC
   applicatif (`app.institution`) et non par un schéma par tenant.
3. Les collections non migrées (contentieux, leasing, factoring, templates, règles)
   restent temporairement sur le store JSON ; la couche de compat `/rest/v1` est
   neutralisée (501) en mode Postgres pour éviter deux sources de vérité sur les
   mêmes entités.

## Conséquences
- La démo reste exécutable sans base (zéro friction commerciale) ; les pilotes
  branchent Postgres managé (ou on-prem) sans code applicatif supplémentaire.
- Coût : deux implémentations à maintenir jusqu'à la fin de la migration — borné,
  les tests d'intégration couvrent les deux chemins (pg via embedded/CI).
- Alternative écartée : continuer sur Supabase côté client (le RLS Postgres est
  exactement Supabase… mais sans contrat de support ni maîtrise du réseau — les
  institutions ciblées hébergent ; une passerelle Supabase peut venir plus tard).
