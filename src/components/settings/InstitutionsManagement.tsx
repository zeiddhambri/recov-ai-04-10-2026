import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Landmark, 
  Coins, 
  Layers, 
  Globe, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Eye, 
  FileSpreadsheet,
  Building,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TUNISIAN_INSTITUTIONS, CATEGORY_LABELS } from '@/data/institutions';
import { Institution, InstitutionCategory } from '@/types/institution';

export default function InstitutionsManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customInstitutions, setCustomInstitutions] = useState<Institution[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New institution form state
  const [newInst, setNewInst] = useState({
    code: '',
    name: '',
    fullName: '',
    category: 'banque_residente' as InstitutionCategory,
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)' as const,
    headquarters: 'Tunis',
    branchesCount: 1,
    specialty: '',
    contactEmail: '',
    website: ''
  });

  const allInstitutions = useMemo(() => {
    return [...TUNISIAN_INSTITUTIONS, ...customInstitutions];
  }, [customInstitutions]);

  const filteredInstitutions = useMemo(() => {
    return allInstitutions.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.headquarters.toLowerCase().includes(q) ||
        (item.specialty && item.specialty.toLowerCase().includes(q)) ||
        (item.swiftCode && item.swiftCode.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [allInstitutions, selectedCategory, searchTerm]);

  // Metric counts
  const residentCount = useMemo(() => allInstitutions.filter(i => i.category === 'banque_residente').length, [allInstitutions]);
  const offshoreCount = useMemo(() => allInstitutions.filter(i => i.category === 'banque_offshore').length, [allInstitutions]);
  const imfCount = useMemo(() => allInstitutions.filter(i => i.category === 'microfinance').length, [allInstitutions]);
  const leasingCount = useMemo(() => allInstitutions.filter(i => i.category === 'leasing_factoring').length, [allInstitutions]);
  const totalAgencies = useMemo(() => allInstitutions.reduce((acc, i) => acc + (i.branchesCount || 0), 0), [allInstitutions]);

  const handleCreateInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInst.code || !newInst.name) return;

    const created: Institution = {
      id: `custom-${Date.now()}`,
      code: newInst.code.trim().toUpperCase(),
      name: newInst.name.trim(),
      fullName: newInst.fullName.trim() || newInst.name.trim(),
      category: newInst.category,
      legalForm: newInst.legalForm,
      regulatoryBody: newInst.category === 'microfinance' 
        ? 'Autorité de Contrôle de la Microfinance (ACM)' 
        : 'Banque Centrale de Tunisie (BCT)',
      headquarters: newInst.headquarters || 'Tunis',
      status: 'active',
      branchesCount: Number(newInst.branchesCount) || 1,
      specialty: newInst.specialty,
      contactEmail: newInst.contactEmail,
      website: newInst.website
    };

    setCustomInstitutions(prev => [created, ...prev]);
    setIsAddModalOpen(false);
    setSuccessToast(`L'institution « ${created.code} » a été ajoutée avec succès.`);
    setTimeout(() => setSuccessToast(null), 4000);

    // Reset form
    setNewInst({
      code: '',
      name: '',
      fullName: '',
      category: 'banque_residente',
      legalForm: 'Société Anonyme',
      regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
      headquarters: 'Tunis',
      branchesCount: 1,
      specialty: '',
      contactEmail: '',
      website: ''
    });
  };

  const getCategoryBadge = (category: InstitutionCategory) => {
    switch (category) {
      case 'banque_residente':
        return {
          label: 'Banque Résidente',
          color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: Landmark
        };
      case 'banque_offshore':
        return {
          label: 'Banque Offshore',
          color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
          icon: Globe
        };
      case 'microfinance':
        return {
          label: 'Microfinance (IMF)',
          color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Coins
        };
      case 'leasing_factoring':
        return {
          label: 'Leasing & Factoring',
          color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: Layers
        };
    }
  };

  return (
    <div className="space-y-6" id="institutions-management-section">
      {/* Success Notification */}
      {successToast && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {successToast}
        </div>
      )}

      {/* Header with official regulatory references */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 shadow-sm border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-800">
                <Landmark size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-navy dark:text-white font-syne">
                    Référentiel des Banques & Institutions de Microfinance
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Officiel Tunisie
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conforme aux agréments de la <strong>Banque Centrale de Tunisie (BCT)</strong> et de l'<strong>Autorité de Contrôle de la Microfinance (ACM)</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              id="btn-add-institution"
            >
              <Plus size={16} />
              Ajouter une agence / institution
            </button>
          </div>
        </div>

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Établissements</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-navy dark:text-white font-syne">{allInstitutions.length}</span>
              <span className="text-xs text-muted-foreground">institutions</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Banques Résidentes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200 font-syne">{residentCount}</span>
              <span className="text-xs text-indigo-600/80 dark:text-indigo-400">BCT</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40">
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider block">Banques Offshore</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-cyan-900 dark:text-cyan-200 font-syne">{offshoreCount}</span>
              <span className="text-xs text-cyan-600/80 dark:text-cyan-400">Non-résidentes</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">IMF Agréées ACM</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-syne">{imfCount}</span>
              <span className="text-xs text-emerald-600/80 dark:text-emerald-400">S.A. agréées</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Réseau d'Agences</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-900 dark:text-amber-200 font-syne">{totalAgencies}</span>
              <span className="text-xs text-amber-600/80 dark:text-amber-400">points de vente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                selectedCategory === 'all'
                  ? "bg-navy text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Tous ({allInstitutions.length})
            </button>
            <button
              onClick={() => setSelectedCategory('banque_residente')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCategory === 'banque_residente'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
              )}
            >
              <Landmark size={13} />
              Banques Résidentes ({residentCount})
            </button>
            <button
              onClick={() => setSelectedCategory('banque_offshore')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCategory === 'banque_offshore'
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100"
              )}
            >
              <Globe size={13} />
              Banques Offshore ({offshoreCount})
            </button>
            <button
              onClick={() => setSelectedCategory('microfinance')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCategory === 'microfinance'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              )}
            >
              <Coins size={13} />
              Microfinance IMF ({imfCount})
            </button>
            <button
              onClick={() => setSelectedCategory('leasing_factoring')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCategory === 'leasing_factoring'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
              )}
            >
              <Layers size={13} />
              Leasing & Factoring ({leasingCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher code, banque, IMF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
              id="input-search-institutions"
            />
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>Affichage de <strong>{filteredInstitutions.length}</strong> établissement(s)</span>
          <span className="text-[11px] font-mono text-slate-500">Mise à jour réglementaire BCT / ACM</span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="table-tunisian-institutions">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4">Établissement & Sigle</th>
                <th className="py-3.5 px-4">Dénomination Légale</th>
                <th className="py-3.5 px-4">Forme Juridique</th>
                <th className="py-3.5 px-4">Catégorie & Autorité</th>
                <th className="py-3.5 px-4">Siège Social & Agences</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Building size={32} className="mx-auto mb-2 opacity-30" />
                    Aucun établissement trouvé avec ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((inst) => {
                  const badge = getCategoryBadge(inst.category);
                  const Icon = badge.icon;
                  return (
                    <tr 
                      key={inst.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0",
                            badge.color
                          )}>
                            {inst.code.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-navy dark:text-white flex items-center gap-1.5">
                              {inst.code}
                              {inst.swiftCode && (
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {inst.swiftCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{inst.name}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {inst.fullName}
                        {inst.specialty && (
                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5 line-clamp-1">
                            {inst.specialty}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {inst.legalForm}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            badge.color
                          )}>
                            <Icon size={11} />
                            {badge.label}
                          </span>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {inst.regulatoryBody}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                          <MapPin size={11} className="text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{inst.headquarters}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {inst.branchesCount} agence{inst.branchesCount > 1 ? 's' : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInstitution(inst)}
                            className="p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Consulter la fiche détaillée"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/pilotage/tableau-de-bord-global?institution=${encodeURIComponent(inst.code)}`)}
                            className="px-2 py-1 rounded-lg bg-navy/5 hover:bg-navy/10 dark:bg-white/5 dark:hover:bg-white/10 text-navy dark:text-white font-bold text-[10px] transition-colors flex items-center gap-1"
                            title="Filtrer dans le Tableau de Bord Global"
                          >
                            <span>Pilotage</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl border border-border space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base border",
                  getCategoryBadge(selectedInstitution.category).color
                )}>
                  {selectedInstitution.code.slice(0, 3)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy dark:text-white font-syne">
                    {selectedInstitution.code} — {selectedInstitution.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedInstitution.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInstitution(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Catégorie</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {getCategoryBadge(selectedInstitution.category).label}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Forme Juridique</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {selectedInstitution.legalForm}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Autorité de Contrôle</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {selectedInstitution.regulatoryBody}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Code SWIFT / BIC</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {selectedInstitution.swiftCode || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Siège Social & Agences</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedInstitution.headquarters}</p>
                <p className="text-muted-foreground text-[11px]">{selectedInstitution.branchesCount} agences bancaires / points de contact répertoriés</p>
              </div>

              {selectedInstitution.specialty && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Domaine & Spécialité</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedInstitution.specialty}</p>
                </div>
              )}

              {selectedInstitution.website && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-sky/5 border border-sky/20 text-sky">
                  <span className="text-[11px] font-bold">Site Web Officiel</span>
                  <a 
                    href={selectedInstitution.website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 font-semibold hover:underline text-[11px]"
                  >
                    Visiter {selectedInstitution.website.replace('https://', '')}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setSelectedInstitution(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  const code = selectedInstitution.code;
                  setSelectedInstitution(null);
                  navigate(`/pilotage/tableau-de-bord-global?institution=${encodeURIComponent(code)}`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy/90 flex items-center gap-1.5"
              >
                <span>Voir les indicateurs de {selectedInstitution.code}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Institution Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl border border-border space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-navy dark:text-white font-syne">
                  Ajouter un établissement ou une agence
                </h3>
                <p className="text-xs text-muted-foreground">Enregistrez une nouvelle banque, institution IMF ou agence régionale.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInstitution} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Code / Sigle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BNA, BIAT, ENDA..."
                    value={newInst.code}
                    onChange={e => setNewInst({ ...newInst, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nom commercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banque Nationale Agricole"
                    value={newInst.name}
                    onChange={e => setNewInst({ ...newInst, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Dénomination légale complète</label>
                <input
                  type="text"
                  placeholder="Ex: Société Tunisienne de Banque S.A."
                  value={newInst.fullName}
                  onChange={e => setNewInst({ ...newInst, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Catégorie d'institution</label>
                  <select
                    value={newInst.category}
                    onChange={e => setNewInst({ ...newInst, category: e.target.value as InstitutionCategory })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  >
                    <option value="banque_residente">Banque Résidente (BCT)</option>
                    <option value="banque_offshore">Banque Offshore (BCT)</option>
                    <option value="microfinance">Microfinance IMF (ACM)</option>
                    <option value="leasing_factoring">Leasing & Factoring</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Forme Juridique</label>
                  <input
                    type="text"
                    placeholder="Société Anonyme"
                    value={newInst.legalForm}
                    onChange={e => setNewInst({ ...newInst, legalForm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Siège Social / Ville</label>
                  <input
                    type="text"
                    placeholder="Ex: Tunis, Sfax, Sousse..."
                    value={newInst.headquarters}
                    onChange={e => setNewInst({ ...newInst, headquarters: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nombre d'agences</label>
                  <input
                    type="number"
                    min="1"
                    value={newInst.branchesCount}
                    onChange={e => setNewInst({ ...newInst, branchesCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Spécialité / Segments</label>
                <input
                  type="text"
                  placeholder="Ex: Financement PME, Crédit-bail, Microcrédits..."
                  value={newInst.specialty}
                  onChange={e => setNewInst({ ...newInst, specialty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border focus:ring-2 focus:ring-sky/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-navy text-white hover:bg-navy/90 shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
