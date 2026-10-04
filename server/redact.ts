// RecovAI — Pseudonymisation avant appel à un service d'IA externe (lot P1.4).
//
// Objectif : ne jamais transmettre d'identifiants nominatifs bruts à un modèle
// tiers lorsque l'analyse n'en a pas besoin (notes prudentielles, synthèses de
// portefeuille, analyses de rapport). Désactivable par AI_REDACT=off pour le
// mode local/on-prem (LE LLM hébergé chez la banque est alors le bon réglage).

export interface RedactStats {
  phones: number;
  emails: number;
  ids: number;
  names: number;
}

export interface Redacted {
  text: string;
  stats: RedactStats;
}

// Deux formes seulement : international +216…, ou national AVEC séparateurs
// (« 71 234 567 », « 22.123.456 »). Un bloc de 8 chiffres sans séparateur est
// traité comme identifiant (CIN), jamais comme téléphone.
const PHONE_RE = /(?:\+?216[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3})|\b\d{2}[\s.-]\d{3}[\s.-]\d{3}\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// CIN/RI/MF à 8 chiffres, matricules, numéros de compte 20+ chiffres.
const ID_RE = /\b\d{8}\b|\b\d{20,30}\b/g;
// « Civilité + Prénom Nom » / raisons sociales bancaires en majuscules accentuées.
const CIV_RE = /\b(M\.|Mme|Mlle|Dr\.?|Me)\s+[A-ZÀ-Ü][\w'À-ü-]+(?:\s+[A-ZÀ-Ü][\w'À-ü-]+)?/g;
const COMPANY_RE = /\b(?:SOCI[ÉE]T[ÉE]|ENTREPRISE|GROUPE|COMPAGNIE)\s+[A-ZÀ-Ü][A-Z0-9À-Ü\s'&.-]{3,40}?(?:\s+(?:S\.?A\.?R\.?L\.?|S\.?A\.?|TA|EURL)|\b)/g;

export function isRedactEnabled(): boolean {
  return (process.env.AI_REDACT || 'on').toLowerCase() !== 'off';
}

export function redactPii(input: string): Redacted {
  const stats: RedactStats = { phones: 0, emails: 0, ids: 0, names: 0 };
  let text = String(input ?? '');

  text = text.replace(COMPANY_RE, m => { stats.names++; return `[ENTITE_${stats.names}]`; });
  text = text.replace(CIV_RE, m => { stats.names++; return `[PERSONNE_${stats.names}]`; });
  text = text.replace(PHONE_RE, m => { stats.phones++; return `[TELEPHONE_${stats.phones}]`; });
  text = text.replace(EMAIL_RE, m => { stats.emails++; return `[EMAIL_${stats.emails}]`; });
  text = text.replace(ID_RE, m => { stats.ids++; return `[IDENTIFIANT_${stats.ids}]`; });

  return { text, stats };
}

/** Applique la pseudonymisation à un objet sérialisé pour prompt IA. */
export function redactForPrompt(obj: unknown): { text: string; stats: RedactStats | null; redacted: boolean } {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj ?? {}, null, 2);
  if (!isRedactEnabled()) return { text: json, stats: null, redacted: false };
  const { text, stats } = redactPii(json);
  return { text, stats, redacted: true };
}
