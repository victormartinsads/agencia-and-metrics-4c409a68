// capi-dispatch/index.ts — v2 com PII completo (fn + ln) + .text() fix
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(value: string): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return local ? local[0] + "***@" + (domain ?? "") : email;
}

async function dbGet(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams({ ...filters, limit: "1" });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

async function dbInsert(table: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
}

async function dbPatch(table: string, filter: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // CRÍTICO: .text() + JSON.parse() — nunca .json() direto
    const rawText = await req.text();
    const body = rawText ? JSON.parse(rawText) : {};

    const {
      client_id, sales_event_id,
      email, phone, first_name, last_name,
      value, currency = "BRL",
      product_id, product_name,
      fbclid, fbp, fbc,
      utm_source, utm_campaign, page_url,
      event_id: incomingEventId,
    } = body;

    if (!client_id) {
      return new Response(JSON.stringify({ error: "missing client_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = await dbGet("tracking_config", {
      "client_id": `eq.${client_id}`,
      "select": "pixel_id,capi_token,test_event_code,ga4_measurement_id,ga4_api_secret,active",
    });

    if (!cfg?.pixel_id || !cfg?.capi_token) {
      return new Response(JSON.stringify({ ok: true, skipped: "no pixel config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar lead enriquecido
    let lead: any = null;
    if (email) {
      lead = await dbGet("tracking_leads", {
        "client_id": `eq.${client_id}`,
        "email": `eq.${email.trim().toLowerCase()}`,
        "select": "fbp,fbc,fbclid,ip_address,user_agent,utm_source,utm_campaign,page_url,ga4_client_id,first_name_hash,last_name_hash,phone_hash,country,city,os,browser,user_id",
      });
    }

    // Normalizar PII da compra
    const emailNorm  = email?.trim().toLowerCase() || null;
    const phoneNorm  = normalizePhone(phone);
    const fnNorm     = first_name?.trim().toLowerCase() || null;
    const lnNorm     = last_name?.trim().toLowerCase() || null;

    const [emailHash, phoneHash, fnHash, lnHash] = await Promise.all([
      sha256(emailNorm ?? ""),
      sha256(phoneNorm ?? ""),
      sha256(fnNorm ?? ""),
      sha256(lnNorm ?? ""),
    ]);

    // Resolver dados enriquecidos do lead (prioridade: webhook > lead armazenado)
    const resolvedFbp    = fbp    || lead?.fbp    || null;
    const resolvedFbclid = fbclid || lead?.fbclid || null;
    const resolvedFbc    = fbc    || lead?.fbc    || (resolvedFbclid ? `fb.1.${Date.now()}.${resolvedFbclid}` : null);
    const resolvedFnHash = fnHash || lead?.first_name_hash || null;
    const resolvedLnHash = lnHash || lead?.last_name_hash  || null;
    const resolvedPhHash = phoneHash || lead?.phone_hash   || null;
    const resolvedUid    = lead?.user_id || null;

    const uidHash = resolvedUid ? await sha256(resolvedUid) : null;

    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? lead?.ip_address ?? "";
    const userAgent = req.headers.get("user-agent") ?? lead?.user_agent ?? "";

    const eventId   = incomingEventId || crypto.randomUUID();
    const eventTime = Math.floor(Date.now() / 1000);

    // Montar user_data com PII completo (arrays — padrão Meta v21+)
    const userData: Record<string, string | string[]> = {};
    if (emailHash)    userData.em  = [emailHash];
    if (resolvedPhHash) userData.ph = [resolvedPhHash];
    if (resolvedFnHash) userData.fn = [resolvedFnHash];
    if (resolvedLnHash) userData.ln = [resolvedLnHash];
    if (uidHash)        userData.external_id = [uidHash];
    if (resolvedFbp)  userData.fbp = resolvedFbp;
    if (resolvedFbc)  userData.fbc = resolvedFbc;
    if (ip)           userData.client_ip_address = ip;
    if (userAgent)    userData.client_user_agent = userAgent;

    const capiPayload: any = {
      data: [{
        event_name: "Purchase",
        event_time: eventTime,
        event_id: eventId,
        event_source_url: page_url || lead?.page_url || "https://unknown",
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: Number(value) || 0,
          currency: currency.toUpperCase(),
          content_ids: product_id ? [product_id] : [],
          content_name: product_name || "",
          content_type: "product",
        },
      }],
      access_token: cfg.capi_token,
    };
    if (cfg.test_event_code) capiPayload.test_event_code = cfg.test_event_code;

    // CRÍTICO: .text() com fallback
    const capiRes  = await fetch(`https://graph.facebook.com/v21.0/${cfg.pixel_id}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(capiPayload),
    });
    const capiText = await capiRes.text();
    const capiJson = capiText ? JSON.parse(capiText) : { status: capiRes.status, events_received: 0 };

    await dbInsert("capi_events_log", {
      client_id, sales_event_id: sales_event_id || null,
      event_name: "Purchase", event_id: eventId, platform: "meta_capi",
      pixel_id: cfg.pixel_id, status: capiRes.ok ? "sent" : "error",
      meta_response: capiJson, error_message: capiRes.ok ? null : JSON.stringify(capiJson),
      buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
      utm_source: utm_source || lead?.utm_source || null,
      utm_campaign: utm_campaign || lead?.utm_campaign || null,
      had_fbclid: !!resolvedFbclid, had_fbp: !!resolvedFbp,
      country: lead?.country || null, city: lead?.city || null,
      os: lead?.os || null, browser: lead?.browser || null,
      user_id: resolvedUid,
    });

    if (sales_event_id) {
      await dbPatch("sales_events", `id=eq.${sales_event_id}`, { capi_dispatched: true });
    }

    // GA4 Purchase
    if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
      fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4_measurement_id}&api_secret=${cfg.ga4_api_secret}`,
        {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: lead?.ga4_client_id || `webhook.${eventTime}`,
            events: [{ name: "purchase", params: { transaction_id: eventId, value: Number(value), currency, engagement_time_msec: "100" } }],
          }),
        }
      ).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, event_id: eventId, capi_ok: capiRes.ok, events_received: capiJson?.events_received }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("capi-dispatch error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
