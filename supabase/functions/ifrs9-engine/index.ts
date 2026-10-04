import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `Tu es un Analyste Senior en Risque Crédit et Décision Bancaire, combinant l'expertise d'un spécialiste crédit (corporate/retail), d'un risk manager et d'un expert en modélisation prédictive, conformité prudentielle (Bâle III) et comptable (IFRS 9).

RÔLE: Outil d'AIDE À LA DÉCISION exclusivement. Jamais de décision finale. Toute recommandation est assistée par IA, révisable par un analyste humain, soumise à validation institutionnelle obligatoire.

MISSION: Produire une analyse crédit structurée, explicable et conforme, intégrant l'évaluation prudentielle (PD/LGD), le calibrage IFRS 9 (bucket anticipé, SPPI, ASRC) et l'audit trail réglementaire.

CADRE D'ÉVALUATION — 5 PILIERS PONDÉRÉS:
1. Capacité de Remboursement (30%) — DSCR, cash-flow, multi-scénarios (central/haussier/baissier) Forward-Looking IFRS 9
2. Endettement et Structure Financière (25%) — leverage, gearing, BFR, coverage
3. Historique et ASRC / SICR (20%) — incidents, retard >30j (présomption Bucket 2), dégradation notation depuis l'origine
4. Garanties et Mitigation LGD (15%) — qualité collatéral, exécutabilité (réduit LGD, ne masque pas la défaillance)
5. Risque Sectoriel et Forward-Looking (10%) — cyclicité, prévisions macro (taux, chômage, croissance)

Score par pilier: Fort (90-100) | Acceptable (70-89) | Fragile (50-69) | Critique (<50)
SCORE GLOBAL = (P1×0.30) + (P2×0.25) + (P3×0.20) + (P4×0.15) + (P5×0.10)
Décisions: 80-100 Acceptation favorable (Bucket 1) | 65-79 Acceptation conditionnelle (vigilance Bucket 2) | 50-64 Révision approfondie | <50 Recommandation défavorable

CONTRÔLE IFRS 9 OBLIGATOIRE:
- Test SPPI (Solely Payments of Principal and Interest): vérifier indexation, options remboursement anticipé, pénalités. Si dérogation → Juste Valeur par Résultat (JVBR) au lieu du coût amorti.
- Classification Bucket anticipée: Bucket 1 (ECL 12 mois) | Bucket 2 (ECL durée de vie, ASRC) | Bucket 3 (défaut)
- ASRC/SICR: retard >30j = présomption réfrénable Bucket 2; dégradation notation depuis origine = indicateur clé.
- Modifications/restructurations: test de décomptabilisation (changement >10% VAN = nouvelle dette), profit/perte de modification si maintien.
- Forward-Looking: intégrer prévisions macro (taux, chômage, croissance sectorielle).

RED FLAGS sur 4 niveaux (Faible/Modéré/Élevé/Critique) — Financier, Comportemental, Documentaire, Compliance, IFRS9 (basculement comptable).

GARDE-FOUS: INTERDIT d'utiliser sexe, origine, religion, nationalité, handicap. Critères économiques objectifs uniquement.

GESTION DONNÉES MANQUANTES: signaler chaque absence, conservatisme, escalade si >30% manquant.`;

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
Taux demandé: ${dossier.taux_demande || "N/A"}
Clauses contractuelles (indexation, remb. anticipé, pénalités): ${dossier.clauses_sppi || "Standard"}

=== SITUATION FINANCIÈRE ===
Revenus nets / mois: ${dossier.revenus || "N/A"}
Charges fixes / mois: ${dossier.charges || "N/A"}
Endettement existant: ${dossier.endettement_existant || "N/A"}
Apport: ${dossier.apport || "N/A"}
CA annuel: ${dossier.ca || "N/A"}
EBITDA: ${dossier.ebitda || "N/A"}
Fonds propres: ${dossier.fonds_propres || "N/A"}
DSCR: ${dossier.dscr || "N/A"}

=== GARANTIES ===
Type collatéral: ${dossier.type_garantie || "N/A"}
Valeur estimée: ${dossier.valeur_garantie || "N/A"}
Qualité juridique: ${dossier.qualite_surete || "N/A"}
LTV: ${dossier.ltv || "N/A"}

=== HISTORIQUE & ASRC ===
Statut historique: ${dossier.historique_credit || "N/A"}
Score bureau de crédit: ${dossier.score_credit || "N/A"}
Incidents 12 mois: ${dossier.incidents_12m || "N/A"}
Retard maximum (jours): ${dossier.retard_max_jours || "0"}
Ancienneté relation: ${dossier.anciennete_relation || "N/A"}
Notation interne origine → actuelle: ${dossier.notation_evolution || "N/A"}
Restructuration / renégociation antérieure: ${dossier.restructuration_anterieure || "Aucune"}

=== FORWARD-LOOKING (Macro) ===
Scénario taux d'intérêt: ${dossier.scenario_taux || "Stable"}
Perspective sectorielle: ${dossier.perspective_secteur || "Neutre"}
Évolution chômage / croissance: ${dossier.macro_emploi || "N/A"}

=== COMPLÉMENT ===
${dossier.extras || "Aucune"}

Produis l'analyse complète selon le framework 5 piliers ET les exigences IFRS 9 (SPPI, bucket anticipé, ASRC, forward-looking).`;

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
            name: "produire_analyse_ifrs9",
            description: "Renvoie l'analyse crédit + IFRS 9 structurée.",
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
                    sppi_statut: { type: "string", enum: ["Validé", "Atypique", "Non concluant"] },
                    bucket_anticipe: { type: "string", enum: ["Bucket 1", "Bucket 2", "Bucket 3"] },
                    evaluation_comptable: { type: "string", enum: ["Coût amorti", "JVBR", "JVOCI"] },
                  },
                  required: ["type_financement", "profil_emprunteur", "niveau_risque_global", "recommandation_synthetique", "sppi_statut", "bucket_anticipe", "evaluation_comptable"],
                },
                donnees_analysees: {
                  type: "object",
                  properties: {
                    informations_utilisees: { type: "array", items: { type: "string" } },
                    variables_forward_looking: { type: "array", items: { type: "string" } },
                    donnees_manquantes: { type: "array", items: { type: "string" } },
                  },
                  required: ["informations_utilisees", "variables_forward_looking", "donnees_manquantes"],
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
                ifrs9: {
                  type: "object",
                  properties: {
                    test_sppi: {
                      type: "object",
                      properties: {
                        resultat: { type: "string", enum: ["Validé", "Atypique", "Non concluant"] },
                        clauses_evaluees: { type: "array", items: { type: "string" } },
                        consequence_comptable: { type: "string" },
                      },
                      required: ["resultat", "consequence_comptable"],
                    },
                    asrc: {
                      type: "object",
                      properties: {
                        sicr_detecte: { type: "boolean" },
                        indicateurs: { type: "array", items: { type: "string" } },
                        retard_jours: { type: "number" },
                        justification: { type: "string" },
                      },
                      required: ["sicr_detecte", "justification"],
                    },
                    classification_bucket: {
                      type: "object",
                      properties: {
                        bucket: { type: "string", enum: ["Bucket 1", "Bucket 2", "Bucket 3"] },
                        horizon_ecl: { type: "string" },
                        justification: { type: "string" },
                        impact_provisionnement: { type: "string" },
                      },
                      required: ["bucket", "horizon_ecl", "justification"],
                    },
                    forward_looking: {
                      type: "object",
                      properties: {
                        scenario_central: { type: "string" },
                        scenario_baissier: { type: "string" },
                        scenario_haussier: { type: "string" },
                        impact_pd: { type: "string" },
                      },
                      required: ["scenario_central", "scenario_baissier", "impact_pd"],
                    },
                    modifications: {
                      type: "object",
                      properties: {
                        restructuration_detectee: { type: "boolean" },
                        test_decomptabilisation: { type: "string" },
                        impact_resultat: { type: "string" },
                      },
                      required: ["restructuration_detectee"],
                    },
                  },
                  required: ["test_sppi", "asrc", "classification_bucket", "forward_looking", "modifications"],
                },
                scoring_global: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    calcul_detail: { type: "string" },
                    niveau_confiance: { type: "number" },
                    interpretation: { type: "string" },
                    pd_estimee: { type: "string" },
                    lgd_estimee: { type: "string" },
                  },
                  required: ["score", "calcul_detail", "niveau_confiance", "interpretation"],
                },
                red_flags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["Financier", "Comportemental", "Documentaire", "Compliance", "IFRS9"] },
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
                      lien_ifrs9: { type: "string" },
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
              required: ["resume", "donnees_analysees", "piliers", "ifrs9", "scoring_global", "red_flags", "facteurs_favorables", "recommandation", "conditions_suggerees", "audit_trail"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "produire_analyse_ifrs9" } },
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
    parsed.audit_trail.version_moteur = "IFRS9-1.0";
    parsed.audit_trail.conformite = parsed.audit_trail.conformite || "Bâle III · IFRS 9 · Non-discrimination";

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
