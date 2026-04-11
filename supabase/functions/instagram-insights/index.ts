import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { clientId } = await req.json();
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

    // 1. Discover Instagram Business Account from ad account pages
    let igAccountId: string | null = null;
    let igAccountName = "";
    let followersCount = 0;

    for (const accountId of adAccountIds) {
      if (igAccountId) break;
      const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

      try {
        // Get pages promoted by this ad account
        const pagesRes = await fetch(
          `${GRAPH_API}/${actId}?fields=promote_pages{instagram_business_account}&access_token=${token}`
        );
        const pagesData = await pagesRes.json();

        if (pagesData.promote_pages?.data) {
          for (const page of pagesData.promote_pages.data) {
            if (page.instagram_business_account?.id) {
              igAccountId = page.instagram_business_account.id;
              break;
            }
          }
        }
      } catch (e) {
        console.error(`Error discovering IG account from ${actId}:`, e);
      }

      if (!igAccountId) {
        // Try alternative: get pages connected to user
        try {
          const userPagesRes = await fetch(
            `${GRAPH_API}/me/accounts?fields=instagram_business_account&access_token=${token}&limit=10`
          );
          const userPagesData = await userPagesRes.json();
          if (userPagesData.data) {
            for (const page of userPagesData.data) {
              if (page.instagram_business_account?.id) {
                igAccountId = page.instagram_business_account.id;
                break;
              }
            }
          }
        } catch (e) {
          console.error("Error fetching user pages:", e);
        }
      }
    }

    if (!igAccountId) {
      return new Response(JSON.stringify({ error: "Instagram Business Account not found. Verify token permissions (instagram_basic, instagram_manage_insights, pages_show_list)." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get IG account info
    try {
      const infoRes = await fetch(
        `${GRAPH_API}/${igAccountId}?fields=username,name,followers_count,media_count&access_token=${token}`
      );
      const infoData = await infoRes.json();
      igAccountName = infoData.username || infoData.name || "";
      followersCount = infoData.followers_count || 0;
    } catch (e) {
      console.error("Error fetching IG account info:", e);
    }

    // 3. Fetch account insights (last 30 days, daily)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since = Math.floor(thirtyDaysAgo.getTime() / 1000);
    const until = Math.floor(now.getTime() / 1000);

    let dailyFollowers: { date: string; value: number }[] = [];
    let dailyReach: { date: string; value: number }[] = [];
    let dailyImpressions: { date: string; value: number }[] = [];
    let dailyProfileViews: { date: string; value: number }[] = [];

    try {
      const insightsRes = await fetch(
        `${GRAPH_API}/${igAccountId}/insights?metric=follower_count,reach,impressions,profile_views&period=day&since=${since}&until=${until}&access_token=${token}`
      );
      const insightsData = await insightsRes.json();

      if (insightsData.data) {
        for (const metric of insightsData.data) {
          const values = (metric.values || []).map((v: any) => ({
            date: v.end_time?.split("T")[0] || "",
            value: v.value || 0,
          }));

          switch (metric.name) {
            case "follower_count":
              dailyFollowers = values;
              break;
            case "reach":
              dailyReach = values;
              break;
            case "impressions":
              dailyImpressions = values;
              break;
            case "profile_views":
              dailyProfileViews = values;
              break;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching IG insights:", e);
    }

    // 4. Aggregate by day of week
    const dayOfWeekNames = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

    function aggregateByDayOfWeek(data: { date: string; value: number }[]) {
      const buckets: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      for (const d of data) {
        if (!d.date) continue;
        const dow = new Date(d.date + "T12:00:00Z").getUTCDay();
        buckets[dow].push(d.value);
      }
      return dayOfWeekNames.map((name, i) => ({
        day: name,
        value: buckets[i].reduce((a, b) => a + b, 0),
      }));
    }

    const followersByDay = aggregateByDayOfWeek(dailyFollowers);
    const reachByDay = aggregateByDayOfWeek(dailyReach);

    // 5. Fetch video views metrics from ads (ad account level, last 30 days)
    await delay(300);
    let totalVideoPlays = 0;
    let totalThruplay = 0;
    let totalVV25 = 0;
    let totalVV50 = 0;
    let totalVV75 = 0;
    let totalVV95 = 0;
    let totalClicks = 0;
    let totalAdReach = 0;
    let totalAdImpressions = 0;
    let totalAdSpend = 0;
    let dailyVideoViews: { date: string; value: number }[] = [];
    let dailyAdReach: { date: string; value: number }[] = [];

    for (const accountId of adAccountIds) {
      const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

      // Aggregate insights
      try {
        const aggUrl = `${GRAPH_API}/${actId}/insights?fields=spend,impressions,reach,clicks,actions,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_play_actions,video_thruplay_watched_actions&date_preset=last_30d&access_token=${token}`;
        const aggRes = await fetch(aggUrl);
        const aggData = await aggRes.json();

        if (aggData.data?.[0]) {
          const d = aggData.data[0];
          totalAdSpend += Number(d.spend || 0);
          totalAdImpressions += Number(d.impressions || 0);
          totalAdReach += Number(d.reach || 0);
          totalClicks += Number(d.clicks || 0);

          const getAggAction = (arr: any[] | undefined) => {
            if (!arr) return 0;
            return arr.reduce((s: number, a: any) => s + Number(a.value || 0), 0);
          };

          totalVideoPlays += getAggAction(d.video_play_actions);
          totalThruplay += getAggAction(d.video_thruplay_watched_actions);
          totalVV25 += getAggAction(d.video_p25_watched_actions);
          totalVV50 += getAggAction(d.video_p50_watched_actions);
          totalVV75 += getAggAction(d.video_p75_watched_actions);
          totalVV95 += getAggAction(d.video_p95_watched_actions);
        }
      } catch (e) {
        console.error(`Ads aggregate error for ${actId}:`, e);
      }

      // Daily video views + reach
      await delay(200);
      try {
        const dailyUrl = `${GRAPH_API}/${actId}/insights?fields=reach,video_play_actions&date_preset=last_30d&time_increment=1&access_token=${token}&limit=90`;
        const dailyRes = await fetch(dailyUrl);
        const dailyData = await dailyRes.json();
        if (dailyData.data) {
          for (const day of dailyData.data) {
            const date = day.date_start;
            const vv = day.video_play_actions
              ? day.video_play_actions.reduce((s: number, a: any) => s + Number(a.value || 0), 0)
              : 0;
            dailyVideoViews.push({ date, value: vv });
            dailyAdReach.push({ date, value: Number(day.reach || 0) });
          }
        }
      } catch (e) {
        console.error(`Daily video error for ${actId}:`, e);
      }
    }

    const videoViewsByDay = aggregateByDayOfWeek(dailyVideoViews);
    const adReachByDay = aggregateByDayOfWeek(dailyAdReach);

    // 6. Compute derived metrics
    const totalNewFollowers = dailyFollowers.reduce((s, d) => s + d.value, 0);
    const totalReach30d = dailyReach.reduce((s, d) => s + d.value, 0);
    const avgCTR = totalAdImpressions > 0 ? Number(((totalClicks / totalAdImpressions) * 100).toFixed(2)) : 0;
    const avgFrequency = totalAdReach > 0 ? Number((totalAdImpressions / totalAdReach).toFixed(2)) : 0;
    const costPerVideoPlay = totalVideoPlays > 0 ? Number((totalAdSpend / totalVideoPlays).toFixed(2)) : 0;

    const result = {
      igAccountId,
      igAccountName,
      followersCount,
      newFollowers30d: totalNewFollowers,
      dailyFollowers: dailyFollowers.map((d) => ({
        date: new Date(d.date + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: d.value,
      })),
      followersByDay,
      reachByDay,
      videoViewsByDay,
      adReachByDay,
      metrics: {
        totalClicks,
        totalVideoPlays,
        costPerVideoPlay,
        totalVV25,
        totalVV50,
        totalVV75,
        totalVV95,
        totalThruplay,
        totalAdReach,
        totalAdImpressions,
        avgCTR,
        avgFrequency,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Instagram insights error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
