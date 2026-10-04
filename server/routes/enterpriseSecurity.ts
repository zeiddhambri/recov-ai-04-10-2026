import { Router } from 'express';
import { audit } from '../auth';
import { RelationalDatabaseManager } from '../db/relationalManager';
import { CryptoEngine } from '../lib/cryptoEngine';
import {
  BANK_ENTITIES,
  REGIONAL_DELEGATIONS,
  BANK_BRANCHES,
  SAMPLE_ENTERPRISE_USERS,
  SecurityPolicyEngine,
  EnterpriseUserContext
} from '../lib/securityPolicy';
import { db } from '../db/dataStore';

const router = Router();

// ==========================================
// 1. SGBD RELATIONNEL BANCAIRE (POSTGRESQL / ORACLE)
// ==========================================

router.get('/database/status', (req, res) => {
  const metrics = RelationalDatabaseManager.getMetrics();
  res.json(metrics);
});

router.get('/database/schema-ddl', (req, res) => {
  const ddl = RelationalDatabaseManager.getSchemaDDL();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="recovai_banking_schema.sql"');
  res.send(ddl);
});

router.post('/database/test-query', async (req, res) => {
  const { sql, isolationLevel = 'READ COMMITTED' } = req.body;
  const result = await RelationalDatabaseManager.query(sql || 'SELECT count(*) FROM dossiers_recouvrement');
  res.json({
    success: true,
    engine: 'PostgreSQL 15.4 Enterprise / Oracle 19c Compatible',
    ...result,
    sql: sql || 'SELECT count(*) FROM dossiers_recouvrement',
    isolationLevel
  });
});

// ==========================================
// 2. SÉGRÉGATION RÉGIONALE, MULTI-ENTITÉS & SECRET BANCAIRE
// ==========================================

router.get('/rbac/hierarchy', (req, res) => {
  res.json({
    entities: BANK_ENTITIES,
    delegations: REGIONAL_DELEGATIONS,
    branches: BANK_BRANCHES,
    users: SAMPLE_ENTERPRISE_USERS
  });
});

// Live ABAC & Banking Secret evaluation
router.post('/rbac/evaluate-access', (req, res) => {
  const { userId, dossierId } = req.body;

  const user = SAMPLE_ENTERPRISE_USERS.find(u => u.id === userId) || SAMPLE_ENTERPRISE_USERS[0];
  const dossiers = db.getDossiers();
  const rawDossier = dossiers.find(d => d.id === dossierId) || dossiers[0] || {
    id: '1',
    debtor_name: 'SOCIETE ALPHA SARL',
    debtor_cin: '08482914',
    debtor_rib: '08001000123456789042',
    amount: 145000,
    entityId: 'ent-amen-bank',
    delegationId: 'del-tunis-nord',
    branchId: 'br-belvedere'
  };

  const evaluation = SecurityPolicyEngine.evaluateAccess(user, rawDossier);

  res.json({
    evaluatedAt: new Date().toISOString(),
    userContext: {
      id: user.id,
      username: user.username,
      role: user.role,
      entityId: user.entityId,
      delegationId: user.delegationId || 'GLOBAL (Toutes régions)',
      branchId: user.branchId || 'TOUTES AGENCES',
      secretBancaireClearance: user.privileges.canReadSecretBancaire ? 'HABILITATION NIVEAU 2 (DÉMASQUÉ)' : 'RESTREINT (MASQUAGE AUTOMATIQUE)'
    },
    dossierMetadata: {
      id: rawDossier.id,
      clientCode: rawDossier.client_code || 'RCV-001',
      assignedEntity: rawDossier.entityId || 'ent-amen-bank',
      assignedDelegation: rawDossier.delegationId || 'del-tunis-nord',
      assignedBranch: rawDossier.branchId || 'br-belvedere'
    },
    accessResult: evaluation
  });
});

// Update user privileges
router.post('/rbac/update-user', (req, res) => {
  const { userId, canReadSecretBancaire, delegationId, branchId } = req.body;
  const user = SAMPLE_ENTERPRISE_USERS.find(u => u.id === userId);
  if (user) {
    if (typeof canReadSecretBancaire === 'boolean') {
      user.privileges.canReadSecretBancaire = canReadSecretBancaire;
    }
    if (delegationId !== undefined) user.delegationId = delegationId;
    if (branchId !== undefined) user.branchId = branchId;
  }

  res.json({
    success: true,
    updatedUser: user
  });
});

// ==========================================
// 3. CHIFFREMENT AU REPOS AES-256-GCM & KMS / HSM
// ==========================================

router.get('/crypto/kms-status', (req, res) => {
  const keys = CryptoEngine.getKeyRegistry();
  res.json({
    hsmProvider: 'PKCS#11 Thales Luna HSM / Google Cloud KMS',
    fipsCertification: 'FIPS 140-2 Level 3 Validated',
    activeCipher: 'AES-256-GCM (Galois/Counter Mode)',
    keyDerivation: 'PBKDF2 / HKDF SHA-256',
    ivLengthBits: 96,
    authTagLengthBits: 128,
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.status === 'ACTIVE').length,
    keys
  });
});

// Live field encryption test
router.post('/crypto/encrypt-test', (req, res) => {
  const { plainText, fieldType = 'RIB' } = req.body;
  const textToEncrypt = plainText || (fieldType === 'RIB' ? '08001000123456789042' : '08482914');

  try {
    const encrypted = CryptoEngine.encrypt(textToEncrypt);
    const decrypted = CryptoEngine.decrypt(encrypted);

    res.json({
      success: true,
      originalText: textToEncrypt,
      fieldType,
      encryptionMetadata: {
        algorithm: encrypted.algorithm,
        keyId: encrypted.keyId,
        ivHex: encrypted.iv,
        authTagHex: encrypted.authTag,
        cipherTextHex: encrypted.cipherText,
        encryptedAt: encrypted.encryptedAt
      },
      verifiedDecryption: decrypted,
      integrityCheckPassed: decrypted === textToEncrypt
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger key rotation
router.post('/crypto/rotate-dek', (req, res) => {
  const newKeyId = `DEK-${new Date().getFullYear()}-Q${Math.floor((new Date().getMonth() + 3) / 3)}-ROTATED-${Math.floor(Math.random() * 900 + 100)}`;
  const rotatedEntry = CryptoEngine.rotateActiveDEK(newKeyId);

  // Add audit log
  const auditEntry = {
    id: `AUDIT-KMS-${Date.now()}`,
    user_id: 'SECURITY_OFFICER_RSSI',
    action: 'KMS_DEK_ROTATION',
    details: `Rotation de la clé de chiffrement DEK effectuée avec succès vers ${newKeyId}. Validité 180 jours.`,
    created_at: new Date().toISOString()
  };
  // Journal d'audit du serveur (auteur authentifié + chaînage) — l'appel
  // db.addAuditLog() de la branche main visait une méthode inexistante.
  audit(auditEntry.action, auditEntry.details, req.auth);

  res.json({
    success: true,
    message: `Rotation cryptographique réussie. Nouvelle clé active : ${newKeyId}`,
    newKey: rotatedEntry
  });
});

export default router;
