// Typed API client for RecovAI Express Backend
// Lot P0 : chaque appel transporte le jeton Bearer émis par /api/auth/login.
// En cas de 401, la session locale est purgée et l'utilisateur est redirigé.

import { readStoredAuth, clearAuth } from '@/contexts/AuthContext';

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const auth = readStoredAuth();
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    clearAuth();
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.assign('/auth');
    }
    throw new Error('Session expirée ou invalide. Reconnectez-vous.');
  }
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}) as any);
    throw new Error(body?.error || 'Privilèges insuffisants pour cette opération.');
  }
  return res;
}

async function getJson(path: string) {
  const res = await request(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as any);
    throw new Error(body?.error || `Erreur serveur (HTTP ${res.status})`);
  }
  return res.json();
}

async function postJson(path: string, body?: unknown, method: 'POST' | 'PATCH' | 'PUT' = 'POST') {
  const res = await request(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok) {
    const detail = Array.isArray(data?.details) && data.details.length
      ? ` — ${data.details.map((d: any) => `${d.path}: ${d.message}`).join('; ')}`
      : '';
    throw new Error(`${data?.error || `Erreur serveur (HTTP ${res.status})`}${detail}`);
  }
  return data;
}

export const api = {
  auth: {
    me: async () => getJson('/api/auth/me'),
  },

  audit: {
    getLogs: async (limit = 200) => getJson(`/api/audit?limit=${limit}`),
  },

  health: {
    check: async () => getJson('/api/health'),
  },

  dossiers: {
    getAll: async (params?: { status?: string; search?: string; management_level?: string; portfolio?: string }) => {
      const query = new URLSearchParams((params || {}) as any).toString();
      return getJson(`/api/dossiers?${query}`);
    },
    getStats: async () => getJson('/api/dossiers/stats/summary'),
    getById: async (id: string) => getJson(`/api/dossiers/${id}`),
    create: async (data: any) => postJson('/api/dossiers', data),
    update: async (id: string, data: any) => postJson(`/api/dossiers/${id}`, data, 'PATCH'),
    remove: async (id: string) => {
      const res = await request(`/api/dossiers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression refusée (réservé aux rôles directeur/admin).');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await request(`/api/dossiers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression refusée (réservé aux rôles directeur/admin).');
      return res.json();
    },
    recordAction: async (id: string, action: any) => postJson(`/api/dossiers/${id}/actions`, action)
  },

  leasing: {
    getAll: async (params?: { status?: string; search?: string }) => {
      const query = new URLSearchParams((params || {}) as any).toString();
      return getJson(`/api/portefeuilles/leasing?${query}`);
    },
    getStats: async () => getJson('/api/portefeuilles/leasing/stats'),
    getById: async (id: string) => getJson(`/api/portefeuilles/leasing/${id}`),
    create: async (data: any) => postJson('/api/portefeuilles/leasing', data),
    simulateEarlyTermination: async (id: string, formula: string) =>
      postJson(`/api/portefeuilles/leasing/${id}/early-termination`, { formula })
  },

  factoring: {
    getDebtors: async () => getJson('/api/portefeuilles/factoring/debtors'),
    getInvoices: async (params?: { status?: string; debtorId?: string }) => {
      const query = new URLSearchParams((params || {}) as any).toString();
      return getJson(`/api/portefeuilles/factoring/invoices?${query}`);
    },
    createInvoice: async (data: any) => postJson('/api/portefeuilles/factoring/invoices', data)
  },

  contentieux: {
    getAll: async (params?: { stage?: string; search?: string }) => {
      const query = new URLSearchParams((params || {}) as any).toString();
      return getJson(`/api/contentieux/dossiers?${query}`);
    },
    getStats: async () => getJson('/api/contentieux/stats'),
    getById: async (id: string) => getJson(`/api/contentieux/dossiers/${id}`),
    create: async (data: any) => postJson('/api/contentieux/dossiers', data),
    updateStage: async (id: string, stage: string) => postJson(`/api/contentieux/dossiers/${id}`, { stage }, 'PATCH'),
    addHearing: async (id: string, hearing: any) => postJson(`/api/contentieux/dossiers/${id}/hearings`, hearing),
    addPayment: async (id: string, payment: any) => postJson(`/api/contentieux/dossiers/${id}/payments`, payment),
    getLawyers: async () => getJson('/api/contentieux/lawyers'),
    getBailiffs: async () => getJson('/api/contentieux/bailiffs')
  },

  relances: {
    getAll: async () => getJson('/api/relances'),
    send: async (data: { dossierId: string; channel?: string; templateId?: string; customMessage?: string }) =>
      postJson('/api/relances/send', data),
    getTemplates: async () => getJson('/api/relances/templates'),
    previewTemplate: async (content: string, values?: any) => postJson('/api/relances/templates/preview', { content, values }),
    getEscaladeRules: async () => getJson('/api/relances/escalade'),
    runEscalationEngine: async () => postJson('/api/relances/escalade/run-engine')
  },

  creditIfrs9: {
    calculateEcl: async (params: any) => postJson('/api/credit-ifrs9/calculate-ecl', params),
    analyzeAi: async (params: any) => postJson('/api/credit-ifrs9/ai-analysis', params)
  },

  clients: {
    search: async (q: string) => getJson(`/api/clients/search?q=${encodeURIComponent(q)}`),
    getProfile: async (nameOrId: string) => getJson(`/api/clients/${encodeURIComponent(nameOrId)}/profile`)
  },

  institutions: {
    getAll: async (params?: { category?: string; search?: string }) => {
      const query = new URLSearchParams((params || {}) as any).toString();
      return getJson(`/api/institutions?${query}`);
    },
    getStats: async () => getJson('/api/institutions/stats'),
    create: async (data: any) => postJson('/api/institutions', data)
  },

  pilotage: {
    getDashboardSummary: async (params?: Record<string, string>) => {
      const query = new URLSearchParams(params || {}).toString();
      return getJson(`/api/pilotage/tableau-de-bord-global/summary${query ? `?${query}` : ''}`);
    },
    getDashboardCharts: async () => getJson('/api/pilotage/tableau-de-bord-global/charts')
  }
};
