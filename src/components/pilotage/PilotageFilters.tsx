import React, { useState } from 'react';
import { Calendar, Filter, Archive, Building, MapPin, AlertTriangle, RefreshCw, Layers, FolderTree, ChevronDown, ChevronUp } from 'lucide-react';
import { TUNISIAN_INSTITUTIONS } from '@/data/institutions';
import { PORTFOLIO_TAXONOMY, getAllProducts, getAllCategories, getAllSubCategories } from '@/data/portfolioTaxonomy';

export interface FilterState {
  startDate: string;
  endDate: string;
  portfolio: string;
  institution: string;
  branch: string;
  riskLevel: string;
  // 4 Niveaux Hiérarchiques
  portfolioL1?: string;
  categoryL2?: string;
  subCategoryL3?: string;
  productL4?: string;
}

interface PilotageFiltersProps {
  onFilter: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

export const PilotageFilters: React.FC<PilotageFiltersProps> = ({ onFilter, initialFilters }) => {
  const [showAdvancedLevels, setShowAdvancedLevels] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    startDate: initialFilters?.startDate || '',
    endDate: initialFilters?.endDate || '',
    portfolio: initialFilters?.portfolio || 'All',
    institution: initialFilters?.institution || 'All',
    branch: initialFilters?.branch || 'All',
    riskLevel: initialFilters?.riskLevel || 'All',
    portfolioL1: initialFilters?.portfolioL1 || 'All',
    categoryL2: initialFilters?.categoryL2 || 'All',
    subCategoryL3: initialFilters?.subCategoryL3 || 'All',
    productL4: initialFilters?.productL4 || 'All',
  });

  const handleChange = (field: keyof FilterState, value: string) => {
    let updated = { ...filters, [field]: value };

    // Reset subordinate levels when parent level changes
    if (field === 'portfolioL1') {
      updated = {
        ...updated,
        categoryL2: 'All',
        subCategoryL3: 'All',
        productL4: 'All',
        portfolio: value !== 'All' ? value : 'All'
      };
    } else if (field === 'categoryL2') {
      updated = {
        ...updated,
        subCategoryL3: 'All',
        productL4: 'All',
        portfolio: value !== 'All' ? value : updated.portfolioL1 || 'All'
      };
    } else if (field === 'subCategoryL3') {
      updated = {
        ...updated,
        productL4: 'All',
        portfolio: value !== 'All' ? value : updated.categoryL2 || 'All'
      };
    } else if (field === 'productL4') {
      if (value !== 'All') {
        updated.portfolio = value;
      }
    }

    setFilters(updated);
    onFilter(updated);
  };

  const handleReset = () => {
    const cleared: FilterState = {
      startDate: '',
      endDate: '',
      portfolio: 'All',
      institution: 'All',
      branch: 'All',
      riskLevel: 'All',
      portfolioL1: 'All',
      categoryL2: 'All',
      subCategoryL3: 'All',
      productL4: 'All',
    };
    setFilters(cleared);
    onFilter(cleared);
  };

  // Derive cascading options based on current selection
  const selectedP1 = PORTFOLIO_TAXONOMY.find(p => p.name === filters.portfolioL1 || p.id === filters.portfolioL1);
  const availableCategories = selectedP1 
    ? selectedP1.categories 
    : getAllCategories();

  const selectedC2 = availableCategories.find(c => c.name === filters.categoryL2 || c.id === filters.categoryL2);
  const availableSubCategories = selectedC2 
    ? selectedC2.subCategories 
    : (selectedP1 ? selectedP1.categories.flatMap(c => c.subCategories) : getAllSubCategories());

  const selectedS3 = availableSubCategories.find(s => s.name === filters.subCategoryL3 || s.id === filters.subCategoryL3);
  const availableProducts = selectedS3 
    ? selectedS3.products 
    : (selectedC2 
        ? selectedC2.subCategories.flatMap(s => s.products) 
        : (selectedP1 
            ? selectedP1.categories.flatMap(c => c.subCategories.flatMap(s => s.products))
            : getAllProducts()));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Filter size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              Filtres de consolidation
              {(filters.portfolioL1 !== 'All' || filters.categoryL2 !== 'All' || filters.productL4 !== 'All') && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  Filtre Portefeuille Actif
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 font-mono">Consolidation multidimensionnelle BCT / IFRS 9</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedLevels(!showAdvancedLevels)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              showAdvancedLevels 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <FolderTree size={13} className="text-blue-600" />
            Niveaux 1 à 4 Portefeuille
            {showAdvancedLevels ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
            id="btn-filters-reset"
          >
            <RefreshCw size={12} className="text-gray-400" />
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Date Début */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <Calendar size={11} /> Date Début
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none font-mono transition-all text-gray-700"
            id="filter-start-date"
          />
        </div>

        {/* Date Fin */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <Calendar size={11} /> Date Fin
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none font-mono transition-all text-gray-700"
            id="filter-end-date"
          />
        </div>

        {/* Portefeuille (Global / Raccourci) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <Archive size={11} /> Portefeuille Global
          </label>
          <select
            value={filters.portfolio}
            onChange={(e) => handleChange('portfolio', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none transition-all text-gray-700 font-medium"
            id="filter-portfolio"
          >
            <option value="All">Tous les portefeuilles</option>
            <optgroup label="🏛️ Niveau 1 : Portefeuilles Macro">
              {PORTFOLIO_TAXONOMY.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="📑 Niveau 2 : Familles de Crédits">
              <option value="Crédits de trésorerie">Crédits de trésorerie</option>
              <option value="Crédits d'investissement">Crédits d'investissement</option>
              <option value="Crédits aux particuliers">Crédits aux particuliers</option>
              <option value="Commerce extérieur">Commerce extérieur</option>
              <option value="Leasing">Leasing (Crédit-bail)</option>
              <option value="Crédits par signature">Crédits par signature</option>
              <option value="Financements spécialisés">Financements spécialisés</option>
              <option value="Mode de remboursement">Mode de remboursement</option>
            </optgroup>
          </select>
        </div>

        {/* Institution */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <Building size={11} /> Institution
          </label>
          <select
            value={filters.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none transition-all text-gray-700 font-medium"
            id="filter-institution"
          >
            <option value="All">Toutes institutions</option>
            <optgroup label="🏦 Banques Résidentes (BCT)">
              {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'banque_residente').map(inst => (
                <option key={inst.id} value={inst.code}>
                  {inst.code} — {inst.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🌐 Banques Non-Résidentes / Offshore">
              {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'banque_offshore').map(inst => (
                <option key={inst.id} value={inst.code}>
                  {inst.code} — {inst.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="🌱 Microfinance (IMF Agréées ACM)">
              {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'microfinance').map(inst => (
                <option key={inst.id} value={inst.code}>
                  {inst.code}
                </option>
              ))}
            </optgroup>
            <optgroup label="📄 Leasing & Factoring">
              {TUNISIAN_INSTITUTIONS.filter(i => i.category === 'leasing_factoring').map(inst => (
                <option key={inst.id} value={inst.code}>
                  {inst.code}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Agence / Branche */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <MapPin size={11} /> Branche / Agence
          </label>
          <select
            value={filters.branch}
            onChange={(e) => handleChange('branch', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none transition-all text-gray-700 font-medium"
            id="filter-branch"
          >
            <option value="All">Toutes les agences</option>
            <option value="Tunis Centre">Tunis Centre</option>
            <option value="Tunis Belvédère">Tunis Belvédère</option>
            <option value="Lac Tunis">Lac Tunis</option>
            <option value="Sousse Corniche">Sousse Corniche</option>
            <option value="Sfax El Jadida">Sfax El Jadida</option>
          </select>
        </div>

        {/* Niveau de Risque */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <AlertTriangle size={11} /> Niveau Risque
          </label>
          <select
            value={filters.riskLevel}
            onChange={(e) => handleChange('riskLevel', e.target.value)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200/80 rounded-lg px-2.5 py-2 outline-none transition-all text-gray-700 font-medium"
            id="filter-risk"
          >
            <option value="All">Tous les risques</option>
            <option value="Faible">Faible</option>
            <option value="Moyen">Moyen</option>
            <option value="Élevé">Élevé</option>
            <option value="Critique">Critique</option>
          </select>
        </div>
      </div>

      {/* Advanced 4-Level Portfolio Cascading Bar */}
      {showAdvancedLevels && (
        <div className="mt-4 pt-4 border-t border-gray-100 bg-blue-50/30 -mx-5 -mb-5 p-5 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-900 font-mono flex items-center gap-1.5">
              <FolderTree size={14} className="text-blue-600" />
              Segmentation 4 Niveaux (Portefeuille &gt; Famille &gt; Sous-Catégorie &gt; Produit)
            </span>
            {(filters.portfolioL1 !== 'All' || filters.categoryL2 !== 'All' || filters.subCategoryL3 !== 'All' || filters.productL4 !== 'All') && (
              <button
                onClick={() => {
                  const resetLevels = {
                    ...filters,
                    portfolioL1: 'All',
                    categoryL2: 'All',
                    subCategoryL3: 'All',
                    productL4: 'All',
                    portfolio: 'All',
                  };
                  setFilters(resetLevels);
                  onFilter(resetLevels);
                }}
                className="text-[11px] text-blue-600 hover:underline font-mono"
              >
                Réinitialiser les 4 niveaux
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Niveau 1 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                Niveau 1 : Portefeuille
              </label>
              <select
                value={filters.portfolioL1}
                onChange={(e) => handleChange('portfolioL1', e.target.value)}
                className="w-full text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                id="filter-level1-portfolio"
              >
                <option value="All">Tous les portefeuilles macro</option>
                {PORTFOLIO_TAXONOMY.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Niveau 2 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                Niveau 2 : Sous-Catégorie
              </label>
              <select
                value={filters.categoryL2}
                onChange={(e) => handleChange('categoryL2', e.target.value)}
                className="w-full text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                id="filter-level2-category"
              >
                <option value="All">Toutes les familles ({availableCategories.length})</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Niveau 3 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                Niveau 3 : Sous-Catégorie de la S-Cat
              </label>
              <select
                value={filters.subCategoryL3}
                onChange={(e) => handleChange('subCategoryL3', e.target.value)}
                className="w-full text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                id="filter-level3-subcategory"
              >
                <option value="All">Tous les segments ({availableSubCategories.length})</option>
                {availableSubCategories.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Niveau 4 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                Niveau 4 : Produit / Type de concours
              </label>
              <select
                value={filters.productL4}
                onChange={(e) => handleChange('productL4', e.target.value)}
                className="w-full text-xs bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-gray-800 focus:ring-1 focus:ring-blue-500"
                id="filter-level4-product"
              >
                <option value="All">Tous les types de concours ({availableProducts.length})</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
