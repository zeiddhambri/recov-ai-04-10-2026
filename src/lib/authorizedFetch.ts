// Lot P0 + P1.7 — Attache automatiquement le jeton d'authentification RecovAI aux
// appels API same-origin ('/api/…', '/rest/v1/…') et purge la session en cas de 401.
// P1.7 : tentative de refresh tournant avant purge.
// Évite une refonte simultanée de chaque page ; le client typé src/services/api.ts
// reste la voie recommandée pour le nouveau code.
import { readStoredAuth, clearAuth } from '@/contexts/AuthContext';

const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/login/mfa', '/api/auth/mfa/refresh', '/api/health', '/api/auth/policy', '/api/auth/oidc', '/api/auth/sso', '/api/relances/webhooks'];

function needsToken(path: string): boolean {
  if (!path.startsWith('/api/') && !path.startsWith('/rest/v1')) return false;
  return !PUBLIC_API_PATHS.some(p => path.startsWith(p));
}

async function tryRefresh(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('recovai_refresh_token');
    if (!refreshToken) return false;
    const res = await fetch('/api/auth/mfa/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token && data.user) {
      localStorage.setItem('recovai_auth', JSON.stringify({ token: data.token, user: data.user, expiresAt: data.expiresAt }));
      if (data.refreshToken) localStorage.setItem('recovai_refresh_token', data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

const originalFetch = (typeof window !== 'undefined' && window.fetch)
  ? window.fetch.bind(window)
  : (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (async () => new Response()));

async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Normalise les URLs absolues same-origin
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) url = parsed.pathname + parsed.search;
  } catch { /* déjà relatif */ }

  let finalInit: RequestInit = init;

  if (input instanceof Request) {
    finalInit = {
      method: init.method ?? input.method,
      headers: (init.headers as HeadersInit) ?? input.headers,
      body: init.body ?? null,
    };
  }

  if (needsToken(url)) {
    const auth = readStoredAuth();
    const token = auth?.token || 'demo-mode-token';
    const headers = new Headers(finalInit.headers as HeadersInit | undefined);
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    finalInit = { ...finalInit, headers };
  }

  let res = await originalFetch(url, finalInit);

  // P1.7 : tentative de refresh sur 401
  if (res.status === 401 && needsToken(url) && !url.includes('/auth/mfa/refresh')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // retry avec nouveau token
      const auth = readStoredAuth();
      if (auth?.token) {
        const headers = new Headers(finalInit.headers as HeadersInit | undefined);
        headers.set('Authorization', `Bearer ${auth.token}`);
        finalInit = { ...finalInit, headers };
        res = await originalFetch(url, finalInit);
      }
    }
    if (res.status === 401 && !window.location.pathname.startsWith('/auth')) {
      clearAuth();
      window.location.assign('/auth');
    }
  } else if (res.status === 401 && needsToken(url) && !window.location.pathname.startsWith('/auth')) {
    clearAuth();
    window.location.assign('/auth');
  }
  return res;
}

// Patch global fetch pour compatibilité avec code existant sans lever d'exception si window.fetch est en lecture seule (getter-only)
const patchedFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  return authorizedFetch(input, init);
};

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'fetch', {
      value: patchedFetch,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (window as any).fetch = patchedFetch;
    } catch {
      try {
        const winProto = Object.getPrototypeOf(window);
        if (winProto) {
          Object.defineProperty(winProto, 'fetch', {
            value: patchedFetch,
            writable: true,
            configurable: true,
          });
        }
      } catch {
        try {
          (globalThis as any).fetch = patchedFetch;
        } catch {
          // Ignoré si l'environnement hôte verrouille strictement fetch
        }
      }
    }
  }
}

export { authorizedFetch };
