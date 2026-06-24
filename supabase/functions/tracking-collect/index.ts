// tracking-collect/index.ts — v2 com PII completo (email + phone + fn + ln)
// Padrão da skill tracking-audit: .text() + JSON.parse() com fallback

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CRÍTICO: sha256 sempre após lowercase + trim (padrão Meta)
async function sha256(value: string): Promise<string | null> {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Phone → E.164 sem + (Meta exige dígitos, sem +)
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

async function dbUpsert(table: string, data: Record<string, unknown>, onConflict: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(data),
  });
}

async function dbInsert(table: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const clientId = parts[parts.length - 1];

    if (!clientId || clientId === "tracking-collect") {
      return new Response(JSON.stringify({ error: "missing clientId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CRÍTICO: .text() + JSON.parse() — evita crash se Meta retornar body vazio
    const rawText = await req.text();
    const body = rawText ? JSON.parse(rawText) : {};

    const {
      client_id: bodyClientId,
      email, phone, first_name, last_name,
      fbclid, fbp, fbc,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      page_url, referrer, event_name = "PageView", event_id, ga4_client_id, user_id, session_id,
      event_data = {},
    } = body;

    const actualClientId = bodyClientId || clientId;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip") ?? "";
    const userAgent = req.headers.get("user-agent") ?? "";

    // Parse Geo and OS
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;

    let os = null, browser = null;
    if (userAgent) {
      if (userAgent.includes("Windows")) os = "Windows";
      else if (userAgent.includes("Mac OS")) os = "MacOS";
      else if (userAgent.includes("Android")) os = "Android";
      else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
      else if (userAgent.includes("Linux")) os = "Linux";

      if (userAgent.includes("Edge") || userAgent.includes("Edg/")) browser = "Edge";
      else if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    }

    // Buscar config
    const cfg = await dbGet("tracking_config", {
      "client_id": `eq.${actualClientId}`,
      "select": "pixel_id,capi_token,test_event_code,ga4_measurement_id,ga4_api_secret,active",
    });

    if (!cfg?.active) {
      return new Response(JSON.stringify({ ok: true, skipped: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalização PII — sempre antes do hash
    const emailNorm = email?.trim().toLowerCase() || null;
    const phoneNorm = normalizePhone(phone);
    const fnNorm    = first_name?.trim().toLowerCase() || null;
    const lnNorm    = last_name?.trim().toLowerCase() || null;

    // SHA-256
    const [emailHash, phoneHash, fnHash, lnHash, uidHash] = await Promise.all([
      sha256(emailNorm ?? ""),
      sha256(phoneNorm ?? ""),
      sha256(fnNorm ?? ""),
      sha256(lnNorm ?? ""),
      sha256(user_id ?? ""),
    ]);

    const fbcValue = fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);
    const finalEventId = event_id || crypto.randomUUID();
    const eventTime = Math.floor(Date.now() / 1000);

    // Upsert lead (com first_name, last_name e and_id)
    let leadId = null;
    if (emailNorm) {
      await dbUpsert("tracking_leads", {
        client_id: actualClientId,
        email: emailNorm, email_hash: emailHash,
        phone: phoneNorm, phone_hash: phoneHash,
        first_name: fnNorm, first_name_hash: fnHash,
        last_name: lnNorm, last_name_hash: lnHash,
        fbclid: fbclid || null, fbp: fbp || null, fbc: fbcValue || null,
        ip_address: ip, user_agent: userAgent,
        utm_source: utm_source || null, utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null, utm_content: utm_content || null,
        utm_term: utm_term || null, page_url: page_url || null, referrer: referrer || null,
        country, city, os, browser, user_id: user_id || null, and_id: user_id || null, session_id: session_id || null,
        last_seen_at: new Date().toISOString(),
      }, "client_id,email");
      
      // Buscar o ID recém inserido para atrelar ao raw event
      const lead = await dbGet("tracking_leads", { "client_id": `eq.${actualClientId}`, "email": `eq.${emailNorm}`, "select": "id" });
      if (lead) leadId = lead.id;
    }

    // Gravar o Raw Event para o Custom Analytics
    await dbInsert("tracking_raw_events", {
      client_id: actualClientId,
      and_id: user_id || crypto.randomUUID(),
      session_id: session_id || crypto.randomUUID(),
      lead_id: leadId,
      event_name: event_name,
      event_data: event_data,
      url: page_url || null,
      referrer: referrer || null,
      user_agent: userAgent,
      ip_address: ip
    });

    // Meta CAPI
    let capiResult: any = null;
    if (cfg.pixel_id && cfg.capi_token) {
      const userData: Record<string, string | string[]> = {
        client_ip_address: ip,
        client_user_agent: userAgent,
      };
      if (emailHash) userData.em = [emailHash];
      if (phoneHash) userData.ph = [phoneHash];
      if (fnHash)    userData.fn = [fnHash];
      if (lnHash)    userData.ln = [lnHash];
      if (uidHash)   userData.external_id = [uidHash];
      if (fbp)       userData.fbp = fbp;
      if (fbcValue)  userData.fbc = fbcValue;

      const capiPayload: any = {
        data: [{
          event_name, event_time: eventTime, event_id: finalEventId,
          event_source_url: page_url || "https://unknown",
          action_source: "website",
          user_data: userData,
        }],
        access_token: cfg.capi_token,
      };
      if (cfg.test_event_code) capiPayload.test_event_code = cfg.test_event_code;

      // CRÍTICO: .text() com fallback — Meta pode retornar body vazio em erros
      const capiRes  = await fetch(`https://graph.facebook.com/v21.0/${cfg.pixel_id}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(capiPayload),
      });
      const capiText = await capiRes.text();
      const capiJson = capiText ? JSON.parse(capiText) : { status: capiRes.status, events_received: 0 };
      capiResult = { success: capiRes.ok, response: capiJson, status: capiRes.ok ? "sent" : "error" };
    } else {
      capiResult = { success: false, status: "skipped", response: { error: "Missing Pixel ID or Token" } };
    }

    // Registrar no Log CAPI (Sempre registra para aparecer no Ao Vivo, mesmo sem Token)
    await dbInsert("capi_events_log", {
      client_id: actualClientId, event_name, event_id: finalEventId, platform: "meta_capi",
      pixel_id: cfg.pixel_id || null, status: capiResult.status,
      meta_response: capiResult.response, error_message: capiResult.success ? null : JSON.stringify(capiResult.response),
      buyer_email_masked: emailNorm ? maskEmail(emailNorm) : null,
      utm_source: utm_source || null, utm_campaign: utm_campaign || null,
      had_fbclid: !!fbclid, had_fbp: !!fbp,
      country, city, os, browser, user_id: user_id || null,
    });

    // GA4
    let ga4Result: any = null;
    if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
      const ga4Name: Record<string, string> = {
        PageView: "page_view", ViewContent: "view_item",
        InitiateCheckout: "begin_checkout", Lead: "generate_lead", Contact: "contact",
      };
      const ga4Res = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4_measurement_id}&api_secret=${cfg.ga4_api_secret}`,
        {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: ga4_client_id || `${ip}.${eventTime}`,
            events: [{ name: ga4Name[event_name] || event_name.toLowerCase(), params: { page_location: page_url, event_id: finalEventId, engagement_time_msec: "100" } }],
          }),
        }
      );
      ga4Result = { success: ga4Res.ok || ga4Res.status === 204 };
    }

    return new Response(JSON.stringify({ ok: true, event_id: finalEventId, capi: capiResult, ga4: ga4Result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("tracking-collect error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
