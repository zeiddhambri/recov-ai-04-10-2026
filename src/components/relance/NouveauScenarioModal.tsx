import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  RelanceScenario, RelanceEtape, RelanceCanal, canalConfig,
} from '@/lib/relance';
import { ClientClassification, classificationConfig } from '@/lib/scoring';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (scenario: RelanceScenario) => void;
}

const canauxOptions: RelanceCanal[] = ['sms', 'email', 'whatsapp', 'appel'];
const classOptions: ClientClassification[] = ['fiable', 'a_surveiller', 'a_risque'];

export default function NouveauScenarioModal({ open, onClose, onCreate }: Props) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [cibles, setCibles] = useState<ClientClassification[]>(['fiable']);
  const [arretSiPaiement, setArretSiPaiement] = useState(true);
  const [actif, setActif] = useState(true);
  const [etapes, setEtapes] = useState<RelanceEtape[]>([
    { id: crypto.randomUUID(), jour: -3, canal: 'sms', titre: 'Rappel avant échéance', message: 'Votre échéance approche.', estObligatoire: true },
  ]);

  const reset = () => {
    setNom(''); setDescription(''); setCibles(['fiable']);
    setArretSiPaiement(true); setActif(true);
    setEtapes([{ id: crypto.randomUUID(), jour: -3, canal: 'sms', titre: 'Rappel', message: '', estObligatoire: true }]);
  };

  const addEtape = () => setEtapes([...etapes, {
    id: crypto.randomUUID(), jour: 1, canal: 'email', titre: '', message: '', estObligatoire: false,
  }]);

  const updateEtape = (id: string, patch: Partial<RelanceEtape>) =>
    setEtapes(etapes.map(e => e.id === id ? { ...e, ...patch } : e));

  const removeEtape = (id: string) => setEtapes(etapes.filter(e => e.id !== id));

  const toggleCible = (c: ClientClassification) =>
    setCibles(cibles.includes(c) ? cibles.filter(x => x !== c) : [...cibles, c]);

  const handleSubmit = () => {
    if (!nom.trim()) { toast.error('Le nom est requis'); return; }
    if (etapes.length === 0) { toast.error('Ajoutez au moins une étape'); return; }
    if (cibles.length === 0) { toast.error('Sélectionnez au moins une classification cible'); return; }
    const sc: RelanceScenario = {
      id: `sc-${Date.now()}`,
      nom: nom.trim(),
      description: description.trim() || 'Scénario personnalisé',
      cibleClassification: cibles,
      arretSiPaiement,
      actif,
      etapes: etapes.map(e => ({ ...e, titre: e.titre.trim() || `Étape J${e.jour >= 0 ? '+' : ''}${e.jour}` })),
    };
    onCreate(sc);
    toast.success('Scénario créé', { description: `${sc.nom} • ${sc.etapes.length} étape(s)` });
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-3xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center">
                  <Zap size={20} className="text-sky" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-navy font-syne">Nouveau scénario</h2>
                  <p className="text-xs text-muted-foreground">Configurez les étapes de relance multicanal</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-navy mb-1.5 block">Nom du scénario *</label>
                  <input value={nom} onChange={e => setNom(e.target.value)}
                    placeholder="Ex: Relance Premium"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky" />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy mb-1.5 block">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    rows={2} placeholder="Décrivez l'objectif de ce scénario..."
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-navy mb-2 block">Classifications cibles *</label>
                <div className="flex flex-wrap gap-2">
                  {classOptions.map(c => (
                    <button key={c} type="button" onClick={() => toggleCible(c)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        cibles.includes(c)
                          ? "bg-sky text-white border-sky"
                          : "bg-background text-muted-foreground border-border hover:border-sky")}>
                      {classificationConfig[c].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={arretSiPaiement} onChange={e => setArretSiPaiement(e.target.checked)}
                    className="rounded" />
                  <span className="text-navy font-medium">Arrêter si paiement</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={actif} onChange={e => setActif(e.target.checked)}
                    className="rounded" />
                  <span className="text-navy font-medium">Activer immédiatement</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-navy">Étapes de relance *</label>
                  <button onClick={addEtape} type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky/10 text-sky text-xs font-bold hover:bg-sky/20 transition-all">
                    <Plus size={14} /> Ajouter étape
                  </button>
                </div>
                <div className="space-y-3">
                  {etapes.map((e, idx) => (
                    <div key={e.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">Étape {idx + 1}</span>
                        {etapes.length > 1 && (
                          <button type="button" onClick={() => removeEtape(e.id)}
                            className="p-1 hover:bg-destructive/10 text-destructive rounded">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Jour</label>
                          <input type="number" value={e.jour} onChange={ev => updateEtape(e.id, { jour: parseInt(ev.target.value) || 0 })}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Canal</label>
                          <select value={e.canal} onChange={ev => updateEtape(e.id, { canal: ev.target.value as RelanceCanal })}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-sm">
                            {canauxOptions.map(c => (
                              <option key={c} value={c}>{canalConfig[c].emoji} {canalConfig[c].label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Titre</label>
                        <input value={e.titre} onChange={ev => updateEtape(e.id, { titre: ev.target.value })}
                          placeholder="Ex: Rappel post-échéance"
                          className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Message</label>
                        <textarea value={e.message} onChange={ev => updateEtape(e.id, { message: ev.target.value })}
                          rows={2} placeholder="Variables disponibles : {montant}, {nom}, {date}"
                          className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-sm" />
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={e.estObligatoire}
                          onChange={ev => updateEtape(e.id, { estObligatoire: ev.target.checked })} />
                        <span className="text-navy">Étape obligatoire</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/30">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all">
                Annuler
              </button>
              <button onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky text-white text-sm font-bold hover:bg-sky/90 shadow-lg shadow-sky/20 transition-all">
                <Zap size={16} /> Créer le scénario
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
