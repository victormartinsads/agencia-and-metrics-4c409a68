import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    // Fetch campaigns and insights for all ad accounts
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
          const conversions = insight ? getActionValue(insight.actions, "offsite_conversion.fb_pixel_purchase") + getActionValue(insight.actions, "purchase") + getActionValue(insight.actions, "omni_purchase") : 0;
          const totalConversions = conversions || getActionValue(insight?.actions, "lead") || getActionValue(insight?.actions, "complete_registration") || getActionValue(insight?.actions, "link_click");
          const spend = Number(insight?.spend || 0);
          const costPerConversion = totalConversions > 0 ? spend / totalConversions : 0;
          // Estimate revenue as conversions * average order value (placeholder)
          const estimatedRevenue = totalConversions * 50;
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
            conversions: totalConversions,
            costPerConversion: Number(costPerConversion.toFixed(2)),
            roas,
            reach: Number(insight?.reach || 0),
            frequency: Number(Number(insight?.frequency || 0).toFixed(2)),
            creatives: [],
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
        const adsUrl = `${GRAPH_API}/${camp.id}/ads?fields=name,creative{thumbnail_url,object_type},insights.date_preset(${preset}){spend,impressions,clicks,ctr,actions}&access_token=${token}&limit=10`;
        const adsRes = await fetch(adsUrl);
        const adsData = await adsRes.json();

        if (adsData.data) {
          camp.creatives = adsData.data.map((ad: any) => {
            const adInsight = ad.insights?.data?.[0];
            const adSpend = Number(adInsight?.spend || 0);
            const adConversions = adInsight ? getActionValue(adInsight.actions, "offsite_conversion.fb_pixel_purchase") + getActionValue(adInsight.actions, "purchase") + getActionValue(adInsight.actions, "omni_purchase") : 0;
            const totalAdConv = adConversions || getActionValue(adInsight?.actions, "lead") || getActionValue(adInsight?.actions, "link_click");
            const adRevenue = totalAdConv * 50;
            return {
              id: ad.id,
              name: ad.name,
              type: ad.creative?.object_type === "VIDEO" ? "video" : ad.creative?.object_type === "CAROUSEL" ? "carousel" : "image",
              thumbnail: ad.creative?.thumbnail_url || `https://picsum.photos/seed/${ad.id}/300/300`,
              impressions: Number(adInsight?.impressions || 0),
              clicks: Number(adInsight?.clicks || 0),
              ctr: Number(Number(adInsight?.ctr || 0).toFixed(2)),
              spend: adSpend,
              conversions: totalAdConv,
              roas: adSpend > 0 ? Number((adRevenue / adSpend).toFixed(2)) : 0,
            };
          });
        }
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
