// Edge function: gera diagnóstico semanal (4 blocos) via Lovable AI Gateway
// Recebe: { clientId, datePreset, summary } onde summary é o resumo agregado
// dos funis/campanhas + anotações do gestor.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um Head de Tráfego sênior preparando o diagnóstico semanal de um cliente.

Receberá um resumo consolidado da última semana com:
- Métricas globais da conta (gasto, resultados, CPA, CTR, ROAS)
- Performance por funil/campanha (com top criativos, top conjuntos)
- O que o gestor fez na semana e próximas ações planejadas

Você DEVE retornar um JSON com EXATAMENTE 4 chaves:
- "positives": markdown com o que foi positivo (resultados que melhoraram, criativos vencedores, funis saudáveis). Use bullets, cite números e nomes de campanhas/criativos quando relevante.
- "negatives": markdown com o que foi negativo (queda de CTR, CPA alto, criativos com fadiga, funis críticos). Seja direto, cite os dados.
- "manager_actions": markdown com o que o GESTOR deve fazer nos próximos dias (escalar X, pausar Y, testar Z criativo, ajustar público). Acionável.
- "client_requests": markdown com o que precisa do CLIENTE para melhorar (novos depoimentos, vídeos UGC, ajuste de oferta, validação de copy, dados de fechamento). Em primeira pessoa do plural ("precisamos").

Tom: claro, próximo, sem jargão excessivo. Cliente precisa entender. Use bullets curtos. Sempre 3-6 itens por bloco.
Não envolva o JSON em markdown, retorne JSON puro.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { summary } = await req.json();
    if (!summary || typeof summary !== "string") {
      return new Response(JSON.stringify({ error: "summary (string) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summary },
        ],
        tools: [{
          type: "function",
          function: {
            name: "weekly_diagnostic",
            description: "Diagnóstico semanal estruturado em 4 blocos.",
            parameters: {
              type: "object",
              properties: {
                positives: { type: "string", description: "Markdown com pontos positivos da semana." },
                negatives: { type: "string", description: "Markdown com pontos negativos da semana." },
                manager_actions: { type: "string", description: "Markdown com ações do gestor para a próxima semana." },
                client_requests: { type: "string", description: "Markdown com pedidos ao cliente." },
              },
              required: ["positives", "negatives", "manager_actions", "client_requests"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "weekly_diagnostic" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar diagnóstico" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-diagnostic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
