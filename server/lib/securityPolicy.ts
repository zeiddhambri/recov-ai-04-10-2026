import { CryptoEngine } from './cryptoEngine';

export interface BankEntity {
  id: string;
  code: string;
  name: string;
  type: 'BANQUE_UNIVERSELLE' | 'SOCIETE_LEASING' | 'INSTITUTION_MICROFINANCE' | 'RECOUVREMENT_TIERS';
  licenseNumber: string;
  country: string;
  status: 'ACTIVE' | 'AUDIT_MODE';
}

export interface RegionalDelegation {
  id: string;
  code: string;
  entityId: string;
  name: string;
  headquarters: string;
  branchesCount: number;
  governorates: string[];
}

export interface BankBranch {
  id: string;
  code: string;
  delegationId: string;
  entityId: string;
  name: string;
  address: string;
  city: string;
  managerName: string;
  vaultEncryptionEnclave: string;
}

export interface EnterpriseUserContext {
  id: string;
  username: string;
  email: string;
  entityId: string;
  delegationId?: string; // e.g. "del-sahel"
  branchId?: string;     // e.g. "br-sousse"
  role: 'ADMIN_NATIONAL' | 'AUDITEUR_CONFORMITE' | 'DIRECTEUR_REGIONAL' | 'CHEF_AGENCE' | 'CHARGE_RECOUVREMENT' | 'AVOCAT_EXTERNE';
  privileges: {
    canReadSecretBancaire: boolean;
    canAccessCrossEntity: boolean;
    canAccessCrossRegion: boolean;
    canInitiateLegalAction: boolean;
    canExportRegulatoryBCT: boolean;
  };
}

export const BANK_ENTITIES: BankEntity[] = [
  {
    id: 'ent-amen-bank',
    code: '08',
    name: 'Amen Bank (Maison Mère)',
    type: 'BANQUE_UNIVERSELLE',
    licenseNumber: 'BCT-AGR-1971-08',
    country: 'Tunisie',
    status: 'ACTIVE'
  },
  {
    id: 'ent-amen-lease',
    code: 'LEAS-08',
    name: 'Tunisie Leasing & Factoring (Filiale)',
    type: 'SOCIETE_LEASING',
    licenseNumber: 'BCT-LEAS-1994-02',
    country: 'Tunisie',
    status: 'ACTIVE'
  },
  {
    id: 'ent-imf-enda',
    code: 'IMF-01',
    name: 'Enda Tamweel Microfinance (Partenaire Agréé)',
    type: 'INSTITUTION_MICROFINANCE',
    licenseNumber: 'ACM-AGR-2015-01',
    country: 'Tunisie',
    status: 'ACTIVE'
  }
];

export const REGIONAL_DELEGATIONS: RegionalDelegation[] = [
  {
    id: 'del-tunis-nord',
    code: 'DR-01',
    entityId: 'ent-amen-bank',
    name: 'Délégation Régionale Grand Tunis & Nord',
    headquarters: 'Avenue Habib Bourguiba, Tunis',
    branchesCount: 18,
    governorates: ['Tunis', 'Ariana', 'Ben Arous', 'Manouba']
  },
  {
    id: 'del-sahel',
    code: 'DR-02',
    entityId: 'ent-amen-bank',
    name: 'Délégation Régionale Sahel & Centre',
    headquarters: 'Boulevard 14 Janvier, Sousse',
    branchesCount: 14,
    governorates: ['Sousse', 'Monastir', 'Mahdia', 'Kairouan']
  },
  {
    id: 'del-sud-sfax',
    code: 'DR-03',
    entityId: 'ent-amen-bank',
    name: 'Délégation Régionale Sud & Sfax',
    headquarters: 'Route de Téniour, Sfax',
    branchesCount: 16,
    governorates: ['Sfax', 'Gabès', 'Médenine', 'Tataouine', 'Gafsa']
  },
  {
    id: 'del-nord-ouest',
    code: 'DR-04',
    entityId: 'ent-amen-bank',
    name: 'Délégation Régionale Nord-Ouest',
    headquarters: 'Avenue Habib Thameur, Bizerte',
    branchesCount: 8,
    governorates: ['Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana']
  }
];

export const BANK_BRANCHES: BankBranch[] = [
  {
    id: 'br-belvedere',
    code: '001',
    delegationId: 'del-tunis-nord',
    entityId: 'ent-amen-bank',
    name: 'Agence Tunis Belvédère',
    address: 'Rue de la Monnaie, 1002 Tunis',
    city: 'Tunis',
    managerName: 'Kamel Riahi',
    vaultEncryptionEnclave: 'HSM-TN-TUN-01'
  },
  {
    id: 'br-lac2',
    code: '014',
    delegationId: 'del-tunis-nord',
    entityId: 'ent-amen-bank',
    name: 'Agence Corporate Les Berges du Lac 2',
    address: 'Rue de la Bourse, Lac 2',
    city: 'Tunis',
    managerName: 'Sonia Trabelsi',
    vaultEncryptionEnclave: 'HSM-TN-TUN-02'
  },
  {
    id: 'br-sousse-corniche',
    code: '042',
    delegationId: 'del-sahel',
    entityId: 'ent-amen-bank',
    name: 'Agence Sousse Corniche',
    address: 'Boulevard Habib Bourguiba, 4000 Sousse',
    city: 'Sousse',
    managerName: 'Mohamed Salah',
    vaultEncryptionEnclave: 'HSM-TN-SOUSSE-01'
  },
  {
    id: 'br-sfax-ville',
    code: '081',
    delegationId: 'del-sud-sfax',
    entityId: 'ent-amen-bank',
    name: 'Agence Sfax Hédi Chaker',
    address: 'Avenue Hédi Chaker, 3000 Sfax',
    city: 'Sfax',
    managerName: 'Nabil Chaabane',
    vaultEncryptionEnclave: 'HSM-TN-SFAX-01'
  }
];

export const SAMPLE_ENTERPRISE_USERS: EnterpriseUserContext[] = [
  {
    id: 'usr-admin-si',
    username: 'admin.securite',
    email: 'admin.rssi@amenbank.com.tn',
    entityId: 'ent-amen-bank',
    role: 'ADMIN_NATIONAL',
    privileges: {
      canReadSecretBancaire: true,
      canAccessCrossEntity: true,
      canAccessCrossRegion: true,
      canInitiateLegalAction: true,
      canExportRegulatoryBCT: true
    }
  },
  {
    id: 'usr-auditeur-bct',
    username: 'auditeur.conformite',
    email: 'conformite@amenbank.com.tn',
    entityId: 'ent-amen-bank',
    role: 'AUDITEUR_CONFORMITE',
    privileges: {
      canReadSecretBancaire: true,
      canAccessCrossEntity: true,
      canAccessCrossRegion: true,
      canInitiateLegalAction: false,
      canExportRegulatoryBCT: true
    }
  },
  {
    id: 'usr-dir-sahel',
    username: 'dir.sahel',
    email: 'ridha.sahel@amenbank.com.tn',
    entityId: 'ent-amen-bank',
    delegationId: 'del-sahel',
    role: 'DIRECTEUR_REGIONAL',
    privileges: {
      canReadSecretBancaire: true,
      canAccessCrossEntity: false,
      canAccessCrossRegion: false,
      canInitiateLegalAction: true,
      canExportRegulatoryBCT: false
    }
  },
  {
    id: 'usr-charge-belvedere',
    username: 'charge.belvedere',
    email: 'samir.belv@amenbank.com.tn',
    entityId: 'ent-amen-bank',
    delegationId: 'del-tunis-nord',
    branchId: 'br-belvedere',
    role: 'CHARGE_RECOUVREMENT',
    privileges: {
      canReadSecretBancaire: false, // Secret bancaire masqué par défaut !
      canAccessCrossEntity: false,
      canAccessCrossRegion: false,
      canInitiateLegalAction: false,
      canExportRegulatoryBCT: false
    }
  }
];

export class SecurityPolicyEngine {
  /**
   * Evaluates access permissions to a debtor / dossier record based on user's territorial & entity scope
   */
  static evaluateAccess(user: EnterpriseUserContext, dossier: any): {
    allowed: boolean;
    reason?: string;
    sanitizedDossier?: any;
  } {
    // 1. Multi-Tenant / Multi-Entity Boundary Check (Muraille de Chine)
    const dossierEntity = dossier.entityId || 'ent-amen-bank';
    if (!user.privileges.canAccessCrossEntity && user.entityId !== dossierEntity) {
      return {
        allowed: false,
        reason: `Violation de la muraille de Chine multi-entités : L'utilisateur appartient à ${user.entityId} et ne peut accéder aux créances de ${dossierEntity}.`
      };
    }

    // 2. Regional / Branch Territorial Segregation Check
    if (!user.privileges.canAccessCrossRegion) {
      const dossierDelegation = dossier.delegationId || 'del-tunis-nord';
      const dossierBranch = dossier.branchId || 'br-belvedere';

      if (user.delegationId && user.delegationId !== dossierDelegation) {
        return {
          allowed: false,
          reason: `Ségrégation régionale stricte : Dossier affecté à la délégation ${dossierDelegation}, hors du périmètre autorisé (${user.delegationId}).`
        };
      }

      if (user.branchId && user.branchId !== dossierBranch) {
        return {
          allowed: false,
          reason: `Cloisonnement agence : Dossier géré par l'agence ${dossierBranch}, non accessible à l'agence ${user.branchId}.`
        };
      }
    }

    // 3. Banking Secret (Secret Bancaire) Policy Application
    const sanitized = { ...dossier };
    if (!user.privileges.canReadSecretBancaire) {
      sanitized.debtor_cin_masked = CryptoEngine.maskSecretBancaire(dossier.debtor_cin || '08482914', 'CIN');
      sanitized.debtor_rib_masked = CryptoEngine.maskSecretBancaire(dossier.debtor_rib || '08001000123456789042', 'RIB');
      sanitized.secretBancaireApplied = true;
      sanitized.dataNotice = "Données sensibles sous secret bancaire (Art. 109 Loi bancaire n° 2016-48). Démasquage restreint aux habilitations de niveau 2.";
    } else {
      sanitized.secretBancaireApplied = false;
      sanitized.debtor_cin_masked = dossier.debtor_cin || '08482914';
      sanitized.debtor_rib_masked = dossier.debtor_rib || '08001000123456789042';
    }

    return {
      allowed: true,
      sanitizedDossier: sanitized
    };
  }
}
