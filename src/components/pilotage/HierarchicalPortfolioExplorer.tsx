import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderTree, ChevronRight, ChevronDown, Layers, Wallet, Building2, UserCheck, 
  Globe, FileSignature, Truck, CalendarCheck, Search, Filter, ArrowUpRight, 
  Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, BarChart3, PieChart as PieChartIcon, 
  RefreshCw, BookmarkCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend 
} from 'recharts';
import { 
  PORTFOLIO_TAXONOMY, getAllProducts, getAllCategories, getAllSubCategories 
} from '@/data/portfolioTaxonomy';
import { PortfolioL1, CategoryL2, SubCategoryL3, ProductL4 } from '@/types/portfolio-taxonomy';

interface HierarchicalPortfolioExplorerProps {
  selectedPortfolioL1?: string;
  selectedCategoryL2?: string;
  selectedSubCategoryL3?: string;
  selectedProductL4?: string;
  onSelectLevel?: (levels: {
    portfolioL1?: string;
    categoryL2?: string;
    subCategoryL3?: string;
    productL4?: string;
  }) => void;
}

export function HierarchicalPortfolioExplorer({
  selectedPortfolioL1,
  selectedCategoryL2,
  selectedSubCategoryL3,
  selectedProductL4,
  onSelectLevel,
}: HierarchicalPortfolioExplorerProps) {
  const [activeL1Id, setActiveL1Id] = useState<string>(PORTFOLIO_TAXONOMY[0].id);
  const [activeL2Id, setActiveL2Id] = useState<string>('All');
  const [activeL3Id, setActiveL3Id] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'tree' | 'chart'>('cards');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'p-entreprises': true,
    'cat-tresorerie': true,
    'sub-decouverts-lignes': true
  });

  const formatTND = (val: number) => {
    return new Intl.NumberFormat('fr-TN', { 
      style: 'currency', 
      currency: 'TND', 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    PORTFOLIO_TAXONOMY.forEach(p => {
      allIds[p.id] = true;
      p.categories.forEach(c => {
        allIds[c.id] = true;
        c.subCategories.forEach(s => {
          allIds[s.id] = true;
        });
      });
    });
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const currentPortfolio = useMemo(() => {
    return PORTFOLIO_TAXONOMY.find(p => p.id === activeL1Id) || PORTFOLIO_TAXONOMY[0];
  }, [activeL1Id]);

  // Filtered categories based on selected Portfolio
  const availableCategories = useMemo(() => {
    return currentPortfolio.categories;
  }, [currentPortfolio]);

  // Filtered sub-categories based on active Category
  const availableSubCategories = useMemo(() => {
    if (activeL2Id === 'All') {
      return currentPortfolio.categories.flatMap(c => c.subCategories);
    }
    const cat = currentPortfolio.categories.find(c => c.id === activeL2Id);
    return cat ? cat.subCategories : [];
  }, [currentPortfolio, activeL2Id]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let prods = getAllProducts();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return prods.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.categoryL2.toLowerCase().includes(q) ||
        p.subCategoryL3.toLowerCase().includes(q) ||
        p.portfolioL1.toLowerCase().includes(q) ||
        p.typicalRepaymentMode.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }

    // Filter by L1
    prods = prods.filter(p => p.portfolioL1 === currentPortfolio.name);

    // Filter by L2
    if (activeL2Id !== 'All') {
      const cat = currentPortfolio.categories.find(c => c.id === activeL2Id);
      if (cat) {
        prods = prods.filter(p => p.categoryL2 === cat.name);
      }
    }

    // Filter by L3
    if (activeL3Id !== 'All') {
      const sub = availableSubCategories.find(s => s.id === activeL3Id);
      if (sub) {
        prods = prods.filter(p => p.subCategoryL3 === sub.name);
      }
    }

    return prods;
  }, [currentPortfolio, activeL2Id, activeL3Id, searchQuery, availableSubCategories]);

  // Aggregated metrics for currently filtered selection
  const aggregatedStats = useMemo(() => {
    const totalOut = filteredProducts.reduce((sum, p) => sum + p.metrics.outstanding, 0);
    const totalOver = filteredProducts.reduce((sum, p) => sum + p.metrics.overdue, 0);
    const totalCount = filteredProducts.reduce((sum, p) => sum + p.metrics.count, 0);
    const avgRecov = filteredProducts.length 
      ? Math.round(filteredProducts.reduce((sum, p) => sum + p.metrics.recoveryRate, 0) / filteredProducts.length) 
      : 0;
    const avgDefault = totalOut > 0 ? Math.round((totalOver / totalOut) * 100) : 0;
    return { totalOut, totalOver, totalCount, avgRecov, avgDefault };
  }, [filteredProducts]);

  // Chart data for current filtered set
  const chartData = useMemo(() => {
    return filteredProducts.map(p => ({
      name: p.name.length > 18 ? p.name.substring(0, 16) + '...' : p.name,
      fullName: p.name,
      encours: p.metrics.outstanding / 1000, // en k TND
      arrieres: p.metrics.overdue / 1000,    // en k TND
      recouvrement: p.metrics.recoveryRate
    }));
  }, [filteredProducts]);

  const handleApplyFilter = (p: ProductL4) => {
    if (onSelectLevel) {
      onSelectLevel({
        portfolioL1: p.portfolioL1,
        categoryL2: p.categoryL2,
        subCategoryL3: p.subCategoryL3,
        productL4: p.name,
      });
    }
  };

  const getRiskBadge = (profile: string) => {
    switch (profile) {
      case 'Faible':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Risque Faible</span>;
      case 'Modéré':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Risque Modéré</span>;
      case 'Élevé':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Risque Élevé</span>;
      case 'Critique':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">Risque Critique</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden" id="hierarchical-portfolio-explorer">
      {/* Top Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <FolderTree size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  Architecture Hiérarchique du Portefeuille Crédit
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                    4 Niveaux BCT & IFRS 9
                  </span>
                </h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Niveau 1 : Portefeuille &gt; Niveau 2 : Sous-Catégorie &gt; Niveau 3 : Sous-Catégorie de la Sous-Catégorie &gt; Niveau 4 : Produit / Concours
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Search & Views */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit, concours, modalité..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-gray-700"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/80 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Fiches Produits
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Arborescence Complète
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === 'chart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Analytique
              </button>
            </div>
          </div>
        </div>

        {/* Global Summary Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-200/60">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-mono uppercase text-gray-400 font-medium">Concours Actifs</p>
            <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">{aggregatedStats.totalCount} dossiers</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-mono uppercase text-gray-400 font-medium">Encours Total Sélection</p>
            <p className="text-sm font-bold text-blue-600 font-mono mt-0.5">{formatTND(aggregatedStats.totalOut)}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-mono uppercase text-gray-400 font-medium">Arriérés / Impayés</p>
            <p className="text-sm font-bold text-red-500 font-mono mt-0.5">{formatTND(aggregatedStats.totalOver)}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-mono uppercase text-gray-400 font-medium">Taux Moyen de Retard</p>
            <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">{aggregatedStats.avgDefault}%</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-200/60">
            <p className="text-[10px] font-mono uppercase text-gray-400 font-medium">Taux de Recouvrement</p>
            <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{aggregatedStats.avgRecov}%</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NIVEAU 1 : BARRE DES PORTEFEUILLES (TABS) */}
      {/* ========================================================================= */}
      {!searchQuery && (
        <div className="px-5 pt-4 pb-2 bg-gray-50/50 border-b border-gray-200/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Niveau 1 : Portefeuille Macro
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              {PORTFOLIO_TAXONOMY.length} macro-portefeuilles configurés
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {PORTFOLIO_TAXONOMY.map((p) => {
              const isSelected = p.id === activeL1Id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveL1Id(p.id);
                    setActiveL2Id('All');
                    setActiveL3Id('All');
                  }}
                  className={`flex flex-col p-3 rounded-xl text-left transition-all border ${
                    isSelected 
                      ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500' 
                      : 'bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {p.code}
                    </span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mt-1.5 line-clamp-1">{p.name}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] font-mono">
                    <span className="text-gray-500">{formatTND(p.metrics.outstanding)}</span>
                    <span className="text-emerald-600 font-semibold">{p.metrics.recoveryRate}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NIVEAU 2 & NIVEAU 3 : FILTRES CASCADEURS */}
      {/* ========================================================================= */}
      {!searchQuery && viewMode !== 'tree' && (
        <div className="p-5 border-b border-gray-100 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Niveau 2 : Sous-Catégorie (Famille de crédit) */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-500" />
                  Niveau 2 : Sous-Catégorie (Famille de Crédit)
                </span>
                {activeL2Id !== 'All' && (
                  <button 
                    onClick={() => { setActiveL2Id('All'); setActiveL3Id('All'); }}
                    className="text-[10px] text-blue-600 hover:underline capitalize"
                  >
                    Voir toutes
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setActiveL2Id('All'); setActiveL3Id('All'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeL2Id === 'All' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Toutes les familles ({availableCategories.length})
                </button>
                {availableCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveL2Id(c.id); setActiveL3Id('All'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeL2Id === c.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-1 rounded font-mono ${activeL2Id === c.id ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {c.subCategories.flatMap(s => s.products).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Niveau 3 : Sous-Catégorie de la Sous-Catégorie */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FolderTree size={13} className="text-emerald-500" />
                  Niveau 3 : Sous-Catégorie de la Sous-Catégorie
                </span>
                {activeL3Id !== 'All' && (
                  <button 
                    onClick={() => setActiveL3Id('All')}
                    className="text-[10px] text-emerald-600 hover:underline capitalize"
                  >
                    Voir tous segments
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveL3Id('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeL3Id === 'All' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Tous segments ({availableSubCategories.length})
                </button>
                {availableSubCategories.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveL3Id(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeL3Id === s.id 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="line-clamp-1">{s.name}</span>
                    <span className={`text-[10px] px-1 rounded font-mono ${activeL3Id === s.id ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {s.products.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 1 : FICHES PRODUITS (NIVEAU 4 : PRODUIT / TYPE DE CONCOURS) */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Niveau 4 : Produits &amp; Types de Concours ({filteredProducts.length} concours répertoriés)
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              Cliquez sur un produit pour appliquer le filtre consolidé
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Aucun concours correspondant aux critères sélectionnés.</p>
              <button 
                onClick={() => { setActiveL2Id('All'); setActiveL3Id('All'); setSearchQuery(''); }}
                className="mt-2 text-xs text-blue-600 hover:underline font-medium"
              >
                Réinitialiser la sélection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => (
                <div 
                  key={prod.id}
                  className="p-4 rounded-xl border border-gray-200/90 hover:border-blue-400 bg-white hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Header with taxonomy codes and risk */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] font-bold text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                        {prod.code}
                      </span>
                      {getRiskBadge(prod.riskProfile)}
                    </div>

                    {/* Product Name */}
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {prod.name}
                    </h4>

                    {/* Breadcrumbs of levels 1, 2, 3 */}
                    <div className="mt-1 space-y-0.5 text-[10px] text-gray-500 font-mono">
                      <p className="truncate">
                        <span className="text-gray-400">Famille :</span> <span className="font-semibold text-gray-700">{prod.categoryL2}</span>
                      </p>
                      <p className="truncate">
                        <span className="text-gray-400">Segment :</span> <span className="font-medium text-gray-600">{prod.subCategoryL3}</span>
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  {/* Metrics Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-400 font-mono">Encours sous gestion</p>
                        <p className="font-bold text-gray-900 font-mono mt-0.5">{formatTND(prod.metrics.outstanding)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-mono">Arriérés cumulés</p>
                        <p className="font-bold text-red-500 font-mono mt-0.5">{formatTND(prod.metrics.overdue)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 text-[11px]">
                      <div className="flex items-center gap-1 text-gray-500 font-mono">
                        <CalendarCheck size={12} className="text-gray-400" />
                        <span className="truncate max-w-[140px]">{prod.typicalRepaymentMode}</span>
                      </div>
                      <button
                        onClick={() => handleApplyFilter(prod)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Filtrer <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : ARBORESCENCE COMPLÈTE RECURSIVE (N1 -> N2 -> N3 -> N4) */}
      {/* ========================================================================= */}
      {viewMode === 'tree' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-mono">
                Arborescence Structurelle des 4 Niveaux de Portefeuille
              </h3>
              <p className="text-[11px] text-gray-500">
                Visualisez et déployez chaque embranchement jusqu'aux produits et types de concours.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
              >
                Tout Déployer
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
              >
                Tout Replier
              </button>
            </div>
          </div>

          <div className="space-y-3 font-sans">
            {PORTFOLIO_TAXONOMY.map((p1) => {
              const isP1Open = !!expandedNodes[p1.id];
              return (
                <div key={p1.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Niveau 1 Header */}
                  <div 
                    onClick={() => toggleNode(p1.id)}
                    className="p-3.5 bg-gray-50/80 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isP1Open ? <ChevronDown size={15} className="text-blue-600" /> : <ChevronRight size={15} className="text-gray-400" />}
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p1.color }} />
                      <span className="text-xs font-extrabold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        NIVEAU 1
                      </span>
                      <h4 className="text-sm font-bold text-gray-900">{p1.name}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-gray-500 font-semibold">{formatTND(p1.metrics.outstanding)}</span>
                      <span className="text-red-500 font-medium">Impayés: {formatTND(p1.metrics.overdue)}</span>
                      <span className="text-emerald-600 font-bold">{p1.metrics.recoveryRate}% recouv.</span>
                    </div>
                  </div>

                  {/* Niveau 2 Categories */}
                  {isP1Open && (
                    <div className="p-3 bg-white space-y-2.5 pl-6 border-t border-gray-100">
                      {p1.categories.map((c2) => {
                        const isC2Open = !!expandedNodes[c2.id];
                        return (
                          <div key={c2.id} className="border border-gray-100 rounded-lg overflow-hidden">
                            {/* Niveau 2 Header */}
                            <div 
                              onClick={() => toggleNode(c2.id)}
                              className="p-2.5 bg-blue-50/40 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isC2Open ? <ChevronDown size={14} className="text-indigo-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                                <span className="text-[10px] font-bold text-indigo-700 font-mono bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                  NIVEAU 2 (FAMILLE)
                                </span>
                                <span className="text-xs font-bold text-gray-800">{c2.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-mono">
                                <span className="text-gray-600">{formatTND(c2.metrics.outstanding)}</span>
                                <span className="text-emerald-600 font-semibold">{c2.metrics.recoveryRate}%</span>
                              </div>
                            </div>

                            {/* Niveau 3 Sub-categories */}
                            {isC2Open && (
                              <div className="p-2.5 bg-white space-y-2 pl-6 border-t border-gray-100">
                                {c2.subCategories.map((s3) => {
                                  const isS3Open = !!expandedNodes[s3.id];
                                  return (
                                    <div key={s3.id} className="border border-gray-100/80 rounded-lg bg-gray-50/30">
                                      {/* Niveau 3 Header */}
                                      <div 
                                        onClick={() => toggleNode(s3.id)}
                                        className="p-2 hover:bg-emerald-50/40 cursor-pointer flex items-center justify-between transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          {isS3Open ? <ChevronDown size={13} className="text-emerald-600" /> : <ChevronRight size={13} className="text-gray-400" />}
                                          <span className="text-[9px] font-bold text-emerald-800 font-mono bg-emerald-100 px-1.5 py-0.5 rounded">
                                            NIVEAU 3 (SOUS-CATÉGORIE)
                                          </span>
                                          <span className="text-xs font-semibold text-gray-700">{s3.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500">
                                          {s3.products.length} concours | {formatTND(s3.metrics.outstanding)}
                                        </span>
                                      </div>

                                      {/* Niveau 4 Products */}
                                      {isS3Open && (
                                        <div className="p-2 pl-7 space-y-1 bg-white border-t border-gray-100">
                                          {s3.products.map((p4) => (
                                            <div 
                                              key={p4.id}
                                              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 text-xs border border-transparent hover:border-gray-200 transition-all"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-800">
                                                  N4 : {p4.code}
                                                </span>
                                                <span className="font-bold text-gray-900">{p4.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">({p4.typicalRepaymentMode})</span>
                                              </div>
                                              <div className="flex items-center gap-3 font-mono text-[11px]">
                                                <span className="text-gray-700 font-medium">{formatTND(p4.metrics.outstanding)}</span>
                                                <span className="text-red-500 font-semibold">{formatTND(p4.metrics.overdue)}</span>
                                                {getRiskBadge(p4.riskProfile)}
                                                <button
                                                  onClick={() => handleApplyFilter(p4)}
                                                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-colors"
                                                >
                                                  Filtrer
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : ANALYTIQUE GRAPHIQUE (RECHARTS) */}
      {/* ========================================================================= */}
      {viewMode === 'chart' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-mono">
              Répartition des Encours et Arriérés par Type de Concours (en milliers TND)
            </h3>
            <span className="text-[11px] font-mono text-gray-500">Source consolidée BCT / RecovAI</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-30} 
                  textAnchor="end" 
                  stroke="#9ca3af" 
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    `${new Intl.NumberFormat('fr-TN').format(Number(value) * 1000)} TND`,
                    name === 'encours' ? 'Encours sous gestion' : 'Arriérés / Défauts'
                  ]}
                  labelFormatter={(label) => `Concours : ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="encours" name="Encours (k TND)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="arrieres" name="Arriérés (k TND)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
