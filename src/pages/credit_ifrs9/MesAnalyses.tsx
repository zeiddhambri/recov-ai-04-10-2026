import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Trash2, 
  Eye, 
  Building2, 
  Coins, 
  Briefcase, 
  Scale, 
  Calendar, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  FileCheck,
  FileSignature,
  FileQuestion,
  TrendingDown,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AnalysisItem {
  id: string;
  nom_contrepartie: string;
  modelType: 'banque' | 'leasing' | 'microfinance' | 'factoring';
  montant: number;
  date: string;
  score: number;
  decision: string;
  bucket: string;
  sppi: string;
  logs: any[];
  formDump: any;
  resultsDump: any;
}

// Excellent seeded historical mock cases
const SEEDED_HISTORICAL: AnalysisItem[] = [
  {
    id: "ANL-8192",
    nom_contrepartie: "Sté El-Mouez de Transport (Tunis)",
    modelType: "leasing",
    montant: 145000,
    date: "2026-05-24T10:14:00Z",
    score: 72,
    decision: "Acceptation conditionnelle",
    bucket: "Bucket 2",
    sppi: "Sain (SPPI Passé)",
    logs: [
      {
        role: "analyste",
        label: "Analyste Crédit",
        decision: "APPROVED",
        opinion: "Dossier viable avec un bon plan de facturation de transport, mais retard technique de 35j à surveiller.",
        timestamp: "24/05/2026 09:30:00"
      },
      {
        role: "risk_manager",
        label: "Risk Manager / Dépt. Risques",
        decision: "APPROVED",
        opinion: "Accord favorisé sous réserve absolue de caution mutuelle des dirigeants et hypothèque maritime.",
        stressBuffer: true,
        timestamp: "24/05/2026 10:14:00"
      }
    ],
    formDump: {},
    resultsDump: {
      piliers: [
        { id: 1, nom: "Pilier 1 : Situation Professionnelle", score_numerique: 75, score_qualitatif: "Acceptable" },
        { id: 2, nom: "Pilier 2 : Structure Financement", score_numerique: 80, score_qualitatif: "Fort" },
        { id: 3, nom: "Pilier 3 : Flux Financiers / DSCR", score_numerique: 68, score_qualitatif: "Acceptable" },
        { id: 4, nom: "Pilier 4 : Sûretés Réelles / LTV", score_numerique: 75, score_qualitatif: "Acceptable" },
        { id: 5, nom: "Pilier 5 : Comportement Crédit", score_numerique: 55, score_qualitatif: "Fragile" }
      ],
      audit_trail: {
        logique_decisionnelle: "Modèle prudentiel standard de crédit-bail. Validé BCT.",
        version_moteur: "2.14.0",
        timestamp_analyse: "2026-05-24"
      }
    }
  },
  {
    id: "ANL-4201",
    nom_contrepartie: "Amel Bouhlel (Retail)",
    modelType: "banque",
    montant: 30000,
    date: "2026-05-28T14:45:00Z",
    score: 92,
    decision: "Acceptation favorable",
    bucket: "Bucket 1",
    sppi: "Sain (SPPI Passé)",
    logs: [
      {
        role: "analyste",
        label: "Analyste Crédit",
        decision: "APPROVED",
        opinion: "Fonctionnaire titulaire de l'Éducation Nationale. Taux d'endettement à 28%. Feu vert d'octroi.",
        timestamp: "28/05/2026 14:45:00"
      }
    ],
    formDump: {},
    resultsDump: {
      piliers: [
        { id: 1, nom: "Pilier 1 : Situation Professionnelle", score_numerique: 95, score_qualitatif: "Fort" },
        { id: 2, nom: "Pilier 2 : Structure Financement", score_numerique: 90, score_qualitatif: "Fort" },
        { id: 3, nom: "Pilier 3 : Flux Financiers / DSCR", score_numerique: 88, score_qualitatif: "Fort" },
        { id: 4, nom: "Pilier 4 : Sûretés Réelles / LTV", score_numerique: 90, score_qualitatif: "Fort" },
        { id: 5, nom: "Pilier 5 : Comportement Crédit", score_numerique: 95, score_qualitatif: "Fort" }
      ],
      audit_trail: {
        logique_decisionnelle: "Modèle standard retail. Validé BCT.",
        version_moteur: "2.14.0",
        timestamp_analyse: "2026-05-28"
      }
    }
  },
  {
    id: "ANL-1304",
    nom_contrepartie: "STE Tunisienne d'Import / Export Sarl",
    modelType: "factoring",
    montant: 180000,
    date: "2026-05-15T08:22:00Z",
    score: 42,
    decision: "Recommandation défavorable",
    bucket: "Bucket 3",
    sppi: "Sain (SPPI Passé)",
    logs: [
      {
        role: "analyste",
        label: "Analyste Crédit",
        decision: "REJECTED",
        opinion: "Clairement en retard de plus de 110 jours de paiement sur l'acheteur principal, sans aucun collatéral compensatoire. Risque élevé de sinistre.",
        timestamp: "15/05/2026 08:22:00"
      }
    ],
    formDump: {},
    resultsDump: {
      piliers: [
        { id: 1, nom: "Pilier 1 : Situation Professionnelle", score_numerique: 40, score_qualitatif: "Critique" },
        { id: 2, nom: "Pilier 2 : Structure Financement", score_numerique: 50, score_qualitatif: "Fragile" },
        { id: 3, nom: "Pilier 3 : Flux Financiers / DSCR", score_numerique: 38, score_qualitatif: "Critique" },
        { id: 4, nom: "Pilier 4 : Sûretés Réelles / LTV", score_numerique: 45, score_qualitatif: "Critique" },
        { id: 5, nom: "Pilier 5 : Comportement Crédit", score_numerique: 30, score_qualitatif: "Critique" }
      ],
      audit_trail: {
        logique_decisionnelle: "Modèle factoring pro. Validé BCT.",
        version_moteur: "2.14.0",
        timestamp_analyse: "2026-05-15"
      }
    }
  }
];

export default function MesAnalyses({ currentRole, initialTab }: { currentRole: string; initialTab: string }) {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = () => {
    try {
      const stored = localStorage.getItem('credit_analyses_history');
      if (stored) {
        setAnalyses(JSON.parse(stored));
      } else {
        // Pre-seed mock data so the platform has lifelike entries immediately
        localStorage.setItem('credit_analyses_history', JSON.stringify(SEEDED_HISTORICAL));
        setAnalyses(SEEDED_HISTORICAL);
      }
    } catch (e) {
      console.error(e);
      setAnalyses(SEEDED_HISTORICAL);
    }
  };

  const deleteAnalysis = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = analyses.filter(item => item.id !== id);
      setAnalyses(updated);
      localStorage.setItem('credit_analyses_history', JSON.stringify(updated));
      toast({
        title: "Analyse archivée supprimée",
        description: `Le dossier d'ID ${id} a été effacé définitivement de la base d'historique.`
      });
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filtered = analyses.filter((item) => {
    const matchesSearch = item.nom_contrepartie.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.modelType === filterType;
    return matchesSearch && matchesType;
  });

  const getModelBadge = (type: string) => {
    switch (type) {
      case 'banque':
        return { label: 'Banque', icon: <Building2 size={12} />, bg: 'bg-indigo-50 text-indigo-700 border-indigo-150' };
      case 'leasing':
        return { label: 'Leasing', icon: <Coins size={12} />, bg: 'bg-emerald-50 text-emerald-700 border-emerald-150' };
      case 'microfinance':
        return { label: 'Microfinance', icon: <Briefcase size={12} />, bg: 'bg-amber-50 text-amber-700 border-amber-150' };
      default:
        return { label: 'Factoring', icon: <Scale size={12} />, bg: 'bg-sky-50 text-sky-700 border-sky-150' };
    }
  };

  const getDecisionStyles = (d: string) => {
    switch (d) {
      case 'Acceptation favorable':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'Acceptation conditionnelle':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Révision approfondie requise':
        return 'bg-sky-50 text-sky-800 border-sky-100';
      default:
        return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  return (
    <div id="analyses-history-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-navy font-syne">Registre des Analyses d'Octroi</h2>
          <p className="text-xs text-muted-foreground">Historique d'aide à la décision prudentielle et de provisions calculées.</p>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher nom, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-mist/40 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-sky font-semibold text-navy placeholder:text-muted-foreground/60"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-mist/40 border border-border text-xs focus:outline-none font-semibold text-navy"
          >
            <option value="all">Filtre: Tous les Segments</option>
            <option value="banque">Banque</option>
            <option value="leasing">Leasing</option>
            <option value="microfinance">Microfinance</option>
            <option value="factoring">Factoring</option>
          </select>
        </div>
      </div>

      {/* Structured File Table List */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-mist/20 text-[10px] font-bold text-navy uppercase tracking-widest border-b border-border">
                <th className="p-4">ID & Contrepartie</th>
                <th className="p-4">Date de calcul</th>
                <th className="p-4">Segment</th>
                <th className="p-4 text-right">Encours (TND)</th>
                <th className="p-4 text-center">Score / ECL Bucket</th>
                <th className="p-4">Avis IA</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                const mConf = getModelBadge(item.modelType);
                return (
                  <>
                    <tr 
                      key={item.id} 
                      onClick={() => toggleExpand(item.id)}
                      className={`border-b border-border cursor-pointer transition-colors ${
                        isExpanded ? 'bg-mist/10' : 'hover:bg-mist/30'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">{item.id}</span>
                          <span className="font-extrabold text-navy text-sm font-syne">{item.nom_contrepartie}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          {new Date(item.date).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 border rounded-lg ${mConf.bg}`}>
                          {mConf.icon}
                          {mConf.label}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-xs font-black text-navy">
                        {item.montant.toLocaleString('fr-FR')} TND
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-sky">{item.score}/100</span>
                          <span className={`text-[8px] font-bold px-1.5 rounded mt-0.5 uppercase ${
                            item.bucket === 'Bucket 1' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{item.bucket}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block text-[10px] font-bold px-2 py-1 border rounded-full ${getDecisionStyles(item.decision)}`}>
                          {item.decision}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-1 px-2.5 rounded bg-mist border border-border hover:bg-navy hover:text-white text-navy text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Eye size={12} />
                            Détails
                          </button>
                          <button
                            onClick={(e) => deleteAnalysis(item.id, e)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                            title="Supprimer d'historique"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable subview drawer panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-border">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-6 bg-slate-50/50 space-y-4"
                            >
                              <div className="grid md:grid-cols-3 gap-6">
                                {/* Left stats list */}
                                <div className="space-y-2.5">
                                  <h4 className="text-[11px] font-black uppercase text-navy/50 tracking-wider">Constitution Prudentielle</h4>
                                  <div className="bg-white p-3.5 border border-border rounded-xl space-y-2">
                                    {item.resultsDump?.piliers?.map((p: any) => (
                                      <div key={p.id} className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-100 last:border-none">
                                        <span className="text-muted-foreground font-medium text-[11px] truncate max-w-[200px]">{p.nom}</span>
                                        <span className={`font-mono font-bold px-2 rounded-md ${
                                          p.score_numerique >= 80 ? 'bg-emerald-50 text-emerald-700' : p.score_numerique >= 60 ? 'bg-sky-50 text-sky-700' : 'bg-red-50 text-red-700'
                                        }`}>{p.score_numerique}%</span>
                                      </div>
                                    ))}
                                    {(!item.resultsDump?.piliers) && (
                                      <p className="text-xs text-muted-foreground italic">Aucune information détaillée des piliers.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Auditing trace */}
                                <div className="space-y-2.5">
                                  <h4 className="text-[11px] font-black uppercase text-navy/50 tracking-wider">Ciblage & Piste d'Audit</h4>
                                  <div className="bg-white p-3.5 border border-border rounded-xl text-xs space-y-2 min-h-[145px] flex flex-col justify-between">
                                    <div>
                                      <div className="flex justify-between mb-1 text-[10px]">
                                        <span className="text-muted-foreground">Statut SPPI:</span>
                                        <span className="font-extrabold text-navy">{item.sppi}</span>
                                      </div>
                                      <div className="flex justify-between text-[10px]">
                                        <span className="text-muted-foreground">Norme Précédente :</span>
                                        <span className="font-extrabold text-navy">IAS 39 classé</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                                        Analyse conforme aux directives IFRS 9 applicables aux établissements financiers en Tunisie.
                                      </p>
                                    </div>
                                    <div className="border-t border-slate-100 pt-2 text-[9px] text-muted-foreground text-right italic font-mono">
                                      Ver : {item.resultsDump?.audit_trail?.version_moteur || '2.1.0'}
                                    </div>
                                  </div>
                                </div>

                                {/* Validation logs */}
                                <div className="space-y-2.5">
                                  <h4 className="text-[11px] font-black uppercase text-navy/50 tracking-wider flex items-center gap-1">
                                    <FileSignature size={12} />
                                    Visas & Signatures Comité
                                  </h4>
                                  <div className="bg-white p-3.5 border border-border rounded-xl text-xs space-y-2 min-h-[145px] max-h-[200px] overflow-y-auto">
                                    {item.logs?.map((l: any, idx: number) => (
                                      <div key={idx} className="p-2 border border-slate-100 bg-slate-50 rounded-xl space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <strong className="text-navy">{l.label}</strong>
                                          <span className="text-emerald-700 bg-emerald-50 px-1.5 rounded text-[8px] font-bold">APPROUVÉ</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">"{l.opinion}"</p>
                                        <div className="text-[8px] text-right font-mono text-muted-foreground">{l.timestamp}</div>
                                      </div>
                                    ))}
                                    {(!item.logs || item.logs.length === 0) && (
                                      <p className="text-xs text-muted-foreground italic text-center py-6">Pas d'avis officiels enregistrés.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-muted-foreground italic">
                    Aucune analyse de crédit archivée ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
