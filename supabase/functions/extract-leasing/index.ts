import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM = `Tu es un extracteur de données pour des contrats de leasing/crédit-bail (banques, sociétés de leasing en Tunisie).
Tu reçois le contenu textuel d'un document (contrat, échéancier, facture, relevé, ligne CSV/Excel...).
Extrais un ou plusieurs contrats. Pour les fichiers tabulaires (Excel/CSV), retourne une entrée par ligne.

Règles:
- Montants en TND (nombre uniquement, sans devise).
- Dates au format ISO YYYY-MM-DD.
- Téléphone: ajoute +216 si numéro tunisien sans indicatif. Email en minuscules.
- asset_type: véhicule, immobilier, équipement, matériel_informatique, autre.
- contract_status: active, pending, terminated, defaulted, completed.
- payment_frequency: monthly, quarterly, yearly.
- risk_level: low, medium, high, critical.
- ai_confidence: nombre entre 0 et 1 (qualité d'extraction par dossier).
- Si une donnée est absente: chaîne vide ou 0.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, filename } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "content requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquante");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Fichier: ${filename || "inconnu"}\n\nContenu:\n${String(content).slice(0, 120000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_leasing",
            description: "Renvoie la liste des contrats de leasing extraits.",
            parameters: {
              type: "object",
              properties: {
                contracts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      lessee_name: { type: "string" },
                      lessee_id: { type: "string" },
                      lessee_email: { type: "string" },
                      lessee_phone: { type: "string" },
                      contract_ref: { type: "string" },
                      contract_status: { type: "string" },
                      start_date: { type: "string" },
                      end_date: { type: "string" },
                      maturity_date: { type: "string" },
                      duration_months: { type: "number" },
                      asset_type: { type: "string" },
                      asset_description: { type: "string" },
                      asset_value: { type: "number" },
                      residual_value: { type: "number" },
                      monthly_rent: { type: "number" },
                      total_amount: { type: "number" },
                      remaining_capital: { type: "number" },
                      interest_rate: { type: "number" },
                      payment_frequency: { type: "string" },
                      next_payment_date: { type: "string" },
                      overdue_amount: { type: "number" },
                      overdue_days: { type: "number" },
                      risk_score: { type: "number" },
                      risk_level: { type: "string" },
                      ai_confidence: { type: "number" },
                      notes: { type: "string" },
                    },
                    required: ["lessee_name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["contracts"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_leasing" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite atteinte, réessayez." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { contracts: [] };

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
