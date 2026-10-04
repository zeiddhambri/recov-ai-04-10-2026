// RecovAI — P1.4 : pseudonymisation avant IA externe.
import { describe, it, expect } from 'vitest';
import { redactPii, redactForPrompt, isRedactEnabled } from './redact';

describe('redactPii', () => {
  it('masque les numéros de téléphone tunisiens', () => {
    const { text, stats } = redactPii('Appeler au +216 22.123.456 ou 71 234 567 pour rappel.');
    expect(text).not.toContain('22.123.456');
    expect(text).not.toContain('71 234 567');
    expect(text).toContain('[TELEPHONE_');
    expect(stats.phones).toBeGreaterThanOrEqual(2);
  });

  it('masque les e-mails', () => {
    const { text } = redactPii('Contact : mohamed.ben.ali@example.com.tn pour règlement.');
    expect(text).not.toContain('mohamed.ben.ali');
    expect(text).toContain('[EMAIL_1]');
  });

  it('masque les identifiants à 8 chiffres (CIN) et les comptes longs', () => {
    const { text } = redactPii('CIN 04567891 — compte 2012345678901234567890');
    expect(text).not.toContain('04567891');
    expect(text).not.toContain('2012345678901234567890');
    expect(text).toContain('[IDENTIFIANT_');
  });

  it('masque civilités+nom et raisons sociales', () => {
    const { text } = redactPii('Dossier de M. Ahmed TRABELSI contre SOCIETE EL AFIA SA.');
    expect(text).not.toContain('TRABELSI');
    expect(text).not.toContain('EL AFIA');
    expect(text).toContain('[PERSONNE_');
    expect(text).toContain('[ENTITE_');
  });

  it('redactForPrompt opère sur un objet JSON complet', () => {
    const out = redactForPrompt({ debtor: 'Mme Salma JEBALI', email: 's.jebali@x.tn', phone: '+216 98.111.222' });
    if (isRedactEnabled()) {
      expect(out.redacted).toBe(true);
      expect(out.text).not.toContain('JEBALI');
      expect(out.text).not.toContain('98.111.222');
    } else {
      expect(out.redacted).toBe(false);
    }
  });

  it('AI_REDACT=off désactive (LLM interne à la banque)', () => {
    process.env.AI_REDACT = 'off';
    const out = redactForPrompt({ phone: '+216 22.123.456' });
    expect(out.redacted).toBe(false);
    expect(out.text).toContain('22.123.456');
    delete process.env.AI_REDACT;
  });
});
