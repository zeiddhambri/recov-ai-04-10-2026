import { Router } from 'express';
import { db } from '../db/dataStore';
import { audit } from '../auth';

const router = Router();

// Compatibility layer for PostgREST / Supabase REST syntax: /rest/v1/:table
router.all('/:table', (req, res) => {
  const table = req.params.table;
  const method = req.method;

  if (table === 'dossiers') {
    if (method === 'GET') {
      const dossiers = db.getDossiers();
      return res.json(dossiers);
    }
    if (method === 'POST') {
      const payload = req.body;
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted: any[] = [];

      rows.forEach(item => {
        const id = item.id || String(Date.now() + Math.floor(Math.random() * 1000));
        const record = {
          id,
          user_id: item.user_id || 'system-user',
          client_code: item.client_code || `RCV-${Date.now().toString().slice(-4)}`,
          debtor_name: item.debtor_name || 'Débiteur',
          debtor_email: item.debtor_email || null,
          debtor_phone: item.debtor_phone || null,
          amount: Number(item.amount) || 0,
          recovered_amount: 0,
          due_date: item.due_date || new Date().toISOString().slice(0, 10),
          assigned_to: item.assigned_to || 'Non assigné',
          management_level: item.management_level || 'recouvreur',
          status: item.status || 'a_relancer',
          notes: item.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.getDossiers().unshift(record);
        inserted.push(record);
      });
      db.save();
      audit('REST_INSERT_DOSSIER', `Insertion de ${inserted.length} dossier(s) via /rest/v1`, req.auth);
      return res.status(201).json(Array.isArray(payload) ? inserted : inserted[0]);
    }
  }

  if (table === 'lawyers') {
    if (method === 'GET') {
      return res.json(db.getLawyers());
    }
    if (method === 'POST') {
      const l = {
        id: req.body.id || `l-${Date.now()}`,
        name: req.body.name,
        firm: req.body.firm || '',
        phone: req.body.phone || '',
        email: req.body.email || '',
        created_at: new Date().toISOString()
      };
      db.getLawyers().push(l);
      db.save();
      return res.status(201).json(l);
    }
  }

  if (table === 'leasing_portfolio' || table === 'leasing') {
    if (method === 'GET') {
      return res.json(db.getLeasing());
    }
    if (method === 'POST') {
      const payload = req.body;
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted: any[] = [];
      rows.forEach(item => {
        const id = item.id || `LSG-${Date.now().toString().slice(-4)}`;
        const record = {
          ...item,
          id,
          created_at: new Date().toISOString()
        };
        db.getLeasing().unshift(record);
        inserted.push(record);
      });
      db.save();
      return res.status(201).json(Array.isArray(payload) ? inserted : inserted[0]);
    }
    if (method === 'DELETE') {
      const idQuery = req.query.id as string;
      if (idQuery) {
        // e.g. ?id=eq.123
        const cleanId = idQuery.replace(/^eq\./, '');
        const list = db.getLeasing();
        const idx = list.findIndex(l => String(l.id) === cleanId);
        if (idx !== -1) {
          list.splice(idx, 1);
          db.save();
        }
      }
      return res.json({ message: 'Deleted' });
    }
  }

  if (table === 'dossiers_contentieux') {
    if (method === 'GET') {
      return res.json(db.getLitigationCases());
    }
    if (method === 'POST') {
      const item = req.body;
      const newLit = {
        id: item.id || `LIT-${Date.now().toString().slice(-4)}`,
        debtor: {
          id: `D-${Date.now()}`,
          name: item.debtor_name || 'Débiteur',
          address: 'Tunisie',
          city: 'Tunis',
          phone: item.debtor_phone || '',
          email: item.debtor_email || ''
        },
        stage: item.status === 'precontentieux' ? 'pre_litigation' : 'injunction_filed',
        amount: { principal: Number(item.amount) || 0, legalFees: Number(item.estimated_legal_fees) || 0 },
        lawyer: db.getLawyers().find(l => l.id === item.lawyer_id) || null,
        created_at: new Date().toISOString()
      };
      db.getLitigationCases().unshift(newLit);
      db.save();
      return res.status(201).json(newLit);
    }
  }

  // Lot P0 : fin du faux « success: true » pour les tables non prises en charge
  // (une écriture qui prétend avoir réussi sans rien persister est un défaut
  // d'intégrité rédhibitoire en contexte bancaire).
  res.status(501).json({
    error: `Table « ${table} » non prise en charge par la couche REST de démonstration. Utilisez les endpoints /api/* dédiés.`,
    code: 'NOT_IMPLEMENTED'
  });
});

export default router;
