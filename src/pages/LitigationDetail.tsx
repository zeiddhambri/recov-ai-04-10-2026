import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Building2, User, Phone, Mail, Calendar, Scale, FileText,
  ChevronDown, MessageSquare, Plus, Download, Eye, Upload, X, AtSign,
  CheckCircle2, Loader2, Gavel, FileCheck, CircleDollarSign, StickyNote,
  Edit3, Lock, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  findCase, STAGE_CONFIG, TYPE_LABELS, KANBAN_STAGES, totalAmount, totalRecovered,
  type CaseEvent, type CaseDocument, type CaseNote, type Hearing,
} from '@/lib/litigation-mock';
import {
  TEMPLATE_LABELS, TEMPLATE_DESCRIPTIONS, downloadPdf, type TemplateKey,
} from '@/lib/litigation-pdf';

type TabKey = 'timeline' | 'documents' | 'hearings' | 'financial' | 'notes';

const fmtTND = (n: number) => `${n.toLocaleString('fr-FR')} TND`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export default function LitigationDetail() {
  const { id } = useParams<{ id: string }>();
  const c = id ? findCase(id) : undefined;
  const [tab, setTab] = useState<TabKey>('timeline');
  const [docModal, setDocModal] = useState(false);

  if (!c) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Dossier introuvable.</p>
        <Link to="/litigation" className="text-[hsl(var(--crimson))] font-semibold mt-2 inline-block">← Retour aux dossiers</Link>
      </div>
    );
  }

  const stageCfg = STAGE_CONFIG[c.stage];
  const stageIndex = KANBAN_STAGES.indexOf(c.stage);
  const progress = stageIndex >= 0 ? ((stageIndex + 1) / KANBAN_STAGES.length) * 100 : 100;

  return (
    <div className="space-y-5 pb-12">
      <Link to="/litigation" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[hsl(var(--charcoal))] transition">
        <ArrowLeft size={14} /> Tous les dossiers
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{c.id}</p>
          <h1 className="text-3xl font-serif-display text-[hsl(var(--charcoal))] tracking-tight">{c.debtor.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{TYPE_LABELS[c.type]} · ouvert le {fmtDate(c.filingDate)}</p>
        </div>
        <span className={cn("text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md", stageCfg.bg, stageCfg.color)}>
          {stageCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* ═════════════ LEFT SIDEBAR ═════════════ */}
        <aside className="space-y-4">
          <Card>
            <SectionTitle>Synthèse</SectionTitle>
            <KV label="Référence" value={c.id} mono />
            <KV label="Débiteur" value={
              <Link to={`/dossiers`} className="text-[hsl(var(--crimson))] font-semibold hover:underline">{c.debtor.name}</Link>
            } />
            <KV label="Montant réclamé" value={<span className="font-bold text-[hsl(var(--charcoal))]">{fmtTND(totalAmount(c))}</span>} />
            <KV label="Type" value={TYPE_LABELS[c.type]} />
            <KV label="Tribunal" value={`${c.court.name} (${c.court.jurisdiction})`} small />
            <KV label="Dernière MAJ" value={fmtDate(c.lastUpdate)} />

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <span>Avancement</span>
                <span className="text-[hsl(var(--charcoal))]">{stageIndex + 1}/{KANBAN_STAGES.length}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-[hsl(var(--cobalt))] to-[hsl(var(--crimson))]"
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Intervenants</SectionTitle>
            <PartyBlock label="Avocat" party={c.lawyer} />
            <div className="my-3 border-t border-border" />
            <PartyBlock label="Huissier" party={c.bailiff} />
            <div className="my-3 border-t border-border" />
            <KV label="Gestionnaire interne" value={
              <button className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--charcoal))] hover:text-[hsl(var(--crimson))]">
                {c.manager} <ChevronDown size={12} />
              </button>
            } />
          </Card>

          <Card>
            <SectionTitle>Coordonnées débiteur</SectionTitle>
            <KV label="Adresse" value={`${c.debtor.address}, ${c.debtor.zip} ${c.debtor.city}`} small />
            {c.debtor.siren && <KV label="SIREN/MF" value={c.debtor.siren} mono />}
            {c.debtor.contact && <KV label="Contact" value={c.debtor.contact} />}
            {c.debtor.email && <KV label="Email" value={c.debtor.email} small />}
          </Card>
        </aside>

        {/* ═════════════ MAIN ═════════════ */}
        <main className="space-y-4">
          {/* Tabs */}
          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex border-b border-border overflow-x-auto">
              {([
                { k: 'timeline'  as TabKey, label: 'Chronologie', icon: Calendar,         n: c.events.length },
                { k: 'documents' as TabKey, label: 'Documents',   icon: FileText,         n: c.documents.length },
                { k: 'hearings'  as TabKey, label: 'Audiences',   icon: Gavel,            n: c.hearings.length },
                { k: 'financial' as TabKey, label: 'Financier',   icon: CircleDollarSign, n: undefined as number | undefined },
                { k: 'notes'     as TabKey, label: 'Notes',       icon: StickyNote,       n: c.notes.length },
              ]).map(t => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k as TabKey)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap",
                    tab === t.k
                      ? "border-[hsl(var(--crimson))] text-[hsl(var(--crimson))]"
                      : "border-transparent text-muted-foreground hover:text-[hsl(var(--charcoal))]",
                  )}
                >
                  <t.icon size={15} /> {t.label}
                  {t.n !== undefined && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{t.n}</span>}
                </button>
              ))}
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === 'timeline'  && <TimelineTab events={c.events} />}
                  {tab === 'documents' && <DocumentsTab caseObj={c} onOpenGenerator={() => setDocModal(true)} />}
                  {tab === 'hearings'  && <HearingsTab hearings={c.hearings} />}
                  {tab === 'financial' && <FinancialTab caseObj={c} />}
                  {tab === 'notes'     && <NotesTab notes={c.notes} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {docModal && <DocumentGeneratorModal caseObj={c} onClose={() => setDocModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</h3>;
}
function KV({ label, value, mono, small }: { label: string; value: React.ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground text-xs flex-shrink-0">{label}</span>
      <span className={cn(
        "text-right text-[hsl(var(--charcoal))] font-medium",
        mono && "font-mono text-xs",
        small && "text-xs",
      )}>{value}</span>
    </div>
  );
}
function PartyBlock({ label, party }: { label: string; party: { name: string; firm?: string; phone: string; email: string } }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <button className="text-[11px] font-semibold text-[hsl(var(--crimson))] hover:underline">Changer</button>
      </div>
      <p className="font-semibold text-sm text-[hsl(var(--charcoal))]">{party.name}</p>
      {party.firm && <p className="text-xs text-muted-foreground">{party.firm}</p>}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
        <Phone size={11} /> {party.phone}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
        <Mail size={11} /> {party.email}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 1 — TIMELINE
// ═══════════════════════════════════════════
const EVENT_ICONS = {
  opened: { icon: Plus, color: 'bg-blue-100 text-blue-700' },
  document_filed: { icon: FileCheck, color: 'bg-purple-100 text-purple-700' },
  hearing_scheduled: { icon: Gavel, color: 'bg-orange-100 text-orange-700' },
  judgment: { icon: Scale, color: 'bg-emerald-100 text-emerald-700' },
  payment: { icon: CircleDollarSign, color: 'bg-green-100 text-green-700' },
  note: { icon: StickyNote, color: 'bg-amber-100 text-amber-700' },
};
const EVENT_LABELS = {
  opened: 'Ouverture', document_filed: 'Document déposé', hearing_scheduled: 'Audience',
  judgment: 'Jugement', payment: 'Paiement', note: 'Note',
};

function TimelineTab({ events }: { events: CaseEvent[] }) {
  const [adding, setAdding] = useState(false);
  const sorted = [...events].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-serif-display text-[hsl(var(--charcoal))]">Chronologie du dossier</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--charcoal))] text-white text-xs font-bold"
        >
          <Plus size={13} /> Ajouter événement
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => { e.preventDefault(); setAdding(false); }}
            className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-secondary/50 rounded-xl mb-4 overflow-hidden"
          >
            <select className="px-3 py-2 rounded-lg bg-card text-sm border border-border">
              {Object.entries(EVENT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input type="date" className="px-3 py-2 rounded-lg bg-card text-sm border border-border" defaultValue={new Date().toISOString().slice(0, 10)} />
            <input placeholder="Description…" className="px-3 py-2 rounded-lg bg-card text-sm border border-border md:col-span-1" />
            <textarea placeholder="Détails complémentaires (optionnel)" className="px-3 py-2 rounded-lg bg-card text-sm border border-border md:col-span-2" rows={2} />
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Annuler</button>
              <button type="submit" className="px-4 py-1.5 rounded-full bg-[hsl(var(--crimson))] text-white text-xs font-bold">Enregistrer</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {sorted.map(e => {
            const cfg = EVENT_ICONS[e.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 relative"
              >
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10", cfg.color)}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 bg-secondary/40 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{EVENT_LABELS[e.type]}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(e.date)}</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--charcoal))]">{e.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">par {e.author}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 2 — DOCUMENTS
// ═══════════════════════════════════════════
function DocumentsTab({ caseObj, onOpenGenerator }: { caseObj: ReturnType<typeof findCase> & {}; onOpenGenerator: () => void }) {
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    signed: 'bg-emerald-100 text-emerald-700',
    filed: 'bg-purple-100 text-purple-700',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-serif-display text-[hsl(var(--charcoal))]">Documents du dossier</h3>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-[hsl(var(--charcoal))] text-xs font-bold hover:bg-border transition">
            <Upload size={13} /> Importer
          </button>
          <button onClick={onOpenGenerator} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--crimson))] text-white text-xs font-bold">
            <Sparkles size={13} /> Générer document
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {caseObj.documents.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition group">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-[hsl(var(--charcoal))]">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[hsl(var(--charcoal))] truncate">{d.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{d.category}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{fmtDateShort(d.date)}</span>
                {d.size && <><span className="text-muted-foreground">·</span><span className="text-[10px] text-muted-foreground">{d.size}</span></>}
                <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ml-auto", STATUS_COLORS[d.status])}>
                  {d.status}
                </span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button className="p-1.5 rounded-md hover:bg-card text-muted-foreground"><Eye size={14} /></button>
              <button className="p-1.5 rounded-md hover:bg-card text-muted-foreground"><Download size={14} /></button>
            </div>
          </div>
        ))}
        {caseObj.documents.length === 0 && (
          <p className="col-span-2 text-center py-8 text-sm text-muted-foreground">Aucun document. Générez-en un pour commencer.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 3 — HEARINGS
// ═══════════════════════════════════════════
function HearingsTab({ hearings }: { hearings: Hearing[] }) {
  const STATUS_COLORS: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    held: 'bg-emerald-100 text-emerald-700',
    postponed: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-200 text-slate-700',
  };
  const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Programmée', held: 'Tenue', postponed: 'Reportée', cancelled: 'Annulée',
  };
  const upcoming = hearings.filter(h => h.status === 'scheduled' && new Date(h.date) >= new Date()).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-serif-display text-[hsl(var(--charcoal))]">Audiences programmées</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--crimson))] text-white text-xs font-bold">
          <Plus size={13} /> Ajouter audience
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-blue-900">
          <Calendar size={14} />
          <span>Prochaine audience dans <strong>{Math.ceil((+new Date(upcoming[0].date) - Date.now()) / 86_400_000)} jours</strong> · rappel automatique J-7 et J-1</span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="text-left py-2.5">Date</th>
            <th className="text-left">Heure</th>
            <th className="text-left">Tribunal</th>
            <th className="text-left">Type</th>
            <th className="text-left">Juge</th>
            <th className="text-left">Statut</th>
          </tr>
        </thead>
        <tbody>
          {hearings.map(h => (
            <tr key={h.id} className="border-b border-border last:border-0">
              <td className="py-3 font-semibold text-[hsl(var(--charcoal))]">{fmtDate(h.date)}</td>
              <td className="text-muted-foreground">{h.time}</td>
              <td className="text-muted-foreground text-xs">{h.court}</td>
              <td>{h.type}</td>
              <td className="text-muted-foreground text-xs">{h.judge || '—'}</td>
              <td>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", STATUS_COLORS[h.status])}>
                  {STATUS_LABELS[h.status]}
                </span>
              </td>
            </tr>
          ))}
          {hearings.length === 0 && (
            <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Aucune audience programmée.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 4 — FINANCIAL
// ═══════════════════════════════════════════
function FinancialTab({ caseObj }: { caseObj: ReturnType<typeof findCase> & {} }) {
  const c = caseObj;
  const total = totalAmount(c);
  const recovered = totalRecovered(c);
  const balance = total - recovered;
  return (
    <div>
      <h3 className="text-base font-serif-display text-[hsl(var(--charcoal))] mb-4">Détail financier</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-secondary/40 rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Décomposition</p>
          <div className="space-y-2">
            <Line label="Principal" value={c.amount.principal} />
            <Line label={`Intérêts moratoires (${c.interestRate}%)`} value={c.amount.interest} />
            <Line label="Frais de justice" value={c.amount.legalFees} />
            <Line label="Frais d'huissier" value={c.amount.bailiffFees} />
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-[hsl(var(--charcoal))]">Total réclamé</span>
              <span className="text-base font-serif-display text-[hsl(var(--charcoal))]">{fmtTND(total)}</span>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--charcoal))] text-white rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-3">Solde restant</p>
          <p className="text-3xl font-serif-display">{fmtTND(balance)}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-white/80">
            <span>Recouvré : {fmtTND(recovered)}</span>
            <span>{total > 0 ? ((recovered / total) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/15 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${total > 0 ? (recovered / total) * 100 : 0}%` }} className="h-full bg-emerald-400" />
          </div>
          <button className="mt-4 w-full py-2 rounded-full bg-[hsl(var(--crimson))] text-white text-xs font-bold flex items-center justify-center gap-1.5">
            <Plus size={13} /> Enregistrer un paiement
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Paiements reçus</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left py-2">Date</th>
              <th className="text-left">Référence</th>
              <th className="text-left">Type</th>
              <th className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {c.payments.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-2.5 text-muted-foreground">{fmtDate(p.date)}</td>
                <td className="font-mono text-xs">{p.reference}</td>
                <td className="text-muted-foreground capitalize text-xs">{p.type}</td>
                <td className="text-right font-bold text-emerald-700">+ {fmtTND(p.amount)}</td>
              </tr>
            ))}
            {c.payments.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Aucun paiement reçu à ce jour.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-[hsl(var(--charcoal))] tabular-nums">{fmtTND(value)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════
// TAB 5 — NOTES
// ═══════════════════════════════════════════
function NotesTab({ notes }: { notes: CaseNote[] }) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<CaseNote['visibility']>('internal');
  const VIS_CONFIG: Record<CaseNote['visibility'], { label: string; icon: any; color: string }> = {
    internal: { label: 'Interne', icon: Lock,         color: 'bg-slate-100 text-slate-700' },
    lawyer:   { label: 'Avocat',  icon: User,         color: 'bg-purple-100 text-purple-700' },
    bailiff:  { label: 'Huissier',icon: Gavel,        color: 'bg-orange-100 text-orange-700' },
  };
  return (
    <div>
      <h3 className="text-base font-serif-display text-[hsl(var(--charcoal))] mb-4">Notes & échanges</h3>

      <div className="bg-secondary/40 rounded-xl p-3 mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrire une note… utilisez @ pour mentionner un membre"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-card text-sm border border-border focus:outline-none focus:ring-2 focus:ring-[hsl(var(--crimson))]/20 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {(Object.keys(VIS_CONFIG) as CaseNote['visibility'][]).map(v => {
              const cfg = VIS_CONFIG[v];
              const Icon = cfg.icon;
              return (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition",
                    visibility === v ? cfg.color : "text-muted-foreground hover:bg-card",
                  )}
                >
                  <Icon size={11} /> {cfg.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setContent('')}
            disabled={!content.trim()}
            className="px-4 py-1.5 rounded-full bg-[hsl(var(--crimson))] text-white text-xs font-bold disabled:opacity-40"
          >
            Publier
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notes.map(n => {
          const cfg = VIS_CONFIG[n.visibility];
          const Icon = cfg.icon;
          return (
            <div key={n.id} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-[hsl(var(--charcoal))]">
                    {n.author[0]}
                  </div>
                  <span className="text-sm font-semibold text-[hsl(var(--charcoal))]">{n.author}</span>
                  <span className="text-xs text-muted-foreground">· {fmtDate(n.date)}</span>
                </div>
                <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", cfg.color)}>
                  <Icon size={10} /> {cfg.label}
                </span>
              </div>
              <p className="text-sm text-[hsl(var(--charcoal))] leading-relaxed pl-9">{n.content}</p>
            </div>
          );
        })}
        {notes.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">Aucune note.</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DOCUMENT GENERATOR MODAL
// ═══════════════════════════════════════════
function DocumentGeneratorModal({ caseObj, onClose }: { caseObj: ReturnType<typeof findCase> & {}; onClose: () => void }) {
  const [selected, setSelected] = useState<TemplateKey>('mise_en_demeure');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await downloadPdf(selected, caseObj);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[hsl(var(--charcoal))]/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[hsl(var(--crimson))]" />
            <h3 className="text-lg font-serif-display text-[hsl(var(--charcoal))]">Générateur de document</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Choisir un modèle</label>
            <div className="space-y-2">
              {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map(t => (
                <button
                  key={t}
                  onClick={() => setSelected(t)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border-2 transition",
                    selected === t ? "border-[hsl(var(--crimson))] bg-[hsl(var(--crimson))]/5" : "border-border hover:border-[hsl(var(--charcoal))]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[hsl(var(--charcoal))]">{TEMPLATE_LABELS[t]}</span>
                    {selected === t && <CheckCircle2 size={16} className="text-[hsl(var(--crimson))]" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{TEMPLATE_DESCRIPTIONS[t]}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pré-rempli avec</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Pill icon={Building2} text={caseObj.debtor.name} />
              <Pill icon={FileText} text={`${caseObj.invoices.length} facture(s)`} />
              <Pill icon={Scale} text={fmtTND(totalAmount(caseObj))} />
              <Pill icon={User} text={caseObj.lawyer.name} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground">Annuler</button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[hsl(var(--crimson))] text-white text-sm font-bold shadow-sm hover:shadow-md transition disabled:opacity-60"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <Download size={14} />}
            {generating ? 'Génération…' : done ? 'Téléchargé' : 'Générer & télécharger PDF'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
function Pill({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-[hsl(var(--charcoal))]">
      <Icon size={12} className="text-muted-foreground" />
      <span className="truncate">{text}</span>
    </div>
  );
}
