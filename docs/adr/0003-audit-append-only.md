# ADR-003 — Journal d'audit append-only avec chaînage SHA-256 et différentiels

Date : 2026-09-22 · Statut : **acceptée** · Lot : P1

## Contexte
En contentieux et en contrôle prudentiel (BCT), le journal doit être opposable :
qui a changé quoi, quand, et la preuve que le journal n'a pas été retouché.
Un simple tableau que l'application peut réécrire ne vaut rien.

## Décision
1. Table `audit_events` **append-only** : `bigserial`, triggers `BEFORE UPDATE OR
   DELETE` qui lèvent une exception ; le rôle applicatif ne reçoit que
   `SELECT, INSERT` (+ usage de séquence).
2. Chaque entrée horodate, nomme l'auteur authentifié (jamais un champ fourni par le
   client), référence l'entité, et inclut le différentiel `before_state`/`after_state`.
3. Chaînage : `hash = SHA-256(prev_hash || entrée)` ; le premier lien part de
   `GENESIS`. La relecture complète du journal détecte toute altération même avec un
   accès direct à la base. L'export `GET /api/audit?format=csv` permet une
   contre-signature hors ligne par l'auditeur (archive + empreinte du fichier).
4. En mode démo JSON, le même algorithme de chaînage s'applique (le store n'a pas la
   garantie moteur de Postgres — c'est écrit noir sur blanc dans la réponse de l'API).

## Conséquences
- Purge/rétention : pas d'UPDATE possible ; l'archivage se fait par extraction +
  suppression **administrateur** (rôle owner), tracée dans un nouveau segment.
- Coût d'écriture : une ligne de plus par écriture — négligeable au volume de la
  relance (quelques dizaines de milliers de lignes/an par institution).
