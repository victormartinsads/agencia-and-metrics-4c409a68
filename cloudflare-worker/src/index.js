// TrackingHub — Cloudflare Worker Global Multi-Tenant
// Deploy único na sua conta Cloudflare → serve todos os clientes
//
// Rotas:
//   POST /collect/{clientId}   ← eventos client-side (PageView, Lead, etc.)
//   POST /webhook/{clientId}   ← compras (Hotmart, Kiwify, Eduzz)
//
// Deploy:
//   npx wrangler deploy
//   cmd /c "echo URL | npx wrangler secret put SUPABASE_URL"
//   cmd /c "echo KEY | npx wrangler secret put SUPABASE_SERVICE_KEY"

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return cors(null, 204);
    if (request.method !== "POST")    return new Response("Method not allowed", { status: 405 });

    try {
      // CRÍTICO: .text() + JSON.parse() — evita crash se Meta retornar body vazio
      const rawText = await request.text();
      const body    = rawText ? JSON.parse(rawText) : {};

      const parts    = url.pathname.split("/").filter(Boolean);
      const route    = parts[0];   // "collect" ou "webhook"
      const clientId = parts[1];

      if (!clientId) return cors({ error: "missing clientId in URL" }, 400);

      // Buscar config do cliente no Supabase
      const cfg = await supabaseGet(env, "tracking_config", {
        "client_id": `eq.${clientId}`,
        "select": "pixel_id,capi_token,test_event_code,ga4_measurement_id,ga4_api_secret,active",
      });

      if (!cfg?.active) return cors({ ok: true, skipped: "inactive" }, 200);

      if (route === "collect") return cors(await handleCollect(body, cfg, clientId, env, request), 200);
      if (route === "webhook") return cors(await handleWebhook(body, cfg, clientId, env, request), 200);

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Worker error:", err);
      return cors({ error: err.message }, 500);
    }
  },
};

// ── /collect/{clientId} — eventos client-side ─────────────────────────────

async function handleCollect(body, cfg, clientId, env, request) {
  const {
    email, phone, first_name, last_name,
    fbclid, fbp, fbc,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    page_url, referrer, event_name = "PageView", event_id, ga4_client_id,
  } = body;

  const ip        = request.headers.get("CF-Connecting-IP") || "";
  const userAgent = request.headers.get("User-Agent") || "";

  // Normalização PII — sempre antes do hash
  const emailNorm = email       ? email.trim().toLowerCase()        : null;
  const phoneNorm = phone       ? normalizePhone(phone)              : null;
  const fnNorm    = first_name  ? first_name.trim().toLowerCase()   : null;
  const lnNorm    = last_name   ? last_name.trim().toLowerCase()    : null;

  const [emailHash, phoneHash, fnHash, lnHash] = await Promise.all([
    sha256(emailNorm), sha256(phoneNorm), sha256(fnNorm), sha256(lnNorm),
  ]);

  const fbcValue     = fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);
  const finalEventId = event_id || crypto.randomUUID();
  const eventTime    = Math.floor(Date.now() / 1000);

  // Salvar lead
  if (emailNorm) {
    await supabaseUpsert(env, "tracking_leads", {
      client_id: clientId,
      email: emailNorm, email_hash: emailHash,
      phone: phoneNorm, phone_hash: phoneHash,
      first_name: fnNorm, first_name_hash: fnHash,
      last_name: lnNorm, last_name_hash: lnHash,
      fbclid: fbclid || null, fbp: fbp || null, fbc: fbcValue || null,
      ip_address: ip, user_agent: userAgent,
      utm_source: utm_source || null, utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null, utm_content: utm_content || null,
      utm_term: utm_term || null, page_url: page_url || null, referrer: referrer || null,
      last_seen_at: new Date().toISOString(),
    }, "client_id,email");
  }

  // Meta CAPI
  let capiResult = null;
  if (cfg.pixel_id && cfg.capi_token) {
    const userData = { client_ip_address: ip, client_user_agent: userAgent };
    if (emailHash) userData.em  = [emailHash];
    if (phoneHash) userData.ph  = [phoneHash];
    if (fnHash)    userData.fn  = [fnHash];
    if (lnHash)    userData.ln  = [lnHash];
    if (fbp)       userData.fbp = fbp;
    if (fbcValue)  userData.fbc = fbcValue;

    const capiPayload = {
      data: [{
        event_name, event_time: eventTime, event_id: finalEventId,
        event_source_url: page_url || "https://unknown",
        action_source: "website", user_data: userData,
      }],
      access_token: cfg.capi_token,
    };
    if (cfg.test_event_code) capiPayload.test_event_code = cfg.test_event_code;

    const capiRes  = await fetch(`https://graph.facebook.com/v21.0/${cfg.pixel_id}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(capiPayload),
    });
    const capiText = await capiRes.text();
    const capiJson = capiText ? JSON.parse(capiText) : { status: capiRes.status, events_received: 0 };
    capiResult     = { success: capiRes.ok, response: capiJson };

    supabaseInsert(env, "capi_events_log", {
      client_id: clientId, event_name, event_id: finalEventId, platform: "meta_capi",
      pixel_id: cfg.pixel_id, status: capiRes.ok ? "sent" : "error",
      meta_response: capiJson, error_message: capiRes.ok ? null : JSON.stringify(capiJson),
      buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
      utm_source: utm_source || null, utm_campaign: utm_campaign || null,
      had_fbclid: !!fbclid, had_fbp: !!fbp,
    });
  }

  // GA4
  if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
    const ga4Names = { PageView: "page_view", ViewContent: "view_item", InitiateCheckout: "begin_checkout", Lead: "generate_lead", Contact: "contact" };
    fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4_measurement_id}&api_secret=${cfg.ga4_api_secret}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: ga4_client_id || `${ip}.${eventTime}`,
          events: [{ name: ga4Names[event_name] || event_name.toLowerCase(), params: { page_location: page_url, event_id: finalEventId, engagement_time_msec: "100", ...(utm_source && { campaign_source: utm_source }), ...(utm_campaign && { campaign_name: utm_campaign }) } }],
        }),
      }
    ).catch(() => {});
  }

  return { ok: true, event_id: finalEventId, capi: capiResult };
}

// ── /webhook/{clientId} — compras server-side ─────────────────────────────

async function handleWebhook(body, cfg, clientId, env, request) {
  const ip        = request.headers.get("CF-Connecting-IP") || "";
  const userAgent = request.headers.get("User-Agent") || "";
  const eventTime = Math.floor(Date.now() / 1000);

  let email, first_name, last_name, phone, order_id, order_value, platform;

  // Hotmart
  if (body.event === "PURCHASE_COMPLETE" || body.data?.buyer) {
    platform    = "hotmart";
    email       = body.data?.buyer?.email;
    phone       = body.data?.buyer?.phone;
    const parts = (body.data?.buyer?.name || "").trim().split(" ");
    first_name  = parts[0] || null;
    last_name   = parts.slice(1).join(" ") || null;
    order_id    = body.data?.purchase?.transaction || null;
    order_value = body.data?.purchase?.price?.value || 0;
  }
  // Kiwify
  else if (body.event === "order.paid" || body.Customer) {
    platform    = "kiwify";
    email       = body.Customer?.email;
    phone       = body.Customer?.mobile;
    const parts = (body.Customer?.full_name || "").trim().split(" ");
    first_name  = parts[0] || null;
    last_name   = parts.slice(1).join(" ") || null;
    order_id    = body.order_id || null;
    order_value = parseFloat(body.order_value) || 0;
  }
  // Eduzz
  else if (body.key || body.trans_value) {
    platform    = "eduzz";
    email       = body.cus_email;
    phone       = body.cus_tel;
    const parts = (body.cus_name || "").trim().split(" ");
    first_name  = parts[0] || null;
    last_name   = parts.slice(1).join(" ") || null;
    order_id    = body.trans_cod || null;
    order_value = parseFloat(body.trans_value) || 0;
  } else {
    return { error: "Plataforma não reconhecida" };
  }

  const emailNorm = email      ? email.trim().toLowerCase()      : null;
  const phoneNorm = phone      ? normalizePhone(phone)            : null;
  const fnNorm    = first_name ? first_name.trim().toLowerCase() : null;
  const lnNorm    = last_name  ? last_name.trim().toLowerCase()  : null;

  const [emailHash, phoneHash, fnHash, lnHash] = await Promise.all([
    sha256(emailNorm), sha256(phoneNorm), sha256(fnNorm), sha256(lnNorm),
  ]);

  // Buscar lead para enriquecer fbp, fbc
  let lead = null;
  if (emailNorm) {
    lead = await supabaseGet(env, "tracking_leads", {
      "client_id": `eq.${clientId}`,
      "email": `eq.${emailNorm}`,
      "select": "fbp,fbc,fbclid,ip_address,user_agent,utm_source,utm_campaign,page_url,ga4_client_id",
    });
  }

  const resolvedFbp = lead?.fbp || null;
  const resolvedFbc = lead?.fbc || null;
  const eventId     = order_id ? `purchase_${order_id}` : `purchase_${eventTime}`;

  const userData = { client_ip_address: ip, client_user_agent: userAgent };
  if (emailHash) userData.em  = [emailHash];
  if (phoneHash) userData.ph  = [phoneHash];
  if (fnHash)    userData.fn  = [fnHash];
  if (lnHash)    userData.ln  = [lnHash];
  if (resolvedFbp) userData.fbp = resolvedFbp;
  if (resolvedFbc) userData.fbc = resolvedFbc;

  const capiPayload = {
    data: [{
      event_name: "Purchase", event_time: eventTime, event_id: eventId,
      event_source_url: lead?.page_url || "https://unknown",
      action_source: "website", user_data: userData,
      custom_data: { value: order_value, currency: "BRL", content_type: "product" },
    }],
    access_token: cfg.capi_token,
  };
  if (cfg.test_event_code) capiPayload.test_event_code = cfg.test_event_code;

  const capiRes  = await fetch(`https://graph.facebook.com/v21.0/${cfg.pixel_id}/events`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(capiPayload),
  });
  const capiText = await capiRes.text();
  const capiJson = capiText ? JSON.parse(capiText) : { status: capiRes.status, events_received: 0 };

  supabaseInsert(env, "capi_events_log", {
    client_id: clientId, event_name: "Purchase", event_id: eventId, platform: "meta_capi",
    pixel_id: cfg.pixel_id, status: capiRes.ok ? "sent" : "error",
    meta_response: capiJson, error_message: capiRes.ok ? null : JSON.stringify(capiJson),
    buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
    utm_source: lead?.utm_source || null, utm_campaign: lead?.utm_campaign || null,
    had_fbclid: !!lead?.fbclid, had_fbp: !!resolvedFbp,
  });

  if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
    fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4_measurement_id}&api_secret=${cfg.ga4_api_secret}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: lead?.ga4_client_id || `webhook.${eventTime}`,
          events: [{ name: "purchase", params: { transaction_id: eventId, value: order_value, currency: "BRL", engagement_time_msec: "100" } }],
        }),
      }
    ).catch(() => {});
  }

  return { ok: true, event_id: eventId, platform, capi_ok: capiRes.ok, events_received: capiJson?.events_received };
}

// ── Utilitários ───────────────────────────────────────────────────────────

async function sha256(value) {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return local ? local[0] + "***@" + (domain ?? "") : email;
}

function cors(body, status) {
  return new Response(body ? JSON.stringify(body) : null, {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function supabaseGet(env, table, filters) {
  const params = new URLSearchParams({ ...filters, limit: "1" });
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, Accept: "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

async function supabaseInsert(env, table, data) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
}

async function supabaseUpsert(env, table, data, onConflict) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(data),
  });
}
