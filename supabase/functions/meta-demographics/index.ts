import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";
const CACHE_TTL_MINUTES = 120;

type Row = { label: string; spend: number; impressions: number; reach: number; clicks: number; results: number };

function aggregate(rows: any[], key: string): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const label = String(r[key] || "—");
    const cur = map.get(label) || { label, spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };
    cur.spend += Number(r.spend || 0);
    cur.impressions += Number(r.impressions || 0);
    cur.reach += Number(r.reach || 0);
    cur.clicks += Number(r.clicks || 0);
    const purchase = (r.actions || []).find((a: any) => a.action_type === "purchase");
    cur.results += Number(purchase?.value || 0);
    map.set(label, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
}

async function fetchAll(url: string): Promise<any[]> {
  const out: any[] = [];
  let next: string | undefined = url;
  let pages = 0;
  while (next && pages < 8) {
    const r = await fetch(next);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || "Meta API error");
    if (Array.isArray(j.data)) out.push(...j.data);
    next = j.paging?.next;
    pages += 1;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, datePreset, forceRefresh } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const preset = datePreset || "last_30d";
    const cacheKey = `demo:${preset}`;

    const { data: cached } = await sb.from("meta_ads_cache")
      .select("*").eq("client_id", clientId).eq("date_preset", cacheKey).maybeSingle();
    if (!forceRefresh && cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response_data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const { data: client } = await sb.from("clients").select("*").eq("id", clientId).single();
    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = client.meta_access_token;
    const accounts: string[] = client.ad_account_ids || [];
    if (!token || !accounts.length) {
      return new Response(JSON.stringify({ ageGender: [], region: [], country: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customMatch = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(preset);
    const dateQS = customMatch
      ? `time_range=${encodeURIComponent(JSON.stringify({ since: customMatch[1], until: customMatch[2] }))}`
      : `date_preset=${preset}`;
    const fields = "spend,impressions,reach,clicks,actions";

    const fetchBreakdown = async (breakdowns: string) => {
      const all: any[] = [];
      for (const acc of accounts) {
        const actId = acc.startsWith("act_") ? acc : `act_${acc}`;
        const url = `${GRAPH_API}/${actId}/insights?fields=${fields}&${dateQS}&breakdowns=${breakdowns}&level=account&limit=500&access_token=${token}`;
        try {
          const rows = await fetchAll(url);
          all.push(...rows);
        } catch (e) {
          console.warn(`demographics ${breakdowns} failed for ${acc}`, e);
        }
      }
      return all;
    };

    const [ageGenderRows, regionRows, countryRows, platformRows] = await Promise.all([
      fetchBreakdown("age,gender"),
      fetchBreakdown("region"),
      fetchBreakdown("country"),
      fetchBreakdown("publisher_platform"),
    ]);

    // Custom aggregation for age,gender combined
    const agMap = new Map<string, Row>();
    for (const r of ageGenderRows) {
      const label = `${r.age || "—"} • ${r.gender || "—"}`;
      const cur = agMap.get(label) || { label, spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };
      cur.spend += Number(r.spend || 0);
      cur.impressions += Number(r.impressions || 0);
      cur.reach += Number(r.reach || 0);
      cur.clicks += Number(r.clicks || 0);
      const purchase = (r.actions || []).find((a: any) => a.action_type === "purchase");
      cur.results += Number(purchase?.value || 0);
      agMap.set(label, cur);
    }

    const result = {
      ageGender: Array.from(agMap.values()).sort((a, b) => b.spend - a.spend),
      region: aggregate(regionRows, "region").slice(0, 20),
      country: aggregate(countryRows, "country").slice(0, 20),
      platform: aggregate(platformRows, "publisher_platform"),
      fetched_at: new Date().toISOString(),
    };

    await sb.from("meta_ads_cache").upsert({
      client_id: clientId,
      date_preset: cacheKey,
      response_data: result,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString(),
    }, { onConflict: "client_id,date_preset" });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e: any) {
    console.error("meta-demographics error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});