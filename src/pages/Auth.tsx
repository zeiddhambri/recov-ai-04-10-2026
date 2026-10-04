import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, DEMO_MODE_ALLOWED } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import MfaVerify from '@/components/auth/MfaVerify';

const emailSchema = z.string().trim().email({ message: 'Adresse email invalide' }).max(255);
const passwordSchema = z
  .string()
  .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  .max(72, { message: 'Mot de passe trop long' });
const nameSchema = z.string().trim().min(2).max(100);

const SUPABASE_CONFIGURED = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim() !== '');

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signInWithDemo, signInWithToken } = useAuth();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  // Mode démo : uniquement si l'instance est explicitement marquée démonstration.
  // Aucun fallback automatique n'existe plus : un échec d'authentification échoue.
  const handleDemoSignIn = (role: 'agent' | 'admin' = 'agent') => {
    if (!DEMO_MODE_ALLOWED) return;
    if (role === 'admin') {
      signInWithDemo("admin@recovai.tn", "Administrateur Principal (Démo)");
      toast({ title: 'Mode Administrateur Activé', description: 'Connexion de démonstration — instance isolée.' });
    } else {
      signInWithDemo("demo-agent@recovai.tn", "Agent de Recouvrement (Démo)");
      toast({ title: 'Mode Démo Activé', description: 'Connexion de démonstration — instance isolée.' });
    }
    navigate(redirectTo, { replace: true });
  };

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);

  // Sign in
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // MFA step (P1.7)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaToken, setMfaToken] = useState<string | undefined>(undefined);

  // Sign up
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) navigate(redirectTo, { replace: true });
  }, [user, authLoading, navigate, redirectTo]);

  const serverLogin = async (email: string, password: string): Promise<{ mfaRequired?: boolean; mfaToken?: string } | boolean> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}) as any);
    if (!res.ok) {
      // gestion lockout
      if (res.status === 423) {
        const retry = body.retryAfterSeconds || 900;
        throw new Error(`Compte verrouillé — réessayez dans ${retry}s (politique P1.7 : 5 échecs → 15 min lockout)`);
      }
      throw new Error(body?.error || `Échec de connexion (HTTP ${res.status})`);
    }
    if (body.mfaRequired) {
      return { mfaRequired: true, mfaToken: body.mfaToken };
    }
    // login complet avec refresh token P1.7
    const data = body;
    // stocker refresh token si présent (localStorage)
    if (data.refreshToken) {
      try { localStorage.setItem('recovai_refresh_token', data.refreshToken); } catch { /* ignore */ }
    }
    signInWithToken(data.token, data.user, data.expiresAt);
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Format validation
    const emailParse = emailSchema.safeParse(signInEmail);
    if (!emailParse.success) {
      toast({ title: 'Email invalide', description: emailParse.error.issues[0].message, variant: 'destructive' });
      return;
    }
    if (!signInPassword) {
      toast({ title: 'Mot de passe requis', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // 2. Voie Supabase si un projet réel est configuré, sinon (ou en cas d'échec)
      //    la voie backend RecovAI. En cas d'échec : message d'erreur, AUCUN contournement.
      if (SUPABASE_CONFIGURED) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailParse.data,
          password: signInPassword,
        });
        if (!error && data?.session) {
          toast({ title: 'Bienvenue', description: 'Connexion réussie.' });
          navigate(redirectTo, { replace: true });
          return;
        }
      }

      const result = await serverLogin(emailParse.data, signInPassword);
      if (typeof result === 'object' && result.mfaRequired) {
        setMfaRequired(true);
        setMfaEmail(emailParse.data);
        setMfaToken(result.mfaToken);
        toast({ title: 'MFA requis', description: 'Saisissez le code TOTP de votre application d’authentification.' });
        return;
      }
      toast({ title: 'Bienvenue', description: 'Connexion réussie.' });
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast({
        title: 'Échec de la connexion',
        description: error?.message || 'Identifiants invalides. Contactez votre administrateur.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSuccess = (data: { token: string; expiresAt: number; refreshToken: string; user: any }) => {
    if (data.refreshToken) {
      try { localStorage.setItem('recovai_refresh_token', data.refreshToken); } catch { /* ignore */ }
    }
    signInWithToken(data.token, data.user, data.expiresAt);
    toast({ title: 'Bienvenue', description: 'MFA vérifié — connexion réussie.' });
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameParse = nameSchema.safeParse(signUpName);
    if (!nameParse.success) {
      toast({ title: 'Nom invalide', description: nameParse.error.issues[0].message, variant: 'destructive' });
      return;
    }
    const emailParse = emailSchema.safeParse(signUpEmail);
    if (!emailParse.success) {
      toast({ title: 'Email invalide', description: emailParse.error.issues[0].message, variant: 'destructive' });
      return;
    }
    const pwParse = passwordSchema.safeParse(signUpPassword);
    if (!pwParse.success) {
      toast({ title: 'Mot de passe invalide', description: pwParse.error.issues[0].message, variant: 'destructive' });
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      toast({
        title: 'Création de compte indisponible',
        description: 'Aucun annuaire n\'est connecté sur cette instance. La création de comptes passe par l\'administrateur (SSO de l\'institution à venir).',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: emailParse.data,
        password: pwParse.data,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: nameParse.data },
        },
      });

      if (error) throw error;

      toast({ title: 'Compte créé', description: 'Vérifiez votre boîte email pour confirmer votre inscription.' });
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      toast({
        title: 'Inscription impossible',
        description: error?.message || 'Le service d\'annuaire est momentanément indisponible.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-soft flex flex-col">
      <header className="container-atr py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-charcoal hover:text-crimson transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>
      </header>

      {DEMO_MODE_ALLOWED && (
        <div className="bg-amber-100 border-y border-amber-300 text-amber-900 text-xs font-semibold px-4 py-2 text-center">
          ⚠ ENVIRONNEMENT DE DÉMONSTRATION — données synthétiques, aucune donnée client réelle. Instance non sécurisée à usage de présentation uniquement.
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        {mfaRequired ? (
          <MfaVerify email={mfaEmail} mfaToken={mfaToken} onSuccess={handleMfaSuccess} onCancel={() => { setMfaRequired(false); setMfaEmail(''); setMfaToken(undefined); }} />
        ) : (
        <div className="w-full max-w-md bg-white border border-border rounded-sm shadow-sm p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-crimson text-2xl">✦</span>
            <span className="font-serif-display text-2xl text-charcoal">RecovAI</span>
          </div>
          <h1 className="text-xl font-medium text-charcoal mb-1">Accès à la plateforme</h1>
          <p className="text-sm text-slate mb-6">Gestion du recouvrement bancaire — P1.7 MFA TOTP + session courte</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email professionnel</Label>
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password">Mot de passe</Label>
                  <Input
                    id="si-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>

                {DEMO_MODE_ALLOWED && (
                  <>
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-xs text-slate-400">ACCÈS DÉMONSTRATION</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-200 text-charcoal hover:bg-slate-50 text-xs py-5 h-auto flex flex-col items-center gap-1 cursor-pointer"
                        onClick={() => handleDemoSignIn('agent')}
                      >
                        <span className="font-semibold text-sm">Agent (synthétique)</span>
                        <span className="text-[10px] text-slate font-normal">Vue agent de recouvrement</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-crimson text-crimson hover:bg-crimson/10 hover:text-crimson text-xs py-5 h-auto flex flex-col items-center gap-1 cursor-pointer"
                        onClick={() => handleDemoSignIn('admin')}
                      >
                        <span className="font-semibold text-sm text-crimson">✦ Admin (synthétique)</span>
                        <span className="text-[10px] text-crimson/80 font-normal">Instance de démo uniquement</span>
                      </Button>
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-slate bg-amber-50 border border-amber-200 rounded p-2.5">
                      <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>
                        Comptes de démonstration backend : <code className="font-mono">agent@recovai.tn</code>, <code className="font-mono">directeur@recovai.tn</code>, <code className="font-mono">admin@recovai.tn</code> — mots de passe communiqués par l'équipe RecovAI. Données 100 % synthétiques.
                      </span>
                    </div>
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Nom complet</Label>
                  <Input
                    id="su-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email professionnel</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Mot de passe</Label>
                  <Input
                    id="su-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                  />
                  <p className="text-xs text-slate">Minimum 8 caractères. Évitez les mots de passe déjà compromis.</p>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer mon compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        )}
      </main>
    </div>
  );
}
