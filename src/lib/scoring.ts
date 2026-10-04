// Scoring Engine - Moteur de scoring recouvrement
// Calcule un score de priorité basé sur : montant, ancienneté, historique, réactivité, typologie

export type ClientClassification = 'fiable' | 'a_surveiller' | 'a_risque';

export interface ScoringCriteria {
  montant: number;           // Montant de la créance (TND)
  ancienneteJours: number;   // Nombre de jours depuis la date de la créance
  tauxPaiementHistorique: number; // 0-100% historique de paiement passé
  tauxReactivite: number;    // 0-100% réactivité aux relances
  typologieClient: 'particulier' | 'pme' | 'grande_entreprise' | 'institution';
}

export interface ScoringResult {
  score: number;              // 0-100
  classification: ClientClassification;
  details: {
    scoreMontant: number;
    scoreAnciennete: number;
    scoreHistorique: number;
    scoreReactivite: number;
    scoreTypologie: number;
  };
  recommandation: string;
}

const WEIGHTS = {
  montant: 0.25,
  anciennete: 0.20,
  historique: 0.25,
  reactivite: 0.20,
  typologie: 0.10,
};

function scoreMontant(montant: number): number {
  if (montant >= 1000000) return 100;
  if (montant >= 500000) return 85;
  if (montant >= 200000) return 70;
  if (montant >= 100000) return 55;
  if (montant >= 50000) return 40;
  return 25;
}

function scoreAnciennete(jours: number): number {
  if (jours >= 180) return 100;
  if (jours >= 120) return 85;
  if (jours >= 90) return 70;
  if (jours >= 60) return 50;
  if (jours >= 30) return 30;
  return 15;
}

function scoreHistorique(taux: number): number {
  // Inversé : faible historique de paiement = score élevé (plus risqué)
  return 100 - taux;
}

function scoreReactivite(taux: number): number {
  // Inversé : faible réactivité = score élevé (plus risqué)
  return 100 - taux;
}

function scoreTypologie(type: ScoringCriteria['typologieClient']): number {
  switch (type) {
    case 'particulier': return 60;
    case 'pme': return 50;
    case 'grande_entreprise': return 30;
    case 'institution': return 20;
  }
}

export function calculerScore(criteria: ScoringCriteria): ScoringResult {
  const details = {
    scoreMontant: scoreMontant(criteria.montant),
    scoreAnciennete: scoreAnciennete(criteria.ancienneteJours),
    scoreHistorique: scoreHistorique(criteria.tauxPaiementHistorique),
    scoreReactivite: scoreReactivite(criteria.tauxReactivite),
    scoreTypologie: scoreTypologie(criteria.typologieClient),
  };

  const score = Math.round(
    details.scoreMontant * WEIGHTS.montant +
    details.scoreAnciennete * WEIGHTS.anciennete +
    details.scoreHistorique * WEIGHTS.historique +
    details.scoreReactivite * WEIGHTS.reactivite +
    details.scoreTypologie * WEIGHTS.typologie
  );

  let classification: ClientClassification;
  let recommandation: string;

  if (score >= 70) {
    classification = 'a_risque';
    recommandation = 'Action immédiate requise. Envisager le transfert en contentieux.';
  } else if (score >= 40) {
    classification = 'a_surveiller';
    recommandation = 'Intensifier les relances. Proposer un échéancier de paiement.';
  } else {
    classification = 'fiable';
    recommandation = 'Maintenir le suivi standard. Client coopératif.';
  }

  return { score, classification, details, recommandation };
}

// Classification labels & colors (semantic tokens)
export const classificationConfig: Record<ClientClassification, { label: string; colorClass: string; bgClass: string }> = {
  fiable: { label: 'Client Fiable', colorClass: 'text-green-600', bgClass: 'bg-green-50' },
  a_surveiller: { label: 'À Surveiller', colorClass: 'text-gold', bgClass: 'bg-gold/10' },
  a_risque: { label: 'À Risque', colorClass: 'text-destructive', bgClass: 'bg-destructive/10' },
};
