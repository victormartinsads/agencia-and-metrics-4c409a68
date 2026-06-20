import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool Schema para forçar a IA a retornar o array exato de sugestões
const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_optimization_suggestions",
    description: "Analisa o desempenho e retorna uma lista de sugestões de otimização (pausa, escala, etc).",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["campaign", "adset", "ad"] },
              object_id: { type: "string", description: "O ID real do objeto no Meta" },
              object_name: { type: "string" },
              action: { type: "string", enum: ["pause", "increase_budget", "refresh_creative", "review"] },
              suggested_value: { type: "number", description: "Valor extra para orçamentos (opcional)" },
              reason: { type: "string", description: "Explicação técnica da decisão, baseada no prompt mental" },
              severity: { type: "string", enum: ["high", "medium", "low"] }
            },
            required: ["level", "object_id", "object_name", "action", "reason", "severity"]
          }
        }
      },
      required: ["suggestions"],
      additionalProperties: false
    }
  }
};

const AGENT_SYSTEM_PROMPT = `MISSÃO DO AGENTE
O objetivo do agente NÃO é gerar leads. O objetivo do agente NÃO é baixar CPL. O objetivo do agente NÃO é aumentar CTR.
O objetivo do agente é: Maximizar lucro previsível.

IDENTIDADE DO AGENTE
Você é um especialista em: Meta Ads, Funis de venda, CRM, Growth Marketing, Copywriting, Psicologia do consumidor, Análise de dados, Otimização de conversão, Escala de campanhas.
Você toma decisões baseadas em: Receita, CAC, LTV, Qualidade dos leads, Taxas de conversão. Nunca baseado apenas em métricas de vaidade.

HIERARQUIA DE IMPORTÂNCIA
Sempre analisar nessa ordem: 1 Receita, 2 Lucro, 3 CAC, 4 ROAS, 5 Qualidade dos Leads, 6 Comercial, 7 Landing Page, 8 Oferta, 9 Criativos, 10 Públicos, 11 Campanhas, 12 Métricas do Meta.

DIAGNÓSTICO E MOTOR DE DECISÃO
- CTR baixo: Trocar criativo
- CTR alto e conversão baixa: Landing Page ou Oferta
- Frequência alta (>3.5): Subir novos criativos
- ROAS saudável e volume consistente: Escala Vertical (increase_budget)
- ROAS baixo ou CAC/CPA alto em relação à meta: Investigar gargalo ou Pausar (pause)

Você receberá um JSON com as campanhas e seus criativos/anúncios (que também contém o nome do conjunto - adsetName). 
Sua missão é varrer ABSOLUTAMENTE TUDO.
CRÍTICO: Nunca retorne vazio. Identifique as anomalias graves (criativos que gastaram e não venderam, CTR abaixo de 0.5, CPA muito acima da meta) e sugira 'pause' para eles. Identifique os melhores (CPA abaixo da meta, ROAS alto) e sugira 'increase_budget'. Retorne todas as sugestões válidas encontradas.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, datePreset = "last_7d" } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await hasAdminOrEditor(claims.sub))) return forbidden(corsHeaders, "Admin or editor role required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pega as configurações do cliente
    const { data: client } = await supabase
      .from("clients")
      .select("name, target_cpa_lead, target_cpa_purchase, cpa_alert_multiplier")
      .eq("id", clientId)
      .single();

    // Reusa o cache de meta-ads
    const metaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-ads`;
    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ clientId, datePreset }),
    });
    const meta = await metaRes.json();
    if (meta.error) throw new Error(meta.error);

    // Ocultar arrays vazios para economizar tokens, mapear creatives corretamente
    const cleanData = (meta.campaigns || []).map((c: any) => ({
      id: c.id, name: c.name, objective: c.objective, status: c.status,
      spend: c.spend, roas: c.roas, cpa: c.costPerConversion, freq: c.frequency, ctr: c.ctr,
      // Passar creatives (ads) também para análise
      creatives: c.creatives?.map((a: any) => ({
        id: a.id, name: a.name, adsetName: a.adsetName, type: a.type, spend: a.spend, roas: a.roas, 
        ctr: a.ctr, conversions: a.conversions
      })) || []
    }));

    const userPrompt = `Analise os seguintes dados do cliente ${client?.name || "Desconhecido"}.
    METAS DE SUCESSO: Target CPA (Lead) = R$ ${client?.target_cpa_lead || 0}, Target CPA (Venda) = R$ ${client?.target_cpa_purchase || 0}.
    DADOS: ${JSON.stringify(cleanData)}`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "generate_optimization_suggestions" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${t}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions = [];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions || [];
    }

    // Salvar as sugestões mapeadas no banco de dados
    const toInsert = suggestions.map((s: any) => ({
      client_id: clientId,
      level: s.level,
      object_id: s.object_id,
      object_name: s.object_name,
      action: s.action,
      suggested_value: s.suggested_value || null,
      reason: s.reason,
      severity: s.severity,
      status: "pending",
      metadata: {}
    }));

    // Limpa pendentes anteriores
    await supabase
      .from("optimization_suggestions")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "pending");

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("optimization_suggestions").insert(toInsert);
      if (insErr) console.error("insert error", insErr);
    }

    return new Response(JSON.stringify({ count: toInsert.length, suggestions: toInsert }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-optimization-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
