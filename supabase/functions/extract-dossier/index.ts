import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SYSTEM = `Tu es un extracteur de données de dossiers de recouvrement bancaire.
Tu reçois le contenu textuel d'un document (facture, contrat, relevé, email, ligne CSV/Excel...).
Extrais les dossiers présents. Si le document décrit plusieurs débiteurs/lignes, retourne plusieurs entrées.
Pour les montants: nombre uniquement (TND), sans devise. Pour les dates: format ISO YYYY-MM-DD.
Pour le téléphone: ajoute +216 si numéro tunisien sans indicatif. Email en minuscules.
Si une donnée est absente, laisse une chaîne vide ou 0.`;

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
          { role: "user", content: `Fichier: ${filename || "inconnu"}\n\nContenu:\n${String(content).slice(0, 100000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_dossiers",
            description: "Renvoie la liste des dossiers extraits.",
            parameters: {
              type: "object",
              properties: {
                dossiers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      debtor_name: { type: "string" },
                      debtor_email: { type: "string" },
                      debtor_phone: { type: "string" },
                      amount: { type: "number" },
                      due_date: { type: "string", description: "YYYY-MM-DD" },
                    },
                    required: ["debtor_name", "amount"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["dossiers"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_dossiers" } },
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
    const parsed = args ? JSON.parse(args) : { dossiers: [] };

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
