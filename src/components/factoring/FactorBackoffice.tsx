import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, CheckCircle2, XCircle, Landmark, Sparkles, Building,
  AlertOctagon, Check, ArrowRight, Hourglass, Scale, Calendar, HelpCircle,
  ThumbsUp, Ban, DollarSign, RefreshCw
} from 'lucide-react';
import { FactoringRequest, Invoice, Debtor, Dispute } from '../../types/factoring';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface FactorBackofficeProps {
  requests: FactoringRequest[];
  invoices: Invoice[];
  debtors: Debtor[];
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onSimulatePayment: (id: string, paymentType: 'full' | 'partial' | 'disputed' | 'overdue', customAmount?: number) => void;
  onRegisterDispute: (dispute: Omit<Dispute, 'id' | 'openedAt'>) => void;
}

export default function FactorBackoffice({
  requests, invoices, debtors,
  onApproveRequest, onRejectRequest, onSimulatePayment, onRegisterDispute
}: FactorBackofficeProps) {
  const submittedRequests = requests.filter(r => r.status === 'submitted');
  const fundedRequests = requests.filter(r => r.status === 'funded');

  // Dispute creation helper state
  const [isOpenDispute, setIsOpenDispute] = useState(false);
  const [disputeInvoiceId, setDisputeInvoiceId] = useState('');
  const [disputeReason, setDisputeReason] = useState<'disagreement_amount' | 'undelivered_goods' | 'damaged_goods' | 'late_delivery' | 'other'>('disagreement_amount');
  const [disputeDesc, setDisputeDesc] = useState('');

  // Handle dispute submit
  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeInvoiceId) return;

    const matchedInvoice = invoices.find(inv => inv.id === disputeInvoiceId);
    if (!matchedInvoice) return;

    onRegisterDispute({
      invoiceId: disputeInvoiceId,
      invoiceNumber: matchedInvoice.invoiceNumber,
      debtorName: matchedInvoice.debtorName,
      reason: disputeReason,
      description: disputeDesc,
      disputedAmount: matchedInvoice.amount
    });

    setDisputeInvoiceId('');
    setDisputeDesc('');
    setIsOpenDispute(false);

    toast({
      title: 'Litige Enregistré !',
      description: `La créance ${matchedInvoice.invoiceNumber} est suspendue en attente de résolution amiable.`
    });
  };

  return (
    <div className="space-y-8">
      {/* Pending audit approvals list */}
      <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-navy font-syne">Comité d'Approbation du Factor</h3>
            <p className="text-xs text-muted-foreground">Vérifiez les dossiers reçus pour autoriser le virement immédiat des avances nettes.</p>
          </div>
          <span className="text-xs font-bold text-sky bg-sky/10 border border-sky/20 rounded-xl px-3 py-1">
            {submittedRequests.length} dossiers en attente
          </span>
        </div>

        {submittedRequests.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-slate-100 rounded-2xl">
            <Hourglass className="mx-auto h-8 w-8 text-sky animate-spin-slow mb-2" />
            Aucun dossier soumis en attente d'approbation d'avance.
            <p className="text-xs mt-1 text-muted-foreground">Créez des soumissions d'abord dans l'onglet "Demander Financement".</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submittedRequests.map(req => (
              <div key={req.id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 hover:border-slate-200 transition-all">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-navy text-sm font-syne">{req.requestNumber}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-white border border-slate-200 rounded px-1.5 py-0.5">Vérifié Cédant</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">Débiteurs : <strong className="text-navy">{req.debtorNames.join(', ')}</strong></p>
                  <p className="text-[11px] text-muted-foreground font-medium">Invoices: {req.invoices.map(i => i.invoiceNumber).join(', ')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium bg-white p-3 border rounded-xl shrink-0">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase block">Volume Brut</span>
                    <strong className="text-slate-800 text-sm">{req.totalInvoiceAmount.toLocaleString()} TND</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#0ea5e9] uppercase block">Net Avance</span>
                    <strong className="text-[#0ea5e9] text-sm font-extrabold">{req.netDisbursedAmount.toLocaleString()} TND</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2shrink-0">
                  <Button
                    size="sm"
                    className="bg-sky hover:bg-sky/90 text-white font-bold gap-1 rounded-xl"
                    onClick={() => onApproveRequest(req.id)}
                  >
                    <ThumbsUp size={14} /> Financer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 font-medium gap-1 rounded-xl"
                    onClick={() => onRejectRequest(req.id)}
                  >
                    <Ban size={14} /> Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulator: Payment collections and Debt states */}
      <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-navy font-syne">Maturité, Litiges & Règlements</h3>
            <p className="text-xs text-muted-foreground">Faites évoluer le cycle de vie des créance débloquées en tant que Débiteur payeur.</p>
          </div>
          <Button
            onClick={() => setIsOpenDispute(true)}
            variant="outline"
            className="border-purple-300 text-purple-600 rounded-xl gap-1.5 text-xs font-bold hover:bg-purple-50"
          >
            <ShieldAlert size={14} /> Déclarer un Litige (Dispute)
          </Button>
        </div>

        {fundedRequests.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-slate-100 rounded-2xl">
            <Landmark className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            Aucun crédit débloqué en cours d'encaissement de maturité.
            <p className="text-xs mt-1 text-sky">Approuvez d'abord une demande de financement ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fundedRequests.map(req => {
              // check if there's any active invoice in this req
              const inDispute = req.invoices.some(inv => invoices.find(i => i.id === inv.id)?.status === 'disputed');
              const isPaid = req.invoices.every(inv => {
                const live = invoices.find(i => i.id === inv.id);
                return live ? live.status === 'paid' : false;
              });

              return (
                <div key={req.id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-200 transition-all bg-card shadow-sm">
                  <div className="space-y-1">
                    <p className="font-extrabold text-navy text-sm font-syne">{req.requestNumber}</p>
                    <p className="text-xs text-slate-700 font-semibold">Débité : <strong className="text-navy">{req.debtorNames.join(', ')}</strong></p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Avance Versée</span>
                      {inDispute && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">Contesté / Bloqué</span>
                      )}
                      {isPaid && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-100">Intégralement Réconcilié</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs shrink-0 select-none bg-slate-50 p-3 rounded-xl border">
                    <span className="text-[9px] text-muted-foreground uppercase font-black block">Retenue de Garantie (Reliquat)</span>
                    <strong className="text-navy font-extrabold">{req.reserveAmount.toLocaleString()} TND</strong>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold gap-1 rounded-xl text-xs"
                      onClick={() => onSimulatePayment(req.id, 'full')}
                      disabled={isPaid}
                    >
                      <CheckCircle2 size={14} /> Simuler Règlement Cible
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 font-semibold gap-1 rounded-xl text-xs"
                      onClick={() => onSimulatePayment(req.id, 'overdue')}
                      disabled={isPaid}
                    >
                      <AlertOctagon size={14} /> Fast-term Retard
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual register dispute Dialog form */}
      <Dialog open={isOpenDispute} onOpenChange={setIsOpenDispute}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleDisputeSubmit}>
            <DialogHeader>
              <DialogTitle className="font-syne text-lg text-navy flex items-center gap-2">
                <ShieldAlert size={20} className="text-purple-600" />
                Déclaration de Litige Commercial
              </DialogTitle>
              <DialogDescription className="text-xs">
                Une facture contestée par l'acheteur final gelera le paiement du reliquat de garantie.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div className="space-y-2">
                <Label htmlFor="disputeInv">Sélectionner la créance contestée</Label>
                <Select value={disputeInvoiceId} onValueChange={setDisputeInvoiceId} required>
                  <SelectTrigger className="bg-input" id="disputeInv">
                    <SelectValue placeholder="Choisir facture concernée" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.filter(i => i.status === 'financed').map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoiceNumber} - {i.debtorName} ({i.amount.toLocaleString()} TND)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispReason">Motif du désaccord débiteur</Label>
                <Select value={disputeReason} onValueChange={(val: any) => setDisputeReason(val)} required>
                  <SelectTrigger className="bg-input" id="dispReason">
                    <SelectValue placeholder="Choisir un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disagreement_amount">Désaccord sur le montant facturé</SelectItem>
                    <SelectItem value="undelivered_goods">Marchandises non livrées</SelectItem>
                    <SelectItem value="damaged_goods">Prestation non conforme ou avarié</SelectItem>
                    <SelectItem value="late_delivery">Retard excessif de livraison</SelectItem>
                    <SelectItem value="other">Autre litige commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispDesc">Détails explicatifs de la contestation</Label>
                <Input
                  id="dispDesc"
                  placeholder="e.g. Rupture d'approvisionnement, avoirs d'attente à enregistrer"
                  required
                  value={disputeDesc}
                  onChange={e => setDisputeDesc(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpenDispute(false)}>Annuler</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">Confirmer l'Incident</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
