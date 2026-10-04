import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, 
  FileText, 
  History, 
  ShieldAlert, 
  Sliders, 
  Brain, 
  Users, 
  ShieldCheck, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import NouveauDossier from './credit_ifrs9/NouveauDossier';
import MesAnalyses from './credit_ifrs9/MesAnalyses';
import ModelesSectoriels from './credit_ifrs9/ModelesSectoriels';
import ParametresMoteur from './credit_ifrs9/ParametresMoteur';
import { cn } from '@/lib/utils';

// Roles configuration for simulation
const ROLES_CONFIG = [
  { value: 'analyste', label: 'Analyste Crédit', color: 'text-sky bg-sky/10 border-sky/20', desc: 'Saisie dossier, lance les analyses IA pour octroi et calibration IFRS 9.' },
  { value: 'risk_manager', label: 'Risk Manager', color: 'text-purple-500 bg-purple-50 border-purple-200', desc: 'Vise l\'analyse, évalue l\'impact prudentiel BCT et préconise des provisions.' },
  { value: 'comite', label: 'Membre du Comité', color: 'text-emerald-500 bg-emerald-50 border-emerald-200', desc: 'Prend la décision définitive d\'octroi et valide la signature électronique.' },
];

export default function CreditIfrs9() {
  const { activeTab } = useParams<{ activeTab: string }>();
  const navigate = useNavigate();
  
  // Simulation user role state
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    return localStorage.getItem('sim_credit_role') || 'analyste';
  });

  const tab = activeTab || 'nouveau';

  useEffect(() => {
    localStorage.setItem('sim_credit_role', selectedRole);
  }, [selectedRole]);

  const handleTabChange = (newTab: string) => {
    navigate(`/credit-ifrs9/${newTab}`);
  };

  const getTabLabel = (t: string) => {
    switch (t) {
      case 'nouveau': return 'Nouveau Dossier';
      case 'analyses': return 'Mes Analyses';
      case 'historique': return 'Historique';
      case 'modeles': return 'Modèles Sectoriels';
      case 'parametres': return 'Paramètres Moteur';
      default: return 'Optimisation de l\'Octroi';
    }
  };

  return (
    <div id="credit-ifrs9-root" className="space-y-6 pb-12">
      {/* Decorative Brand Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-navy p-6 rounded-3xl text-white shadow-xl border border-white/5 relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-sky/20 border border-sky/30 rounded-full text-sky text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
              <Sparkles size={10} /> Module IA Expert
            </div>
            <span className="text-white/40 text-xs">| Tunisie (TND)</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-syne flex items-center gap-3">
            <Brain size={32} className="text-sky animate-pulse" />
            Moteur d'Octroi Crédit & IFRS 9
          </h1>
          <p className="text-white/70 text-sm max-w-xl">
            Système d'aide à la décision prudentielle et de provisionnement prospectif IFRS 9 pour comités de crédit.
          </p>
        </div>

        {/* Role Simulator Selector */}
        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl space-y-2 max-w-xs w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-sky">
            <Users size={14} />
            <span>Simuler le Rôle Décisionnel</span>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-navy/80 border border-white/10 text-white text-xs rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-sky font-medium"
          >
            {ROLES_CONFIG.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-white/55 leading-tight">
            {ROLES_CONFIG.find(r => r.value === selectedRole)?.desc}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border p-1 bg-mist/60 rounded-xl max-w-full overflow-x-auto gap-2">
        <button
          onClick={() => handleTabChange('nouveau')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            tab === 'nouveau' ? "bg-white text-navy shadow-sm border border-border" : "text-muted-foreground hover:bg-mist"
          )}
        >
          <PlusCircle size={16} />
          Nouveau Dossier
        </button>
        <button
          onClick={() => handleTabChange('analyses')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            (tab === 'analyses' || tab === 'historique') ? "bg-white text-navy shadow-sm border border-border" : "text-muted-foreground hover:bg-mist"
          )}
        >
          <FileText size={16} />
          Mes Analyses & Historique
        </button>
        <button
          onClick={() => handleTabChange('modeles')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            tab === 'modeles' ? "bg-white text-navy shadow-sm border border-border" : "text-muted-foreground hover:bg-mist"
          )}
        >
          <ShieldAlert size={16} />
          Modèles Sectoriels
        </button>
        <button
          onClick={() => handleTabChange('parametres')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            tab === 'parametres' ? "bg-white text-navy shadow-sm border border-border" : "text-muted-foreground hover:bg-mist"
          )}
        >
          <Sliders size={16} />
          Paramètres Moteur
        </button>
      </div>

      {/* Main Tab Content Viewport */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-card p-2 md:p-6 rounded-3xl border border-border shadow-sm min-h-[500px]"
        >
          {tab === 'nouveau' && <NouveauDossier currentRole={selectedRole} />}
          {(tab === 'analyses' || tab === 'historique') && <MesAnalyses currentRole={selectedRole} initialTab={tab} />}
          {tab === 'modeles' && <ModelesSectoriels />}
          {tab === 'parametres' && <ParametresMoteur />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
