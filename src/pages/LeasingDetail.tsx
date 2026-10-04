import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { findLeasingContract, STATUS_CONFIG, ASSET_TYPE_CONFIG } from '@/lib/leasing-mock';

export default function LeasingDetail() {
  const { id } = useParams<{ id: string }>();
  const c = id ? findLeasingContract(id) : undefined;

  if (!c) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Contrat introuvable.</p>
        <Link to="/leasing" className="text-teal-700 font-semibold mt-2 inline-block">← Retour au portefeuille</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[c.status];
  const assetCfg = ASSET_TYPE_CONFIG[c.asset.type];

  return (
    <div className="space-y-6 pb-12">
      <Link to="/leasing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[hsl(var(--charcoal))] transition">
        <ArrowLeft size={14} /> Tous les contrats
      </Link>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{c.id}</p>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">{c.lessee.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{assetCfg.label} · {c.asset.description}</p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
        <Construction size={32} className="mx-auto text-teal-600 mb-3" />
        <h2 className="font-serif-display text-2xl text-[hsl(var(--charcoal))] mb-2">Fiche détail à venir</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Les 6 onglets (Vue d'ensemble, Échéancier, Actions, Résiliation, Contentieux, Documents) sont planifiés pour la prochaine itération.
          Le contrat <strong>{c.id}</strong> est bien chargé en mémoire et ses données sont disponibles dans le store.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Capital restant : <strong className="text-[hsl(var(--charcoal))]">{c.financials.remainingCapital.toLocaleString('fr-FR')} TND</strong></span>
          <span>·</span>
          <span>Loyer : <strong className="text-[hsl(var(--charcoal))]">{c.financials.monthlyRent.toLocaleString('fr-FR')} TND</strong></span>
          <span>·</span>
          <span>Échéances : <strong className="text-[hsl(var(--charcoal))]">{c.installments.length}</strong></span>
        </div>
      </div>
    </div>
  );
}
