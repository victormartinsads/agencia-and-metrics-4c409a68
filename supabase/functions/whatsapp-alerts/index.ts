import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);

    const body = await req.json();
    const { clientId, clientName, alertKey, message, isTest } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Permission check
    if (isTest) {
      const ok = await hasAdminOrEditor(claims.sub);
      if (!ok) return forbidden(corsHeaders, "Somente admins ou editores podem disparar alertas de teste");
    } else {
      if (!clientId) {
        return new Response(JSON.stringify({ error: "clientId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const ok = await canAccessClient(claims.sub, clientId);
      if (!ok) return forbidden(corsHeaders, "Você não tem acesso a este cliente");
    }

    // Load WhatsApp Webhook URL from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "whatsapp_webhook_url")
      .maybeSingle();

    const webhookUrl = setting?.value?.trim();
    if (!webhookUrl) {
      return new Response(JSON.stringify({ status: "skipped", reason: "webhook_url_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!isTest) {
      // Check if we already sent this alert in the last 24 hours
      const { data: existingLog } = await supabase
        .from("sent_alerts_log")
        .select("id")
        .eq("client_id", clientId)
        .eq("alert_key", alertKey)
        .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingLog) {
        return new Response(JSON.stringify({ status: "skipped", reason: "already_notified_within_24h" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Resolve the gestor (manager) name
    let gestorName = "Não atribuído";
    if (isTest) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", claims.sub)
        .maybeSingle();
      if (profile) {
        gestorName = profile.full_name || profile.email || "Gestor de Teste";
      } else {
        gestorName = "Gestor de Teste";
      }
    } else {
      const { data: assignments } = await supabase
        .from("gestor_diary_clients")
        .select("gestor_id")
        .eq("client_id", clientId);

      if (assignments && assignments.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", assignments[0].gestor_id)
          .maybeSingle();
        if (profile) {
          gestorName = profile.full_name || profile.email || "Gestor";
        }
      }
    }

    // Trigger webhook POST request
    const payload = {
      client: clientName || "Cliente Desconhecido",
      gestor: gestorName,
      message: message || "",
      alert_key: alertKey || "generic",
      timestamp: new Date().toISOString(),
      is_test: !!isTest
    };

    console.log(`Sending WhatsApp alert to webhook: ${webhookUrl} for client ${payload.client}`);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook responded with status ${res.status}: ${text}`);
    }

    if (!isTest) {
      // Log that it was sent successfully
      const { error: logErr } = await supabase
        .from("sent_alerts_log")
        .insert({
          client_id: clientId,
          alert_key: alertKey,
          message: message
        });

      if (logErr) {
        console.error("Failed to log sent alert:", logErr);
      }
    }

    return new Response(JSON.stringify({ status: "sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("whatsapp-alerts error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
