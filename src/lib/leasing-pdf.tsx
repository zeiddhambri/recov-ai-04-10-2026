// PDF templates for the Leasing module — uses @react-pdf/renderer.
// Three French legal templates specific to leasing:
// 1. Mise en demeure leasing
// 2. Lettre de résiliation
// 3. PV de restitution

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { LeasingContract, totalOverdue, overdueCount, calcIndemnity, ASSET_TYPE_CONFIG, TERMINATION_FORMULA_LABELS } from './leasing-mock';
import { CREDITOR } from './litigation-mock';

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2 solid #0d9488', paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d9488', letterSpacing: 1 },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  meta: { fontSize: 9, color: '#374151', textAlign: 'right' },
  recipient: { marginTop: 30, marginBottom: 30, padding: 12, border: '0.5 solid #d1d5db', backgroundColor: '#f9fafb' },
  recipientTitle: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  refLine: { marginTop: 16, marginBottom: 24, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  paragraph: { marginBottom: 12, textAlign: 'justify' },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 16, marginBottom: 16, border: '0.5 solid #d1d5db' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0d9488', color: 'white', padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: '0.5 solid #e5e7eb', fontSize: 9 },
  totalRow: { flexDirection: 'row', padding: 8, backgroundColor: '#f0fdfa', fontFamily: 'Helvetica-Bold', borderTop: '1 solid #0d9488' },
  col1: { flex: 2 }, col2: { flex: 1.2 }, col3: { flex: 1.2 }, col4: { flex: 1, textAlign: 'right' },
  signature: { marginTop: 40, alignItems: 'flex-end' },
  signatureName: { fontFamily: 'Helvetica-Bold', marginTop: 30 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 7, color: '#9ca3af', textAlign: 'center', borderTop: '0.5 solid #e5e7eb', paddingTop: 8 },
  warningBox: { padding: 10, backgroundColor: '#fef2f2', border: '1 solid #fca5a5', marginBottom: 16 },
  infoBox:    { padding: 10, backgroundColor: '#f0fdfa', border: '1 solid #5eead4', marginBottom: 16 },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  cell: { flex: 1, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4 },
  cellLabel: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  cellValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
});

const fmtTND = (n: number) => `${n.toLocaleString('fr-FR')} TND`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
const today = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

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
    {CREDITOR.name} — Pôle Leasing — {CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city} — RC : {CREDITOR.siren}
  </Text>
);

const RecipientBlock = ({ c }: { c: LeasingContract }) => (
  <View style={styles.recipient}>
    <Text style={styles.recipientTitle}>Destinataire — Crédit-preneur</Text>
    <Text style={styles.bold}>{c.lessee.name}</Text>
    {c.lessee.contact && <Text>À l'attention de {c.lessee.contact}</Text>}
    <Text>{c.lessee.address}</Text>
    <Text>{c.lessee.zip} {c.lessee.city}</Text>
    {c.lessee.siren && <Text style={{ marginTop: 4, color: '#6b7280' }}>SIREN/MF : {c.lessee.siren}</Text>}
  </View>
);

const ContractInfoBlock = ({ c }: { c: LeasingContract }) => (
  <View style={styles.twoCol}>
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>Contrat</Text>
      <Text style={styles.cellValue}>{c.id}</Text>
      <Text style={{ fontSize: 9, marginTop: 2 }}>Signé le {fmtDate(c.startDate)}</Text>
    </View>
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>Bien financé</Text>
      <Text style={styles.cellValue}>{ASSET_TYPE_CONFIG[c.asset.type].label}</Text>
      <Text style={{ fontSize: 9, marginTop: 2 }}>{c.asset.description}</Text>
    </View>
  </View>
);

// 1. MISE EN DEMEURE LEASING
const MiseEnDemeureLeasing = ({ c }: { c: LeasingContract }) => {
  const overdueAmt = totalOverdue(c);
  const overdueNb = overdueCount(c);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader ref={`MED-LEAS-${c.id}`} />
        <RecipientBlock c={c} />
        <Text style={{ fontSize: 8, color: '#6b7280' }}>Lettre Recommandée avec Accusé de Réception</Text>
        <Text style={styles.refLine}>Objet : MISE EN DEMEURE — Contrat de crédit-bail {c.id}</Text>
        <ContractInfoBlock c={c} />
        <Text style={styles.paragraph}>Madame, Monsieur,</Text>
        <Text style={styles.paragraph}>
          Aux termes du contrat de crédit-bail référencé ci-dessus, vous vous êtes engagé(e) au paiement de loyers mensuels d'un montant de{' '}
          <Text style={styles.bold}>{fmtTND(c.financials.monthlyRent)}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          À ce jour, nous constatons que <Text style={styles.bold}>{overdueNb} loyer(s)</Text> demeurent impayés, pour un montant total de{' '}
          <Text style={styles.bold}>{fmtTND(overdueAmt)}</Text>, malgré nos précédentes relances restées sans effet.
        </Text>
        <View style={styles.warningBox}>
          <Text style={styles.bold}>
            Par la présente, nous vous mettons en demeure de régulariser intégralement votre situation dans un délai de HUIT (8) JOURS à compter de la réception de la présente.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          À défaut de règlement dans le délai imparti, nous serons contraints, conformément aux clauses du contrat :
        </Text>
        <Text style={{ marginLeft: 18, marginBottom: 4 }}>• De prononcer la résiliation anticipée du contrat de plein droit ;</Text>
        <Text style={{ marginLeft: 18, marginBottom: 4 }}>• D'exiger la restitution immédiate du bien financé ;</Text>
        <Text style={{ marginLeft: 18, marginBottom: 4 }}>• De réclamer le paiement de l'indemnité contractuelle de résiliation, calculée selon la formule « {TERMINATION_FORMULA_LABELS[c.financials.terminationFormula]} » ;</Text>
        <Text style={{ marginLeft: 18, marginBottom: 12 }}>• D'engager toute procédure judiciaire utile au recouvrement des sommes dues, à vos frais et risques.</Text>
        <Text style={styles.paragraph}>
          Le règlement peut être effectué par virement au compte : <Text style={styles.bold}>{CREDITOR.rib}</Text>.
        </Text>
        <Text style={styles.paragraph}>Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</Text>
        <View style={styles.signature}>
          <Text>Le Pôle Leasing</Text>
          <Text style={styles.signatureName}>{CREDITOR.name}</Text>
        </View>
        <PdfFooter />
      </Page>
    </Document>
  );
};

// 2. LETTRE DE RÉSILIATION
const LettreResiliation = ({ c }: { c: LeasingContract }) => {
  const indemnity = calcIndemnity(c);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader ref={`RES-LEAS-${c.id}`} />
        <RecipientBlock c={c} />
        <Text style={{ fontSize: 8, color: '#6b7280' }}>Lettre Recommandée avec Accusé de Réception</Text>
        <Text style={styles.refLine}>Objet : RÉSILIATION ANTICIPÉE — Contrat de crédit-bail {c.id}</Text>
        <ContractInfoBlock c={c} />
        <Text style={styles.paragraph}>Madame, Monsieur,</Text>
        <Text style={styles.paragraph}>
          Faisant suite à notre mise en demeure restée sans effet, et conformément aux dispositions contractuelles régissant notre convention de crédit-bail référencée ci-dessus,
          nous vous notifions par la présente la <Text style={styles.bold}>RÉSILIATION ANTICIPÉE DE PLEIN DROIT</Text> du contrat, prononcée à effet immédiat.
        </Text>
        <View style={styles.infoBox}>
          <Text style={[styles.bold, { marginBottom: 6 }]}>Conséquences de la résiliation</Text>
          <Text style={{ marginLeft: 12, marginBottom: 3 }}>• Indemnité contractuelle (formule « {TERMINATION_FORMULA_LABELS[c.financials.terminationFormula]} ») : <Text style={styles.bold}>{fmtTND(indemnity)}</Text></Text>
          <Text style={{ marginLeft: 12, marginBottom: 3 }}>• Capital restant dû : {fmtTND(c.financials.remainingCapital)}</Text>
          <Text style={{ marginLeft: 12, marginBottom: 3 }}>• Loyers échus impayés : {fmtTND(totalOverdue(c))}</Text>
        </View>
        <Text style={styles.paragraph}>
          Vous êtes tenu(e) de procéder à la <Text style={styles.bold}>restitution immédiate</Text> du bien financé en bon état de fonctionnement, dans un délai de HUIT (8) JOURS,
          à l'adresse suivante : {CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city}.
        </Text>
        <Text style={styles.paragraph}>
          Un procès-verbal de restitution contradictoire sera établi le jour de la remise du bien.
          À défaut de restitution amiable, nous nous réservons le droit d'engager toute procédure de récupération forcée, et notamment de solliciter une ordonnance d'enlèvement.
        </Text>
        <Text style={styles.paragraph}>
          Le solde des sommes dues, après déduction de la valeur de revente du bien restitué, demeurera à votre charge et fera l'objet d'un décompte définitif qui vous sera notifié séparément.
        </Text>
        <Text style={styles.paragraph}>Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</Text>
        <View style={styles.signature}>
          <Text>Le Directeur du Pôle Leasing</Text>
          <Text style={styles.signatureName}>{CREDITOR.name}</Text>
        </View>
        <PdfFooter />
      </Page>
    </Document>
  );
};

// 3. PV DE RESTITUTION
const PvRestitution = ({ c }: { c: LeasingContract }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <PdfHeader ref={`PVR-LEAS-${c.id}`} />
      <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 10, marginBottom: 4 }}>
        PROCÈS-VERBAL DE RESTITUTION
      </Text>
      <Text style={{ fontSize: 9, textAlign: 'center', color: '#6b7280', marginBottom: 24 }}>
        Établi contradictoirement le {today()}
      </Text>
      <Text style={[styles.bold, { marginBottom: 4 }]}>ENTRE :</Text>
      <Text>{CREDITOR.name} (« le Crédit-bailleur »), {CREDITOR.address}, {CREDITOR.zip} {CREDITOR.city}.</Text>
      <Text style={[styles.bold, { marginTop: 14, marginBottom: 4 }]}>ET :</Text>
      <Text>{c.lessee.name} (« le Crédit-preneur »), {c.lessee.address}, {c.lessee.zip} {c.lessee.city}.</Text>

      <Text style={[styles.bold, { marginTop: 18, marginBottom: 6 }]}>OBJET DU CONTRAT RÉSILIÉ</Text>
      <View style={styles.twoCol}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Référence contrat</Text>
          <Text style={styles.cellValue}>{c.id}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Date de signature</Text>
          <Text style={styles.cellValue}>{fmtDate(c.startDate)}</Text>
        </View>
      </View>

      <Text style={[styles.bold, { marginTop: 6, marginBottom: 6 }]}>BIEN RESTITUÉ</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}><Text style={styles.col1}>Type</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{ASSET_TYPE_CONFIG[c.asset.type].label}</Text></View>
        <View style={styles.tableRow}><Text style={styles.col1}>Description</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{c.asset.description}</Text></View>
        {c.asset.brand && <View style={styles.tableRow}><Text style={styles.col1}>Marque</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{c.asset.brand}</Text></View>}
        {c.asset.model && <View style={styles.tableRow}><Text style={styles.col1}>Modèle</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{c.asset.model}</Text></View>}
        {c.asset.serial && <View style={styles.tableRow}><Text style={styles.col1}>N° de série</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{c.asset.serial}</Text></View>}
        <View style={styles.tableRow}><Text style={styles.col1}>Valeur d'origine</Text><Text style={[styles.col4, { textAlign: 'left', flex: 3 }]}>{fmtTND(c.asset.acquisitionValue)}</Text></View>
      </View>

      <Text style={[styles.bold, { marginTop: 6, marginBottom: 6 }]}>ÉTAT DU BIEN À LA RESTITUTION</Text>
      <View style={{ border: '0.5 solid #d1d5db', padding: 10, minHeight: 80, marginBottom: 10 }}>
        <Text style={{ fontSize: 9, color: '#6b7280' }}>État constaté contradictoirement par les parties :</Text>
        <Text style={{ marginTop: 8 }}>{c.termination?.assetReturn?.notes || '___________________________________________________________________'}</Text>
      </View>

      <Text style={[styles.bold, { marginTop: 6, marginBottom: 6 }]}>RÉSERVES & OBSERVATIONS</Text>
      <View style={{ border: '0.5 solid #d1d5db', padding: 10, minHeight: 60, marginBottom: 16 }}>
        <Text style={{ fontSize: 9, color: '#6b7280' }}>Réserves formulées par le Crédit-bailleur :</Text>
        <Text style={{ marginTop: 8 }}>___________________________________________________________________</Text>
      </View>

      <Text style={styles.paragraph}>
        Fait en deux exemplaires originaux, dont un remis à chaque partie.
      </Text>

      <View style={[styles.twoCol, { marginTop: 30 }]}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Signature Crédit-preneur</Text>
          <Text style={{ marginTop: 30, fontSize: 9 }}>__________________________</Text>
          <Text style={{ fontSize: 9, marginTop: 2 }}>{c.lessee.contact || c.lessee.name}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Signature Crédit-bailleur</Text>
          <Text style={{ marginTop: 30, fontSize: 9 }}>__________________________</Text>
          <Text style={{ fontSize: 9, marginTop: 2 }}>Pour {CREDITOR.name}</Text>
        </View>
      </View>

      <PdfFooter />
    </Page>
  </Document>
);

// ───── Public API ─────
export type LeasingTemplateKey = 'mise_en_demeure_leasing' | 'lettre_resiliation' | 'pv_restitution';

export const LEASING_TEMPLATE_LABELS: Record<LeasingTemplateKey, string> = {
  mise_en_demeure_leasing: 'Mise en demeure leasing',
  lettre_resiliation:      'Lettre de résiliation anticipée',
  pv_restitution:          'PV de restitution du bien',
};

export const LEASING_TEMPLATE_DESCRIPTIONS: Record<LeasingTemplateKey, string> = {
  mise_en_demeure_leasing: 'Sommation formelle de régulariser dans 8 jours, à envoyer en LRAR.',
  lettre_resiliation:      'Notification de résiliation anticipée de plein droit + restitution sous 8 jours.',
  pv_restitution:          'Procès-verbal contradictoire de remise du bien financé.',
};

export async function generateLeasingPdfBlob(template: LeasingTemplateKey, c: LeasingContract): Promise<Blob> {
  const doc =
    template === 'mise_en_demeure_leasing' ? <MiseEnDemeureLeasing c={c} />
    : template === 'lettre_resiliation' ? <LettreResiliation c={c} />
    : <PvRestitution c={c} />;
  return await pdf(doc).toBlob();
}

export async function downloadLeasingPdf(template: LeasingTemplateKey, c: LeasingContract) {
  const blob = await generateLeasingPdfBlob(template, c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${LEASING_TEMPLATE_LABELS[template].replace(/[^\w]+/g, '_')}_${c.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
