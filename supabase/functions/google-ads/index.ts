import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { /* not JSON */ }
  if (!res.ok || !data?.access_token) {
    throw new Error(`Token refresh failed (${res.status}): ${raw.slice(0, 300)}`);
  }
  return data as { access_token: string; expires_in: number };
}

function mapDateRange(dateRange: string | undefined): { since: string; until: string } {
  // Aceita "custom:YYYY-MM-DD:YYYY-MM-DD" ou presets equivalentes ao Meta
  const customMatch = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(dateRange || "");
  if (customMatch) return { since: customMatch[1], until: customMatch[2] };

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const sub = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  switch (dateRange) {
    case "today": return { since: fmt(today), until: fmt(today) };
    case "yesterday": { const y = sub(1); return { since: fmt(y), until: fmt(y) }; }
    case "last_3d": return { since: fmt(sub(3)), until: fmt(today) };
    case "last_14d": return { since: fmt(sub(14)), until: fmt(today) };
    case "last_30d": return { since: fmt(sub(30)), until: fmt(today) };
    default: return { since: fmt(sub(7)), until: fmt(today) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    if (!developerToken) {
      // Estrutura preparada — aguardando o usuário cadastrar o Developer Token
      return new Response(
        JSON.stringify({
          notConfigured: true,
          message: "Google Ads ainda não configurado. Adicione o secret GOOGLE_ADS_DEVELOPER_TOKEN para ativar.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { clientId, dateRange, loginCustomerId } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow } = await supabase
      .from("google_tokens").select("*").eq("client_id", clientId).single();

    if (!tokenRow) {
      return new Response(JSON.stringify({ notConnected: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.expires_at) <= new Date(Date.now() + 60000)) {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      await supabase.from("google_tokens").update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("id", tokenRow.id);
    }

    const { data: client } = await supabase
      .from("clients").select("google_ads_customer_id").eq("id", clientId).single();
    const customerId = (client?.google_ads_customer_id || "").replace(/-/g, "");
    if (!customerId) {
      return new Response(JSON.stringify({ needsCustomerId: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { since, until } = mapDateRange(dateRange);
    const query = `
      SELECT campaign.id, campaign.name, campaign.status,
        metrics.cost_micros, metrics.impressions, metrics.clicks,
        metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${since}' AND '${until}'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };
    if (loginCustomerId) headers["login-customer-id"] = String(loginCustomerId).replace(/-/g, "");

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`, {
      method: "POST", headers, body: JSON.stringify({ query }),
    });
    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* not JSON */ }
    if (!res.ok || !data) {
      const msg = data?.error?.message
        || (raw.includes("login-customer-id") ? "Esta conta exige um manager (login-customer-id). Configure-o nas configurações do cliente."
        :   raw.includes("DEVELOPER_TOKEN") ? "Developer token inválido ou ainda não aprovado pelo Google Ads."
        :   raw.slice(0, 300));
      return new Response(JSON.stringify({ error: "Google Ads API error", status: res.status, message: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaigns = (data.results || []).map((r: any) => ({
      id: r.campaign?.id,
      name: r.campaign?.name,
      status: r.campaign?.status,
      cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
      impressions: Number(r.metrics?.impressions || 0),
      clicks: Number(r.metrics?.clicks || 0),
      conversions: Number(r.metrics?.conversions || 0),
      revenue: Number(r.metrics?.conversionsValue || 0),
      ctr: Number(r.metrics?.ctr || 0),
      avgCpc: Number(r.metrics?.averageCpc || 0) / 1_000_000,
    }));

    const totals = campaigns.reduce((acc: any, c: any) => ({
      cost: acc.cost + c.cost,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
      revenue: acc.revenue + c.revenue,
    }), { cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

    return new Response(JSON.stringify({ campaigns, totals, dateRange: { since, until } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-ads error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});