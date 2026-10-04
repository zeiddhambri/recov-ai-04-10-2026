import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, Download, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LeasingRow } from './types';

type SortKey = keyof LeasingRow;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  defaulted: 'bg-red-100 text-red-700',
  terminated: 'bg-slate-200 text-slate-700',
  completed: 'bg-blue-100 text-blue-700',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function fmtMoney(n?: number | null) {
  if (n == null || n === 0) return '—';
  return `${Number(n).toLocaleString('fr-FR')} TND`;
}
function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return '—'; }
}

export function PortfolioTable({ rows, onChanged }: { rows: LeasingRow[]; onChanged?: () => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('imported_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let out = rows;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(r =>
        r.lessee_name?.toLowerCase().includes(q) ||
        r.contract_ref?.toLowerCase().includes(q) ||
        r.asset_description?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') out = out.filter(r => r.contract_status === statusFilter);
    if (riskFilter !== 'all') out = out.filter(r => r.risk_level === riskFilter);
    out = [...out].sort((a, b) => {
      const av = a[sortKey] as any; const bv = b[sortKey] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return out;
  }, [rows, search, statusFilter, riskFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const exportCsv = () => {
    const headers = [
      'Référence', 'Preneur', 'Email', 'Téléphone', 'Statut', 'Actif', 'Description actif',
      'Valeur actif', 'Valeur résiduelle', 'Loyer', 'Capital restant', 'Total',
      'Taux %', 'Fréquence', 'Début', 'Fin', 'Échéance', 'Durée mois',
      'Prochain paiement', 'Retard (j)', 'Montant retard', 'Risque', 'Score',
      'Confiance IA', 'Fichier source', 'Importé le',
    ];
    const lines = filtered.map(r => [
      r.contract_ref || '', r.lessee_name, r.lessee_email || '', r.lessee_phone || '',
      r.contract_status || '', r.asset_type || '', r.asset_description || '',
      r.asset_value || 0, r.residual_value || 0, r.monthly_rent || 0,
      r.remaining_capital || 0, r.total_amount || 0, r.interest_rate ?? '',
      r.payment_frequency || '', r.start_date || '', r.end_date || '', r.maturity_date || '',
      r.duration_months ?? '', r.next_payment_date || '', r.overdue_days || 0,
      r.overdue_amount || 0, r.risk_level || '', r.risk_score || 0,
      r.ai_confidence != null ? Math.round(r.ai_confidence * 100) + '%' : '',
      r.source_file_name || '', r.imported_at,
    ]);
    const csv = [headers, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leasing_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    const { error } = await supabase.from('leasing_portfolio').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Contrat supprimé'); onChanged?.(); }
  };

  const Th = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th className={`text-${align} px-3 py-2 cursor-pointer select-none hover:text-teal-700`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label} <ArrowUpDown size={11} className={sortKey === k ? 'text-teal-600' : 'opacity-40'} />
      </span>
    </th>
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Preneur, référence, actif..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-sm border-0 focus:outline-none cursor-pointer">
          <option value="all">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="defaulted">Défaut</option>
          <option value="terminated">Résilié</option>
          <option value="completed">Terminé</option>
        </select>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary text-sm border-0 focus:outline-none cursor-pointer">
          <option value="all">Tous risques</option>
          <option value="low">Faible</option>
          <option value="medium">Moyen</option>
          <option value="high">Élevé</option>
          <option value="critical">Critique</option>
        </select>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/30">
              <Th k="contract_ref" label="Référence" />
              <Th k="lessee_name" label="Preneur" />
              <Th k="contract_status" label="Statut" />
              <Th k="asset_description" label="Actif" />
              <Th k="monthly_rent" label="Loyer" align="right" />
              <Th k="remaining_capital" label="Capital restant" align="right" />
              <Th k="residual_value" label="Val. résiduelle" align="right" />
              <Th k="maturity_date" label="Échéance" />
              <Th k="overdue_days" label="Retard" />
              <Th k="risk_score" label="Risque" />
              <Th k="ai_confidence" label="IA" />
              <th className="px-3 py-2 text-right">Source</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition">
                <td className="px-3 py-2.5 font-mono text-xs text-teal-700 font-bold">{r.contract_ref || '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-[hsl(var(--charcoal))]">{r.lessee_name}</div>
                  {r.lessee_email && <div className="text-[10px] text-muted-foreground">{r.lessee_email}</div>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLORS[r.contract_status || ''] || 'bg-slate-100 text-slate-700'}`}>
                    {r.contract_status || '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-xs">{r.asset_description || '—'}</div>
                  {r.asset_type && <div className="text-[10px] text-muted-foreground">{r.asset_type}</div>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-xs">{fmtMoney(r.monthly_rent)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-xs">{fmtMoney(r.remaining_capital)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-xs">{fmtMoney(r.residual_value)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(r.maturity_date)}</td>
                <td className="px-3 py-2.5 text-xs">
                  {(r.overdue_days || 0) > 0 ? (
                    <span className="text-red-600 font-bold">{r.overdue_days}j</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${RISK_COLORS[r.risk_level || 'low']}`}>
                    {r.risk_score || 0}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {r.ai_confidence != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full ${r.ai_confidence > 0.7 ? 'bg-emerald-500' : r.ai_confidence > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.round(r.ai_confidence * 100)}%` }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(r.ai_confidence * 100)}%</span>
                    </div>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {r.source_file_url ? (
                    <a href={r.source_file_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline" title={r.source_file_name || ''}>
                      <FileText size={12} /> <ExternalLink size={10} />
                    </a>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => deleteRow(r.id)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Supprimer">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="py-12 text-center text-muted-foreground text-sm">
                Aucun contrat. Importez un fichier pour commencer.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
