import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Scale, Gavel, FileText, Settings, ShieldAlert, Sparkles, 
  Coins, Clock, ListChecks, CheckCircle, AlertTriangle, RefreshCw,
  FolderPlus, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LitigationStore } from '@/lib/litigation-store';
import { toast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/authorizedFetch';

// Importing sub-modules
import PreContentieuxTab from '@/components/litigation/PreContentieuxTab';
import DossiersContentieuxTab from '@/components/litigation/DossiersContentieuxTab';
import ActionsJuridiquesTab from '@/components/litigation/ActionsJuridiquesTab';
import DocumentsJuridiquesTab from '@/components/litigation/DocumentsJuridiquesTab';
import GarantiesCautionsTab from '@/components/litigation/GarantiesCautionsTab';
import FraisContentieuxTab from '@/components/litigation/FraisContentieuxTab';
import NouveauDossierModule from '@/components/litigation/NouveauDossierModule';

export default function Litigation() {
  const { user } = useAuth();
  const userEmail = user?.email || 'user@recovai.com';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dossiers';

  // State to force-reload global KPI calculations when a child state modifies anything
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // AI analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // ─── LOAD RECENT COMPLIANCE AUDITS ───────────────────
  const [auditLogs, setAuditLogs] = useState(() => LitigationStore.getAuditLogs());

  // Trigger state update
  const handleRefreshAll = () => {
    setRefreshTrigger(prev => prev + 1);
    setAuditLogs(LitigationStore.getAuditLogs());
  };

  const handleReset = async (mode: 'realistic' | 'empty') => {
    setIsResetting(true);
    try {
      if (mode === 'empty') {
        LitigationStore.resetToEmpty();
        await authorizedFetch('/api/dossiers/reset-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'empty' })
        }).catch(() => {});
        toast({
          title: "Portefeuille contentieux vidé (0 dossier)",
          description: "Tous les dossiers contentieux, pré-contentieux et pièces ont été réinitialisés à 0.",
        });
      } else {
        LitigationStore.resetToDefaults();
        await authorizedFetch('/api/dossiers/reset-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'realistic' })
        }).catch(() => {});
        toast({
          title: "Données contentieuses 2026 chargées",
          description: "Dossiers juridiques tunisiens réalistes réinitialisés pour votre démo client.",
        });
      }
      handleRefreshAll();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la réinitialisation",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  // ─── CALCULATE SYSTEM-WIDE CONTENTIOUS RATIOS ───────
  const globalKpis = useMemo(() => {
    const preLit = LitigationStore.getPreLitCases();
    const legal = LitigationStore.getLegalCases();
    const actions = LitigationStore.getLegalActions();
    const documents = LitigationStore.getLegalDocuments();
    const collaterals = LitigationStore.getCollaterals();
    const fees = LitigationStore.getLegalFees();

    const totalLitigationValue = legal.reduce((sum, c) => sum + c.total_claim_amount, 0);
    const totalRecoveredAmt = legal.reduce((sum, c) => sum + c.recovered_amount, 0);
    const globalRecoveryRate = totalLitigationValue > 0 ? (totalRecoveredAmt / totalLitigationValue) * 100 : 0;
    
    // Urgent cases count
    const urgentCount = legal.filter(c => c.priority_level === 'Urgente' || c.priority_level === 'Haute').length;

    // Incurred fees and costs
    const totalFeesEngaged = fees.filter(f => f.status === 'paid' || f.status === 'recovered').reduce((sum, f) => sum + f.amount, 0);

    return {
      totalPreLit: preLit.length,
      totalLegal: legal.length,
      totalClaimed: totalLitigationValue,
      recovered: totalRecoveredAmt,
      rate: globalRecoveryRate,
      urgent: urgentCount,
      totalFees: totalFeesEngaged
    };
  }, [refreshTrigger]);

  // ─── AI ASSISTANT: AUDIT STRATEGIQUE ─────────────────
  const triggerAiAudit = async () => {
    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    const preLit = LitigationStore.getPreLitCases();
    const legal = LitigationStore.getLegalCases();
    const actions = LitigationStore.getLegalActions();
    const documents = LitigationStore.getLegalDocuments();
    const collaterals = LitigationStore.getCollaterals();
    const fees = LitigationStore.getLegalFees();

    try {
      // payload mimicking analytics contentieux intelligence mapping
      const payload = {
        summary: {
          totalPreLitCount: preLit.length,
          totalJudicialCases: legal.length,
          totalLitigationIncurredSum: globalKpis.totalClaimed,
          totalRecoveredSum: globalKpis.recovered,
          recoveryPercentRate: globalKpis.rate,
          totalFeesIncurred: globalKpis.totalFees,
          unverifiedDocuments: documents.filter(d => !d.verified).length,
          activeGarantsListCount: collaterals.length
        },
        activeTab: activeTab,
        recentActions: actions.slice(0, 10),
        criticalAlertCases: legal.filter(c => c.risk_level === 'Critique')
      };

      const response = await fetch('/api/pilotage/indicateurs-contentieux/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Échec du serveur de recommandation légale.');

      const data = await response.json();
      setAiAnalysisResult(data.result);
      LitigationStore.logAction('AI_ENGINE', 'Synthèse stratégique', 'Génération d\'audit d\'intelligence artificielle contentieuse');
      setAuditLogs(LitigationStore.getAuditLogs());
    } catch(err: any) {
      console.error(err);
      setAiAnalysisResult(`### ⚠ Échec de connexion de l'IA\n\nImpossible d'exécuter la synthèse cognitive légale. Veuillez vous assurer d'avoir configuré le secret \`GEMINI_API_KEY\` dans vos variables.\n\n**Recommandations Standard pour le panel :**\n* **Audits requis** : ${documents.filter(d=>!d.verified).length} documents nécessitent d'obtenir leur conformité légale.\n* **Exécution forcée** : Réaliser en priorité les collatéraux d'hypothèques pour liquider les créances critiques.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabsConfig = [
    { id: 'nouveaux-dossiers', label: 'Nouveaux dossiers', icon: FolderPlus },
    { id: 'dossiers', label: 'Dossiers contentieux', icon: Gavel },
    { id: 'pre-contentieux', label: 'Pré-contentieux', icon: ShieldAlert },
    { id: 'actions', label: 'Actions juridiques', icon: ListChecks },
    { id: 'documents', label: 'Documents juridiques', icon: FileText },
    { id: 'garanties', label: 'Garanties & cautions', icon: Coins },
    { id: 'frais', label: 'Frais contentieux', icon: Clock }
  ];

  return (
    <div className="space-y-6 pb-12 transition-all">
      {/* ─── STICKY SUB-BAR NAVIGATION ─── */}
      <div className="sticky top-0 z-30 -mx-8 px-8 py-3 bg-background/90 backdrop-blur-md border-b border-border shadow-sm flex items-center justify-between gap-4">
        {/* Horizontal Navigation matched with sidebar mapping */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pr-4">
          {tabsConfig.map(t => {
            const IconComp = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer border",
                  active 
                    ? "bg-card border-border text-foreground shadow-sm ring-1 ring-border" 
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <IconComp size={14} className={active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Floating Quick AI & New Dossiers Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSearchParams({ tab: 'nouveaux-dossiers' })}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black transition cursor-pointer border shadow-sm",
              activeTab === 'nouveaux-dossiers'
                ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white border-blue-500 ring-2 ring-blue-400"
                : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800"
            )}
          >
            <FolderPlus size={15} className="text-blue-600 dark:text-blue-400" />
            Nouveaux dossiers
          </button>

          <button
            onClick={triggerAiAudit}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-navy via-slate-800 to-cobalt text-white shadow-md hover:brightness-110 transition disabled:opacity-50 cursor-pointer text-shadow-sm border border-white/10"
          >
            {isAnalyzing ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} className="text-yellow-400 animate-pulse" />
            )}
            Audit Intelligent IA
          </button>

          <button
            onClick={() => handleReset('empty')}
            disabled={isResetting}
            title="Vider tous les dossiers à zéro (0 dossier) pour démo"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={13} className={cn("text-muted-foreground", isResetting && "animate-spin")} />
            Vider (0 dossier)
          </button>

          <button
            onClick={() => handleReset('realistic')}
            disabled={isResetting}
            title="Charger les dossiers de démo réalistes 2026"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-card hover:bg-sky/10 text-navy hover:text-sky border border-border hover:border-sky/30 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={13} className={cn("text-sky", isResetting && "animate-spin")} />
            Démo réaliste 2026
          </button>
        </div>
      </div>

      {/* ─── MAIN DASHBOARD HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
        <div>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight flex items-center gap-2.5">
            <Scale className="text-crimson" size={30} />
            Espace d'Arbitrage Contentieux TN
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 font-sans font-medium">
            Registre d'exécution réglementaire, d'audits conformitaires et d'actions d'adjudication forcée.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-secondary/80 rounded-xl px-3.5 py-2 border border-border/60 text-[10px] font-mono font-bold text-muted-foreground shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          MODULE LÉGAL ACTIF
        </div>
      </div>

      {/* ─── CORE GLOBAL KPIS SUMMARY ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Volume de Contentieux Judiciaire</span>
          <p className="text-2xl font-serif-display mt-1 text-foreground">{globalKpis.totalLegal} cas</p>
          <span className="text-[10px] text-muted-foreground mt-2 font-mono">Pré-contentieux en traitement : {globalKpis.totalPreLit}</span>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Créances réclamées cumulées</span>
          <p className="text-2xl font-serif-display mt-1 text-foreground">{globalKpis.totalClaimed.toLocaleString('fr-FR')} TND</p>
          <span className="text-[10px] text-muted-foreground mt-2 font-mono">Frais avancés engagés : {globalKpis.totalFees.toLocaleString()} TND</span>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-emerald">Montants apurés d'Amende</span>
          <p className="text-2xl font-serif-display mt-1 text-emerald font-black">{globalKpis.recovered.toLocaleString('fr-FR')} TND</p>
          <span className="text-[10px] text-emerald font-semibold mt-2 flex items-center gap-1">
            <CheckCircle size={11} /> Récupéré de source sûre
          </span>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-crimson">Ratio d'Apurément contentieux</span>
          <p className="text-2xl font-serif-display mt-1 text-crimson font-black">{globalKpis.rate.toFixed(2)} %</p>
          <span className="text-[10px] text-crimson font-black mt-2 flex items-center gap-1 animate-pulse">
            <AlertTriangle size={11} /> {globalKpis.urgent} Affaires prioritaires critiques
          </span>
        </div>
      </div>

      {/* ─── AI RECOMMENDATIONS OVERLAY PANELS ─── */}
      <AnimatePresence>
        {aiAnalysisResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-crimson/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cobalt/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-405 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Recommandation Stratégique IA - RecovAI</span>
              </div>
              <button
                onClick={() => setAiAnalysisResult(null)}
                className="px-2.5 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
              >
                Masquer
              </button>
            </div>

            <div className="markdown-body space-y-3 text-xs leading-relaxed max-h-72 overflow-y-auto scrollbar-thin text-neutral-200 relative z-10 pr-2">
              {aiAnalysisResult.split('\n\n').map((block, idx) => {
                if (block.startsWith('###')) {
                  return (
                    <h3 key={idx} className="text-xs font-bold text-sky border-l-2 border-cobalt pl-2.5 mt-4 pt-0.5">
                      {block.replace('###', '')}
                    </h3>
                  );
                }
                if (block.startsWith('*') || block.startsWith('•')) {
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-1 text-neutral-300">
                      {block.split('\n').map((line, lIdx) => (
                        <li key={lIdx}>{line.replace(/^(\*|•)\s*/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={idx} className="text-[11px] font-medium text-neutral-300">{block}</p>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TAB RENDERING ENGINE ─── */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'nouveaux-dossiers' && (
              <NouveauDossierModule
                onDossierCreated={() => {
                  handleRefreshAll();
                  setSearchParams({ tab: 'dossiers' });
                }}
                userEmail={userEmail}
              />
            )}
            {activeTab === 'dossiers' && (
              <DossiersContentieuxTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
            {activeTab === 'pre-contentieux' && (
              <PreContentieuxTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
            {activeTab === 'actions' && (
              <ActionsJuridiquesTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
            {activeTab === 'documents' && (
              <DocumentsJuridiquesTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
            {activeTab === 'garanties' && (
              <GarantiesCautionsTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
            {activeTab === 'frais' && (
              <FraisContentieuxTab onRefreshAll={handleRefreshAll} userEmail={userEmail} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── RECENT SYSTEM AUDIT TRACKING LOGS ─── */}
      <section className="bg-card rounded-2xl border border-border p-5 shadow-sm mt-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-foreground">Piste de vérification d'Audit Interne (Compliance Logs)</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mises à jour réglementaires et signatures d'actes d'Amendes effectués par l'équipe.</p>
          </div>
          <button 
            onClick={() => { LitigationStore.logAction(userEmail || 'user@recovai.com', 'Nettoyage des archives', 'Consolidation manuelle de la piste d\'audit'); handleRefreshAll(); }}
            className="text-[10px] font-bold text-muted-foreground bg-secondary px-2.5 py-1.5 rounded border border-border/40 hover:bg-neutral-200 transition inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} className="text-muted-foreground" /> Consolider
          </button>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
          {auditLogs.map((log) => (
            <div key={log.id} className="text-[11px] bg-secondary/35 p-2 rounded-lg border border-border/40 flex items-start gap-4 font-mono font-medium text-muted-foreground">
              <span className="font-bold text-crimson whitespace-nowrap shrink-0">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
              <span className="font-bold text-neutral-800 shrink-0">{log.user} :</span>
              <span className="font-black text-foreground shrink-0">[{log.action}]</span>
              <span className="text-neutral-600 font-sans leading-relaxed">{log.details}</span>
              <span className="ml-auto text-[9px] font-bold text-muted-foreground font-mono shrink-0 select-none bg-secondary/80 px-1 py-0.5 rounded">{log.id}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
