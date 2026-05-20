import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const claims = await getUserClaims(req);
  if (!claims) return unauthorized(corsHeaders);
  if (!(await hasAdminOrEditor(claims.sub))) return forbidden(corsHeaders, "Admin or editor role required");

  try {
    const { message, currentSources, availableMetrics, sheetColumns } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente que configura fontes de dados de um dashboard.
Para cada métrica, o usuário pode escolher entre 3 fontes:
- "sheets": dado vem de uma coluna da planilha (use field = nome da coluna)
- "manual": valor fixo digitado (use value = número)
- "meta": dado vem do Meta Ads (use field = um destes: spend, impressions, clicks, leads, purchases, landing_page_views)

Métricas disponíveis: ${availableMetrics.join(", ")}
Colunas da planilha disponíveis: ${(sheetColumns || []).join(", ") || "(nenhuma)"}
Configuração atual: ${JSON.stringify(currentSources)}

Responda SEMPRE chamando a função update_sources com o objeto completo atualizado (mantendo configurações que não foram alteradas).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: [{
          type: "function",
          function: {
            name: "update_sources",
            description: "Atualiza configuração de fontes das métricas",
            parameters: {
              type: "object",
              properties: {
                sources: {
                  type: "object",
                  description: "Mapa metric_key -> { source, field?, value? }",
                },
                explanation: { type: "string", description: "Explicação curta em PT-BR do que mudou" },
              },
              required: ["sources", "explanation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "update_sources" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou configuração", raw: data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("metric-source-ai error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});