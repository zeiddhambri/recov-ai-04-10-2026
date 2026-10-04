// PDF templates for the Litigation module — uses @react-pdf/renderer.
// Three French legal templates: Mise en demeure, Relance pré-contentieux,
// Injonction de payer.

import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { LitigationCase, CREDITOR, totalAmount } from './litigation-mock';

// ─── Styles ───
const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2 solid #b91c1c', paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#b91c1c', letterSpacing: 1 },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  meta: { fontSize: 9, color: '#374151', textAlign: 'right' },
  recipient: { marginTop: 30, marginBottom: 30, padding: 12, border: '0.5 solid #d1d5db', backgroundColor: '#f9fafb' },
  recipientTitle: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refLine: { marginTop: 16, marginBottom: 24, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  paragraph: { marginBottom: 12, textAlign: 'justify' },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 16, marginBottom: 16, border: '0.5 solid #d1d5db' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1f2937', color: 'white', padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: '0.5 solid #e5e7eb', fontSize: 9 },
  totalRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fef2f2', fontFamily: 'Helvetica-Bold', borderTop: '1 solid #b91c1c' },
  col1: { flex: 2 }, col2: { flex: 1.2 }, col3: { flex: 1.2 }, col4: { flex: 1, textAlign: 'right' },
  signature: { marginTop: 40, alignItems: 'flex-end' },
  signatureName: { fontFamily: 'Helvetica-Bold', marginTop: 30 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 7, color: '#9ca3af', textAlign: 'center', borderTop: '0.5 solid #e5e7eb', paddingTop: 8 },
  warningBox: { padding: 10, backgroundColor: '#fef2f2', border: '1 solid #fca5a5', marginBottom: 16 },
});

const fmtTND = (n: number) => `${n.toLocaleString('fr-FR')} TND`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
const today = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Shared header ───
const PdfHeader = ({ ref }: { ref: string }) => (
  <View style={styles.header}>
    <View>
      <Text style={styles.brand}>{CREDITOR.name}</Text>
      <Text style={styles.brandSub}>{CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city}</Text>
      <Text style={styles.brandSub}>Tél : {CREDITOR.phone} · {CREDITOR.email}</Text>
    </View>
    <View style={styles.meta}>
      <Text>Réf. : {ref}</Text>
      <Text>Tunis, le {today()}</Text>
    </View>
  </View>
);

const PdfFooter = () => (
  <Text style={styles.footer} fixed>
    {CREDITOR.name} — {CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city} — RC : {CREDITOR.siren}
  </Text>
);

const RecipientBlock = ({ c }: { c: LitigationCase }) => (
  <View style={styles.recipient}>
    <Text style={styles.recipientTitle}>Destinataire</Text>
    <Text style={styles.bold}>{c.debtor.name}</Text>
    {c.debtor.contact && <Text>À l'attention de {c.debtor.contact}</Text>}
    <Text>{c.debtor.address}</Text>
    <Text>{c.debtor.zip} {c.debtor.city}</Text>
    {c.debtor.siren && <Text style={{ marginTop: 4, color: '#6b7280' }}>SIREN/MF : {c.debtor.siren}</Text>}
  </View>
);

const InvoiceTable = ({ c }: { c: LitigationCase }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      <Text style={styles.col1}>Référence</Text>
      <Text style={styles.col2}>Date d'émission</Text>
      <Text style={styles.col3}>Échéance</Text>
      <Text style={styles.col4}>Montant</Text>
    </View>
    {c.invoices.map(inv => (
      <View key={inv.ref} style={styles.tableRow}>
        <Text style={styles.col1}>{inv.ref}</Text>
        <Text style={styles.col2}>{fmtDate(inv.date)}</Text>
        <Text style={styles.col3}>{fmtDate(inv.dueDate)}</Text>
        <Text style={styles.col4}>{fmtTND(inv.amount)}</Text>
      </View>
    ))}
    <View style={styles.totalRow}>
      <Text style={styles.col1}>TOTAL DÛ</Text>
      <Text style={styles.col2}></Text>
      <Text style={styles.col3}></Text>
      <Text style={styles.col4}>{fmtTND(totalAmount(c))}</Text>
    </View>
  </View>
);

// ═════════════════════════════════════════════
// 1. MISE EN DEMEURE
// ═════════════════════════════════════════════
const MiseEnDemeure = ({ c }: { c: LitigationCase }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PdfHeader ref={`MED-${c.id}`} />
      <RecipientBlock c={c} />
      <Text style={{ fontSize: 8, color: '#6b7280' }}>Lettre Recommandée avec Accusé de Réception</Text>
      <Text style={styles.refLine}>Objet : MISE EN DEMEURE de payer — Dossier {c.id}</Text>
      <Text style={styles.paragraph}>Madame, Monsieur,</Text>
      <Text style={styles.paragraph}>
        Malgré nos précédentes relances restées sans effet, nous constatons que vous demeurez
        redevable envers <Text style={styles.bold}>{CREDITOR.name}</Text> de la somme totale de{' '}
        <Text style={styles.bold}>{fmtTND(totalAmount(c))}</Text> au titre de la (des) facture(s) suivante(s) :
      </Text>
      <InvoiceTable c={c} />
      <Text style={styles.paragraph}>
        Cette somme est exigible et productive d'intérêts au taux légal de{' '}
        <Text style={styles.bold}>{c.interestRate}%</Text> par an depuis la date d'échéance.
      </Text>
      <View style={styles.warningBox}>
        <Text style={styles.bold}>
          Par la présente, nous vous mettons en demeure de procéder au règlement intégral
          dans un délai de QUINZE (15) JOURS à compter de la réception de la présente.
        </Text>
      </View>
      <Text style={styles.paragraph}>
        À défaut de paiement dans le délai imparti, nous nous verrons contraints d'engager,
        sans nouvel avis, toutes procédures judiciaires nécessaires (injonction de payer,
        référé-provision, saisies) aux fins de recouvrement, à vos frais et risques.
      </Text>
      <Text style={styles.paragraph}>
        Le règlement peut être effectué par virement bancaire au compte :{' '}
        <Text style={styles.bold}>{CREDITOR.rib}</Text>.
      </Text>
      <Text style={styles.paragraph}>Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</Text>
      <View style={styles.signature}>
        <Text>Le Service Contentieux</Text>
        <Text style={styles.signatureName}>{CREDITOR.name}</Text>
      </View>
      <PdfFooter />
    </Page>
  </Document>
);

// ═════════════════════════════════════════════
// 2. RELANCE AVANT CONTENTIEUX
// ═════════════════════════════════════════════
const RelancePreContentieux = ({ c }: { c: LitigationCase }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PdfHeader ref={`PRE-${c.id}`} />
      <RecipientBlock c={c} />
      <Text style={styles.refLine}>Objet : Dernière relance amiable avant procédure contentieuse</Text>
      <Text style={styles.paragraph}>Madame, Monsieur,</Text>
      <Text style={styles.paragraph}>
        Sauf erreur ou omission de notre part, nous n'avons toujours pas réceptionné votre règlement
        relatif à la (aux) facture(s) ci-dessous, malgré nos précédentes relances :
      </Text>
      <InvoiceTable c={c} />
      <Text style={styles.paragraph}>
        Nous vous invitons à régulariser cette situation sous{' '}
        <Text style={styles.bold}>HUIT (8) JOURS</Text> afin d'éviter l'engagement d'une procédure
        contentieuse qui occasionnerait des frais supplémentaires à votre charge (intérêts moratoires,
        frais d'huissier, frais de procédure, honoraires d'avocat).
      </Text>
      <Text style={styles.paragraph}>
        Si un différend ou une difficulté ponctuelle de trésorerie est à l'origine de ce retard,
        nous vous invitons à prendre contact dans les plus brefs délais avec notre service contentieux
        au {CREDITOR.phone} afin de convenir d'un échéancier amiable.
      </Text>
      <Text style={styles.paragraph}>
        Dans l'attente de votre règlement ou de votre prise de contact, nous vous prions d'agréer,
        Madame, Monsieur, nos salutations distinguées.
      </Text>
      <View style={styles.signature}>
        <Text>Le Service Contentieux</Text>
        <Text style={styles.signatureName}>{CREDITOR.name}</Text>
      </View>
      <PdfFooter />
    </Page>
  </Document>
);

// ═════════════════════════════════════════════
// 3. INJONCTION DE PAYER
// ═════════════════════════════════════════════
const InjonctionDePayer = ({ c }: { c: LitigationCase }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PdfHeader ref={`INJ-${c.id}`} />
      <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 10, marginBottom: 4 }}>
        REQUÊTE EN INJONCTION DE PAYER
      </Text>
      <Text style={{ fontSize: 9, textAlign: 'center', color: '#6b7280', marginBottom: 24 }}>
        Présentée à Monsieur le Président du {c.court.name}
      </Text>

      <Text style={[styles.bold, { marginBottom: 4 }]}>POUR :</Text>
      <Text>{CREDITOR.name}, dont le siège social est situé {CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city}.</Text>
      <Text>Immatriculée au RC sous le n° {CREDITOR.siren}.</Text>
      <Text style={{ marginTop: 4 }}>Représentée par son représentant légal en exercice.</Text>
      <Text style={{ marginTop: 4 }}>Ayant pour avocat : <Text style={styles.bold}>{c.lawyer.name}</Text>, {c.lawyer.firm}.</Text>

      <Text style={[styles.bold, { marginTop: 14, marginBottom: 4 }]}>CONTRE :</Text>
      <Text>{c.debtor.name}, demeurant {c.debtor.address}, {c.debtor.zip} {c.debtor.city}.</Text>
      {c.debtor.siren && <Text>Immatriculé(e) sous le n° {c.debtor.siren}.</Text>}

      <Text style={[styles.bold, { marginTop: 18, marginBottom: 6 }]}>EXPOSÉ DES FAITS</Text>
      <Text style={styles.paragraph}>
        La requérante a fourni au défendeur des prestations dont le règlement est constaté par les
        factures suivantes, demeurées impayées à ce jour malgré une mise en demeure régulièrement
        notifiée :
      </Text>
      <InvoiceTable c={c} />

      <Text style={[styles.bold, { marginTop: 12, marginBottom: 6 }]}>DISCUSSION</Text>
      <Text style={styles.paragraph}>
        La créance est <Text style={styles.bold}>certaine, liquide et exigible</Text>. Elle résulte
        de prestations effectivement réalisées et acceptées sans contestation. La mise en demeure
        adressée le {c.events.find(e => e.type === 'document_filed')?.date ? fmtDate(c.events.find(e => e.type === 'document_filed')!.date) : '—'} est restée sans effet.
      </Text>
      <Text style={styles.paragraph}>
        Conformément aux dispositions du Code de procédure civile et commerciale, la requérante est
        fondée à solliciter de votre juridiction qu'il soit enjoint au défendeur de procéder au
        règlement de la somme due, augmentée des intérêts au taux de {c.interestRate}% à compter
        de l'échéance.
      </Text>

      <Text style={[styles.bold, { marginTop: 12, marginBottom: 6 }]}>PAR CES MOTIFS</Text>
      <Text style={styles.paragraph}>
        Vu les pièces produites, plaise à Monsieur le Président :
      </Text>
      <Text style={{ marginLeft: 18, marginBottom: 4 }}>• ENJOINDRE au défendeur de payer à la requérante la somme de {fmtTND(totalAmount(c))} ;</Text>
      <Text style={{ marginLeft: 18, marginBottom: 4 }}>• Y AJOUTER les intérêts au taux légal de {c.interestRate}% à compter de l'échéance ;</Text>
      <Text style={{ marginLeft: 18, marginBottom: 4 }}>• CONDAMNER le défendeur aux entiers frais et dépens de l'instance.</Text>

      <View style={styles.signature}>
        <Text style={{ marginTop: 24 }}>Fait à Tunis, le {today()}</Text>
        <Text style={styles.signatureName}>{c.lawyer.name}</Text>
        <Text style={{ fontSize: 9, color: '#6b7280' }}>Avocat à la Cour</Text>
      </View>
      <PdfFooter />
    </Page>
  </Document>
);

// ═════════════════════════════════════════════
// Public API
// ═════════════════════════════════════════════
export type TemplateKey = 'mise_en_demeure' | 'relance_pre_contentieux' | 'injonction_de_payer';

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  mise_en_demeure: 'Mise en demeure (LRAR)',
  relance_pre_contentieux: 'Relance avant contentieux',
  injonction_de_payer: 'Injonction de payer',
};

export const TEMPLATE_DESCRIPTIONS: Record<TemplateKey, string> = {
  mise_en_demeure: 'Sommation formelle avec délai de 15 jours, à envoyer en LRAR.',
  relance_pre_contentieux: 'Dernière relance amiable avant ouverture de procédure (8 jours).',
  injonction_de_payer: 'Requête juridictionnelle au Président du Tribunal compétent.',
};

export async function generatePdfBlob(template: TemplateKey, c: LitigationCase): Promise<Blob> {
  const doc =
    template === 'mise_en_demeure' ? <MiseEnDemeure c={c} />
    : template === 'relance_pre_contentieux' ? <RelancePreContentieux c={c} />
    : <InjonctionDePayer c={c} />;
  return await pdf(doc).toBlob();
}

export async function downloadPdf(template: TemplateKey, c: LitigationCase) {
  const blob = await generatePdfBlob(template, c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${TEMPLATE_LABELS[template].replace(/[^\w]+/g, '_')}_${c.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
