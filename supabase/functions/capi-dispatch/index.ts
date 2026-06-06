// capi-dispatch/index.ts
// Dispara Purchase via Meta CAPI e GA4 após venda confirmada no webhook
// Chamado internamente pelo sales-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local[0] + "***@" + domain;
}

async function dispatchMetaCAPI(
  pixelId: string,
  capiToken: string,
  testEventCode: string | null,
  payload: {
    eventName: string;
    eventId: string;
    eventTime: number;
    userData: Record<string, string>;
    customData?: Record<string, any>;
    eventSourceUrl?: string;
  }
): Promise<{ success: boolean; score?: number | null; response?: any; error?: string }> {
  try {
    const body: any = {
      data: [
        {
          event_name: payload.eventName,
          event_time: payload.eventTime,
          event_id: payload.eventId,
          action_source: "website",
          user_data: payload.userData,
          ...(payload.customData ? { custom_data: payload.customData } : {}),
          ...(payload.eventSourceUrl ? { event_source_url: payload.eventSourceUrl } : {}),
        },
      ],
      access_token: capiToken,
    };

    if (testEventCode) body.test_event_code = testEventCode;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const json = await res.json();
    // Meta retorna events_received e um score por evento
    const score = json?.events_received === 1
      ? (json?.messages?.[0]?.match_quality_score ?? null)
      : null;

    return { success: res.ok, score, response: json };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function dispatchGA4Purchase(
  measurementId: string,
  apiSecret: string,
  payload: {
    clientId: string;
    transactionId: string;
    value: number;
    currency: string;
    items: Array<{ item_id: string; item_name: string; price: number }>;
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const body = {
      client_id: payload.clientId || "server.dispatch",
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: payload.transactionId,
            value: payload.value,
            currency: payload.currency || "BRL",
            items: payload.items,
            ...(payload.utmSource ? { source: payload.utmSource } : {}),
            ...(payload.utmCampaign ? { campaign: payload.utmCampaign } : {}),
            ...(payload.utmMedium ? { medium: payload.utmMedium } : {}),
            engagement_time_msec: 1,
          },
        },
      ],
    };

    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
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
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const {
      client_id,
      sales_event_id,
      // Dados da venda normalizados
      transaction_id,
      product_id,
      product_name,
      buyer_email,
      buyer_phone,
      gross_amount,
      currency,
      occurred_at,
      is_order_bump,
      // Dados de tracking já buscados (opcionais, economiza query)
      tracking_lead,
    } = await req.json();

    if (!client_id || !sales_event_id) {
      return new Response(JSON.stringify({ error: "missing client_id or sales_event_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Buscar configuração de tracking do cliente
    const { data: cfg } = await supabase
      .from("tracking_config")
      .select("pixel_id, capi_token, test_event_code, ga4_measurement_id, ga4_api_secret, active")
      .eq("client_id", client_id)
      .maybeSingle();

    if (!cfg?.active || (!cfg.pixel_id && !cfg.ga4_measurement_id)) {
      return new Response(JSON.stringify({ ok: true, skipped: "no active tracking config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Buscar tracking_lead pelo email se não foi passado
    let lead = tracking_lead;
    if (!lead && buyer_email) {
      const emailNorm = buyer_email.trim().toLowerCase();
      const { data: foundLead } = await supabase
        .from("tracking_leads")
        .select("*")
        .eq("client_id", client_id)
        .eq("email", emailNorm)
        .maybeSingle();
      lead = foundLead;
    }

    // 3) Preparar dados de identidade
    const emailNorm = buyer_email?.trim().toLowerCase();
    const emailHash = emailNorm ? await sha256(emailNorm) : (lead?.email_hash || null);
    const phoneNorm = (buyer_phone || lead?.phone || "")?.replace(/\D/g, "");
    const phoneHash = phoneNorm ? await sha256(phoneNorm) : (lead?.phone_hash || null);

    const fbclid = lead?.fbclid || null;
    const fbp = lead?.fbp || null;
    const fbc = lead?.fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);
    const ip = lead?.ip_address || null;
    const userAgent = lead?.user_agent || null;

    const eventId = crypto.randomUUID();
    const eventTime = occurred_at
      ? Math.floor(new Date(occurred_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const results: any = { meta_capi: null, ga4: null };

    // ─── 4) Meta CAPI — Purchase ───────────────────────────────────────────
    if (cfg.pixel_id && cfg.capi_token) {
      const userData: Record<string, string> = {};
      if (emailHash) userData.em = emailHash;
      if (phoneHash) userData.ph = phoneHash;
      if (ip) userData.client_ip_address = ip;
      if (userAgent) userData.client_user_agent = userAgent;
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;

      const customData: Record<string, any> = {
        value: gross_amount,
        currency: currency || "BRL",
        content_type: "product",
        content_ids: product_id ? [String(product_id)] : [],
        content_name: product_name || "",
        order_id: transaction_id,
      };

      // Order bump: envia com flag para análise
      if (is_order_bump) customData.is_order_bump = true;

      const capiResult = await dispatchMetaCAPI(
        cfg.pixel_id,
        cfg.capi_token,
        cfg.test_event_code || null,
        {
          eventName: "Purchase",
          eventId,
          eventTime,
          userData,
          customData,
          eventSourceUrl: lead?.page_url || undefined,
        }
      );

      results.meta_capi = capiResult;

      // Log
      await supabase.from("capi_events_log").insert({
        client_id,
        sales_event_id,
        event_name: "Purchase",
        event_id: eventId,
        platform: "meta_capi",
        pixel_id: cfg.pixel_id,
        status: capiResult.success ? "sent" : "error",
        match_quality_score: capiResult.score ?? null,
        payload_sent: {
          userData: { ...userData, em: "***hashed***", ph: "***hashed***" },
          customData,
          eventId,
          eventTime,
        },
        meta_response: capiResult.response || null,
        error_message: capiResult.error || null,
        buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
        utm_source: lead?.utm_source || null,
        utm_campaign: lead?.utm_campaign || null,
        had_fbclid: !!fbclid,
        had_fbp: !!fbp,
      });

      // Marcar sales_event como CAPI disparado
      if (capiResult.success) {
        await supabase
          .from("sales_events")
          .update({ capi_dispatched: true })
          .eq("id", sales_event_id);
      }
    }

    // ─── 5) GA4 — Purchase ────────────────────────────────────────────────
    if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
      const ga4Result = await dispatchGA4Purchase(
        cfg.ga4_measurement_id,
        cfg.ga4_api_secret,
        {
          clientId: `server.${client_id.slice(0, 8)}`,
          transactionId: transaction_id,
          value: gross_amount,
          currency: currency || "BRL",
          items: [
            {
              item_id: product_id || "unknown",
              item_name: product_name || "Produto",
              price: gross_amount,
            },
          ],
          utmSource: lead?.utm_source || undefined,
          utmMedium: lead?.utm_medium || undefined,
          utmCampaign: lead?.utm_campaign || undefined,
        }
      );

      results.ga4 = ga4Result;

      await supabase.from("capi_events_log").insert({
        client_id,
        sales_event_id,
        event_name: "Purchase",
        event_id: eventId,
        platform: "ga4",
        ga4_measurement_id: cfg.ga4_measurement_id,
        status: ga4Result.success ? "sent" : "error",
        error_message: ga4Result.error || null,
        buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
        utm_source: lead?.utm_source || null,
        utm_campaign: lead?.utm_campaign || null,
        had_fbclid: !!fbclid,
        had_fbp: !!fbp,
      });

      if (ga4Result.success) {
        await supabase
          .from("sales_events")
          .update({ ga4_dispatched: true })
          .eq("id", sales_event_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, event_id: eventId, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("capi-dispatch error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
