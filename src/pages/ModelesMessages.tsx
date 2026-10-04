import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, MessageSquare, Mail, Send, Sparkles, Plus, Trash2, Edit2, 
  Copy, X, Globe, HelpCircle, FileText, Check, CheckSquare, RefreshCw, Layers
} from 'lucide-react';
import { AutomationStore } from '@/lib/automation-store';
import { MessageTemplate } from '@/types/automation';
import { toast } from '@/hooks/use-toast';

const categoryLabels: Record<string, string> = {
  standard_reminder: 'Rappel Standard',
  alert: 'Notification d\'Alerte d\'échéance',
  pre_litigation: 'Alerte Pré-contentieux',
  transactional: 'Mises à jour Transactionnelles'
};

const placeholderExplanations: Record<string, { label: string, testVal: string }> = {
  client_name: { label: 'Nom du client / Débiteur', testVal: 'STE ALPHA SARL' },
  montant: { label: 'Encours / Solde dû (TND)', testVal: '14 500' },
  date_echeance: { label: 'Date limite / d\'échéance', testVal: '05/06/2026' },
  dossier_id: { label: 'ID ou Numéro du dossier', testVal: 'DOS-2026-0442' }
};

export default function ModelesMessages() {
  // Store state
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => AutomationStore.getMessageTemplates());
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'sms' | 'email' | 'whatsapp'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTmpl, setEditingTmpl] = useState<Partial<MessageTemplate>>({});
  
  // Simulator state
  const [selectedTmpl, setSelectedTmpl] = useState<MessageTemplate | null>(() => templates[0] || null);
  const [selectedMockClient, setSelectedMockClient] = useState({
    client_name: 'STE JALEL & CIE',
    montant: '8 420',
    date_echeance: '15 Juin 2026',
    dossier_id: 'DOS-2026-0081'
  });

  const filteredTemplates = useMemo(() => {
    if (selectedChannel === 'all') return templates;
    return templates.filter(t => t.channel === selectedChannel);
  }, [templates, selectedChannel]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingTmpl({
      name: '',
      description: '',
      channel: 'sms',
      content: 'Bonjour {client_name}, nous constatons un solde débiteur de {montant} TND...',
      placeholders: ['client_name', 'montant'],
      category: 'standard_reminder',
      language: 'fr'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tmpl: MessageTemplate) => {
    setModalMode('edit');
    setEditingTmpl({ ...tmpl });
    setIsModalOpen(true);
  };

  const handleAddPlaceholderToContent = (placeholder: string) => {
    const textToAdd = `{${placeholder}}`;
    const currentContent = editingTmpl.content || '';
    setEditingTmpl({
      ...editingTmpl,
      content: currentContent + textToAdd,
      placeholders: Array.from(new Set([...(editingTmpl.placeholders || []), placeholder]))
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Supprimer définitivement ce modèle de message ?')) {
      AutomationStore.deleteMessageTemplate(id);
      const update = AutomationStore.getMessageTemplates();
      setTemplates(update);
      toast({ title: 'Modèle supprimé avec succès' });
      if (selectedTmpl?.id === id) {
        setSelectedTmpl(update[0] || null);
      }
    }
  };

  const handleDupliquer = (tmpl: MessageTemplate) => {
    const dupl = {
      ...tmpl,
      name: `${tmpl.name} (Dupliqué)`,
    };
    AutomationStore.addMessageTemplate(dupl);
    setTemplates(AutomationStore.getMessageTemplates());
    toast({ title: 'Modèle dupliqué !' });
  };

  const handleSaveTemplate = () => {
    if (!editingTmpl.name || !editingTmpl.content) {
      toast({
        title: 'Champs requis manquants',
        description: 'Veuillez saisir le nom et le corps du modèle.',
        variant: 'destructive'
      });
      return;
    }

    // Detect placeholders automatically
    const regEx = /\{([^}]+)\}/g;
    let match;
    const detected: string[] = [];
    while ((match = regEx.exec(editingTmpl.content)) !== null) {
      detected.push(match[1]);
    }
    const finalPlaceholders = Array.from(new Set(detected));

    if (modalMode === 'create') {
      const entry: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: editingTmpl.name,
        description: editingTmpl.description || '',
        channel: editingTmpl.channel || 'sms',
        subject: editingTmpl.subject || '',
        content: editingTmpl.content,
        category: editingTmpl.category || 'standard_reminder',
        language: editingTmpl.language || 'fr',
        placeholders: finalPlaceholders
      };
      
      const res = AutomationStore.addMessageTemplate(entry);
      setSelectedTmpl(res);
      toast({ title: 'Modèle de message créé !' });
    } else {
      const withDetected = {
        ...editingTmpl,
        placeholders: finalPlaceholders
      };
      AutomationStore.updateMessageTemplate(withDetected as MessageTemplate);
      setSelectedTmpl(withDetected as MessageTemplate);
      toast({ title: 'Modèle mis à jour !' });
    }

    setTemplates(AutomationStore.getMessageTemplates());
    setIsModalOpen(false);
  };

  // Compile real UI preview replacing tags
  const compiledPreview = useMemo(() => {
    if (!selectedTmpl) return 'Sélectionnez un modèle pour voir son rendu réels.';
    let result = selectedTmpl.content;
    result = result.replace(/{client_name}/g, selectedMockClient.client_name)
                   .replace(/{montant}/g, selectedMockClient.montant)
                   .replace(/{date_echeance}/g, selectedMockClient.date_echeance)
                   .replace(/{dossier_id}/g, selectedMockClient.dossier_id);
    return result;
  }, [selectedTmpl, selectedMockClient]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne flex items-center gap-2">
            Modèles de Messages <span className="bg-sky/15 text-sky text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">SMS / Mail / Whatsapp</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Créez des templates réutilisables hautement dynamiques avec placeholders automatiques.</p>
        </div>
        <div>
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95 shadow-md shadow-sky/15"
          >
            <Plus size={15} />
            Nouveau modèle de communication
          </button>
        </div>
      </div>

      {/* Screen Division: Models List & Real phone Mock Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Templates Directory Area */}
        <div className="xl:col-span-7 space-y-4">
          
          {/* Quick Selection Channels */}
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
            <span className="text-xs font-extrabold text-navy uppercase tracking-wider">Répertoires de supports</span>
            
            <div className="flex bg-mist p-1 rounded-xl gap-1">
              {([
                { key: 'all', label: 'Tous', icon: Layers },
                { key: 'sms', label: 'SMS', icon: MessageSquare },
                { key: 'email', label: 'Courriels', icon: Mail },
                { key: 'whatsapp', label: 'WhatsApp', icon: Send }
              ] as const).map(c => {
                const ItemIcon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedChannel(c.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      selectedChannel === c.key 
                        ? 'bg-navy text-white shadow-sm' 
                        : 'text-muted-foreground hover:bg-slate-200/50'
                    }`}
                  >
                    <ItemIcon size={11} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards list */}
          <div className="space-y-3">
            {filteredTemplates.map(tmpl => (
              <div 
                key={tmpl.id}
                onClick={() => setSelectedTmpl(tmpl)}
                className={`p-4 bg-card rounded-2xl border transition-all cursor-pointer flex justify-between items-start ${
                  selectedTmpl?.id === tmpl.id 
                    ? 'border-sky ring-2 ring-sky/10 bg-sky/[0.01]' 
                    : 'border-border hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-navy">{tmpl.name}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 font-mono hover:rotate-1 ${
                      tmpl.channel === 'sms' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      tmpl.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {tmpl.channel === 'sms' ? <MessageSquare size={8} /> : tmpl.channel === 'whatsapp' ? <Send size={8} /> : <Mail size={8} />}
                      {tmpl.channel}
                    </span>
                    <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-1 py-0.2 rounded flex items-center gap-1">
                      <Globe size={10} />
                      {tmpl.language.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{tmpl.description || "Aucune description fournie"}</p>
                  <p className="font-mono text-[9px] bg-slate-50 border p-2 rounded-lg line-clamp-2 italic text-slate-500">
                    "{tmpl.content}"
                  </p>
                  
                  {/* tag list */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {tmpl.placeholders.map(p => (
                      <span key={p} className="text-[8px] font-mono font-bold bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-md border border-violet-100">
                        {`{${p}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleOpenEditModal(tmpl)}
                    className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-sky transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={() => handleDupliquer(tmpl)}
                    title="Dupliquer modèle"
                    className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time smartphone simulator */}
        <div className="xl:col-span-5">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="border-b pb-3 flex justify-between items-center bg-mist -mx-5 -mt-5 p-5">
              <div>
                <span className="text-[9px] font-black uppercase text-sky bg-sky/10 px-2 py-0.5 rounded-full">Device Smart Simulation</span>
                <h3 className="font-extrabold text-xs text-navy font-syne mt-0.5">Rendu Client Mobile réels</h3>
              </div>
              <Smartphone size={16} className="text-muted-foreground mr-1" />
            </div>

            {/* Custom Input values for testing simulator */}
            <div className="bg-slate-50 border p-3.5 rounded-xl space-y-3 text-[11px]">
              <span className="font-extrabold text-[10px] text-slate-400 block uppercase tracking-wide">Modifier variables simulées :</span>
              <div className="grid grid-cols-2 gap-2 text-navy font-bold">
                <div>
                  <label className="text-[9px] text-muted-foreground">Client :</label>
                  <input 
                    type="text" 
                    value={selectedMockClient.client_name}
                    onChange={(e) => setSelectedMockClient({ ...selectedMockClient, client_name: e.target.value })}
                    className="w-full bg-white border border-border p-1.5 text-[10px] rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Dossier ID :</label>
                  <input 
                    type="text" 
                    value={selectedMockClient.dossier_id}
                    onChange={(e) => setSelectedMockClient({ ...selectedMockClient, dossier_id: e.target.value })}
                    className="w-full bg-white border border-border p-1.5 text-[10px] rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground font-mono">Retard (TND) :</label>
                  <input 
                    type="text" 
                    value={selectedMockClient.montant}
                    onChange={(e) => setSelectedMockClient({ ...selectedMockClient, montant: e.target.value })}
                    className="w-full bg-white border border-border p-1.5 text-[10px] rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Échéance limite :</label>
                  <input 
                    type="text" 
                    value={selectedMockClient.date_echeance}
                    onChange={(e) => setSelectedMockClient({ ...selectedMockClient, date_echeance: e.target.value })}
                    className="w-full bg-white border border-border p-1.5 text-[10px] rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Phone Screen Mock */}
            {selectedTmpl ? (
              <div className="relative mx-auto max-w-[280px] h-[480px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-700 flex flex-col justify-between overflow-hidden">
                {/* Speaker pill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2" />
                  <div className="w-8 h-1 rounded bg-slate-800" />
                </div>

                {/* Simulated notification status top */}
                <div className="flex justify-between items-center text-[8px] text-white/70 px-4 pt-1 font-semibold select-none">
                  <span>09:41</span>
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>RecovAI Sim</span>
                  </div>
                </div>

                {/* Chat window mockup based on channel */}
                <div className="flex-1 bg-slate-100 rounded-2xl m-1 overflow-y-auto p-2.5 space-y-3 flex flex-col justify-end text-black">
                  
                  {selectedTmpl.channel === 'email' ? (
                    // E-MAIL VIEW
                    <div className="bg-white rounded-xl shadow-md p-3 space-y-2 border text-[10px] w-full self-center">
                      <div className="border-b pb-1 text-[8px] text-slate-500 space-y-0.5 font-sans">
                        <div><span className="font-extrabold text-navy">De :</span> recovai@amenbank.com</div>
                        <div><span className="font-extrabold text-navy">À :</span> contact@entreprise.tn</div>
                        <div><span className="font-extrabold text-navy">Objet :</span> {selectedTmpl.subject || 'Régularisation'}</div>
                      </div>
                      <div className="whitespace-pre-line text-[9px] leading-relaxed text-slate-700 italic">
                        {compiledPreview}
                      </div>
                    </div>
                  ) : selectedTmpl.channel === 'whatsapp' ? (
                    // WHATSAPP VIEW
                    <div className="bg-emerald-100 rounded-2xl shadow p-3 text-[10px] max-w-[90%] self-end relative border-l-4 border-emerald-500">
                      <span className="font-black text-emerald-800 text-[8px] block mb-1 uppercase">★ RecovAI WhatsApp d\'office</span>
                      <p className="whitespace-pre-line leading-relaxed text-slate-800">
                        {compiledPreview}
                      </p>
                      <span className="text-[7px] text-muted-foreground block text-right font-bold mt-1">09:41 · Lu</span>
                    </div>
                  ) : (
                    // SMS VIEW
                    <div className="bg-sky-500 text-white rounded-2xl p-3 text-[10px] max-w-[85%] self-end shadow leading-relaxed relative">
                      <p className="whitespace-pre-line">
                        {compiledPreview}
                      </p>
                      <span className="text-[7px] text-white/55 block text-right mt-1">Télécom TN • Il y a 1 min</span>
                    </div>
                  )}

                </div>

                {/* Home indicator bottom */}
                <div className="w-16 h-1 bg-white/40 rounded-full mx-auto mb-1 shrink-0" />
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground p-8">Aucun modèle sélectionné.</p>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT коммуникация Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-xl w-full overflow-hidden text-navy text-xs"
            >
              {/* Header */}
              <div className="bg-navy p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold font-syne text-sm flex items-center gap-2">
                    <CheckSquare size={16} className="text-sky" />
                    {modalMode === 'create' ? 'Rédiger un modèle de message' : 'Modifier le template'}
                  </h3>
                  <p className="text-[11px] text-white/60">Configurez les balises dynamiques qui se synchroniseront avec les fiches clients.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Nom descriptif interne du modèle</label>
                    <input 
                      type="text" 
                      value={editingTmpl.name || ''}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, name: e.target.value })}
                      placeholder="Ex: SMS de Rappel Courtois Pré-Échéance"
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs text-navy font-bold focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Description d\'usage</label>
                    <input 
                      type="text" 
                      value={editingTmpl.description || ''}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, description: e.target.value })}
                      placeholder="Aidez les équipes à comprendre quand mobiliser ce canal réels"
                      className="w-full px-3 py-2 bg-mist rounded-xl border border-border text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-border">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Canal ciblé</label>
                    <select
                      value={editingTmpl.channel || 'sms'}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, channel: e.target.value as any })}
                      className="w-full px-2.5 py-1.8 bg-mist rounded-lg border border-border focus:outline-none"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="in_app">Notification In-App</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Catégorie communication</label>
                    <select
                      value={editingTmpl.category || 'standard_reminder'}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, category: e.target.value as any })}
                      className="w-full px-2.5 py-1.8 bg-mist rounded-lg border border-border focus:outline-none"
                    >
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Langue principale</label>
                    <select
                      value={editingTmpl.language || 'fr'}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, language: e.target.value as any })}
                      className="w-full px-2.5 py-1.8 bg-mist rounded-lg border border-border focus:outline-none"
                    >
                      <option value="fr">Français (FR)</option>
                      <option value="ar">العربية (AR)</option>
                    </select>
                  </div>
                </div>

                {editingTmpl.channel === 'email' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1">Sujet / Objet du mail</label>
                    <input 
                      type="text" 
                      value={editingTmpl.subject || ''}
                      onChange={(e) => setEditingTmpl({ ...editingTmpl, subject: e.target.value })}
                      placeholder="Ex: Rappel urgent d'ouverture de l'avis contentieux"
                      className="w-full px-3 py-1.8 bg-mist border rounded-xl focus:outline-none text-navy font-bold"
                    />
                  </div>
                )}

                {/* Content Editor and tag helper */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase text-muted-foreground">Corps du message (Supporte Markdown & tags)</label>
                    <span className="text-[9px] text-sky font-semibold italic">Insérez des tags variables</span>
                  </div>

                  {/* Variables selector list */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-50 border p-2 rounded-xl">
                    {Object.entries(placeholderExplanations).map(([tagKey, val]) => (
                      <button
                        key={tagKey}
                        onClick={() => handleAddPlaceholderToContent(tagKey)}
                        className="px-2 py-1 bg-white border rounded-lg text-[10px] font-bold text-navy hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all shadow-sm"
                        title={`Remplace par: ${val.label}`}
                      >
                        {`+ {${tagKey}}`}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={5}
                    value={editingTmpl.content || ''}
                    onChange={(e) => setEditingTmpl({ ...editingTmpl, content: e.target.value })}
                    placeholder="Saisissez le corps du message..."
                    className="w-full bg-mist border rounded-xl p-3 focus:outline-none text-xs font-medium text-navy leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-5 flex justify-end gap-2 border-t border-border">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold hover:bg-slate-100 text-slate-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-5 py-2 bg-sky text-white rounded-xl text-xs font-bold hover:bg-sky/95"
                >
                  Sauvegarder le modèle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
