import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, ChevronRight, Landmark, FileCheck, Signature,
  ShieldAlert, RefreshCw, Layers, Calculator, ShieldCheck, PenTool, CircleAlert
} from 'lucide-react';
import { Invoice, FactoringRequest, Debtor } from '../../types/factoring';
import { calculateFactoringCosts } from '../../lib/factoring-mock';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface FactoringRequestsProps {
  invoices: Invoice[];
  debtors: Debtor[];
  requests: FactoringRequest[];
  onSubmitRequest: (newRequest: FactoringRequest) => void;
}

export default function FactoringRequests({ invoices, debtors, requests, onSubmitRequest }: FactoringRequestsProps) {
  const eligibleInvoices = invoices.filter(inv => inv.status === 'eligible' || inv.status === 'issued');

  // Request formulation state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [advanceRate, setAdvanceRate] = useState<number>(0.85); // 85% by default
  const [activeStep, setActiveStep] = useState<'formulate' | 'contract' | 'signature'>('formulate');
  const [isContractOpen, setIsContractOpen] = useState(false);

  // Digital Signature Pad state
  const [signatureName, setSignatureName] = useState('');
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  // Toggle selection
  const toggleSelectInvoice = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === eligibleInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleInvoices.map(i => i.id));
    }
  };

  // Pricing math based on selected invoices
  const chosenInvoices = invoices.filter(inv => selectedIds.includes(inv.id));
  const totalAmount = chosenInvoices.reduce((sum, item) => sum + item.amount, 0);

  // Take the highest risk grade among debtors to be safe
  const getWorstRiskGrade = (): 'A' | 'B' | 'C' | 'D' | 'E' => {
    if (chosenInvoices.length === 0) return 'B';
    const grads: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    let worstIdx = 0;
    
    chosenInvoices.forEach(inv => {
      const debtor = debtors.find(d => d.id === inv.debtorId);
      if (debtor) {
        const idx = grads.indexOf(debtor.riskGrade);
        if (idx > worstIdx) worstIdx = idx;
      }
    });

    return grads[worstIdx];
  };

  const currentRiskGrade = getWorstRiskGrade();
  const costs = calculateFactoringCosts(totalAmount, advanceRate, currentRiskGrade);

  // Start checkout / generation flow
  const handleOpenContract = () => {
    if (selectedIds.length === 0) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner au moins une facture éligible.', variant: 'destructive' });
      return;
    }
    setActiveStep('contract');
    setIsContractOpen(true);
  };

  // Submit and finalize request
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName && !signatureDrawn) {
      toast({ title: 'Erreur', description: 'La signature électronique est requise.', variant: 'destructive' });
      return;
    }

    const uniqueRequestNum = 'REQ-FACT-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
    
    const newReq: FactoringRequest = {
      id: 'req-' + Math.floor(Math.random() * 10000),
      requestNumber: uniqueRequestNum,
      companyName: 'RecovAI Cédant Démo',
      debtorNames: Array.from(new Set(chosenInvoices.map(i => i.debtorName))),
      totalInvoiceAmount: totalAmount,
      requestedAdvanceRate: advanceRate,
      approvedAdvanceRate: advanceRate,
      estimatedFees: costs.estimatedFees,
      reserveAmount: costs.reserveAmount,
      netDisbursedAmount: costs.netDisbursedAmount,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      invoices: chosenInvoices.map(inv => ({ ...inv, status: 'submitted' }))
    };

    onSubmitRequest(newReq);
    setSelectedIds([]);
    setIsContractOpen(false);
    setActiveStep('formulate');
    setSignatureName('');
    setSignatureDrawn(false);

    toast({
      title: 'Demande envoyée !',
      description: `Le dossier ${uniqueRequestNum} est désormais en cours d'évaluation par l'auditeur.`
    });
  };

  return (
    <div className="space-y-8">
      {/* Selection zone & custom pricing calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Invoice Packaging */}
        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm lg:col-span-7 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-navy font-syne">Packager Vos Créances</h3>
                <p className="text-xs text-muted-foreground">Sélectionnez les factures certifiées à soumettre au financement immédiat.</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs rounded-xl" onClick={handleSelectAll}>
                {selectedIds.length === eligibleInvoices.length && eligibleInvoices.length > 0 ? 'Désélectionner tout' : 'Sélectionner Tout'}
              </Button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {eligibleInvoices.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-slate-100 rounded-2xl">
                  <CircleAlert className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  Aucune facture disponible et vérifiée conforme pour le factoring.
                  <p className="text-xs mt-1 text-sky">Faites d'abord une saisie ou importe-les sous l'onglet Créances.</p>
                </div>
              ) : (
                eligibleInvoices.map(inv => {
                  const isChecked = selectedIds.includes(inv.id);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => toggleSelectInvoice(inv.id)}
                      className={`p-4 border rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isChecked ? 'border-sky bg-sky/5 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-sky border-sky text-white' : 'border-slate-300 bg-white'}`}>
                          {isChecked && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-navy truncate">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{inv.debtorName}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-navy">{inv.amount.toLocaleString()} TND</p>
                        <span className="text-[10px] font-bold text-muted-foreground">Ech. {new Date(inv.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 flex flex-col gap-1.5 mt-4">
            <span className="font-extrabold text-navy text-xs flex items-center gap-1">
              <Sparkles size={14} className="text-sky animate-spin-slow" />
              Critères automatiques de cession:
            </span>
            <p>
              Les factures doivent être conformes et exemptes de tout litige pour être transférées au Factor. L'avance maximale standard est régie par la grille de risque global du portefeuille.
            </p>
          </div>
        </div>

        {/* Right Side: Cost Simulator Grid */}
        <div className="bg-gradient-to-tr from-navy via-navy to-slate-900 text-white p-7 rounded-[2.5rem] shadow-xl lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 text-sky rounded-2xl">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight font-syne">Tarificateur d'Affacturage</h3>
                <p className="text-[10px] text-white/60">Simulateur de financement & reliquats de garantie.</p>
              </div>
            </div>

            {/* Advance rate slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/80 font-semibold">Quotité de financement d'avance:</span>
                <span className="text-sky font-black text-sm">{Math.round(advanceRate * 100)} %</span>
              </div>
              <Slider
                min={80}
                max={90}
                step={2}
                value={[advanceRate * 100]}
                onValueChange={val => setAdvanceRate(val[0] / 100)}
                className="my-2"
                disabled={selectedIds.length === 0}
              />
              <div className="flex justify-between text-[9px] text-white/40 font-bold uppercase tracking-wider">
                <span>Min: 80%</span>
                <span>Frais Moindres</span>
                <span>Max: 90%</span>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="border-t border-white/10 pt-4 space-y-3 text-xs">
              <div className="flex justify-between text-white/70">
                <span>Créances brutes sélectionnées ({selectedIds.length})</span>
                <span className="font-extrabold text-white">{totalAmount.toLocaleString()} TND</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Taux de commission d'affacturage</span>
                <span className="font-extrabold text-sky">{(costs.rates.factoringFeeRate * 100).toFixed(1)} %</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Intérêt de refinancement (Terme 60j)</span>
                <span className="font-extrabold text-[#f59e0b]">{(costs.rates.interestAnnualRate * 100).toFixed(1)} % l'an</span>
              </div>

              <div className="h-px bg-white/5 my-2" />

              <div className="flex justify-between text-nowrap text-white/70">
                <span>Montant de la retenue de Garantie ({Math.round((1 - advanceRate) * 100)}%)</span>
                <span>{costs.reserveAmount.toLocaleString()} TND</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Estimation Frais & Commissions Factor</span>
                <span className="text-rose-400 font-bold">-{costs.estimatedFees.toLocaleString()} TND</span>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-nowrap mt-4">
                <div>
                  <span className="text-[9px] text-white/50 uppercase font-black tracking-widest block">Liquidité Immédiate nette</span>
                  <span className="text-xl font-extrabold text-sky font-syne">{costs.netDisbursedAmount.toLocaleString()} TND</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block text-white/50 uppercase font-black">Grade Risque</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    currentRiskGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                    currentRiskGrade === 'B' ? 'bg-sky-500/20 text-sky-400' :
                    currentRiskGrade === 'C' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {currentRiskGrade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleOpenContract}
            disabled={selectedIds.length === 0}
            className="w-full bg-sky hover:bg-sky/90 text-white font-extrabold rounded-2xl py-3 shadow-lg shadow-sky/15 mt-6"
          >
            Signer la cession de créance
          </Button>
        </div>
      </div>

      {/* Checkout contract flow Dialog */}
      <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-8 bg-slate-50">
          
          <div className="flex justify-center mb-6">
            <div className="flex bg-white border rounded-full p-1 text-xs font-bold text-slate-400">
              <span className={`px-4 py-1.5 rounded-full ${activeStep === 'contract' ? 'bg-navy text-white' : ''}`}>1. Acte de Transfert</span>
              <span className={`px-4 py-1.5 rounded-full ${activeStep === 'signature' ? 'bg-navy text-white' : ''}`}>2. Écr. Signature</span>
            </div>
          </div>

          {activeStep === 'contract' ? (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-navy text-white rounded-xl">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <DialogTitle className="font-syne text-lg text-navy">Acte de Notification d'Affacturage</DialogTitle>
                    <DialogDescription className="text-xs">
                      Contrat de Cession de Créance à titre de garantie exclusive.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="my-6 bg-white border border-slate-100 rounded-2xl p-6 text-xs text-slate-700 space-y-4 max-h-[300px] overflow-y-auto font-mono">
                <p className="font-bold border-b pb-1 text-navy uppercase text-[10px]">CONTRAT CADRE DE FAC-TUNISIE</p>
                <p>
                  <strong>ENTRE LES SOUSSIGNÉS:</strong><br />
                  Le Cédant : <strong>RecovAI Cédant Démo</strong>, sise à Tunis.<br />
                  Le Factor : <strong>FACTOR Tunisie S.A.</strong>, agréé Banque Centrale de Tunisie.
                </p>
                <p>
                  <strong>EXPOSÉ DES GRILLES DE CESSION:</strong><br />
                  Le cédant transfère de manière irrévocable au Factor les factures répertoriées ci-dessous conformes à l'article 204 du Code des Obligations et des Contrats de Tunisie.
                </p>
                <div className="p-2.5 bg-slate-50 border rounded-lg">
                  {chosenInvoices.map((inv, i) => (
                    <div key={inv.id} className="flex justify-between border-b border-dashed border-slate-200 py-1 last:border-0 leading-tight">
                      <span>{inv.invoiceNumber} (Déb. {inv.debtorName.slice(0,15)}...)</span>
                      <strong className="text-navy">{inv.amount.toLocaleString()} TND</strong>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-navy border-t pt-1.5 mt-1">
                    <span>VOLUME TOTAL TTC CÉDÉ</span>
                    <span>{totalAmount.toLocaleString()} TND</span>
                  </div>
                </div>
                <p>
                  <strong>MODALITÉS FINANCIÈRES APPLICABLES:</strong><br />
                  - Quotité d'Advance libérée: {Math.round(advanceRate * 100)} % (Versement sous 24h ouvrées).<br />
                  - Fonds de Garantie (Réserves): {Math.round((1 - advanceRate) * 100)} % versé à la fermeture définitive.<br />
                  - Intérêts et Commissions inclus: {costs.estimatedFees.toLocaleString()} TND retenus d'avance.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsContractOpen(false)}>Annuler</Button>
                <Button className="bg-navy text-white hover:bg-navy/90 font-bold" onClick={() => setActiveStep('signature')}>
                  Étape Suivante <ChevronRight size={14} className="ml-1" />
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-navy text-white rounded-xl">
                    <Signature size={20} />
                  </div>
                  <div>
                    <DialogTitle className="font-syne text-lg text-navy">Signature Électronique (simulation de démonstration)</DialogTitle>
                    <DialogDescription className="text-xs">
                      Procédure de validation cryptographique et d'idempotence financière.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Pad/Input validation container */}
              <div className="my-6 space-y-4">
                <div className="space-y-2 text-xs">
                  <label className="font-bold text-navy">Saisissez votre Nom et Prénom pour signer :</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zeid Dhambri"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-sky outline-none font-bold"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <label className="font-bold text-navy">Signez tactinement ci-dessous :</label>
                  <div 
                    onClick={() => setSignatureDrawn(true)}
                    className="border border-slate-200 bg-white rounded-2xl h-36 flex items-center justify-center relative cursor-crosshair overflow-hidden"
                  >
                    {!signatureDrawn ? (
                      <span className="text-muted-foreground flex items-center gap-2 opacity-60">
                        <PenTool size={16} /> Cliquez ici pour apposer votre griffe
                      </span>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Styled mock signature script look */}
                        <div className="font-handwriting text-3xl text-navy italic font-thin transform -rotate-3 select-none">
                          {signatureName || 'Signature Digitale'}
                        </div>
                      </div>
                    )}
                    {signatureDrawn && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSignatureDrawn(false); }}
                        className="absolute right-3 bottom-3 text-[10px] uppercase font-bold text-red-500 bg-red-50 px-2 py-1 rounded"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 text-yellow-700 rounded-2xl text-xs flex gap-2">
                  <CircleAlert size={16} className="shrink-0 mt-0.5" />
                  <p>
                    En signant, vous attestez de l'exactitude des créances cédées et mandatez FACTOR S.A. pour percevoir les règlements directs.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setActiveStep('contract')}>Précédent</Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!signatureName && !signatureDrawn}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
                >
                  Finaliser & Soumettre
                </Button>
              </DialogFooter>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
