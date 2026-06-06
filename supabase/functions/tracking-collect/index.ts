// tracking-collect/index.ts
// Endpoint público — recebe dados do script JS da LP
// Salva/atualiza tracking_leads + dispara PageView via Meta CAPI e GA4

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// SHA-256 normalizado para dados PII
async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Máscara de email para exibição no dashboard
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local[0] + "***@" + domain;
}

// Disparo Meta CAPI via Measurement Protocol HTTP
async function dispatchMetaCAPI(payload: {
  pixelId: string;
  capiToken: string;
  testEventCode?: string;
  eventName: string;
  eventId: string;
  eventTime: number;
  userData: Record<string, string>;
  pageUrl: string;
  clientId: string;
}): Promise<{ success: boolean; score?: number; response?: any; error?: string }> {
  try {
    const body: any = {
      data: [
        {
          event_name: payload.eventName,
          event_time: payload.eventTime,
          event_id: payload.eventId,
          event_source_url: payload.pageUrl,
          action_source: "website",
          user_data: payload.userData,
        },
      ],
      access_token: payload.capiToken,
    };

    if (payload.testEventCode) {
      body.test_event_code = payload.testEventCode;
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${payload.pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const json = await res.json();
    const score = json?.events_received === 1
      ? (json?.messages?.[0]?.match_quality_score ?? null)
      : null;

    return { success: res.ok, score, response: json };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Disparo GA4 Measurement Protocol
async function dispatchGA4(payload: {
  measurementId: string;
  apiSecret: string;
  clientId: string;
  eventName: string;
  eventId: string;
  pageUrl: string;
  pageTitle?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const body = {
      client_id: payload.clientId || "anonymous",
      events: [
        {
          name: payload.eventName === "PageView" ? "page_view" : payload.eventName.toLowerCase(),
          params: {
            page_location: payload.pageUrl,
            page_title: payload.pageTitle || "",
            engagement_time_msec: 100,
            event_id: payload.eventId,
          },
        },
      ],
    };

    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${payload.measurementId}&api_secret=${payload.apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return { success: res.ok || res.status === 204 };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("tracking-collect");
    const clientId = parts[idx + 1];

    if (!clientId) {
      return new Response(JSON.stringify({ error: "missing clientId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      email, phone,
      fbclid, fbp, fbc,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      page_url, referrer,
      event_name = "PageView",
      event_id,
      ga4_client_id, // _ga cookie ou gerado no cliente
    } = body;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "";
    const userAgent = req.headers.get("user-agent") || "";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Buscar configuração do cliente
    const { data: cfg } = await supabase
      .from("tracking_config")
      .select("pixel_id, capi_token, test_event_code, ga4_measurement_id, ga4_api_secret, active")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!cfg?.active) {
      return new Response(JSON.stringify({ ok: true, skipped: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Preparar hashes de email e phone
    const emailNorm = email?.trim().toLowerCase();
    const emailHash = emailNorm ? await sha256(emailNorm) : null;
    const phoneNorm = phone?.replace(/\D/g, "").replace(/^0/, "55");
    const phoneHash = phoneNorm ? await sha256(phoneNorm) : null;

    // Gerar fbc se temos fbclid mas não temos fbc
    const fbcValue = fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);

    // Salvar/atualizar tracking_lead (upsert por client_id + email se tiver email)
    if (emailNorm) {
      await supabase.from("tracking_leads").upsert(
        {
          client_id: clientId,
          email: emailNorm,
          email_hash: emailHash,
          phone: phoneNorm || null,
          phone_hash: phoneHash || null,
          fbclid: fbclid || null,
          fbp: fbp || null,
          fbc: fbcValue || null,
          ip_address: ip,
          user_agent: userAgent,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_content: utm_content || null,
          utm_term: utm_term || null,
          page_url: page_url || null,
          referrer: referrer || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "client_id,email", ignoreDuplicates: false }
      );
    } else {
      // Sem email: salvar com id único (visitante anônimo, pode ser enriquecido depois pelo fbclid)
      if (fbclid) {
        await supabase.from("tracking_leads").upsert(
          {
            client_id: clientId,
            fbclid,
            fbp: fbp || null,
            fbc: fbcValue || null,
            ip_address: ip,
            user_agent: userAgent,
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            utm_content: utm_content || null,
            utm_term: utm_term || null,
            page_url: page_url || null,
            referrer: referrer || null,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "client_id,email" }
        );
      }
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const finalEventId = event_id || crypto.randomUUID();

    // --- Disparo Meta CAPI ---
    let capiResult: any = null;
    if (cfg.pixel_id && cfg.capi_token) {
      const userData: Record<string, string> = {
        client_ip_address: ip,
        client_user_agent: userAgent,
      };
      if (emailHash) userData.em = emailHash;
      if (phoneHash) userData.ph = phoneHash;
      if (fbp) userData.fbp = fbp;
      if (fbcValue) userData.fbc = fbcValue;

      capiResult = await dispatchMetaCAPI({
        pixelId: cfg.pixel_id,
        capiToken: cfg.capi_token,
        testEventCode: cfg.test_event_code || undefined,
        eventName: event_name,
        eventId: finalEventId,
        eventTime,
        userData,
        pageUrl: page_url || "",
        clientId,
      });

      // Logar disparo CAPI
      await supabase.from("capi_events_log").insert({
        client_id: clientId,
        event_name,
        event_id: finalEventId,
        platform: "meta_capi",
        pixel_id: cfg.pixel_id,
        status: capiResult.success ? "sent" : "error",
        match_quality_score: capiResult.score ?? null,
        meta_response: capiResult.response || null,
        error_message: capiResult.error || null,
        buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
        utm_source: utm_source || null,
        utm_campaign: utm_campaign || null,
        had_fbclid: !!fbclid,
        had_fbp: !!fbp,
      });
    }

    // --- Disparo GA4 ---
    let ga4Result: any = null;
    if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
      ga4Result = await dispatchGA4({
        measurementId: cfg.ga4_measurement_id,
        apiSecret: cfg.ga4_api_secret,
        clientId: ga4_client_id || "anonymous." + Date.now(),
        eventName: event_name,
        eventId: finalEventId,
        pageUrl: page_url || "",
      });

      await supabase.from("capi_events_log").insert({
        client_id: clientId,
        event_name,
        event_id: finalEventId,
        platform: "ga4",
        ga4_measurement_id: cfg.ga4_measurement_id,
        status: ga4Result.success ? "sent" : "error",
        error_message: ga4Result.error || null,
        buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
        utm_source: utm_source || null,
        utm_campaign: utm_campaign || null,
        had_fbclid: !!fbclid,
        had_fbp: !!fbp,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event_id: finalEventId,
        capi: capiResult ? { success: capiResult.success, score: capiResult.score } : null,
        ga4: ga4Result ? { success: ga4Result.success } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("tracking-collect error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
