// RecovAI — Validation des corps de requêtes (lot P0). Zod est déjà utilisé côté client.
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validate(schema: z.ZodTypeAny, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Payload invalide',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    if (source === 'body') req.body = parsed.data;
    next();
  };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ');
const amount = z.coerce.number().min(0).max(1_000_000_000);

export const loginSchema = z.object({
  email: z.string().trim().min(5).max(255),
  password: z.string().min(1).max(256),
});

export const createDossierSchema = z.object({
  debtor_name: z.string().trim().min(2).max(255),
  amount: amount.default(0),
  debtor_email: z.string().trim().email().max(255).nullable().optional().or(z.literal('').transform(() => null)),
  debtor_phone: z.string().trim().max(40).nullable().optional().or(z.literal('')),
  due_date: isoDate.nullable().optional().or(z.literal('')),
  assigned_to: z.string().trim().max(120).optional(),
  management_level: z.enum(['recouvreur', 'superviseur', 'directeur', 'comite', 'contentieux']).optional(),
  status: z.enum(['a_relancer', 'en_relance', 'promesse_paiement', 'partiellement_paye', 'paye', 'contentieux']).optional(),
  notes: z.string().max(5000).optional(),
  portfolio: z.string().trim().max(120).optional(),
  institution: z.string().trim().max(200).optional(),
  branch: z.string().trim().max(200).optional(),
  client_code: z.string().trim().max(60).optional(),
  user_id: z.string().optional(), // ignoré : l'auteur est dérivé du jeton
});

// `version` (verrou optimiste, lot P1) est déclaré pour survivre au stripping zod.
export const updateDossierSchema = createDossierSchema.partial().omit({ user_id: true }).extend({
  version: z.number().int().positive().optional(),
});

export const createLitigationSchema = z.object({
  id: z.string().trim().max(60).optional(),
  debtor_name: z.string().trim().min(2).max(255),
  amount: amount,
  debtor_siren: z.string().max(40).optional(),
  debtor_cin: z.string().max(40).optional(),
  debtor_address: z.string().max(500).optional(),
  debtor_city: z.string().max(120).optional(),
  debtor_zip: z.string().max(20).optional(),
  debtor_phone: z.string().max(40).optional(),
  debtor_email: z.string().max(255).optional(),
  lawyer_id: z.string().max(60).optional(),
  bailiff_id: z.string().max(60).optional(),
  procedure_type: z.string().trim().max(60).optional(),
  portfolio: z.string().max(120).optional(),
  court_level: z.string().max(120).optional(),
  observations: z.string().max(5000).optional(),
  guarantee: z.string().max(500).optional(),
  legal_fees: z.coerce.number().min(0).optional(),
  bailiff_fees: z.coerce.number().min(0).optional(),
  institution: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  manager: z.string().max(120).optional(),
});

export const relanceSendSchema = z.object({
  dossierId: z.union([z.string().trim().min(1), z.number()]),
  templateId: z.string().trim().max(60).optional(),
  channel: z.enum(['sms', 'email', 'whatsapp', 'appel', 'lettre']).default('sms'),
  customMessage: z.string().max(5000).optional(),
  recipient: z.string().max(255).optional(),
});

export const templateSchema = z.object({
  id: z.string().trim().max(60).optional(),
  name: z.string().trim().min(3).max(255),
  channel: z.enum(['sms', 'email', 'whatsapp', 'lettre', 'appel']).default('sms'),
  category: z.string().trim().max(60).optional(),
  subject: z.string().max(255).optional(),
  content: z.string().min(3).max(10000),
  variables: z.array(z.string().max(60)).max(40).optional(),
  active: z.boolean().optional(),
});

export const escalationRuleSchema = z.object({
  id: z.string().trim().max(60).optional(),
  name: z.string().trim().min(3).max(255),
  triggerDays: z.coerce.number().int().min(1).max(1095),
  condition: z.string().max(1000).optional(),
  action: z.string().max(2000).optional(),
  targetLevel: z.enum(['superviseur', 'directeur', 'comite', 'contentieux']),
  active: z.boolean().optional(),
});

export const createInstitutionSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(200),
  fullName: z.string().trim().min(2).max(300).optional(),
  category: z.enum(['banque_residente', 'banque_offshore', 'microfinance', 'leasing_factoring']),
  legalForm: z.string().max(120).optional(),
  regulatoryBody: z.string().max(200).optional(),
  headquarters: z.string().max(300).optional(),
  status: z.enum(['active', 'in_restructuring']).optional(),
  swiftCode: z.string().max(20).optional(),
  branchesCount: z.coerce.number().int().min(0).max(10000).optional(),
  contactEmail: z.string().max(255).optional(),
  website: z.string().max(300).optional(),
  specialty: z.string().max(300).optional(),
});

export const eclRequestSchema = z.object({
  nominal: z.coerce.number().min(0).max(1e12).default(100000),
  interestRate: z.coerce.number().min(0).max(100).default(8.5),
  durationMonths: z.coerce.number().int().min(1).max(600).default(36),
  collateralValue: z.coerce.number().min(0).max(1e12).default(60000),
  collateralHaircut: z.coerce.number().min(0).max(90).default(25),
  overdueDays: z.coerce.number().int().min(0).max(5000).default(0),
  macroScenario: z.enum(['central', 'optimistic', 'adverse']).default('central'),
  sector: z.string().max(120).default('industriel'),
});

// Imports volumineux (leasing/factoring) : validation permissive mais typée aux bords.
export const leasingImportSchema = z.object({
  contract_ref: z.string().max(80).optional(),
  status: z.string().max(40).optional(),
}).passthrough();

export const factoringInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(80),
  debtorId: z.string().trim().min(1).max(80),
  amount: amount,
  issueDate: z.string().max(40).optional(),
  dueDate: z.string().max(40).optional(),
}).passthrough();

export const lawyerBailiffSchema = z.object({
  name: z.string().trim().min(2).max(255),
  firm: z.string().max(255).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
});

// ---------- P1.5 — Communication ----------
export const webhookStatusSchema = z.object({
  messageId: z.string().optional(),
  providerMessageId: z.string().optional(),
  status: z.enum(['queued', 'sent', 'delivered', 'failed', 'bounced', 'rejected', 'simulated']).optional(),
  event: z.string().optional(),
  errorCode: z.string().max(100).optional(),
  errorMessage: z.string().max(1000).optional(),
  timestamp: z.string().optional(),
  meta: z.any().optional(),
}).passthrough();

// ---------- P1.7 — MFA & SSO ----------
export const mfaSetupSchema = z.object({});

export const mfaVerifySchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export const mfaDisableSchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(10).max(500),
});

export const loginMfaSchema = z.object({
  email: z.string().trim().min(3).max(255),
  mfaCode: z.string().trim().min(6).max(8),
  mfaToken: z.string().trim().min(10).max(2000).optional(),
});
