# ADR-004 — Pseudonymisation côté serveur avant IA externe ; exports batch = fichiers plats

Date : 2026-09-22 · Statut : **acceptée** · Lot : P1

## Contexte
(a) Les fonctions IA envoient des données clients à un modèle tiers — tension entre
qualité d'analyse et loi 2004-63 (minimisation ; transfert hors Tunisie soumis à
autorisation INPDP). (b) Les DSI des institutions échangent avec le cœur bancaire par
fichiers plats batch (SFTP) ; un export CSV « qui ressemble à ce qu'ils ont l'habitude
de consommer » est le chemin d'intégration le plus court, avant une API temps réel.

## Décision
1. `server/redact.ts` applique une pseudonymisation déterministe aux prompts
   (téléphones, e-mails, CIN/comptes, noms avec civilité, raisons sociales) **côté
   serveur**, activée par défaut (`AI_REDACT=on`), désactivable en déploiement où le
   LLM est dans le périmètre de la banque (`off`).
2. Export `GET /api/export/dossiers.csv` : séparateur `;`, en-tête stable, valeurs
   échappées, strictement cloisonné par le jeton (le fichier ne contient jamais le
   portefeuille d'un autre tenant), en-tête `X-Recovai-Rows` pour les contrôles de
   recette batch. L'export JSON horodaté sert aux intégrations REST.
3. Ces exports sont des vues en lecture seule produites par le Repository — jamais
   des dumps du store applicatif.

## Conséquences
- Les prompts perdent les noms propres : pour les cas où l'analyse a besoin
  d'identifier finement, la banque peut passer en `off` sous sa responsabilité
  (ou brancher un LLM interne — réglage recommandé).
- Le format de fichier est un contrat : ne pas changer l'ordre des colonnes sans
  versionner (`X-Recovai-Export-Version` à ajouter au premier changement).
