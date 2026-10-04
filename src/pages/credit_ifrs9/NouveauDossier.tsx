import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Coins, 
  Scale, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  XOctagon, 
  Sparkles, 
  Download, 
  Save, 
  ArrowRight,
  UserCheck,
  RefreshCw,
  Clock,
  Briefcase,
  HelpCircle,
  FileCheck2,
  FileSignature,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Prefilled Simulation Scenarios
const PREFILLED_SCENARIOS = {
  banque: [
    {
      label: "STE Industrielle du Sud (Corporate)",
      data: {
        nom_contrepartie: "STE Industrielle du Sud",
        type_client: "Corporate",
        montant: "250000",
        duree_mois: "60",
        taux_demande: "8.5",
        revenus: "45000", // e.g. EBITDA mensuel 
        charges: "12000",
        endettement_existant: "15",
        retard_max_jours: "12",
        type_garantie: "Hypothèque foncière 1er rang",
        valeur_garantie: "350000",
        ltv: "71",
        historique_credit: "Sain. Encours remboursés par anticipation par le passé.",
        clauses_sppi: "Aucune clause d'indexation exotique. Taux fixe réglementaire conforme.",
        dscr: "2.1",
        situation_pro: "Société anonyme de droit tunisien active depuis 14 ans dans l'agro-alimentaire."
      }
    },
    {
      label: "Amira Ben Youssef (Retail)",
      data: {
        nom_contrepartie: "Amira Ben Youssef",
        type_client: "Particulier",
        montant: "45000",
        duree_mois: "36",
        taux_demande: "7.2",
        revenus: "3100", // salaire net
        charges: "450",
        endettement_existant: "10",
        retard_max_jours: "35", // trigger ASRC / Bucket 2
        type_garantie: "Caution Solidaire du Conjoint",
        valeur_garantie: "50000",
        ltv: "90",
        historique_credit: "Historique correct mais incident technique temporaire de 35 jours résolu.",
        clauses_sppi: "Prêt amortissable standard.",
        dscr: "1.4",
        situation_pro: "CDI stable de 6 ans dans l'administration publique tunisienne."
      }
    }
  ],
  leasing: [
    {
      label: "Pharmacie du Lac (Équipements Médicaux)",
      data: {
        nom_contrepartie: "Pharmacie du Lac S.A.",
        montant: "120000",
        duree_mois: "48",
        taux_demande: "9.2",
        revenus: "15000", // Revenu net
        charges: "3000",
        retard_max_jours: "0",
        type_garantie: "Gage matériel (Échographe 3D)",
        valeur_garantie: "135000",
        ltv: "88",
        historique_credit: "Excellents antécédents, client premium historique.",
        clauses_sppi: "Clauses standard de crédit-bail avec option d'achat à 1% résiduelle.",
        dscr: "2.5",
        situation_pro: "Officine de pharmacie agréée de Tunis avec forte fréquentation.",
        valeur_achat_materiel: "135000",
        loyer_mensuel: "3100",
        valeur_residuelle_pct: "1"
      }
    }
  ],
  microfinance: [
    {
      label: "Coopérative Oléicole Medenine (AGR)",
      data: {
        nom_contrepartie: "Coopérative Oléicole de Medenine",
        montant: "18000",
        duree_mois: "18",
        taux_demande: "12.0",
        revenus: "3500",
        charges: "500",
        retard_max_jours: "5",
        type_garantie: "Garantie solidaire de 4 membres du bureau",
        valeur_garantie: "18000",
        ltv: "100",
        historique_credit: "Client jeune, premier renouvellement réussi.",
        clauses_sppi: "Paiements solidaires périodiques.",
        dscr: "3.2",
        situation_pro: "Agriculture et production d'huile d'olive bénéficiant de label régional."
      }
    }
  ],
  factoring: [
    {
      label: "Global Batiment (Ventes STEG)",
      data: {
        nom_contrepartie: "Global Batiment SARL",
        montant: "85000",
        duree_mois: "3", // court terme
        taux_demande: "6.5",
        revenus: "28000",
        charges: "18000",
        retard_max_jours: "45", // Retard de paiement STEG
        type_garantie: "Cession de créance certifiée de la STEG",
        valeur_garantie: "95000",
        ltv: "89",
        historique_credit: "Paiements réguliers mais délais étatiques prolongés récurrents.",
        clauses_sppi: "Factures validées sans compensation possible.",
        dscr: "1.2",
        situation_pro: "Sous-traitant de BTP agréé.",
        nom_acheteur: "BCT / STEG (Société Tunisienne de l'Électricité)",
        delai_moyen_paiement: "120",
        risque_litige: "Faible"
      }
    }
  ]
};

// Types for Results
interface Pillar {
  id: number;
  nom: string;
  ponderation: number;
  score_qualitatif: string;
  score_numerique: number;
  analyse: string;
  justification: string;
  indicateurs_cles: Record<string, string>;
}

interface ResultsData {
  recommandation: {
    decision: string;
    escalade_requise: boolean;
  };
  resume: {
    recommandation_synthetique: string;
    niveau_risque_global: string;
    bucket_anticipe: string;
    sppi_statut: string;
    evaluation_comptable: string;
  };
  scoring_global: {
    score: number;
    niveau_confiance: number;
    calcul_detail: string;
    pd_estimee: string;
    lgd_estimee: string;
  };
  ifrs9: {
    test_sppi: {
      resultat: string;
      consequence_comptable: string;
      clauses_evaluees: string[];
    };
    classification_bucket: {
      bucket: string;
      horizon_ecl: string;
      justification: string;
      impact_provisionnement: string;
    };
    asrc: {
      sicr_detecte: boolean;
      justification: string;
      retard_jours: number;
      indicateurs: string[];
    };
    forward_looking: {
      scenario_central: string;
      scenario_baissier: string;
      scenario_haussier: string;
      impact_pd: string;
    };
    modifications: {
      restructuration_detectee: boolean;
      test_decomptabilisation: string;
      impact_resultat: string;
    };
  };
  piliers: Pillar[];
  red_flags: { niveau: string; type: string; description: string; impact_score: string }[];
  facteurs_favorables: { type: string; description: string; impact_score: string }[];
  conditions_suggerees: { priorite: string; type: string; description: string; lien_ifrs9?: string }[];
  donnees_analysees: { variables_forward_looking: string[]; donnees_manquantes: string[] };
  audit_trail: {
    logique_decisionnelle: string;
    hypotheses_appliquees: string[];
    conformite: string;
    version_moteur: string;
    timestamp_analyse: string;
  };
}

export default function NouveauDossier({ currentRole }: { currentRole: string }) {
  const [modelType, setModelType] = useState<'banque' | 'leasing' | 'microfinance' | 'factoring'>('banque');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // Dynamic form state
  const [form, setForm] = useState<any>({
    nom_contrepartie: '',
    type_client: 'Corporate',
    montant: '',
    duree_mois: '',
    taux_demande: '7.5',
    revenus: '',
    charges: '0',
    endettement_existant: '0',
    retard_max_jours: '0',
    type_garantie: '',
    valeur_garantie: '',
    clauses_sppi: 'Paiement uniquement principal et intérêts (SPPI).',
    historique_credit: 'Sain sur les 12 derniers mois de relevés.',
    situation_pro: '',
    dscr: '1.2'
  });

  // Analysis result state
  const [results, setResults] = useState<ResultsData | null>(null);

  // Committee flow states
  const [committeeLogs, setCommitteeLogs] = useState<any[]>([]);
  const [opinionInput, setOpinionInput] = useState('');
  const [stressBufferChecked, setStressBufferChecked] = useState(false);

  // Load default prefill on launch
  useEffect(() => {
    applyPrefill(0);
  }, [modelType]);

  const applyPrefill = (index: number) => {
    const scenarios = PREFILLED_SCENARIOS[modelType];
    if (scenarios && scenarios[index]) {
      setForm(scenarios[index].data);
      toast({
        title: "Modèle appliqué",
        description: `Le scénario "${scenarios[index].label}" a été chargé avec succès.`,
      });
    }
  };

  const handleInputChange = (field: string, val: string) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const runAnalysis = async () => {
    if (!form.nom_contrepartie) {
      toast({
        title: "Champ manquant",
        description: "Veuillez spécifier le nom ou la raison sociale de la contrepartie.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(null);
    setCommitteeLogs([]);

    const steps = [
      "Extraction et enrichissement sémantique du dossier...",
      "Vérification de la conformité réglementaire BCT 2024...",
      "Exécution des tests SPPI fondamentaux...",
      "Exécution de l'algorithme d'ASRC (Détection de dégradation)...",
      "Stress test prospectif Forward-Looking (PIB/Inflation Tunisie)...",
      "Évaluation finale par le Moteur Décisionnel IA..."
    ];

    for (const step of steps) {
      setLoadingStep(step);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const response = await fetch('/api/credit-ifrs9/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier: form, modelType })
      });

      if (!response.ok) {
        throw new Error("Le serveur d'analyse IA a renvoyé une erreur.");
      }

      const raw = await response.json();
      const parsedResults = JSON.parse(raw.result) as ResultsData;
      setResults(parsedResults);

      toast({
        title: "Analyse terminée avec succès",
        description: `Moteur prudentiel : ${parsedResults.recommandation.decision} | Score ${parsedResults.scoring_global.score}/100`,
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Échec de l'analyse",
        description: err.message || "Erreur de communication backend.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit committee step
  const registerDecisionStep = (decisionStatus: 'APPROVED' | 'AMENDED' | 'REJECTED') => {
    if (!results) return;

    let roleLabel = '';
    if (currentRole === 'analyste') roleLabel = 'Analyste Crédit';
    else if (currentRole === 'risk_manager') roleLabel = 'Risk Manager / Dépt. Risques';
    else if (currentRole === 'comite') roleLabel = 'Comité d\'Octroi Supérieur (Tunis)';

    const newLog = {
      role: currentRole,
      label: roleLabel,
      decision: decisionStatus,
      opinion: opinionInput || "Avis formulé sur la base du rapport d'octroi assisté par IA.",
      stressBuffer: stressBufferChecked,
      timestamp: new Date().toLocaleDateString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    };

    setCommitteeLogs(prev => [...prev, newLog]);
    setOpinionInput('');
    setStressBufferChecked(false);

    toast({
      title: "Step de validation enregistré",
      description: `Action enregistrée pour le rôle : ${roleLabel}`,
    });
  };

  const saveAssessmentToHistory = () => {
    if (!results) return;

    try {
      const existing = localStorage.getItem('credit_analyses_history');
      const list = existing ? JSON.parse(existing) : [];
      
      const newSavedItem = {
        id: `ANL-${Math.floor(1000 + Math.random() * 9000)}`,
        nom_contrepartie: form.nom_contrepartie,
        modelType,
        montant: Number(form.montant),
        date: new Date().toISOString(),
        score: results.scoring_global.score,
        decision: results.recommandation.decision,
        bucket: results.resume.bucket_anticipe,
        sppi: results.resume.sppi_statut,
        logs: committeeLogs,
        formDump: form,
        resultsDump: results
      };

      list.unshift(newSavedItem);
      localStorage.setItem('credit_analyses_history', JSON.stringify(list));

      toast({
        title: "Dossier sauvegardé",
        description: "L'analyse a été archivée avec succès dans l'historique de la plateforme.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible d'archiver localement.",
        variant: "destructive"
      });
    }
  };

  // Native window layout printing trigger
  const handlePrint = () => {
    window.print();
  };

  const getDecisionBadgeClass = (d: string) => {
    switch (d) {
      case 'Acceptation favorable':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Acceptation conditionnelle':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Révision approfondie requise':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getPillarSeverityClass = (status: string) => {
    switch (status) {
      case 'Fort': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Acceptable': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Fragile': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  const getRiskColor = (level: string) => {
    if (level === 'Faible') return 'text-green-600 bg-green-50 border-green-100';
    if (level === 'Modéré') return 'text-sky bg-sky/5 border-sky/10';
    if (level === 'Élevé') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  return (
    <div id="new-assessment-container" className="space-y-8">
      {/* 2. Sub-modules Metiers segmented style control */}
      <div className="flex flex-col gap-4">
        <label className="text-sm font-bold text-navy font-syne uppercase tracking-wider">Sélectionner le Segment d'Activité</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-mist/40 p-2 rounded-2xl border border-border">
          <button
            onClick={() => setModelType('banque')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all border ${
              modelType === 'banque' ? 'bg-navy text-white shadow-md border-navy' : 'bg-transparent text-muted-foreground border-transparent hover:bg-mist'
            }`}
          >
            <Building2 size={18} />
            Banque Retail/Corp
          </button>
          <button
            onClick={() => setModelType('leasing')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all border ${
              modelType === 'leasing' ? 'bg-navy text-white shadow-md border-navy' : 'bg-transparent text-muted-foreground border-transparent hover:bg-mist'
            }`}
          >
            <Coins size={18} />
            Leasing
          </button>
          <button
            onClick={() => setModelType('microfinance')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all border ${
              modelType === 'microfinance' ? 'bg-navy text-white shadow-md border-navy' : 'bg-transparent text-muted-foreground border-transparent hover:bg-mist'
            }`}
          >
            <Briefcase size={18} />
            Microfinance
          </button>
          <button
            onClick={() => setModelType('factoring')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all border ${
              modelType === 'factoring' ? 'bg-navy text-white shadow-md border-navy' : 'bg-transparent text-muted-foreground border-transparent hover:bg-mist'
            }`}
          >
            <Scale size={18} />
            Factoring
          </button>
        </div>
      </div>

      {/* Prefilled scenarios utility for instant feedback */}
      <div className="bg-sky/5 border border-sky/15 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky text-white flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-navy">Scénarios de Démo Rapide</h3>
            <p className="text-[11px] text-muted-foreground">Chargez instantanément un profil tunisien complexe de référence.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PREFILLED_SCENARIOS[modelType]?.map((sce, idx) => (
            <button
              key={idx}
              onClick={() => applyPrefill(idx)}
              className="py-1 px-3 bg-white hover:bg-navy hover:text-white border border-border text-navy rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {sce.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Module Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-mist/30 p-6 rounded-3xl border border-border space-y-4">
            <h3 className="text-md font-bold text-navy font-syne flex items-center gap-2 border-b border-border pb-3">
              <FileCheck2 size={18} className="text-sky" />
              Saisie du Dossier d'Analyse
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Nom / Raison Sociale Contrepartie</label>
                <input
                  type="text"
                  value={form.nom_contrepartie}
                  onChange={(e) => handleInputChange('nom_contrepartie', e.target.value)}
                  placeholder="Ex: Société Tunisienne de Distribution"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
              </div>

              {modelType === 'banque' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Type Client</label>
                  <select
                    value={form.type_client}
                    onChange={(e) => handleInputChange('type_client', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                  >
                    <option value="Corporate">Corporate / Client Entreprise</option>
                    <option value="Particulier">Retail / Client Particulier</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Montant Sollicité (TND)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.montant}
                    onChange={(e) => handleInputChange('montant', e.target.value)}
                    placeholder="Montant en Dinars Tunisiens"
                    className="w-full pl-3 pr-12 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky font-bold text-navy"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">TND</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Durée Amortissement (Mois)</label>
                <input
                  type="number"
                  value={form.duree_mois}
                  onChange={(e) => handleInputChange('duree_mois', e.target.value)}
                  placeholder="Ex: 36 ou 60"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Taux d'Intérêt Sollicité / Loyer (%)</label>
                <input
                  type="text"
                  value={form.taux_demande}
                  onChange={(e) => handleInputChange('taux_demande', e.target.value)}
                  placeholder="Standard: ex 7.5 ou indexé TMM+2"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Revenus Mensuels Nets Estimés (TND)</label>
                <input
                  type="number"
                  value={form.revenus}
                  onChange={(e) => handleInputChange('revenus', e.target.value)}
                  placeholder="Ex: Salaire net ou EBITDA mensuel"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky font-medium"
                />
              </div>

              {(modelType === 'banque' || modelType === 'leasing') && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Charges Fixes Mensuelles Existantes (TND)</label>
                    <input
                      type="number"
                      value={form.charges}
                      onChange={(e) => handleInputChange('charges', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">DSCR Estimé (Ratio couverture de la dette)</label>
                    <input
                      type="text"
                      value={form.dscr}
                      onChange={(e) => handleInputChange('dscr', e.target.value)}
                      placeholder="Ex: 1.25"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Garanties Proposées / Type Collatéral</label>
                <input
                  type="text"
                  value={form.type_garantie}
                  onChange={(e) => handleInputChange('type_garantie', e.target.value)}
                  placeholder="Ex: Hypothèque, gage ou caution"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Valeur de la Garantie Estimée (TND)</label>
                <input
                  type="number"
                  value={form.valeur_garantie}
                  onChange={(e) => handleInputChange('valeur_garantie', e.target.value)}
                  placeholder="Valeur d'expertise"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                />
              </div>

              {modelType === 'leasing' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Valeur d'Achat du Matériel Financé (TND)</label>
                    <input
                      type="number"
                      value={form.valeur_achat_materiel}
                      onChange={(e) => handleInputChange('valeur_achat_materiel', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Option de Valeur Résiduelle (%)</label>
                    <input
                      type="number"
                      value={form.valeur_residuelle_pct}
                      onChange={(e) => handleInputChange('valeur_residuelle_pct', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm"
                    />
                  </div>
                </>
              )}

              {modelType === 'factoring' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Acheteur Débiteur Principal (STEG, etc.)</label>
                    <input
                      type="text"
                      value={form.nom_acheteur}
                      onChange={(e) => handleInputChange('nom_acheteur', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy">Délai de Paiement Moyen Constaté (Jours)</label>
                    <input
                      type="number"
                      value={form.delai_moyen_paiement}
                      onChange={(e) => handleInputChange('delai_moyen_paiement', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Retard Historique Précédent Max Constaté (Jours)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.retard_max_jours}
                    onChange={(e) => handleInputChange('retard_max_jours', e.target.value)}
                    placeholder="0 si aucun retard"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky"
                  />
                  {Number(form.retard_max_jours) > 30 && (
                    <span className="absolute right-3 top-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Situation Professionnelle / Profil Entreprise</label>
              <textarea
                value={form.situation_pro}
                onChange={(e) => handleInputChange('situation_pro', e.target.value)}
                placeholder="Renseignez le statut (ex: CDI, SA tunisienne, date création pépinière, etc.)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Antécédents & Historique Bureau des Informations (Crédit Bureau BCT)</label>
              <textarea
                value={form.historique_credit}
                onChange={(e) => handleInputChange('historique_credit', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Clauses Financières pour l'Évaluation du Test SPPI (Référentiel Comptable)</label>
              <textarea
                value={form.clauses_sppi}
                onChange={(e) => handleInputChange('clauses_sppi', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-sky resize-none text-xs text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Action and Tips Pane */}
        <div className="space-y-6">
          <div className="bg-navy p-6 rounded-3xl border border-white/5 text-white shadow-lg space-y-4">
            <h3 className="text-md font-bold font-syne flex items-center gap-2">
              <Sparkles size={18} className="text-sky animate-spin" />
              Moteur Cognitive IA
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              En cliquant ci-dessous, la plateforme va exécuter un processus d'octroi de crédit complet adossé à un test contractuel du test SPPI en IFRS 9 et une classification automatique de dégradation de risque (Bucketing) selon les directives de la BCT.
            </p>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full py-4 bg-sky hover:bg-sky-dark text-navy font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Calcul de Risque...
                </>
              ) : (
                <>
                  <Briefcase size={18} />
                  Lancer l'Analyse Assistée par l'IA
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border space-y-3 shadow-inner">
            <h4 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
              <Info size={14} className="text-sky" />
              Directives Prudentielles BCT & IFRS 9
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-normal">
              <li><strong>Incidents Bureau :</strong> Un retard prolongé &gt; 30 jours (ou impayés récurrents) entraîne réglementairement le reclassement en <strong>Bucket 2 (Transition)</strong>.</li>
              <li><strong>Rapport LTV :</strong> Un fort ratio de quotité (LTV &gt; 80%) sans collatéral majeur réduit sévèrement le score de garantie Prudentiel.</li>
              <li><strong>Test SPPI :</strong> Toutes clauses de convertible d'action, d'intéressement au chiffre d'affaires, ou d'écarts de taux indexés exotiques entraînent l'évaluation obligatoire à la juste valeur par résultat <strong>(FVTPL)</strong>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading Screen Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-md flex items-center justify-center z-[100] transition-opacity">
          <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full mx-4 shadow-2xl space-y-5 border border-border">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-sky animate-spin mb-2" />
            </div>
            <h3 className="text-lg font-black text-navy font-syne">Analyse Prudentielle Cognitive</h3>
            <p className="text-xs text-muted-foreground min-h-[32px] font-bold">
              {loadingStep}
            </p>
          </div>
        </div>
      )}

      {/* 4. Results Screen Layout */}
      {results && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="print:bg-white print:border-none p-1 md:p-6 bg-white rounded-3xl border border-border shadow-md space-y-8"
        >
          {/* Header Controls for printable and saving */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5 print:hidden">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Rapport de Synthèse d'Octroi</span>
              <h2 className="text-xl font-bold font-syne text-navy uppercase">
                {form.nom_contrepartie} — {modelType === 'banque' ? 'Banque' : modelType === 'leasing' ? 'Crédit-Bail' : modelType === 'microfinance' ? 'Microfinance' : 'Affacturage'}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handlePrint}
                className="py-2 px-4 rounded-xl bg-mist border border-border hover:bg-navy hover:text-white transition-all text-xs font-bold text-navy flex items-center gap-1.5"
              >
                <Download size={14} /> Imprimer / Rapport PDF
              </button>
              <button
                onClick={saveAssessmentToHistory}
                className="py-2 px-4 rounded-xl bg-sky hover:bg-sky-dark transition-all text-xs font-black text-navy flex items-center gap-1.5 shadow-sm"
              >
                <Save size={14} /> Archiver l'Analyse (Sauvegarder)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Main Overview Block */}
            <div className="md:col-span-2 space-y-6">
              {/* Decision Box Panel */}
              <div className={`p-6 border rounded-3xl space-y-3 shadow-inner ${getDecisionBadgeClass(results.recommandation.decision)}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-white border border-border rounded-full shadow-sm">
                    Recommandation Décisionnelle finale
                  </span>
                  {results.recommandation.escalade_requise && (
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-red-100 border border-red-200 text-red-600 rounded-lg animate-pulse uppercase">
                      Escalade Comité Tunis requise
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black font-syne">{results.recommandation.decision}</h3>
                <p className="text-xs font-medium leading-relaxed">
                  {results.resume.recommandation_synthetique}
                </p>
              </div>

              {/* standard 5 pillars prudentiels radar-like card dashboard */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-navy uppercase tracking-wider font-syne border-b border-border pb-2 flex items-center gap-2">
                  <Building2 size={16} /> Évaluation Prudentielle multicritères (5 Piliers Prudentiels)
                </h4>
                <div className="grid sm:grid-cols-5 gap-3">
                  {results.piliers.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-mist/20 border border-border flex flex-col justify-between text-center transition-all hover:scale-[1.02] shadow-sm">
                      <div>
                        <span className="text-[10px] font-extrabold text-navy/40">Pilier {p.id}</span>
                        <div className="text-[10px] font-extrabold text-navy leading-none mt-1 min-h-[35px] flex items-center justify-center">
                          {p.nom.replace(`Pilier ${p.id} : `, "")}
                        </div>
                      </div>
                      <div className="my-3">
                        <div className="text-2xl font-black text-navy">{p.score_numerique}/100</div>
                        <span className={`text-[9px] inline-block mt-1 font-bold px-2 py-0.5 border rounded-full ${getPillarSeverityClass(p.score_qualitatif)}`}>
                          {p.score_qualitatif}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground leading-tight">
                        W: <span className="font-bold">{p.ponderation}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Narrative Description of each pillar */}
                <div className="space-y-2 border border-border bg-mist/10 rounded-2xl p-4">
                  {results.piliers.map((p) => (
                    <div key={p.id} className="text-xs border-b border-border last:border-none pb-2 pt-2 first:pt-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-navy">{p.nom}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">Score : <span className="text-sky font-bold font-mono">{p.score_numerique}%</span></span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-2 leading-relaxed">
                        {p.analyse} {p.justification}
                      </p>
                      {/* Indicators checklist */}
                      <div className="flex flex-wrap gap-2.5 mt-1.5 pl-2">
                        {Object.entries(p.indicateurs_cles).map(([key, val]) => (
                          <span key={key} className="text-[9px] font-mono font-medium rounded bg-white border border-border px-1.5 py-0.5">
                            {key}: <span className="font-extrabold text-navy">{val}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Risk Info Sidebar Frame */}
            <div className="space-y-6">
              {/* Scoring global */}
              <div className="p-5 rounded-3xl bg-navy text-white text-center space-y-4 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Score IA Réglementaire</span>
                  <div className="text-5xl font-black font-syne text-sky mt-2">{results.scoring_global.score}/100</div>
                </div>
                <div className="space-y-1.5 text-left border-t border-white/10 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Risque Global:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${getRiskColor(results.resume.niveau_risque_global)}`}>
                      {results.resume.niveau_risque_global}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Confiance IA:</span>
                    <span className="font-bold text-sky">{results.scoring_global.niveau_confiance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">PD Estimée:</span>
                    <span className="font-bold text-white font-mono">{results.scoring_global.pd_estimee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">LGD Estimée (à défaut):</span>
                    <span className="font-bold text-white font-mono">{results.scoring_global.lgd_estimee}</span>
                  </div>
                </div>
                <div className="text-[9px] text-white/40 text-justify leading-relaxed border-t border-white/5 pt-3">
                  <strong>Calcul: </strong>{results.scoring_global.calcul_detail}
                </div>
              </div>

              {/* Precomptabilisation and bucket summary IFRS 9 */}
              <div className="p-4 rounded-3xl border border-border bg-white shadow-sm space-y-4">
                <h4 className="text-xs font-black text-navy uppercase tracking-wider font-syne border-b border-border pb-2 flex items-center gap-1">
                  <Building2 size={14} className="text-sky" /> Alignement Normes IFRS 9
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold">Statut Test SPPI :</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {results.resume.sppi_statut.includes("Sain") ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <XOctagon size={16} className="text-red-500" />
                      )}
                      <span className="font-extrabold text-navy">{results.resume.sppi_statut}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {results.ifrs9.test_sppi.consequence_comptable}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-[10px] font-bold">Bucket Probabiliste ECL :</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        results.resume.bucket_anticipe === 'Bucket 1' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 font-extrabold'
                      }`}>
                        {results.resume.bucket_anticipe}
                      </span>
                      <span className="font-bold text-navy text-[11px]">{results.ifrs9.classification_bucket.horizon_ecl}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {results.ifrs9.classification_bucket.justification}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IFRS 9 Complex prospective calibrations section */}
          <div className="p-6 rounded-3xl border border-border bg-mist/10 space-y-4">
            <h4 className="text-sm font-black text-navy uppercase tracking-wider font-syne flex items-center gap-2 border-b border-border pb-2">
              <Percent size={18} className="text-sky" /> 4. Analyse de Dégradation Prospective & Forward-Looking
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              {/* SPPI clauses checklist */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-navy/60">Test SPPI d'Éligibilité</span>
                <div className="bg-white p-3.5 rounded-2xl border border-border text-xs space-y-2 min-h-[140px]">
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground list-none pl-0">
                    {results.ifrs9.test_sppi.clauses_evaluees.map((c, i) => (
                      <li key={i} className="flex gap-1.5 items-start">
                        <CheckCircle2 size={12} className="text-sky mt-0.5 flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Forward look multi scenarios */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-navy/60">Scénarios Économiques (Tunisie)</span>
                <div className="bg-white p-3.5 rounded-2xl border border-border text-xs space-y-1.5 min-h-[140px]">
                  <div>
                    <span className="text-[10px] font-bold text-navy">Pondération Centrale: </span>
                    <p className="text-[10px] text-muted-foreground">{results.ifrs9.forward_looking.scenario_central}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-red-700">Pondération Défavorable: </span>
                    <p className="text-[10px] text-muted-foreground">{results.ifrs9.forward_looking.scenario_baissier}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 font-syne text-xs">Ajustement PD: </span>
                    <p className="text-[10px] text-muted-foreground italic">{results.ifrs9.forward_looking.impact_pd}</p>
                  </div>
                </div>
              </div>

              {/* Restructuring check */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-navy/60">Restructurations & Modification Contractuelle</span>
                <div className="bg-white p-3.5 rounded-2xl border border-border text-xs space-y-2 min-h-[140px]">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {results.ifrs9.modifications.test_decomptabilisation}
                  </p>
                  <div className="text-[10px] p-2 bg-yellow-50 text-amber-700 border border-yellow-200 rounded-xl leading-snug">
                    <strong>Impact comptable : </strong> {results.ifrs9.modifications.impact_resultat || 'Sans impact.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Red flags and Compensating factors */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" />
                Facteurs de Risques & Compensatoires
              </h4>
              <div className="space-y-2">
                {results.red_flags.map((rf, i) => (
                  <div key={i} className="p-3 bg-red-50/50 border border-red-200 rounded-2xl text-xs flex gap-2">
                    <span className="text-[10px] font-bold uppercase text-red-700 bg-white border border-red-100 rounded px-1.5 py-0.5">{rf.niveau}</span>
                    <div>
                      <strong className="text-navy">{rf.type}: </strong>
                      <span className="text-muted-foreground text-[11px]">{rf.description} (<span className="text-red-700 font-mono font-extrabold">{rf.impact_score}</span>)</span>
                    </div>
                  </div>
                ))}
                {results.facteurs_favorables.map((ff, i) => (
                  <div key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs flex gap-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-white border border-emerald-100 rounded px-1.5 py-0.5">Note +</span>
                    <div>
                      <strong className="text-navy">{ff.type}: </strong>
                      <span className="text-muted-foreground text-[11px]">{ff.description} (<span className="text-emerald-700 font-mono font-extrabold">{ff.impact_score}</span>)</span>
                    </div>
                  </div>
                ))}
                {results.red_flags.length === 0 && results.facteurs_favorables.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun facteur d'alerte spécifique ou compensatoire détecté.</p>
                )}
              </div>
            </div>

            {/* Suggested validation conditions */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-sky" />
                Conditions & Sûretés suggérées
              </h4>
              <div className="space-y-2">
                {results.conditions_suggerees.map((cond, i) => (
                  <div key={i} className="p-3 bg-white border border-border rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cond.priorite === 'Obligatoire' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                      }`}>{cond.priorite}</span>
                      <span className="text-[10px] text-muted-foreground">{cond.type}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{cond.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Committee electronic signature mock simulator */}
          <div className="p-6 rounded-3xl border border-sky/20 bg-sky/5 space-y-4 print:hidden">
            <h4 className="text-sm font-black text-navy uppercase tracking-wider font-syne flex items-center gap-1.5 border-b border-sky/15 pb-2">
              <FileSignature size={18} className="text-sky animate-bounce" />
              5. Espace de Validation & Comité d'Octroi Virtuel
            </h4>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase text-navy">Signer et Viser le Dossier (Rôle : {ROLES_CONFIG.find(r => r.value === currentRole)?.label})</span>
                
                <div className="space-y-2.5">
                  <textarea
                    value={opinionInput}
                    onChange={(e) => setOpinionInput(e.target.value)}
                    placeholder="Saisissez vos observations, validations, conditions d'intérêt complémentaires à ajouter au dossier..."
                    rows={3}
                    className="w-full p-2.5 text-xs border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-sky bg-white"
                  />

                  {currentRole === 'risk_manager' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="stress_check"
                        checked={stressBufferChecked}
                        onChange={(e) => setStressBufferChecked(e.target.checked)}
                        className="rounded text-sky focus:ring-sky"
                      />
                      <label htmlFor="stress_check" className="text-[11px] text-muted-foreground font-bold leading-none">
                        Recommander un surplus de provisionnement prudentiel de 1.5% (Stress Test)
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => registerDecisionStep('APPROVED')}
                      className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1"
                    >
                      <UserCheck size={14} /> Viser / Approuver
                    </button>
                    <button
                      onClick={() => registerDecisionStep('AMENDED')}
                      className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center"
                    >
                      Amender Sûretés
                    </button>
                    <button
                      onClick={() => registerDecisionStep('REJECTED')}
                      className="py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation tracking trail */}
              <div className="space-y-3 border-l border-border pl-6">
                <span className="text-[10px] font-bold uppercase text-navy">Piste de Comptes-rendus & Avis</span>
                
                <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                  {committeeLogs.map((log, index) => (
                    <div key={index} className="p-2.5 bg-white border border-border rounded-xl text-xs relative space-y-1">
                      <div className="flex justify-between">
                        <span className="font-extrabold text-navy">{log.label}</span>
                        <span className={`text-[9px] font-black uppercase px-2 rounded-lg border ${
                          log.decision === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                        }`}>{log.decision === 'APPROVED' ? 'Vois Approuvé' : 'Amende'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        "{log.opinion}"
                      </p>
                      {log.stressBuffer && (
                        <div className="text-[9px] text-red-600 font-bold bg-red-50 p-1 rounded">
                          ★ Provisions de stress recommandées.
                        </div>
                      )}
                      <div className="text-[8px] text-muted-foreground text-right font-mono pr-1">
                        {log.timestamp}
                      </div>
                    </div>
                  ))}
                  
                  {committeeLogs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mt-4 text-center">Aucun avis formulé à cette étape. Renseignez et signez ci-contre.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit trail footer */}
          <div className="bg-mist/30 p-4 rounded-3xl border border-border flex flex-col md:flex-row justify-between text-[10px] text-muted-foreground gap-3">
            <div>
              <strong>Piste d'Audit : </strong> {results.audit_trail.logique_decisionnelle}
            </div>
            <div className="font-mono">
              Hypothèses : {results.audit_trail.hypotheses_appliquees.join(' | ')}
            </div>
            <div>
              Ver: <span className="font-bold">{results.audit_trail.version_moteur}</span> | {results.audit_trail.timestamp_analyse}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
