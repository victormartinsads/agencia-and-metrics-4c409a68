import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH_API = "https://graph.facebook.com/v21.0";
const CACHE_TTL_MINUTES = 120; // 2 hour cache

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchMeta<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = url;
  let pageCount = 0;

  while (nextUrl && pageCount < 10) {
    const response = await fetch(nextUrl);
    const payload = await response.json();

    if (payload.error) {
      throw new Error(payload.error.message || "Meta API error");
    }

    if (Array.isArray(payload.data)) {
      items.push(...payload.data);
    }

    nextUrl = payload.paging?.next;
    pageCount += 1;
  }

  return items;
}

interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  reach?: string;
  frequency?: string;
  cost_per_action_type?: { action_type: string; value: string }[];
  inline_link_clicks?: string;
  inline_link_click_ctr?: string;
  cost_per_inline_link_click?: string;
  unique_clicks?: string;
  unique_ctr?: string;
  unique_actions?: { action_type: string; value: string }[];
  cost_per_unique_action_type?: { action_type: string; value: string }[];
  outbound_clicks?: { action_type: string; value: string }[];
  outbound_clicks_ctr?: { action_type: string; value: string }[];
  cost_per_outbound_click?: { action_type: string; value: string }[];
  video_play_actions?: { action_type: string; value: string }[];
  video_thruplay_watched_actions?: { action_type: string; value: string }[];
  video_p25_watched_actions?: { action_type: string; value: string }[];
  video_p50_watched_actions?: { action_type: string; value: string }[];
  video_p75_watched_actions?: { action_type: string; value: string }[];
  video_p95_watched_actions?: { action_type: string; value: string }[];
  video_p100_watched_actions?: { action_type: string; value: string }[];
  video_avg_time_watched_actions?: { action_type: string; value: string }[];
}

function getActionValue(
  actions: { action_type: string; value: string }[] | undefined,
  type: string,
): number {
  return Number(actions?.find((a) => a.action_type === type)?.value || 0);
}

const ACTION_LABELS: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "Conversas por Mensagem Iniciadas",
  "purchase": "Compras",
  "initiate_checkout": "Finalizações de Compra",
  "lead": "Leads",
  "link_click": "Cliques no Link",
  "landing_page_view": "Visualizações da Página",
  "post_engagement": "Engajamento",
  "page_engagement": "Engajamento",
  "app_install": "Instalações do App",
  "mobile_app_install": "Instalações do App",
  "_reach": "Alcance",
  "_profile_visit": "Visitas ao Perfil",
  "offsite_conversion.fb_pixel_custom": "Evento Personalizado",
};

function getActionTypePriority(objective: string, campaignName: string): string[] {
  const nameLower = campaignName.toLowerCase();
  const objLower = objective.toLowerCase();

  if (nameLower.includes("captacao_de_seguidores") || nameLower.includes("captação de seguidores") || nameLower.includes("captacao_seguidores")) {
    return ["_profile_visit"];
  }
  if (nameLower.includes("corredor_japones") || nameLower.includes("corredor japonês") || nameLower.includes("corredor japones")) {
    return ["_reach"];
  }
  if (nameLower.includes("forms_nativo") || nameLower.includes("formulario_nativo") || nameLower.includes("formulário_nativo")) {
    return ["lead", "link_click"];
  }
  // Check lead captures first so they don't get matched by "whatsapp" lower down
  if (objLower.includes("lead") || objLower.includes("outcome_leads") || nameLower.includes("lead") || nameLower.includes("cadastro")) {
    return ["lead", "offsite_conversion.fb_pixel_lead", "link_click"];
  }
  if (nameLower.includes("call_vendas") || nameLower.includes("call_de_vendas")) {
    return ["offsite_conversion.fb_pixel_custom", "onsite_conversion.messaging_conversation_started_7d", "purchase", "initiate_checkout", "link_click"];
  }
  if (nameLower.includes("whatsapp") || nameLower.includes("wpp") || nameLower.includes("zap") || nameLower.includes("_wpp") || nameLower.includes("call_mensagem") || nameLower.includes("palavra_chave")) {
    return ["onsite_conversion.messaging_conversation_started_7d", "link_click"];
  }
  if (nameLower.includes("servicos_mensagens") || nameLower.includes("serviços_mensagens")) {
    return ["onsite_conversion.messaging_conversation_started_7d", "link_click"];
  }
  if (objLower.includes("outcome_sales") || objLower.includes("conversions") || objLower.includes("product_catalog_sales") || nameLower.includes("vendas") || nameLower.includes("sales") || nameLower.includes("compra")) {
    return ["purchase", "initiate_checkout", "link_click"];
  }
  if (objLower.includes("link_clicks") || objLower.includes("outcome_traffic") || nameLower.includes("tráfego") || nameLower.includes("traffic")) {
    return ["link_click", "landing_page_view"];
  }
  if (objLower.includes("engagement") || objLower.includes("post_engagement") || nameLower.includes("engajamento")) {
    return ["post_engagement", "page_engagement", "link_click"];
  }
  if (objLower.includes("app_installs") || objLower.includes("outcome_app_promotion")) {
    return ["app_install", "mobile_app_install", "link_click"];
  }
  return ["link_click", "landing_page_view"];
}

function getPrimaryResult(
  actions: { action_type: string; value: string }[] | undefined,
  actionTypes: string[],
  insight?: MetaInsight,
): { value: number; label: string; actionType: string } {
  for (const type of actionTypes) {
    if (type === "_reach") {
      return { value: Number(insight?.reach || 0), label: ACTION_LABELS["_reach"] || "Alcance", actionType: "_reach" };
    }
    if (type === "_profile_visit") {
      return { value: getActionValue(actions, "link_click"), label: ACTION_LABELS["_profile_visit"] || "Visitas ao Perfil", actionType: "_profile_visit" };
    }
    if (!actions) continue;
    const val = getActionValue(actions, type);
    if (val > 0) {
      return { value: val, label: ACTION_LABELS[type] || type, actionType: type };
    }
  }
  if (!actions) return { value: 0, label: "Cliques no Link", actionType: "" };
  return { value: 0, label: ACTION_LABELS[actionTypes[0]] || "Resultados", actionType: "" };
}

// ===== CACHE HELPERS =====

async function getCachedData(supabase: any, clientId: string, datePreset: string) {
  const { data, error } = await supabase
    .from("meta_ads_cache")
    .select("*")
    .eq("client_id", clientId)
    .eq("date_preset", datePreset)
    .single();

  if (error || !data) return null;
  return data;
}

async function saveCacheData(supabase: any, clientId: string, datePreset: string, responseData: any) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
  
  await supabase
    .from("meta_ads_cache")
    .upsert({
      client_id: clientId,
      date_preset: datePreset,
      response_data: responseData,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "client_id,date_preset" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clientId, datePreset, forceRefresh, publicSlug, action } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Presentation mockup client bypass
    if (clientId === "11111111-1111-1111-1111-111111111111" || publicSlug === "apresentacao" || clientId === "apresentacao" || action === "seed") {
      // 1. Ensure the client exists
      const { data: clientExists } = await supabase
        .from("clients")
        .select("id")
        .eq("id", "11111111-1111-1111-1111-111111111111")
        .maybeSingle();

      if (!clientExists) {
        console.log("Seeding client 'apresentacao'...");
        await supabase.from("clients").insert({
          id: "11111111-1111-1111-1111-111111111111",
          name: "Cliente Demonstrativo (AND)",
          slug: "apresentacao",
          meta_access_token: "mock_token",
          ad_account_ids: ["act_mock_account"],
          currency_symbol: "R$",
          visible_tabs: ["overview", "funnel", "spreadsheet", "creatives", "branding"]
        });

        await supabase.from("dashboard_sheet_config").insert({
          client_id: "11111111-1111-1111-1111-111111111111",
          spreadsheet_id: "mock_sheet",
          spreadsheet_name: "Planilha Demonstrativa",
          sheet_name: "Página1",
          field_mapping: {
            date: "Data",
            revenue: "Faturamento",
            sales: "Vendas",
            leads: "Leads",
            mql: "MQL",
            smql: "sMQL",
            investment: "Investimento",
            avg_ticket: "Ticket Médio",
            ltv: "LTV"
          },
          monthly_revenue_goal: 250000,
          monthly_investment_budget: 80000
        });
      }

      // Always update metrics rows for the past 60 days to keep dates relative to today
      const metricsRows = [];
      const today = new Date();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        
        // Generate nice daily values with some variation
        const baseValue = 5000 + Math.sin(i / 3) * 2000 + Math.random() * 1000;
        const revenue = Math.round(baseValue);
        const sales = Math.round(revenue / 500); 
        const investment = Math.round(1500 + Math.cos(i / 2) * 500 + Math.random() * 200);
        const leads = Math.round(investment / 6.5);
        const mql = Math.round(leads * 0.4);
        const smql = Math.round(mql * 0.5);
        
        metricsRows.push({
          client_id: "11111111-1111-1111-1111-111111111111",
          reference_date: dateStr,
          revenue,
          sales,
          leads,
          mql,
          smql,
          investment,
          avg_ticket: 500,
          ltv: 2500,
          source: "google_sheets"
        });
      }
      const { error: err3 } = await supabase.from("weekly_metrics").upsert(metricsRows, { onConflict: "client_id,reference_date" });
      if (err3) console.error("Error upserting metrics during bypass:", err3);

      // Generate Meta Ads daily metrics dynamically for 45 days
      const dailyMetrics = [];
      for (let i = 45; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        
        const spend = Math.round(1500 + Math.cos(i / 2) * 500 + Math.random() * 200);
        const impressions = spend * 22;
        const clicks = Math.round(impressions * 0.035);
        const leads = Math.round(spend / 6.5);
        const purchases = Math.round(spend / 150); 
        const conversions = leads + purchases;

        dailyMetrics.push({
          date: dayStr,
          spend,
          impressions,
          clicks,
          conversions,
          purchases,
          leads
        });
      }

      // High quality pre-baked mockup campaigns matching Meta Ads structure
      const campaigns = [
        {
          id: "camp_follower_1",
          name: "[F1] Captação de Seguidores - Instagram",
          status: "active",
          objective: "OUTCOME_TRAFFIC",
          dailyBudget: 150,
          lifetimeBudget: 0,
          spend: 5420,
          impressions: 215400,
          clicks: 8616,
          ctr: 4.00,
          cpc: 0.63,
          cpm: 25.16,
          conversions: 4308,
          costPerConversion: 1.25,
          roas: 0,
          reach: 180000,
          frequency: 1.20,
          primaryResultLabel: "Cliques no Link",
          primaryResultKey: "link_click",
          landingPageViews: 4308,
          addToCart: 0,
          initiateCheckout: 0,
          purchases: 0,
          purchaseValue: 0,
          linkClicks: 8616,
          linkCtr: 4.00,
          cpcLink: 0.63,
          uniqueClicks: 7200,
          uniqueCtr: 3.33,
          outboundClicks: 5200,
          videoPlays: 0,
          thruplays: 0,
          videoP25: 0, videoP50: 0, videoP75: 0, videoP95: 0, videoP100: 0, avgVideoTime: 0,
          creatives: [
            {
              id: "ad_fol_1",
              name: "Ad 01 - Quem é a AND Metrics",
              adsetName: "Interesses Marketing",
              creativeId: "cr_fol_1",
              permalinkUrl: "https://instagram.com",
              type: "video",
              thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
              impressions: 120000,
              clicks: 4800,
              ctr: 4.00,
              spend: 3000,
              conversions: 2400,
              primaryResult: 2400,
              roas: 0
            },
            {
              id: "ad_fol_2",
              name: "Ad 02 - Carrossel Funcionalidades",
              adsetName: "Interesses Marketing",
              creativeId: "cr_fol_2",
              permalinkUrl: "https://instagram.com",
              type: "carousel",
              thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
              impressions: 95400,
              clicks: 3816,
              ctr: 4.00,
              spend: 2420,
              conversions: 1908,
              primaryResult: 1908,
              roas: 0
            }
          ]
        },
        {
          id: "camp_branding_1",
          name: "[F2] Distribuição de Conteúdo - Reels",
          status: "active",
          objective: "OUTCOME_ENGAGEMENT",
          dailyBudget: 100,
          lifetimeBudget: 0,
          spend: 3150,
          impressions: 350000,
          clicks: 14000,
          ctr: 4.00,
          cpc: 0.22,
          cpm: 9.00,
          conversions: 7000,
          costPerConversion: 0.45,
          roas: 0,
          reach: 290000,
          frequency: 1.21,
          primaryResultLabel: "Visualizações do Vídeo",
          primaryResultKey: "video_view",
          landingPageViews: 0,
          addToCart: 0,
          initiateCheckout: 0,
          purchases: 0,
          purchaseValue: 0,
          linkClicks: 2100,
          linkCtr: 0.60,
          cpcLink: 1.50,
          uniqueClicks: 1800,
          uniqueCtr: 0.51,
          outboundClicks: 1500,
          videoPlays: 150000,
          thruplays: 7000,
          videoP25: 60000, videoP50: 30000, videoP75: 15000, videoP95: 8000, videoP100: 7000, avgVideoTime: 9.5,
          creatives: [
            {
              id: "ad_brand_1",
              name: "Reels 01 - Como analisar campanhas",
              adsetName: "Público Quente",
              creativeId: "cr_brand_1",
              permalinkUrl: "https://instagram.com",
              type: "video",
              thumbnail: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&auto=format&fit=crop&q=80",
              impressions: 350000,
              clicks: 14000,
              ctr: 4.00,
              spend: 3150,
              conversions: 7000,
              primaryResult: 7000,
              roas: 0
            }
          ]
        },
        {
          id: "camp_lead_1",
          name: "[F4] Captação de Leads - Ebook Alta Conversão",
          status: "active",
          objective: "OUTCOME_LEADS",
          dailyBudget: 400,
          lifetimeBudget: 0,
          spend: 12800,
          impressions: 412000,
          clicks: 12360,
          ctr: 3.00,
          cpc: 1.04,
          cpm: 31.07,
          conversions: 1977,
          costPerConversion: 6.47,
          roas: 0,
          reach: 310000,
          frequency: 1.33,
          primaryResultLabel: "Leads",
          primaryResultKey: "lead",
          landingPageViews: 9888,
          addToCart: 0,
          initiateCheckout: 0,
          purchases: 0,
          purchaseValue: 0,
          linkClicks: 12360,
          linkCtr: 3.00,
          cpcLink: 1.04,
          uniqueClicks: 10500,
          uniqueCtr: 2.55,
          outboundClicks: 9888,
          videoPlays: 0,
          thruplays: 0,
          videoP25: 0, videoP50: 0, videoP75: 0, videoP95: 0, videoP100: 0, avgVideoTime: 0,
          creatives: [
            {
              id: "ad_lead_1",
              name: "Ad 01 - Ebook gratuito mockup",
              adsetName: "Lookalike 1%",
              creativeId: "cr_lead_1",
              permalinkUrl: "https://instagram.com",
              type: "image",
              thumbnail: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
              impressions: 250000,
              clicks: 7500,
              ctr: 3.00,
              spend: 7800,
              conversions: 1200,
              primaryResult: 1200,
              roas: 0
            },
            {
              id: "ad_lead_2",
              name: "Ad 02 - Depoimento sobre o ebook",
              adsetName: "Lookalike 1%",
              creativeId: "cr_lead_2",
              permalinkUrl: "https://instagram.com",
              type: "video",
              thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
              impressions: 162000,
              clicks: 4860,
              ctr: 3.00,
              spend: 5000,
              conversions: 777,
              primaryResult: 777,
              roas: 0
            }
          ]
        },
        {
          id: "camp_sales_1",
          name: "[F9] Conversão - Curso Vendas Avançadas",
          status: "active",
          objective: "OUTCOME_SALES",
          dailyBudget: 1500,
          lifetimeBudget: 0,
          spend: 42500,
          impressions: 850000,
          clicks: 25500,
          ctr: 3.00,
          cpc: 1.67,
          cpm: 50.00,
          conversions: 306,
          costPerConversion: 138.89,
          roas: 3.59,
          reach: 520000,
          frequency: 1.63,
          primaryResultLabel: "Compras",
          primaryResultKey: "purchase",
          landingPageViews: 20400,
          addToCart: 3060,
          initiateCheckout: 1530,
          purchases: 306,
          purchaseValue: 152694,
          linkClicks: 25500,
          linkCtr: 3.00,
          cpcLink: 1.67,
          uniqueClicks: 21000,
          uniqueCtr: 2.47,
          outboundClicks: 20400,
          videoPlays: 300000,
          thruplays: 12000,
          videoP25: 80000, videoP50: 40000, videoP75: 20000, videoP95: 14000, videoP100: 12000, avgVideoTime: 11.2,
          creatives: [
            {
              id: "ad_sales_1",
              name: "Ad 01 - Oferta Especial R$499",
              adsetName: "Remarketing 30D",
              creativeId: "cr_sales_1",
              permalinkUrl: "https://instagram.com",
              type: "video",
              thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
              impressions: 450000,
              clicks: 13500,
              ctr: 3.00,
              spend: 22500,
              conversions: 165,
              primaryResult: 165,
              roas: 3.65
            },
            {
              id: "ad_sales_2",
              name: "Ad 02 - Garantia de 7 dias",
              adsetName: "Remarketing 30D",
              creativeId: "cr_sales_2",
              permalinkUrl: "https://instagram.com",
              type: "image",
              thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&auto=format&fit=crop&q=80",
              impressions: 400000,
              clicks: 12000,
              ctr: 3.00,
              spend: 20000,
              conversions: 141,
              primaryResult: 141,
              roas: 3.52
            }
          ]
        },
        {
          id: "camp_sales_2",
          name: "[F13] Conversão - Mentoria Negócios High Ticket",
          status: "active",
          objective: "OUTCOME_SALES",
          dailyBudget: 500,
          lifetimeBudget: 0,
          spend: 18200,
          impressions: 121000,
          clicks: 2420,
          ctr: 2.00,
          cpc: 7.52,
          cpm: 150.41,
          conversions: 10,
          costPerConversion: 1820.00,
          roas: 2.74,
          reach: 950000,
          frequency: 1.27,
          primaryResultLabel: "Compras",
          primaryResultKey: "purchase",
          landingPageViews: 1936,
          addToCart: 0,
          initiateCheckout: 97,
          purchases: 10,
          purchaseValue: 49900,
          linkClicks: 2420,
          linkCtr: 2.00,
          cpcLink: 7.52,
          uniqueClicks: 2100,
          uniqueCtr: 1.73,
          outboundClicks: 1936,
          videoPlays: 0,
          thruplays: 0,
          videoP25: 0, videoP50: 0, videoP75: 0, videoP95: 0, videoP100: 0, avgVideoTime: 0,
          creatives: [
            {
              id: "ad_ht_1",
              name: "Ad 01 - Aplicação mentoria",
              adsetName: "Público Frio Executivos",
              creativeId: "cr_ht_1",
              permalinkUrl: "https://instagram.com",
              type: "image",
              thumbnail: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80",
              impressions: 121000,
              clicks: 2420,
              ctr: 2.00,
              spend: 18200,
              conversions: 10,
              primaryResult: 10,
              roas: 2.74
            }
          ]
        }
      ];

      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
      const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
      const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
      const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
      const totalLinkClicks = campaigns.reduce((s, c) => s + c.linkClicks, 0);
      const totalOutboundClicks = campaigns.reduce((s, c) => s + c.outboundClicks, 0);
      const totalUniqueClicks = campaigns.reduce((s, c) => s + c.uniqueClicks, 0);
      const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
      const totalLandingPageViews = campaigns.reduce((s, c) => s + c.landingPageViews, 0);
      const totalAddToCart = campaigns.reduce((s, c) => s + c.addToCart, 0);
      const totalInitiateCheckout = campaigns.reduce((s, c) => s + c.initiateCheckout, 0);

      const activeCampaigns = campaigns.filter(c => c.spend > 0);
      const count = activeCampaigns.length || 1;
      const avgCTR = totalImpressions > 0 ? Number(((totalLinkClicks / totalImpressions) * 100).toFixed(2)) : 0;
      const avgCPC = totalLinkClicks > 0 ? Number((totalSpend / totalLinkClicks).toFixed(2)) : 0;
      const avgCTRAll = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
      const avgCPCAll = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
      const avgROAS = Number((activeCampaigns.reduce((s, c) => s + c.roas, 0) / count).toFixed(2));

      const overviewMetrics = {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCTR,
        avgCPC,
        avgROAS,
        totalReach,
        totalLinkClicks,
        totalOutboundClicks,
        totalUniqueClicks,
        avgCTRAll,
        avgCPCAll,
        totalLeadActions: campaigns.reduce((s, c) => s + (c.objective === "OUTCOME_LEADS" ? c.conversions : 0), 0),
        totalPurchases,
        totalLandingPageViews,
        totalAddToCart,
        totalInitiateCheckout,
        link_clicks: totalLinkClicks,
        post_engagement: 0,
        page_engagement: 0,
        video_view: campaigns.reduce((s, c) => s + c.thruplays, 0),
        messaging_started: 0,
        complete_registration: 0,
        subscribe: 0,
        schedule: 0,
        contact: 0,
        submit_application: 0,
        view_content: 0,
        actionBreakdown: {
          lead: campaigns.reduce((s, c) => s + (c.objective === "OUTCOME_LEADS" ? c.conversions : 0), 0),
          purchase: totalPurchases,
          link_click: totalLinkClicks,
          landing_page_view: totalLandingPageViews,
          initiate_checkout: totalInitiateCheckout,
          add_to_cart: totalAddToCart
        }
      };

      const result = {
        campaigns,
        dailyMetrics,
        overviewMetrics,
        accountErrors: []
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" }
      });
    }

    // Allow public read-only views (e.g. /visao-cliente/:slug, /share/:clientId)
    // when the request includes a valid public slug matching the client.
    let isPublic = false;
    if (publicSlug) {
      const { data: pc } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", publicSlug)
        .eq("id", clientId)
        .maybeSingle();
      if (pc?.id) isPublic = true;
    }

    if (!isPublic) {
      const claims = await getUserClaims(req);
      if (!claims) return unauthorized(corsHeaders);
      if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);
    }

    const preset = datePreset || "last_7d";

    // Build Meta API date param: supports presets ("last_7d") and custom ranges ("custom:YYYY-MM-DD:YYYY-MM-DD").
    const customMatch = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(preset);
    const dateParamQS = customMatch
      ? `time_range=${encodeURIComponent(JSON.stringify({ since: customMatch[1], until: customMatch[2] }))}`
      : `date_preset=${preset}`;
    const insightsModifier = customMatch
      ? `time_range({since:'${customMatch[1]}',until:'${customMatch[2]}'})`
      : `date_preset(${preset})`;

    // 1. Check cache first (skip if forceRefresh)
    const cached = await getCachedData(supabase, clientId, preset);
    if (!forceRefresh && cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache HIT for ${clientId}/${preset}`);
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }
    console.log(`Cache ${forceRefresh ? "BYPASS (force refresh)" : "MISS"} for ${clientId}/${preset}`);

    // 2. Fetch from Meta API
    const { data: client, error: dbError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (dbError || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let token = client.meta_access_token;
    if (!token) {
      const { data: tokData } = await supabase
        .from("meta_tokens")
        .select("access_token")
        .eq("client_id", clientId)
        .maybeSingle();
      if (tokData?.access_token) {
        token = tokData.access_token;
      } else {
        const { data: globalTok } = await supabase
          .from("meta_tokens")
          .select("access_token")
          .limit(1)
          .maybeSingle();
        token = globalTok?.access_token;
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Meta Ads not connected. Please connect Facebook in Settings or Client Settings." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adAccountIds: string[] = client.ad_account_ids || [];

    const allCampaigns: any[] = [];
    const dailySpend: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; purchases: number; leads: number }> = {};
    const accountErrors: { accountId: string; message: string }[] = [];
    let hitRateLimit = false;

    // Process all ad accounts concurrently (batched)
    const accountResults = await Promise.allSettled(
      adAccountIds.map(async (accountId) => {
        const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
        const campaigns: any[] = [];
        let accountError: string | null = null;

        const insightFields = [
          "spend","impressions","clicks","ctr","cpc","cpm",
          "actions","action_values","reach","frequency","cost_per_action_type",
          // Link-specific (the correct "Cliques no link" / "CTR link" / "CPC link")
          "inline_link_clicks","inline_link_click_ctr","cost_per_inline_link_click",
          // Unique
          "unique_clicks","unique_ctr","unique_actions","cost_per_unique_action_type",
          // Outbound
          "outbound_clicks","outbound_clicks_ctr","cost_per_outbound_click",
          // Video
          "video_play_actions","video_thruplay_watched_actions",
          "video_p25_watched_actions","video_p50_watched_actions",
          "video_p75_watched_actions","video_p95_watched_actions",
          "video_p100_watched_actions","video_avg_time_watched_actions",
        ].join(",");
        const campaignsUrl = `${GRAPH_API}/${actId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights.${insightsModifier}{${insightFields}}&access_token=${token}&limit=100`;

        try {
          const fetched = await fetchMeta<any>(campaignsUrl);
          campaigns.push(...fetched);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`Meta API error for ${actId}:`, msg);
          accountError = msg;
          if (msg.includes("request limit") || msg.includes("too many calls")) {
            hitRateLimit = true;
          }
        }

        // Daily insights
        const dailyData: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; purchases: number; leads: number }> = {};
        try {
          await delay(100);
          const dailyUrl = `${GRAPH_API}/${actId}/insights?fields=spend,impressions,clicks,actions&${dateParamQS}&time_increment=1&access_token=${token}&limit=500`;
          const dailyRes = await fetch(dailyUrl);
          const dailyJson = await dailyRes.json();
          if (dailyJson.data) {
            for (const day of dailyJson.data) {
              const date = day.date_start;
              if (!dailyData[date]) dailyData[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, purchases: 0, leads: 0 };
              dailyData[date].spend += Number(day.spend || 0);
              dailyData[date].impressions += Number(day.impressions || 0);
              dailyData[date].clicks += Number(day.clicks || 0);
              const purchaseVal = getActionValue(day.actions, "purchase")
                || getActionValue(day.actions, "offsite_conversion.fb_pixel_purchase");
              // Daily leads use the client's configured lead action types (strictly standard leads)
              const dailyLeadTypes = ["lead", "offsite_conversion.fb_pixel_lead"];
              let leadVal = 0;
              for (const t of dailyLeadTypes) leadVal += getActionValue(day.actions, t);
              dailyData[date].purchases += purchaseVal;
              dailyData[date].leads += leadVal;
              dailyData[date].conversions += purchaseVal || leadVal || getActionValue(day.actions, "link_click");
            }
          }
        } catch (e) {
          console.error(`Daily insights error for ${actId}:`, e);
        }

        return { campaigns, dailyData, accountId: actId, accountError };
      })
    );

    for (const result of accountResults) {
      if (result.status !== "fulfilled") continue;
      const { campaigns, dailyData, accountId: aId, accountError } = result.value;
      if (accountError) {
        accountErrors.push({ accountId: aId, message: accountError });
      }

      for (const camp of campaigns) {
        const insight: MetaInsight | undefined = camp.insights?.data?.[0];
        const actionPriority = getActionTypePriority(camp.objective || "", camp.name || "");
        const primary = getPrimaryResult(insight?.actions, actionPriority, insight);
        const resolvedPrimaryActionType = primary.actionType || actionPriority[0] || "link_click";

        const spend = Number(insight?.spend || 0);
        const costPerConversion = primary.value > 0 ? spend / primary.value : 0;
        const estimatedRevenue = primary.value * 50;
        const roas = spend > 0 ? Number((estimatedRevenue / spend).toFixed(2)) : 0;

        // Funnel metrics from actions
        const landingPageViews = getActionValue(insight?.actions, "landing_page_view");
        const addToCart = getActionValue(insight?.actions, "add_to_cart") || getActionValue(insight?.actions, "offsite_conversion.fb_pixel_add_to_cart");
        const initiateCheckout = getActionValue(insight?.actions, "initiate_checkout") || getActionValue(insight?.actions, "offsite_conversion.fb_pixel_initiate_checkout");
        const purchases = getActionValue(insight?.actions, "purchase") || getActionValue(insight?.actions, "offsite_conversion.fb_pixel_purchase");
        const purchaseValue = Number(insight?.action_values?.find((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase")?.value || 0);

        allCampaigns.push({
          id: camp.id,
          name: camp.name,
          status: camp.status === "ACTIVE" ? "active" : camp.status === "PAUSED" ? "paused" : "completed",
          objective: camp.objective || "",
          dailyBudget: Number(camp.daily_budget || 0),
          lifetimeBudget: Number(camp.lifetime_budget || 0),
          spend,
          impressions: Number(insight?.impressions || 0),
          clicks: Number(insight?.clicks || 0),
          ctr: Number(Number(insight?.ctr || 0).toFixed(2)),
          cpc: Number(Number(insight?.cpc || 0).toFixed(2)),
          cpm: Number(Number(insight?.cpm || 0).toFixed(2)),
          conversions: primary.value,
          costPerConversion: Number(costPerConversion.toFixed(2)),
          roas,
          reach: Number(insight?.reach || 0),
          frequency: Number(Number(insight?.frequency || 0).toFixed(2)),
          creatives: [],
          primaryResultLabel: primary.label,
          primaryResultKey: resolvedPrimaryActionType,
          _primaryActionTypes: actionPriority,
          // Funnel metrics
          landingPageViews,
          addToCart,
          initiateCheckout,
          purchases,
          purchaseValue,
          // Link-specific (correct values from Meta)
          linkClicks: Number(insight?.inline_link_clicks || 0),
          linkCtr: Number(Number(insight?.inline_link_click_ctr || 0).toFixed(2)),
          cpcLink: Number(Number(insight?.cost_per_inline_link_click || 0).toFixed(2)),
          uniqueClicks: Number(insight?.unique_clicks || 0),
          uniqueCtr: Number(Number(insight?.unique_ctr || 0).toFixed(2)),
          outboundClicks: Number(insight?.outbound_clicks?.[0]?.value || 0),
          // Video metrics (extract from action arrays)
          videoPlays: Number(insight?.video_play_actions?.[0]?.value || 0),
          thruplays: Number(insight?.video_thruplay_watched_actions?.[0]?.value || 0),
          videoP25: Number(insight?.video_p25_watched_actions?.[0]?.value || 0),
          videoP50: Number(insight?.video_p50_watched_actions?.[0]?.value || 0),
          videoP75: Number(insight?.video_p75_watched_actions?.[0]?.value || 0),
          videoP95: Number(insight?.video_p95_watched_actions?.[0]?.value || 0),
          videoP100: Number(insight?.video_p100_watched_actions?.[0]?.value || 0),
          avgVideoTime: Number(insight?.video_avg_time_watched_actions?.[0]?.value || 0),
          // Raw Meta breakdowns (used by UI to read any metric / event)
          actionBreakdown: Object.fromEntries(
            (insight?.actions || []).map((a: any) => [a.action_type, Number(a.value || 0)])
          ),
          costPerAction: Object.fromEntries(
            (insight?.cost_per_action_type || []).map((a: any) => [a.action_type, Number(a.value || 0)])
          ),
          actionValues: Object.fromEntries(
            (insight?.action_values || []).map((a: any) => [a.action_type, Number(a.value || 0)])
          ),
          uniqueActionBreakdown: Object.fromEntries(
            (insight?.unique_actions || []).map((a: any) => [a.action_type, Number(a.value || 0)])
          ),
        });
      }

      for (const [date, m] of Object.entries(dailyData)) {
        if (!dailySpend[date]) dailySpend[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, purchases: 0, leads: 0 };
        dailySpend[date].spend += m.spend;
        dailySpend[date].impressions += m.impressions;
        dailySpend[date].clicks += m.clicks;
        dailySpend[date].conversions += m.conversions;
        dailySpend[date].purchases += m.purchases;
        dailySpend[date].leads += m.leads;
      }
    }

    // If we hit rate limit and got NO data, return stale cache (even if expired)
    if (hitRateLimit && allCampaigns.length === 0 && cached) {
      console.log(`Rate limited, returning STALE cache for ${clientId}/${preset}`);
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
      });
    }

    // 3. Fetch creatives for top campaigns
    const campaignsWithSpend = allCampaigns
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 15);

    for (const camp of campaignsWithSpend) {
      await delay(150);
      const primaryActionType: string = camp.primaryResultKey || camp._primaryActionTypes?.[0] || "link_click";
      const adsUrl = `${GRAPH_API}/${camp.id}/ads?fields=name,adset_name,adset{name},creative{id,thumbnail_url,object_type,effective_object_story_id,instagram_permalink_url},insights.${insightsModifier}{spend,impressions,clicks,ctr,actions,reach}&access_token=${token}&limit=25`;

      let ads: any[] = [];
      try {
        ads = await fetchMeta<any>(adsUrl);
      } catch (error) {
        console.error(`Ads error for campaign ${camp.id}:`, error);
        if (String(error).includes("request limit") || String(error).includes("too many calls")) {
          hitRateLimit = true;
        }
        continue;
      }

      const adsNeedingPermalink = ads.filter(
        (ad: any) => !ad.creative?.instagram_permalink_url && ad.creative?.effective_object_story_id
      );

      const storyPermalinks: Record<string, string> = {};
      for (const ad of adsNeedingPermalink.slice(0, 3)) {
        const storyId = ad.creative.effective_object_story_id;
        try {
          await delay(100);
          const storyRes = await fetch(`${GRAPH_API}/${storyId}?fields=permalink_url&access_token=${token}`);
          const storyData = await storyRes.json();
          if (storyData.permalink_url) {
            storyPermalinks[storyId] = storyData.permalink_url;
          }
        } catch (_) {}
      }

      camp.creatives = ads.map((ad: any) => {
        const adInsight = ad.insights?.data?.[0];
        const adSpend = Number(adInsight?.spend || 0);
        const adPrimary = getPrimaryResult(adInsight?.actions, [primaryActionType], adInsight as MetaInsight | undefined);
        const adRevenue = adPrimary.value * 50;

        const storyId = ad.creative?.effective_object_story_id;
        const postUrl = ad.creative?.instagram_permalink_url
          || (storyId && storyPermalinks[storyId])
          || `https://www.facebook.com/ads/library/?id=${ad.id}`;

        return {
          id: ad.id,
          name: ad.name,
          adsetName: ad.adset_name || ad.adset?.name || "",
          creativeId: ad.creative?.id,
          permalinkUrl: postUrl,
          type: ad.creative?.object_type === "VIDEO" ? "video" : ad.creative?.object_type === "CAROUSEL" ? "carousel" : "image",
          thumbnail: ad.creative?.thumbnail_url || `https://picsum.photos/seed/${ad.id}/300/300`,
          impressions: Number(adInsight?.impressions || 0),
          clicks: Number(adInsight?.clicks || 0),
          ctr: Number(Number(adInsight?.ctr || 0).toFixed(2)),
          spend: adSpend,
          conversions: adPrimary.value,
          primaryResult: adPrimary.value,
          roas: adSpend > 0 ? Number((adRevenue / adSpend).toFixed(2)) : 0,
        };
      });

      // Fetch hi-res thumbnails for top 3 creatives only
      const hiResCache: Record<string, string> = {};
      const topCreatives = [...camp.creatives].sort((a: any, b: any) => b.spend - a.spend).slice(0, 3);
      for (const cr of topCreatives) {
        if (!cr.creativeId || hiResCache[cr.creativeId]) continue;
        try {
          await delay(50);
          const res = await fetch(
            `${GRAPH_API}/${cr.creativeId}?fields=thumbnail_url&thumbnail_width=1080&thumbnail_height=1080&access_token=${token}`
          );
          const data = await res.json();
          if (data.thumbnail_url) {
            hiResCache[cr.creativeId] = data.thumbnail_url;
          }
        } catch (_) {}
      }
      for (const cr of camp.creatives) {
        if (cr.creativeId && hiResCache[cr.creativeId]) {
          cr.thumbnail = hiResCache[cr.creativeId];
        }
      }

      delete camp._primaryActionTypes;
    }

    for (const camp of allCampaigns) {
      if (camp._primaryActionTypes) delete camp._primaryActionTypes;
    }

    const dailyMetrics = Object.entries(dailySpend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        spend: Number(m.spend.toFixed(2)),
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
        purchases: m.purchases,
        leads: m.leads,
      }));

    const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = allCampaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = allCampaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = allCampaigns.reduce((s, c) => s + c.conversions, 0);
    const totalReach = allCampaigns.reduce((s, c) => s + c.reach, 0);
    const totalLinkClicks = allCampaigns.reduce((s, c) => s + Number(c.linkClicks || 0), 0);
    const totalOutboundClicks = allCampaigns.reduce((s, c) => s + Number(c.outboundClicks || 0), 0);
    const totalUniqueClicks = allCampaigns.reduce((s, c) => s + Number(c.uniqueClicks || 0), 0);
    const activeCampaigns = allCampaigns.filter((c) => c.spend > 0);
    const count = activeCampaigns.length || 1;
    // Default CTR/CPC = link-based (per user preference). True weighted averages.
    const avgCTR = totalImpressions > 0 ? Number(((totalLinkClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgCPC = totalLinkClicks > 0 ? Number((totalSpend / totalLinkClicks).toFixed(2)) : 0;
    const avgCTRAll = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgCPCAll = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
    const avgROAS = Number((activeCampaigns.reduce((s, c) => s + c.roas, 0) / count).toFixed(2));

    // Aggregate funnel-level totals (used by metric sources: leads, low ticket, etc.)
    const totalPurchases = allCampaigns.reduce((s, c) => s + Number(c.purchases || 0), 0);
    const totalLandingPageViews = allCampaigns.reduce((s, c) => s + Number(c.landingPageViews || 0), 0);
    const totalAddToCart = allCampaigns.reduce((s, c) => s + Number(c.addToCart || 0), 0);
    const totalInitiateCheckout = allCampaigns.reduce((s, c) => s + Number(c.initiateCheckout || 0), 0);

    // Generic per-action-type totals (so the UI can let users choose any Meta action as a metric source).
    const extraActionTypes = [
      "link_click",
      "post_engagement",
      "page_engagement",
      "video_view",
      "onsite_conversion.messaging_conversation_started_7d",
      "complete_registration",
      "subscribe",
      "schedule",
      "contact",
      "submit_application",
      "view_content",
      "lead",
      "onsite_conversion.lead_grouped",
      "initiate_checkout",
    ];
    const extraTotals: Record<string, number> = {};
    for (const result of accountResults) {
      if (result.status !== "fulfilled") continue;
      for (const camp of result.value.campaigns) {
        const insight: MetaInsight | undefined = camp.insights?.data?.[0];
        for (const t of extraActionTypes) {
          extraTotals[t] = (extraTotals[t] || 0) + getActionValue(insight?.actions, t);
        }
      }
    }

    const leadActionTypes: string[] = (client.lead_action_types && client.lead_action_types.length > 0)
      ? client.lead_action_types
      : ["lead", "offsite_conversion.fb_pixel_lead"];

    let totalLeadActions = 0;
    for (const result of accountResults) {
      if (result.status !== "fulfilled") continue;
      for (const camp of result.value.campaigns) {
        const insight: MetaInsight | undefined = camp.insights?.data?.[0];
        for (const t of leadActionTypes) {
          totalLeadActions += getActionValue(insight?.actions, t);
        }
      }
    }

    const result = {
      campaigns: allCampaigns,
      dailyMetrics,
      overviewMetrics: {
        totalSpend, totalImpressions, totalClicks, totalConversions,
        avgCTR, avgCPC, avgROAS, totalReach,
        totalLinkClicks,
        totalOutboundClicks,
        totalUniqueClicks,
        avgCTRAll,
        avgCPCAll,
        totalLeadActions,
        totalPurchases,
        totalLandingPageViews,
        totalAddToCart,
        totalInitiateCheckout,
        // Generic action totals (keys used by metric sources UI)
        link_clicks: extraTotals["link_click"] || 0,
        post_engagement: extraTotals["post_engagement"] || 0,
        page_engagement: extraTotals["page_engagement"] || 0,
        video_view: extraTotals["video_view"] || 0,
        messaging_started: extraTotals["onsite_conversion.messaging_conversation_started_7d"] || 0,
        complete_registration: extraTotals["complete_registration"] || 0,
        subscribe: extraTotals["subscribe"] || 0,
        schedule: extraTotals["schedule"] || 0,
        contact: extraTotals["contact"] || 0,
        submit_application: extraTotals["submit_application"] || 0,
        view_content: extraTotals["view_content"] || 0,
        // Per-action breakdown — used by the MetricSourceEditor to show
        // counts next to each lead action checkbox so the user can pick
        // wisely. Keyed by the raw Meta action_type string.
        actionBreakdown: extraTotals,
      },
      accountErrors,
    };

    // 4. Save to cache only if we got actual data (don't cache empty results)
    if (allCampaigns.length > 0) {
      saveCacheData(supabase, clientId, preset, result).catch((e) =>
        console.error("Cache save error:", e)
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
