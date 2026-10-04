import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  User,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Car,
  TrendingUp,
  Scale,
  FileText,
  FileSpreadsheet,
  Phone,
  Mail,
  Send,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Printer,
  FileCheck,
  Clock,
  Briefcase,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ClientProfile360 {
  id: string;
  name: string;
  type: 'corporate' | 'individual';
  identifier: string; // MF or CIN
  rcNumber?: string;
  sector: string;
  legalForm: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  accountOfficer: string;
  branch: string;
  
  // Risk & Global Scoring
  globalScore: number; // 0 - 100
  bctClassification: 'Class 0 (Sain)' | 'Class 1 (À surveiller)' | 'Class 2 (Incertain)' | 'Class 3 (Préoccupant)' | 'Class 4 (Compromis)';
  ifrs9Stage: 'Stage 1' | 'Stage 2' | 'Stage 3';
  riskRating: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  totalOutstanding: number; // Total encours (TND)
  totalOverdue: number; // Total impayés (TND)
  totalProvisionECL: number; // Provisions IFRS 9
  totalGuaranteesValue: number; // Total garanties
  coverageRatio: number; // % garanties / encours

  // Multi-product breakdown
  products: {
    leasing: {
      activeContractsCount: number;
      totalRemainingPrincipal: number;
      overdueRents: number;
      contracts: Array<{
        id: string;
        asset: string;
        startDate: string;
        monthlyRent: number;
        unpaidMonths: number;
        overdueAmount: number;
        status: string;
      }>;
    };
    factoring: {
      assignedInvoicesCount: number;
      fundedAmount: number;
      overdueInvoicesAmount: number;
      invoices: Array<{
        id: string;
        debtorBuyer: string;
        amount: number;
        dueDate: string;
        delayDays: number;
        status: string;
      }>;
    };
    creditIfrs9: {
      loansCount: number;
      totalOutstanding: number;
      overduePrincipalInterest: number;
      stage: 'Stage 1' | 'Stage 2' | 'Stage 3';
      eclProvision: number;
      loans: Array<{
        id: string;
        type: string;
        amount: number;
        rate: number;
        remainingTerm: string;
        overdue: number;
        stage: string;
      }>;
    };
    microfinance?: {
      loanId: string;
      contractNumber: string;
      overdueAmount: number;
      groupName?: string;
      solidarityCautions: string[];
    };
    litigation: {
      activeCasesCount: number;
      totalClaimed: number;
      cases: Array<{
        id: string;
        jurisdiction: string;
        stage: string;
        lawyer: string;
        claimedAmount: number;
        lastUpdate: string;
      }>;
    };
  };

  // Guarantees
  guarantees: Array<{
    id: string;
    type: string;
    description: string;
    estimatedValue: number;
    rank: string;
    formalized: boolean;
  }>;

  // Unified Interactions History
  history: Array<{
    date: string;
    type: 'sms' | 'call' | 'visit' | 'email' | 'legal' | 'payment';
    title: string;
    description: string;
    author: string;
  }>;
}

const MOCK_CLIENTS_360: ClientProfile360[] = [
  {
    id: 'CLI-TUN-001',
    name: 'Société Carthage Agro SARL',
    type: 'corporate',
    identifier: 'MF: 0984321/B/A/000',
    rcNumber: 'RC B0198432021',
    sector: 'Agroalimentaire & Transformation',
    legalForm: 'Société à Responsabilité Limitée',
    address: 'Zone Industrielle Charguia II',
    city: 'Tunis',
    phone: '+216 71 890 120',
    email: 'direction@carthage-agro.tn',
    accountOfficer: 'Karim Slama (Pôle Entreprises)',
    branch: 'Agence Tunis Corporate',
    
    globalScore: 38,
    bctClassification: 'Class 2 (Incertain)',
    ifrs9Stage: 'Stage 2',
    riskRating: 'Élevé',
    totalOutstanding: 685000,
    totalOverdue: 142800,
    totalProvisionECL: 78500,
    totalGuaranteesValue: 720000,
    coverageRatio: 105.1,

    products: {
      leasing: {
        activeContractsCount: 2,
        totalRemainingPrincipal: 280000,
        overdueRents: 48500,
        contracts: [
          {
            id: 'LSG-2023-089',
            asset: 'Ligne d\'embouteillage automatisée Krones',
            startDate: '15/03/2023',
            monthlyRent: 8500,
            unpaidMonths: 4,
            overdueAmount: 34000,
            status: 'En recouvrement amiable (J+112)',
          },
          {
            id: 'LSG-2024-012',
            asset: 'Camion frigorifique Isuzu 12T',
            startDate: '10/01/2024',
            monthlyRent: 3625,
            unpaidMonths: 4,
            overdueAmount: 14500,
            status: 'Relance Niveau 2',
          }
        ]
      },
      factoring: {
        assignedInvoicesCount: 3,
        fundedAmount: 145000,
        overdueInvoicesAmount: 36300,
        invoices: [
          {
            id: 'FAC-INV-8891',
            debtorBuyer: 'STEG (Direction Générale)',
            amount: 22000,
            dueDate: '15/04/2026',
            delayDays: 62,
            status: 'Attente visa ordonnancement BCT',
          },
          {
            id: 'FAC-INV-8904',
            debtorBuyer: 'Monoprix Tunisie SARL',
            amount: 14300,
            dueDate: '30/04/2026',
            delayDays: 47,
            status: 'Litige réception marchandise',
          }
        ]
      },
      creditIfrs9: {
        loansCount: 1,
        totalOutstanding: 260000,
        overduePrincipalInterest: 58000,
        stage: 'Stage 2',
        eclProvision: 46800,
        loans: [
          {
            id: 'CRD-EXP-4401',
            type: 'Crédit Moyen Terme - Extension Usine',
            amount: 260000,
            rate: 11.25,
            remainingTerm: '36 mois',
            overdue: 58000,
            stage: 'Stage 2 (Dégradation significative)',
          }
        ]
      },
      litigation: {
        activeCasesCount: 0,
        totalClaimed: 0,
        cases: []
      }
    },

    guarantees: [
      {
        id: 'GAR-001',
        type: 'Hypothèque de 1er rang',
        description: 'Usine industrielle Z.I Charguia II (Titre foncier N° 45120 Tunis)',
        estimatedValue: 550000,
        rank: '1er Rang',
        formalized: true,
      },
      {
        id: 'GAR-002',
        type: 'Nantissement de matériel',
        description: 'Ligne d\'embouteillage industrielle inscrite au registre du commerce',
        estimatedValue: 120000,
        rank: '1er Rang',
        formalized: true,
      },
      {
        id: 'GAR-003',
        type: 'Caution Personnelle & Solidaire',
        description: 'Caution solidaire et indéfinie du gérant majoritaire M. Karim Triki',
        estimatedValue: 50000,
        rank: 'Engagement solidaire',
        formalized: true,
      }
    ],

    history: [
      {
        date: '14/06/2026',
        type: 'call',
        title: 'Appel téléphonique avec le Gérant (M. Triki)',
        description: 'Le gérant promet un virement de 25 000 TND dès déblocage de la facture STEG en factoring.',
        author: 'Leila Mansour (Recouvreur Senior)'
      },
      {
        date: '02/06/2026',
        type: 'sms',
        title: 'Relance SMS Automatisée RecovAI',
        description: 'Notification multicanal des 4 loyers impayés sur le contrat de leasing LSG-2023-089.',
        author: 'Système Moteur IA'
      },
      {
        date: '20/05/2026',
        type: 'visit',
        title: 'Visite sur site - Z.I Charguia',
        description: 'Constat de l\'activité sur le site : usine en fonctionnement régulier, mais tension de trésorerie avérée.',
        author: 'Ahmed Ben Salah (Inspecteur Crédit)'
      }
    ]
  },
  {
    id: 'CLI-TUN-002',
    name: 'Mediterranean Export & Logistique SA',
    type: 'corporate',
    identifier: 'MF: 1102934/C/A/000',
    rcNumber: 'RC B0943212019',
    sector: 'Transport & Logistique Internationale',
    legalForm: 'Société Anonyme',
    address: 'Port de Radès, Zone Franche',
    city: 'Ben Arous',
    phone: '+216 79 450 670',
    email: 'finance@med-export.tn',
    accountOfficer: 'Amel Ben Salem',
    branch: 'Agence Port Radès',

    globalScore: 22,
    bctClassification: 'Class 3 (Préoccupant)',
    ifrs9Stage: 'Stage 3',
    riskRating: 'Critique',
    totalOutstanding: 495000,
    totalOverdue: 218500,
    totalProvisionECL: 165000,
    totalGuaranteesValue: 380000,
    coverageRatio: 76.7,

    products: {
      leasing: {
        activeContractsCount: 3,
        totalRemainingPrincipal: 320000,
        overdueRents: 145000,
        contracts: [
          {
            id: 'LSG-2022-044',
            asset: '3 Tracteurs Routiers Volvo FH 500',
            startDate: '10/06/2022',
            monthlyRent: 14200,
            unpaidMonths: 7,
            overdueAmount: 99400,
            status: 'Transfert Pré-Contentieux recommandé',
          },
          {
            id: 'LSG-2023-019',
            asset: '2 Semi-remorques Frigorifiques Schmitz',
            startDate: '14/02/2023',
            monthlyRent: 6500,
            unpaidMonths: 7,
            overdueAmount: 45600,
            status: 'En défaut avéré',
          }
        ]
      },
      factoring: {
        assignedInvoicesCount: 1,
        fundedAmount: 45000,
        overdueInvoicesAmount: 28500,
        invoices: [
          {
            id: 'FAC-INV-7602',
            debtorBuyer: 'Société Tunisienne des Industries de Raffinage',
            amount: 28500,
            dueDate: '10/02/2026',
            delayDays: 126,
            status: 'Créance contestée',
          }
        ]
      },
      creditIfrs9: {
        loansCount: 1,
        totalOutstanding: 130000,
        overduePrincipalInterest: 45000,
        stage: 'Stage 3',
        eclProvision: 65000,
        loans: [
          {
            id: 'CRD-TRES-102',
            type: 'Facilité de Caisse & Escompte',
            amount: 130000,
            rate: 12.0,
            remainingTerm: 'Exigibilité immédiate',
            overdue: 45000,
            stage: 'Stage 3 (Défaut IFRS 9)',
          }
        ]
      },
      litigation: {
        activeCasesCount: 1,
        totalClaimed: 145000,
        cases: [
          {
            id: 'CTX-2026-088',
            jurisdiction: 'Tribunal de 1ère Instance de Ben Arous',
            stage: 'Injonction de payer signifiée',
            lawyer: 'Me. Tarak Belhadj',
            claimedAmount: 145000,
            lastUpdate: '28/05/2026',
          }
        ]
      }
    },

    guarantees: [
      {
        id: 'GAR-004',
        type: 'Nantissement de parc roulant',
        description: 'Gage sans dépossession sur les 3 tracteurs Volvo FH',
        estimatedValue: 280000,
        rank: '1er Rang',
        formalized: true,
      },
      {
        id: 'GAR-005',
        type: 'Caution Bancaire Étrangère',
        description: 'Garantie autonome à première demande',
        estimatedValue: 100000,
        rank: 'Garantie autonome',
        formalized: false,
      }
    ],

    history: [
      {
        date: '28/05/2026',
        type: 'legal',
        title: 'Signification d\'injonction de payer par Huissier',
        description: 'Sommation avec délai de 5 jours ouvrables délivrée au siège social par Me. Samir (Huissier de justice).',
        author: 'Pôle Juridique RecovAI'
      },
      {
        date: '10/05/2026',
        type: 'email',
        title: 'Mise en demeure préalable par LRAR',
        description: 'Dénonciation formelle des facilités et mise en jeu de la clause résolutoire du contrat de leasing.',
        author: 'Contentieux RecovAI'
      }
    ]
  },
  {
    id: 'CLI-TUN-003',
    name: 'Mohamed Yassine Gharbi',
    type: 'individual',
    identifier: 'CIN: 04567891',
    sector: 'Profession Libérale (Médecin Spécialiste)',
    legalForm: 'Personne Physique',
    address: 'Avenue Habib Bourguiba, Résidence Les Oliviers',
    city: 'Sousse',
    phone: '+216 98 334 556',
    email: 'dr.my.gharbi@gnet.tn',
    accountOfficer: 'Nadia Trabelsi',
    branch: 'Agence Sousse Centre',

    globalScore: 64,
    bctClassification: 'Class 1 (À surveiller)',
    ifrs9Stage: 'Stage 1',
    riskRating: 'Modéré',
    totalOutstanding: 142000,
    totalOverdue: 18500,
    totalProvisionECL: 4200,
    totalGuaranteesValue: 190000,
    coverageRatio: 133.8,

    products: {
      leasing: {
        activeContractsCount: 1,
        totalRemainingPrincipal: 62000,
        overdueRents: 8500,
        contracts: [
          {
            id: 'LSG-2024-118',
            asset: 'Échographe Doppler 4D Siemens',
            startDate: '12/02/2024',
            monthlyRent: 2833,
            unpaidMonths: 3,
            overdueAmount: 8500,
            status: 'Relance Amiable Standard',
          }
        ]
      },
      factoring: {
        assignedInvoicesCount: 0,
        fundedAmount: 0,
        overdueInvoicesAmount: 0,
        invoices: []
      },
      creditIfrs9: {
        loansCount: 1,
        totalOutstanding: 80000,
        overduePrincipalInterest: 10000,
        stage: 'Stage 1',
        eclProvision: 2400,
        loans: [
          {
            id: 'CRD-CAB-2023',
            type: 'Prêt d\'installation Cabinet Médical',
            amount: 80000,
            rate: 9.75,
            remainingTerm: '48 mois',
            overdue: 10000,
            stage: 'Stage 1 (Normal)',
          }
        ]
      },
      microfinance: undefined,
      litigation: {
        activeCasesCount: 0,
        totalClaimed: 0,
        cases: []
      }
    },

    guarantees: [
      {
        id: 'GAR-006',
        type: 'Hypothèque Immobilière',
        description: 'Local professionnel Cabinet Médical Sousse',
        estimatedValue: 150000,
        rank: '1er Rang',
        formalized: true,
      },
      {
        id: 'GAR-007',
        type: 'Assurance Décès-Invalidité',
        description: 'Police d\'assurance déléguée en faveur de la banque',
        estimatedValue: 40000,
        rank: 'Délégation',
        formalized: true,
      }
    ],

    history: [
      {
        date: '10/06/2026',
        type: 'sms',
        title: 'Confirmation de promesse de paiement',
        description: 'Le client confirme le règlement de 10 000 TND pour le 25 juin 2026 (honoraires cliniques reçus).',
        author: 'Système SMS RecovAI'
      }
    ]
  }
];

export default function Client360() {
  const [selectedClientId, setSelectedClientId] = useState<string>('CLI-TUN-001');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'guarantees' | 'history' | 'actions'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'corporate' | 'individual'>('all');

  const filteredClients = useMemo(() => {
    return MOCK_CLIENTS_360.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || c.type === filterType;
      return matchSearch && matchType;
    });
  }, [searchQuery, filterType]);

  const client = useMemo(() => {
    return MOCK_CLIENTS_360.find(c => c.id === selectedClientId) || MOCK_CLIENTS_360[0];
  }, [selectedClientId]);

  const handleActionToast = (action: string) => {
    toast({
      title: `Action Déclenchée : ${action}`,
      description: `Opération exécutée avec succès pour le débiteur ${client.name}.`,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getStageBadge = (stage: string) => {
    if (stage === 'Stage 1') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (stage === 'Stage 2') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-crimson/10 text-crimson rounded-full flex items-center gap-1.5 border border-crimson/20">
              <Sparkles size={13} />
              Vue Client 360° Unifiée
            </span>
            <span className="text-xs text-slate-400">· Consolidation Multi-Engagements</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-serif-display text-charcoal font-bold tracking-tight">
            Fiche Débiteur & Consolidation Multi-Produits
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visualisation consolidée des risques, impayés, contrats de leasing, affacturage, crédits IFRS 9 et contentieux.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleActionToast('Mise en Demeure Globale Multi-Contrats')}
            className="btn-crimson flex items-center gap-2 text-xs font-semibold px-3.5 py-2"
          >
            <Printer size={14} />
            Mise en Demeure Globale
          </button>
          <button
            onClick={() => handleActionToast('Protocole de Rééchelonnement Amiable')}
            className="px-3.5 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 text-charcoal text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors"
          >
            <FileSpreadsheet size={14} className="text-slate-600" />
            Plan de Restructuration
          </button>
        </div>
      </div>

      {/* Main Grid: Client Selector Sidebar + Detailed 360 View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Client List Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-border/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Portefeuille Débiteurs</span>
              <span className="text-xs font-bold text-crimson bg-crimson/10 px-2 py-0.5 rounded-full">{filteredClients.length}</span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nom, MF, CIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border rounded-lg outline-none focus:border-crimson text-charcoal"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setFilterType('all')}
                className={cn('px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors', filterType === 'all' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType('corporate')}
                className={cn('px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors', filterType === 'corporate' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                Entreprises
              </button>
              <button
                onClick={() => setFilterType('individual')}
                className={cn('px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors', filterType === 'individual' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                Particuliers
              </button>
            </div>

            {/* Client Cards List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredClients.map((c) => {
                const isSelected = c.id === selectedClientId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={cn(
                      'p-3.5 rounded-lg border transition-all cursor-pointer relative',
                      isSelected
                        ? 'bg-crimson/5 border-crimson shadow-xs'
                        : 'bg-white border-border/70 hover:border-slate-300 hover:bg-slate-50/80'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold',
                          c.type === 'corporate' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        )}>
                          {c.type === 'corporate' ? <Building2 size={14} /> : <User size={14} />}
                        </div>
                        <span className="font-bold text-xs text-charcoal truncate">{c.name}</span>
                      </div>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0', getScoreColor(c.globalScore))}>
                        Score: {c.globalScore}/100
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                      <span>{c.identifier}</span>
                      <span className="text-rose-600 font-bold">
                        Impayé: {c.totalOverdue.toLocaleString('fr-FR')} TND
                      </span>
                    </div>

                    {/* Active product tags */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {c.products.leasing.activeContractsCount > 0 && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                          Leasing ({c.products.leasing.activeContractsCount})
                        </span>
                      )}
                      {c.products.factoring.assignedInvoicesCount > 0 && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                          Factoring
                        </span>
                      )}
                      {c.products.creditIfrs9.loansCount > 0 && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                          IFRS 9 ({c.ifrs9Stage})
                        </span>
                      )}
                      {c.products.litigation.activeCasesCount > 0 && (
                        <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-bold">
                          Contentieux ({c.products.litigation.activeCasesCount})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Client 360 Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top Identity & Consolidated Risk Header */}
          <div className="bg-white rounded-xl border border-border/80 p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 border',
                  client.type === 'corporate' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                )}>
                  {client.type === 'corporate' ? <Building2 size={24} /> : <User size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-serif-display font-bold text-charcoal">{client.name}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {client.legalForm}
                    </span>
                    <span className="text-xs font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-border">
                      {client.identifier}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                    <span>Secteur: <strong className="text-slate-700">{client.sector}</strong></span>
                    <span>·</span>
                    <span>Agence: <strong className="text-slate-700">{client.branch}</strong></span>
                    <span>·</span>
                    <span>Gestionnaire: <strong className="text-slate-700">{client.accountOfficer}</strong></span>
                  </div>
                </div>
              </div>

              {/* Consolidated Risk Badge */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Score Consolidé RecovAI</span>
                <div className="flex items-center gap-2">
                  <div className={cn('text-2xl font-black px-3 py-1 rounded-lg border font-mono', getScoreColor(client.globalScore))}>
                    {client.globalScore}<span className="text-xs font-normal">/100</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-charcoal">{client.riskRating}</div>
                    <div className="text-[10px] text-slate-500">{client.bctClassification}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Multi-Exposure Matrix KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="p-3 bg-slate-50 rounded-lg border border-border/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Encours Total Engagé</span>
                <span className="text-lg font-serif-display font-bold text-charcoal mt-1 block">
                  {client.totalOutstanding.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">TND</span>
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Toutes lignes confondues</span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-700 block">Total Impayés Cumulés</span>
                <span className="text-lg font-serif-display font-bold text-rose-700 mt-1 block">
                  {client.totalOverdue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-rose-500">TND</span>
                </span>
                <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">
                  {((client.totalOverdue / client.totalOutstanding) * 100).toFixed(1)}% du total encours
                </span>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-800 block">Provisions IFRS 9 (ECL)</span>
                <span className="text-lg font-serif-display font-bold text-amber-800 mt-1 block">
                  {client.totalProvisionECL.toLocaleString('fr-FR')} <span className="text-xs font-normal text-amber-600">TND</span>
                </span>
                <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
                  {client.ifrs9Stage} · BCT 2024
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800 block">Valeur des Garanties</span>
                <span className="text-lg font-serif-display font-bold text-emerald-800 mt-1 block">
                  {client.totalGuaranteesValue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-emerald-600">TND</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                  Couverture : {client.coverageRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/80 bg-white px-4 rounded-t-xl gap-2 overflow-x-auto shadow-2xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'overview' ? 'border-crimson text-crimson' : 'border-transparent text-slate-500 hover:text-charcoal'
              )}
            >
              <Layers size={14} />
              Vue Consolidée Multi-Produits
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={cn(
                'py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'products' ? 'border-crimson text-crimson' : 'border-transparent text-slate-500 hover:text-charcoal'
              )}
            >
              <Coins size={14} />
              Détail des Contrats & Factures
            </button>
            <button
              onClick={() => setActiveTab('guarantees')}
              className={cn(
                'py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'guarantees' ? 'border-crimson text-crimson' : 'border-transparent text-slate-500 hover:text-charcoal'
              )}
            >
              <ShieldCheck size={14} />
              Garanties & Cautions ({client.guarantees.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'history' ? 'border-crimson text-crimson' : 'border-transparent text-slate-500 hover:text-charcoal'
              )}
            >
              <Clock size={14} />
              Historique des Interactions
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={cn(
                'py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap',
                activeTab === 'actions' ? 'border-crimson text-crimson' : 'border-transparent text-slate-500 hover:text-charcoal'
              )}
            >
              <Sparkles size={14} />
              Centre d'Actions IA & Relances
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="bg-white rounded-b-xl border border-t-0 border-border/80 p-6 shadow-xs min-h-[380px]">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Leasing Summary Box */}
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                        <Car size={16} className="text-blue-600" />
                        Leasing / Crédit-Bail
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {client.products.leasing.activeContractsCount} contrat(s)
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Principal Restant Dû</div>
                      <div className="text-base font-bold text-charcoal">
                        {client.products.leasing.totalRemainingPrincipal.toLocaleString('fr-FR')} TND
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-xs">
                      <span className="text-rose-600 font-bold">Loyers Impayés:</span>
                      <span className="font-bold text-rose-700 font-mono">
                        {client.products.leasing.overdueRents.toLocaleString('fr-FR')} TND
                      </span>
                    </div>
                  </div>

                  {/* Factoring Summary Box */}
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                        <TrendingUp size={16} className="text-indigo-600" />
                        Affacturage / Factoring
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                        {client.products.factoring.assignedInvoicesCount} facture(s)
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Financement Accordé</div>
                      <div className="text-base font-bold text-charcoal">
                        {client.products.factoring.fundedAmount.toLocaleString('fr-FR')} TND
                      </div>
                    </div>
                    <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs">
                      <span className="text-rose-600 font-bold">Créances Échues:</span>
                      <span className="font-bold text-rose-700 font-mono">
                        {client.products.factoring.overdueInvoicesAmount.toLocaleString('fr-FR')} TND
                      </span>
                    </div>
                  </div>

                  {/* Credit IFRS 9 Summary Box */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <Coins size={16} className="text-amber-600" />
                        Crédits & IFRS 9
                      </div>
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', getStageBadge(client.ifrs9Stage))}>
                        {client.ifrs9Stage}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Encours Total Crédits</div>
                      <div className="text-base font-bold text-charcoal">
                        {client.products.creditIfrs9.totalOutstanding.toLocaleString('fr-FR')} TND
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
                      <span className="text-rose-600 font-bold">Échéances Échues:</span>
                      <span className="font-bold text-rose-700 font-mono">
                        {client.products.creditIfrs9.overduePrincipalInterest.toLocaleString('fr-FR')} TND
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contentieux status alert banner if any */}
                {client.products.litigation.activeCasesCount > 0 ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <Scale className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-900 leading-relaxed">
                      <strong className="font-bold block text-sm">Procédure Judiciaire Active ({client.products.litigation.activeCasesCount} dossier)</strong>
                      Ce client fait l'objet d'une poursuite contentieuse au {client.products.litigation.cases[0]?.jurisdiction}.
                      Montant en litige : <strong>{client.products.litigation.totalClaimed.toLocaleString('fr-FR')} TND</strong>. Avocat en charge : {client.products.litigation.cases[0]?.lawyer}.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-emerald-900">
                      <strong>Aucun litige judiciaire ouvert :</strong> Dossier actuellement géré en phase de recouvrement amiable & pré-contentieux.
                    </div>
                  </div>
                )}

                {/* Contact & Agency Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Téléphone & WhatsApp</span>
                    <span className="font-bold text-charcoal mt-0.5 flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" />
                      {client.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Courrier Électronique</span>
                    <span className="font-bold text-charcoal mt-0.5 flex items-center gap-1.5">
                      <Mail size={13} className="text-blue-600" />
                      {client.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Adresse Siège</span>
                    <span className="font-bold text-charcoal mt-0.5 block truncate">
                      {client.address}, {client.city}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DETAILED CONTRACTS */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {/* 1. Leasing Contracts Section */}
                <div>
                  <h3 className="text-sm font-bold text-charcoal flex items-center gap-2 mb-3">
                    <Car size={16} className="text-blue-600" />
                    Contrats de Leasing / Crédit-Bail ({client.products.leasing.contracts.length})
                  </h3>
                  <div className="overflow-x-auto border border-border/80 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-border/80 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">N° Contrat</th>
                          <th className="p-2.5">Bien Loué</th>
                          <th className="p-2.5">Loyer Mensuel</th>
                          <th className="p-2.5">Mois Impayés</th>
                          <th className="p-2.5">Montant Impayé</th>
                          <th className="p-2.5">Statut Dossier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {client.products.leasing.contracts.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-blue-700">{c.id}</td>
                            <td className="p-2.5 font-medium text-charcoal">{c.asset}</td>
                            <td className="p-2.5 font-mono">{c.monthlyRent.toLocaleString('fr-FR')} TND</td>
                            <td className="p-2.5 font-bold text-rose-600">{c.unpaidMonths} mois</td>
                            <td className="p-2.5 font-bold text-rose-700 font-mono">{c.overdueAmount.toLocaleString('fr-FR')} TND</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Factoring Invoices Section */}
                <div>
                  <h3 className="text-sm font-bold text-charcoal flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-indigo-600" />
                    Factures Cédées en Affacturage ({client.products.factoring.invoices.length})
                  </h3>
                  {client.products.factoring.invoices.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                      Aucune créance cédée en cours d'affacturage.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border/80 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-border/80 text-slate-500 font-semibold">
                          <tr>
                            <th className="p-2.5">N° Facture</th>
                            <th className="p-2.5">Acheteur / Débiteur Cédé</th>
                            <th className="p-2.5">Montant Facture</th>
                            <th className="p-2.5">Échéance</th>
                            <th className="p-2.5">Retard (Jours)</th>
                            <th className="p-2.5">Statut Recouvrement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {client.products.factoring.invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-mono font-bold text-indigo-700">{inv.id}</td>
                              <td className="p-2.5 font-medium text-charcoal">{inv.debtorBuyer}</td>
                              <td className="p-2.5 font-mono font-bold">{inv.amount.toLocaleString('fr-FR')} TND</td>
                              <td className="p-2.5 text-slate-500">{inv.dueDate}</td>
                              <td className="p-2.5 font-bold text-rose-600">+{inv.delayDays} j</td>
                              <td className="p-2.5 text-slate-700">{inv.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Credits & Loans */}
                <div>
                  <h3 className="text-sm font-bold text-charcoal flex items-center gap-2 mb-3">
                    <Coins size={16} className="text-amber-600" />
                    Crédits Bancaires & Provisionnement IFRS 9 ({client.products.creditIfrs9.loans.length})
                  </h3>
                  <div className="overflow-x-auto border border-border/80 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-border/80 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">Réf Crédit</th>
                          <th className="p-2.5">Type de Ligne</th>
                          <th className="p-2.5">Encours Initial</th>
                          <th className="p-2.5">Taux</th>
                          <th className="p-2.5">Impayé Principal</th>
                          <th className="p-2.5">Stage IFRS 9</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {client.products.creditIfrs9.loans.map((loan) => (
                          <tr key={loan.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-amber-800">{loan.id}</td>
                            <td className="p-2.5 font-medium text-charcoal">{loan.type}</td>
                            <td className="p-2.5 font-mono">{loan.amount.toLocaleString('fr-FR')} TND</td>
                            <td className="p-2.5">{loan.rate}%</td>
                            <td className="p-2.5 font-bold text-rose-600 font-mono">{loan.overdue.toLocaleString('fr-FR')} TND</td>
                            <td className="p-2.5">
                              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', getStageBadge(client.ifrs9Stage))}>
                                {loan.stage}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GUARANTEES */}
            {activeTab === 'guarantees' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-charcoal">
                    Garanties & Cautions Réelles / Personnelles Enregistrées
                  </h3>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    Valeur Totale Évaluée: {client.totalGuaranteesValue.toLocaleString('fr-FR')} TND
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {client.guarantees.map((g) => (
                    <div key={g.id} className="p-4 rounded-xl border border-border/80 bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                          <ShieldCheck size={15} className="text-emerald-600" />
                          {g.type}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-border rounded text-slate-600">
                          {g.rank}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Valeur d'expertise:</span>
                        <span className="font-bold font-mono text-emerald-700">{g.estimatedValue.toLocaleString('fr-FR')} TND</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: INTERACTIONS HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-charcoal">Piste d'Audit & Journal des Actions Consolidées</h3>
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {client.history.map((hist, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-crimson border-2 border-white shadow-xs" />
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-border/70 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-charcoal">{hist.title}</span>
                          <span className="text-[11px] font-mono text-slate-400">{hist.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{hist.description}</p>
                        <div className="text-[10px] text-slate-400 pt-1">Par: {hist.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: AI & ACTION CENTER */}
            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-crimson/5 border border-crimson/20 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-crimson">Recommandation Stratégique RecovAI</h4>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      Le profil <strong>{client.name}</strong> cumule {client.totalOverdue.toLocaleString('fr-FR')} TND d'impayés sur le leasing et les crédits. Le ratio de couverture des garanties est de {client.coverageRatio.toFixed(1)}%. Il est recommandé de notifier une <strong>Mise en demeure groupée avec clause résolutoire sous 15 jours</strong> avant transfert contentieux.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-white shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Relance Multicanal Instantanée</h4>
                    <p className="text-xs text-slate-600">
                      Envoie un SMS + Message WhatsApp + Email avec récapitulatif précis des loyers et crédits impayés.
                    </p>
                    <button
                      onClick={() => handleActionToast('Relance Multicanal (SMS + WhatsApp + Email)')}
                      className="w-full py-2 bg-navy hover:bg-navy/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Send size={13} />
                      Déclencher la Relance Groupée
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-white shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Génération d'Acte Juridique</h4>
                    <p className="text-xs text-slate-600">
                      Génère un brouillon de requête d'injonction de payer (relecture par l'avocat obligatoire avant dépôt au tribunal).
                    </p>
                    <button
                      onClick={() => handleActionToast('Requête Injonction de Payer')}
                      className="w-full py-2 bg-crimson hover:bg-crimson/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Scale size={13} />
                      Générer Requête d'Injonction
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
