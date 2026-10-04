import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Shield, UserCog, Search, CheckCircle2, Scale, Zap, Bell, AlertTriangle, FileWarning, Sun, Moon, Monitor, Palette, Landmark, SlidersHorizontal, Cable, Lock, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import InstitutionsManagement from '@/components/settings/InstitutionsManagement';
import IntegrationsBancaires from '@/pages/IntegrationsBancaires';
import EnterpriseSecurity from '@/pages/EnterpriseSecurity';
import MfaSetup from '@/components/auth/MfaSetup';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: 'text-red-500 bg-red-50' },
  { value: 'recouvreur', label: 'Recouvreur', color: 'text-sky bg-sky/10' },
  { value: 'gestionnaire contentieux', label: 'Gestionnaire Contentieux', color: 'text-purple-500 bg-purple-50' },
  { value: 'directeur', label: 'Directeur', color: 'text-orange-500 bg-orange-50' },
  { value: 'comite', label: 'Comité', color: 'text-emerald-500 bg-emerald-50' },
  { value: 'viewer', label: 'Lecteur', color: 'text-gray-500 bg-gray-50' },
];

const mockUsers: UserProfile[] = [
  { uid: '1', email: 'admin@recovai.com', displayName: 'Admin Principal', role: 'admin' },
  { uid: '2', email: 'slim.mansour@recovai.com', displayName: 'Slim Mansour', role: 'recouvreur' },
  { uid: '3', email: 'amel.ben@recovai.com', displayName: 'Amel Ben Ali', role: 'gestionnaire contentieux' },
  { uid: '4', email: 'karim.dir@recovai.com', displayName: 'Karim Directeur', role: 'directeur' },
  { uid: '5', email: 'comite@recovai.com', displayName: 'Membre Comité', role: 'comite' },
];

export default function Settings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'institutions';

  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredUsers = mockUsers.filter(u =>
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = (userId: string, newRole: string) => {
    setSuccessMessage("Rôle mis à jour avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTabClick = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy dark:text-white tracking-tight font-syne">Paramètres d'administration</h1>
          <p className="text-muted-foreground mt-1">Gérez le référentiel des institutions, les utilisateurs, l'apparence et les règles d'escalade.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border w-fit">
        <button
          onClick={() => handleTabClick('institutions')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'institutions'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Landmark size={15} className={activeTab === 'institutions' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span>Institutions & IMF</span>
        </button>

        <button
          onClick={() => handleTabClick('utilisateurs')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'utilisateurs'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Users size={15} className={activeTab === 'utilisateurs' ? 'text-sky' : ''} />
          <span>Utilisateurs & Rôles</span>
        </button>

        <button
          onClick={() => handleTabClick('declencheurs')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'declencheurs'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Zap size={15} className={activeTab === 'declencheurs' ? 'text-[hsl(var(--crimson))]' : ''} />
          <span>Déclencheurs & Automatisation</span>
        </button>

        <button
          onClick={() => handleTabClick('apparence')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'apparence'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Palette size={15} className={activeTab === 'apparence' ? 'text-amber-500' : ''} />
          <span>Thème & Apparence</span>
        </button>

        <button
          onClick={() => handleTabClick('integrations')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'integrations'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Cable size={15} className={activeTab === 'integrations' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span>Connecteurs Bancaires & BCT</span>
        </button>

        <button
          onClick={() => handleTabClick('securite')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'securite'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <Lock size={15} className={activeTab === 'securite' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
          <span>Sécurité & SGBD Bancaire</span>
        </button>

        <button
          onClick={() => handleTabClick('mfa')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'mfa'
              ? "bg-white dark:bg-slate-800 text-navy dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-navy dark:hover:text-white"
          )}
        >
          <KeyRound size={15} className={activeTab === 'mfa' ? 'text-emerald-600' : ''} />
          <span>MFA TOTP (P1.7)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700">NOUVEAU</span>
        </button>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-bold"
        >
          <CheckCircle2 size={18} />
          {successMessage}
        </motion.div>
      )}

      {/* TAB CONTENT: Sécurité & SGBD */}
      {activeTab === 'securite' && (
        <EnterpriseSecurity />
      )}

      {/* TAB CONTENT: MFA */}
      {activeTab === 'mfa' && (
        <div className="space-y-6">
          <MfaSetup />
          <div className="bg-card rounded-2xl p-6 border">
            <h3 className="font-bold mb-2">Assistant TOTP & Documentation</h3>
            <p className="text-sm text-muted-foreground mb-3">Page d’assistance pour générer des codes TOTP côté client (démo, sans envoi serveur) et déroulé de démo multi-tenant + MFA.</p>
            <div className="flex gap-2">
              <a href="/totp-assistant" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm">Ouvrir /totp-assistant</a>
              <a href="/docs/DEMO-MULTI-TENANT-MFA.md" target="_blank" className="px-4 py-2 border rounded-md text-sm">Voir doc démo (md)</a>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Integrations */}
      {activeTab === 'integrations' && (
        <IntegrationsBancaires />
      )}

      {/* TAB CONTENT: Institutions */}
      {activeTab === 'institutions' && (
        <InstitutionsManagement />
      )}

      {/* TAB CONTENT: Apparence */}
      {activeTab === 'apparence' && (
        <div className="bg-card rounded-3xl p-6 sm:p-8 shadow-sm border border-border">
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky/10 dark:bg-sky/20 flex items-center justify-center text-sky">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-white font-syne">Thème & Expérience Visuelle</h2>
                <p className="text-xs text-muted-foreground">Personnalisez le mode d'affichage pour une ergonomie optimale de jour comme de nuit.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Actif : {resolvedTheme === 'dark' ? '🌙 Mode Sombre' : '☀️ Mode Clair'}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-36",
                theme === 'light'
                  ? "border-sky bg-sky/5 ring-2 ring-sky/20 shadow-sm"
                  : "border-border bg-paper hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Sun size={18} />
                </div>
                {theme === 'light' && (
                  <CheckCircle2 size={18} className="text-sky" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-charcoal dark:text-white">Mode Clair</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Contraste élevé pour les environnements de travail lumineux.</p>
              </div>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-36",
                theme === 'dark'
                  ? "border-sky bg-sky/10 ring-2 ring-sky/30 shadow-sm"
                  : "border-border bg-paper hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
                  <Moon size={18} />
                </div>
                {theme === 'dark' && (
                  <CheckCircle2 size={18} className="text-sky" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-charcoal dark:text-white">Mode Sombre</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Repos visuel avec tons midnight navy et contraste adouci.</p>
              </div>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-36",
                theme === 'system'
                  ? "border-sky bg-sky/5 dark:bg-sky/10 ring-2 ring-sky/20 shadow-sm"
                  : "border-border bg-paper hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-border">
                  <Monitor size={18} />
                </div>
                {theme === 'system' && (
                  <CheckCircle2 size={18} className="text-sky" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-charcoal dark:text-white">Automatique / Système</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Suit automatiquement les préférences de votre système d'exploitation.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Utilisateurs & Rôles */}
      {activeTab === 'utilisateurs' && (
        <div className="space-y-8">
          <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy font-syne">Gestion des utilisateurs</h2>
                  <p className="text-xs text-muted-foreground">{mockUsers.length} utilisateurs enregistrés</p>
                </div>
              </div>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-mist border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                    <th className="text-left p-4">Utilisateur</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Rôle actuel</th>
                    <th className="text-left p-4">Modifier le rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const currentRole = ROLES.find(r => r.value === user.role);
                    return (
                      <tr key={user.uid} className="border-b border-border hover:bg-mist transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold">
                              {user.displayName[0]}
                            </div>
                            <span className="font-bold text-sm text-navy">{user.displayName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-4">
                          <span className={cn("text-xs font-bold px-3 py-1 rounded-full", currentRole?.color)}>
                            {currentRole?.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-sky/20"
                          >
                            {ROLES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-3xl p-8 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center">
                  <Shield size={20} className="text-sky" />
                </div>
                <h3 className="text-lg font-bold text-navy font-syne">Rôles & Permissions</h3>
              </div>
              <div className="space-y-3">
                {ROLES.map((role) => (
                  <div key={role.value} className="flex items-center justify-between p-3 bg-mist rounded-xl">
                    <span className={cn("text-xs font-bold px-3 py-1 rounded-full", role.color)}>{role.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {mockUsers.filter(u => u.role === role.value).length} utilisateur(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-3xl p-8 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <UserCog size={20} className="text-gold" />
                </div>
                <h3 className="text-lg font-bold text-navy font-syne">Organisation</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-mist rounded-xl">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Nom</p>
                  <p className="text-sm font-bold text-navy">RecovAI — Organisation par défaut</p>
                </div>
                <div className="p-4 bg-mist rounded-xl">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Plan actif</p>
                  <p className="text-sm font-bold text-sky">Business</p>
                </div>
                <div className="p-4 bg-mist rounded-xl">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Dossiers</p>
                  <p className="text-sm font-bold text-navy">252 / Illimité</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Déclencheurs */}
      {activeTab === 'declencheurs' && (
        <LitigationTriggers />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// LITIGATION TRIGGERS
// ═══════════════════════════════════════════
const TRIGGERS_INITIAL = [
  {
    id: 'auto_open_case',
    icon: Scale,
    title: 'Ouverture automatique de dossier contentieux',
    description: "Crée un dossier contentieux quand un débiteur passe en statut critique avec un retard > 90 jours.",
    enabled: true,
    conditions: { riskLevel: 'critique', daysOverdue: 90 },
  },
  {
    id: 'auto_mise_demeure',
    icon: FileWarning,
    title: 'Envoi automatique de la mise en demeure',
    description: "Génère et envoie la mise en demeure quand toutes les actions amiables sont épuisées et qu'aucune réponse n'a été reçue depuis 30 jours.",
    enabled: true,
    conditions: { actionsExhausted: true, noResponseDays: 30 },
  },
  {
    id: 'notify_lawyer_judgment',
    icon: Bell,
    title: "Notification de l'avocat sur jugement obtenu",
    description: "Alerte l'avocat assigné dès qu'un dossier passe en étape « Jugement obtenu » pour démarrer la phase d'exécution.",
    enabled: true,
    conditions: { stage: 'judgment_obtained' },
  },
  {
    id: 'escalate_hearing',
    icon: AlertTriangle,
    title: 'Escalade J-7 sans préparation',
    description: "Escalade au gestionnaire si une audience approche dans moins de 7 jours et qu'aucune note de préparation n'a été ajoutée.",
    enabled: false,
    conditions: { daysBeforeHearing: 7, requiresPrepNotes: true },
  },
];

function LitigationTriggers() {
  const [triggers, setTriggers] = useState(TRIGGERS_INITIAL);

  return (
    <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--crimson))]/10 flex items-center justify-center">
          <Zap size={20} className="text-[hsl(var(--crimson))]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-navy font-syne">Déclencheurs contentieux</h2>
          <p className="text-xs text-muted-foreground">Règles d'automatisation pour le module Litigation.</p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {triggers.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.id} className="p-5 flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                t.enabled ? "bg-[hsl(var(--crimson))]/10 text-[hsl(var(--crimson))]" : "bg-muted text-muted-foreground",
              )}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-sm text-navy">{t.title}</p>
                  <button
                    onClick={() => setTriggers(triggers.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x))}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition flex-shrink-0",
                      t.enabled ? "bg-[hsl(var(--crimson))]" : "bg-muted",
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                      t.enabled ? "translate-x-5" : "translate-x-0.5",
                    )} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(t.conditions).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mist text-[10px] font-bold text-navy">
                      {k} = <span className="text-[hsl(var(--crimson))]">{String(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-mist border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {triggers.filter(t => t.enabled).length} sur {triggers.length} déclencheurs actifs
        </span>
        <button className="font-bold text-[hsl(var(--crimson))] hover:underline">+ Nouveau déclencheur</button>
      </div>
    </div>
  );
}
