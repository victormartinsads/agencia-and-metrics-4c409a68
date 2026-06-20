// Edge function: gera diagnóstico semanal (4 blocos) via Lovable AI Gateway
// Recebe: { clientId, datePreset, summary } onde summary é o resumo agregado
// dos funis/campanhas + anotações do gestor.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const SYSTEM_PROMPT = `Você é um Head de Tráfego sênior preparando o diagnóstico semanal de um cliente.

Receberá um resumo consolidado da última semana com métricas globais e por funil/campanha (gasto, resultados, CPA, CTR, CPM, CPC, ROAS, alcance, impressões, cliques) e anotações do gestor.

OBJETIVO: encontrar GARGALOS através das MÉTRICAS de tráfego e propor ajustes que melhorem essas métricas. NÃO sugira tipos de criativo, formatos (UGC, carrossel, vídeo, depoimento etc.) nem conceitos criativos. Foque exclusivamente em diagnóstico numérico: o que cada métrica indica, onde está o gargalo do funil (impressão → clique → conversão → venda), e qual ajuste de tráfego/estrutura/oferta/landing/configuração corrige.

Você DEVE retornar um JSON com EXATAMENTE 4 chaves:
- "positives": markdown — o que melhorou nas métricas (CTR subiu, CPA caiu, ROAS forte, CPM saudável). Cite números reais e compare onde possível. Bullets curtos.
- "negatives": markdown — gargalos identificados pelas métricas (CPM alto = problema de público/leilão; CTR baixo = problema de oferta/copy; CPC alto = baixa qualidade do clique; conversão baixa após o clique = problema de landing/oferta; CPA alto = combinação dos anteriores; baixa frequência ou alcance estagnado = problema de orçamento/segmentação). Diga ONDE está o gargalo, em qual etapa do funil, e qual métrica acende o alerta.
- "manager_actions": markdown — ajustes de tráfego que o GESTOR vai executar para corrigir os gargalos: revisar segmentação, ajustar orçamento, mudar lance, expandir/restringir público, refazer evento de conversão, ajustar exclusões, mudar objetivo de campanha, redistribuir verba entre funis, pausar campanhas com CPA fora do teto. NÃO mencione tipos de criativo.
- "client_requests": markdown em PRIMEIRA PESSOA DO PLURAL ("precisamos", "vamos precisar"), claro e direto, focado no que DEPENDE DO CLIENTE para destravar as métricas. Exemplos: ajuste de oferta/preço, revisão da landing page, correção do pixel/eventos, dados de fechamento/CRM, aumento de verba para sair de aprendizado, validação de público, integração com plataforma de venda. Explique POR QUE precisa de cada item ligando à métrica que vai melhorar.

Tom: claro, próximo, sem jargão excessivo. Cliente precisa entender o gargalo. Use bullets curtos. Sempre 3-6 itens por bloco.
Não envolva o JSON em markdown, retorne JSON puro.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const claims = await getUserClaims(req);
  if (!claims) return unauthorized(corsHeaders);
  if (!(await hasAdminOrEditor(claims.sub))) return forbidden(corsHeaders, "Admin or editor role required");

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada nos secrets do Supabase. Acesse seu painel do Supabase e adicione esta chave." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { summary } = await req.json();
    if (!summary || typeof summary !== "string") {
      return new Response(JSON.stringify({ error: "summary (string) is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
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
        return new Response(JSON.stringify({ error: "Rate limit de IA excedido. Tente novamente em alguns instantes." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados ou erro de faturamento na conta Google." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Falha ao gerar diagnóstico. Erro do Gateway de IA (Status ${aiResp.status}): ${text.slice(0, 150)}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Resposta inválida da IA. Tente novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-diagnostic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido ao gerar o diagnóstico." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
