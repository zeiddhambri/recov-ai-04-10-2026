import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sliders, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  AlertOctagon, 
  RefreshCw, 
  HelpCircle,
  Wrench
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ParametresMoteur() {
  // Prudentiel Pillar default configuration
  const [pillars, setPillars] = useState([
    { id: 1, name: "Pilier 1 : Situation Professionnelle & Capacité", weight: 25, label: "Situ. & Capacité d'Emprunt" },
    { id: 2, name: "Pilier 2 : Structure & Caractéristiques", weight: 25, label: "Caractéristiques Financement" },
    { id: 3, name: "Pilier 3 : Flux Financiers & DSCR", weight: 20, label: "Trésorerie / DSCR stable" },
    { id: 4, name: "Pilier 4 : Sûretés Réelles / Personnelles & LTV", weight: 15, label: "Garanties & Collatéral" },
    { id: 5, name: "Pilier 5 : Comportement & Antécédents (Bureau)", weight: 15, label: "Historique Crédit Bureau" }
  ]);

  // General rates regulatory constants
  const [tmm, setTmm] = useState("8.00");
  const [maxLtvPersonal, setMaxLtvPersonal] = useState("80");
  const [maxLtvCorporate, setMaxLtvCorporate] = useState("70");
  const [doyOverdueLimit, setDoyOverdueLimit] = useState("30");

  const handleWeightChange = (id: number, val: number) => {
    setPillars(prev => prev.map(p => p.id === id ? { ...p, weight: Number(val) } : p));
  };

  const handleSaveParameters = () => {
    // Audit check on weights sum
    const sum = pillars.reduce((acc, curr) => acc + curr.weight, 0);
    if (sum !== 100) {
      toast({
        title: "Calcul de pondération incorrect",
        description: `La somme des poids des 5 piliers prudentiels doit égaler précisément 100% (Actuel : ${sum}%). Veuillez recalibrer les poids.`,
        variant: "destructive"
      });
      return;
    }

    // Save parameters simulated success
    localStorage.setItem('credit_engine_tmm', tmm);
    localStorage.setItem('credit_engine_pillars_weight', JSON.stringify(pillars));
    
    toast({
      title: "Paramètres enregistrés",
      description: "Le barème d'octroi et de calibration IFRS 9 a été ré-étalonné avec succès.",
    });
  };

  const handleResetDefaults = () => {
    setPillars([
      { id: 1, name: "Pilier 1 : Situation Professionnelle & Capacité", weight: 25, label: "Situ. & Capacité d'Emprunt" },
      { id: 2, name: "Pilier 2 : Structure & Caractéristiques", weight: 25, label: "Caractéristiques Financement" },
      { id: 3, name: "Pilier 3 : Flux Financiers & DSCR", weight: 20, label: "Trésorerie / DSCR stable" },
      { id: 4, name: "Pilier 4 : Sûretés Réelles / Personnelles & LTV", weight: 15, label: "Garanties & Collatéral" },
      { id: 5, name: "Pilier 5 : Comportement & Antécédents (Bureau)", weight: 15, label: "Historique Crédit Bureau" }
    ]);
    setTmm("8.00");
    setMaxLtvPersonal("80");
    setMaxLtvCorporate("70");
    setDoyOverdueLimit("30");

    toast({
      title: "Valeurs d'usine restaurées",
      description: "Toutes les calibrations sont revenues aux barèmes prudentiels standards par défaut."
    });
  };

  const totalSum = pillars.reduce((acc, curr) => acc + curr.weight, 0);

  return (
    <div id="engine-parameters-container" className="space-y-8">
      {/* Introduction text */}
      <div>
        <h2 className="text-lg font-bold text-navy font-syne">Paramètres de Calibration du Moteur AI</h2>
        <p className="text-xs text-muted-foreground">Définition des seuils réglementaires BCT, des poids de scoring d'octroi et des limites de dégradation prudentielle.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Interactive Pillars weights config */}
        <div className="lg:col-span-2 bg-mist/20 p-6 rounded-3xl border border-border space-y-5 shadow-sm">
          <h3 className="text-sm font-black text-navy uppercase tracking-wider font-syne border-b border-border pb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Sliders className="text-sky" size={16} /> Pondération des 5 Piliers Prudentiels</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${
              totalSum === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
            }`}>
              Somme : <span className="font-extrabold">{totalSum}%</span>
            </span>
          </h3>

          <div className="space-y-4">
            {pillars.map((p) => (
              <div key={p.id} className="p-3 bg-white border border-border rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-navy text-[11.5px]">{p.name}</span>
                  <span className="font-mono bg-mist px-2.5 py-0.5 rounded border border-border font-extrabold text-sky">{p.weight}%</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={p.weight}
                    onChange={(e) => handleWeightChange(p.id, Number(e.target.value))}
                    className="w-full text-sky accent-sky h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border mt-3">
            <button
              onClick={handleResetDefaults}
              className="py-2 px-4 rounded-xl hover:bg-red-50 text-red-600 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Réinitialiser
            </button>
            <button
              onClick={handleSaveParameters}
              className="py-2.5 px-5 rounded-xl bg-navy hover:bg-slate-800 text-white transition-all text-xs font-black shadow-md flex items-center gap-1"
            >
              <Wrench size={13} />
              Enregistrer Calibration
            </button>
          </div>
        </div>

        {/* Right constant thresholds list */}
        <div className="bg-white p-6 rounded-3xl border border-border space-y-5 shadow-sm">
          <h3 className="text-sm font-black text-navy uppercase tracking-wider font-syne border-b border-border pb-3 flex items-center gap-1.5">
            <Percent className="text-sky" size={16} /> Seuils des Ratios BCT & IFRS 9
          </h3>

          <div className="space-y-4 text-xs">
            {/* TMM setup input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-bold text-navy">TMM Tunis de référence (BCT)</label>
                <HelpCircle size={12} className="text-muted-foreground cursor-help" title="Taux Moyen du Marché en vigueur en Tunisie." />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tmm}
                  onChange={(e) => setTmm(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-mist/30 rounded-xl pr-12 font-bold font-mono text-navy"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">%</span>
              </div>
            </div>

            {/* Max LTV Personal */}
            <div className="space-y-1 border-t border-slate-50 pt-3">
              <label className="font-bold text-navy">Limite Prudentielle LTV Particuliers</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxLtvPersonal}
                  onChange={(e) => setMaxLtvPersonal(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-mist/30 rounded-xl pr-12 font-bold font-mono text-navy"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">%</span>
              </div>
            </div>

            {/* Max LTV Corporate */}
            <div className="space-y-1 border-t border-slate-50 pt-3">
              <label className="font-bold text-navy">Limite Prudentielle LTV Entreprises (Corporate)</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxLtvCorporate}
                  onChange={(e) => setMaxLtvCorporate(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-mist/30 rounded-xl pr-12 font-bold font-mono text-navy"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">%</span>
              </div>
            </div>

            {/* Day limits ASRC */}
            <div className="space-y-1 border-t border-slate-50 pt-3">
              <label className="font-bold text-navy">Limite de Retard ASRC / Bucket 2 (Directives IFRS 9)</label>
              <div className="relative">
                <input
                  type="number"
                  value={doyOverdueLimit}
                  onChange={(e) => setDoyOverdueLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-mist/30 rounded-xl pr-12 font-bold font-mono text-navy"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Jours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
