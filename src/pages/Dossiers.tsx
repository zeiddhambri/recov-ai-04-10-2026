import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Building2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { statusConfig, DossierComplet } from '@/lib/mock-data';
import { api } from '@/services/api';
import { classificationConfig } from '@/lib/scoring';
import { calculerScore } from '@/lib/scoring';
import { useAuth } from '@/contexts/AuthContext';
import NouveauDossierModal from '@/components/dossiers/NouveauDossierModal';
import { toast } from '@/hooks/use-toast';
import { LitigationStore } from '@/lib/litigation-store';
import { authorizedFetch } from '@/lib/authorizedFetch';

const allStatuses = ['all', 'a_relancer', 'en_relance', 'promesse_paiement', 'partiellement_paye', 'paye', 'contentieux'] as const;

function dbRowToDossier(r: any): DossierComplet {
  const delay = Number(r.delay_days) || 30;
  const portfolio = (r.portfolio || '').toLowerCase();
  const typologie: 'grande_entreprise' | 'pme' | 'particulier' | 'institution' =
    portfolio === 'factoring' ? 'grande_entreprise' :
    portfolio === 'leasing' ? 'pme' :
    'particulier';

  const scoring = {
    montant: Number(r.amount) || 0,
    ancienneteJours: delay,
    tauxPaiementHistorique: r.portfolio === 'Microfinance' ? 45 : 65,
    tauxReactivite: r.risk_level === 'Critique' ? 25 : r.risk_level === 'Élevé' ? 45 : 70,
    typologieClient: typologie
  };

  return {
    id: String(r.id),
    clientCode: r.client_code || `RCV-${r.id}`,
    debtorName: r.debtor_name || 'Débiteur Inconnu',
    amount: Number(r.amount) || 0,
    status: r.status || 'a_relancer',
    managementLevel: r.management_level || 'recouvreur',
    agent: r.assigned_to || 'Non assigné',
    date: (r.due_date || r.created_at || '').slice(0, 10),
    scoring,
    scoringResult: calculerScore(scoring),
    typologieClient: typologie,
  };
}

export default function Dossiers() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dbDossiers, setDbDossiers] = useState<DossierComplet[]>([]);
  const [scope, setScope] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      // Voie de données unique (lot P0) : backend RecovAI authentifié, plus de
      // fusion silencieuse avec des listes mock non identifiées.
      const res: any = await api.dossiers.getAll();
      setDbDossiers(((res?.data) || []).map(dbRowToDossier));
      setScope(res?.scope?.institution ?? null);
    } catch {
      setDbDossiers([]);
    }
  };

  const handleReset = async (mode: 'realistic' | 'empty') => {
    setIsResetting(true);
    try {
      await authorizedFetch('/api/dossiers/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (mode === 'empty') {
        LitigationStore.resetToEmpty();
        toast({
          title: "Portefeuille vidé à zéro (0 dossier)",
          description: "La base est complètement vierge, prête pour tester un import de fichiers ou une création manuelle.",
        });
      } else {
        LitigationStore.resetToDefaults();
        toast({
          title: "Données démo 2026 chargées",
          description: "Portefeuille bancaire tunisien réaliste (Amen Bank, Tunisie Leasing, Enda Tamweel) prêt pour la démo (0 dinar recouvré au départ).",
        });
      }
      await load();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer l'opération demandée",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const all = dbDossiers;
  const filtered = all.filter(d => {
    const matchesSearch = d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || d.clientCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight font-syne">Gestion Des Dossiers Recouvrement</h1>
          <p className="text-muted-foreground mt-1">Gérez vos dossiers de recouvrement et suivez les actions en cours.</p>
          <span className={cn(
            "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold border",
            scope ? "bg-sky/10 text-sky border-sky/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <Building2 size={12} />
            {scope ? `Périmètre cloisonné : ${scope}` : 'Périmètre : tous portefeuilles (compte transverse)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleReset('empty')}
            disabled={isResetting}
            title="Vider tous les dossiers à zéro (0 dossier) pour démo d'import"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={14} className={cn(isResetting && "animate-spin")} />
            Vider (0 dossier)
          </button>
          <button 
            onClick={() => handleReset('realistic')}
            disabled={isResetting}
            title="Charger les dossiers de démo réalistes 2026 (zéro recouvrement initial)"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-card hover:bg-sky/10 text-navy hover:text-sky border border-border hover:border-sky/30 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={14} className={cn(isResetting && "animate-spin text-sky")} />
            Démo réaliste 2026
          </button>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-sky text-white rounded-xl text-sm font-bold hover:bg-sky/90 transition-all shadow-lg shadow-sky/20">
            <Plus size={17} />
            Nouveau dossier
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un dossier..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky/20 focus:border-sky transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                statusFilter === s ? "bg-navy text-white" : "bg-card border border-border text-muted-foreground hover:bg-mist")}>
              {s === 'all' ? 'Tous' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Débiteur</th>
                <th className="text-left p-4">Montant</th>
                <th className="text-left p-4">Agent</th>
                <th className="text-left p-4">Statut</th>
                <th className="text-left p-4">Score</th>
                <th className="text-left p-4">Classification</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const cls = classificationConfig[d.scoringResult.classification];
                return (
                  <motion.tr key={d.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.5) }}
                    className="border-b border-border hover:bg-mist transition-colors">
                    <td className="p-4 text-sm font-mono text-muted-foreground">{d.clientCode}</td>
                    <td className="p-4 font-bold text-sm text-navy">{d.debtorName}</td>
                    <td className="p-4 text-sm font-mono">{d.amount.toLocaleString()} TND</td>
                    <td className="p-4 text-xs text-muted-foreground">{d.agent}</td>
                    <td className="p-4">
                      <span className={cn("text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap", statusConfig[d.status].color)}>
                        {statusConfig[d.status].label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black"
                          style={{ borderColor: d.scoringResult.score >= 70 ? 'hsl(0,84%,60%)' : d.scoringResult.score >= 40 ? 'hsl(40,58%,55%)' : 'hsl(142,76%,36%)' }}>
                          {d.scoringResult.score}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap", cls.bgClass, cls.colorClass)}>
                        {cls.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{d.date}</td>
                    <td className="p-4">
                      <button className="p-2 hover:bg-mist rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-muted-foreground" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NouveauDossierModal open={open} onClose={() => setOpen(false)} onCreated={load} />
    </div>
  );
}
