import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Search,
  User,
  Building2,
  FileText,
  Scale,
  Car,
  TrendingUp,
  Sprout,
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { litigationCases } from '@/lib/litigation-mock';
import { leasingContracts } from '@/lib/leasing-mock';
import { initialInvoices } from '@/lib/factoring-mock';
import { getMfiState } from '@/lib/microfinance-mock';

export interface GlobalSearchItem {
  id: string;
  type: 'client360' | 'contentieux' | 'leasing' | 'factoring' | 'microfinance' | 'credit';
  typeLabel: string;
  title: string;
  subtitle: string;
  identifier: string; // CIN or Matricule Fiscal
  contractNumber?: string;
  amount?: number;
  status: string;
  statusColor?: string;
  url: string;
}

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Listen to Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  // Aggregate searchable items from all modules
  const allItems: GlobalSearchItem[] = useMemo(() => {
    const items: GlobalSearchItem[] = [];

    // 0. Consolidated 360 Client Profiles
    items.push(
      {
        id: 'CLI-TUN-001',
        type: 'client360',
        typeLabel: 'Fiche Client 360°',
        title: 'Société Carthage Agro SARL',
        subtitle: 'Consolidation Multi-Produits (Leasing + Factoring + Crédit)',
        identifier: 'MF: 0984321/B/A/000',
        contractNumber: 'CLI-TUN-001',
        amount: 142800,
        status: 'Score: 38/100 · Stage 2',
        url: '/client-360',
      },
      {
        id: 'CLI-TUN-002',
        type: 'client360',
        typeLabel: 'Fiche Client 360°',
        title: 'Mediterranean Export & Logistique SA',
        subtitle: 'Consolidation Multi-Produits (Leasing + Contentieux)',
        identifier: 'MF: 1102934/C/A/000',
        contractNumber: 'CLI-TUN-002',
        amount: 218500,
        status: 'Score: 22/100 · Stage 3',
        url: '/client-360',
      },
      {
        id: 'CLI-TUN-003',
        type: 'client360',
        typeLabel: 'Fiche Client 360°',
        title: 'Mohamed Yassine Gharbi',
        subtitle: 'Fiche Personne Physique (Leasing + Prêt Pro)',
        identifier: 'CIN: 04567891',
        contractNumber: 'CLI-TUN-003',
        amount: 18500,
        status: 'Score: 64/100 · Stage 1',
        url: '/client-360',
      }
    );

    // 1. Contentieux Cases
    litigationCases.forEach((c) => {
      items.push({
        id: c.id,
        type: 'contentieux',
        typeLabel: 'Contentieux Judiciaire',
        title: c.debtor?.name || 'Débiteur Inconnu',
        subtitle: `Dossier ${c.id} · ${c.court?.name || 'Tribunal de Tunis'}`,
        identifier: c.debtor?.siren ? `MF: ${c.debtor.siren}` : 'CIN: 08765432',
        contractNumber: c.id,
        amount: (c.amount?.principal || 0) + (c.amount?.interest || 0),
        status: c.stage,
        url: `/litigation/${c.id}`,
      });
    });

    // 2. Leasing Contracts
    leasingContracts.forEach((c) => {
      items.push({
        id: c.id,
        type: 'leasing',
        typeLabel: 'Leasing / Crédit-Bail',
        title: c.lessee?.name || 'Preneur Inconnu',
        subtitle: `Contrat ${c.id} · ${c.asset?.description || 'Matériel'}`,
        identifier: c.lessee?.siren ? `RC: ${c.lessee.siren}` : 'RC: B1234567',
        contractNumber: c.id,
        amount: c.financials?.remainingCapital || 0,
        status: c.status,
        url: `/leasing/${c.id}`,
      });
    });

    // 3. Factoring Invoices
    initialInvoices.forEach((inv) => {
      items.push({
        id: inv.id,
        type: 'factoring',
        typeLabel: 'Factoring / Affacturage',
        title: inv.debtorName || 'Acheteur Cédé',
        subtitle: `Facture ${inv.invoiceNumber} · Code: ${inv.clientCode}`,
        identifier: inv.clientCode || 'CLI-9902',
        contractNumber: inv.invoiceNumber,
        amount: inv.amount,
        status: inv.status,
        url: `/factoring`,
      });
    });

    // 4. Microfinance Clients
    try {
      const mfiState = getMfiState();
      mfiState.clients.forEach((client) => {
        const loan = mfiState.loans.find(l => l.clientId === client.id);
        items.push({
          id: client.id,
          type: 'microfinance',
          typeLabel: 'Microfinance (IMF)',
          title: client.name,
          subtitle: `Client ${client.id} · ${client.businessSector || 'Activité AGR'}`,
          identifier: client.nationalId ? `CIN: ${client.nationalId}` : 'CIN: Inconnu',
          contractNumber: loan?.id || client.id,
          amount: loan?.overduePrincipal || loan?.principalAmount || 0,
          status: loan?.status || 'Actif',
          url: `/microfinance`,
        });
      });
    } catch {
      // fallback
    }

    return items;
  }, []);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems.slice(0, 8);
    }

    const cleanQuery = query.toLowerCase().trim();
    return allItems
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(cleanQuery) ||
          item.id.toLowerCase().includes(cleanQuery) ||
          (item.contractNumber && item.contractNumber.toLowerCase().includes(cleanQuery)) ||
          item.identifier.toLowerCase().includes(cleanQuery) ||
          item.typeLabel.toLowerCase().includes(cleanQuery) ||
          item.subtitle.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 15);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: GlobalSearchItem) => {
    setOpen(false);
    navigate(item.url);
  };

  const getTypeBadge = (type: GlobalSearchItem['type']) => {
    switch (type) {
      case 'client360':
        return {
          icon: Users,
          color: 'text-purple-700 bg-purple-50 border-purple-200',
          label: 'Client 360°',
        };
      case 'contentieux':
        return {
          icon: Scale,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          label: 'Contentieux',
        };
      case 'leasing':
        return {
          icon: Car,
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          label: 'Leasing',
        };
      case 'factoring':
        return {
          icon: TrendingUp,
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          label: 'Factoring',
        };
      case 'microfinance':
        return {
          icon: Sprout,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          label: 'Microfinance',
        };
      default:
        return {
          icon: FileText,
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          label: 'Crédit / IFRS 9',
        };
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border border-border/80 rounded-xl">
          {/* Search Header */}
          <div className="flex items-center px-4 border-b border-border/80 bg-paper-soft dark:bg-slate-900/90">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher par Débiteur, CIN, Matricule Fiscal, N° de Contrat (ex: LSG-2024, CTX-101)..."
              className="w-full py-4 text-base bg-transparent outline-none placeholder:text-slate-400 text-charcoal dark:text-white font-medium"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs font-semibold px-2 py-1 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 mr-2"
              >
                Effacer
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-800 dark:text-slate-400 border border-border rounded shadow-sm">
              ESC
            </kbd>
          </div>

          {/* Search Quick Filters / Chips */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-border/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <span className="font-medium text-slate-600 dark:text-slate-300">Recherche 360° :</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 font-mono text-[11px]">CIN</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 font-mono text-[11px]">Matricule Fiscal</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 font-mono text-[11px]">N° Contrat</span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 font-mono text-[11px]">Raison Sociale</span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-border/40">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
                <p className="text-sm font-medium text-charcoal dark:text-white">Aucun dossier correspondant trouvé</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Vérifiez le numéro d'identifiant (CIN, MF) ou le numéro de contrat.
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const badge = getTypeBadge(item.type);
                const IconComponent = badge.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-150 group',
                      isSelected
                        ? 'bg-crimson/10 dark:bg-crimson/20 border border-crimson/40 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
                          badge.color
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-charcoal dark:text-white truncate">
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0',
                              badge.color
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span>{item.subtitle}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-700 dark:text-slate-300 text-[11px]">
                            {item.identifier}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3 text-right">
                      {item.amount !== undefined && (
                        <div>
                          <div className="font-bold text-sm text-charcoal dark:text-white">
                            {item.amount.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-500 font-normal">TND</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{item.status}</div>
                        </div>
                      )}
                      <ArrowRight
                        className={cn(
                          'w-4 h-4 text-slate-400 transition-transform',
                          isSelected ? 'text-crimson translate-x-1' : 'opacity-0 group-hover:opacity-100'
                        )}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 bg-paper-soft dark:bg-slate-900 border-t border-border/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-border rounded shadow-2xs font-semibold">↑</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-border rounded shadow-2xs font-semibold">↓</kbd>
                <span className="text-[11px]">Naviguer</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-border rounded shadow-2xs font-semibold">↵</kbd>
                <span className="text-[11px]">Ouvrir</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-crimson font-medium text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Indexation multi-produits temps réel</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
