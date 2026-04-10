import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  actions?: { action_type: string; value: string }[];
  reach?: string;
  frequency?: string;
  cost_per_action_type?: { action_type: string; value: string }[];
}

function getActionValue(actions: { action_type: string; value: string }[] | undefined, type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value || 0);
}

// Action type to human-readable label map
const ACTION_LABELS: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "Conversas Iniciadas",
  "onsite_conversion.messaging_first_reply": "Conversas Iniciadas",
  "offsite_conversion.fb_pixel_purchase": "Compras",
  "purchase": "Compras",
  "omni_purchase": "Compras",
  "offsite_conversion.fb_pixel_initiate_checkout": "Finalizações de Compra",
  "initiate_checkout": "Finalizações de Compra",
  "lead": "Leads",
  "offsite_conversion.fb_pixel_lead": "Leads",
  "complete_registration": "Registros Completos",
  "link_click": "Cliques no Link",
  "landing_page_view": "Visualizações da Página",
  "post_engagement": "Engajamento",
  "page_engagement": "Engajamento",
  "app_install": "Instalações do App",
  "mobile_app_install": "Instalações do App",
};

// Determine priority list of action types based on campaign objective/name
function getActionTypePriority(objective: string, campaignName: string): string[] {
  const nameLower = campaignName.toLowerCase();
  const objLower = objective.toLowerCase();

  // WhatsApp campaigns → messaging conversations
  if (nameLower.includes("whatsapp") || nameLower.includes("wpp") || nameLower.includes("zap")) {
    return ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply", "link_click"];
  }

  // Sales / conversion campaigns → purchases or checkouts
  if (objLower.includes("outcome_sales") || objLower.includes("conversions") || objLower.includes("product_catalog_sales") || nameLower.includes("vendas") || nameLower.includes("sales") || nameLower.includes("compra")) {
    return ["offsite_conversion.fb_pixel_purchase", "purchase", "omni_purchase", "offsite_conversion.fb_pixel_initiate_checkout", "initiate_checkout", "link_click"];
  }

  // Lead campaigns
  if (objLower.includes("lead") || objLower.includes("outcome_leads") || nameLower.includes("lead")) {
    return ["lead", "offsite_conversion.fb_pixel_lead", "complete_registration", "link_click"];
  }

  // Traffic campaigns
  if (objLower.includes("link_clicks") || objLower.includes("outcome_traffic") || nameLower.includes("tráfego") || nameLower.includes("traffic")) {
    return ["link_click", "landing_page_view"];
  }

  // Engagement campaigns
  if (objLower.includes("engagement") || objLower.includes("post_engagement") || nameLower.includes("engajamento")) {
    return ["post_engagement", "page_engagement", "link_click"];
  }

  // App install
  if (objLower.includes("app_installs") || objLower.includes("outcome_app_promotion")) {
    return ["app_install", "mobile_app_install", "link_click"];
  }

  // Default: link clicks
  return ["link_click", "landing_page_view"];
}

// Get the first matching action value AND its label from a priority list
function getPrimaryResult(actions: { action_type: string; value: string }[] | undefined, actionTypes: string[]): { value: number; label: string; actionType: string } {
  if (!actions) return { value: 0, label: "Cliques no Link", actionType: "" };
  for (const type of actionTypes) {
    const val = getActionValue(actions, type);
    if (val > 0) {
      return { value: val, label: ACTION_LABELS[type] || type, actionType: type };
    }
  }
  return { value: 0, label: ACTION_LABELS[actionTypes[0]] || "Resultados", actionType: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clientId, datePreset } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    const token = client.meta_access_token;
    const adAccountIds: string[] = client.ad_account_ids;
    const preset = datePreset || "last_7d";

    const allCampaigns: any[] = [];
    const dailySpend: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const accountId of adAccountIds) {
      const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

      // Get campaigns with insights
      const campaignsUrl = `${GRAPH_API}/${actId}/campaigns?fields=name,status,objective,insights.date_preset(${preset}){spend,impressions,clicks,ctr,cpc,actions,reach,frequency,cost_per_action_type}&access_token=${token}&limit=50`;
      const campRes = await fetch(campaignsUrl);
      const campData = await campRes.json();

      if (campData.error) {
        console.error(`Meta API error for ${actId}:`, campData.error);
        continue;
      }

      if (campData.data) {
        for (const camp of campData.data) {
          const insight: MetaInsight | undefined = camp.insights?.data?.[0];
          const primaryMeta = determinePrimaryResult(camp.objective || "", camp.name || "");
          const primaryResultValue = getPrimaryResultValue(insight?.actions, primaryMeta.actionTypes);

          const spend = Number(insight?.spend || 0);
          const costPerConversion = primaryResultValue > 0 ? spend / primaryResultValue : 0;
          const estimatedRevenue = primaryResultValue * 50;
          const roas = spend > 0 ? Number((estimatedRevenue / spend).toFixed(2)) : 0;

          allCampaigns.push({
            id: camp.id,
            name: camp.name,
            status: camp.status === "ACTIVE" ? "active" : camp.status === "PAUSED" ? "paused" : "completed",
            objective: camp.objective || "",
            spend,
            impressions: Number(insight?.impressions || 0),
            clicks: Number(insight?.clicks || 0),
            ctr: Number(Number(insight?.ctr || 0).toFixed(2)),
            cpc: Number(Number(insight?.cpc || 0).toFixed(2)),
            conversions: primaryResultValue,
            costPerConversion: Number(costPerConversion.toFixed(2)),
            roas,
            reach: Number(insight?.reach || 0),
            frequency: Number(Number(insight?.frequency || 0).toFixed(2)),
            creatives: [],
            primaryResultLabel: primaryMeta.label,
            primaryResultKey: primaryMeta.key,
            _primaryActionTypes: primaryMeta.actionTypes, // internal, for creatives
          });
        }
      }

      // Get daily insights for charts
      const dailyUrl = `${GRAPH_API}/${actId}/insights?fields=spend,impressions,clicks,actions&date_preset=${preset}&time_increment=1&access_token=${token}&limit=90`;
      const dailyRes = await fetch(dailyUrl);
      const dailyData = await dailyRes.json();

      if (dailyData.data) {
        for (const day of dailyData.data) {
          const date = day.date_start;
          if (!dailySpend[date]) {
            dailySpend[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
          }
          dailySpend[date].spend += Number(day.spend || 0);
          dailySpend[date].impressions += Number(day.impressions || 0);
          dailySpend[date].clicks += Number(day.clicks || 0);
          const conv = getActionValue(day.actions, "offsite_conversion.fb_pixel_purchase") + getActionValue(day.actions, "purchase") + getActionValue(day.actions, "omni_purchase");
          dailySpend[date].conversions += conv || getActionValue(day.actions, "lead") || getActionValue(day.actions, "link_click");
        }
      }

      // Get top ads (creatives) for each campaign
      for (const camp of allCampaigns.filter((c) => c.creatives.length === 0)) {
        const primaryActionTypes: string[] = camp._primaryActionTypes;
        const adsUrl = `${GRAPH_API}/${camp.id}/ads?fields=name,creative{thumbnail_url,object_type},insights.date_preset(${preset}){spend,impressions,clicks,ctr,actions}&access_token=${token}&limit=10`;
        const adsRes = await fetch(adsUrl);
        const adsData = await adsRes.json();

        if (adsData.data) {
          camp.creatives = adsData.data.map((ad: any) => {
            const adInsight = ad.insights?.data?.[0];
            const adSpend = Number(adInsight?.spend || 0);
            const adPrimaryResult = getPrimaryResultValue(adInsight?.actions, primaryActionTypes);
            const adRevenue = adPrimaryResult * 50;
            return {
              id: ad.id,
              name: ad.name,
              type: ad.creative?.object_type === "VIDEO" ? "video" : ad.creative?.object_type === "CAROUSEL" ? "carousel" : "image",
              thumbnail: ad.creative?.thumbnail_url || `https://picsum.photos/seed/${ad.id}/300/300`,
              impressions: Number(adInsight?.impressions || 0),
              clicks: Number(adInsight?.clicks || 0),
              ctr: Number(Number(adInsight?.ctr || 0).toFixed(2)),
              spend: adSpend,
              conversions: adPrimaryResult,
              primaryResult: adPrimaryResult,
              roas: adSpend > 0 ? Number((adRevenue / adSpend).toFixed(2)) : 0,
            };
          });
        }
        // Remove internal field
        delete camp._primaryActionTypes;
      }
    }

    // Build daily metrics sorted
    const dailyMetrics = Object.entries(dailySpend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, m]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        spend: Number(m.spend.toFixed(2)),
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
      }));

    // Overview metrics
    const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = allCampaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = allCampaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = allCampaigns.reduce((s, c) => s + c.conversions, 0);
    const totalReach = allCampaigns.reduce((s, c) => s + c.reach, 0);
    const avgCTR = allCampaigns.length > 0 ? Number((allCampaigns.reduce((s, c) => s + c.ctr, 0) / allCampaigns.length).toFixed(2)) : 0;
    const avgCPC = allCampaigns.length > 0 ? Number((allCampaigns.reduce((s, c) => s + c.cpc, 0) / allCampaigns.length).toFixed(2)) : 0;
    const avgROAS = allCampaigns.length > 0 ? Number((allCampaigns.reduce((s, c) => s + c.roas, 0) / allCampaigns.length).toFixed(2)) : 0;

    const result = {
      campaigns: allCampaigns,
      dailyMetrics,
      overviewMetrics: {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCTR,
        avgCPC,
        avgROAS,
        totalReach,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
