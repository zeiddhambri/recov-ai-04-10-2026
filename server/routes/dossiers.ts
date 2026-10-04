import { Router, Request, Response } from 'express';
import { db } from '../db/dataStore';
import { requireRole } from '../auth';
import { validate, createDossierSchema, updateDossierSchema } from '../validation';
import { getRepository, type ActorRef } from '../db/repo';

const router = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function actorOf(req: Request): ActorRef {
  const auth = req.auth!;
  return { sub: auth.sub, email: auth.email, role: auth.role, institution: auth.institution ?? null };
}

function paging(req: Request) {
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
}

// GET all dossiers — paginé, filtré et cloisonné par institution (P1.1/P1.2)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, management_level, portfolio } = req.query;
    const tenant = req.auth?.institution || null;
    const page = await getRepository().listDossiers({
      status: status ? String(status) : undefined,
      management_level: management_level ? String(management_level) : undefined,
      portfolio: portfolio ? String(portfolio) : undefined,
      search: search ? String(search) : undefined,
      institution: tenant,
      ...paging(req),
    });
    res.json({
      count: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.offset + page.items.length < page.total,
      scope: tenant ? { institution: tenant } : { institution: null },
      data: page.items,
    });
  } catch (e: any) {
    console.error('[dossiers.list]', e?.message);
    res.status(500).json({ error: 'Erreur interne lors de la lecture du portefeuille.' });
  }
});

// GET dossier summary statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenant = req.auth?.institution || null;
    const page = await getRepository().listDossiers({ institution: tenant, limit: 100000, offset: 0 });
    const dossiers = page.items;
    const totalAmount = dossiers.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const totalRecovered = dossiers.reduce((acc, d) => acc + (Number(d.recovered_amount) || 0), 0);

    const byStatus: Record<string, number> = {};
    dossiers.forEach(d => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    });

    const recoveryRate = totalAmount > 0 ? ((totalRecovered / totalAmount) * 100).toFixed(1) : '0.0';

    res.json({
      totalDossiers: dossiers.length,
      totalAmount,
      totalRecovered,
      remainingAmount: totalAmount - totalRecovered,
      recoveryRate: `${recoveryRate}%`,
      byStatus
    });
  } catch (e: any) {
    console.error('[dossiers.stats]', e?.message);
    res.status(500).json({ error: 'Erreur interne lors du calcul des statistiques.' });
  }
});

// GET single dossier by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const repo = getRepository();
    const dossier = await repo.getDossier(String(req.params.id));

    if (!dossier) {
      return res.status(404).json({ error: 'Dossier introuvable' });
    }
    if (req.auth?.institution && (dossier.institution || '') !== req.auth.institution) {
      return res.status(404).json({ error: 'Dossier introuvable dans votre périmètre' });
    }

    const history = (await repo.listAudit(1000)).filter(
      l => String(l.entityId) === String(dossier.id) || (l.details || '').includes(dossier.client_code)
    );

    res.json({ ...dossier, history });
  } catch (e: any) {
    console.error('[dossiers.get]', e?.message);
    res.status(500).json({ error: 'Erreur interne.' });
  }
});

// POST create new dossier
router.post('/', validate(createDossierSchema), async (req: Request, res: Response) => {
  try {
    const { debtor_name, amount, debtor_email, debtor_phone, due_date, assigned_to, management_level, status, notes, portfolio, institution, branch } = req.body;
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
    const actor = actorOf(req);

    const amountNum = Number(amount) || 0;
    const row = {
      client_code: req.body.client_code || `RCV-${year}-${randomSuffix}`,
      debtor_name: String(debtor_name).trim(),
      debtor_email: debtor_email || null,
      debtor_phone: debtor_phone || null,
      amount: amountNum,
      due_date: due_date || new Date().toISOString().slice(0, 10),
      assigned_to: assigned_to || 'Non assigné',
      management_level: management_level || 'recouvreur',
      status: status || 'a_relancer',
      notes: notes || '',
      portfolio: portfolio || 'Amiable',
      // Un compte rattaché à une institution ne peut alimenter que son portefeuille.
      institution: actor.institution || institution || null,
      branch: branch || 'Tunis',
      risk_level: amountNum > 100000 ? 'Critique' : amountNum > 30000 ? 'Élevé' : 'Moyen',
      delay_days: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { record } = await getRepository().insertDossier(row, actor);

    await getRepository().appendAudit({
      action: 'CREATE_DOSSIER',
      details: `Création du dossier ${record.client_code} (${record.debtor_name}) pour ${Number(record.amount).toLocaleString('fr-TN')} TND`,
      actorEmail: actor.email, actorRole: actor.role, actorId: actor.sub,
      entityType: 'dossier', entityId: String(record.id), after: record,
    });
    res.status(201).json(record);
  } catch (e: any) {
    console.error('[dossiers.create]', e?.message);
    res.status(500).json({ error: 'Création impossible.' });
  }
});

// PATCH / PUT update dossier — verrou optimiste via version (P1.1)
async function applyDossierPatch(req: Request, res: Response) {
  try {
    const changes = { ...req.body };
    delete changes.user_id;
    delete changes.id;
    delete changes.version;

    const actor = actorOf(req);
    const ifMatch = req.get('if-match');
    const expectedVersion = typeof req.body?.version === 'number' ? req.body.version : ifMatch ? Number(ifMatch.replace(/"/g, '')) : null;

    const result = await getRepository().patchDossier(String(req.params.id), changes, actor, expectedVersion);

    if (result.notFound) return res.status(404).json({ error: 'Dossier introuvable' });
    if (result.conflict) {
      return res.status(409).json({
        error: 'Conflit de version : le dossier a été modifié par un autre utilisateur. Rechargez la dernière version.',
        code: 'VERSION_CONFLICT',
        currentVersion: result.before?.version ?? null,
      });
    }

    const changedFields = Object.keys(changes).filter(
      k => JSON.stringify(result.before?.[k]) !== JSON.stringify((result.after as any)?.[k])
    );

    await getRepository().appendAudit({
      action: 'UPDATE_DOSSIER',
      details: `Modification du dossier ${result.after?.client_code} — champs: ${changedFields.join(', ') || 'aucun'}`,
      actorEmail: actor.email, actorRole: actor.role, actorId: actor.sub,
      entityType: 'dossier', entityId: String(result.after?.id),
      before: result.before, after: result.after,
    });

    res.json(result.after);
  } catch (e: any) {
    console.error('[dossiers.patch]', e?.message);
    res.status(500).json({ error: 'Mise à jour impossible.' });
  }
}

router.patch('/:id', validate(updateDossierSchema), applyDossierPatch);
router.put('/:id', validate(updateDossierSchema), applyDossierPatch);

// DELETE — suppression LOGIQUE (traçabilité + droit à l'effacement différé, P1.1),
// réservée manager/admin.
router.delete('/:id', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    const result = await getRepository().softDeleteDossier(String(req.params.id), actor);
    if (result.notFound) return res.status(404).json({ error: 'Dossier introuvable' });

    await getRepository().appendAudit({
      action: 'DELETE_DOSSIER',
      details: `Suppression logique du dossier ${String(req.params.id)} par ${actor.email}`,
      actorEmail: actor.email, actorRole: actor.role, actorId: actor.sub,
      entityType: 'dossier', entityId: String(req.params.id),
    });

    res.json({ message: 'Dossier supprimé (conservation légale applicable). Ligne tracée dans le journal.', deletedId: req.params.id, softDelete: true });
  } catch (e: any) {
    console.error('[dossiers.delete]', e?.message);
    res.status(500).json({ error: 'Suppression impossible.' });
  }
});

// POST action on dossier (Promise to pay, payment, visit, phone call)
router.post('/:id/actions', async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    const repo = getRepository();
    const dossier = await repo.getDossier(String(req.params.id));

    if (!dossier) {
      return res.status(404).json({ error: 'Dossier introuvable' });
    }
    if (req.auth?.institution && (dossier.institution || '') !== req.auth.institution) {
      return res.status(404).json({ error: 'Dossier introuvable dans votre périmètre' });
    }

    const { type, amount, note, outcome, nextActionDate } = req.body;

    const newAction = {
      id: `act-${Date.now()}`,
      dossierId: dossier.id,
      clientCode: dossier.client_code,
      debtorName: dossier.debtor_name,
      type: type || 'call',
      amount: amount ? Number(amount) : null,
      outcome: outcome || 'callback',
      note: note || '',
      nextActionDate: nextActionDate || null,
      performedBy: actor.email,
      timestamp: new Date().toISOString()
    };

    // Journal des actions (horodaté, auteur authentifié) + empreinte probatoire.
    db.getRelanceLogs().unshift(newAction);
    db.save();
    await repo.appendAudit({
      action: `DOSSIER_ACTION_${String(newAction.type).toUpperCase()}`,
      details: `Action « ${newAction.type} » sur ${dossier.client_code}${newAction.amount ? ` pour ${Number(newAction.amount).toLocaleString('fr-TN')} TND` : ''}`,
      actorEmail: actor.email, actorRole: actor.role, actorId: actor.sub,
      entityType: 'dossier', entityId: String(dossier.id), after: newAction,
    });

    let updated = dossier;
    if (type === 'payment' && amount && Number(amount) > 0) {
      const recovered = (Number(dossier.recovered_amount) || 0) + Number(amount);
      const patch = { recovered_amount: recovered, status: recovered >= Number(dossier.amount) ? 'paye' : 'partiellement_paye' };
      const r = await repo.patchDossier(String(dossier.id), patch, actor, null);
      if (r.ok) updated = r.after;
    } else if (type === 'promise') {
      const r = await repo.patchDossier(String(dossier.id), { status: 'promesse_paiement' }, actor, null);
      if (r.ok) updated = r.after;
    }

    res.status(201).json({
      message: 'Action enregistrée',
      action: newAction,
      dossier: updated
    });
  } catch (e: any) {
    console.error('[dossiers.action]', e?.message);
    res.status(500).json({ error: 'Enregistrement de l\'action impossible.' });
  }
});

// POST /api/dossiers/reset-demo — Remise à zéro des données pour nouvelle démo client
router.post('/reset-demo', async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    const mode = req.body?.mode === 'empty' ? 'empty' : 'realistic';
    db.resetToInitial(mode);
    await getRepository().appendAudit({
      action: mode === 'empty' ? 'DEMO_DATA_CLEAR_ALL' : 'DEMO_DATA_RESET_REALISTIC',
      details: mode === 'empty'
        ? 'Remise à zéro complète du portefeuille (0 dossier) pour nouvelle démo client'
        : 'Chargement du portefeuille démo réaliste 2026 (zéro recouvrement initial) pour nouvelle démo client',
      actorEmail: actor.email,
      actorRole: actor.role,
      actorId: actor.sub,
      entityType: 'system',
      entityId: 'dataStore'
    });
    res.json({
      success: true,
      mode,
      message: mode === 'empty'
        ? 'Portefeuille de dossiers entièrement vidé (0 dossier).'
        : 'Portefeuille réinitialisé avec des données réalistes 2026 (montants recouvrés à 0 TND pour démo).',
      count: db.getDossiers().length,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('[dossiers.reset-demo]', e?.message);
    res.status(500).json({ error: 'Échec de la réinitialisation des données de démo' });
  }
});

export default router;
