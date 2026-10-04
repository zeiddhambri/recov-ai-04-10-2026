import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, FileText, User, Calendar, Wallet, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const initial = {
  lessee_name: '', lessee_id: '', lessee_email: '', lessee_phone: '',
  contract_ref: '', contract_status: 'active',
  start_date: '', end_date: '', maturity_date: '', duration_months: '',
  asset_type: '', asset_description: '',
  monthly_rent: '0', remaining_capital: '0', interest_rate: '',
  payment_frequency: 'monthly', next_payment_date: '',
  overdue_amount: '0', overdue_days: '0',
  asset_value: '0', residual_value: '0', total_amount: '0',
  risk_score: '0', risk_level: 'low', notes: '',
};

const statusOptions = [
  { value: 'active', label: 'Actif' },
  { value: 'pending', label: 'En attente' },
  { value: 'overdue', label: 'En retard' },
  { value: 'litigation', label: 'Contentieux' },
  { value: 'closed', label: 'Clôturé' },
];

const riskOptions = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'critical', label: 'Critique' },
];

const freqOptions = [
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'semi-annual', label: 'Semestrielle' },
  { value: 'annual', label: 'Annuelle' },
];

export default function LeasingNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof initial, v: string) => setForm(f => ({ ...f, [k]: v }));

  const numeric = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lessee_name.trim()) {
      toast.error('Le nom du preneur est requis');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Vous devez être connecté');
        setSaving(false);
        return;
      }
      const payload = {
        user_id: userData.user.id,
        lessee_name: form.lessee_name.trim(),
        lessee_id: form.lessee_id || null,
        lessee_email: form.lessee_email || null,
        lessee_phone: form.lessee_phone || null,
        contract_ref: form.contract_ref || null,
        contract_status: form.contract_status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        maturity_date: form.maturity_date || null,
        duration_months: form.duration_months ? parseInt(form.duration_months) : null,
        asset_type: form.asset_type || null,
        asset_description: form.asset_description || null,
        monthly_rent: numeric(form.monthly_rent),
        remaining_capital: numeric(form.remaining_capital),
        interest_rate: form.interest_rate ? numeric(form.interest_rate) : null,
        payment_frequency: form.payment_frequency,
        next_payment_date: form.next_payment_date || null,
        overdue_amount: numeric(form.overdue_amount),
        overdue_days: parseInt(form.overdue_days) || 0,
        asset_value: numeric(form.asset_value),
        residual_value: numeric(form.residual_value),
        total_amount: numeric(form.total_amount),
        risk_score: parseInt(form.risk_score) || 0,
        risk_level: form.risk_level,
        notes: form.notes || null,
      };
      const { error } = await supabase.from('leasing_portfolio').insert(payload);
      if (error) throw error;
      toast.success('Contrat créé avec succès');
      navigate('/leasing');
    } catch (err: any) {
      toast.error('Erreur', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition";
  const labelCls = "text-xs font-semibold text-[hsl(var(--charcoal))] mb-1 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12 max-w-5xl">
      <Link to="/leasing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[hsl(var(--charcoal))] transition">
        <ArrowLeft size={14} /> Retour au portefeuille
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">Nouveau contrat de leasing</h1>
          <p className="text-muted-foreground text-sm mt-1">Saisissez les informations du contrat de crédit-bail.</p>
        </div>
        <button type="submit" disabled={saving}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold shadow-sm hover:bg-teal-700 transition disabled:opacity-60")}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* Preneur */}
      <Section icon={User} title="Preneur">
        <Field label="Nom du preneur *"><input className={inputCls} value={form.lessee_name} onChange={e => set('lessee_name', e.target.value)} placeholder="Ex: Société Alpha SARL" required /></Field>
        <Field label="Identifiant fiscal"><input className={inputCls} value={form.lessee_id} onChange={e => set('lessee_id', e.target.value)} placeholder="Matricule fiscale" /></Field>
        <Field label="Email"><input type="email" className={inputCls} value={form.lessee_email} onChange={e => set('lessee_email', e.target.value)} placeholder="contact@exemple.tn" /></Field>
        <Field label="Téléphone"><input className={inputCls} value={form.lessee_phone} onChange={e => set('lessee_phone', e.target.value)} placeholder="+216 …" /></Field>
      </Section>

      {/* Contrat */}
      <Section icon={FileText} title="Contrat">
        <Field label="Référence contrat"><input className={inputCls} value={form.contract_ref} onChange={e => set('contract_ref', e.target.value)} placeholder="Ex: LB-2026-001" /></Field>
        <Field label="Statut">
          <select className={inputCls} value={form.contract_status} onChange={e => set('contract_status', e.target.value)}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Durée (mois)"><input type="number" className={inputCls} value={form.duration_months} onChange={e => set('duration_months', e.target.value)} placeholder="60" /></Field>
        <Field label="Date de début"><input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
        <Field label="Date de fin"><input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} /></Field>
        <Field label="Date d'échéance finale"><input type="date" className={inputCls} value={form.maturity_date} onChange={e => set('maturity_date', e.target.value)} /></Field>
      </Section>

      {/* Bien */}
      <Section icon={Shield} title="Bien financé">
        <Field label="Type de bien"><input className={inputCls} value={form.asset_type} onChange={e => set('asset_type', e.target.value)} placeholder="Véhicule, Équipement, Immobilier…" /></Field>
        <Field label="Valeur du bien (TND)"><input type="number" step="0.01" className={inputCls} value={form.asset_value} onChange={e => set('asset_value', e.target.value)} /></Field>
        <Field label="Valeur résiduelle (TND)"><input type="number" step="0.01" className={inputCls} value={form.residual_value} onChange={e => set('residual_value', e.target.value)} /></Field>
        <Field label="Description du bien" full>
          <textarea rows={2} className={inputCls} value={form.asset_description} onChange={e => set('asset_description', e.target.value)} placeholder="Marque, modèle, série…" />
        </Field>
      </Section>

      {/* Finance */}
      <Section icon={Wallet} title="Conditions financières">
        <Field label="Loyer (TND)"><input type="number" step="0.01" className={inputCls} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} /></Field>
        <Field label="Fréquence">
          <select className={inputCls} value={form.payment_frequency} onChange={e => set('payment_frequency', e.target.value)}>
            {freqOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Taux d'intérêt (%)"><input type="number" step="0.01" className={inputCls} value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="7.5" /></Field>
        <Field label="Capital restant dû (TND)"><input type="number" step="0.01" className={inputCls} value={form.remaining_capital} onChange={e => set('remaining_capital', e.target.value)} /></Field>
        <Field label="Montant total (TND)"><input type="number" step="0.01" className={inputCls} value={form.total_amount} onChange={e => set('total_amount', e.target.value)} /></Field>
        <Field label="Prochaine échéance"><input type="date" className={inputCls} value={form.next_payment_date} onChange={e => set('next_payment_date', e.target.value)} /></Field>
        <Field label="Montant impayé (TND)"><input type="number" step="0.01" className={inputCls} value={form.overdue_amount} onChange={e => set('overdue_amount', e.target.value)} /></Field>
        <Field label="Jours de retard"><input type="number" className={inputCls} value={form.overdue_days} onChange={e => set('overdue_days', e.target.value)} /></Field>
      </Section>

      {/* Risque */}
      <Section icon={Calendar} title="Risque & notes">
        <Field label="Score de risque (0-100)"><input type="number" min="0" max="100" className={inputCls} value={form.risk_score} onChange={e => set('risk_score', e.target.value)} /></Field>
        <Field label="Niveau de risque">
          <select className={inputCls} value={form.risk_level} onChange={e => set('risk_level', e.target.value)}>
            {riskOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Notes" full>
          <textarea rows={3} className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations, garanties, contexte…" />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Link to="/leasing" className="px-5 py-2.5 rounded-full text-sm font-bold text-muted-foreground hover:bg-muted transition">Annuler</Link>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-bold shadow-sm hover:bg-teal-700 transition disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <Icon size={16} className="text-teal-600" />
        </div>
        <h2 className="font-serif-display text-lg text-[hsl(var(--charcoal))]">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'md:col-span-2 lg:col-span-3' : ''}>
      <label className="text-xs font-semibold text-[hsl(var(--charcoal))] mb-1 block">{label}</label>
      {children}
    </div>
  );
}
