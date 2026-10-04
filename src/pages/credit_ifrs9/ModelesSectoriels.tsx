import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  TreePine, 
  Truck, 
  MapPin, 
  FileWarning, 
  Scale,
  PieChart,
  Target
} from 'lucide-react';

const MACRO_VARIABLES = [
  { name: "Scénario Central (BCT)", pib: "+1.8%", chomeur: "16.1%", tmm: "8.0%", desc: "Scénario de référence fondé sur la stabilisation du cours des matières premières et une relance agricole modérée en Tunisie.", color: "border-sky/20 bg-sky/5 text-sky" },
  { name: "Scénario Favorable (Haussier)", pib: "+3.2%", chomeur: "14.5%", tmm: "7.5%", desc: "Accélération des reformes financières, reprise vigoureuse du tourisme d'affaires et baisse volontaire du taux directeur de la BCT.", color: "border-green-200 bg-green-50/50 text-green-700" },
  { name: "Scénario Choc (Baissier)", pib: "-0.5%", chomeur: "18.2%", tmm: "8.75%", desc: "Sécheresse agricole prolongée, inflation des biens intermédiaires de transport et durcissement monétaire défavorable.", color: "border-red-200 bg-red-50/50 text-red-700" },
];

const SECTORS_COEFFICIENT = [
  { name: "BTP & Immobilier", icon: <Building2 className="text-amber-500" size={18} />, coefficient: "1.45 (Risque Fort)", status: "Haute surveillance", desc: "Le secteur subit l'augmentation des matériaux importés et le resserrement des conditions d'octroi de crédits promoteur en Tunisie.", localFactor: "Haute sensibilité au TMM" },
  { name: "Agriculture & Huile d'Olive", icon: <TreePine className="text-emerald-500" size={18} />, coefficient: "0.85 (Risque Faible)", status: "Favorable", desc: "Secteur résilient, porté par la forte performance d'exportation de l'huile d'olive tunisienne sur le bassin méditerranéen.", localFactor: "Assujetti aux aléas climatiques régionaux" },
  { name: "Transports & Logistique", icon: <Truck className="text-indigo-500" size={18} />, coefficient: "1.10 (Risque Modéré)", status: "Stable", desc: "Stabilité des encours consolidés. Sensible néanmoins aux variations internationales du Brent.", localFactor: "Contrats étatiques majeurs (STEG)" },
  { name: "Industries Exportatrices / Textile", icon: <Target className="text-sky" size={18} />, coefficient: "0.95 (Risque Modéré)", status: "Favorable", desc: "Bonne dynamique des entreprises tournées vers l'Union Européenne soutenant un flux direct de devises saines.", localFactor: "Stabilité des revenus export" }
];

export default function ModelesSectoriels() {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);

  return (
    <div id="sector-models-container" className="space-y-8">
      {/* Introduction text */}
      <div>
        <h2 className="text-lg font-bold text-navy font-syne">Variables Macro-économiques & Modèles Sectoriels</h2>
        <p className="text-xs text-muted-foreground">Calibration prospective Forward-Looking tunisienne pour la pondération des probabilités de défaut (PD) selon les directives IFRS 9.</p>
      </div>

      {/* Tunisia Scenarios Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5 font-syne">
          <TrendingUp size={14} className="text-sky" />
          Projections Macro-économiques de Référence (BCT 2026)
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          {MACRO_VARIABLES.map((v, i) => (
            <div 
              key={i}
              onClick={() => setSelectedScenario(i)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${v.color} ${
                selectedScenario === i ? 'ring-2 ring-sky scale-[1.01] shadow-md' : 'opacity-85 hover:opacity-100 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black uppercase font-syne">{v.name}</span>
                {selectedScenario === i && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-navy text-white rounded-md">Sélectionné</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-navy font-mono mb-3 border-b border-border/40 pb-3">
                <div>
                  <div className="text-xs text-muted-foreground font-sans">Croiss. PIB</div>
                  <div className="text-sm font-black mt-0.5">{v.pib}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-sans">Chômage</div>
                  <div className="text-sm font-black mt-0.5">{v.chomeur}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-sans">Prév. TMM</div>
                  <div className="text-sm font-black mt-0.5">{v.tmm}</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sectorial Multipliers Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5 font-syne">
          <Scale size={14} className="text-sky" />
          Coefficients de Risques Sectoriels Prudentiels
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {SECTORS_COEFFICIENT.map((sec, i) => (
            <div key={i} className="p-4 bg-mist/25 hover:bg-mist/40 rounded-2xl border border-border flex gap-4 transition-all hover:scale-[1.01]">
              <div className="w-10 h-10 rounded-xl bg-white border border-border/60 flex items-center justify-center flex-shrink-0">
                {sec.icon}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-extrabold text-navy font-syne">{sec.name}</h4>
                    <span className="text-[9px] text-muted-foreground font-bold">{sec.localFactor}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    sec.status === 'Favorable' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : sec.status === 'Stable' ? 'bg-sky-50 border-sky-200 text-sky' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {sec.status}
                  </span>
                </div>
                <p className="text-[10.5px] leading-normal text-muted-foreground">
                  {sec.desc}
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] font-mono">
                  <span className="text-muted-foreground font-bold">Coefficient multiplicateur PD :</span>
                  <span className="font-extrabold text-navy bg-white px-2 py-0.5 rounded border border-border">{sec.coefficient}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
