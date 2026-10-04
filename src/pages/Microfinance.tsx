import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Users, TrendingUp, Wallet, Percent, Briefcase, MapPin,
  Calendar, Flame, ShieldAlert, FileDigit, Gavel, FileText, Plus,
  Search, Building, CheckCircle, XCircle, Clock, ArrowRight, BookOpen,
  Send, Smartphone, Check, Sparkles, Filter, AlertCircle, Settings
} from 'lucide-react';
import { getMfiState, saveMfiState, MfiState } from '../lib/microfinance-mock';
import { 
  LoanAccount, CollectionCase, CollectionAction, PromiseToPay, 
  FieldVisit, RecoveryPayment, LegalCase, LegalAction, LegalDocument 
} from '../types/microfinance';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Microfinance() {
  const [state, setState] = useState<MfiState>(() => getMfiState());
  const [activeTab, setActiveTab] = useState<'portfolio' | 'collection' | 'field' | 'litigation' | 'settings'>('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Details states
  const [selectedCase, setSelectedCase] = useState<CollectionCase | null>(null);
  const [selectedLegalCase, setSelectedLegalCase] = useState<LegalCase | null>(null);
  
  // Dialogue/Action forms state
  const [newActionType, setNewActionType] = useState<'phone_call' | 'sms_sent' | 'whatsapp_sent' | 'field_visit'>('phone_call');
  const [newActionComment, setNewActionComment] = useState('');
  const [newActionNextDate, setNewActionNextDate] = useState('');
  const [newActionResult, setNewActionResult] = useState<'client_reached' | 'promise_to_pay' | 'refuses_to_pay'>('client_reached');
  
  // Promise form state
  const [newPromiseAmount, setNewPromiseAmount] = useState('');
  const [newPromiseDate, setNewPromiseDate] = useState('');
  
  // Payment simulation state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer'>('mobile_money');

  // Legal action form state
  const [newLegalActionType, setNewLegalActionType] = useState<'formal_notice' | 'court_filing' | 'hearing' | 'judgment' | 'seizure'>('formal_notice');
  const [newLegalActionNotes, setNewLegalActionNotes] = useState('');
  const [newLegalActionResult, setNewLegalActionResult] = useState('');

  // Persist state updates
  useEffect(() => {
    saveMfiState(state);
  }, [state]);

  // Calculations for Portfolio Dashboard (PAR KPIs)
  const totalPortfolio = state.loans.reduce((acc, curr) => acc + curr.originalAmount, 0);
  const outstandingPortfolio = state.loans.reduce((acc, curr) => acc + curr.totalOutstanding, 0);
  const overduePortfolio = state.installments
    .filter(i => i.status === 'overdue' || i.status === 'partially_paid')
    .reduce((acc, curr) => acc + curr.overdueAmount, 0);

  // Active Loans
  const activeLoansCount = state.loans.filter(l => l.status === 'active' || l.status === 'watchlist' || l.status === 'in_arrears').length;

  // Calcul du PAR ratio (Portfolio At Risk > 30 jours)
  const loansAtRisk30 = state.cases
    .filter(c => c.daysPastDue > 30 && c.status !== 'recovered')
    .map(c => c.loanAccountId);
  
  const outstandingAtRisk30 = state.loans
    .filter(l => loansAtRisk30.includes(l.id))
    .reduce((acc, curr) => acc + curr.totalOutstanding, 0);

  const par30Ratio = outstandingPortfolio > 0 ? (outstandingAtRisk30 / outstandingPortfolio) * 100 : 0;

  // Counts for tabs/alerts
  const activeCasesCount = state.cases.filter(c => c.status !== 'recovered' && c.status !== 'transferred_to_litigation').length;
  const activeVisitsCount = state.visits.filter(v => v.visitStatus === 'planned').length;
  const activeLegalCount = state.legalCases.length;

  // ----------------------------------------------------
  // ACTION handlers
  // ----------------------------------------------------

  // 1. Ajouter une action de relance
  const handleAddAction = (caseId: string) => {
    if (!newActionComment.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez saisir un commentaire.', variant: 'destructive' });
      return;
    }

    const currentCase = state.cases.find(c => c.id === caseId);
    if (!currentCase) return;

    const actionId = `act-${Math.floor(Math.random() * 10000)}`;
    const newAction: CollectionAction = {
      id: actionId,
      collectionCaseId: caseId,
      actionType: newActionType,
      actorName: 'zeid.dhambri@gmail.com',
      actionDate: new Date().toISOString(),
      result: newActionResult as any,
      comment: newActionComment,
      nextActionDate: newActionNextDate || undefined
    };

    // If result was promise, ensure we track it
    const updatedPromises = [...state.promises];
    let updatedCaseStatus = currentCase.status;

    if (newActionResult === 'promise_to_pay' && newPromiseAmount && newPromiseDate) {
      const pId = `prom-${Math.floor(Math.random() * 10000)}`;
      const pAmt = parseFloat(newPromiseAmount);
      
      const newPromise: PromiseToPay = {
        id: pId,
        collectionCaseId: caseId,
        clientName: currentCase.clientName,
        promisedAmount: pAmt,
        promisedDate: newPromiseDate,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      updatedPromises.push(newPromise);
      updatedCaseStatus = 'promise_to_pay';
      
      // Log Audit
      state.auditLogs.unshift({
        id: `log-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date().toISOString(),
        user: 'zeid.dhambri@gmail.com',
        action: 'Enregistrement Promesse',
        details: `Saisie d'une promesse de paiement de ${pAmt.toLocaleString()} TND le ${newPromiseDate} par ${currentCase.clientName}.`,
        category: 'promise'
      });
    }

    // Log Action
    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'zeid.dhambri@gmail.com',
      action: 'Nouveau contact amiable',
      details: `Action ${newActionType} enregistrée sur le dossier de ${currentCase.clientName} (Résultat: ${newActionResult}).`,
      category: 'collection'
    });

    // Update state
    setState(prev => ({
      ...prev,
      actions: [newAction, ...prev.actions],
      promises: updatedPromises,
      cases: prev.cases.map(c => c.id === caseId ? { ...c, status: updatedCaseStatus, lastActionAt: new Date().toISOString() } : c)
    }));

    toast({ title: 'Action enregistrée', description: 'Le compte rendu a été ajouté avec succès.' });
    
    // Reset forms
    setNewActionComment('');
    setNewActionNextDate('');
    setNewPromiseAmount('');
    setNewPromiseDate('');
  };

  // 2. Simuler un règlement de recouvrement
  const handleSimulatePayment = (caseId: string) => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Erreur', description: 'Vezillez saisir un montant de paiement valide.', variant: 'destructive' });
      return;
    }

    const currentCase = state.cases.find(c => c.id === caseId);
    if (!currentCase) return;

    const receiptNum = `REC-MFI-${Math.floor(Math.random() * 1000 + 1000)}`;
    const payoutId = `pay-${Math.floor(Math.random() * 10000)}`;

    const newPayment: RecoveryPayment = {
      id: payoutId,
      collectionCaseId: caseId,
      loanAccountId: currentCase.loanAccountId,
      clientName: currentCase.clientName,
      amount: amt,
      paymentMethod,
      receivedBy: 'Caisse RecovAI (Démo)',
      receivedAt: new Date().toISOString(),
      status: 'confirmed',
      receiptNumber: receiptNum
    };

    // Update client loan balances & instalments overdue
    const updatedLoans = state.loans.map(loan => {
      if (loan.id === currentCase.loanAccountId) {
        const nextPrinc = Math.max(0, loan.outstandingPrincipal - amt * 0.9);
        const nextInt = Math.max(0, loan.outstandingInterest - amt * 0.1);
        const finalOutstanding = nextPrinc + nextInt + loan.outstandingFees;
        return {
          ...loan,
          outstandingPrincipal: nextPrinc,
          outstandingInterest: nextInt,
          totalOutstanding: finalOutstanding,
          status: finalOutstanding === 0 ? ('closed' as const) : loan.status
        };
      }
      return loan;
    });

    const refreshedCaseStatus = amt >= currentCase.overdueAmount ? 'recovered' as const : 'in_progress' as const;

    // Reduire les traites overdue
    let remainingPayment = amt;
    const updatedInstallments = state.installments.map(inst => {
      if (inst.loanAccountId === currentCase.loanAccountId && inst.status !== 'paid' && remainingPayment > 0) {
        const toPay = Math.min(remainingPayment, inst.overdueAmount);
        const nextOverdue = inst.overdueAmount - toPay;
        remainingPayment -= toPay;
        return {
          ...inst,
          overdueAmount: nextOverdue,
          totalPaid: inst.totalPaid + toPay,
          status: nextOverdue === 0 ? ('paid' as const) : ('partially_paid' as const)
        };
      }
      return inst;
    });

    // Check if any matching promises are pending to mark fulfilled
    const updatedPromises = state.promises.map(p => {
      if (p.collectionCaseId === caseId && p.status === 'pending' && amt >= p.promisedAmount) {
        return { ...p, status: 'fulfilled' as const };
      }
      return p;
    });

    // System log
    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'Système Comptable MFI',
      action: 'Encaissement de Retard',
      details: `Reçu de versement ${receiptNum} généré. Montant: ${amt.toLocaleString()} TND en ${paymentMethod} pour ${currentCase.clientName}.`,
      category: 'payment'
    });

    setState(prev => ({
      ...prev,
      loans: updatedLoans,
      installments: updatedInstallments,
      payments: [newPayment, ...prev.payments],
      promises: updatedPromises,
      cases: prev.cases.map(c => c.id === caseId ? { 
        ...c, 
        overdueAmount: Math.max(0, c.overdueAmount - amt),
        status: refreshedCaseStatus
      } : c)
    }));

    toast({
      title: 'Paiement encaissé !',
      description: `Versement de ${amt.toLocaleString()} TND enregistré avec succès. Reçu de paiement émis sous le numéro ${receiptNum}.`
    });

    setPaymentAmount('');
    setSelectedCase(null);
  };

  // 3. Planifier / Assigner une visite terrain
  const handleScheduleVisit = (caseId: string, plannedDate: string) => {
    if (!plannedDate) {
      toast({ title: 'Erreur', description: 'Veuillez choisir une date.', variant: 'destructive' });
      return;
    }
    const currentCase = state.cases.find(c => c.id === caseId);
    if (!currentCase) return;

    const newVisit: FieldVisit = {
      id: `vis-${Math.floor(Math.random() * 10000)}`,
      collectionCaseId: caseId,
      clientName: currentCase.clientName,
      assignedAgentName: currentCase.assignedAgentName,
      plannedDate,
      visitStatus: 'planned'
    };

    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'zeid.dhambri@gmail.com',
      action: 'Plannification Visite',
      details: `Visite terrain chez ${currentCase.clientName} programmée pour le ${plannedDate}. Chargé d'affaires: ${currentCase.assignedAgentName}.`,
      category: 'visit'
    });

    setState(prev => ({
      ...prev,
      visits: [newVisit, ...prev.visits]
    }));

    toast({ title: 'Visite planifiée', description: `L'agent ${currentCase.assignedAgentName} a reçu la feuille de route sur son mobile.` });
  };

  // 4. Clôturer / Valider une visite terrain
  const handleCompleteVisit = (visitId: string, resultText: string, status: 'completed' | 'missed') => {
    if (!resultText) {
      toast({ title: "Commentaire requis", description: "Veuillez insérer le compte-rendu de la visite.", variant: 'destructive' });
      return;
    }

    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'zeid.dhambri@gmail.com',
      action: 'Retour terrain Agent',
      details: `Rapport de visite terrain mis à jour pour ${status}. Commentaire: ${resultText}.`,
      category: 'visit'
    });

    setState(prev => ({
      ...prev,
      visits: prev.visits.map(v => v.id === visitId ? {
        ...v,
        visitStatus: status,
        actualVisitDate: new Date().toISOString().split('T')[0],
        result: resultText
      } : v)
    }));

    toast({ title: 'Rapport de visite synchronisé', description: 'Le dossier de recouvrement amiable a été mis à jour.' });
  };

  // 5. Transfert au contentieux / recouvrement judiciaire
  const handleEscalateToLitigation = (caseId: string) => {
    const currentCase = state.cases.find(c => c.id === caseId);
    if (!currentCase) return;

    const legalId = `leg-${Math.floor(Math.random() * 10000)}`;
    const newLegalCase: LegalCase = {
      id: legalId,
      collectionCaseId: caseId,
      loanAccountId: currentCase.loanAccountId,
      clientName: currentCase.clientName,
      legalCaseNumber: `MFI-TPI-${new Date().getFullYear()}-${Math.floor(Math.random() * 300 + 100)}`,
      legalOfficerName: 'Adel Dridi (Juriste)',
      externalLawyerName: 'Maître Leila Ben Youssef (Avocat)',
      principalDue: currentCase.overdueAmount * 0.9,
      interestDue: currentCase.overdueAmount * 0.1,
      legalFees: 120, // initial fee
      totalClaimAmount: currentCase.overdueAmount + 120,
      status: 'opened',
      openedAt: new Date().toISOString().split('T')[0]
    };

    // Update case status to 'transferred_to_litigation'
    const updatedCases = state.cases.map(c => {
      if (c.id === caseId) {
        return { ...c, status: 'transferred_to_litigation' as const };
      }
      return c;
    });

    // Update loan account status to 'litigation'
    const updatedLoans = state.loans.map(l => {
      if (l.id === currentCase.loanAccountId) {
        return { ...l, status: 'litigation' as const };
      }
      return l;
    });

    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'zeid.dhambri@gmail.com',
      action: 'Escalade Recouvrement Judiciaire',
      details: `Dossier récalcitrant de ${currentCase.clientName} transféré au pôle juridique. Création du cas ${newLegalCase.legalCaseNumber}.`,
      category: 'litigation'
    });

    setState(prev => ({
      ...prev,
      cases: updatedCases,
      loans: updatedLoans,
      legalCases: [newLegalCase, ...prev.legalCases]
    }));

    toast({
      title: 'Transféré au Service Contentieux',
      description: `Le dossier ${currentCase.clientName} est désormais pris en charge judiciairement.`
    });

    setSelectedCase(null);
    setActiveTab('litigation');
  };

  // 6. Ajouter une action juridique
  const handleAddLegalAction = (legalCaseId: string) => {
    if (!newLegalActionNotes.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez saisir des notes explicatives.', variant: 'destructive' });
      return;
    }

    const currentLegal = state.legalCases.find(l => l.id === legalCaseId);
    if (!currentLegal) return;

    const action: LegalAction = {
      id: `lact-${Math.floor(Math.random() * 10000)}`,
      legalCaseId,
      actionType: newLegalActionType,
      actionDate: new Date().toISOString().split('T')[0],
      performedBy: 'Maître Leila Ben Youssef (Avocat)',
      result: newLegalActionResult || 'Mis en exécution',
      notes: newLegalActionNotes
    };

    // Update Legal case status if appropriate
    let newStatus = currentLegal.status;
    if (newLegalActionType === 'court_filing') newStatus = 'filed_to_court';
    if (newLegalActionType === 'hearing') newStatus = 'court_hearing';
    if (newLegalActionType === 'judgment') newStatus = 'judgment_obtained';
    if (newLegalActionType === 'seizure') newStatus = 'seizure';

    state.auditLogs.unshift({
      id: `log-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      user: 'Maître Leila Ben Youssef',
      action: 'Nouvelle démarche d\'huissier',
      details: `Action judiciaire ${newLegalActionType} exécutée pour le dossier ${currentLegal.legalCaseNumber}.`,
      category: 'litigation'
    });

    setState(prev => ({
      ...prev,
      legalActions: [action, ...prev.legalActions],
      legalCases: prev.legalCases.map(l => l.id === legalCaseId ? { ...l, status: newStatus } : l)
    }));

    toast({ title: 'Procédure mise à jour', description: 'La démarche légale a été enregistrée au plumitif.' });
    setNewLegalActionNotes('');
    setNewLegalActionResult('');
  };

  // Toggle Promise Status (simuler le respect ou la rupture)
  const handleTogglePromiseStatus = (pId: string, status: 'fulfilled' | 'broken') => {
    setState(prev => ({
      ...prev,
      promises: prev.promises.map(p => p.id === pId ? { ...p, status } : p)
    }));
    toast({ title: 'Statut mis à jour', description: `La promesse a été déclarée comme ${status === 'fulfilled' ? 'tenue' : 'rompue'}.` });
  };

  // Filter lists based on search query
  const filteredCases = state.cases.filter(c => 
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.assignedAgentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLoans = state.loans.filter(l => 
    l.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.assignedAgentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8" id="mfi-module-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-navy tracking-tight font-syne flex items-center gap-2">
              <Building className="text-sky shrink-0" size={28} />
              Institution de Microfinance
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider text-crimson bg-crimson/10 px-2.5 py-0.5 rounded-full border border-crimson/20 flex items-center gap-1">
              <Sparkles size={11} className="shrink-0" />
              PILOTAGE PORTefeuille & RECOUVREMENT
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Contrôle du risque opérationnel, calcul du PAR ratio et exécution concertée du recouvrement amiable et judiciaire.</p>
        </div>
      </div>

      {/* METRIC CARDS / BENTo-GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* PAR 30 Ratio */}
        <div className="bg-navy text-white rounded-2xl p-5 shadow-md flex flex-col justify-between border border-white/5 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white">
            <Percent size={110} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-sky/80 tracking-widest">PAR 30 Ratio</span>
            <div className="p-1 px-2.5 rounded-full bg-crimson/20 border border-crimson/30 text-crimson text-[10px] font-bold">Alerte BCT</div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black font-syne">{par30Ratio.toFixed(1)}%</span>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-sky h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, par30Ratio * 2)}%` }} 
              />
            </div>
          </div>
          <span className="text-[10px] text-white/50 mt-2 font-mono">Prêts &gt;30 jours de retard / Encours</span>
        </div>

        {/* Encours Total */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-extrabold tracking-wider">Encours Actif</span>
            <TrendingUp size={18} />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-navy">{outstandingPortfolio.toLocaleString()} TND</span>
            <p className="text-xs text-muted-foreground mt-1">Sur {activeLoansCount} crédits décaissés</p>
          </div>
          <div className="text-[10px] font-semibold text-slate-500 bg-slate-50 p-1.5 rounded-xl border flex justify-between">
            <span>Portfolio Originel :</span>
            <span className="font-bold text-navy">{totalPortfolio.toLocaleString()} TND</span>
          </div>
        </div>

        {/* Cumul Impayés */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-extrabold tracking-wider">Cumul Retards</span>
            <Flame size={18} className="text-crimson" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-crimson">{overduePortfolio.toLocaleString()} TND</span>
            <p className="text-xs text-muted-foreground mt-1">Impayés effectifs cumulés</p>
          </div>
          <div className="text-[10px] font-semibold text-crimson/80 bg-crimson/5 p-1.5 rounded-xl border border-crimson/10 flex justify-between">
            <span>Dossiers Amiables :</span>
            <span className="font-black">{activeCasesCount}</span>
          </div>
        </div>

        {/* Actions Terrain */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-extrabold tracking-wider">Actions Terrain</span>
            <MapPin size={18} className="text-emerald-500" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-navy">{activeVisitsCount} planifiées</span>
            <p className="text-xs text-muted-foreground mt-1">Visites d'agents planifiées</p>
          </div>
          <div className="text-[10px] font-semibold text-slate-500 bg-slate-50 p-1.5 rounded-xl border flex justify-between">
            <span>Total Visites effectuées :</span>
            <span className="font-bold text-navy">{state.visits.filter(v => v.visitStatus === 'completed').length}</span>
          </div>
        </div>

        {/* Contentieux Juridique */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-extrabold tracking-wider">Pôle Contentieux</span>
            <Gavel size={18} className="text-navy" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-black text-amber-600">{activeLegalCount} dossiers</span>
            <p className="text-xs text-muted-foreground mt-1">Actions judiciaires engagées</p>
          </div>
          <div className="text-[10px] font-semibold text-slate-500 bg-slate-50 p-1.5 rounded-xl border flex justify-between">
            <span>Total réclamé :</span>
            <span className="font-bold text-navy">
              {state.legalCases.reduce((acc, curr) => acc + curr.totalClaimAmount, 0).toLocaleString()} TND
            </span>
          </div>
        </div>

      </div>

      {/* MODERN FUNCTION TAB NAVIGATION */}
      <div className="flex border-b border-border text-sm overflow-x-auto select-none bg-slate-50/50 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab('portfolio'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'portfolio' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Coins size={18} />
          Portefeuille & Aging MFI
        </button>

        <button
          onClick={() => { setActiveTab('collection'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'collection' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Smartphone size={18} />
          Recouvrement Amiable ({activeCasesCount})
        </button>

        <button
          onClick={() => { setActiveTab('field'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'field' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <MapPin size={18} />
          Visites & Promesses PTP
        </button>

        <button
          onClick={() => { setActiveTab('litigation'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'litigation' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Gavel size={18} />
          Suivi Contentieux ({activeLegalCount})
        </button>

        <button
          onClick={() => { setActiveTab('settings'); setSelectedCase(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'settings' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Settings size={18} />
          Seuils & Règles BCT
        </button>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
          <input
            type="text"
            className="w-full bg-slate-50/50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-sky font-medium text-navy"
            placeholder="Rechercher par client, prêt, agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <Filter size={12} />
            <span>Tunisie / Dinars Tunisien (TND)</span>
          </div>
        </div>
      </div>

      {/* CONTENT SWITCHER */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >

          {/* TAB 1: PORTFOLIO & AGING LIST */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              
              {/* Portfolio List & Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Microfinance Loan Ledger */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-5 border-b flex items-center justify-between">
                    <div>
                      <h3 className="font-syne font-bold text-navy">Registre Général des Prêts</h3>
                      <p className="text-slate-400 text-xs">Suivi des encours nominatifs de l'institution.</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-sky/10 text-sky px-2.5 py-1 rounded-lg">
                      {filteredLoans.length} contrats
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <tr>
                          <th className="p-4 pl-6">N° Contrat / Client</th>
                          <th className="p-4">Débouché sectoriel</th>
                          <th className="p-4">Déboursement</th>
                          <th className="p-4 text-right">Encours Restant</th>
                          <th className="p-4 text-center">Risque Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredLoans.map(loan => {
                          const hasArrears = loan.status === 'in_arrears' || loan.status === 'litigation';
                          const isWatchlist = loan.status === 'watchlist';
                          
                          return (
                            <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6">
                                <div className="font-bold text-navy">{loan.clientName}</div>
                                <div className="text-[11px] font-mono text-slate-400">{loan.loanNumber}</div>
                              </td>
                              <td className="p-4 text-xs text-slate-500">
                                {state.clients.find(c => c.id === loan.clientId)?.businessSector || loan.clientName}
                              </td>
                              <td className="p-4 text-xs">
                                <div>{loan.disbursementDate}</div>
                                <div className="text-[10px] text-slate-400">Nominal: {loan.originalAmount.toLocaleString()} TND</div>
                              </td>
                              <td className="p-4 font-mono text-right font-bold text-navy">
                                {loan.totalOutstanding.toLocaleString()} TND
                              </td>
                              <td className="p-4 text-center">
                                {loan.status === 'active' && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">Standard</span>
                                )}
                                {hasArrears && (
                                  <span className="text-[10px] bg-crimson/5 text-crimson px-2 py-1 rounded-full font-bold">Defaut</span>
                                )}
                                {isWatchlist && (
                                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold">Watchlist</span>
                                )}
                                {loan.status === 'litigation' && (
                                  <span className="text-[10px] bg-navy text-white px-2 py-1 rounded-full font-bold">Judiciaire</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Aging Portfolio analysis (BCT requirements) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-6">
                  <div>
                    <h3 className="font-syne font-bold text-navy">Aging Analysis MFI</h3>
                    <p className="text-slate-400 text-xs">Ancienneté des retards selon règlements de la BCT.</p>
                  </div>

                  <div className="space-y-4">
                    {/* PAR aging categories */}
                    {[
                      { label: 'Courant (Sain)', daysUrl: 'Days 0', amount: state.installments.filter(i => i.status === 'upcoming' || i.status === 'paid').reduce((acc, curr) => acc + curr.principalDue, 0), color: 'bg-emerald-500' },
                      { label: 'Intermédiaire (PAR 1-7)', daysUrl: 'Days 1-7', amount: state.cases.filter(c => c.daysPastDue >= 1 && c.daysPastDue <= 7).reduce((acc, curr) => acc + curr.overdueAmount, 0), color: 'bg-amber-400' },
                      { label: 'Sous Surveillance (PAR 8-30)', daysUrl: 'Days 8-30', amount: state.cases.filter(c => c.daysPastDue >= 8 && c.daysPastDue <= 30).reduce((acc, curr) => acc + curr.overdueAmount, 0), color: 'bg-orange-500' },
                      { label: 'Inquiétant (PAR 31-90)', daysUrl: 'Days 31-90', amount: state.cases.filter(c => c.daysPastDue >= 31 && c.daysPastDue <= 90).reduce((acc, curr) => acc + curr.overdueAmount, 0), color: 'bg-crimson' },
                      { label: 'Douteux / Contentieux (PAR 90+)', daysUrl: 'Days 90+', amount: state.cases.filter(c => c.daysPastDue > 90).reduce((acc, curr) => acc + curr.overdueAmount, 0), color: 'bg-slate-900' }
                    ].map((cat, idx) => {
                      const totalRecoverable = state.cases.reduce((sum, c) => sum + c.overdueAmount, 0) + 10000;
                      const percent = (cat.amount / totalRecoverable) * 100;
                      
                      return (
                        <div key={idx} className="space-y-1.5 p-3.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                              <span className="font-bold text-navy">{cat.label}</span>
                            </div>
                            <span className="font-mono text-slate-400 text-[10px]">{cat.daysUrl}</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-xs text-slate-500 font-mono">Impayés:</span>
                            <span className="text-sm font-black text-navy">{cat.amount.toLocaleString()} TND</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                            <div className={`${cat.color} h-full`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100/50 flex gap-2">
                    <ShieldAlert className="text-orange-600 shrink-0 mt-0.5" size={16} />
                    <div className="text-[11px] text-orange-850">
                      <span className="font-bold block">Provisionnement prudentiel requis</span>
                      Tout actif glissé au delà de 90 jours (PAR 90) subit un provisionnement de 40% sur le capital restant dû, grèvant le coût de risque.
                    </div>
                  </div>
                </div>

              </div>

              {/* AUDIT TIMELINE */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <h3 className="font-syne font-bold text-navy flex items-center gap-2">
                      <BookOpen size={16} className="text-sky" />
                      Journal Trail d'Audit Opérationnel MFI
                    </h3>
                    <p className="text-slate-400 text-xs">Traçabilité complète des recouvreurs, engagements d'huissiers et règlements.</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-mono font-bold">LIVE logs</span>
                </div>
                <div className="divide-y max-h-[350px] overflow-y-auto pr-2 mt-4 space-y-3 font-mono text-xs">
                  {state.auditLogs.map(log => (
                    <div key={log.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row gap-2 sm:items-start text-slate">
                      <span className="text-slate-450 font-bold bg-slate-50 py-0.5 px-2 rounded tracking-wide border w-[150px] shrink-0 text-center">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1">
                        <span className="font-black text-navy mr-1">[{log.action}]</span>
                        <span className="text-[11px] leading-relaxed">{log.details}</span>
                      </div>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-sky/5 text-sky border border-sky/10 self-start sm:self-auto shrink-0">
                        {log.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ACTIVE AMIABLE CASES */}
          {activeTab === 'collection' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cases List */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-syne font-bold text-navy">Fiches Actives de Recouvrement Amiable</h3>
                    <p className="text-slate-400 text-xs">Alerte précoce et relances par ordre de priorité de solde.</p>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-white bg-crimson px-2.5 py-1 rounded-full">
                    {filteredCases.length} dossiers actifs
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredCases.map(c => {
                    const lAccount = state.loans.find(la => la.id === c.loanAccountId);
                    const riskColor = c.priorityLevel === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                                      c.priorityLevel === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                      'bg-blue-50 text-blue-600 border-blue-100';
                    
                    return (
                      <div 
                        key={c.id} 
                        className={`p-5 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          selectedCase?.id === c.id ? 'bg-slate-50 border-l-4 border-sky pl-4' : ''
                        }`}
                        onClick={() => setSelectedCase(c)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy text-base">{c.clientName}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${riskColor}`}>
                              {c.priorityLevel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="font-mono">Réf: {c.loanNumber}</span>
                            <span>•</span>
                            <span>Agent affecté: <strong className="text-navy">{c.assignedAgentName}</strong></span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <span className="text-[10px] bg-slate-100 text-slate font-bold px-2 py-0.5 rounded-lg">
                              Seuil {c.daysPastDue} jours de retard
                            </span>
                            <span className="text-[10px] uppercase font-black bg-sky/10 text-sky px-2 py-0.5 rounded-lg font-mono">
                              {c.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 self-end md:self-auto text-right">
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400">Montant en Souffrance :</span>
                            <div className="text-lg font-black text-navy">{c.overdueAmount.toLocaleString()} TND</div>
                            {lAccount && (
                              <div className="text-[10px] text-slate font-mono">Solde restant: {lAccount.totalOutstanding.toLocaleString()} TND</div>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-sky/20 hover:text-sky flex items-center justify-center text-slate-400 transition-all">
                            <ArrowRight size={16} />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action / Collection Panel */}
              <div className="space-y-6">
                {selectedCase ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-6 relative">
                    <div className="border-b pb-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-syne font-bold text-navy text-lg">{selectedCase.clientName}</h3>
                        <button 
                          className="text-xs text-slate-400 underline cursor-pointer"
                          onClick={() => setSelectedCase(null)}
                        >
                          Fermer
                        </button>
                      </div>
                      <p className="text-slate-400 text-xs">Fiche de contact et d'encaissement de créance.</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Impayé</span>
                        <span className="text-base font-black text-crimson">{selectedCase.overdueAmount.toLocaleString()} TND</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Retard</span>
                        <span className="text-base font-black text-navy">{selectedCase.daysPastDue} jours</span>
                      </div>
                    </div>

                    {/* ACTIONS TABS FORM */}
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest flex items-center gap-1.5">
                        <Send size={12} />
                        Enregistrer un Point d'Étape
                      </h4>

                      {/* Channel Trigger Selector */}
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-bold text-center">
                        <button 
                          onClick={() => setNewActionType('phone_call')}
                          className={`py-2 rounded-md cursor-pointer transition-all ${newActionType === 'phone_call' ? 'bg-white shadow text-navy' : 'text-slate-600'}`}
                        >
                          Appel
                        </button>
                        <button 
                          onClick={() => setNewActionType('sms_sent')}
                          className={`py-2 rounded-md cursor-pointer transition-all ${newActionType === 'sms_sent' ? 'bg-white shadow text-navy' : 'text-slate-600'}`}
                        >
                          SMS
                        </button>
                        <button 
                          onClick={() => setNewActionType('whatsapp_sent')}
                          className={`py-2 rounded-md cursor-pointer transition-all ${newActionType === 'whatsapp_sent' ? 'bg-white shadow text-navy' : 'text-slate-600'}`}
                        >
                          WA
                        </button>
                        <button 
                          onClick={() => setNewActionType('field_visit')}
                          className={`py-2 rounded-md cursor-pointer transition-all ${newActionType === 'field_visit' ? 'bg-white shadow text-navy' : 'text-slate-600'}`}
                        >
                          Visite
                        </button>
                      </div>

                      {/* Result Select */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Résultat du contact</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2 text-xs focus:outline-none"
                          value={newActionResult}
                          onChange={(e: any) => setNewActionResult(e.target.value)}
                        >
                          <option value="client_reached">Client joint, accord amiable</option>
                          <option value="promise_to_pay">Enregistrement d'une promesse (PTP)</option>
                          <option value="refuses_to_pay">Refus catégorique de s'acquitter</option>
                        </select>
                      </div>

                      {/* Conditionally Display Promise Inputs */}
                      {newActionResult === 'promise_to_pay' && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-sky/5 rounded-xl border border-sky/15">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-sky block">Montant promis (TND)</label>
                            <input 
                              type="number" 
                              className="w-full bg-white border border-sky/30 rounded pl-2 py-1 text-xs font-bold text-navy"
                              value={newPromiseAmount}
                              onChange={(e) => setNewPromiseAmount(e.target.value)}
                              placeholder="ex: 350"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-sky block">Date limite Échéance</label>
                            <input 
                              type="date" 
                              className="w-full bg-white border border-sky/30 rounded px-1.5 py-1 text-xs font-mono text-navy"
                              value={newPromiseDate}
                              onChange={(e) => setNewPromiseDate(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Contact note explanation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Commentaire / Propos tenus</label>
                        <textarea 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2.5 text-xs focus:outline-none h-20"
                          placeholder="Entrez un résumé succinct de l'interaction..."
                          value={newActionComment}
                          onChange={(e) => setNewActionComment(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Date prochaine action suggérée (optionnel)</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2 text-xs focus:outline-none"
                          value={newActionNextDate}
                          onChange={(e) => setNewActionNextDate(e.target.value)}
                        />
                      </div>

                      <Button 
                        onClick={() => handleAddAction(selectedCase.id)}
                        className="w-full bg-navy hover:bg-sky text-white rounded-xl py-2.5 hover:shadow-md cursor-pointer font-bold text-xs"
                      >
                        Enregistrer l'action amiable
                      </Button>

                    </div>

                    {/* ENCAISSEMENT DIRECT SUR DOSSIER */}
                    <div className="border-t pt-5 space-y-4">
                      <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest flex items-center gap-1.5">
                        <Wallet size={12} className="text-emerald-500" />
                        Reprise financière et encaissement direct (Caisse)
                      </h4>

                      <div className="space-y-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-navy block">Montant encaissé (TND)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-3 select-none text-navy font-bold focus:outline-none" 
                              placeholder="ex: 645"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate">TND</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-navy block">Canal de transit</label>
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                            <button 
                              onClick={() => setPaymentMethod('mobile_money')}
                              className={`py-1.5 rounded cursor-pointer border ${paymentMethod === 'mobile_money' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate'}`}
                            >
                              Mobile Money
                            </button>
                            <button 
                              onClick={() => setPaymentMethod('cash')}
                              className={`py-1.5 rounded cursor-pointer border ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate'}`}
                            >
                              Espèces
                            </button>
                            <button 
                              onClick={() => setPaymentMethod('bank_transfer')}
                              className={`py-1.5 rounded cursor-pointer border ${paymentMethod === 'bank_transfer' ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate'}`}
                            >
                              Virement BCT
                            </button>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleSimulatePayment(selectedCase.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 cursor-pointer font-bold text-xs"
                        >
                          Émettre reçu de caisse & lettrer la traite
                        </Button>
                      </div>
                    </div>

                    {/* ESCALADE CONTENTIEUX DE BLOC */}
                    <div className="border-t pt-5">
                      <Button 
                        variant="destructive"
                        className="w-full font-bold text-xs py-2 h-auto text-crimson hover:bg-crimson hover:text-white"
                        onClick={() => handleEscalateToLitigation(selectedCase.id)}
                      >
                        <ShieldAlert size={14} className="mr-1.5" />
                        Dossier récalcitrant : Escalader au contentieux
                      </Button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200/60 p-8 text-center text-slate">
                    <Smartphone size={32} className="mx-auto text-slate-400 mb-2.5" />
                    <p className="font-bold text-navy">Sélectionnez une fiche active</p>
                    <p className="text-xs text-slate-400 mt-1">Cliquez sur un dossier à gauche pour saisir des relances immédiates ou lettrer un versement.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: VISITS & PROMISES */}
          {activeTab === 'field' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Field Visits Schedule */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
                <div>
                  <h3 className="font-syne font-bold text-navy flex items-center gap-1.5">
                    <MapPin className="text-sky" size={18} />
                    Planification des Visites Terrain agents
                  </h3>
                  <p className="text-slate-400 text-xs">Suivi logistique et géo-localisation des agents terrain de l'institution.</p>
                </div>

                <div className="space-y-3.5">
                  {state.visits.map(v => (
                    <div key={v.id} className="p-4 bg-slate-50 rounded-xl border flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-navy">{v.clientName}</strong>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded border ${v.visitStatus === 'completed' ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-amber-300 bg-amber-50 text-amber-600'}`}>
                            {v.visitStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-450">
                          Agent assigné: <strong className="text-navy">{v.assignedAgentName}</strong> • Prévu le: <strong className="font-mono text-xs">{v.plannedDate}</strong>
                        </div>
                        {v.result && (
                          <div className="mt-2 text-xs text-slate-500 bg-white p-2 rounded border border-slate-100 leading-normal italic font-mono">
                            Rapport: {v.result}
                          </div>
                        )}
                      </div>

                      {v.visitStatus === 'planned' && (
                        <div className="flex flex-row sm:flex-col gap-1.5 shrink-0 self-end sm:self-center">
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg h-auto cursor-pointer"
                            onClick={() => {
                              const desc = prompt("Entrez le rapport d'entretien de visite chez " + v.clientName);
                              if (desc) handleCompleteVisit(v.id, desc, 'completed');
                            }}
                          >
                            Visite effectuée
                          </Button>
                          <Button 
                            className="bg-slate-200 text-slate-600 hover:bg-red-200 font-bold text-[10px] px-3.5 py-1.5 rounded-lg h-auto cursor-pointer"
                            onClick={() => {
                              const desc = prompt("Précisez pourquoi la visite n'a pas pu aboutir (absence, déménagement...)");
                              if (desc) handleCompleteVisit(v.id, desc, 'missed');
                            }}
                          >
                            Échec
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <div className="text-[11px] font-mono p-3 bg-slate-50 border rounded-lg text-slate flex justify-between">
                    <span>Synchronisation GPS de tournée :</span>
                    <strong className="text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Système de bord opérationnel
                    </strong>
                  </div>
                </div>
              </div>

              {/* Promises to pay (PTP) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
                <div>
                  <h3 className="font-syne font-bold text-navy flex items-center gap-1.5">
                    <Calendar className="text-sky" size={18} />
                    Promesses de Paiement (PTP) Enregistrées
                  </h3>
                  <p className="text-slate-400 text-xs">Dates d'engagement contractuel recueillies pour relance.</p>
                </div>

                <div className="space-y-3">
                  {state.promises.map(p => {
                    const isPending = p.status === 'pending';
                    const isFulfilled = p.status === 'fulfilled';
                    
                    return (
                      <div key={p.id} className="p-4 bg-slate-50 rounded-xl border flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy">{p.clientName}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.2 rounded border ${
                              isFulfilled ? 'bg-emerald-50 text-emerald-600 border-emerald-300' :
                              p.status === 'broken' ? 'bg-crimson/5 text-crimson border-crimson/25' :
                              'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Date d'échéance promise: <strong className="text-navy">{p.promisedDate}</strong>
                          </div>
                          <div className="text-xs text-navy font-black">
                            Montant engagé: {p.promisedAmount.toLocaleString()} TND
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleTogglePromiseStatus(p.id, 'fulfilled')}
                              className="p-1 px-2.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all text-[10px] font-bold cursor-pointer"
                            >
                              Mettre Tenue
                            </button>
                            <button
                              onClick={() => handleTogglePromiseStatus(p.id, 'broken')}
                              className="p-1 px-2.5 rounded bg-crimson/5 text-crimson hover:bg-crimson hover:text-white border border-crimson/15 transition-all text-[10px] font-bold cursor-pointer"
                            >
                              Mettre Rompue
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: LITIGATION / COURT FILES */}
          {activeTab === 'litigation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Judicial Cases list */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-syne font-bold text-navy flex items-center gap-1.5">
                      <Gavel className="text-sky shrink-0 animate-bounce" size={18} />
                      Registre des Affaires Judiciaires
                    </h3>
                    <p className="text-slate-400 text-xs">Commandement de payer, ordonnances d'injonction et huissiers de justice.</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-navy text-white px-2.5 py-1 rounded">
                    {state.legalCases.length} dossiers au tribunal
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {state.legalCases.map(lc => (
                    <div 
                      key={lc.id}
                      className={`p-5 hover:bg-slate-50/50 cursor-pointer transition-all flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center ${
                        selectedLegalCase?.id === lc.id ? 'bg-slate-50 border-l-4 border-navy pl-4' : ''
                      }`}
                      onClick={() => setSelectedLegalCase(lc)}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-base text-navy font-syne">{lc.clientName}</strong>
                          <span className="text-[9px] font-mono bg-sky/10 text-sky px-2 rounded-lg font-bold">
                            {lc.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate text-mono">
                          Dossier greffe: <strong className="font-normal font-mono">{lc.legalCaseNumber}</strong> • Avocat: <strong className="text-slate-500 font-bold">{lc.externalLawyerName}</strong>
                        </div>
                        <div className="pt-1">
                          <span className="text-[10px] bg-slate-100 text-slate font-bold px-2 py-0.5 rounded">
                            Ouvert le {lc.openedAt}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate">Dette totale réclamée</span>
                        <div className="text-base font-black text-navy">{lc.totalClaimAmount.toLocaleString()} TND</div>
                        <div className="text-[10px] text-slate font-mono">Frais: {lc.legalFees.toLocaleString()} TND</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Judicial back-office workflow */}
              <div className="space-y-6">
                {selectedLegalCase ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-6">
                    <div className="border-b pb-4 flex justify-between items-start">
                      <div>
                        <h3 className="font-syne font-bold text-navy text-lg">{selectedLegalCase.clientName}</h3>
                        <span className="text-xs font-mono text-slate-400">{selectedLegalCase.legalCaseNumber}</span>
                      </div>
                      <button 
                        className="text-xs text-slate-400 underline cursor-pointer"
                        onClick={() => setSelectedLegalCase(null)}
                      >
                        Fermer
                      </button>
                    </div>

                    {/* Step register legal actions */}
                    <div className="space-y-4">
                      <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest flex items-center gap-1">
                        <FileDigit size={12} />
                        Enregistrer une étape de procédure
                      </h4>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Type de diligence juridique</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2 text-xs focus:outline-none"
                          value={newLegalActionType}
                          onChange={(e: any) => setNewLegalActionType(e.target.value)}
                        >
                          <option value="formal_notice">Mise en demeure huissier</option>
                          <option value="court_filing">Requête d'injonction déposée (Greffe)</option>
                          <option value="hearing">Audience fixée au tribunal</option>
                          <option value="judgment">Ordonnance d'exequatur obtenue</option>
                          <option value="seizure">Procédure de saisie de sûretés enclenchée</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Résultat du calendrier d'audience / Ordonnance</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2 text-xs focus:outline-none"
                          placeholder="ex: Renvoyé au 15 Juin pour examen"
                          value={newLegalActionResult}
                          onChange={(e) => setNewLegalActionResult(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-navy">Notes d'honoraires ou détails</label>
                        <textarea 
                          className="w-full bg-slate-50 border border-slate-200 text-slate rounded-lg p-2 h-14 text-xs focus:outline-none"
                          placeholder="Détails techniques du dossier, frais engagés..."
                          value={newLegalActionNotes}
                          onChange={(e) => setNewLegalActionNotes(e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={() => handleAddLegalAction(selectedLegalCase.id)}
                        className="w-full bg-navy hover:bg-sky text-white py-2 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Enregistrer l'étape au Plumitif
                      </Button>
                    </div>

                    {/* Sûretés (Collaterals) and Cautions (Guarantors) */}
                    <div className="border-t pt-5 space-y-4">
                      <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest">
                        Garanties Saisissables & Cautions MFI
                      </h4>
                      
                      <div className="space-y-3 text-xs">
                        {state.collaterals.map(c => (
                          <div key={c.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                            <div>
                              <div className="font-bold text-navy">Sûreté Matérielle Type : {c.collateralType}</div>
                              <span className="text-[10px] text-slate-500">{c.description}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-navy">{c.estimatedValue.toLocaleString()} TND</span>
                              <div className="text-[8px] uppercase font-black tracking-wider text-amber-600 mt-0.5">{c.status}</div>
                            </div>
                          </div>
                        ))}

                        {state.guarantors.map(g => (
                          <div key={g.id} className="p-3 bg-blue-50/40 rounded-xl border flex justify-between items-center">
                            <div>
                              <div className="font-bold text-navy">Caution solidaire : {g.name}</div>
                              <span className="text-[10px] text-slate-500">{g.relationship} • {g.phone}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-navy">{g.guaranteeAmount.toLocaleString()} TND</span>
                              <div className="text-[8px] uppercase font-black text-sky mt-0.5">{g.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Legal document Library */}
                    <div className="border-t pt-5 space-y-3">
                      <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest flex items-center gap-1.5">
                        <FileText size={12} />
                        Pièces jointes au dossier greffe ({state.legalDocuments.filter(d => d.legalCaseId === selectedLegalCase.id).length})
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        {state.legalDocuments
                          .filter(doc => doc.legalCaseId === selectedLegalCase.id)
                          .map(doc => (
                            <div key={doc.id} className="p-2 border rounded-lg hover:bg-slate-50 flex items-center justify-between text-slate font-mono">
                              <span className="truncate max-w-[200px] text-[11px] font-bold">{doc.documentName}</span>
                              <span className="text-[10px] text-slate-400">{doc.sizeKb} Kb</span>
                            </div>
                          ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200/60 p-8 text-center text-slate">
                    <Gavel size={32} className="mx-auto text-slate-400 mb-2.5" />
                    <p className="font-bold text-navy">Fichier Juridique Tribunal</p>
                    <p className="text-xs text-slate-400 mt-1">Cliquez sur un dossier contentieux à gauche pour piloter le plumitif juridique, verifier des sûretés saisies ou ajouter des actes.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl mx-auto space-y-8">
              <div>
                <h3 className="font-syne font-bold text-navy text-xl">Paramétrage Réglementaire Tunisie MFI</h3>
                <p className="text-slate-400 text-xs">Seuils fiscaux et directeurs conformes aux exigences de l'ACM (Autorité de Contrôle de la Microfinance) et de la BCT.</p>
              </div>

              <div className="space-y-5">
                
                {/* Grace days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-b pb-4">
                  <div>
                    <label className="font-bold text-navy block text-sm">Délai de grâce technique (jours)</label>
                    <span className="text-xs text-slate-400">Période d'attente avant classement automatique du prêt en "Arrears".</span>
                  </div>
                  <input 
                    type="number" 
                    className="bg-slate-50 border border-slate-200 text-navy font-bold rounded-xl p-2.5 w-full sm:max-w-[150px] focus:outline-none"
                    value={state.settings.gracePeriodDays}
                    onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, gracePeriodDays: parseInt(e.target.value) || 0 } }))}
                  />
                </div>

                {/* Litigation Threshold */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-b pb-4">
                  <div>
                    <label className="font-bold text-navy block text-sm">Seuil de transfert au contentieux (jours)</label>
                    <span className="text-xs text-slate-400">Seuil de retard critique au-delà duquel la créance est transférée au service juridique.</span>
                  </div>
                  <input 
                    type="number" 
                    className="bg-slate-50 border border-slate-200 text-navy font-bold rounded-xl p-2.5 w-full sm:max-w-[150px] focus:outline-none"
                    value={state.settings.litigationThresholdDays}
                    onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, litigationThresholdDays: parseInt(e.target.value) || 0 } }))}
                  />
                </div>

                {/* Broken promises limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-b pb-4">
                  <div>
                    <label className="font-bold text-navy block text-sm">Nombre maximal de promesses rompues avant sanction</label>
                    <span className="text-xs text-slate-400">Le système bloque l'amiable et escalade directement en cas de non-respect récurrent.</span>
                  </div>
                  <input 
                    type="number" 
                    className="bg-slate-50 border border-slate-200 text-navy font-bold rounded-xl p-2.5 w-full sm:max-w-[150px] focus:outline-none"
                    value={state.settings.maxBrokenPromises}
                    onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, maxBrokenPromises: parseInt(e.target.value) || 0 } }))}
                  />
                </div>

                {/* Toggle channels */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs uppercase text-slate-400 font-extrabold tracking-widest">Canaux de relance autorisés</h4>
                  
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-navy block">Relance par SMS automatique</span>
                      <p className="text-xs text-slate-400">Diffusion d'un SMS de rappel nominatif à J-2 de chaque échéance.</p>
                    </div>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, smsEnabled: !prev.settings.smsEnabled } }))}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${state.settings.smsEnabled ? 'bg-sky' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${state.settings.smsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-navy block">Connecteur WhatsApp Business</span>
                      <p className="text-xs text-slate-400">Permet aux agents d'envoyer la mise en demeure dématérialisée via WA.</p>
                    </div>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, whatsappEnabled: !prev.settings.whatsappEnabled } }))}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${state.settings.whatsappEnabled ? 'bg-sky' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${state.settings.whatsappEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border flex gap-2 text-xs">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold block">Consolidated Compliance Checked</span>
                  Tous les seuils ci-dessus sont auditables par l'ACM à tout moment. Les logs d'actions respectent la réglementation de protection des données financières (Instance Nationale de Protection des Données Personnelles - INPDP).
                </div>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
