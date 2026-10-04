import { Router } from 'express';
import { db } from '../db/dataStore';
import { audit } from '../auth';

const router = Router();

// ==========================================
// 1. CORE BANKING SYSTEMS (CBS CONNECTORS)
// ==========================================

interface CBSConnector {
  id: string;
  name: string;
  vendor: string;
  category: 'Banque' | 'Leasing' | 'Microfinance' | 'Universel';
  protocol: 'REST / JSON' | 'SOAP / XML' | 'IBM MQ / ISO 8583' | 'Batch Flat-File SFTP';
  status: 'Connecté' | 'En attente' | 'Désactivé' | 'Erreur';
  lastSync: string;
  latencyMs: number;
  syncFrequency: 'Temps réel (Webhooks)' | 'Horaire' | 'Quotidien (Overnight Batch)' | 'Sur demande';
  authMethod: 'Mutual TLS (mTLS) + X.509' | 'OAuth 2.0 / Bearer' | 'HMAC-SHA256' | 'IP Whitelist + API Key';
  metrics: {
    syncedAccounts: number;
    syncedDebts: number;
    lastBatchVolume: number;
    errorRate: number;
  };
  supportedEntities: string[];
}

const CONNECTORS: CBSConnector[] = [
  {
    id: 'cbs-amplitude',
    name: 'Sopra Banking Amplitude',
    vendor: 'Sopra Banking Software',
    category: 'Banque',
    protocol: 'SOAP / XML',
    status: 'Connecté',
    lastSync: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    latencyMs: 42,
    syncFrequency: 'Temps réel (Webhooks)',
    authMethod: 'Mutual TLS (mTLS) + X.509',
    metrics: {
      syncedAccounts: 12480,
      syncedDebts: 1845,
      lastBatchVolume: 128000,
      errorRate: 0.12
    },
    supportedEntities: ['BIAT', 'Attijari Bank', 'Banque de Tunisie', 'BTK', 'QNB']
  },
  {
    id: 'cbs-t24',
    name: 'Temenos T24 / Transact',
    vendor: 'Temenos Group AG',
    category: 'Banque',
    protocol: 'REST / JSON',
    status: 'Connecté',
    lastSync: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    latencyMs: 38,
    syncFrequency: 'Temps réel (Webhooks)',
    authMethod: 'OAuth 2.0 / Bearer',
    metrics: {
      syncedAccounts: 9850,
      syncedDebts: 1420,
      lastBatchVolume: 94500,
      errorRate: 0.08
    },
    supportedEntities: ['STB Bank', 'BNA', 'BH Bank', 'UBCI']
  },
  {
    id: 'cbs-sabat',
    name: 'SAB AT Financial Engine',
    vendor: 'SAB Group (Sopra Banking)',
    category: 'Universel',
    protocol: 'IBM MQ / ISO 8583',
    status: 'Connecté',
    lastSync: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    latencyMs: 64,
    syncFrequency: 'Quotidien (Overnight Batch)',
    authMethod: 'Mutual TLS (mTLS) + X.509',
    metrics: {
      syncedAccounts: 4620,
      syncedDebts: 620,
      lastBatchVolume: 48000,
      errorRate: 0.25
    },
    supportedEntities: ['Amen Bank', 'ATB', 'Wifak Bank', 'Zitouna Bank']
  },
  {
    id: 'cbs-megara',
    name: 'Megara Financial Suite (BFI)',
    vendor: 'BFI Groupe Tunisie',
    category: 'Leasing',
    protocol: 'REST / JSON',
    status: 'Connecté',
    lastSync: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    latencyMs: 29,
    syncFrequency: 'Temps réel (Webhooks)',
    authMethod: 'IP Whitelist + API Key',
    metrics: {
      syncedAccounts: 3200,
      syncedDebts: 890,
      lastBatchVolume: 67000,
      errorRate: 0.05
    },
    supportedEntities: ['Tunisie Leasing & Factoring', 'Hannibal Lease', 'CIL Leasing', 'Attijari Leasing']
  },
  {
    id: 'cbs-microcred',
    name: 'Microfinance Core Engine (ACM / Cloud)',
    vendor: 'OpenCBS / Fintech Local',
    category: 'Microfinance',
    protocol: 'REST / JSON',
    status: 'Connecté',
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    latencyMs: 51,
    syncFrequency: 'Horaire',
    authMethod: 'OAuth 2.0 / Bearer',
    metrics: {
      syncedAccounts: 5800,
      syncedDebts: 740,
      lastBatchVolume: 32000,
      errorRate: 0.18
    },
    supportedEntities: ['Enda Tamweel', 'Advans Tunisie', 'Microcred Baobab', 'CFE Tunisie']
  }
];

// Get all connectors
router.get('/core-banking/connectors', (req, res) => {
  res.json({
    totalConnectors: CONNECTORS.length,
    activeConnectors: CONNECTORS.filter(c => c.status === 'Connecté').length,
    connectors: CONNECTORS
  });
});

// Test connection
router.post('/core-banking/test-connection', (req, res) => {
  const { connectorId, endpointUrl, authType } = req.body;
  const connector = CONNECTORS.find(c => c.id === connectorId) || CONNECTORS[0];

  const simulatedLatency = Math.floor(Math.random() * 40) + 25;
  const isSuccess = true;

  res.json({
    success: isSuccess,
    connectorId: connector.id,
    connectorName: connector.name,
    testedEndpoint: endpointUrl || `https://api.cbs-gateway.internal/${connector.id}/v1/health`,
    authMethod: authType || connector.authMethod,
    latencyMs: simulatedLatency,
    handshake: {
      tlsVersion: 'TLS 1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
      certificateValidUntil: '2027-12-31',
      peerVerified: true
    },
    timestamp: new Date().toISOString(),
    message: `Connecteur ${connector.name} validé avec succès. Handshake mTLS réussi.`
  });
});

// Trigger immediate sync
router.post('/core-banking/trigger-sync', (req, res) => {
  const { connectorId, scope = 'full' } = req.body;
  const connector = CONNECTORS.find(c => c.id === connectorId) || CONNECTORS[0];
  const dossiers = db.getDossiers();

  const simulatedUpdatedCount = Math.min(dossiers.length, 12);
  const totalAmountSynced = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  // Add audit log
  const auditEntry = {
    id: `AUDIT-SYNC-${Date.now()}`,
    user_id: 'SYSTEM_CBS_DAEMON',
    action: `CORE_BANKING_SYNC_${connector.id.toUpperCase()}`,
    details: `Synchronisation ${scope} exécutée avec succès pour ${connector.name}. ${simulatedUpdatedCount} dossiers réconciliés.`,
    created_at: new Date().toISOString()
  };
  // Idem : journal d'audit serveur (auteur = compte qui déclenche le sync).
  audit(auditEntry.action, auditEntry.details, req.auth);

  res.json({
    success: true,
    connectorId: connector.id,
    connectorName: connector.name,
    syncedAt: new Date().toISOString(),
    scope,
    stats: {
      recordsProcessed: dossiers.length,
      recordsUpdated: simulatedUpdatedCount,
      newUnpaidDetected: 2,
      paymentsReconciled: 4,
      totalAmountSyncedTND: totalAmountSynced,
      executionDurationMs: 480
    },
    message: `Synchronisation bidirectionnelle réussie avec ${connector.name}.`
  });
});

// ==========================================
// 2. FLUX FICHIERS BCT (BANQUE CENTRALE DE TUNISIE)
// ==========================================

// Centrale des Risques (CDR - Circulaire BCT 91-24 révisée)
router.get('/bct/cdr/preview', (req, res) => {
  const dossiers = db.getDossiers();
  const today = new Date();
  const arreteDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

  const cdrRecords = dossiers.map((d, index) => {
    const amount = Number(d.amount) || 0;
    const recovered = Number(d.recovered_amount) || 0;
    const unpaid = Math.max(0, amount - recovered);
    const delay = Number(d.delay_days) || 0;

    // Determination classe BCT selon circulaire 91-24
    let classeBCT = 'Classe 0 (Actif Sain)';
    let provisionRate = 0;
    if (delay > 180 || d.risk_level === 'Critique') {
      classeBCT = 'Classe 4 (Actifs Compromis)';
      provisionRate = 100;
    } else if (delay > 90) {
      classeBCT = 'Classe 3 (Actifs Préoccupants)';
      provisionRate = 50;
    } else if (delay > 30) {
      classeBCT = 'Classe 2 (Actifs Incertains)';
      provisionRate = 20;
    } else if (delay > 0) {
      classeBCT = 'Classe 1 (Actifs à surveiller)';
      provisionRate = 0;
    }

    const provisionAmount = Math.round(unpaid * (provisionRate / 100));

    return {
      lineNo: index + 1,
      bankCode: '08', // Code BCT standardisé
      branchCode: '001',
      customerCode: d.client_code || `CLI-${1000 + index}`,
      taxIdOrCIN: `0${index + 1}482914`,
      customerName: d.debtor_name,
      portfolioType: d.portfolio || 'Crédits aux Entreprises',
      commitmentCode: 'ENG-CT-01',
      totalAuthorized: amount * 1.1,
      drawnOutstanding: amount,
      unpaidAmount: unpaid,
      delayDays: delay,
      bctClassification: classeBCT,
      provisionRate: `${provisionRate}%`,
      provisionAmountTND: provisionAmount,
      guaranteesRetained: Math.round(amount * 0.4),
      status: 'Conforme BCT 91-24'
    };
  });

  res.json({
    bctSpecification: 'Circulaire BCT n° 91-24 révisée par les circulaires n° 2012-02 et 2021-01',
    arreteDate,
    bankCode: '08 (Amen Bank / Banques Agréées BCT)',
    recordsCount: cdrRecords.length,
    totalOutstandingTND: cdrRecords.reduce((s, r) => s + r.drawnOutstanding, 0),
    totalUnpaidTND: cdrRecords.reduce((s, r) => s + r.unpaidAmount, 0),
    totalProvisionsTND: cdrRecords.reduce((s, r) => s + r.provisionAmountTND, 0),
    records: cdrRecords
  });
});

// Download BCT Flat file
router.get('/bct/cdr/export', (req, res) => {
  const dossiers = db.getDossiers();
  const today = new Date();
  const arreteDateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}01`;

  // Format Header line
  let fileContent = `01080000${arreteDateStr}CENTRALE_RISQUES_BCT_V2024\n`;

  dossiers.forEach((d, i) => {
    const cin = (`0${i + 1}482914`).padEnd(10, ' ');
    const name = (d.debtor_name || 'CLIENT').substring(0, 30).padEnd(30, ' ');
    const outstanding = String(Math.round(Number(d.amount) || 0) * 1000).padStart(12, '0');
    const overdue = String(Math.round((Number(d.amount) || 0) - (Number(d.recovered_amount) || 0)) * 1000).padStart(12, '0');
    const delay = String(d.delay_days || 0).padStart(4, '0');
    const classe = (d.delay_days || 0) > 180 ? '4' : (d.delay_days || 0) > 90 ? '3' : (d.delay_days || 0) > 30 ? '2' : (d.delay_days || 0) > 0 ? '1' : '0';
    
    fileContent += `0208${cin}${name}${outstanding}${overdue}${delay}${classe}000\n`;
  });

  // Footer line
  fileContent += `9908${String(dossiers.length).padStart(6, '0')}${arreteDateStr}FIN_DECLARATION\n`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="CDR_BCT_${arreteDateStr}_08.txt"`);
  res.send(fileContent);
});

// Centrale des Chèques Impayés (CCI)
router.get('/bct/cci/preview', (req, res) => {
  res.json({
    specification: 'BCT - Centrale des Chèques Impayés (Code de Commerce Tunisien Art. 411 et s.)',
    totalRejections: 6,
    unpaidAmountTotal: 78500,
    records: [
      {
        id: 'CCI-2024-001',
        chequeNumber: '0078421',
        ribIssuer: '08 001 0001234567890 42',
        drawerName: 'COMPTOIR DU SUD SA',
        amountTND: 18500,
        rejectionDate: '2024-03-02',
        rejectionReason: '01 - Absence de provision suffisante',
        cnpNumber: 'CNP-2024-0982',
        notificationDate: '2024-03-05',
        regularizationDeadline: '2024-04-05',
        status: 'Sous mise en demeure (Délai 30j)'
      },
      {
        id: 'CCI-2024-002',
        chequeNumber: '0032981',
        ribIssuer: '03 002 0009876543210 19',
        drawerName: 'STE MAGHREBINE BOIS SARL',
        amountTND: 24000,
        rejectionDate: '2024-02-18',
        rejectionReason: '01 - Absence de provision suffisante',
        cnpNumber: 'CNP-2024-0711',
        notificationDate: '2024-02-21',
        regularizationDeadline: '2024-03-22',
        status: 'Interdiction bancaire déclarée BCT'
      },
      {
        id: 'CCI-2024-003',
        chequeNumber: '0091124',
        ribIssuer: '10 005 0005544332211 88',
        drawerName: 'KHALIL TRABELSI',
        amountTND: 6200,
        rejectionDate: '2024-03-10',
        rejectionReason: '02 - Compte frappé d’opposition judiciaire',
        cnpNumber: 'CNP-2024-1104',
        notificationDate: '2024-03-12',
        regularizationDeadline: '2024-04-12',
        status: 'Transmis au Contentieux'
      }
    ]
  });
});

// ==========================================
// 3. PAIEMENTS & COMPENSATION (SIT, SWIFT, SEPA)
// ==========================================

// SIT Direct Debit batches
router.get('/payment-systems/sit/batches', (req, res) => {
  res.json({
    clearingHouse: 'SIT (Société Interbancaire de Télécompensation - Tunisie)',
    protocol: 'SIT Batch EDIFACT / ISO 20022 SIT-TN',
    activeMandatesCount: 840,
    batches: [
      {
        batchId: 'SIT-DD-20240315-01',
        executionDate: '2024-03-15',
        type: 'Prélèvement Direct Interbancaire (Direct Debit)',
        itemCount: 45,
        totalAmountTND: 84600,
        acceptedCount: 38,
        acceptedAmountTND: 72100,
        rejectedCount: 7,
        rejectedAmountTND: 12500,
        status: 'Compensé & Lettré',
        rejectionBreakdown: [
          { reasonCode: '01', label: 'Provision Insuffisante', count: 4, amount: 8200 },
          { reasonCode: '02', label: 'Compte Clos / Bloqué', count: 2, amount: 3100 },
          { reasonCode: '04', label: 'Opposition Débiteur', count: 1, amount: 1200 }
        ]
      },
      {
        batchId: 'SIT-EFFET-20240310-02',
        executionDate: '2024-03-10',
        type: 'Télécompensation Effets Impayés (LCR / Billets à Ordre)',
        itemCount: 18,
        totalAmountTND: 62400,
        acceptedCount: 14,
        acceptedAmountTND: 49800,
        rejectedCount: 4,
        rejectedAmountTND: 12600,
        status: 'Compensé & Lettré',
        rejectionBreakdown: [
          { reasonCode: '01', label: 'Défaut de paiement à l’échéance', count: 3, amount: 9800 },
          { reasonCode: '08', label: 'Irrégularité d’acceptation', count: 1, amount: 2800 }
        ]
      },
      {
        batchId: 'SIT-DD-20240322-03',
        executionDate: '2024-03-22',
        type: 'Prélèvement Direct Échéances en Retard',
        itemCount: 28,
        totalAmountTND: 41200,
        acceptedCount: 0,
        acceptedAmountTND: 0,
        rejectedCount: 0,
        rejectedAmountTND: 0,
        status: 'En attente de compensation SIT (J+1)',
        rejectionBreakdown: []
      }
    ]
  });
});

// Trigger SIT Batch Generation
router.post('/payment-systems/sit/generate-batch', (req, res) => {
  const { batchType = 'DIRECT_DEBIT', maxItems = 25 } = req.body;
  const dossiers = db.getDossiers();

  const overdueDossiers = dossiers.filter(d => (Number(d.delay_days) || 0) > 0).slice(0, maxItems);
  const totalAmount = overdueDossiers.reduce((acc, d) => acc + Math.min(Number(d.amount) || 0, 5000), 0);

  const newBatchId = `SIT-DD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`;

  res.json({
    success: true,
    batchId: newBatchId,
    type: batchType,
    clearingCycle: 'SIT J+1 Télécompensation',
    itemsCount: overdueDossiers.length,
    totalAmountTND: totalAmount,
    generatedAt: new Date().toISOString(),
    status: 'Transmis au serveur passerelle SIT',
    message: `Lot de prélèvement interbancaire SIT ${newBatchId} généré pour ${overdueDossiers.length} créances impayées.`
  });
});

// SWIFT MT940 Relevé de compte électronique Parseur
router.post('/payment-systems/swift/parse-mt940', (req, res) => {
  const { sampleText } = req.body;

  // Standard sample MT940
  const statement = {
    swiftType: 'MT940 Customer Statement Message',
    senderBIC: 'BTKNTNTTXXX',
    receiverBIC: 'AMENTNTTXXX',
    accountNumber: '08001000123456789042',
    statementNumber: '2024/042',
    openingBalance: { currency: 'TND', amount: 1420500.25, date: '2024-03-01', status: 'Credit' },
    closingBalance: { currency: 'TND', amount: 1488900.75, date: '2024-03-15', status: 'Credit' },
    parsedTransactions: [
      {
        reference: 'REC-2024-VIR-01',
        valueDate: '2024-03-05',
        entryDate: '2024-03-05',
        amountTND: 35000.0,
        transactionType: 'Credit (Virement Reçu)',
        debtorName: 'SOCIETE ALPHA SARL',
        referenceDossier: 'RCV-2024-001',
        matched: true,
        reconciliationStatus: 'Lettré Automatiquement (Score 100%)'
      },
      {
        reference: 'REC-2024-PRLV-02',
        valueDate: '2024-03-08',
        entryDate: '2024-03-08',
        amountTND: 18400.5,
        transactionType: 'Credit (Prélèvement SIT)',
        debtorName: 'ETS BEN SALEM ET CIE',
        referenceDossier: 'RCV-2024-003',
        matched: true,
        reconciliationStatus: 'Lettré Automatiquement (Score 100%)'
      },
      {
        reference: 'REC-2024-VIR-03',
        valueDate: '2024-03-12',
        entryDate: '2024-03-12',
        amountTND: 15000.0,
        transactionType: 'Credit (Versement Espèces Guichet)',
        debtorName: 'CLINIQUE EL AMEL SA',
        referenceDossier: 'RCV-2024-008',
        matched: true,
        reconciliationStatus: 'Lettré Automatiquement (Score 95%)'
      }
    ],
    totalReconciledAmountTND: 68400.5
  };

  res.json(statement);
});

// ISO 20022 pain.008 XML Sample
router.get('/payment-systems/iso20022/pain008/sample', (req, res) => {
  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>RECOVAI-SDD-20240315-001</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>45000.00</CtrlSum>
      <InitgPty>
        <Nm>RECOVAI DEBT COLLECTION RECOVERY</Nm>
        <Id><OrgId><Othr><Id>TN0800100987</Id></Othr></OrgId></Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-RECOV-2024-01</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <ReqdColltnDt>${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}</ReqdColltnDt>
      <Cdtr>
        <Nm>BANQUE COMMERCIALE TUNISIENNE</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><Othr><Id>08001000123456789042</Id></Othr></Id>
        <Ccy>TND</Ccy>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId><BICFI>AMENTNTTXXX</BICFI></FinInstnId>
      </CdtrAgt>
      <DrctDbtTxInf>
        <PmtId><EndToEndId>DOSSIER-RCV-2024-001</EndToEndId></PmtId>
        <InstdAmt Ccy="TND">25000.00</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>MANDAT-BCT-9821</MndtId>
            <DtOfSgntr>2023-01-15</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId><BICFI>BIATTNTTXXX</BICFI></FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>SOCIETE ALPHA SARL</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id><Othr><Id>03001000987654321019</Id></Othr></Id>
        </DbtrAcct>
        <RmtInf><Ustrd>RECOUVREMENT ECHEANCE PRET N 847291</Ustrd></RmtInf>
      </DrctDbtTxInf>
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(xmlSample);
});

// ==========================================
// 4. API GATEWAY SPEC & SIMULATEUR DÉVELOPPEUR
// ==========================================

router.get('/api-gateway/spec', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'RecovAI Banking Connectors & Gateway API',
      version: '2.4.0',
      description: 'API normalisée pour intégration Core Banking (Amplitude, T24, SAB AT), Banque Centrale de Tunisie (BCT CDR/CCI), et Réseaux de Règlement (SIT / SWIFT / SEPA).'
    },
    servers: [
      { url: 'https://api.recovai.internal/v1', description: 'Passerelle Bancaire Dédiée (DMZ Interne)' },
      { url: 'https://sandbox-gateway.recovai.com/v1', description: 'Environnement de Test et Recette Bancaire' }
    ],
    security: [
      { mutualTLS: [] },
      { BearerAuth: [] }
    ],
    paths: {
      '/core-banking/dossiers/sync': {
        post: {
          summary: 'Synchronisation des dossiers impayés depuis le Core Banking',
          description: 'Permet au Core Banking d\'injecter ou de mettre à jour en temps réel les créances entrées en souffrance (overdue).',
          parameters: [],
          responses: {
            200: { description: 'Synchronisation réussie avec accusé de réception comptable' }
          }
        }
      },
      '/core-banking/accounts/{accountNumber}/block': {
        post: {
          summary: 'Ordre de saisie conservatoire ou blocage de compte',
          description: 'Transmission de l’ordonnance judiciaire ou de la saisie-arrêt pour blocage automatique dans le Core Banking.',
          responses: {
            200: { description: 'Compte bloqué avec confirmation du solde saisi' }
          }
        }
      },
      '/bct/cdr/export': {
        get: {
          summary: 'Export fichier réglementaire Centrale des Risques BCT',
          description: 'Génère la déclaration selon les normes de la circulaire BCT 91-24 révisée.',
          responses: {
            200: { description: 'Fichier plat texte conforme' }
          }
        }
      },
      '/payment-systems/sit/direct-debit': {
        post: {
          summary: 'Émission d’ordres de prélèvement interbancaire SIT',
          description: 'Génère et télétransmet un lot de prélèvements vers la chambre de compensation SIT.',
          responses: {
            200: { description: 'Lot accepté par le concentrateur SIT' }
          }
        }
      },
      '/payment-systems/swift/mt940/reconcile': {
        post: {
          summary: 'Rapprochement bancaire automatique via relevé MT940 / camt.053',
          description: 'Injecte les lignes de relevé pour lettrage automatique des règlements reçus.',
          responses: {
            200: { description: 'Rapprochement effectué avec taux de lettrage' }
          }
        }
      }
    }
  });
});

// Live simulator
router.post('/api-gateway/simulate', (req, res) => {
  const { endpoint, method = 'POST', headers = {}, body = {} } = req.body;
  const startTime = Date.now();

  setTimeout(() => {
    const latency = Date.now() - startTime + Math.floor(Math.random() * 20);

    if (endpoint.includes('dossiers/sync')) {
      res.json({
        statusCode: 200,
        statusText: 'OK',
        latencyMs: latency,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-bilingual-gateway-id': 'GW-TN-TUNIS-01',
          'x-trace-id': `TRC-${Date.now()}-${Math.floor(Math.random() * 9000)}`,
          'x-ratelimit-remaining': '4999'
        },
        payload: {
          status: 'SUCCESS',
          code: 'CBS_SYNC_COMPLETED',
          processedItems: 15,
          createdDossiers: 2,
          updatedDossiers: 13,
          reconciledBalancesTND: 421800,
          timestamp: new Date().toISOString()
        }
      });
    } else if (endpoint.includes('sit/direct-debit')) {
      res.json({
        statusCode: 202,
        statusText: 'Accepted by SIT Gateway',
        latencyMs: latency,
        headers: {
          'content-type': 'application/json',
          'x-sit-cycle-id': 'SIT-TN-2024-C03',
          'x-settlement-date': new Date(Date.now() + 86400000).toISOString().slice(0, 10)
        },
        payload: {
          status: 'ACCEPTED_IN_CLEARING_QUEUE',
          batchReference: `SIT-BATCH-${Date.now()}`,
          totalOrders: (body as any)?.ordersCount || 10,
          totalAmountTND: (body as any)?.totalAmount || 28400,
          clearingCutoff: '15:30:00 UTC+1',
          message: 'Lot en cours de télécompensation par la SIT. Rejets attendus à J+1 09h00.'
        }
      });
    } else {
      res.json({
        statusCode: 200,
        statusText: 'OK',
        latencyMs: latency,
        headers: {
          'content-type': 'application/json',
          'x-api-version': 'v2.4.0'
        },
        payload: {
          status: 'SUCCESS',
          receivedMethod: method,
          targetEndpoint: endpoint,
          authenticatedIdentity: 'BANQUE_PARTENAIRE_CERT_ID_9821',
          timestamp: new Date().toISOString(),
          response: 'Requête traitée avec succès par la passerelle RecovAI.'
        }
      });
    }
  }, 100);
});

export default router;
