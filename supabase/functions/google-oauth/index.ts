import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/adwords",
].join(" ");

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
    const clientIdGoogle = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "get_auth_url") {
      // Generate OAuth URL for user to authorize
      const state = clientId; // pass clientId as state to identify on callback
      const params = new URLSearchParams({
        client_id: clientIdGoogle,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      // Exchange authorization code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientIdGoogle,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      console.log("Token exchange response status:", tokenRes.status);

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Token exchange error:", tokenData);
        return new Response(JSON.stringify({ error: "Failed to exchange code", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Upsert token for this client
      const { error: upsertError } = await supabase
        .from("google_tokens")
        .upsert({
          client_id: clientId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          expires_at: expiresAt,
          scopes: SCOPES.split(" "),
        }, { onConflict: "client_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save tokens" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      let { data } = await supabase
        .from("google_tokens")
        .select("id, expires_at, scopes")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!data) {
        const { data: fallback } = await supabase
          .from("google_tokens")
          .select("id, expires_at, scopes")
          .limit(1)
          .maybeSingle();
        if (fallback) {
          data = fallback;
        }
      }

      return new Response(JSON.stringify({ connected: !!data, token: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      await supabase
        .from("google_tokens")
        .delete()
        .eq("client_id", clientId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
