import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Coins, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Briefcase, 
  Sparkles, 
  Download, 
  FileText, 
  Filter, 
  Loader2,
  Info,
  Calendar,
  FileSpreadsheet,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

import { getMfiState } from '../../lib/microfinance-mock';
import { getFactoringState } from '../../lib/factoring-mock';
import { leasingContracts } from '../../lib/leasing-mock';

// Types of Portfolios
type PortfolioType = 'ALL' | 'MICROFINANCE' | 'FACTORING' | 'LEASING';

// Sectors of Activity mapped
type SectorType = 'ALL' | 'Agriculture' | 'Commerce' | 'Industrie' | 'Services' | 'Transport' | 'BTP' | 'Autre';

// Risk levels
type RiskLevel = 'ALL' | 'Sain' | 'Watchlist' | 'Douteux' | 'Litige / Contentieux';

export default function TousPortefeuilles() {
  // Filters state
  const [filterType, setFilterType] = useState<PortfolioType>('ALL');
  const [filterSector, setFilterSector] = useState<SectorType>('ALL');
  const [filterRisk, setFilterRisk] = useState<RiskLevel>('ALL');

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Load backend states
  const mfiState = useMemo(() => getMfiState(), []);
  const factoringState = useMemo(() => getFactoringState(), []);
  const leasingList = useMemo(() => leasingContracts, []);

  // Consolidate data into standard shape for uniform analysis
  const consolidatedItems = useMemo(() => {
    const list: any[] = [];

    // 1. Map Microfinance Loans
    mfiState.loans.forEach((loan) => {
      // Find sector and risk mapping
      let sector = 'Autre';
      if (loan.customerSecteur) {
        if (loan.customerSecteur.includes('Agri')) sector = 'Agriculture';
        else if (loan.customerSecteur.includes('Comm') || loan.customerSecteur.includes('Vent')) sector = 'Commerce';
        else if (loan.customerSecteur.includes('Indu') || loan.customerSecteur.includes('Manufact')) sector = 'Industrie';
        else if (loan.customerSecteur.includes('Serv') || loan.customerSecteur.includes('Hôtel')) sector = 'Services';
        else if (loan.customerSecteur.includes('Trans')) sector = 'Transport';
        else if (loan.customerSecteur.includes('BTP') || loan.customerSecteur.includes('Cons')) sector = 'BTP';
      }

      let riskStatus: RiskLevel = 'Sain';
      if (loan.status === 'litigation') riskStatus = 'Litige / Contentieux';
      else if (loan.status === 'written_off' || loan.status === 'default') riskStatus = 'Douteux';
      else if (loan.status === 'late' || loan.status === 'restructured') riskStatus = 'Watchlist';

      list.push({
        id: loan.id,
        reference: loan.loanNumber || loan.id,
        client: loan.clientName || 'Client MFI',
        type: 'MICROFINANCE',
        outstanding: loan.totalOutstanding || 0,
        amount: loan.originalAmount || 0,
        overdue: loan.overdueAmount || 0,
        daysLate: loan.daysPastDue || 0,
        sector,
        risk: riskStatus,
        agent: loan.assignedAgentName || 'Agent MFI',
        revenue: (loan.originalAmount || 0) * 0.08, // Interest estimate 8%
      });
    });

    // 2. Map Factoring Invoices
    factoringState.invoices.forEach((inv) => {
      // Find debtor sector
      let sector = 'Autre';
      const debtor = factoringState.debtors.find(d => d.id === inv.debtorId);
      if (debtor?.sector) {
        const dSec = debtor.sector.toLowerCase();
        if (dSec.includes('agri')) sector = 'Agriculture';
        else if (dSec.includes('comm') || dSec.includes('distr') || dSec.includes('vente')) sector = 'Commerce';
        else if (dSec.includes('ind') || dSec.includes('manufact') || dSec.includes('chim')) sector = 'Industrie';
        else if (dSec.includes('serv') || dSec.includes('tech') || dSec.includes('sante')) sector = 'Services';
        else if (dSec.includes('trans')) sector = 'Transport';
        else if (dSec.includes('btp') || dSec.includes('cons')) sector = 'BTP';
      }

      let riskStatus: RiskLevel = 'Sain';
      if (inv.status === 'disputed' || inv.status === 'litigation') riskStatus = 'Litige / Contentieux';
      else if (inv.status === 'overdue' && inv.remainingAmount > 0) riskStatus = 'Douteux';
      else if (inv.status === 'submitted') riskStatus = 'Watchlist';

      // Financed or active outstanding
      const outstanding = inv.status === 'financed' || inv.status === 'overdue' 
        ? inv.remainingAmount 
        : 0;

      list.push({
        id: inv.id,
        reference: inv.invoiceNumber,
        client: debtor?.name || 'Débiteur Factoring',
        type: 'FACTORING',
        outstanding: outstanding,
        amount: inv.amount,
        overdue: inv.status === 'overdue' ? inv.remainingAmount : 0,
        daysLate: inv.status === 'overdue' ? 15 : 0, // Estimate 15d late if overdue status
        sector,
        risk: riskStatus,
        agent: 'Équipe Affacturage',
        revenue: inv.amount * 0.03, // Est commissions
      });
    });

    // 3. Map Leasing Contracts
    leasingList.forEach((contract) => {
      // Find sector and risk mapping
      let sector = 'Autre';
      if (contract.asset?.type === 'vehicle' || contract.asset?.type === 'industrial') {
        sector = contract.asset.type === 'vehicle' ? 'Transport' : 'Industrie';
      } else if (contract.asset?.type === 'real_estate') {
        sector = 'BTP';
      } else if (contract.asset?.type === 'it_hardware') {
        sector = 'Services';
      }

      let riskStatus: RiskLevel = 'Sain';
      if (contract.status === 'litigation') riskStatus = 'Litige / Contentieux';
      else if (contract.status === 'recovery' || contract.status === 'written_off') riskStatus = 'Douteux';
      else if (contract.status === 'late' || contract.status === 'early_termination') riskStatus = 'Watchlist';

      // Outstanding capital
      const outstanding = contract.financials?.remainingCapital || 0;

      // Calculate total overdue amount
      const overdue = contract.installments
        .filter(i => i.status === 'late' || i.status === 'partial')
        .reduce((s, i) => s + (i.amount - i.paidAmount), 0);

      // Max days late
      const lateOnes = contract.installments.filter(i => i.status === 'late');
      const daysPresumed = lateOnes.length > 0 ? Math.max(...lateOnes.map(i => i.daysLate)) : 0;

      list.push({
        id: contract.id,
        reference: contract.id,
        client: contract.lessee?.name || 'Preneur Leasing',
        type: 'LEASING',
        outstanding: outstanding,
        amount: contract.financials?.totalCapital || 0,
         overdue: overdue,
        daysLate: daysPresumed,
        sector,
        risk: riskStatus,
        agent: contract.agent || 'Amel Ben Ali',
        revenue: contract.financials ? (contract.financials.monthlyRent * 12 * 0.06) : 0, // Approx interest margin
      });
    });

    return list;
  }, [mfiState, factoringState, leasingList]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return consolidatedItems.filter((item) => {
      const matchType = filterType === 'ALL' || item.type === filterType;
      const matchSector = filterSector === 'ALL' || item.sector === filterSector;
      const matchRisk = filterRisk === 'ALL' || item.risk === filterRisk;
      return matchType && matchSector && matchRisk;
    });
  }, [consolidatedItems, filterType, filterSector, filterRisk]);

  // Calculations for filtered indicators
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let par30Amount = 0;
    let totalRevenue = 0;

    filteredItems.forEach((item) => {
      totalOutstanding += item.outstanding;
      totalOverdue += item.overdue;
      totalRevenue += item.revenue;

      // PAR 30 logic: Is past due for over 30 days, or risk status is doubtful/litigation
      if (item.daysLate > 30 || item.risk === 'Douteux' || item.risk === 'Litige / Contentieux') {
        par30Amount += item.outstanding;
      }
    });

    const par30Weighted = totalOutstanding > 0 ? (par30Amount / totalOutstanding) * 100 : 0;

    return {
      totalOutstanding,
      totalOverdue,
      par30Weighted,
      totalRevenue,
    };
  }, [filteredItems]);

  // Charts data: Sector distribution
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((item) => {
      map[item.sector] = (map[item.sector] || 0) + item.outstanding;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  // Charts data: Risk distribution
  const riskData = useMemo(() => {
    const map: Record<string, number> = {
      'Sain': 0,
      'Watchlist': 0,
      'Douteux': 0,
      'Litige / Contentieux': 0,
    };
    filteredItems.forEach((item) => {
      map[item.risk] = (map[item.risk] || 0) + item.outstanding;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  // Find most exposed sector
  const topSector = useMemo(() => {
    if (sectorData.length === 0) return 'Aucun';
    const sorted = [...sectorData].sort((a, b) => b.value - a.value);
    return `${sorted[0].name} (${Math.round((sorted[0].value / (stats.totalOutstanding || 1)) * 100)}%)`;
  }, [sectorData, stats.totalOutstanding]);

  // Colors for charts
  const SECTOR_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
  const RISK_COLORS: Record<string, string> = {
    'Sain': '#10b981',
    'Watchlist': '#f59e0b',
    'Douteux': '#ef4444',
    'Litige / Contentieux': '#b91c1c',
  };

  // Run AI analysis
  const handleAiAudit = async () => {
    setIsAiLoading(true);
    setAiReport(null);
    try {
      const summaryPayload = {
        totalOutstanding: stats.totalOutstanding,
        totalOverdue: stats.totalOverdue,
        par30Weighted: stats.par30Weighted,
        totalRevenue: stats.totalRevenue,
        topSector,
        riskLevel: filterRisk,
      };

      const res = await fetch('/api/portefeuilles/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: summaryPayload,
          filters: {
            portfolio: filterType,
            sector: filterSector,
            risk: filterRisk,
          },
        }),
      });
      const data = await res.json();
      setAiReport(data.result);
    } catch (err) {
      console.error(err);
      setAiReport('Une erreur est survenue lors du chargement de l\'audit par l\'IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ['ID', 'Référence', 'Client', 'Type Portefeuille', 'Encours (TND)', 'Montant Initial (TND)', 'Impayés (TND)', 'Jours de Retard', 'Secteur', 'Niveau de Risque', 'Agent Assigné'];
    const rows = filteredItems.map(item => [
      item.id,
      item.reference,
      `"${item.client.replace(/"/g, '""')}"`,
      item.type,
      item.outstanding,
      item.amount,
      item.overdue,
      item.daysLate,
      item.sector,
      item.risk,
      `"${item.agent.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RecovAI_Portefeuille_Consolide_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]" id="tous-portefeuilles-page">
      {/* Upper header action area */}
      <div className="bg-white border-b border-gray-200 py-6 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900" id="page-title">
            Tous les Portefeuilles
          </h1>
          <p className="text-sm text-gray-500 mt-1" id="page-subtitle">
            Consolidation globale, gestion des encours et scoring réglementaire de Tunis
          </p>
        </div>
        <div className="flex items-center gap-3" id="header-actions">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md transition-all"
            id="btn-export-csv"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Exporter les données
          </button>
          <button
            disabled={isAiLoading}
            onClick={handleAiAudit}
            className="flex items-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium rounded-md transition-all shadow-sm shadow-indigo-100 disabled:opacity-50"
            id="btn-ai-audit"
          >
            {isAiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-200" />
            )}
            Audit Flash IA BCT
          </button>
        </div>
      </div>

      {/* Filter Toolbar Section */}
      <div className="bg-white border-b border-gray-150 py-4 px-8" id="filter-toolbar">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            Filtres globaux
          </div>

          {/* Portefeuille select */}
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight mb-1">Classe de Portefeuille</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PortfolioType)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="select-portfolio-type"
            >
              <option value="ALL">Tout Produit (Consolidé)</option>
              <option value="MICROFINANCE">Microfinance (Crédits)</option>
              <option value="FACTORING">Affacturage / Factoring</option>
              <option value="LEASING">Leasing / Crédit-bail</option>
            </select>
          </div>

          {/* Secteur select */}
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight mb-1">Secteur Exploitation</label>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value as SectorType)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="select-sector"
            >
              <option value="ALL">Tout Secteur d&apos;Activité</option>
              <option value="Agriculture">Agriculture / Pêche</option>
              <option value="Commerce">Commerce / Distribution</option>
              <option value="Industrie">Manufacture / Industrie</option>
              <option value="Services">Services aux entreprises</option>
              <option value="Transport">Transport et transit</option>
              <option value="BTP">BTP & Immobilier</option>
              <option value="Autre">Autres / Non Classés</option>
            </select>
          </div>

          {/* Risk Level select */}
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-tight mb-1">Niveau d&apos;Exposition BCT</label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="select-risk-level"
            >
              <option value="ALL">Tout Profil de Risque</option>
              <option value="Sain">Sain (Classe 1)</option>
              <option value="Watchlist">Watchlist / Retard léger (Classe 2)</option>
              <option value="Douteux">Impayé / Prorogé (Classe 3)</option>
              <option value="Litige / Contentieux">Litige / Recours Judiciaire</option>
            </select>
          </div>

          {/* Clear filters trigger if filtered */}
          {(filterType !== 'ALL' || filterSector !== 'ALL' || filterRisk !== 'ALL') && (
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterSector('ALL');
                setFilterRisk('ALL');
              }}
              className="text-xs text-indigo-650 hover:text-indigo-800 font-semibold self-end mb-1"
              id="btn-clear-filters"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Main scrolling content of dashboard */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8" id="dashboard-scroller">
        
        {/* KPI Cards section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="kpi-grid">
          {/* Card 1: Encours total */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm relative overflow-hidden" id="kpi-card-encours">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Encours Total Consolidé</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalOutstanding.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-gray-500">TND</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                {filteredItems.length} comptes correspondants
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Card 2: Souffrance globale */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm relative overflow-hidden" id="kpi-card-souffrance">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Solde en Souffrance Global</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-2">
                {stats.totalOverdue.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-amber-600">TND</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Taux d&apos;arriérés de {stats.totalOutstanding > 0 ? ((stats.totalOverdue / stats.totalOutstanding) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-amber-600" />
            </div>
          </div>

          {/* Card 3: PAR 30 Moyen Pondéré */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm relative overflow-hidden" id="kpi-card-par30">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">PAR 30 Moyen Pondéré</p>
              <h3 className={`text-2xl font-bold mt-2 ${stats.par30Weighted > 15 ? 'text-rose-650' : 'text-emerald-700'}`}>
                {stats.par30Weighted.toFixed(1)}%
              </h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                Seuil de risque optimal &lt; 5%
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.par30Weighted > 15 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <Info className={`w-6 h-6 ${stats.par30Weighted > 15 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
          </div>

          {/* Card 4: Commissions & Produits */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm relative overflow-hidden" id="kpi-card-comms">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Revenus Estimés Générés</p>
              <h3 className="text-2xl font-bold text-indigo-700 mt-2">
                {stats.totalRevenue.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-indigo-500">TND</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Coins className="w-3 h-3 text-indigo-500" />
                Secteur principal: {topSector.split(' ')[0]}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* AI report popup drawer if present */}
        {aiReport && (
          <div className="bg-indigo-50 hover:bg-slate-50 border border-indigo-200 rounded-xl p-8 relative shadow-sm" id="ai-report-box">
            <button
              onClick={() => setAiReport(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
              id="btn-close-ai-report"
            >
              ✕ Fermer synthèse
            </button>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-150 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-750" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Synthèse Analytique du Portefeuille · Moteur d&apos;Audit RecovAI
                  <span className="text-[10px] font-medium bg-indigo-200 text-indigo-800 py-0.5 px-2 rounded-full uppercase">IA Active</span>
                </h4>
                <div className="prose text-gray-700 text-sm max-w-none space-y-3 whitespace-pre-wrap font-sans" id="ai-report-body">
                  {aiReport}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts block container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="charts-block">
          {/* Chart 1: Sector Risk */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" id="chart-secteurs-card">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              Distribution par Secteur d&apos;Activité (Encours)
            </h3>
            <div className="h-64" id="chart-secteur-wrapper">
              {sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} stroke="#6b7280" />
                    <YAxis fontSize={11} stroke="#6b7280" tickFormatter={(v) => `${(v/1000)}k`} />
                    <RechartsTooltip formatter={(v: any) => [`${Number(v).toLocaleString()} TND`, 'Encours']} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Aucune donnée sectorielle correspondante
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Risk categorization and provision warning */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" id="chart-exposition-card">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Graphe d&apos;Exposition par Catégorie de Risque
            </h3>
            <div className="h-64" id="chart-exposition-wrapper">
              {riskData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => [`${Number(v).toLocaleString()} TND`, 'Encours']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Aucune donnée d&apos;exposition correspondante
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Consolidated Accounts Listings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm" id="comptes-listing-card">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-[#fafafa] rounded-t-xl">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-650" />
              Registre Consolidé des Engagements
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full font-medium border border-indigo-150">
              {filteredItems.length} comptes actifs listés
            </span>
          </div>

          <div className="overflow-x-auto" id="table-wrapper">
            <table className="w-full text-left" id="accounts-table">
              <thead>
                <tr className="bg-white text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-150">
                  <th className="py-4 px-6">Référence</th>
                  <th className="py-4 px-6">Client / Débiteur</th>
                  <th className="py-4 px-6">Type Produit</th>
                  <th className="py-4 px-6 text-right">Encours Restant</th>
                  <th className="py-4 px-6 text-right">Montant Initial</th>
                  <th className="py-4 px-6 text-right">Impayés</th>
                  <th className="py-4 px-6">Secteur</th>
                  <th className="py-4 px-6">Classe BCT</th>
                  <th className="py-4 px-6">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm" id="table-body">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50 transition-colors" id={`row-${item.id}`}>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-indigo-750">
                        {item.reference}
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {item.client}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.type === 'MICROFINANCE' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          item.type === 'FACTORING' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {item.type === 'MICROFINANCE' ? 'Microfinance' :
                           item.type === 'FACTORING' ? 'Affacturage' :
                           'Leasing'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-gray-900">
                        {item.outstanding.toLocaleString('fr-FR')} TND
                      </td>
                      <td className="py-4 px-6 text-right text-gray-500">
                        {item.amount.toLocaleString('fr-FR')} TND
                      </td>
                      <td className={`py-4 px-6 text-right font-semibold ${item.overdue > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                        {item.overdue > 0 ? `${item.overdue.toLocaleString('fr-FR')} TND` : '—'}
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">
                        {item.sector}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.risk === 'Sain' ? 'bg-emerald-50 text-emerald-800' :
                          item.risk === 'Watchlist' ? 'bg-amber-50 text-amber-800' :
                          item.risk === 'Douteux' ? 'bg-rose-50 text-rose-800' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.risk === 'Sain' ? 'bg-emerald-500' :
                            item.risk === 'Watchlist' ? 'bg-amber-500' :
                            item.risk === 'Douteux' ? 'bg-rose-500' :
                            'bg-red-600'
                          }`} />
                          {item.risk}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-xs">
                        {item.agent}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr id="empty-row">
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      Aucun engagement ne correspond à la configuration des filtres actifs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
