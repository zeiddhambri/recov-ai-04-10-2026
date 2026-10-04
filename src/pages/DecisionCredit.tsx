import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Brain, Sparkles, ArrowLeft, AlertTriangle, CheckCircle2, ShieldCheck,
  TrendingUp, FileText, Gauge, Scale, Loader2, AlertCircle, Info,
} from 'lucide-react';

type Dossier = Record<string, string | number>;
type Analysis = any;

const initialDossier: Dossier = {
  type_client: 'particulier', client_id: '', age_anciennete: '', situation_pro: '',
  secteur: '', forme_juridique: '',
  produit: 'pret_immobilier', montant: 0, devise: 'TND', duree_mois: 0,
  objet: '', taux_demande: '',
  revenus: 0, charges: 0, endettement_existant: 0, apport: 0,
  ca: 0, ebitda: 0, fonds_propres: 0,
  type_garantie: '', valeur_garantie: 0, qualite_surete: '',
  historique_credit: '', score_credit: '', incidents_12m: '', anciennete_relation: '',
  extras: '',
};

const decisionColor: Record<string, { bg: string; text: string; border: string }> = {
  'Acceptation favorable': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Acceptation conditionnelle': { bg: 'bg-sky/10', text: 'text-sky', border: 'border-sky/30' },
  'Révision approfondie requise': { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/30' },
  'Recommandation défavorable': { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
};

const niveauColor: Record<string, string> = {
  'Faible': 'text-green-600 bg-green-50',
  'Modéré': 'text-sky bg-sky/10',
  'Élevé': 'text-gold bg-gold/10',
  'Critique': 'text-destructive bg-destructive/10',
};

const qualitatifColor: Record<string, string> = {
  'Fort': 'text-green-600 bg-green-50',
  'Acceptable': 'text-sky bg-sky/10',
  'Fragile': 'text-gold bg-gold/10',
  'Critique': 'text-destructive bg-destructive/10',
};

export default function DecisionCredit() {
  const [dossier, setDossier] = useState<Dossier>(initialDossier);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const update = (k: string, v: string | number) => setDossier({ ...dossier, [k]: v });

  const analyser = async () => {
    if (!dossier.produit || !dossier.montant || !dossier.duree_mois) {
      toast.error('Veuillez renseigner produit, montant et durée.');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      toast.info('Analyse du dossier en cours...');
      const { data, error } = await supabase.functions.invoke('credit-decision', {
        body: { dossier: { ...dossier, id: `D-${Date.now()}` } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data);
      toast.success('Analyse terminée avec succès');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l’analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/relances" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-sky transition-colors mb-2">
            <ArrowLeft size={14} /> Retour au Moteur de Relance
          </Link>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne flex items-center gap-3">
            <Brain className="text-sky" size={28} />
            Moteur de Prise de Décision Crédit
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aide à la décision IA — 5 piliers prudentiels Bâle III · Validation humaine obligatoire.
          </p>
        </div>
        <button onClick={analyser} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-xl text-sm font-bold hover:bg-sky/90 transition-all shadow-lg shadow-sky/20 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analyse...' : 'Analyser le dossier'}
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gold/10 border border-gold/30">
        <AlertTriangle size={18} className="text-gold shrink-0 mt-0.5" />
        <p className="text-xs text-navy">
          <strong>Outil d'aide à la décision uniquement.</strong> Toute recommandation est assistée par IA, révisable par un analyste humain, et soumise à validation institutionnelle obligatoire. Non opposable comme décision autonome.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormCard title="Identification" icon={FileText}>
          <Field label="Type client">
            <select value={dossier.type_client as string} onChange={e => update('type_client', e.target.value)} className={inputCls}>
              <option value="particulier">Particulier</option>
              <option value="pme">PME</option>
              <option value="grande_entreprise">Grande entreprise</option>
              <option value="institution">Institution</option>
            </select>
          </Field>
          <Field label="Identifiant client"><input value={dossier.client_id as string} onChange={e => update('client_id', e.target.value)} className={inputCls} /></Field>
          <Field label="Âge / Ancienneté"><input value={dossier.age_anciennete as string} onChange={e => update('age_anciennete', e.target.value)} className={inputCls} placeholder="ex: 42 ans / 5 ans" /></Field>
          <Field label="Situation professionnelle"><input value={dossier.situation_pro as string} onChange={e => update('situation_pro', e.target.value)} className={inputCls} placeholder="ex: CDI cadre" /></Field>
          <Field label="Secteur d'activité"><input value={dossier.secteur as string} onChange={e => update('secteur', e.target.value)} className={inputCls} placeholder="ex: Industrie agroalimentaire" /></Field>
          <Field label="Forme juridique"><input value={dossier.forme_juridique as string} onChange={e => update('forme_juridique', e.target.value)} className={inputCls} placeholder="ex: SARL, SA" /></Field>
        </FormCard>

        <FormCard title="Financement demandé" icon={TrendingUp}>
          <Field label="Produit">
            <select value={dossier.produit as string} onChange={e => update('produit', e.target.value)} className={inputCls}>
              <option value="pret_immobilier">Prêt immobilier</option>
              <option value="pret_conso">Crédit consommation</option>
              <option value="pret_auto">Crédit auto</option>
              <option value="pret_pro">Prêt professionnel</option>
              <option value="leasing">Leasing / Crédit-bail</option>
              <option value="ligne_credit">Ligne de crédit</option>
            </select>
          </Field>
          <Field label="Montant (TND)"><input type="number" value={dossier.montant as number} onChange={e => update('montant', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Durée (mois)"><input type="number" value={dossier.duree_mois as number} onChange={e => update('duree_mois', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Taux demandé (%)"><input value={dossier.taux_demande as string} onChange={e => update('taux_demande', e.target.value)} className={inputCls} placeholder="ex: 8.5" /></Field>
          <Field label="Objet" full><textarea value={dossier.objet as string} onChange={e => update('objet', e.target.value)} className={cn(inputCls, "min-h-[60px]")} placeholder="Acquisition, investissement, BFR..." /></Field>
        </FormCard>

        <FormCard title="Situation financière" icon={Gauge}>
          <Field label="Revenus nets / mois"><input type="number" value={dossier.revenus as number} onChange={e => update('revenus', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Charges fixes / mois"><input type="number" value={dossier.charges as number} onChange={e => update('charges', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Endettement existant / mois"><input type="number" value={dossier.endettement_existant as number} onChange={e => update('endettement_existant', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Apport / Épargne"><input type="number" value={dossier.apport as number} onChange={e => update('apport', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="CA annuel (entreprise)"><input type="number" value={dossier.ca as number} onChange={e => update('ca', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="EBITDA"><input type="number" value={dossier.ebitda as number} onChange={e => update('ebitda', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Fonds propres"><input type="number" value={dossier.fonds_propres as number} onChange={e => update('fonds_propres', Number(e.target.value))} className={inputCls} /></Field>
        </FormCard>

        <FormCard title="Garanties & Historique" icon={ShieldCheck}>
          <Field label="Type collatéral"><input value={dossier.type_garantie as string} onChange={e => update('type_garantie', e.target.value)} className={inputCls} placeholder="Hypothèque, caution..." /></Field>
          <Field label="Valeur garantie (TND)"><input type="number" value={dossier.valeur_garantie as number} onChange={e => update('valeur_garantie', Number(e.target.value))} className={inputCls} /></Field>
          <Field label="Qualité juridique sûreté"><input value={dossier.qualite_surete as string} onChange={e => update('qualite_surete', e.target.value)} className={inputCls} placeholder="1er rang, 2e rang..." /></Field>
          <Field label="Historique crédit"><input value={dossier.historique_credit as string} onChange={e => update('historique_credit', e.target.value)} className={inputCls} placeholder="Sain, incidents..." /></Field>
          <Field label="Score bureau crédit"><input value={dossier.score_credit as string} onChange={e => update('score_credit', e.target.value)} className={inputCls} /></Field>
          <Field label="Incidents 12 mois"><input value={dossier.incidents_12m as string} onChange={e => update('incidents_12m', e.target.value)} className={inputCls} /></Field>
          <Field label="Ancienneté relation"><input value={dossier.anciennete_relation as string} onChange={e => update('anciennete_relation', e.target.value)} className={inputCls} placeholder="ex: 8 ans" /></Field>
          <Field label="Informations complémentaires" full><textarea value={dossier.extras as string} onChange={e => update('extras', e.target.value)} className={cn(inputCls, "min-h-[60px]")} /></Field>
        </FormCard>
      </div>

      {analysis && <AnalysisResult analysis={analysis} />}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all";

function FormCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-sky" />
        <h2 className="font-bold text-sm text-navy">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2")}>
      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const dec = decisionColor[analysis.recommandation?.decision] || decisionColor['Révision approfondie requise'];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header score */}
      <div className={cn("rounded-2xl border-2 p-6", dec.bg, dec.border)}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Décision recommandée</p>
            <h2 className={cn("text-2xl font-black font-syne mt-1", dec.text)}>{analysis.recommandation?.decision}</h2>
            <p className="text-sm text-navy mt-3 leading-relaxed">{analysis.resume?.recommandation_synthetique}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full", niveauColor[analysis.resume?.niveau_risque_global] || 'bg-muted')}>
                Risque {analysis.resume?.niveau_risque_global}
              </span>
              {analysis.recommandation?.escalade_requise && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full text-destructive bg-destructive/10 flex items-center gap-1">
                  <AlertTriangle size={11} /> Escalade requise
                </span>
              )}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div className={cn("w-24 h-24 rounded-2xl flex flex-col items-center justify-center", dec.bg, "border-2", dec.border)}>
              <p className={cn("text-3xl font-black font-syne", dec.text)}>{analysis.scoring_global?.score}</p>
              <p className="text-[10px] text-muted-foreground">/ 100</p>
            </div>
            <p className="text-[10px] mt-2 text-muted-foreground">Confiance {analysis.scoring_global?.niveau_confiance}%</p>
          </div>
        </div>
      </div>

      {/* Piliers */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
          <Scale size={16} className="text-sky" /> 5 Piliers Prudentiels
        </h3>
        <div className="space-y-3">
          {analysis.piliers?.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-navy/5 text-navy px-2 py-0.5 rounded">P{p.id} · {p.ponderation}%</span>
                  <h4 className="font-bold text-sm text-navy">{p.nom}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", qualitatifColor[p.score_qualitatif])}>{p.score_qualitatif}</span>
                  <span className="text-lg font-black text-navy font-syne">{p.score_numerique}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-3">
                <div className="h-full bg-sky rounded-full" style={{ width: `${p.score_numerique}%` }} />
              </div>
              <p className="text-xs text-navy">{p.analyse}</p>
              <p className="text-[11px] text-muted-foreground mt-2 italic">{p.justification}</p>
              {p.indicateurs_cles && Object.keys(p.indicateurs_cles).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(p.indicateurs_cles).map(([k, v]) => (
                    <span key={k} className="text-[10px] font-mono bg-mist px-2 py-1 rounded text-navy">
                      <span className="text-muted-foreground">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 font-mono bg-mist p-2 rounded">{analysis.scoring_global?.calcul_detail}</p>
      </div>

      {/* Red flags + facteurs favorables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-destructive" /> Signaux d'alerte ({analysis.red_flags?.length || 0})
          </h3>
          <div className="space-y-2">
            {analysis.red_flags?.length ? analysis.red_flags.map((f: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-mist">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", niveauColor[f.niveau])}>{f.niveau}</span>
                  <span className="text-[10px] text-muted-foreground">{f.type}</span>
                  {f.impact_score && <span className="text-[10px] font-mono text-destructive ml-auto">{f.impact_score}</span>}
                </div>
                <p className="text-xs text-navy">{f.description}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground italic">Aucun signal d'alerte critique détecté.</p>}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" /> Facteurs favorables ({analysis.facteurs_favorables?.length || 0})
          </h3>
          <div className="space-y-2">
            {analysis.facteurs_favorables?.length ? analysis.facteurs_favorables.map((f: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-green-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-green-700 bg-green-100">{f.type}</span>
                  {f.impact_score && <span className="text-[10px] font-mono text-green-700 ml-auto">+{f.impact_score}</span>}
                </div>
                <p className="text-xs text-navy">{f.description}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground italic">Aucun facteur favorable identifié.</p>}
          </div>
        </div>
      </div>

      {/* Conditions */}
      {analysis.conditions_suggerees?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-sky" /> Conditions suggérées
          </h3>
          <div className="space-y-2">
            {analysis.conditions_suggerees.map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-mist">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                  c.priorite === 'Obligatoire' ? 'text-destructive bg-destructive/10' :
                  c.priorite === 'Recommandé' ? 'text-sky bg-sky/10' : 'text-muted-foreground bg-muted')}>
                  {c.priorite}
                </span>
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">{c.type}</p>
                  <p className="text-xs text-navy">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Données manquantes */}
      {analysis.donnees_analysees?.donnees_manquantes?.length > 0 && (
        <div className="bg-gold/10 rounded-2xl border border-gold/30 p-5">
          <h3 className="font-bold text-sm text-navy mb-3 flex items-center gap-2">
            <Info size={16} className="text-gold" /> Données manquantes ({analysis.donnees_analysees.donnees_manquantes.length})
          </h3>
          <ul className="space-y-1">
            {analysis.donnees_analysees.donnees_manquantes.map((d: string, i: number) => (
              <li key={i} className="text-xs text-navy flex items-start gap-2">
                <span className="text-gold mt-0.5">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audit trail */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-bold text-sm text-navy mb-3 flex items-center gap-2">
          <FileText size={16} className="text-muted-foreground" /> Audit trail
        </h3>
        <div className="space-y-2 text-xs text-navy">
          <p><strong className="text-muted-foreground">Logique:</strong> {analysis.audit_trail?.logique_decisionnelle}</p>
          {analysis.audit_trail?.hypotheses_appliquees?.length > 0 && (
            <div>
              <strong className="text-muted-foreground">Hypothèses:</strong>
              <ul className="ml-4 mt-1 list-disc text-[11px]">
                {analysis.audit_trail.hypotheses_appliquees.map((h: string, i: number) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border mt-3">
            {analysis.audit_trail?.conformite} · v{analysis.audit_trail?.version_moteur} · {analysis.audit_trail?.timestamp_analyse}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
