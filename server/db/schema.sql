-- =========================================================================
-- RECOVAI BANKING ENGINE - DDL PRODUCTION SCHEMA (POSTGRESQL 15+ / ORACLE 19c)
-- Norme de Sécurité : ISO 27001 / FIPS 140-2 Level 3 / Circulaire BCT 91-24
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Référentiel des Entités Bancaires (Multi-Tenant / Muraille de Chine)
CREATE TABLE IF NOT EXISTS bank_entities (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('BANQUE_UNIVERSELLE', 'SOCIETE_LEASING', 'INSTITUTION_MICROFINANCE', 'RECOUVREMENT_TIERS')),
    license_number VARCHAR(100) NOT NULL,
    country VARCHAR(50) DEFAULT 'Tunisie',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'AUDIT_MODE', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Délégations Régionales (Ségrégation Territoriale N1)
CREATE TABLE IF NOT EXISTS regional_delegations (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    entity_id VARCHAR(64) NOT NULL REFERENCES bank_entities(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    headquarters VARCHAR(255) NOT NULL,
    governorates TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_delegation_code_entity UNIQUE (code, entity_id)
);

-- 3. Agences Bancaires Locales (Ségrégation Territoriale N2)
CREATE TABLE IF NOT EXISTS bank_branches (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    delegation_id VARCHAR(64) NOT NULL REFERENCES regional_delegations(id) ON DELETE RESTRICT,
    entity_id VARCHAR(64) NOT NULL REFERENCES bank_entities(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    manager_name VARCHAR(150),
    vault_encryption_enclave VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_branch_code_entity UNIQUE (code, entity_id)
);

-- 4. Utilisateurs & Habilitations Fin-Grained (RBAC / ABAC)
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    entity_id VARCHAR(64) NOT NULL REFERENCES bank_entities(id) ON DELETE RESTRICT,
    delegation_id VARCHAR(64) REFERENCES regional_delegations(id) ON DELETE SET NULL,
    branch_id VARCHAR(64) REFERENCES bank_branches(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'ADMIN_NATIONAL', 'AUDITEUR_CONFORMITE', 'DIRECTEUR_REGIONAL',
        'CHEF_AGENCE', 'CHARGE_RECOUVREMENT', 'AVOCAT_EXTERNE', 'HUISSIER_EXTERNE'
    )),
    can_read_secret_bancaire BOOLEAN DEFAULT FALSE,
    can_access_cross_entity BOOLEAN DEFAULT FALSE,
    can_access_cross_region BOOLEAN DEFAULT FALSE,
    can_initiate_legal_action BOOLEAN DEFAULT FALSE,
    can_export_regulatory_bct BOOLEAN DEFAULT FALSE,
    mfa_enforced BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'REVOKED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Registre des Clés Cryptographiques KMS / HSM (Data at Rest)
CREATE TABLE IF NOT EXISTS kms_key_registry (
    key_id VARCHAR(64) PRIMARY KEY,
    version INT NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_type VARCHAR(10) NOT NULL CHECK (key_type IN ('KEK', 'DEK')),
    hsm_provider VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'ROTATING', 'RETIRED')),
    fingerprint VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,
    next_scheduled_rotation TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. Dossiers de Recouvrement (avec Champs Chiffrés AES-256-GCM au Repos)
CREATE TABLE IF NOT EXISTS dossiers_recouvrement (
    id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL REFERENCES bank_entities(id) ON DELETE RESTRICT,
    delegation_id VARCHAR(64) NOT NULL REFERENCES regional_delegations(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) NOT NULL REFERENCES bank_branches(id) ON DELETE RESTRICT,
    client_code VARCHAR(50) NOT NULL,
    debtor_name VARCHAR(255) NOT NULL,
    
    -- Colonnes Chiffrées de Bout-en-Bout (AES-256-GCM / Hardware Security Module)
    debtor_cin_encrypted TEXT NOT NULL,
    debtor_rib_encrypted TEXT NOT NULL,
    encryption_key_id VARCHAR(64) NOT NULL REFERENCES kms_key_registry(key_id),
    encryption_iv VARCHAR(32) NOT NULL,
    encryption_auth_tag VARCHAR(32) NOT NULL,
    
    -- Données Financières & Encours
    original_amount NUMERIC(18, 3) NOT NULL CHECK (original_amount >= 0),
    recovered_amount NUMERIC(18, 3) DEFAULT 0 CHECK (recovered_amount >= 0),
    unpaid_amount NUMERIC(18, 3) GENERATED ALWAYS AS (original_amount - recovered_amount) STORED,
    delay_days INT DEFAULT 0 CHECK (delay_days >= 0),
    
    -- Classification IFRS 9 & BCT 91-24
    portfolio_l1 VARCHAR(100) NOT NULL,
    category_l2 VARCHAR(100) NOT NULL,
    product_l4 VARCHAR(150) NOT NULL,
    bct_classification VARCHAR(50) NOT NULL CHECK (bct_classification IN (
        'Classe 0 (Actif Sain)', 'Classe 1 (Actifs à surveiller)',
        'Classe 2 (Actifs Incertains)', 'Classe 3 (Actifs Préoccupants)',
        'Classe 4 (Actifs Compromis)'
    )),
    ifrs9_stage VARCHAR(10) NOT NULL CHECK (ifrs9_stage IN ('Stage 1', 'Stage 2', 'Stage 3')),
    ecl_provision_amount NUMERIC(18, 3) DEFAULT 0,
    
    -- Statut du cycle de vie
    status VARCHAR(50) NOT NULL DEFAULT 'AMIABLE' CHECK (status IN (
        'AMIABLE', 'PRE_CONTENTIEUX', 'CONTENTIEUX_JUDICIAIRE', 'EXECUTION_FORCEE', 'CLOS_APURE'
    )),
    assigned_user_id VARCHAR(64) REFERENCES app_users(id),
    
    -- Intégrité & Audit Hash
    record_sha256_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index composites pour performances bancaires optimales (< 5ms)
CREATE INDEX idx_dossiers_entity_branch_status ON dossiers_recouvrement(entity_id, branch_id, status);
CREATE INDEX idx_dossiers_bct_stage ON dossiers_recouvrement(bct_classification, ifrs9_stage);
CREATE INDEX idx_dossiers_delay_unpaid ON dossiers_recouvrement(delay_days DESC, unpaid_amount DESC);

-- 7. Piste d'Audit Immuable (Journalisation Cryptographique WORM - Write Once Read Many)
CREATE TABLE IF NOT EXISTS audit_trail_immutable (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_ip_address VARCHAR(45) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action_code VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    previous_state_encrypted TEXT,
    new_state_encrypted TEXT,
    prev_record_hash VARCHAR(64) NOT NULL, -- Chaînage cryptographique type Blockchain
    entry_hash VARCHAR(64) NOT NULL        -- SHA-256 (timestamp + user + action + payload + prev_hash)
);

CREATE INDEX idx_audit_timestamp ON audit_trail_immutable(timestamp DESC);
CREATE INDEX idx_audit_entity_user ON audit_trail_immutable(entity_id, user_id);
