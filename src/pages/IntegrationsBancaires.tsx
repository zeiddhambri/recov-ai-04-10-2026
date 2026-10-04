import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cable, Landmark, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Download, FileText, Send, Terminal, Play, Lock, Globe,
  Server, Cpu, Database, KeyRound, ExternalLink, Check, Copy, ArrowUpRight,
  Layers, Clock, Zap, FileCode, CheckSquare, Sparkles, Building, AlertOctagon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function IntegrationsBancaires() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'cbs' | 'bct' | 'settlement' | 'gateway'>('cbs');

  // Core Banking States
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncingConnector, setSyncingConnector] = useState<string | null>(null);

  // BCT States
  const [cdrData, setCdrData] = useState<any>(null);
  const [cciData, setCciData] = useState<any>(null);
  const [loadingBct, setLoadingBct] = useState(false);

  // Settlement States (SIT, SWIFT, SEPA)
  const [sitBatches, setSitBatches] = useState<any>(null);
  const [mt940Result, setMt940Result] = useState<any>(null);
  const [loadingSit, setLoadingSit] = useState(false);
  const [generatingSitBatch, setGeneratingSitBatch] = useState(false);

  // API Gateway Console States
  const [gatewaySpec, setGatewaySpec] = useState<any>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/core-banking/dossiers/sync');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('POST');
  const [authHeader, setAuthHeader] = useState<string>('mTLS X.509 Certificate + Bearer recovai_sec_token_9821');
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify(
      {
        syncMode: 'DELTA_UNPAID',
        institutionCode: '08',
        sourceCBS: 'AMPLITUDE_V12',
        cutoffDate: new Date().toISOString().slice(0, 10),
        batchLimit: 50
      },
      null,
      2
    )
  );
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [callingApi, setCallingApi] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchConnectors();
    fetchBctData();
    fetchSettlementData();
    fetchGatewaySpec();
  }, []);

  const fetchConnectors = async () => {
    setLoadingConnectors(true);
    try {
      const res = await fetch('/api/integrations/core-banking/connectors');
      const data = await res.json();
      setConnectors(data.connectors || []);
      if (data.connectors?.length > 0 && !selectedConnector) {
        setSelectedConnector(data.connectors[0]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingConnectors(false);
    }
  };

  const fetchBctData = async () => {
    setLoadingBct(true);
    try {
      const [resCdr, resCci] = await Promise.all([
        fetch('/api/integrations/bct/cdr/preview'),
        fetch('/api/integrations/bct/cci/preview')
      ]);
      const dataCdr = await resCdr.json();
      const dataCci = await resCci.json();
      setCdrData(dataCdr);
      setCciData(dataCci);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingBct(false);
    }
  };

  const fetchSettlementData = async () => {
    setLoadingSit(true);
    try {
      const resSit = await fetch('/api/integrations/payment-systems/sit/batches');
      const dataSit = await resSit.json();
      setSitBatches(dataSit);

      // Fetch sample MT940 parse
      const resSwift = await fetch('/api/integrations/payment-systems/swift/parse-mt940', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: true })
      });
      const dataSwift = await resSwift.json();
      setMt940Result(dataSwift);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingSit(false);
    }
  };

  const fetchGatewaySpec = async () => {
    try {
      const res = await fetch('/api/integrations/api-gateway/spec');
      const data = await res.json();
      setGatewaySpec(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Test Connector
  const handleTestConnection = async (connector: any) => {
    setTestingConnection(connector.id);
    try {
      const res = await fetch('/api/integrations/core-banking/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: connector.id,
          authType: connector.authMethod
        })
      });
      const data = await res.json();
      toast({
        title: "Handshake Réussi",
        description: `${connector.name} : Connectivité mTLS validée (${data.latencyMs}ms).`,
      });
    } catch (e: any) {
      toast({
        title: "Échec de connexion",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setTestingConnection(null);
    }
  };

  // Trigger Immediate Sync
  const handleTriggerSync = async (connector: any) => {
    setSyncingConnector(connector.id);
    try {
      const res = await fetch('/api/integrations/core-banking/trigger-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: connector.id,
          scope: 'incremental'
        })
      });
      const data = await res.json();
      toast({
        title: "Synchronisation Réussie",
        description: `${data.stats.recordsProcessed} dossiers traités, ${data.stats.paymentsReconciled} règlements lettrés.`,
      });
      fetchConnectors();
    } catch (e: any) {
      toast({
        title: "Erreur de synchronisation",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setSyncingConnector(null);
    }
  };

  // Generate SIT Batch
  const handleGenerateSitBatch = async () => {
    setGeneratingSitBatch(true);
    try {
      const res = await fetch('/api/integrations/payment-systems/sit/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchType: 'DIRECT_DEBIT' })
      });
      const data = await res.json();
      toast({
        title: "Lot SIT Télétransmis",
        description: `Lot ${data.batchId} émis pour ${data.itemsCount} prélèvements (${formatTND(data.totalAmountTND)}).`,
      });
      fetchSettlementData();
    } catch (e: any) {
      toast({
        title: "Erreur SIT",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingSitBatch(false);
    }
  };

  // Execute API Gateway call
  const handleExecuteApiCall = async () => {
    setCallingApi(true);
    setApiResponse(null);
    try {
      let parsedBody = {};
      if (httpMethod === 'POST' && requestPayload) {
        try {
          parsedBody = JSON.parse(requestPayload);
        } catch (err) {
          throw new Error("Payload JSON invalide.");
        }
      }

      const res = await fetch('/api/integrations/api-gateway/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: selectedEndpoint,
          method: httpMethod,
          headers: { Authorization: authHeader },
          body: parsedBody
        })
      });
      const data = await res.json();
      setApiResponse(data);
      toast({
        title: `Appel Passerelle : HTTP ${data.statusCode}`,
        description: `Exécuté en ${data.latencyMs}ms via la DMZ bancaire.`,
      });
    } catch (e: any) {
      toast({
        title: "Erreur Appel API",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setCallingApi(false);
    }
  };

  const formatTND = (val: number) => {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Passerelle Bancaire Active
            </span>
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
              mTLS TLS 1.3
            </span>
            <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Circulaire BCT 91-24 &amp; ISO 20022
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Connecteurs Standardisés &amp; Passerelle Core Banking
          </h1>
          <p className="text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
            Interconnexion temps réel et batch avec les systèmes bancaires centraux (Amplitude, Temenos T24, SAB), 
            télétransmission réglementaire Banque Centrale de Tunisie (BCT CDR &amp; CCI) et réseaux interbancaires (SIT, SWIFT MT940, SEPA).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <a
            href="/api/integrations/bct/cdr/export"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-sm transition-all"
          >
            <Download size={14} className="text-indigo-600" />
            Export Fichier BCT
          </a>
          <button
            onClick={() => setActiveTab('gateway')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all border border-indigo-400/30"
          >
            <Terminal size={14} />
            Console Développeur API
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-border w-fit">
        <button
          onClick={() => setActiveTab('cbs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'cbs'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server size={15} />
          <span>Core Banking Systems (CBS)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold">5 Actifs</span>
        </button>

        <button
          onClick={() => setActiveTab('bct')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bct'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark size={15} />
          <span>Flux Fichiers BCT (CDR &amp; CCI)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold">91-24 Conforme</span>
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settlement'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cable size={15} />
          <span>SIT, SWIFT &amp; SEPA</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 font-mono font-bold">ISO 20022</span>
        </button>

        <button
          onClick={() => setActiveTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'gateway'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Terminal size={15} />
          <span>API Gateway &amp; Console Test</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-50 text-purple-700 font-mono font-bold">OpenAPI 3.0</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : CORE BANKING SYSTEMS (CBS HUB) */}
      {/* ========================================================================= */}
      {activeTab === 'cbs' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Connecteurs Bancaires Actifs</span>
              <p className="text-xl font-black text-foreground font-mono mt-1">5 Connecteurs</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> 100% connectés en mTLS
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Comptes Débiteurs Réconciliés</span>
              <p className="text-xl font-black text-indigo-600 font-mono mt-1">35 950 dossiers</p>
              <p className="text-[11px] text-muted-foreground mt-1">Synchronisation bidirectionnelle</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Latence Moyenne Passerelle</span>
              <p className="text-xl font-black text-emerald-600 font-mono mt-1">44 ms</p>
              <p className="text-[11px] text-muted-foreground mt-1">Échanges chiffrés AES-256</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Taux de Rapprochement Auto</span>
              <p className="text-xl font-black text-blue-600 font-mono mt-1">99.88%</p>
              <p className="text-[11px] text-muted-foreground mt-1">Zéro décalage comptable</p>
            </div>
          </div>

          {/* Connectors List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                  Référentiel des Connecteurs Core Banking Supportés
                </h3>
                <button
                  onClick={fetchConnectors}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-semibold"
                >
                  <RefreshCw size={12} className={loadingConnectors ? 'animate-spin' : ''} /> Actualiser
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {connectors.map((c) => {
                  const isSelected = selectedConnector?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConnector(c)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                        isSelected
                          ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold">
                            <Landmark size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-foreground">{c.name}</h4>
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Éditeur : {c.vendor} • Protocole : {c.protocol}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestConnection(c);
                            }}
                            disabled={testingConnection === c.id}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-border flex items-center gap-1.5"
                          >
                            <Zap size={12} className={testingConnection === c.id ? 'animate-spin text-amber-500' : 'text-amber-500'} />
                            {testingConnection === c.id ? 'Test mTLS...' : 'Tester'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerSync(c);
                            }}
                            disabled={syncingConnector === c.id}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw size={12} className={syncingConnector === c.id ? 'animate-spin' : ''} />
                            {syncingConnector === c.id ? 'Synchro...' : 'Synchroniser'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Mode de synchro</span>
                          <p className="font-semibold text-foreground mt-0.5">{c.syncFrequency}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Sécurité &amp; Auth</span>
                          <p className="font-semibold text-foreground mt-0.5 truncate">{c.authMethod}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Comptes suivis</span>
                          <p className="font-bold font-mono text-indigo-600 mt-0.5">{c.metrics?.syncedAccounts.toLocaleString()} clients</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">Latence API</span>
                          <p className="font-bold font-mono text-emerald-600 mt-0.5">{c.latencyMs} ms</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-foreground">Établissements déployés :</span>
                        {c.supportedEntities.map((ent: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-700 dark:text-slate-300">
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Connector Detail / Configuration Card */}
            {selectedConnector && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-border shadow-sm h-fit space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">Paramètres de Liaison Core Banking</h3>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold">
                    {selectedConnector.id}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Nom du Système</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedConnector.name}
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Endpoint Passerelle Dédié (DMZ)</label>
                    <input
                      type="text"
                      readOnly
                      value={`https://cbs-gw.banque.internal/${selectedConnector.id}/v2/services`}
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Protocole</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedConnector.protocol}
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Chiffrement</label>
                      <input
                        type="text"
                        readOnly
                        value="mTLS X.509"
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-medium"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-border/80 space-y-2">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <KeyRound size={13} className="text-indigo-600" />
                      Certificat Client mTLS Enregistré
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground break-all">
                      SHA256: 7F:9A:88:E1:44:B2:90:3A:C1:89:D4:55:10:98:33:AA (Valide jusqu'au 31/12/2027)
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 font-semibold">
                      <Check size={12} /> Prise d'empreinte bilatérale conforme
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleTriggerSync(selectedConnector)}
                      disabled={syncingConnector === selectedConnector.id}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} className={syncingConnector === selectedConnector.id ? 'animate-spin' : ''} />
                      Exécuter Batch Rapprochement Immédiat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : FLUX FICHIERS BCT (BANQUE CENTRALE DE TUNISIE) */}
      {/* ========================================================================= */}
      {activeTab === 'bct' && (
        <div className="space-y-6">
          {/* Header BCT */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase">
                  Circulaire BCT n° 91-24 révisée
                </span>
                <span className="text-xs text-muted-foreground font-mono">Centrale des Risques &amp; Impayés</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mt-1">
                Déclaration Périodique des Engagements, Impayés et Provisions BCT
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Génération normalisée du fichier d'arrêté mensuel selon les formats EDI BCT. 
                Classification automatique des débiteurs de la Classe 0 (sains) à la Classe 4 (compromis) et calcul des dotations aux provisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/integrations/bct/cdr/export"
                download
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center gap-1.5"
              >
                <Download size={14} />
                Télécharger Fichier BCT (.txt)
              </a>
              <button
                onClick={fetchBctData}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                title="Rafraîchir les déclarations"
              >
                <RefreshCw size={15} className={loadingBct ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* BCT Metrics Row */}
          {cdrData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Créances Déclarées</span>
                <p className="text-base font-bold text-foreground font-mono mt-1">{cdrData.recordsCount} dossiers</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Encours Total BCT</span>
                <p className="text-base font-bold text-blue-600 font-mono mt-1">{formatTND(cdrData.totalOutstandingTND)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Impayés Déclarés BCT</span>
                <p className="text-base font-bold text-red-500 font-mono mt-1">{formatTND(cdrData.totalUnpaidTND)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Provisions Requises BCT</span>
                <p className="text-base font-bold text-amber-600 font-mono mt-1">{formatTND(cdrData.totalProvisionsTND)}</p>
              </div>
            </div>
          )}

          {/* BCT CDR Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Extrait Déclaratif Centrale des Risques (Fichier Plat Circulaire 91-24)
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">Banque Code 08 • Guichet 001</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase border-b border-border">
                  <tr>
                    <th className="p-3">Ligne</th>
                    <th className="p-3">Identifiant Débiteur</th>
                    <th className="p-3">Raison Sociale / Client</th>
                    <th className="p-3 text-right">Encours Tiré (TND)</th>
                    <th className="p-3 text-right">Impayé (TND)</th>
                    <th className="p-3 text-center">Retard (Jours)</th>
                    <th className="p-3">Classement BCT</th>
                    <th className="p-3 text-right">Taux Prov.</th>
                    <th className="p-3 text-right">Provision (TND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cdrData?.records?.map((r: any) => (
                    <tr key={r.lineNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground">{r.lineNo}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">{r.taxIdOrCIN}</td>
                      <td className="p-3 font-bold text-foreground">{r.customerName}</td>
                      <td className="p-3 text-right font-mono font-semibold">{formatTND(r.drawnOutstanding)}</td>
                      <td className="p-3 text-right font-mono font-bold text-red-500">{formatTND(r.unpaidAmount)}</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.delayDays > 90 ? 'bg-red-50 text-red-700' : r.delayDays > 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {r.delayDays} j
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          r.bctClassification.includes('Classe 4')
                            ? 'bg-red-100 text-red-800'
                            : r.bctClassification.includes('Classe 3')
                            ? 'bg-amber-100 text-amber-800'
                            : r.bctClassification.includes('Classe 2')
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.bctClassification}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">{r.provisionRate}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">{formatTND(r.provisionAmountTND)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BCT CCI (Centrale des Chèques Impayés) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertOctagon size={16} className="text-red-500" />
                  Centrale des Chèques Impayés BCT (CCI - Certificats de Non-Paiement)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gestion des avis de rejet de chèques sans provision, délais légaux de 30 jours et déclarations d'interdiction bancaire.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                {cciData?.totalRejections || 0} rejets sous surveillance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cciData?.records?.map((item: any) => (
                <div key={item.id} className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-foreground">
                      Chèque N° {item.chequeNumber}
                    </span>
                    <span className="text-[10px] font-bold text-red-600 font-mono">{formatTND(item.amountTND)}</span>
                  </div>
                  <h5 className="text-xs font-bold text-foreground">{item.drawerName}</h5>
                  <p className="text-[11px] font-mono text-muted-foreground">RIB : {item.ribIssuer}</p>
                  <p className="text-[11px] text-red-600 font-medium">{item.rejectionReason}</p>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{item.cnpNumber}</span>
                    <span className="text-amber-600 font-bold">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : SYSTÈMES DE RÈGLEMENT (SIT, SWIFT, SEPA) */}
      {/* ========================================================================= */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* Header Settlement */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SIT Section */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-blue-100 text-blue-800 uppercase">
                      Télécompensation Nationale SIT
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Direct Debit &amp; LCR</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1">
                    Prélèvements Directs Interbancaires SIT (Apurement des Créances)
                  </h3>
                </div>

                <button
                  onClick={handleGenerateSitBatch}
                  disabled={generatingSitBatch}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Send size={13} className={generatingSitBatch ? 'animate-pulse' : ''} />
                  {generatingSitBatch ? 'Génération du lot...' : 'Émettre Lot Prélèvement SIT'}
                </button>
              </div>

              {/* Batches List */}
              <div className="space-y-3">
                {sitBatches?.batches?.map((b: any) => (
                  <div key={b.batchId} className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-600">{b.batchId}</span>
                        <span className="text-xs font-bold text-foreground">{b.type}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                        b.status.includes('Compensé') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Date Télécomp.</span>
                        <p className="font-semibold text-foreground">{b.executionDate}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Volume Total</span>
                        <p className="font-bold text-foreground">{formatTND(b.totalAmountTND)} ({b.itemCount} ordres)</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Recouvré Net</span>
                        <p className="font-bold text-emerald-600">{formatTND(b.acceptedAmountTND)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase">Rejets SIT</span>
                        <p className="font-bold text-red-500">{formatTND(b.rejectedAmountTND)} ({b.rejectedCount})</p>
                      </div>
                    </div>

                    {b.rejectionBreakdown?.length > 0 && (
                      <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Détail des rejets :</span>
                        {b.rejectionBreakdown.map((rej: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">
                            Code {rej.reasonCode} : {rej.label} ({rej.count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SWIFT & ISO 20022 Sidecard */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="pb-3 border-b border-border">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-100 text-purple-800 uppercase">
                  SWIFT &amp; ISO 20022
                </span>
                <h3 className="text-base font-bold text-foreground mt-1">
                  Rapprochement Automatique MT940 / camt.053
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Intégration directe des relevés de comptes multi-banques pour lettrage automatique des règlements débiteurs.
                </p>
              </div>

              {mt940Result && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900 space-y-1">
                    <p className="font-mono font-bold text-purple-900 dark:text-purple-300 text-[11px]">
                      {mt940Result.swiftType}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Banque Émettrice : {mt940Result.senderBIC} • Relevé : {mt940Result.statementNumber}
                    </p>
                    <p className="text-xs font-bold text-emerald-600 font-mono pt-1">
                      Total Règlements Réconciliés : {formatTND(mt940Result.totalReconciledAmountTND)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Lignes Lettrées Automatiquement</span>
                    {mt940Result.parsedTransactions?.map((tx: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border bg-slate-50 dark:bg-slate-800/60 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{tx.debtorName}</span>
                          <span className="font-bold text-emerald-600 font-mono">{formatTND(tx.amountTND)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span>Dossier : {tx.referenceDossier}</span>
                          <span className="text-blue-600 font-semibold">{tx.reconciliationStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <a
                      href="/api/integrations/payment-systems/iso20022/pain008/sample"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 border border-border"
                    >
                      <FileCode size={13} className="text-indigo-600" />
                      Voir Spécimen XML pain.008 (ISO 20022)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 4 : API GATEWAY INTERACTIVE & CONSOLE DÉVELOPPEUR */}
      {/* ========================================================================= */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Builder */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-indigo-600" />
                  <h3 className="text-base font-bold text-foreground">Console de Test Passerelle Bancaire</h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Environnement DMZ Simulé
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Method & Endpoint */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Endpoint Normalisé</label>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={httpMethod}
                      onChange={(e) => setHttpMethod(e.target.value as any)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 border border-border rounded-lg font-mono font-bold text-indigo-600"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-mono text-xs"
                    >
                      <option value="/core-banking/dossiers/sync">POST /core-banking/dossiers/sync (Injecter impayés CBS)</option>
                      <option value="/core-banking/accounts/08001000123/block">POST /core-banking/accounts/08001000123/block (Saisie conservatoire)</option>
                      <option value="/payment-systems/sit/direct-debit">POST /payment-systems/sit/direct-debit (Émettre ordres SIT)</option>
                      <option value="/payment-systems/swift/mt940/reconcile">POST /payment-systems/swift/mt940/reconcile (Lettrer relevé)</option>
                      <option value="/bct/cdr/export">GET /bct/cdr/export (Flux déclaration BCT 91-24)</option>
                    </select>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">En-tête de Sécurité (mTLS / Token)</label>
                  <input
                    type="text"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg font-mono text-[11px]"
                  />
                </div>

                {/* Request Body */}
                {httpMethod === 'POST' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Corps de Requête JSON (Payload)</label>
                      <span className="text-[10px] text-muted-foreground font-mono">application/json</span>
                    </div>
                    <textarea
                      rows={7}
                      value={requestPayload}
                      onChange={(e) => setRequestPayload(e.target.value)}
                      className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleExecuteApiCall}
                  disabled={callingApi}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Play size={14} className={callingApi ? 'animate-spin' : ''} />
                  {callingApi ? 'Exécution du test...' : 'Envoyer la Requête via l’API Gateway'}
                </button>
              </div>
            </div>

            {/* Response Viewer */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between text-white">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                    <FileCode size={14} className="text-indigo-400" />
                    Réponse HTTP Passerelle
                  </span>
                  {apiResponse && (
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {apiResponse.statusCode} {apiResponse.statusText}
                      </span>
                      <span className="text-slate-400">{apiResponse.latencyMs} ms</span>
                    </div>
                  )}
                </div>

                {!apiResponse ? (
                  <div className="p-12 text-center text-slate-500 text-xs font-mono space-y-2">
                    <Terminal size={32} className="mx-auto text-slate-600" />
                    <p>En attente d'exécution d'une requête sur la passerelle.</p>
                    <p className="text-[10px] text-slate-600">Cliquez sur « Envoyer la Requête » pour tester l'endpoint.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">En-têtes de Réponse</span>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5 mt-1">
                        {Object.entries(apiResponse.headers || {}).map(([k, v]: any) => (
                          <p key={k}><span className="text-slate-500">{k}:</span> {v}</p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Corps de Réponse JSON</span>
                      <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-64 mt-1">
                        {JSON.stringify(apiResponse.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Traçabilité : TLS 1.3 / ISO 27001</span>
                <span className="text-emerald-400 font-bold">Gateway Health: 100%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
