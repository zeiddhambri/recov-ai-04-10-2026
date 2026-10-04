// RecovAI — Durcissement HTTP (lot P0) : CORS par allowlist, en-têtes de sécurité.
import { Request, Response, NextFunction } from 'express';

function allowedOrigins(): string[] {
  const base = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (process.env.APP_URL) {
    base.push(process.env.APP_URL);
  }
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => Boolean(s) && s !== '0000' && (s.startsWith('http://') || s.startsWith('https://')));
  return [...base, ...extra];
}

// CORS par allowlist : remplace le wildcard `*` qui exposait l'API à toute origine.
export function corsAllowlist() {
  const allowed = new Set(allowedOrigins());
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    // Requêtes sans en-tête Origin (curl, serveurs à serveur, healthchecks) : autorisées,
    // le jeton Bearer reste obligatoire sur les routes protégées.
    if (origin && (allowed.has(origin) || origin.endsWith('.run.app') || origin.endsWith('.google.com') || origin.includes('localhost'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, prefer, apikey');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

// Équivalent minimal des en-têtes `helmet` pour le périmètre API (JSON/txt).
// Note : X-Frame-Options DENY / frame-ancestors none désactivés pour permettre l'affichage dans l'iframe AI Studio.
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    if (req.path.startsWith('/api') || req.path.startsWith('/rest')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}
