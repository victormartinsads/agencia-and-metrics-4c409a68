import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_API = "https://analyticsdata.googleapis.com/v1beta";

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clientId, propertyId, dateRange } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get stored tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ notConnected: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expired
    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt <= new Date(Date.now() + 60000)) {
      console.log("Token expired, refreshing...");
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabase
        .from("google_tokens")
        .update({ access_token: accessToken, expires_at: newExpiry })
        .eq("id", tokenRow.id);
    }

    // Get property ID from client or request
    let gaPropertyId = propertyId;
    if (!gaPropertyId) {
      const { data: client } = await supabase
        .from("clients")
        .select("ga_property_id")
        .eq("id", clientId)
        .single();
      gaPropertyId = client?.ga_property_id;
    }

    if (!gaPropertyId) {
      // List available GA4 properties so user can pick one
      const accountsRes = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const accountsData = await accountsRes.json();

      const properties: { id: string; name: string; account: string }[] = [];
      if (accountsData.accountSummaries) {
        for (const account of accountsData.accountSummaries) {
          if (account.propertySummaries) {
            for (const prop of account.propertySummaries) {
              properties.push({
                id: prop.property?.replace("properties/", "") || "",
                name: prop.displayName || "",
                account: account.displayName || "",
              });
            }
          }
        }
      }

      console.log("accountSummaries response:", JSON.stringify(accountsData).slice(0, 500));
      console.log("Properties found:", properties.length);

      return new Response(
        JSON.stringify({
          needsPropertySelection: true,
          properties,
          scopes: tokenRow.scopes,
          apiError: !accountsRes.ok ? accountsData : undefined,
        }),
        {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch GA4 data
    const startDate = dateRange?.startDate || "30daysAgo";
    const endDate = dateRange?.endDate || "today";

    // Run report: sessions, users, pageviews, bounce rate, avg session duration
    const reportRes = await fetch(
      `${GA4_API}/properties/${gaPropertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "screenPageViews" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "engagedSessions" },
          ],
        }),
      }
    );

    const reportData = await reportRes.json();
    if (!reportRes.ok) {
      console.error("GA4 report error:", reportData);
      return new Response(JSON.stringify({ error: "GA4 API error", details: reportData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Daily breakdown
    const dailyRes = await fetch(
      `${GA4_API}/properties/${gaPropertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }
    );
    const dailyData = await dailyRes.json();

    // Traffic sources
    const sourcesRes = await fetch(
      `${GA4_API}/properties/${gaPropertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
      }
    );
    const sourcesData = await sourcesRes.json();

    // UTM breakdown: source / medium / campaign
    const utmRes = await fetch(
      `${GA4_API}/properties/${gaPropertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
            { name: "sessionCampaignName" },
          ],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "engagedSessions" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 50,
        }),
      }
    );
    const utmData = await utmRes.json();

    // Parse overview
    const overviewRow = reportData.rows?.[0]?.metricValues || [];
    const overview = {
      sessions: Number(overviewRow[0]?.value || 0),
      totalUsers: Number(overviewRow[1]?.value || 0),
      newUsers: Number(overviewRow[2]?.value || 0),
      pageViews: Number(overviewRow[3]?.value || 0),
      bounceRate: Number(Number(overviewRow[4]?.value || 0).toFixed(2)),
      avgSessionDuration: Number(Number(overviewRow[5]?.value || 0).toFixed(1)),
      engagedSessions: Number(overviewRow[6]?.value || 0),
    };

    // Parse daily
    const daily = (dailyData.rows || []).map((row: any) => {
      const dateStr = row.dimensionValues[0].value;
      const formatted = `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}`;
      return {
        date: formatted,
        sessions: Number(row.metricValues[0].value || 0),
        users: Number(row.metricValues[1].value || 0),
        pageViews: Number(row.metricValues[2].value || 0),
      };
    });

    // Parse sources
    const sources = (sourcesData.rows || []).map((row: any) => ({
      channel: row.dimensionValues[0].value,
      sessions: Number(row.metricValues[0].value || 0),
      users: Number(row.metricValues[1].value || 0),
    }));

    // Parse UTMs
    const utms = (utmData.rows || []).map((row: any) => ({
      source: row.dimensionValues[0].value || "(not set)",
      medium: row.dimensionValues[1].value || "(not set)",
      campaign: row.dimensionValues[2].value || "(not set)",
      sessions: Number(row.metricValues[0].value || 0),
      users: Number(row.metricValues[1].value || 0),
      engagedSessions: Number(row.metricValues[2].value || 0),
    }));

    return new Response(JSON.stringify({ overview, daily, sources, utms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Google Analytics error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
