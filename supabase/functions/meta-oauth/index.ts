import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";

const SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
].join(",");

const FB_APP_ID = "929373313117569";
const FB_APP_SECRET = "93ff924bd64938bb432f147ee66b29ec";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, clientId, code, redirectUri } = await req.json();
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (clientId && !(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);
    if ((action === "disconnect" || action === "exchange_code") && !(await hasAdminOrEditor(claims.sub))) {
      return forbidden(corsHeaders, "Admin or editor role required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "get_auth_url") {
      const state = clientId || "global";
      const params = new URLSearchParams({
        client_id: FB_APP_ID,
        redirect_uri: redirectUri,
        state,
        scope: SCOPES,
        response_type: "code",
      });
      const authUrl = `${FACEBOOK_AUTH_URL}?${params.toString()}`;
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      // 1. Get short-lived user access token
      const tokenRes = await fetch(`${FACEBOOK_TOKEN_URL}?` + new URLSearchParams({
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }));

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Meta short token exchange error:", tokenData);
        return new Response(JSON.stringify({ error: "Failed to exchange code", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Exchange for long-lived user access token (60 days)
      const longLivedRes = await fetch(`${FACEBOOK_TOKEN_URL}?` + new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        fb_exchange_token: tokenData.access_token,
      }));

      const longLivedData = await longLivedRes.json();
      if (!longLivedRes.ok || !longLivedData.access_token) {
        console.error("Meta long token exchange error:", longLivedData);
        return new Response(JSON.stringify({ error: "Failed to get long-lived token", details: longLivedData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
        : null;

      // Upsert token
      const targetClientId = clientId && clientId !== "global" ? clientId : null;
      
      const { error: upsertError } = await supabase
        .from("meta_tokens")
        .upsert({
          client_id: targetClientId,
          access_token: longLivedData.access_token,
          expires_at: expiresAt,
        }, { onConflict: "client_id" });

      if (upsertError) {
        console.error("Upsert meta token error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save token" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also save meta_access_token in clients table if it is a specific client
      if (targetClientId) {
        await supabase
          .from("clients")
          .update({ meta_access_token: longLivedData.access_token })
          .eq("id", targetClientId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      let { data } = await supabase
        .from("meta_tokens")
        .select("id, expires_at")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!data) {
        const { data: fallback } = await supabase
          .from("meta_tokens")
          .select("id, expires_at")
          .limit(1)
          .maybeSingle();
        if (fallback) data = fallback;
      }

      return new Response(JSON.stringify({ connected: !!data, token: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      await supabase
        .from("meta_tokens")
        .delete()
        .eq("client_id", clientId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_meta_assets") {
      // Find token
      let tokenItem = null;
      if (clientId) {
        const { data } = await supabase
          .from("meta_tokens")
          .select("access_token")
          .eq("client_id", clientId)
          .maybeSingle();
        tokenItem = data;
      }
      if (!tokenItem) {
        const { data: fallback } = await supabase
          .from("meta_tokens")
          .select("access_token")
          .limit(1)
          .maybeSingle();
        tokenItem = fallback;
      }

      if (!tokenItem?.access_token) {
        return new Response(JSON.stringify({ error: "Meta Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = tokenItem.access_token;

      // 1. Fetch businesses (BMs)
      const busRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${token}`);
      const busData = await busRes.json();

      // 2. Fetch ad accounts
      const accRes = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,business&access_token=${token}&limit=150`);
      const accData = await accRes.json();

      if (busData.error || accData.error) {
        return new Response(JSON.stringify({ error: "Failed to fetch assets from Meta", busError: busData.error, accError: accData.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        businesses: busData.data || [],
        adAccounts: accData.data || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Meta OAuth error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
