export type InstitutionCategory = 
  | 'banque_residente'
  | 'banque_offshore'
  | 'microfinance'
  | 'leasing_factoring';

export interface Institution {
  id: string;
  code: string;
  name: string;
  fullName: string;
  category: InstitutionCategory;
  legalForm: string;
  regulatoryBody: 'Banque Centrale de Tunisie (BCT)' | 'Autorité de Contrôle de la Microfinance (ACM)';
  headquarters: string;
  status: 'active' | 'in_restructuring';
  swiftCode?: string;
  branchesCount: number;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  specialty?: string;
}

export interface InstitutionFilter {
  category?: string;
  search?: string;
}
