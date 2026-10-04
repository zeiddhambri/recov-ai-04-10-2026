export interface ProductL4 {
  id: string;
  name: string;
  code: string;
  categoryL2: string;
  subCategoryL3: string;
  portfolioL1: string;
  description: string;
  typicalRepaymentMode: string;
  riskProfile: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  metrics: {
    outstanding: number; // Encours en TND
    overdue: number;     // Arriérés en TND
    count: number;       // Nombre de concours
    recoveryRate: number;// Taux de recouvrement %
    defaultRate: number; // Taux de défaut %
  };
}

export interface SubCategoryL3 {
  id: string;
  name: string;
  code: string;
  categoryL2Id: string;
  portfolioL1Id: string;
  description: string;
  products: ProductL4[];
  metrics: {
    outstanding: number;
    overdue: number;
    count: number;
    recoveryRate: number;
  };
}

export interface CategoryL2 {
  id: string;
  name: string; // Famille de crédit (ex: Crédits de trésorerie, Crédits d'investissement...)
  code: string;
  portfolioL1Id: string;
  iconName: string;
  subCategories: SubCategoryL3[];
  metrics: {
    outstanding: number;
    overdue: number;
    count: number;
    recoveryRate: number;
  };
}

export interface PortfolioL1 {
  id: string;
  name: string; // Portefeuille macro (ex: Portefeuille Entreprises, Portefeuille Particuliers...)
  code: string;
  color: string;
  categories: CategoryL2[];
  metrics: {
    outstanding: number;
    overdue: number;
    count: number;
    recoveryRate: number;
  };
}

export interface PortfolioFilterState {
  portfolioL1: string;     // Niveau 1
  categoryL2: string;      // Niveau 2
  subCategoryL3: string;   // Niveau 3
  productL4: string;       // Niveau 4
  repaymentMode?: string;  // Mode de remboursement
}
