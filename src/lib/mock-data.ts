import { ScoringCriteria, calculerScore, ScoringResult } from './scoring';

export interface DossierComplet {
  id: string;
  clientCode: string;
  debtorName: string;
  amount: number;
  status: 'a_relancer' | 'en_relance' | 'promesse_paiement' | 'partiellement_paye' | 'paye' | 'contentieux';
  managementLevel: string;
  agent: string;
  date: string;
  scoring: ScoringCriteria;
  scoringResult: ScoringResult;
  typologieClient: ScoringCriteria['typologieClient'];
}

export const statusConfig: Record<string, { label: string; color: string }> = {
  a_relancer: { label: 'À relancer', color: 'text-sky bg-sky/10' },
  en_relance: { label: 'En relance', color: 'text-gold bg-gold/10' },
  promesse_paiement: { label: 'Promesse de paiement', color: 'text-purple-600 bg-purple-50' },
  partiellement_paye: { label: 'Partiellement payé', color: 'text-amber-600 bg-amber-50' },
  paye: { label: 'Payé', color: 'text-green-600 bg-green-50' },
  contentieux: { label: 'Contentieux', color: 'text-destructive bg-destructive/10' },
};

function buildDossier(
  id: string, clientCode: string, debtorName: string, amount: number,
  status: DossierComplet['status'], managementLevel: string, agent: string, date: string,
  scoring: ScoringCriteria
): DossierComplet {
  return {
    id, clientCode, debtorName, amount, status, managementLevel, agent, date,
    scoring,
    scoringResult: calculerScore(scoring),
    typologieClient: scoring.typologieClient,
  };
}

export const mockDossiers: DossierComplet[] = [
  buildDossier('1', 'RCV-2026-001', 'STE MEDITERRANEE TEXTILE SARL', 145000, 'a_relancer', 'directeur', 'Kamel Riahi', '2026-09-15',
    { montant: 145000, ancienneteJours: 45, tauxPaiementHistorique: 60, tauxReactivite: 35, typologieClient: 'grande_entreprise' }),
  buildDossier('2', 'RCV-2026-002', 'SOCIETE COMMERCIALE DU SUD SARL', 68000, 'a_relancer', 'comite', 'Sonia Ben Amor', '2026-09-20',
    { montant: 68000, ancienneteJours: 38, tauxPaiementHistorique: 75, tauxReactivite: 50, typologieClient: 'pme' }),
  buildDossier('3', 'RCV-2026-003', 'COMPTOIR TUNISIEN DU BOIS SA', 320000, 'en_relance', 'recouvreur', 'Karim Mansour', '2026-08-30',
    { montant: 320000, ancienneteJours: 62, tauxPaiementHistorique: 50, tauxReactivite: 40, typologieClient: 'grande_entreprise' }),
  buildDossier('4', 'RCV-2026-004', 'POLYCLINIQUE LES BERGES DU LAC', 89000, 'a_relancer', 'recouvreur', 'Kamel Riahi', '2026-09-28',
    { montant: 89000, ancienneteJours: 28, tauxPaiementHistorique: 80, tauxReactivite: 70, typologieClient: 'institution' }),
  buildDossier('5', 'RCV-2026-005', 'STE EL NOUR AGRO-INDUSTRIE', 42000, 'a_relancer', 'directeur', 'Amel Bouslama', '2026-09-10',
    { montant: 42000, ancienneteJours: 48, tauxPaiementHistorique: 65, tauxReactivite: 55, typologieClient: 'pme' }),
  buildDossier('6', 'RCV-2026-006', 'DR. MOHAMED BEN SALEM', 28000, 'a_relancer', 'recouvreur', 'Sonia Ben Amor', '2026-09-30',
    { montant: 28000, ancienneteJours: 22, tauxPaiementHistorique: 85, tauxReactivite: 75, typologieClient: 'particulier' }),
  buildDossier('7', 'RCV-2026-007', 'TRANSIT DU NORD EXPRESS', 78000, 'en_relance', 'directeur', 'Amel Bouslama', '2026-09-18',
    { montant: 78000, ancienneteJours: 40, tauxPaiementHistorique: 55, tauxReactivite: 45, typologieClient: 'pme' }),
  buildDossier('8', 'RCV-2026-008', 'STE NORD AFRICAINE DE TRAVAUX', 580000, 'en_relance', 'comite', 'Kamel Riahi', '2026-08-15',
    { montant: 580000, ancienneteJours: 85, tauxPaiementHistorique: 40, tauxReactivite: 30, typologieClient: 'grande_entreprise' }),
  buildDossier('9', 'RCV-2026-009', 'COMPAGNIE MAGHREB SERVICES SA', 115000, 'a_relancer', 'directeur', 'Karim Mansour', '2026-09-22',
    { montant: 115000, ancienneteJours: 32, tauxPaiementHistorique: 70, tauxReactivite: 60, typologieClient: 'institution' }),
  buildDossier('10', 'RCV-2026-010', 'ATELIER ARTISANAL DU SUD', 18000, 'a_relancer', 'recouvreur', 'Amel Bouslama', '2026-09-25',
    { montant: 18000, ancienneteJours: 35, tauxPaiementHistorique: 65, tauxReactivite: 50, typologieClient: 'particulier' }),
];
