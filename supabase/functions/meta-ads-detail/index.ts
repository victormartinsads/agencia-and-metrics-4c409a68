import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = "https://graph.facebook.com/v21.0";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Lista o mais COMPLETA possível de fields suportados em insights da Meta.
// Mantemos como string única por chamada — ajustável via body.fields.
const DEFAULT_INSIGHT_FIELDS = [
  "spend","impressions","clicks","ctr","cpc","cpm","reach","frequency",
  "actions","action_values","cost_per_action_type","cost_per_unique_action_type",
  "unique_actions","unique_clicks","unique_ctr","outbound_clicks","outbound_clicks_ctr",
  "inline_link_clicks","inline_link_click_ctr","inline_post_engagement",
  "video_play_actions","video_thruplay_watched_actions","video_p25_watched_actions",
  "video_p50_watched_actions","video_p75_watched_actions","video_p100_watched_actions",
  "video_avg_time_watched_actions","cost_per_thruplay","cost_per_inline_link_click",
  "cost_per_unique_click","quality_ranking","engagement_rate_ranking","conversion_rate_ranking",
  "purchase_roas","website_purchase_roas","attribution_setting","objective","optimization_goal",
].join(",");

function buildInsightExpr(preset: string) {
  const m = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(preset);
  return m
    ? `time_range({since:'${m[1]}',until:'${m[2]}'})`
    : `date_preset(${preset || "last_7d"})`;
}

async function fetchAll<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  let pages = 0;
  while (next && pages < 8) {
    const r = await fetch(next);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    if (Array.isArray(j.data)) out.push(...j.data);
    next = j.paging?.next;
    pages++;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { clientId, campaignId, datePreset = "last_7d" } = await req.json();
    if (!clientId || !campaignId) {
      return new Response(JSON.stringify({ error: "clientId and campaignId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: client } = await supabase.from("clients").select("meta_access_token").eq("id", clientId).single();
    if (!client?.meta_access_token) {
      return new Response(JSON.stringify({ error: "Token não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = client.meta_access_token;
    const insightExpr = buildInsightExpr(datePreset);

    // Campanha (info + insights completos)
    const campRes = await fetch(
      `${GRAPH}/${campaignId}?fields=name,status,objective,daily_budget,lifetime_budget,bid_strategy,buying_type,start_time,stop_time,insights.${insightExpr}{${DEFAULT_INSIGHT_FIELDS}}&access_token=${token}`
    );
    const camp = await campRes.json();
    if (camp.error) throw new Error(camp.error.message);

    await delay(80);

    // AdSets
    const adsets = await fetchAll<any>(
      `${GRAPH}/${campaignId}/adsets?fields=name,status,daily_budget,lifetime_budget,bid_strategy,billing_event,optimization_goal,targeting,start_time,end_time,insights.${insightExpr}{${DEFAULT_INSIGHT_FIELDS}}&access_token=${token}&limit=50`
    );

    await delay(80);

    // Ads
    const ads = await fetchAll<any>(
      `${GRAPH}/${campaignId}/ads?fields=name,status,adset_id,adset{name},creative{id,thumbnail_url,object_type,instagram_permalink_url,effective_object_story_id},insights.${insightExpr}{${DEFAULT_INSIGHT_FIELDS}}&access_token=${token}&limit=100`
    );

    return new Response(JSON.stringify({ campaign: camp, adsets, ads }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-ads-detail error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});