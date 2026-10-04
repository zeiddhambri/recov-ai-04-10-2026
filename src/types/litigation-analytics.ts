export interface LitigationKPIs {
  totalCases: number;
  openCases: number;
  closedCases: number;
  preLitigationCount: number;
  transferredCount: number; // period-specific transferred to litigation
  totalClaimAmount: number;
  totalRecoveredAmount: number;
  recoveryRate: number;
  remainingAmount: number;
  feesEngaged: number;
  feesRecovered: number;
  avgCostPerCase: number;
  feesToRecoveredRatio: number;
  judgmentsObtained: number;
  casesInExecution: number;
  casesInSeizureProgress: number;
  casesPassedToLoss: number;
  avgDurationDays: number;
  overdueActionsCount: number;
  missingDocumentsCount: number;
  activeGuaranteesCount: number;
  totalGuaranteesValue: number;
  soldGuaranteesValue: number;
}

export interface EnrichedLitigationCase {
  id: string; // e.g. LIT-2024-0001
  clientName: string;
  portfolioType: 'Microfinance' | 'Factoring' | 'Leasing';
  institution: string;
  branch: string;
  legalStatus: string; // e.g. "pre_litigation", "in_process", ...
  legalStatusLabel: string;
  manager: string; // responsable juridique
  externalLawyer: string; // avocat externe
  filingDate: string; // date ouverture
  daysOpen: number; // ancienneté en jours
  principalAmount: number;
  interestRate: number;
  interestAndPenalties: number;
  legalFees: number;
  bailiffFees: number;
  litigationFees: number; // total fees engaged
  totalClaimed: number; // principal + interest + fees
  recoveredAmount: number;
  remainingBalance: number;
  recoveryRate: number; // %
  hasCollateral: boolean;
  collateralType?: string;
  collateralValue: number;
  collateralStatus?: 'active' | 'seizure_started' | 'seized' | 'sold' | 'released';
  missingDocumentsCount: number;
  missingDocumentsList: string[];
  lastAction: string;
  nextAction: string;
  nextActionDate?: string;
  isActionOverdue: boolean;
  riskLevel: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  iaShortRecommendation: string;
}

export type PeriodPreset = 'today' | '7days' | '30days' | 'quarter' | 'year' | 'custom';
export type PortfolioFilter = 'All' | 'Microfinance' | 'Factoring' | 'Leasing';

export interface LitigationFilters {
  period: PeriodPreset;
  startDate?: string;
  endDate?: string;
  portfolio: PortfolioFilter;
  institution: string;
  branch: string;
  legalStatus: string;
  legalOfficer: string;
  externalLawyer: string;
  riskLevel: string;
  minAmount?: number;
  maxAmount?: number;
  minAgeInDays?: number;
  maxAgeInDays?: number;
  hasMissingDocuments: boolean | 'all';
  hasOverdueActions: boolean | 'all';
  hasCollateral: boolean | 'all';
  noNextActionPlanned: boolean | 'all';
}
