import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v20";

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

    const { clientId, dateRange, loginCustomerId, publicSlug } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    let { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!tokenRow) {
      const { data: fallbackToken } = await supabase
        .from("google_tokens")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (fallbackToken) {
        tokenRow = fallbackToken;
      }
    }

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
      SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
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
    const envLogin = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
    const explicitLogin = loginCustomerId || envLogin;
    if (explicitLogin) headers["login-customer-id"] = String(explicitLogin).replace(/-/g, "");

    const url = `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:search`;
    const doSearch = (loginId?: string) => {
      const h = { ...headers };
      if (loginId) h["login-customer-id"] = loginId;
      else delete h["login-customer-id"];
      return fetch(url, { method: "POST", headers: h, body: JSON.stringify({ query }) });
    };

    let res = await doSearch(explicitLogin ? String(explicitLogin).replace(/-/g, "") : undefined);
    let raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* not JSON */ }

    // Auto-discover login-customer-id (manager) by trying accessible customers
    let workingLoginId = explicitLogin ? String(explicitLogin).replace(/-/g, "") : undefined;
    if (res.status === 403 && !explicitLogin) {
      try {
        const listRes = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
          headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken },
        });
        const listRaw = await listRes.text();
        let listJson: any = {};
        try { listJson = JSON.parse(listRaw); } catch { /* */ }
        const ids: string[] = (listJson?.resourceNames || []).map((r: string) => r.split("/")[1]);
        console.log(`google-ads: listAccessibleCustomers status=${listRes.status} ids=${JSON.stringify(ids)}`);
        for (const id of ids) {
          if (id === customerId) continue;
          const r2 = await doSearch(id);
          const raw2 = await r2.text();
          if (r2.ok) {
            res = r2; raw = raw2;
            workingLoginId = id;
            try { data = JSON.parse(raw2); } catch { /* */ }
            console.log(`google-ads: succeeded with login-customer-id=${id}`);
            break;
          } else if (r2.status !== 403) {
            res = r2; raw = raw2;
            try { data = JSON.parse(raw2); } catch { /* */ }
            break;
          }
        }
      } catch (e) {
        console.warn("listAccessibleCustomers failed:", e);
      }
    }

    if (!res.ok || !data) {
      const detailStr = JSON.stringify(data || {});
      const errMsg = data?.error?.message || raw.slice(0, 300);
      let friendly = errMsg;
      if (res.status === 403 || /caller does not have permission|PERMISSION_DENIED/i.test(detailStr)) {
        friendly = "Sem permissão (403). Causa comum: seu Developer Token está em modo de Teste e só funciona com contas de teste do Google Ads. Solicite acesso 'Basic' em https://ads.google.com/aw/apicenter — depois reconecte o Google neste cliente.";
      } else if (raw.includes("login-customer-id")) {
        friendly = "Esta conta exige um manager (login-customer-id). Configure GOOGLE_ADS_LOGIN_CUSTOMER_ID nos secrets.";
      } else if (/DEVELOPER_TOKEN|developer-token/i.test(detailStr)) {
        friendly = "Developer token inválido ou não aprovado pelo Google Ads.";
      }
      console.error("google-ads non-ok:", res.status, errMsg);
      return new Response(JSON.stringify({ error: "Google Ads API error", status: res.status, message: friendly, detail: errMsg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Secondary fetch: Keywords for Search
    let keywordsData: any[] = [];
    try {
      const kwQuery = `
        SELECT campaign.id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM keyword_view
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND metrics.impressions > 0
        LIMIT 200
      `;
      const kwHeaders = { ...headers };
      if (workingLoginId) kwHeaders["login-customer-id"] = workingLoginId;
      const kwRes = await fetch(url, { method: "POST", headers: kwHeaders, body: JSON.stringify({ query: kwQuery }) });
      if (kwRes.ok) {
        const kwJson = await kwRes.json();
        keywordsData = (kwJson.results || []).map((r: any) => ({
          campaignId: r.campaign?.id,
          text: r.adGroupCriterion?.keyword?.text,
          matchType: r.adGroupCriterion?.keyword?.matchType,
          cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
          impressions: Number(r.metrics?.impressions || 0),
          clicks: Number(r.metrics?.clicks || 0),
          conversions: Number(r.metrics?.conversions || 0),
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch Google Ads keywords:", err);
    }

    // Secondary fetch: Asset views (Display, Youtube, PMax)
    let creativesData: any[] = [];
    try {
      const assetQuery = `
        SELECT campaign.id,
          asset.id,
          asset.name,
          asset.type,
          asset.image_asset.full_size.image_url,
          asset.youtube_video_asset.youtube_video_id,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM ad_group_ad_asset_view
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND metrics.impressions > 0
        LIMIT 200
      `;
      const assetHeaders = { ...headers };
      if (workingLoginId) assetHeaders["login-customer-id"] = workingLoginId;
      const assetRes = await fetch(url, { method: "POST", headers: assetHeaders, body: JSON.stringify({ query: assetQuery }) });
      if (assetRes.ok) {
        const assetJson = await assetRes.json();
        creativesData = (assetJson.results || []).map((r: any) => ({
          campaignId: r.campaign?.id,
          id: r.asset?.id,
          name: r.asset?.name || `Criativo ${r.asset?.id}`,
          type: r.asset?.type,
          imageUrl: r.asset?.imageAsset?.fullSize?.imageUrl,
          youtubeVideoId: r.asset?.youtubeVideoAsset?.youtubeVideoId,
          cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
          impressions: Number(r.metrics?.impressions || 0),
          clicks: Number(r.metrics?.clicks || 0),
          conversions: Number(r.metrics?.conversions || 0),
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch Google Ads assets:", err);
    }

    // Fallback creative fetch from ad_group_ad (for video ads YouTube links)
    try {
      const adQuery = `
        SELECT campaign.id,
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.video_ad.video.media_asset,
          ad_group_ad.ad.video_responsive_ad.videos,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM ad_group_ad
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND metrics.impressions > 0
        LIMIT 100
      `;
      const adHeaders = { ...headers };
      if (workingLoginId) adHeaders["login-customer-id"] = workingLoginId;
      const adRes = await fetch(url, { method: "POST", headers: adHeaders, body: JSON.stringify({ query: adQuery }) });
      if (adRes.ok) {
        const adJson = await adRes.json();
        for (const r of (adJson.results || [])) {
          const campId = r.campaign?.id;
          const adId = r.adGroupAd?.ad?.id;
          const adName = r.adGroupAd?.ad?.name;
          const adType = r.adGroupAd?.ad?.type;
          const cost = Number(r.metrics?.costMicros || 0) / 1_000_000;
          const impressions = Number(r.metrics?.impressions || 0);
          const clicks = Number(r.metrics?.clicks || 0);
          const conversions = Number(r.metrics?.conversions || 0);

          let youtubeVideoId = r.adGroupAd?.ad?.videoAd?.video?.mediaAsset;
          if (!youtubeVideoId && r.adGroupAd?.ad?.videoResponsiveAd?.videos?.length > 0) {
            youtubeVideoId = r.adGroupAd?.ad?.videoResponsiveAd?.videos[0]?.video?.mediaAsset;
          }

          if (youtubeVideoId) {
            const rawId = youtubeVideoId.split("/").pop();
            const exists = creativesData.some(c => c.youtubeVideoId === rawId && c.campaignId === campId);
            if (!exists) {
              creativesData.push({
                campaignId: campId,
                id: adId,
                name: adName || `Vídeo ${adId}`,
                type: adType || "VIDEO",
                youtubeVideoId: rawId,
                cost,
                impressions,
                clicks,
                conversions,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch Google Ads ad_group_ad video fallbacks:", err);
    }

    // Secondary fetch: Conversions breakdown per campaign
    let conversionsData: any[] = [];
    try {
      const convQuery = `
        SELECT campaign.id,
          segments.conversion_action_name,
          segments.conversion_action_category,
          metrics.conversions
        FROM campaign
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND metrics.conversions > 0
        LIMIT 300
      `;
      const convHeaders = { ...headers };
      if (workingLoginId) convHeaders["login-customer-id"] = workingLoginId;
      const convRes = await fetch(url, { method: "POST", headers: convHeaders, body: JSON.stringify({ query: convQuery }) });
      if (convRes.ok) {
        const convJson = await convRes.json();
        conversionsData = (convJson.results || []).map((r: any) => ({
          campaignId: r.campaign?.id,
          name: r.segments?.conversionActionName,
          category: r.segments?.conversionActionCategory,
          count: Number(r.metrics?.conversions || 0),
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch Google Ads conversions breakdown:", err);
    }

    const campaigns = (data.results || []).map((r: any) => {
      const cId = r.campaign?.id;
      const cType = r.campaign?.advertisingChannelType || "UNKNOWN";
      
      const campaignKeywords = keywordsData
        .filter((kw: any) => kw.campaignId === cId)
        .sort((a: any, b: any) => b.cost - a.cost)
        .slice(0, 10);

      const campaignCreatives = creativesData
        .filter((cr: any) => cr.campaignId === cId)
        .sort((a: any, b: any) => b.cost - a.cost)
        .slice(0, 6);

      const campaignConversions = conversionsData
        .filter((c: any) => c.campaignId === cId)
        .sort((a: any, b: any) => b.count - a.count);

      return {
        id: cId,
        name: r.campaign?.name,
        status: r.campaign?.status,
        type: cType,
        cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
        impressions: Number(r.metrics?.impressions || 0),
        clicks: Number(r.metrics?.clicks || 0),
        conversions: Number(r.metrics?.conversions || 0),
        revenue: Number(r.metrics?.conversionsValue || 0),
        ctr: Number(r.metrics?.ctr || 0),
        avgCpc: Number(r.metrics?.averageCpc || 0) / 1_000_000,
        keywords: campaignKeywords,
        creatives: campaignCreatives,
        conversionsBreakdown: campaignConversions,
      };
    });

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