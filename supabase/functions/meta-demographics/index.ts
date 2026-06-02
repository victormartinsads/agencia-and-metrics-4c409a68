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
    const { clientId, datePreset, forceRefresh, publicSlug } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clientId === "11111111-1111-1111-1111-111111111111" || publicSlug === "apresentacao" || clientId === "apresentacao") {
      const ageGender = [
        { label: "25-34 • female", spend: 32500, impressions: 550000, reach: 350000, clicks: 16500, results: 185 },
        { label: "25-34 • male", spend: 28400, impressions: 480000, reach: 310000, clicks: 14400, results: 152 },
        { label: "35-44 • female", spend: 12500, impressions: 210000, reach: 140000, clicks: 6300, results: 82 },
        { label: "35-44 • male", spend: 10200, impressions: 180000, reach: 120000, clicks: 5100, results: 65 },
        { label: "18-24 • female", spend: 6400, impressions: 120000, reach: 90000, clicks: 4200, results: 32 },
        { label: "18-24 • male", spend: 5200, impressions: 100000, reach: 75000, clicks: 3500, results: 24 }
      ];

      const region = [
        { label: "São Paulo", spend: 35000, impressions: 600000, reach: 410000, clicks: 18000, results: 210 },
        { label: "Rio de Janeiro", spend: 18000, impressions: 310000, reach: 210000, clicks: 9300, results: 105 },
        { label: "Minas Gerais", spend: 14000, impressions: 240000, reach: 160000, clicks: 7200, results: 80 },
        { label: "Paraná", spend: 11000, impressions: 190000, reach: 130000, clicks: 5500, results: 65 },
        { label: "Rio Grande do Sul", spend: 9200, impressions: 160000, reach: 110000, clicks: 4600, results: 50 }
      ];

      const country = [
        { label: "Brazil", spend: 95200, impressions: 1640000, reach: 1120000, clicks: 50000, results: 540 }
      ];

      const platform = [
        { label: "instagram", spend: 68500, impressions: 1100000, reach: 800000, clicks: 35000, results: 380 },
        { label: "facebook", spend: 21500, impressions: 450000, reach: 280000, clicks: 13000, results: 140 },
        { label: "messenger", spend: 2000, impressions: 50000, reach: 30000, clicks: 1200, results: 12 },
        { label: "audience_network", spend: 3200, impressions: 40000, reach: 10000, clicks: 800, results: 8 }
      ];

      const result = {
        ageGender,
        region,
        country,
        platform,
        fetched_at: new Date().toISOString(),
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let isPublic = false;
    if (publicSlug) {
      const { data: pc } = await sb
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