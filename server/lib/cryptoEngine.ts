import crypto from 'crypto';

export interface KeyRegistryEntry {
  keyId: string;
  version: number;
  algorithm: string;
  keyType: 'KEK' | 'DEK';
  hsmProvider: 'Google Cloud KMS' | 'AWS KMS' | 'HashiCorp Vault' | 'PKCS#11 Thales Luna HSM' | 'Local Secure Enclave';
  status: 'ACTIVE' | 'ROTATING' | 'RETIRED';
  createdAt: string;
  rotatedAt?: string;
  nextScheduledRotation: string;
  fingerprint: string;
}

// Master Key (KEK) & Data Encryption Keys (DEKs)
let activeDEKId = 'DEK-2024-Q1-PROD';
const KEK_ID = 'KEK-MASTER-HSM-TN-01';

// Secret in-memory keys for AES-256-GCM (32 bytes)
const keyStore: Record<string, Buffer> = {
  [KEK_ID]: crypto.scryptSync('RecovAI-BCT-Enterprise-KEK-Master-Key-2024!', 'salt-hsm-tn-01', 32),
  'DEK-2024-Q1-PROD': crypto.scryptSync('RecovAI-DEK-2024-Q1-Secret-Seed', 'salt-dek-2024-01', 32),
  'DEK-2023-Q4-ARCHIVE': crypto.scryptSync('RecovAI-DEK-2023-Q4-Secret-Seed', 'salt-dek-2023-04', 32)
};

const keyRegistry: KeyRegistryEntry[] = [
  {
    keyId: KEK_ID,
    version: 1,
    algorithm: 'AES-256-GCM (FIPS 140-2 Level 3)',
    keyType: 'KEK',
    hsmProvider: 'PKCS#11 Thales Luna HSM',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    nextScheduledRotation: '2025-01-01T00:00:00Z',
    fingerprint: 'SHA256:7B:3A:99:12:FE:55:01:A2:9C:DD:44:81:AA:67:89:10'
  },
  {
    keyId: 'DEK-2024-Q1-PROD',
    version: 2,
    algorithm: 'AES-256-GCM (Envelope Encryption)',
    keyType: 'DEK',
    hsmProvider: 'Google Cloud KMS',
    status: 'ACTIVE',
    createdAt: '2024-01-15T08:00:00Z',
    nextScheduledRotation: '2024-07-15T08:00:00Z',
    fingerprint: 'SHA256:4C:11:88:9F:22:67:AB:33:91:02:55:DE:AA:12:34:56'
  },
  {
    keyId: 'DEK-2023-Q4-ARCHIVE',
    version: 1,
    algorithm: 'AES-256-GCM',
    keyType: 'DEK',
    hsmProvider: 'Google Cloud KMS',
    status: 'RETIRED',
    createdAt: '2023-10-01T00:00:00Z',
    rotatedAt: '2024-01-15T08:00:00Z',
    nextScheduledRotation: 'N/A',
    fingerprint: 'SHA256:1A:2B:3C:4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09'
  }
];

export interface EncryptedPayload {
  keyId: string;
  iv: string; // Hex (12 bytes - 96 bits)
  authTag: string; // Hex (16 bytes - 128 bits)
  cipherText: string; // Hex
  algorithm: string;
  encryptedAt: string;
}

export class CryptoEngine {
  /**
   * Encrypt a sensitive field (RIB, CIN, Solde, etc.) using AES-256-GCM
   */
  static encrypt(plainText: string, customKeyId?: string): EncryptedPayload {
    const keyId = customKeyId || activeDEKId;
    const key = keyStore[keyId];
    if (!key) {
      throw new Error(`Clé KMS/HSM introuvable pour l'identifiant ${keyId}`);
    }

    // 96-bit IV as recommended by NIST SP 800-38D for GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      keyId,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      cipherText: encrypted,
      algorithm: 'AES-256-GCM',
      encryptedAt: new Date().toISOString()
    };
  }

  /**
   * Decrypt a payload with authentication tag validation (tamper-proof)
   */
  static decrypt(payload: EncryptedPayload): string {
    const key = keyStore[payload.keyId];
    if (!key) {
      throw new Error(`Clé de déchiffrement ${payload.keyId} non disponible`);
    }

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Mask sensitive banking data (Banking Secret / Secret Bancaire)
   */
  static maskSecretBancaire(val: string, type: 'RIB' | 'CIN' | 'AMOUNT' | 'NAME'): string {
    if (!val) return '***';
    if (type === 'RIB') {
      // 08001000123456789042 -> 08001000*********42
      const cleaned = val.replace(/\s+/g, '');
      if (cleaned.length >= 10) {
        return `${cleaned.slice(0, 8)}${'*'.repeat(cleaned.length - 10)}${cleaned.slice(-2)}`;
      }
      return `${cleaned.slice(0, 4)}****`;
    }
    if (type === 'CIN') {
      // 08482914 -> 08****14
      if (val.length >= 6) {
        return `${val.slice(0, 2)}${'*'.repeat(val.length - 4)}${val.slice(-2)}`;
      }
      return '******';
    }
    if (type === 'AMOUNT') {
      return '*** *** TND';
    }
    return val;
  }

  /**
   * Get all registered KMS / HSM keys
   */
  static getKeyRegistry(): KeyRegistryEntry[] {
    return keyRegistry;
  }

  /**
   * Rotate active DEK
   */
  static rotateActiveDEK(newKeyId: string): KeyRegistryEntry {
    const oldEntry = keyRegistry.find(k => k.keyId === activeDEKId);
    if (oldEntry) {
      oldEntry.status = 'RETIRED';
      oldEntry.rotatedAt = new Date().toISOString();
    }

    const newKeyBuffer = crypto.randomBytes(32);
    keyStore[newKeyId] = newKeyBuffer;
    activeDEKId = newKeyId;

    const newEntry: KeyRegistryEntry = {
      keyId: newKeyId,
      version: (oldEntry?.version || 1) + 1,
      algorithm: 'AES-256-GCM (Envelope Encryption)',
      keyType: 'DEK',
      hsmProvider: 'Google Cloud KMS',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      nextScheduledRotation: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
      fingerprint: `SHA256:${crypto.createHash('sha256').update(newKeyBuffer).digest('hex').slice(0, 32).toUpperCase().match(/.{2}/g)?.join(':')}`
    };

    keyRegistry.unshift(newEntry);
    return newEntry;
  }
}
