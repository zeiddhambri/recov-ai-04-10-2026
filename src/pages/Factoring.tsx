import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, Sparkles, LayoutDashboard, FileText, Landmark,
  Scale, BookOpen, AlertCircle, ShieldCheck, Info
} from 'lucide-react';
import { getFactoringState, saveFactoringState, checkInvoiceEligibility } from '../lib/factoring-mock';
import { Debtor, Invoice, FactoringRequest, Dispute, AccountingEntry, AuditLog } from '../types/factoring';
import FactoringDashboard from '../components/factoring/FactoringDashboard';
import InvoiceImportAndList from '../components/factoring/InvoiceImportAndList';
import FactoringRequests from '../components/factoring/FactoringRequests';
import FactorBackoffice from '../components/factoring/FactorBackoffice';
import FactoringAccounting from '../components/factoring/FactoringAccounting';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Factoring() {
  // Main reactive database initialized from LocalStorage
  const [state, setState] = useState(() => getFactoringState());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'finances' | 'backoffice' | 'ledger'>('dashboard');

  // Sync state changes back to LocalStorage
  useEffect(() => {
    saveFactoringState(state);
  }, [state]);

  // ACTION 1: Add a single invoice manually
  const handleAddInvoice = (newInvData: Omit<Invoice, 'id' | 'remainingAmount' | 'status' | 'eligibilityStatus' | 'eligibilityReasons' | 'created_at'>) => {
    const matchingDebtor = state.debtors.find(d => d.id === newInvData.debtorId);
    
    // Default fallback check
    let eligibilityStatus: Invoice['eligibilityStatus'] = 'ineligible';
    let reasons: string[] = ['Aucun débiteur correspondant trouvé'];
    
    if (matchingDebtor) {
      const eligibility = checkInvoiceEligibility(newInvData, matchingDebtor);
      eligibilityStatus = eligibility.status;
      reasons = eligibility.reasons;
    }

    const completeInv: Invoice = {
      ...newInvData,
      id: 'inv-' + Math.floor(Math.random() * 10000),
      remainingAmount: newInvData.amount,
      status: eligibilityStatus,
      eligibilityStatus,
      eligibilityReasons: reasons,
      created_at: new Date().toISOString()
    };

    // Update state
    setState(prev => {
      const nextInvoices = [completeInv, ...prev.invoices];
      // update debtor usedLimit if eligible and approved
      const nextDebtors = prev.debtors.map(d => {
        if (d.id === newInvData.debtorId && eligibilityStatus === 'eligible') {
          return { ...d, usedLimit: d.usedLimit + newInvData.amount };
        }
        return d;
      });

      const nextAuditLogs: AuditLog[] = [
        {
          id: 'log-' + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          user: 'zeid.dhambri@gmail.com',
          action: 'Création facture',
          details: `Facture ${newInvData.invoiceNumber} saisie manuellement pour un montant de ${newInvData.amount.toLocaleString()} TND.`,
          category: 'invoice'
        },
        ...prev.auditLogs
      ];

      return {
        ...prev,
        invoices: nextInvoices,
        debtors: nextDebtors,
        auditLogs: nextAuditLogs
      };
    });
  };

  // ACTION 2: Batch import simulation files
  const handleImportBulk = (bulkInvoices: Invoice[]) => {
    setState(prev => {
      // Avoid duplication
      const currentNumbers = prev.invoices.map(i => i.invoiceNumber);
      const filteredBulk = bulkInvoices.filter(i => !currentNumbers.includes(i.invoiceNumber));

      if (filteredBulk.length === 0) return prev;

      const nextInvoices = [...filteredBulk, ...prev.invoices];
      
      const newLogs = filteredBulk.map(i => ({
        id: 'log-' + Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString(),
        user: 'zeid.dhambri@gmail.com',
        action: 'Importation de facture',
        details: `Facture ERP ${i.invoiceNumber} chargée avec succès (Créance de ${i.amount.toLocaleString()} TND).`,
        category: 'invoice'
      }));

      return {
        ...prev,
        invoices: nextInvoices,
        auditLogs: [...newLogs, ...prev.auditLogs]
      };
    });
  };

  // ACTION 3: Create factoring finance packages
  const handleSubmitRequest = (newReq: FactoringRequest) => {
    setState(prev => {
      // Update packaged invoice statuses to 'submitted'
      const invoiceIds = newReq.invoices.map(i => i.id);
      const nextInvoices = prev.invoices.map(inv => {
        if (invoiceIds.includes(inv.id)) {
          return { ...inv, status: 'submitted' as const };
        }
        return inv;
      });

      const nextRequests = [newReq, ...prev.requests];

      const nextAuditLogs: AuditLog[] = [
        {
          id: 'log-' + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          user: 'zeid.dhambri@gmail.com',
          action: 'Création demande de Cession',
          details: `Nouvelle demande ${newReq.requestNumber} signée électroniquement, en attente de déblocage Factor.`,
          category: 'request'
        },
        ...prev.auditLogs
      ];

      return {
        ...prev,
        invoices: nextInvoices,
        requests: nextRequests,
        auditLogs: nextAuditLogs
      };
    });

    setActiveTab('backoffice'); // Auto-navigate to committee back-office to review simulation
  };

  // ACTION 4: Payout and fund approved factoring request
  const handleApproveRequest = (id: string) => {
    const req = state.requests.find(r => r.id === id);
    if (!req) return;

    setState(prev => {
      // 1. Confirm Request status -> 'funded'
      const nextRequests = prev.requests.map(r => {
        if (r.id === id) {
          return { ...r, status: 'funded' as const, fundedAt: new Date().toISOString() };
        }
        return r;
      });

      // 2. Set related invoices to 'financed'
      const invoiceIds = req.invoices.map(i => i.id);
      const nextInvoices = prev.invoices.map(inv => {
        if (invoiceIds.includes(inv.id)) {
          return { ...inv, status: 'financed' as const };
        }
        return inv;
      });

      // 3. Create real bookkeeping entries for this disbursement
      const newAccEntry: AccountingEntry = {
        id: 'acc-' + Math.floor(Math.random() * 10000),
        requestId: id,
        entryDate: new Date().toISOString().split('T')[0],
        description: `Financement & Déblocage liquidités dossier ${req.requestNumber}`,
        transactions: [
          { accountNumber: '512100', accountLabel: 'Banque - Compte Courant TND', debit: req.netDisbursedAmount, credit: 0 },
          { accountNumber: '627800', accountLabel: "Frais & Commissions d'Affacturage", debit: req.estimatedFees, credit: 0 },
          { accountNumber: '275100', accountLabel: 'Retenue d\'avance - Fonds de Garantie', debit: req.reserveAmount, credit: 0 },
          { accountNumber: '411200', accountLabel: 'Créances transférées Cession de créance', debit: 0, credit: req.totalInvoiceAmount }
        ]
      };

      const nextAuditLogs: AuditLog[] = [
        {
          id: 'log-' + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          user: 'Admin FACTOR Risque',
          action: 'Financement Débloqué',
          details: `Dons de fonds accordés pour le dossier ${req.requestNumber}. Virement net de ${req.netDisbursedAmount.toLocaleString()} TND initié.`,
          category: 'payment'
        },
        ...prev.auditLogs
      ];

      return {
        ...prev,
        requests: nextRequests,
        invoices: nextInvoices,
        accounting: [newAccEntry, ...prev.accounting],
        auditLogs: nextAuditLogs
      };
    });

    toast({
      title: 'Dossier approuvé & débloqué !',
      description: `Le virement de ${req.netDisbursedAmount.toLocaleString()} TND a été envoyé sur votre compte bancaire. Écritures comptables générées.`
    });
  };

  const handleRejectRequest = (id: string) => {
    const req = state.requests.find(r => r.id === id);
    if (!req) return;

    setState(prev => {
      const nextRequests = prev.requests.map(r => {
        if (r.id === id) {
          return { ...r, status: 'rejected' as const, rejectedAt: new Date().toISOString() };
        }
        return r;
      });

      // Reset invoices back to eligible
      const invoiceIds = req.invoices.map(i => i.id);
      const nextInvoices = prev.invoices.map(inv => {
        if (invoiceIds.includes(inv.id)) {
          return { ...inv, status: 'eligible' as const };
        }
        return inv;
      });

      return {
        ...prev,
        requests: nextRequests,
        invoices: nextInvoices
      };
    });

    toast({ title: 'Dossier refusé', description: `La demande de financement ${req.requestNumber} a été classée sans suite.` });
  };

  // ACTION 5: Simulate payment / incident states
  const handleSimulatePayment = (id: string, paymentType: 'full' | 'partial' | 'disputed' | 'overdue', customAmount?: number) => {
    const req = state.requests.find(r => r.id === id);
    if (!req) return;

    if (paymentType === 'full') {
      setState(prev => {
        // Finalized fully. Invoices are paid
        const invoiceIds = req.invoices.map(i => i.id);
        const nextInvoices = prev.invoices.map(inv => {
          if (invoiceIds.includes(inv.id)) {
            return { ...inv, status: 'paid' as const, remainingAmount: 0 };
          }
          return inv;
        });

        const nextRequests = prev.requests.map(r => {
          if (r.id === id) {
            return { ...r, status: 'closed' as const };
          }
          return r;
        });

        // Release the holds (reversement du solde de garantie)
        const accountingEntry: AccountingEntry = {
          id: 'acc-' + Math.floor(Math.random() * 10000),
          requestId: id,
          entryDate: new Date().toISOString().split('T')[0],
          description: `Règlement final Débiteur & Restitution dépôt Garantie dossier ${req.requestNumber}`,
          transactions: [
            { accountNumber: '512100', accountLabel: 'Banque - Compte Courant TND', debit: req.reserveAmount, credit: 0 },
            { accountNumber: '275100', accountLabel: 'Retenue d\'avance - Fonds de Garantie libéré', debit: 0, credit: req.reserveAmount }
          ]
        };

        const nextAuditLogs: AuditLog[] = [
          {
            id: 'log-' + Math.floor(Math.random() * 10000),
            timestamp: new Date().toISOString(),
            user: 'Système RecovAI',
            action: 'Rassemblement & Solde',
            details: `Le débiteur final a payé ${req.totalInvoiceAmount.toLocaleString()} TND. Fonds de Garantie libéré et restitué.`,
            category: 'payment'
          },
          ...prev.auditLogs
        ];

        return {
          ...prev,
          invoices: nextInvoices,
          requests: nextRequests,
          accounting: [accountingEntry, ...prev.accounting],
          auditLogs: nextAuditLogs
        };
      });

      toast({
        title: 'Impressionnant - Dossier clos !',
        description: `Le débiteur du dossier ${req.requestNumber} vient de régler. Votre garantie de ${req.reserveAmount.toLocaleString()} TND a été libérée et versée sur votre compte.`
      });
    } else if (paymentType === 'overdue') {
      setState(prev => {
        const invoiceIds = req.invoices.map(i => i.id);
        const nextInvoices = prev.invoices.map(inv => {
          if (invoiceIds.includes(inv.id)) {
            return {
              ...inv,
              status: 'overdue' as const,
              eligibilityReasons: ['Délai d\'échéance contractuelle dépassé', ...inv.eligibilityReasons]
            };
          }
          return inv;
        });

        const nextAuditLogs: AuditLog[] = [
          {
            id: 'log-' + Math.floor(Math.random() * 10000),
            timestamp: new Date().toISOString(),
            user: 'Moteur d\'alertes RecovAI',
            action: 'Accroissement de risque - Retard',
            details: `Factures liées au dossier ${req.requestNumber} déclarées en souffrance de règlement.`,
            category: 'invoice'
          },
          ...prev.auditLogs
        ];

        return {
          ...prev,
          invoices: nextInvoices,
          auditLogs: nextAuditLogs
        };
      });

      toast({
        title: 'Maturité dépassée !',
        description: `Les factures du dossier ${req.requestNumber} sont marquées en souffrance d'échéance. Escalade automatique de relance enclenchée.`,
        variant: 'destructive'
      });
    }
  };

  // ACTION 6: Register Dispute Incident
  const handleRegisterDispute = (disputeData: Omit<Dispute, 'id' | 'openedAt'>) => {
    const newDispute: Dispute = {
      ...disputeData,
      id: 'disp-' + Math.floor(Math.random() * 10000),
      openedAt: new Date().toISOString()
    };

    setState(prev => {
      // Freeze/Contest the invoice status
      const nextInvoices = prev.invoices.map(inv => {
        if (inv.id === disputeData.invoiceId) {
          return { ...inv, status: 'disputed' as const };
        }
        return inv;
      });

      const nextAuditLogs: AuditLog[] = [
        {
          id: 'log-' + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          user: 'zeid.dhambri@gmail.com',
          action: 'Déclaration Litige Client',
          details: `Créance ${disputeData.invoiceNumber} contestée pour motif : ${disputeData.reason}.`,
          category: 'dispute'
        },
        ...prev.auditLogs
      ];

      return {
        ...prev,
        invoices: nextInvoices,
        disputes: [newDispute, ...prev.disputes],
        auditLogs: nextAuditLogs
      };
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Title Header with logo info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-navy tracking-tight font-syne">Affacturage & Factoring</h1>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky bg-sky/10 px-2 py-0.5 rounded-full border border-sky/20 flex items-center gap-1">
              <Sparkles size={11} className="shrink-0" />
              FINTECH ACCESSIBLE
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Cédez vos factures certifiées, débloquez des liquidités instantanées sous 24h et gérez vos garanties.</p>
        </div>
      </div>

      {/* Modern navigation Tabs bar */}
      <div className="flex border-b border-border text-sm overflow-x-auto select-none bg-slate-50/50 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'dashboard' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <LayoutDashboard size={18} />
          Tableau de bord
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'invoices' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <FileText size={18} />
          Créances & Diagnostics
        </button>

        <button
          onClick={() => setActiveTab('finances')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'finances' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Landmark size={18} />
          Demander Financement
        </button>

        <button
          onClick={() => setActiveTab('backoffice')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'backoffice' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <Scale size={18} />
          Back-office Factor (Démo)
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-nowrap truncate ${
            activeTab === 'ledger' ? 'bg-white shadow-sm text-sky' : 'text-slate-600 hover:text-navy hover:bg-slate-100/50'
          }`}
        >
          <BookOpen size={18} />
          Grand Livre ERP
        </button>
      </div>

      {/* Interactive views switcher */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'dashboard' && (
            <FactoringDashboard
              debtors={state.debtors}
              invoices={state.invoices}
              requests={state.requests}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceImportAndList
              invoices={state.invoices}
              debtors={state.debtors}
              onAddInvoice={handleAddInvoice}
              onImportBulk={handleImportBulk}
            />
          )}

          {activeTab === 'finances' && (
            <FactoringRequests
              invoices={state.invoices}
              debtors={state.debtors}
              requests={state.requests}
              onSubmitRequest={handleSubmitRequest}
            />
          )}

          {activeTab === 'backoffice' && (
            <FactorBackoffice
              requests={state.requests}
              invoices={state.invoices}
              debtors={state.debtors}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onSimulatePayment={handleSimulatePayment}
              onRegisterDispute={handleRegisterDispute}
            />
          )}

          {activeTab === 'ledger' && (
            <FactoringAccounting
              entries={state.accounting}
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
