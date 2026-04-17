import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

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
  if (objLower.includes("lead") || objLower.includes("outcome_leads") || nameLower.includes("lead")) {
    return ["lead", "link_click"];
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
    const { clientId, datePreset, forceRefresh } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const preset = datePreset || "last_7d";

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

    const token = client.meta_access_token;
    const adAccountIds: string[] = client.ad_account_ids;

    const allCampaigns: any[] = [];
    const dailySpend: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> = {};
    let hitRateLimit = false;

    // Process all ad accounts concurrently (batched)
    const accountResults = await Promise.allSettled(
      adAccountIds.map(async (accountId) => {
        const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
        const campaigns: any[] = [];

        const campaignsUrl = `${GRAPH_API}/${actId}/campaigns?fields=name,status,objective,insights.date_preset(${preset}){spend,impressions,clicks,ctr,cpc,cpm,actions,action_values,reach,frequency,cost_per_action_type}&access_token=${token}&limit=100`;

        try {
          const fetched = await fetchMeta<any>(campaignsUrl);
          campaigns.push(...fetched);
        } catch (error) {
          console.error(`Meta API error for ${actId}:`, error);
          if (String(error).includes("request limit") || String(error).includes("too many calls")) {
            hitRateLimit = true;
          }
        }

        // Daily insights
        const dailyData: Record<string, { spend: number; impressions: number; clicks: number; conversions: number }> = {};
        try {
          await delay(100);
          const dailyUrl = `${GRAPH_API}/${actId}/insights?fields=spend,impressions,clicks,actions&date_preset=${preset}&time_increment=1&access_token=${token}&limit=90`;
          const dailyRes = await fetch(dailyUrl);
          const dailyJson = await dailyRes.json();
          if (dailyJson.data) {
            for (const day of dailyJson.data) {
              const date = day.date_start;
              if (!dailyData[date]) dailyData[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
              dailyData[date].spend += Number(day.spend || 0);
              dailyData[date].impressions += Number(day.impressions || 0);
              dailyData[date].clicks += Number(day.clicks || 0);
              const conv = getActionValue(day.actions, "purchase");
              dailyData[date].conversions += conv || getActionValue(day.actions, "lead") || getActionValue(day.actions, "link_click");
            }
          }
        } catch (e) {
          console.error(`Daily insights error for ${actId}:`, e);
        }

        return { campaigns, dailyData };
      })
    );

    for (const result of accountResults) {
      if (result.status !== "fulfilled") continue;
      const { campaigns, dailyData } = result.value;

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
        });
      }

      for (const [date, m] of Object.entries(dailyData)) {
        if (!dailySpend[date]) dailySpend[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        dailySpend[date].spend += m.spend;
        dailySpend[date].impressions += m.impressions;
        dailySpend[date].clicks += m.clicks;
        dailySpend[date].conversions += m.conversions;
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
      const adsUrl = `${GRAPH_API}/${camp.id}/ads?fields=name,adset_name,creative{id,thumbnail_url,object_type,effective_object_story_id,instagram_permalink_url},insights.date_preset(${preset}){spend,impressions,clicks,ctr,actions,reach}&access_token=${token}&limit=25`;

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
          adsetName: ad.adset_name || "",
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
      }));

    const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = allCampaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = allCampaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = allCampaigns.reduce((s, c) => s + c.conversions, 0);
    const totalReach = allCampaigns.reduce((s, c) => s + c.reach, 0);
    const activeCampaigns = allCampaigns.filter((c) => c.spend > 0);
    const count = activeCampaigns.length || 1;
    const avgCTR = Number((activeCampaigns.reduce((s, c) => s + c.ctr, 0) / count).toFixed(2));
    const avgCPC = Number((activeCampaigns.reduce((s, c) => s + c.cpc, 0) / count).toFixed(2));
    const avgROAS = Number((activeCampaigns.reduce((s, c) => s + c.roas, 0) / count).toFixed(2));

    const result = {
      campaigns: allCampaigns,
      dailyMetrics,
      overviewMetrics: { totalSpend, totalImpressions, totalClicks, totalConversions, avgCTR, avgCPC, avgROAS, totalReach },
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
