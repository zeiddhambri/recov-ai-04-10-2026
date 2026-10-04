import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, CheckCircle2, XCircle, Search, Filter, HelpCircle, FileText,
  UploadCloud, AlertCircle, RefreshCw, Layers, ShieldAlert, ArrowRight,
  Sparkles, Check, ChevronRight
} from 'lucide-react';
import { Invoice, Debtor } from '../../types/factoring';
import { checkInvoiceEligibility } from '../../lib/factoring-mock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface InvoiceImportAndListProps {
  invoices: Invoice[];
  debtors: Debtor[];
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'remainingAmount' | 'status' | 'eligibilityStatus' | 'eligibilityReasons' | 'created_at'>) => void;
  onImportBulk: (imported: Invoice[]) => void;
}

export default function InvoiceImportAndList({ invoices, debtors, onAddInvoice, onImportBulk }: InvoiceImportAndListProps) {
  // Query states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create state
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [invNumber, setInvNumber] = useState('');
  const [debtorId, setDebtorId] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Diagnostic modal state
  const [diagnosticInv, setDiagnosticInv] = useState<Invoice | null>(null);

  // Bulk import file simulator
  const [isDragging, setIsDragging] = useState(false);

  // Add manually handler
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNumber || !debtorId || !amount || !issueDate || !dueDate) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      toast({ title: 'Erreur', description: 'Le montant doit être supérieur à 0.', variant: 'destructive' });
      return;
    }

    onAddInvoice({
      invoiceNumber: invNumber,
      clientCode: 'CLI-' + Math.floor(1000 + Math.random() * 9000),
      debtorId,
      debtorName: debtors.find(d => d.id === debtorId)?.name || 'Débiteur Inconnu',
      issueDate,
      dueDate,
      amount: amtNum
    });

    toast({ title: 'Succès', description: `La facture ${invNumber} a été créée. Éligibilité calculée automatiquement.` });
    
    // reset
    setInvNumber('');
    setDebtorId('');
    setAmount('');
    setIssueDate('');
    setDueDate('');
    setIsOpenAdd(false);
  };

  // Mock File dropping processing
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    triggerBulkImport();
  };

  const triggerBulkImport = () => {
    // Generate 3 elegant mock scanned invoices to simulate import
    const imported: Invoice[] = [
      {
        id: 'bulk-1',
        invoiceNumber: 'FAC-FLDH-8902',
        clientCode: 'CLI-5501',
        debtorId: 'd-1',
        debtorName: 'SOCIETE TUNISIENNE DE SIDERURGIE S.A. (EL FOULADH)',
        issueDate: '2026-05-28',
        dueDate: '2026-08-25',
        amount: 145000,
        remainingAmount: 145000,
        status: 'eligible',
        eligibilityStatus: 'eligible',
        eligibilityReasons: ['Importé - validé d\'office', 'Facture saine d\'une grande entreprise sous-traitante'],
        created_at: new Date().toISOString()
      },
      {
        id: 'bulk-2',
        invoiceNumber: 'FAC-TT-3904',
        clientCode: 'CLI-9902',
        debtorId: 'd-2',
        debtorName: 'TUNISIE TELECOM S.A.',
        issueDate: '2026-05-27',
        dueDate: '2026-07-27',
        amount: 215000,
        remainingAmount: 215000,
        status: 'eligible',
        eligibilityStatus: 'eligible',
        eligibilityReasons: ['Souverain Tunisie Telecom - risque nul', 'Terme 60 jours standard'],
        created_at: new Date().toISOString()
      },
      {
        id: 'bulk-3',
        invoiceNumber: 'FAC-TRD-4560',
        clientCode: 'CLI-5520',
        debtorId: 'd-5',
        debtorName: 'SOCIETE GENERALE TRADING CO.',
        issueDate: '2026-04-10',
        dueDate: '2026-05-20',
        amount: 18000,
        remainingAmount: 18000,
        status: 'ineligible',
        eligibilityStatus: 'ineligible',
        eligibilityReasons: ['Avis de non-éligibilité immédiat', 'Facture déjà échue', 'Débiteur risqué ou insolvable (Grade E)'],
        created_at: new Date().toISOString()
      }
    ];

    onImportBulk(imported);
    toast({
      title: 'Importation réussie',
      description: `${imported.length} factures analysées de votre grand livre. Diagnostics terminés.`
    });
  };

  // Filter conditions
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                          inv.debtorName.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'eligible') return matchesSearch && (inv.status === 'eligible' || inv.status === 'issued');
    if (statusFilter === 'ineligible') return matchesSearch && inv.status === 'ineligible';
    if (statusFilter === 'financed') return matchesSearch && inv.status === 'financed';
    if (statusFilter === 'overdue') return matchesSearch && inv.status === 'overdue';
    
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search and upload actions bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher facture, débiteur..."
              className="pl-10 rounded-xl"
              value={search}
              onChange={e => setSearch(searchFilter => e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 rounded-xl bg-card border border-border">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Filtre: Tous</SelectItem>
                <SelectItem value="eligible">Disponibles / Éligibles</SelectItem>
                <SelectItem value="ineligible">Non éligibles</SelectItem>
                <SelectItem value="financed">Financées (Tirées)</SelectItem>
                <SelectItem value="overdue">Échues / Retards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Create Invoice manually */}
          <Dialog open={isOpenAdd} onOpenChange={setIsOpenAdd}>
            <DialogTrigger asChild>
              <Button className="bg-navy hover:bg-navy/90 text-white rounded-xl gap-2 font-bold px-4">
                <Plus size={16} />
                Saisir Facture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle className="font-syne text-xl text-navy">Émission Facture Débiteur</DialogTitle>
                  <DialogDescription>
                    Saisissez les termes originaux de la facture pour calculer l'éligibilité d'affacturage.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-6">
                  <div className="space-y-2">
                    <Label htmlFor="num">Numéro de Facture</Label>
                    <Input
                      id="num"
                      placeholder="e.g. FAC-2026-X01"
                      required
                      value={invNumber}
                      onChange={e => setInvNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debtor">Débiteur (Acheteur certifié)</Label>
                    <Select value={debtorId} onValueChange={setDebtorId} required>
                      <SelectTrigger className="bg-input" id="debtor">
                        <SelectValue placeholder="Sélectionner le client débiteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {debtors.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} (Grade {d.riskGrade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amt">Montant de la créance (TND TTC)</Label>
                    <Input
                      id="amt"
                      type="number"
                      placeholder="e.g. 75000"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue">Émission</Label>
                      <Input
                        id="issue"
                        type="date"
                        required
                        value={issueDate}
                        onChange={e => setIssueDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due">Échéance paiement</Label>
                      <Input
                        id="due"
                        type="date"
                        required
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsOpenAdd(false)}>Annuler</Button>
                  <Button type="submit" className="bg-sky hover:bg-sky/90 text-white font-bold">Simuler & Ajouter</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Import bulk files */}
          <Button onClick={triggerBulkImport} variant="outline" className="border-sky text-sky rounded-xl gap-2 hover:bg-sky/10">
            <UploadCloud size={16} />
            Importer FEC/Format SAGE
          </Button>
        </div>
      </div>

      {/* Drag and Drop Zone Container */}
      <div
        className={`border-2 border-dashed rounded-[2rem] p-6 text-center transition-all ${
          isDragging ? 'border-sky bg-sky/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={triggerBulkImport}
      >
        <div className="flex flex-col items-center justify-center cursor-pointer">
          <UploadCloud className="h-10 w-10 text-muted-foreground animate-pulse mb-2" />
          <p className="text-sm font-bold text-navy">Faites glisser votre extrait grand livre client ou un fichier SAGE</p>
          <p className="text-xs text-muted-foreground mt-1">Sert également de simulation d'extraction de données de votre ERP.</p>
        </div>
      </div>

      {/* Invoices grid */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-navy text-sm font-syne">Registre des Créances Factoring ( {filteredInvoices.length} )</h2>
          <span className="text-xs font-bold text-muted-foreground bg-white border border-border rounded-lg px-2.5 py-1">Aujourd'hui: 30 Mai 2026</span>
        </div>

        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-6">Réf Facture</th>
                <th className="py-4 px-6">Débiteur (Client acheteur)</th>
                <th className="py-4 px-6 text-right">Échéance</th>
                <th className="py-4 px-6 text-right">Montant Brut</th>
                <th className="py-4 px-6 text-center">Éligibilité automatique</th>
                <th className="py-4 px-6 text-center">Statut Cycle</th>
                <th className="py-4 px-6 text-right">Analyse</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Aucune créance enregistrée pour ce filtre.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-slate-50/30 transition-all">
                    <td className="py-4 px-6 font-bold text-navy flex items-center gap-2">
                      <FileText size={16} className="text-muted-foreground shrink-0" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate font-medium text-slate-700">{inv.debtorName}</td>
                    <td className="py-4 px-6 text-right font-medium text-slate-700">
                      {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-navy">{inv.amount.toLocaleString()} TND</td>
                    <td className="py-4 px-6 text-center">
                      {inv.status === 'ineligible' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-500 border border-rose-100">
                          <XCircle size={14} /> Inéligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle2 size={14} /> Éligible
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {inv.status === 'draft' && <span className="text-gray-500 font-semibold text-xs">Brouillon</span>}
                      {inv.status === 'eligible' && <span className="text-sky bg-sky/10 border border-sky/25 px-2.5 py-0.5 rounded-full font-bold text-xs">Disponible</span>}
                      {inv.status === 'issued' && <span className="text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full font-bold text-xs">Émise</span>}
                      {inv.status === 'submitted' && <span className="text-gold bg-gold/10 border border-gold/25 px-2.5 py-0.5 rounded-full font-bold text-xs">Soumise</span>}
                      {inv.status === 'financed' && <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold text-xs">Financée</span>}
                      {inv.status === 'paid' && <span className="text-green-600 bg-green-50 border border-green-100 px-2.5 py-0.5 rounded-full font-bold text-xs text-nowrap">Payée (Solde clos)</span>}
                      {inv.status === 'overdue' && <span className="text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full font-bold text-xs text-nowrap">Échue Retard</span>}
                      {inv.status === 'disputed' && <span className="text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full font-bold text-xs text-nowrap">En Litige</span>}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-sky hover:text-sky/90 gap-1 rounded-lg text-xs"
                        onClick={() => setDiagnosticInv(inv)}
                      >
                        Diagnostic <ChevronRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structured diagnostic details dialog */}
      <Dialog open={!!diagnosticInv} onOpenChange={open => !open && setDiagnosticInv(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-7">
          {diagnosticInv && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${diagnosticInv.status === 'ineligible' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <DialogTitle className="font-syne text-xl text-navy">Rapport d'Éligibilité Automatique</DialogTitle>
                    <DialogDescription className="text-xs">
                      Facture {diagnosticInv.invoiceNumber} — Montant: {diagnosticInv.amount.toLocaleString()} TND
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Central rule lists matching factoring guidelines */}
              <div className="my-6 space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Débiteur Déclaré</span>
                  <p className="font-bold text-navy truncate">{diagnosticInv.debtorName}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-navy uppercase tracking-widest border-b pb-1">Résultats du diagnostic réglementaire</h4>
                  
                  <div className="space-y-2">
                    {diagnosticInv.eligibilityReasons.map((reason, i) => (
                      <div key={i} className="flex gap-2 items-start text-xs font-medium text-slate-700">
                        {diagnosticInv.status === 'ineligible' && i === 0 ? (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-sky/5 rounded-2xl border border-sky/10 text-xs text-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold text-navy text-xs">
                    <Sparkles size={14} className="text-sky" />
                    <span>Calculateur financier prévisionnel (Option Factoring) :</span>
                  </div>
                  <p className="mt-1">
                    À l'échéance du {new Date(diagnosticInv.dueDate).toLocaleDateString('fr-FR')}, l'avance estimée à <strong className="text-navy">85%</strong> s'élève à <strong className="text-emerald-600 font-extrabold">{(diagnosticInv.amount * 0.85).toLocaleString()} TND</strong>, assurant avec le financement immédiat une réduction significative du Besoin en Fonds de Roulement.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setDiagnosticInv(null)} className="w-full bg-navy text-white hover:bg-navy/9 -semibold">
                  Fermer l'analyse
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
