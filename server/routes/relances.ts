import { Router } from 'express';
import { db } from '../db/dataStore';
import { getRepository, scopedDossiers } from '../db/repo';
import { audit, requireRole } from '../auth';
import { validate, relanceSendSchema, templateSchema, escalationRuleSchema } from '../validation';
import { sendViaProvider, getProviderStatus, verifyWebhookSignature, type DeliveryStatus } from '../lib/communication';
import crypto from 'crypto';

const router = Router();

// ==========================================
// 1. RELANCES LOGS & TRIGGER (P1.5 réel)
// ==========================================

// GET all relance logs
router.get('/', (req, res) => {
  const logs = db.getRelanceLogs();
  res.json({
    count: logs.length,
    data: logs
  });
});

// GET provider status (P1.5)
router.get('/providers/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    ...getProviderStatus(),
  });
});

// GET single log status history
router.get('/logs/:id', (req, res) => {
  const logs = db.getRelanceLogs();
  const entry = logs.find(l => l.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Log introuvable' });
  res.json(entry);
});

// POST send immediate relance (SMS, Email, Call, Letter) — P1.5 avec provider réel
router.post('/send', validate(relanceSendSchema), async (req, res) => {
  const { dossierId, templateId, channel = 'sms', customMessage, recipient } = req.body;

  const dossiers = await scopedDossiers(req.auth?.institution || null);
  let dossier = dossiers.find(d => String(d.id) === String(dossierId) || d.client_code === dossierId);

  if (!dossier) {
    return res.status(404).json({ error: 'Dossier introuvable' });
  }

  const templates = db.getTemplates();
  const template = templates.find(t => t.id === templateId) || templates[0];

  let finalContent = customMessage || template?.content || 'Rappel de votre échéance en cours.';
  finalContent = finalContent
    .replace(/\{\{debiteur\}\}/g, dossier.debtor_name)
    .replace(/\{\{montant\}\}/g, Number(dossier.amount).toLocaleString('fr-TN'))
    .replace(/\{\{echeance\}\}/g, dossier.due_date || 'immédiate')
    .replace(/\{\{reference\}\}/g, dossier.client_code)
    .replace(/\{\{rib\}\}/g, '08 000 0001234567890 45');

  const finalRecipient = recipient || dossier.debtor_phone || dossier.debtor_email || 'Contact officiel';

  // P1.5 — envoi via provider configuré (console par défaut en démo, HTTP/SMTP en prod)
  const providerResult = await sendViaProvider({
    channel,
    recipient: finalRecipient,
    content: finalContent,
    subject: template?.subject || `Recouvrement ${dossier.client_code}`,
    dossierId: String(dossier.id),
    clientCode: dossier.client_code,
    templateId: template?.id,
    institution: req.auth?.institution || dossier.institution || null,
    actorEmail: req.auth?.email,
    metadata: { templateName: template?.name },
  });

  const logEntry = {
    id: `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    dossierId: dossier.id,
    clientCode: dossier.client_code,
    debtorName: dossier.debtor_name,
    channel,
    recipient: finalRecipient,
    templateUsed: template?.name || 'Message direct',
    content: finalContent,
    status: providerResult.status as string,
    provider: providerResult.provider,
    providerMessageId: providerResult.providerMessageId,
    queuedAt: providerResult.queuedAt,
    sentAt: providerResult.sentAt,
    providerResponse: providerResult.providerResponse,
    statusHistory: [
      {
        status: providerResult.status,
        timestamp: new Date().toISOString(),
        provider: providerResult.provider,
        note: 'Envoi initial',
      }
    ],
    cost: providerResult.cost || null,
    // Preuve opposable P1.5
    proof: {
      hash: crypto.createHash('sha256').update(`${dossier.client_code}|${finalRecipient}|${finalContent}|${providerResult.providerMessageId}`).digest('hex'),
      timestamp: new Date().toISOString(),
      actor: req.auth?.email || 'system',
      institution: req.auth?.institution || null,
    },
    initiatedBy: req.auth?.email || 'system',
    timestamp: new Date().toISOString()
  };

  // Update dossier status to en_relance if it was a_relancer — via le repo (source de vérité).
  if (dossier.status === 'a_relancer') {
    const actor = { sub: req.auth!.sub, email: req.auth!.email, role: req.auth!.role, institution: req.auth!.institution ?? null };
    const patched = await getRepository().patchDossier(String(dossier.id), { status: 'en_relance' }, actor, null);
    if (patched.ok) dossier = patched.after;
  }

  const auditAction = providerResult.status === 'failed' ? 'RELANCE_FAILED' : providerResult.status === 'queued' ? 'RELANCE_QUEUED' : 'RELANCE_SENT';

  await getRepository().appendAudit({
    action: auditAction,
    details: `Relance ${String(channel).toUpperCase()} ${providerResult.status} (${logEntry.templateUsed}) sur ${dossier.client_code} via ${providerResult.provider} id=${providerResult.providerMessageId}`,
    actorEmail: req.auth!.email, actorRole: req.auth!.role, actorId: req.auth!.sub,
    entityType: 'dossier', entityId: String(dossier.id), after: { status: providerResult.status, channel, templateUsed: logEntry.templateUsed, provider: providerResult.provider, providerMessageId: providerResult.providerMessageId },
  });

  db.getRelanceLogs().unshift(logEntry);
  db.save();

  audit(auditAction, `Relance ${String(channel).toUpperCase()} ${providerResult.status} sur dossier ${dossier.client_code} via ${providerResult.provider}`, req.auth);

  res.status(providerResult.status === 'failed' ? 502 : 201).json({
    message: providerResult.status === 'failed'
      ? `Échec d'envoi ${String(channel).toUpperCase()} : ${providerResult.providerResponse?.error || 'provider error'}`
      : `Relance ${String(channel).toUpperCase()} ${providerResult.status} via ${providerResult.provider} (preuve horodatée)`,
    simulated: providerResult.provider === 'console' ? false : undefined, // P1.5 : console = journalisé, pas simulé
    provider: providerResult.provider,
    providerMessageId: providerResult.providerMessageId,
    status: providerResult.status,
    log: logEntry,
    dossierStatus: dossier.status
  });
});

// ==========================================
// 1b. WEBHOOKS — statuts réels depuis provider (P1.5)
// ==========================================

// Middleware pour capturer le raw body pour vérif HMAC
function rawBodySaver(req: any, _res: any, buf: Buffer) {
  req.rawBody = buf.toString('utf8');
}

router.post('/webhooks/sms', (req, res, next) => {
  // On doit parser le body en conservant rawBody ; on utilise express.json avec verify si pas déjà fait
  // Ici on suppose que le middleware global a déjà parsé, mais on vérifie la signature sur JSON stringifié si rawBody absent
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  const sig = (req.headers['x-webhook-signature'] as string) || (req.headers['x-hub-signature-256'] as string) || '';
  if (process.env.COMM_WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(raw, sig)) {
      return res.status(401).json({ error: 'Signature webhook invalide', code: 'INVALID_SIGNATURE' });
    }
  }
  next();
}, (req, res) => {
  const { messageId, providerMessageId, status, errorCode, errorMessage, timestamp, meta } = req.body as any;
  const id = providerMessageId || messageId;
  if (!id) return res.status(400).json({ error: 'providerMessageId requis' });

  const logs = db.getRelanceLogs();
  const entry = logs.find(l => l.providerMessageId === id || l.id === id);
  if (!entry) {
    // On journalise quand même pour traçabilité
    console.warn(`[webhook:sms] messageId inconnu ${id}`);
    return res.status(404).json({ error: 'Message ID inconnu', code: 'NOT_FOUND', receivedId: id });
  }

  const newStatus = (status as DeliveryStatus) || 'delivered';
  entry.status = newStatus;
  entry.statusHistory = entry.statusHistory || [];
  entry.statusHistory.push({
    status: newStatus,
    timestamp: timestamp || new Date().toISOString(),
    providerMeta: meta || req.body,
    errorCode,
    errorMessage,
  });
  if (newStatus === 'delivered') entry.deliveredAt = new Date().toISOString();
  if (newStatus === 'failed' || newStatus === 'bounced' || newStatus === 'rejected') entry.failedAt = new Date().toISOString();

  db.save();

  audit('RELANCE_WEBHOOK_SMS', `Webhook SMS ${newStatus} pour ${id}`, null);
  res.json({ ok: true, messageId: id, newStatus });
});

router.post('/webhooks/email', (req, res, next) => {
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  const sig = (req.headers['x-webhook-signature'] as string) || '';
  if (process.env.COMM_WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(raw, sig)) {
      return res.status(401).json({ error: 'Signature webhook invalide' });
    }
  }
  next();
}, (req, res) => {
  const { messageId, providerMessageId, status, event, errorCode, errorMessage, timestamp } = req.body as any;
  const id = providerMessageId || messageId;
  if (!id) return res.status(400).json({ error: 'providerMessageId requis' });

  const logs = db.getRelanceLogs();
  const entry = logs.find(l => l.providerMessageId === id || l.id === id);
  if (!entry) return res.status(404).json({ error: 'Message ID inconnu' });

  // Mapping Sendgrid/Mailgun events vers notre enum
  let mapped: DeliveryStatus = 'delivered';
  if (event === 'delivered' || status === 'delivered') mapped = 'delivered';
  else if (event === 'bounced' || status === 'bounced') mapped = 'bounced';
  else if (event === 'dropped' || event === 'failed' || status === 'failed') mapped = 'failed';
  else if (event === 'deferred') mapped = 'queued';
  else mapped = (status as DeliveryStatus) || 'delivered';

  entry.status = mapped;
  entry.statusHistory = entry.statusHistory || [];
  entry.statusHistory.push({
    status: mapped,
    timestamp: timestamp || new Date().toISOString(),
    providerMeta: req.body,
    errorCode,
    errorMessage,
  });
  if (mapped === 'delivered') entry.deliveredAt = new Date().toISOString();
  db.save();
  audit('RELANCE_WEBHOOK_EMAIL', `Webhook Email ${mapped} pour ${id}`, null);
  res.json({ ok: true, messageId: id, newStatus: mapped });
});

router.post('/webhooks/whatsapp', (req, res, next) => {
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  const sig = (req.headers['x-webhook-signature'] as string) || '';
  if (process.env.COMM_WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(raw, sig)) {
      return res.status(401).json({ error: 'Signature webhook invalide' });
    }
  }
  next();
}, (req, res) => {
  const { messageId, providerMessageId, status, timestamp } = req.body as any;
  const id = providerMessageId || messageId;
  if (!id) return res.status(400).json({ error: 'providerMessageId requis' });
  const logs = db.getRelanceLogs();
  const entry = logs.find(l => l.providerMessageId === id);
  if (!entry) return res.status(404).json({ error: 'Message ID inconnu' });
  const mapped = (status as DeliveryStatus) || 'delivered';
  entry.status = mapped;
  entry.statusHistory = entry.statusHistory || [];
  entry.statusHistory.push({ status: mapped, timestamp: timestamp || new Date().toISOString(), providerMeta: req.body });
  db.save();
  res.json({ ok: true, messageId: id, newStatus: mapped });
});

// ==========================================
// 2. MODÈLES DE MESSAGES (TEMPLATES)
// ==========================================

// GET all templates
router.get('/templates', (req, res) => {
  const templates = db.getTemplates();
  res.json({
    count: templates.length,
    data: templates
  });
});

// POST create template
router.post('/templates', validate(templateSchema), (req, res) => {
  const { name, channel, category, subject, content, variables } = req.body;

  const templates = db.getTemplates();
  const newTemplate = {
    id: `tpl-${Date.now()}`,
    name,
    channel: channel || 'sms',
    category: category || 'amiable',
    subject: subject || name,
    content,
    variables: variables || ['debiteur', 'montant', 'echeance'],
    active: true
  };

  templates.push(newTemplate);
  db.save();

  audit('CREATE_TEMPLATE', `Création du modèle de message « ${name} »`, req.auth);

  res.status(201).json(newTemplate);
});

// PUT update template — manager/admin uniquement (impact sur les communications clients)
router.put('/templates/:id', requireRole('admin', 'manager'), (req, res) => {
  const templates = db.getTemplates();
  const index = templates.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Modèle introuvable' });
  }

  templates[index] = {
    ...templates[index],
    ...req.body
  };
  db.save();

  audit('UPDATE_TEMPLATE', `Modification du modèle « ${templates[index].name} »`, req.auth);

  res.json(templates[index]);
});

// DELETE template — admin uniquement
router.delete('/templates/:id', requireRole('admin'), (req, res) => {
  const templates = db.getTemplates();
  const index = templates.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Modèle introuvable' });
  }

  const removed = templates.splice(index, 1)[0];
  audit('DELETE_TEMPLATE', `Suppression du modèle « ${removed?.name} »`, req.auth);
  db.save();

  res.json({ message: 'Modèle supprimé', removedId: removed.id });
});

// POST preview template with sample values
router.post('/templates/preview', (req, res) => {
  const { content, values } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Contenu requis pour la prévisualisation' });
  }

  const v = {
    debiteur: values?.debiteur || 'STE ALPHA SARL',
    montant: values?.montant ? `${Number(values.montant).toLocaleString('fr-TN')} TND` : '145 000 TND',
    echeance: values?.echeance || '15/06/2026',
    reference: values?.reference || 'RCV-2024-001',
    rib: values?.rib || '08 000 0001234567890 45',
    adresse: values?.adresse || 'Zone Industrielle Charguia II, Tunis'
  };

  let rendered = content;
  Object.keys(v).forEach(key => {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), v[key as keyof typeof v]);
  });

  res.json({
    original: content,
    rendered
  });
});

// ==========================================
// 3. RÈGLES D'ESCALADE
// ==========================================

// GET all escalation rules
router.get('/escalade', (req, res) => {
  const rules = db.getEscalationRules();
  res.json({
    count: rules.length,
    data: rules
  });
});

// POST create escalation rule — manager/admin (les règles pilotent les affectations et escalades)
router.post('/escalade', requireRole('admin', 'manager'), validate(escalationRuleSchema), (req, res) => {
  const { name, triggerDays, condition, action, targetLevel } = req.body;

  const rules = db.getEscalationRules();
  const newRule = {
    id: `esc-${Date.now()}`,
    name,
    triggerDays: Number(triggerDays),
    condition: condition || `retard > ${triggerDays} jours`,
    action: action || 'Alerte superviseur',
    targetLevel: targetLevel || 'superviseur',
    active: true
  };

  rules.push(newRule);
  db.save();

  audit('CREATE_ESCALATION_RULE', `Création de la règle d'escalade « ${name} » (déclencheur J+${Number(triggerDays)})`, req.auth);

  res.status(201).json(newRule);
});

// PATCH toggle escalation rule — manager/admin
router.patch('/escalade/:id/toggle', requireRole('admin', 'manager'), (req, res) => {
  const rules = db.getEscalationRules();
  const rule = rules.find(r => r.id === req.params.id);

  if (!rule) {
    return res.status(404).json({ error: 'Règle d\'escalade introuvable' });
  }

  rule.active = !rule.active;
  db.save();

  audit('TOGGLE_ESCALATION_RULE', `Règle « ${rule.name} » ${rule.active ? 'activée' : 'désactivée'}`, req.auth);

  res.json(rule);
});

// POST execute escalation engine — le moteur journalise chaque bascule
router.post('/escalade/run-engine', async (req, res) => {
  const actor = { sub: req.auth!.sub, email: req.auth!.email, role: req.auth!.role, institution: req.auth!.institution ?? null };
  const repo = getRepository();
  const dossiers = await scopedDossiers(req.auth?.institution || null);
  const rules = db.getEscalationRules().filter(r => r.active);
  const escalated: any[] = [];

  for (const d of dossiers) {
    const delay = Number(d.delay_days) || 0;
    for (const r of rules) {
      if (delay >= r.triggerDays && d.management_level !== r.targetLevel && d.status !== 'paye') {
        const prevLevel = d.management_level;
        const patched = await repo.patchDossier(String(d.id), { management_level: r.targetLevel }, actor, null);
        if (patched.ok) d.management_level = patched.after.management_level;

        await repo.appendAudit({
          action: 'ESCALATION_APPLIED',
          details: `Dossier ${d.client_code} escaladé « ${prevLevel} → ${r.targetLevel} » par la règle « ${r.name} »`,
          actorEmail: actor.email, actorRole: actor.role, actorId: actor.sub,
          entityType: 'dossier', entityId: String(d.id),
          before: { management_level: prevLevel }, after: { management_level: r.targetLevel },
        });

        escalated.push({
          dossierId: d.id,
          clientCode: d.client_code,
          debtorName: d.debtor_name,
          previousLevel: prevLevel,
          newLevel: r.targetLevel,
          triggeredRule: r.name
        });

        audit('ESCALATION_APPLIED', `Dossier ${d.client_code} escaladé « ${prevLevel} → ${r.targetLevel} » par la règle « ${r.name} »`, req.auth);
      }
    }
  }

  audit('ESCALATION_ENGINE_RUN', `Exécution manuelle du moteur d'escalade — ${escalated.length} bascule(s) sur ${dossiers.length} dossier(s)`, req.auth);

  res.json({
    message: 'Moteur d\'escalade exécuté avec succès',
    totalChecked: dossiers.length,
    escalatedCount: escalated.length,
    escalated
  });
});

export default router;
