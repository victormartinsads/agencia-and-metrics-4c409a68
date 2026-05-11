const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

// Recebe um prompt em linguagem natural e devolve uma estrutura de campanha (campaign + adsets + ads)
// usando Lovable AI com tool calling. NÃO publica nada na Meta — só persiste como rascunho.

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "build_campaign_structure",
    description: "Monta a estrutura de uma campanha de Meta Ads a partir do briefing do gestor.",
    parameters: {
      type: "object",
      properties: {
        campaign: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome da campanha (ex: Conversão | Lookalike | Out 2025)" },
            objective: {
              type: "string",
              enum: ["OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "OUTCOME_APP_PROMOTION"],
              description: "Objetivo da campanha (formato API v21)",
            },
            special_ad_categories: {
              type: "array", items: { type: "string" }, default: [],
              description: "Categorias especiais (HOUSING, EMPLOYMENT, CREDIT) — vazio na maioria dos casos",
            },
          },
          required: ["name", "objective"],
        },
        adsets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              daily_budget: { type: "number", description: "Orçamento diário em moeda local (não centavos)" },
              optimization_goal: {
                type: "string",
                enum: ["LEAD_GENERATION", "OFFSITE_CONVERSIONS", "LINK_CLICKS", "REACH", "IMPRESSIONS", "POST_ENGAGEMENT", "VIDEO_VIEWS", "THRUPLAY"],
              },
              billing_event: { type: "string", enum: ["IMPRESSIONS", "LINK_CLICKS"], default: "IMPRESSIONS" },
              targeting_summary: {
                type: "string",
                description: "Descrição do público em linguagem natural (idade, gênero, localização, interesses, lookalike, etc).",
              },
              age_min: { type: "number", default: 18 },
              age_max: { type: "number", default: 65 },
              genders: { type: "array", items: { type: "number" }, description: "1=homem, 2=mulher; vazio = todos" },
              countries: { type: "array", items: { type: "string" }, default: ["BR"] },
            },
            required: ["name", "daily_budget", "optimization_goal", "targeting_summary"],
          },
        },
        ads: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              adset_index: { type: "number", description: "Índice (0-based) do adset ao qual este ad pertence" },
              headline: { type: "string", description: "Título principal (até 40 caracteres)" },
              primary_text: { type: "string", description: "Copy principal do anúncio" },
              description: { type: "string" },
              cta: {
                type: "string",
                enum: ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "GET_OFFER", "SUBSCRIBE", "CONTACT_US", "BOOK_TRAVEL", "DOWNLOAD"],
                default: "LEARN_MORE",
              },
              destination_url: { type: "string" },
              image_prompt: {
                type: "string",
                description: "Prompt em PT-BR para gerar a imagem do criativo (ou descrever um criativo já existente).",
              },
            },
            required: ["name", "adset_index", "headline", "primary_text", "cta", "image_prompt"],
          },
        },
        notes: {
          type: "string",
          description: "Observações estratégicas para o gestor revisar antes de publicar.",
        },
      },
      required: ["campaign", "adsets", "ads"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clientId, adAccountId, prompt, draftId } = await req.json();
    if (!clientId || !adAccountId || !prompt) {
      return new Response(JSON.stringify({ error: "clientId, adAccountId e prompt são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista sênior em Meta Ads. Receberá um briefing do gestor e DEVE chamar a ferramenta build_campaign_structure com a melhor estrutura possível para cumprir o objetivo. Pense em: público (lookalike, interesses, retargeting), número de adsets para teste (geralmente 2-3), número de ads por adset (3 variações), copy persuasivo focado em benefício e prova, CTA correto. Use sempre português brasileiro. Se o briefing não especificar país, assuma BR. Se não especificar orçamento, use R$50/dia por adset.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "build_campaign_structure" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente em alguns instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${t}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou estrutura de campanha");
    }
    const structure = JSON.parse(toolCall.function.arguments);

    // Salva ou atualiza o rascunho
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let draft;
    if (draftId) {
      const { data, error } = await sb
        .from("campaign_drafts")
        .update({ structure, prompt })
        .eq("id", draftId)
        .select()
        .single();
      if (error) throw error;
      draft = data;
    } else {
      const { data, error } = await sb
        .from("campaign_drafts")
        .insert({
          client_id: clientId,
          ad_account_id: adAccountId,
          prompt,
          structure,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      draft = data;
    }

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("campaign-draft-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});