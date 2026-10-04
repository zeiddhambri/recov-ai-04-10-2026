#!/usr/bin/env node
// RecovAI — Assistant TOTP CLI (P1.7)
// Usage : node scripts/totp-assistant.mjs --secret JBSWY3DPEHPK3PXP --account agent@recovai.tn
// Génère un code TOTP compatible RFC 6238 sans dépendance externe (Node crypto)

import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str) {
  const clean = str.replace(/=+$/g, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
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

function generateTotp(secretBase32, step = 30, digits = 6, atMs = Date.now()) {
  const secret = base32Decode(secretBase32);
  const counter = BigInt(Math.floor(atMs / 1000 / step));
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter, 0);
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = code % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

function remaining(step = 30) {
  const now = Math.floor(Date.now() / 1000);
  return step - (now % step);
}

function buildUri(secret, account, issuer = 'RecovAI') {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret: secret.replace(/=+$/g, ''),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function randomSecret(len = 20) {
  return crypto.randomBytes(len).toString('base64').replace(/[^A-Z2-7]/gi, '').slice(0, 32).toUpperCase() || 'JBSWY3DPEHPK3PXP';
}

// CLI
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2);
    const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    opts[k] = v;
    if (v !== true) i++;
  }
}

if (opts.help || opts.h) {
  console.log(`
RecovAI TOTP Assistant CLI (P1.7)

Usage:
  node scripts/totp-assistant.mjs --secret <BASE32> --account <email>
  node scripts/totp-assistant.mjs --random
  node scripts/totp-assistant.mjs --secret JBSWY3DPEHPK3PXP --watch

Options:
  --secret <base32>   Secret Base32 (ex: JBSWY3DPEHPK3PXP)
  --account <email>   Label du compte (défaut: agent@recovai.tn)
  --issuer <name>     Issuer otpauth (défaut: RecovAI)
  --random            Génère un secret aléatoire
  --watch             Rafraîchit toutes les secondes avec compte à rebours
  --uri               Affiche seulement l'URI otpauth
  --qr                Affiche l'URL QR (api.qrserver.com)
`);
  process.exit(0);
}

let secret = opts.secret || 'JBSWY3DPEHPK3PXP';
if (opts.random) {
  secret = randomSecret();
  console.log(`[random] Nouveau secret: ${secret}`);
}
const account = opts.account || 'agent@recovai.tn';
const issuer = opts.issuer || 'RecovAI';

if (opts.uri) {
  console.log(buildUri(secret, account, issuer));
  process.exit(0);
}

if (opts.qr) {
  const uri = buildUri(secret, account, issuer);
  console.log(`URI: ${uri}`);
  console.log(`QR: https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`);
  process.exit(0);
}

function printOnce() {
  const code = generateTotp(secret);
  const rem = remaining();
  const uri = buildUri(secret, account, issuer);
  console.log(`Secret: ${secret} | Account: ${account} | Code: ${code} | Expire dans ${rem}s`);
  console.log(`otpauth URI: ${uri}`);
  console.log(`QR URL: https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`);
}

if (opts.watch) {
  console.log('Mode watch — Ctrl+C pour quitter');
  setInterval(() => {
    const code = generateTotp(secret);
    const rem = remaining();
    process.stdout.write(`\rCode: ${code} | ${rem}s restants | Secret: ${secret.slice(0, 8)}...   `);
  }, 1000);
  printOnce();
} else {
  printOnce();
}
