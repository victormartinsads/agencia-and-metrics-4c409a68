import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { summary, prompt, clientId } = body;
    if (!summary && !prompt) {
      return new Response(JSON.stringify({ error: "summary or prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Free-form prompt mode (used by ComoEstamos insights/report)
    if (prompt) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um especialista em marketing digital e Meta Ads. Responda em português brasileiro de forma clara e acionável." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await response.json();
      const text = aiData.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ insights: text, text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Structured tool-calling mode (used by FunnelAIInsights)
    const systemPrompt = `Você é um especialista em marketing digital e análise de funil Meta Ads. 
Analise os dados fornecidos e gere insights estratégicos em português brasileiro.

RETORNE usando a tool "generate_insights" com exatamente 3 categorias:
1. Performance - métricas de desempenho, ROAS, CPA, eficiência
2. Criativo - qualidade de criativos, CTR, frequência, fadiga  
3. Estrutura de Funil - distribuição topo/meio/fundo, gaps, oportunidades

Cada categoria deve ter 2-4 insights acionáveis e específicos baseados nos dados reais.
Seja direto e prático. Use números dos dados.`;

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
          { role: "user", content: `Dados do funil:\n${JSON.stringify(summary, null, 2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Return funnel analysis insights in 3 categories",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", enum: ["Performance", "Criativo", "Estrutura de Funil"] },
                        insights: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["title", "insights"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No insights generated" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Funnel insights error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
