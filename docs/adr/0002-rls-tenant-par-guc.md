# ADR-002 — Cloisonnement institution par RLS GUC (multi-tenant partagé)

Date : 2026-09-22 · Statut : **acceptée** · Lot : P1

## Contexte
RecovAI est présenté à plusieurs établissements (banque, leasing, IMF) qui peuvent
cohabiter sur la même instance. Trois options : une base par tenant, un schéma par
tenant, ou un discriminateur `institution` + Row Level Security.

## Décision
Discriminateur + **RLS** :
- le jeton d'accès porte le claim `institution` (comptes transverses = null) ;
- chaque transaction PG pose `set_config('app.institution', …, true)` ;
- les politiques `USING`/`WITH CHECK` filtrent lectures et écritures au niveau moteur ;
- le rôle applicatif `recovai_app` est non-privilegié (ni owner ni superuser) pour
  que la RLS s'applique vraiment ; les tests d'intégration le vérifient, superuser
  compris (un test dédié démontre la tentative cross-tenant).

## Conséquences
- Un seul chemin de migration/ops ; jointures et vues consolidées (groupe, auditeur
  interne) restent possibles avec un rôle transverse dédié.
- Risque d'oubli du GUC dans un futur point d'entrée → mitigé : PgRepo centralise
  toute connexion (aucun accès SQL hors `withTx`), la RLS refuse par défaut
  (« default-deny ») sans contexte, et l'API filtre aussi au niveau applicatif.
- Une base par tenant redevient triviale plus tard (même migration rejouée N fois)
  si un client impose l'isolement physique.
