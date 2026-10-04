// RecovAI — Stockage MFA TOTP (P1.7)
// Persistance fichier JSON + chiffrement léger du secret (AES-GCM avec clé dérivée de APP_AUTH_SECRET)
// En production, le secret TOTP doit être chiffré au repos via KMS/HSM (lot P2)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSecret, generateBackupCodes } from './totp';

export interface MfaRecord {
  userId: string;
  email: string;
  secretEnc: string; // format: iv:authTag:cipherText (hex)
  enabled: boolean;
  createdAt: string;
  lastVerifiedAt: string | null;
  backupCodesHashed: string[]; // SHA-256 hash des codes
  backupCodesPlain?: string[]; // uniquement à la création, à afficher une fois
  recoveryEmail?: string;
}

const DATA_DIR = (process.env.RECOVAI_DATA_DIR && process.env.RECOVAI_DATA_DIR !== '0000') ? path.resolve(process.env.RECOVAI_DATA_DIR) : path.join(process.cwd(), 'data');
const MFA_FILE = path.join(DATA_DIR, 'mfa_store.json');

function getEncryptionKey(): Buffer {
  const secret = process.env.APP_AUTH_SECRET || 'dev-mfa-encryption-key-32-chars!!';
  // dérivation simple HKDF
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptSecret(encStr: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, dataHex] = encStr.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Format secret chiffré invalide');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

let store: Map<string, MfaRecord> = new Map();

function load() {
  try {
    if (fs.existsSync(MFA_FILE)) {
      const raw = fs.readFileSync(MFA_FILE, 'utf-8');
      const arr = JSON.parse(raw) as MfaRecord[];
      store = new Map(arr.map(r => [r.userId, r]));
    }
  } catch (e) {
    console.warn('[mfaStore] load failed', (e as Error).message);
    store = new Map();
  }
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const arr = Array.from(store.values()).map(r => {
      const { backupCodesPlain, ...rest } = r as any;
      return rest; // ne jamais persister les codes en clair
    });
    fs.writeFileSync(MFA_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[mfaStore] persist failed', (e as Error).message);
  }
}

load();

export function getMfaRecord(userId: string): MfaRecord | null {
  return store.get(userId) || null;
}

export function getMfaRecordByEmail(email: string): MfaRecord | null {
  const lower = email.toLowerCase();
  for (const rec of store.values()) if (rec.email.toLowerCase() === lower) return rec;
  return null;
}

export function createMfaSetup(userId: string, email: string): { secret: string; record: MfaRecord; backupCodes: string[] } {
  const secret = generateSecret(20);
  const backupCodes = generateBackupCodes(8);
  const backupHashed = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));
  const enc = encryptSecret(secret);
  const rec: MfaRecord = {
    userId,
    email,
    secretEnc: enc,
    enabled: false,
    createdAt: new Date().toISOString(),
    lastVerifiedAt: null,
    backupCodesHashed: backupHashed,
    backupCodesPlain: backupCodes,
  };
  store.set(userId, rec);
  persist();
  return { secret, record: rec, backupCodes };
}

export function enableMfa(userId: string): boolean {
  const rec = store.get(userId);
  if (!rec) return false;
  rec.enabled = true;
  rec.lastVerifiedAt = new Date().toISOString();
  // effacer les codes en clair après activation
  delete (rec as any).backupCodesPlain;
  store.set(userId, rec);
  persist();
  return true;
}

export function disableMfa(userId: string): boolean {
  if (!store.has(userId)) return false;
  store.delete(userId);
  persist();
  return true;
}

export function getDecryptedSecret(userId: string): string | null {
  const rec = store.get(userId);
  if (!rec) return null;
  try {
    return decryptSecret(rec.secretEnc);
  } catch {
    return null;
  }
}

export function verifyBackupCode(userId: string, code: string): boolean {
  const rec = store.get(userId);
  if (!rec) return false;
  const hash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  const idx = rec.backupCodesHashed.indexOf(hash);
  if (idx === -1) return false;
  // single-use : retirer le code utilisé
  rec.backupCodesHashed.splice(idx, 1);
  store.set(userId, rec);
  persist();
  return true;
}

export function isMfaEnabled(userId: string): boolean {
  const rec = store.get(userId);
  return Boolean(rec && rec.enabled);
}

export function listMfa(): MfaRecord[] {
  return Array.from(store.values()).map(r => ({ ...r, backupCodesPlain: undefined } as any));
}
