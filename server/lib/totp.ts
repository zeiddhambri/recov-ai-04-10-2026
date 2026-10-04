// RecovAI — MFA TOTP (P1.7)
// Implémentation RFC 6238 / RFC 4226 sans dépendance externe lourde.
// Base32, HMAC-SHA1, fenêtre de tolérance, génération otpauth:// URI.
// Utilisé par le backend (vérification) et par l'assistant TOTP de démo.

import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  // padding optionnel pour compatibilité
  while (out.length % 8 !== 0) out += '=';
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export interface TotpOptions {
  stepSeconds?: number; // 30s par défaut
  digits?: number; // 6 par défaut
  window?: number; // tolérance en pas de temps (0 = strict, 1 = ±1)
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

const DEFAULT_OPTS: Required<TotpOptions> = {
  stepSeconds: 30,
  digits: 6,
  window: 1,
  algorithm: 'sha1',
};

export function generateSecret(lengthBytes = 20): string {
  const buf = crypto.randomBytes(lengthBytes);
  return base32Encode(buf).replace(/=+$/g, ''); // sans padding pour otpauth
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8 chars alphanum majuscules
    const raw = crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 8);
    codes.push(raw);
  }
  return codes;
}

function hotp(secret: Buffer, counter: bigint, digits: number, algo: string): string {
  const counterBuf = Buffer.alloc(8);
  // BigInt to 8-byte BE
  counterBuf.writeBigUInt64BE(counter, 0);
  const hmac = crypto.createHmac(algo, secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = code % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

export function generateTotp(secretBase32: string, opts: TotpOptions = {}, atMs: number = Date.now()): string {
  const o = { ...DEFAULT_OPTS, ...opts };
  const secret = base32Decode(secretBase32);
  const counter = BigInt(Math.floor(atMs / 1000 / o.stepSeconds));
  return hotp(secret, counter, o.digits, o.algorithm);
}

export function verifyTotp(token: string, secretBase32: string, opts: TotpOptions = {}, atMs: number = Date.now()): { valid: boolean; delta?: number } {
  const o = { ...DEFAULT_OPTS, ...opts };
  const cleanToken = token.replace(/\s+/g, '');
  if (!/^\d+$/.test(cleanToken) || cleanToken.length !== o.digits) return { valid: false };
  const secret = base32Decode(secretBase32);
  const baseCounter = BigInt(Math.floor(atMs / 1000 / o.stepSeconds));
  for (let w = -o.window; w <= o.window; w++) {
    const c = baseCounter + BigInt(w);
    if (c < 0) continue;
    const candidate = hotp(secret, c, o.digits, o.algorithm);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(cleanToken))) {
      return { valid: true, delta: w };
    }
  }
  return { valid: false };
}

export function buildOtpauthUri(secretBase32: string, accountName: string, issuer = 'RecovAI'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret: secretBase32.replace(/=+$/g, ''),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function remainingSeconds(stepSeconds = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return stepSeconds - (now % stepSeconds);
}

// Utilitaire pour QR code : on ne génère pas l'image côté serveur (pas de dep lourde),
// on fournit l'URI otpauth que le front affiche en QR via qrcode.react ou API externe.
// Pour la démo offline, on peut fournir un data URL via une lib optionnelle.
