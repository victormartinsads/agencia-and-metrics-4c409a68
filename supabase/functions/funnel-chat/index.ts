import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json() as {
      messages: ChatMsg[];
      context?: {
        clientName?: string;
        datePreset?: string;
        currencySymbol?: string;
        funnels?: Array<{
          code: string;
          label: string;
          campaigns: number;
          spend: number;
          revenue: number;
          roas: number;
          conversions: number;
        }>;
        topCampaigns?: Array<{
          name: string;
          spend: number;
          conversions: number;
          roas: number;
          ctr: number;
        }>;
      };
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctxLines: string[] = [];
    if (context) {
      ctxLines.push(`Cliente: ${context.clientName || "—"}`);
      ctxLines.push(`Período: ${context.datePreset || "—"}`);
      ctxLines.push(`Moeda: ${context.currencySymbol || "R$"}`);
      if (context.funnels?.length) {
        ctxLines.push("\nFunis ativos:");
        for (const f of context.funnels) {
          ctxLines.push(
            `- ${f.code} ${f.label}: ${f.campaigns} camp., investido ${f.spend.toFixed(2)}, receita ${f.revenue.toFixed(2)}, ROAS ${f.roas.toFixed(2)}x, conv ${f.conversions}`,
          );
        }
      }
      if (context.topCampaigns?.length) {
        ctxLines.push("\nTop campanhas por gasto:");
        for (const c of context.topCampaigns.slice(0, 10)) {
          ctxLines.push(
            `- ${c.name} | gasto ${c.spend.toFixed(2)} | conv ${c.conversions} | ROAS ${c.roas.toFixed(2)}x | CTR ${c.ctr.toFixed(2)}%`,
          );
        }
      }
    }

    const systemPrompt = `Você é um analista sênior de tráfego pago especialista em Meta Ads e funis de marketing.
Responda em português do Brasil, de forma direta, prática e com bullet points quando útil.
Use os dados de contexto abaixo para embasar suas respostas. Se o usuário pedir algo fora desse escopo, responda mesmo assim de forma útil.

CONTEXTO ATUAL DA CONTA:
${ctxLines.join("\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos do Lovable AI esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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
    console.error("funnel-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});