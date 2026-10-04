import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, FileCheck2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImportDropzone } from '@/components/leasing/import/ImportDropzone';
import { ImportQueue } from '@/components/leasing/import/ImportQueue';
import { PortfolioTable } from '@/components/leasing/import/PortfolioTable';
import { useLeasingImport } from '@/components/leasing/import/useLeasingImport';
import type { LeasingRow } from '@/components/leasing/import/types';

export default function LeasingImport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeasingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('leasing_portfolio')
      .select('*')
      .order('imported_at', { ascending: false });
    if (data) setRows(data as any);
    setLoading(false);
  }, [user]);

  const { jobs, addFiles, clearDone, removeJob } = useLeasingImport(refresh);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('leasing_portfolio_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leasing_portfolio' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const stats = {
    total: rows.length,
    active: rows.filter(r => r.contract_status === 'active').length,
    overdue: rows.filter(r => (r.overdue_days || 0) > 0).length,
    totalCapital: rows.reduce((s, r) => s + Number(r.remaining_capital || 0), 0),
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link to="/leasing" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">Import Intelligent — Leasing</h1>
            <p className="text-muted-foreground text-sm mt-1">Importez vos contrats de leasing en lot. L'IA extrait les données automatiquement.</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Contrats importés" value={stats.total} icon={Database} color="teal" />
        <KpiCard label="Actifs" value={stats.active} icon={FileCheck2} color="emerald" />
        <KpiCard label="En retard" value={stats.overdue} icon={AlertTriangle} color="amber" />
        <KpiCard label="Encours total" value={`${(stats.totalCapital / 1000).toFixed(0)}k TND`} icon={Database} color="teal" />
      </div>

      {/* Dropzone + queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ImportDropzone onFiles={addFiles} />
        <ImportQueue jobs={jobs} onRemove={removeJob} onClearDone={clearDone} />
      </div>

      {/* Portfolio table */}
      <div>
        <h2 className="text-lg font-bold text-[hsl(var(--charcoal))] mb-3">Portefeuille importé</h2>
        {loading ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-sm">Chargement...</div>
        ) : (
          <PortfolioTable rows={rows} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-100 text-teal-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-2xl font-serif-display text-[hsl(var(--charcoal))] mt-2">{value}</p>
    </div>
  );
}
