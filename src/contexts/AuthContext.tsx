import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const DEMO_MODE_ALLOWED = import.meta.env.VITE_DEMO_MODE === '1';
const SUPABASE_CONFIGURED = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim() !== '');

export interface LiteUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'agent';
}

interface StoredAuth {
  token: string;
  user: LiteUser;
  expiresAt: number; // ms
}

const TOKEN_KEY = 'recovai_auth';

export function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || (parsed.expiresAt && Date.now() > parsed.expiresAt)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function storeAuth(auth: StoredAuth) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('recovai_demo_user'); // nettoyage legacy du contournement supprimé
  localStorage.removeItem('recovai_refresh_token');
}

type AuthContextValue = {
  user: User | LiteUser | null;
  session: Session | null;
  role: 'admin' | 'manager' | 'agent';
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithToken: (token: string, user: LiteUser, expiresAt: number) => void;
  refreshSession: () => Promise<boolean>;
  /** Uniquement disponible lorsque VITE_DEMO_MODE=1 — jamais en build « production ». */
  signInWithDemo: (email: string, name?: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | LiteUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Session applicative (jeton émis par POST /api/auth/login) — priorité.
    const stored = readStoredAuth();
    if (stored) {
      setUser(stored.user);
      setLoading(false);
      return;
    }

    // 2) Supabase : uniquement si un projet réel est configuré.
    if (SUPABASE_CONFIGURED) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });

      supabase.auth.getSession().then(({ data: { session: existing } }) => {
        if (!readStoredAuth()) {
          setSession(existing);
          setUser(existing?.user ?? null);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    setLoading(false);
  }, []);

  const signInWithToken = (token: string, liteUser: LiteUser, expiresAt: number) => {
    storeAuth({ token, user: liteUser, expiresAt });
    setUser(liteUser);
    setSession(null);
  };

  const signInWithDemo = (email: string, name = "Agent de Recouvrement (Démo)") => {
    if (!DEMO_MODE_ALLOWED) {
      throw new Error('Le mode démonstration est désactivé dans cette instance (VITE_DEMO_MODE).');
    }
    const liteUser: LiteUser = {
      id: 'demo-' + Math.random().toString(36).slice(2, 8),
      email,
      name,
      role: email.startsWith('admin') ? 'admin' : 'agent',
    };
    storeAuth({ token: 'demo-mode-token', user: liteUser, expiresAt: Date.now() + 4 * 3600_000 });
    setUser(liteUser);
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('recovai_refresh_token');
      if (!refreshToken) return false;
      const res = await fetch('/api/auth/mfa/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearAuth();
        setUser(null);
        setSession(null);
        return false;
      }
      const data = await res.json();
      if (data.refreshToken) localStorage.setItem('recovai_refresh_token', data.refreshToken);
      storeAuth({ token: data.token, user: data.user, expiresAt: data.expiresAt });
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const signOut = async () => {
    try {
      const refreshToken = localStorage.getItem('recovai_refresh_token');
      if (refreshToken) {
        await fetch('/api/auth/mfa/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${readStoredAuth()?.token || ''}` },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } catch { /* ignore */ }
    clearAuth();
    if (SUPABASE_CONFIGURED) {
      try {
        await supabase.auth.signOut();
      } catch {
        // client hors-ligne : nettoyage local déjà effectué
      }
    }
    setSession(null);
    setUser(null);
  };

  const role =
    (user && 'role' in (user as any) ? (user as any).app_metadata?.role ?? (user as LiteUser).role : undefined) as AuthContextValue['role'] | undefined;

  return (
    <AuthContext.Provider value={{ user, session, role: role ?? 'agent', loading, signOut, signInWithDemo, signInWithToken, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
