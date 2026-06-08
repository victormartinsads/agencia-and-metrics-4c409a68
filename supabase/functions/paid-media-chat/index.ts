const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserClaims } from "../_shared/auth.ts";

async function requireAuth(req: Request) {
  return await getUserClaims(req);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const claims = await requireAuth(req);
  if (!claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, context, model } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
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
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados ou erro de faturamento na conta Google." }), {
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