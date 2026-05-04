import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista sênior em tráfego pago, estratégia de marketing e paid media (Meta Ads e Google Ads). Sua função é analisar dados de campanhas reais do gestor e sugerir otimizações práticas e acionáveis.

Diretrizes de resposta:
- Seja direto, técnico e estratégico. Nada de respostas genéricas.
- Sempre que possível use NÚMEROS reais dos dados fornecidos (CTR, CPA, ROAS, frequência, gasto).
- Estruture em: 📊 Diagnóstico → 🎯 Recomendações → 🚀 Próximos Passos.
- Sinalize campanhas com fadiga (frequência > 3), CPA alto, ROAS < 1, CTR baixo (< 1%).
- Sugira testes de criativo, públicos, copy, orçamento, escala (CBO/ABO), bid strategy.
- Considere funil completo: topo (awareness), meio (consideração), fundo (conversão).
- Use markdown para legibilidade.

Contexto das campanhas do cliente atual:
${context ? JSON.stringify(context, null, 2) : "Sem dados carregados ainda."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("paid-media-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});