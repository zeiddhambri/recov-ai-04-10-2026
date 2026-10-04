// Mock data for the Analytics page
// Realistic data shaped for a Tunisian banking recovery SaaS (RecovAI)

export const AGENTS = ['Agent Démo 1', 'Agent Démo 2', 'Agent Démo 3', 'Agent Démo 4', 'Karim S.'] as const;
export type Agent = typeof AGENTS[number];

// ───────────────────────────────────────────────────────────
// SECTION 1 — KPI Overview
// ───────────────────────────────────────────────────────────
export const kpis = {
  dso: { value: 67, prevValue: 74, unit: 'jours', label: 'DSO' },
  recoveryRate: { value: 32.4, prevValue: 27.8, unit: '%', label: 'Taux de recouvrement' },
  efficiency: { value: 78.2, prevValue: 71.5, unit: '%', label: 'Efficacité collecte' },
  resolution: { value: 45, prevValue: 53, unit: 'jours', label: 'Délai moyen résolution' },
};

// ───────────────────────────────────────────────────────────
// SECTION 2 — Cash Flow Forecast (90 jours)
// ───────────────────────────────────────────────────────────
function generateCashFlow() {
  const data = [];
  const today = new Date();
  for (let i = -7; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseDue = isWeekend ? 0 : 35000 + Math.random() * 80000;
    const confirmed = i < 0 ? baseDue * (0.65 + Math.random() * 0.2) : baseDue * (0.45 + Math.random() * 0.15);
    const expected = baseDue * (0.70 + Math.random() * 0.2);
    data.push({
      date: d.toISOString().slice(5, 10),
      dateFull: d.toISOString().slice(0, 10),
      due: Math.round(baseDue),
      confirmed: Math.round(confirmed),
      expected: Math.round(expected),
      uncertaintyLow: Math.round(confirmed),
      uncertaintyHigh: Math.round(expected),
      isToday: i === 0,
      annotation: i === 14 ? 'Échéance plan ALPHA' : i === 32 ? 'Promesse MEDITERANEE' : i === 60 ? 'Échéance trimestre' : null,
    });
  }
  return data;
}
export const cashFlowData = generateCashFlow();

export const cashFlowSummary = {
  confirmed30: cashFlowData.filter(d => !d.dateFull.startsWith('2024') ? false : true).slice(7, 37).reduce((s, d) => s + d.confirmed, 0) || 1245000,
  expected30: 1820000,
  atRisk90: 4350000,
};

// ───────────────────────────────────────────────────────────
// SECTION 3a — Recovery rate over 12 months per agent
// ───────────────────────────────────────────────────────────
const months = ['Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'];
export const recoveryByAgent = months.map((m, i) => {
  const trend = i / 11; // upward trend
  return {
    month: m,
    'Agent Démo 1': 22 + trend * 12 + Math.random() * 4,
    'Agent Démo 2': 18 + trend * 10 + Math.random() * 3,
    'Agent Démo 3': 28 + trend * 14 + Math.random() * 3,
    'Agent Démo 4': 20 + trend * 8 + Math.random() * 4,
    'Karim S.': 15 + trend * 9 + Math.random() * 3,
    Moyenne: 21 + trend * 10,
    Benchmark: 28, // industry average
  };
}).map(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(1) : v])));

// ───────────────────────────────────────────────────────────
// SECTION 3b — Action Effectiveness per channel
// ───────────────────────────────────────────────────────────
export const channelEffectiveness = [
  { channel: 'Appel', sent: 1245, success: 712, rate: 57.2 },
  { channel: 'WhatsApp', sent: 3420, success: 1620, rate: 47.4 },
  { channel: 'SMS', sent: 5680, success: 1985, rate: 35.0 },
  { channel: 'Email', sent: 4220, success: 1098, rate: 26.0 },
  { channel: 'Courrier', sent: 890, success: 178, rate: 20.0 },
].sort((a, b) => b.rate - a.rate);

// ───────────────────────────────────────────────────────────
// SECTION 4 — Agent Performance Table
// ───────────────────────────────────────────────────────────
export const agentPerformance = [
  { agent: 'Agent Démo 3', assigned: 87, totalManaged: 4250000, recovered: 1520000, recoveryRate: 35.8, actions: 1240, avgResponse: 3.2, top: true, sparkline: [22, 25, 28, 27, 30, 32, 31, 34, 33, 35, 36, 35.8] },
  { agent: 'Agent Démo 1', assigned: 72, totalManaged: 3120000, recovered: 980000, recoveryRate: 31.4, actions: 1080, avgResponse: 4.1, top: false, sparkline: [18, 20, 22, 24, 25, 26, 28, 29, 30, 30, 31, 31.4] },
  { agent: 'Agent Démo 2', assigned: 65, totalManaged: 2840000, recovered: 760000, recoveryRate: 26.8, actions: 920, avgResponse: 5.5, top: false, sparkline: [15, 17, 18, 20, 21, 22, 23, 24, 25, 25, 26, 26.8] },
  { agent: 'Agent Démo 4', assigned: 58, totalManaged: 1980000, recovered: 510000, recoveryRate: 25.8, actions: 760, avgResponse: 6.2, top: false, sparkline: [14, 16, 17, 18, 19, 21, 22, 22, 23, 24, 25, 25.8] },
  { agent: 'Karim S.', assigned: 49, totalManaged: 1560000, recovered: 320000, recoveryRate: 20.5, actions: 590, avgResponse: 7.8, top: false, improvement: true, sparkline: [12, 13, 14, 14, 15, 16, 17, 18, 18, 19, 20, 20.5] },
];

// ───────────────────────────────────────────────────────────
// SECTION 5 — Resolution Funnel
// ───────────────────────────────────────────────────────────
export const funnelData = [
  { stage: 'Total dossiers', value: 1240, fill: 'hsl(220, 25%, 22%)' },
  { stage: 'Contactés', value: 1080, fill: 'hsl(220, 40%, 35%)' },
  { stage: 'Répondu', value: 720, fill: 'hsl(200, 60%, 45%)' },
  { stage: 'Promesse paiement', value: 480, fill: 'hsl(170, 60%, 45%)' },
  { stage: 'Plan actif', value: 340, fill: 'hsl(150, 60%, 45%)' },
  { stage: 'Recouvré', value: 215, fill: 'hsl(140, 70%, 40%)' },
];

// ───────────────────────────────────────────────────────────
// SECTION 6 — Aging Analysis Heatmap
// ───────────────────────────────────────────────────────────
export const agingBuckets = ['0-30j', '31-60j', '61-90j', '91-180j', '> 180j'] as const;
export const riskLevels = ['Faible', 'Modéré', 'Élevé', 'Critique'] as const;

export const agingHeatmap = riskLevels.map(risk => ({
  risk,
  cells: agingBuckets.map(bucket => {
    // generate amounts that grow with risk and aging
    const riskMult = riskLevels.indexOf(risk) + 1;
    const ageMult = agingBuckets.indexOf(bucket) + 1;
    const amount = Math.round((50000 + riskMult * ageMult * 35000 + Math.random() * 80000));
    const count = Math.round(5 + riskMult * ageMult + Math.random() * 8);
    return { bucket, amount, count };
  }),
}));
