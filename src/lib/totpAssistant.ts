// RecovAI — Assistant TOTP côté client (P1.7)
// - Génère des codes TOTP à partir d'un secret Base32 (pour démo / tests)
// - Compatible avec le backend server/lib/totp.ts
// - Utilisé par la page /totp-assistant et par les tests manuels multi-tenant + MFA

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str: string): Uint8Array {
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
  return new Uint8Array(bytes);
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(sig);
}

function counterToBytes(counter: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // BigInt to high/low
  const high = Number((counter >> 32n) & 0xffffffffn);
  const low = Number(counter & 0xffffffffn);
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buf);
}

export async function generateTotpClient(secretBase32: string, stepSeconds = 30, digits = 6, atMs = Date.now()): Promise<string> {
  const key = base32Decode(secretBase32);
  const counter = BigInt(Math.floor(atMs / 1000 / stepSeconds));
  const counterBytes = counterToBytes(counter);
  const hmac = await hmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = code % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

export function remainingSecondsClient(stepSeconds = 30, atMs = Date.now()): number {
  const now = Math.floor(atMs / 1000);
  return stepSeconds - (now % stepSeconds);
}

export function buildOtpauthUriClient(secret: string, accountName: string, issuer = 'RecovAI'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret: secret.replace(/=+$/g, ''),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Assistant de démo : génère un secret aléatoire côté client (pour tests)
export function generateRandomSecretClient(lengthBytes = 20): string {
  const bytes = new Uint8Array(lengthBytes);
  crypto.getRandomValues(bytes);
  // base32 encode simple
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
