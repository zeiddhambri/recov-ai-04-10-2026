import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Tu combines l'expertise d'un Analyste Senior en Risque Crédit, d'un Risk Manager bancaire et d'un expert en modélisation prudentielle conforme aux standards internationaux (Bâle III).

RÔLE: Outil d'AIDE À LA DÉCISION exclusivement. Jamais de décision finale. Toute recommandation est assistée par IA, révisable par un analyste humain, soumise à validation institutionnelle obligatoire.

MISSION: À partir des données d'un dossier de crédit, tu dois :
1. Analyser selon les 5 piliers prudentiels pondérés
2. Produire un scoring pondéré transparent
3. Détecter les signaux d'alerte (red flags)
4. Générer une recommandation argumentée et auditable
5. Proposer une structuration adaptée

CADRE D'ÉVALUATION — 5 PILIERS PONDÉRÉS:
1. Capacité de Remboursement (30%) — DSCR, cash-flow, stabilité revenus, taux d'endettement projeté
2. Endettement et Structure Financière (25%) — debt-to-income, leverage, gearing, coverage ratios
3. Historique et Comportement Crédit (20%) — incidents, ancienneté relation, score bureau, défauts
4. Garanties et Mitigation du Risque (15%) — qualité collatéral, ratio couverture, exécutabilité
5. Risque Sectoriel et Facteurs Externes (10%) — vulnérabilité secteur, cyclicité, géographique

Score par pilier: Fort (90-100) | Acceptable (70-89) | Fragile (50-69) | Critique (<50)

SCORE GLOBAL = (P1×0.30) + (P2×0.25) + (P3×0.20) + (P4×0.15) + (P5×0.10)
Décisions: 80-100 Acceptation favorable | 65-79 Acceptation conditionnelle | 50-64 Révision approfondie | <50 Recommandation défavorable

RED FLAGS sur 4 niveaux (Faible/Modéré/Élevé/Critique) — Financiers, Comportementaux, Documentaires, Compliance.

GARDE-FOUS: INTERDIT d'utiliser sexe, origine, religion, nationalité, handicap. Critères économiques objectifs uniquement. Conforme Bâle III.

GESTION DONNÉES MANQUANTES: signaler chaque absence, principe de conservatisme, escalade si >30% manquant.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dossier } = await req.json();
    if (!dossier) {
      return new Response(JSON.stringify({ error: "dossier requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquante");

    const userPrompt = `DOSSIER_ID: ${dossier.id || "N/A"}
DATE_SOUMISSION: ${new Date().toISOString()}

=== IDENTIFICATION ===
Type client: ${dossier.type_client || "N/A"}
Identifiant: ${dossier.client_id || "N/A"}
Âge / Ancienneté: ${dossier.age_anciennete || "N/A"}
Situation professionnelle: ${dossier.situation_pro || "N/A"}
Secteur d'activité: ${dossier.secteur || "N/A"}
Forme juridique: ${dossier.forme_juridique || "N/A"}

=== FINANCEMENT DEMANDÉ ===
Produit: ${dossier.produit || "N/A"}
Montant: ${dossier.montant || 0} ${dossier.devise || "TND"}
Durée: ${dossier.duree_mois || "N/A"} mois
Objet: ${dossier.objet || "N/A"}
Taux demandé: ${dossier.taux_demande || "À définir"}

=== SITUATION FINANCIÈRE ===
Revenus nets mensuels: ${dossier.revenus || "N/A"}
Charges fixes mensuelles: ${dossier.charges || "N/A"}
Endettement mensuel existant: ${dossier.endettement_existant || "N/A"}
Apport / Épargne: ${dossier.apport || "N/A"}
Chiffre d'affaires annuel: ${dossier.ca || "N/A"}
EBITDA: ${dossier.ebitda || "N/A"}
Fonds propres: ${dossier.fonds_propres || "N/A"}

=== GARANTIES ===
Type collatéral: ${dossier.type_garantie || "Non précisé"}
Valeur estimée: ${dossier.valeur_garantie || "N/A"}
Qualité juridique: ${dossier.qualite_surete || "N/A"}

=== HISTORIQUE CRÉDIT ===
Statut historique: ${dossier.historique_credit || "N/A"}
Score bureau de crédit: ${dossier.score_credit || "N/A"}
Incidents 12 derniers mois: ${dossier.incidents_12m || "N/A"}
Ancienneté relation bancaire: ${dossier.anciennete_relation || "N/A"}

=== COMPLÉMENT ===
${dossier.extras || "Aucune"}

Produis l'analyse complète selon le framework 5 piliers.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "produire_analyse_credit",
            description: "Renvoie l'analyse crédit structurée selon le framework 5 piliers Bâle III.",
            parameters: {
              type: "object",
              properties: {
                resume: {
                  type: "object",
                  properties: {
                    type_financement: { type: "string" },
                    profil_emprunteur: { type: "string" },
                    niveau_risque_global: { type: "string", enum: ["Faible", "Modéré", "Élevé", "Critique"] },
                    recommandation_synthetique: { type: "string" },
                  },
                  required: ["type_financement", "profil_emprunteur", "niveau_risque_global", "recommandation_synthetique"],
                },
                donnees_analysees: {
                  type: "object",
                  properties: {
                    informations_utilisees: { type: "array", items: { type: "string" } },
                    donnees_manquantes: { type: "array", items: { type: "string" } },
                  },
                  required: ["informations_utilisees", "donnees_manquantes"],
                },
                piliers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      nom: { type: "string" },
                      ponderation: { type: "number" },
                      score_numerique: { type: "number" },
                      score_qualitatif: { type: "string", enum: ["Fort", "Acceptable", "Fragile", "Critique"] },
                      analyse: { type: "string" },
                      justification: { type: "string" },
                      indicateurs_cles: { type: "object", additionalProperties: { type: "string" } },
                    },
                    required: ["id", "nom", "ponderation", "score_numerique", "score_qualitatif", "analyse", "justification"],
                  },
                },
                scoring_global: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    calcul_detail: { type: "string" },
                    ponderation_appliquee: { type: "string" },
                    niveau_confiance: { type: "number" },
                    facteurs_confiance: { type: "array", items: { type: "string" } },
                    interpretation: { type: "string" },
                  },
                  required: ["score", "calcul_detail", "niveau_confiance", "interpretation"],
                },
                red_flags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["Financier", "Comportemental", "Documentaire", "Compliance"] },
                      niveau: { type: "string", enum: ["Faible", "Modéré", "Élevé", "Critique"] },
                      description: { type: "string" },
                      impact_score: { type: "number" },
                    },
                    required: ["type", "niveau", "description"],
                  },
                },
                facteurs_favorables: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      impact_score: { type: "number" },
                    },
                    required: ["type", "description"],
                  },
                },
                recommandation: {
                  type: "object",
                  properties: {
                    decision: { type: "string", enum: ["Acceptation favorable", "Acceptation conditionnelle", "Révision approfondie requise", "Recommandation défavorable"] },
                    justification: { type: "string" },
                    escalade_requise: { type: "boolean" },
                    motif_escalade: { type: "string" },
                  },
                  required: ["decision", "justification", "escalade_requise"],
                },
                conditions_suggerees: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      priorite: { type: "string", enum: ["Obligatoire", "Recommandé", "Optionnel"] },
                    },
                    required: ["type", "description", "priorite"],
                  },
                },
                audit_trail: {
                  type: "object",
                  properties: {
                    logique_decisionnelle: { type: "string" },
                    hypotheses_appliquees: { type: "array", items: { type: "string" } },
                    conformite: { type: "string" },
                  },
                  required: ["logique_decisionnelle", "hypotheses_appliquees"],
                },
              },
              required: ["resume", "donnees_analysees", "piliers", "scoring_global", "red_flags", "facteurs_favorables", "recommandation", "conditions_suggerees", "audit_trail"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "produire_analyse_credit" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite atteinte, réessayez." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Erreur du moteur IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Réponse IA vide");
    const parsed = JSON.parse(args);
    parsed.audit_trail = parsed.audit_trail || {};
    parsed.audit_trail.timestamp_analyse = new Date().toISOString();
    parsed.audit_trail.version_moteur = "2.0";
    parsed.audit_trail.conformite = parsed.audit_trail.conformite || "Bâle III · Principes prudentiels · Non-discrimination";

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
