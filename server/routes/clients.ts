import { Router } from 'express';
import { db } from '../db/dataStore';
import { scopedDossiers } from '../db/repo';

const router = Router();

// GET search clients across all portfolios
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();

  if (!q) {
    return res.json({ count: 0, results: [] });
  }

  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const leasing = db.getLeasing();
  const factoringDebtors = db.getFactoringDebtors();
  const litigation = db.getLitigationCases();

  const foundMap = new Map<string, any>();

  // Search in dossiers
  dossiers.forEach(d => {
    const matchName = (d.debtor_name || '').toLowerCase().includes(q);
    const matchCode = (d.client_code || '').toLowerCase().includes(q);
    const matchPhone = (d.debtor_phone || '').toLowerCase().includes(q);
    if (matchName || matchCode || matchPhone) {
      const key = (d.debtor_name || '').toUpperCase();
      if (!foundMap.has(key)) {
        foundMap.set(key, {
          name: d.debtor_name,
          phone: d.debtor_phone,
          email: d.debtor_email,
          city: d.branch || 'Tunis',
          type: 'dossier',
          portfolio: d.portfolio || 'Recouvrement Amiable',
          identifier: d.client_code
        });
      }
    }
  });

  // Search in leasing
  leasing.forEach(l => {
    const matchName = (l.lessee?.name || '').toLowerCase().includes(q);
    const matchRef = (l.contract_ref || '').toLowerCase().includes(q);
    const matchPhone = (l.lessee?.phone || '').toLowerCase().includes(q);
    if (matchName || matchRef || matchPhone) {
      const key = (l.lessee?.name || '').toUpperCase();
      if (!foundMap.has(key)) {
        foundMap.set(key, {
          name: l.lessee.name,
          phone: l.lessee.phone,
          email: l.lessee.email,
          city: l.lessee.city,
          type: 'leasing',
          portfolio: 'Leasing',
          identifier: l.contract_ref
        });
      }
    }
  });

  // Search in factoring
  factoringDebtors.forEach(fd => {
    const matchName = (fd.name || '').toLowerCase().includes(q);
    const matchTax = (fd.taxId || '').toLowerCase().includes(q);
    const matchReg = (fd.registrationNumber || '').toLowerCase().includes(q);
    if (matchName || matchTax || matchReg) {
      const key = (fd.name || '').toUpperCase();
      if (!foundMap.has(key)) {
        foundMap.set(key, {
          name: fd.name,
          taxId: fd.taxId,
          city: 'Tunisie',
          type: 'factoring',
          portfolio: 'Factoring',
          identifier: fd.taxId
        });
      }
    }
  });

  // Search in litigation
  litigation.forEach(lit => {
    const matchName = (lit.debtor?.name || '').toLowerCase().includes(q);
    const matchId = (lit.id || '').toLowerCase().includes(q);
    if (matchName || matchId) {
      const key = (lit.debtor?.name || '').toUpperCase();
      if (!foundMap.has(key)) {
        foundMap.set(key, {
          name: lit.debtor.name,
          phone: lit.debtor.phone,
          email: lit.debtor.email,
          city: lit.debtor.city,
          type: 'litigation',
          portfolio: 'Contentieux Judiciaire',
          identifier: lit.id
        });
      }
    }
  });

  const results = Array.from(foundMap.values());

  res.json({
    count: results.length,
    results
  });
});

// GET 360-degree debtor profile
router.get('/:nameOrId/profile', async (req, res) => {
  const target = decodeURIComponent(req.params.nameOrId).trim().toLowerCase();

  const dossiers = (await scopedDossiers(req.auth?.institution || null)).filter(d =>
    (d.debtor_name || '').toLowerCase().includes(target) ||
    (d.client_code || '').toLowerCase() === target
  );

  const leasing = db.getLeasing().filter(l =>
    (l.lessee?.name || '').toLowerCase().includes(target) ||
    (l.contract_ref || '').toLowerCase() === target
  );

  const factoringDebtors = db.getFactoringDebtors().filter(fd =>
    (fd.name || '').toLowerCase().includes(target) ||
    (fd.taxId || '').toLowerCase() === target
  );

  const factoringInvoices = db.getFactoringInvoices().filter(fi =>
    (fi.debtorName || '').toLowerCase().includes(target)
  );

  const litigation = db.getLitigationCases().filter(lit =>
    (lit.debtor?.name || '').toLowerCase().includes(target) ||
    (lit.id || '').toLowerCase() === target
  );

  const actions = db.getRelanceLogs().filter(act =>
    (act.debtorName || '').toLowerCase().includes(target)
  );

  // Compute aggregated financial exposure
  const totalDossiersAmount = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalDossiersRecovered = dossiers.reduce((acc, d) => acc + (Number(d.recovered_amount) || 0), 0);

  const totalLeasingRemaining = leasing.reduce((acc, l) => acc + (l.financials?.remainingCapital || 0), 0);
  const totalLeasingOverdue = leasing.reduce((acc, l) => acc + (l.financials?.overdueAmount || 0), 0);

  const totalFactoringOverdue = factoringInvoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0);
  const totalLitigationPrincipal = litigation.reduce((acc, lit) => acc + (lit.amount?.principal || 0), 0);

  const totalGlobalExposure = totalDossiersAmount + totalLeasingRemaining + totalFactoringOverdue + totalLitigationPrincipal;

  // Determine debtor identity
  const primaryName = dossiers[0]?.debtor_name || leasing[0]?.lessee?.name || factoringDebtors[0]?.name || litigation[0]?.debtor?.name || req.params.nameOrId;
  const phone = dossiers[0]?.debtor_phone || leasing[0]?.lessee?.phone || litigation[0]?.debtor?.phone || '+216 71 123 456';
  const email = dossiers[0]?.debtor_email || leasing[0]?.lessee?.email || litigation[0]?.debtor?.email || 'contact@debiteur.tn';
  const address = leasing[0]?.lessee?.address || litigation[0]?.debtor?.address || 'Tunis, Tunisie';
  const taxId = factoringDebtors[0]?.taxId || '0001235F/A/M/000';

  // Overall risk grade calculation
  let riskGrade = 'B';
  let riskScore = 72;
  if (litigation.length > 0 || totalLeasingOverdue > 20000) {
    riskGrade = 'D (Défaut)';
    riskScore = 32;
  } else if (totalDossiersAmount > 200000 || totalFactoringOverdue > 50000) {
    riskGrade = 'C (Sous surveillance)';
    riskScore = 55;
  } else if (totalGlobalExposure < 50000) {
    riskGrade = 'A (Faible risque)';
    riskScore = 90;
  }

  res.json({
    debtor: {
      name: primaryName,
      taxId,
      phone,
      email,
      address,
      riskGrade,
      riskScore
    },
    exposureSummary: {
      totalGlobalExposure,
      totalRecovered: totalDossiersRecovered,
      activeLitigationsCount: litigation.length,
      activeLeasingCount: leasing.length,
      unpaidDossiersCount: dossiers.filter(d => d.status !== 'paye').length
    },
    portfolios: {
      dossiers,
      leasing,
      factoring: {
        debtorDetails: factoringDebtors[0] || null,
        invoices: factoringInvoices
      },
      litigation
    },
    timeline: actions
  });
});

export default router;
