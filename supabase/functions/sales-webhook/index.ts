// sales-webhook/index.ts
// Recebe webhooks de Hotmart, Kiwify e Eduzz
// Normaliza, salva, cruza com tracking_leads e dispara CAPI + GA4

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hotmart-hottok, x-kiwify-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function normalizeStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("approv") || s.includes("paid") || s.includes("complet") || s === "approved") return "approved";
  if (s.includes("refund") || s.includes("reembol")) return "refunded";
  if (s.includes("chargeback")) return "chargeback";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("pend")) return "pending";
  return s || "approved";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotmart: normaliza payload v2 (com suporte a order bumps)
// Estrutura: data.purchase (principal) + data.purchase.order_bump[] (bumps)
// ─────────────────────────────────────────────────────────────────────────────
function normalizeHotmart(body: any) {
  const d = body?.data || body;
  const purchase = d?.purchase || {};
  const product = d?.product || {};
  const buyer = d?.buyer || {};

  const mainEvent = {
    transaction_id: String(purchase?.transaction || purchase?.order_ref || d?.id || ""),
    product_id: String(product?.id || product?.ucode || ""),
    product_name: product?.name || "",
    buyer_email: (buyer?.email || "").trim().toLowerCase(),
    buyer_phone: buyer?.checkout_phone || buyer?.phone || null,
    buyer_name: buyer?.name || null,
    status: normalizeStatus(purchase?.status || body?.event || ""),
    gross_amount: toNumber(purchase?.price?.value ?? purchase?.full_price?.value),
    net_amount: toNumber(purchase?.commission?.value ?? purchase?.price?.value),
    currency: purchase?.price?.currency_value || "BRL",
    occurred_at: purchase?.approved_date
      ? new Date(Number(purchase.approved_date)).toISOString()
      : new Date().toISOString(),
    is_order_bump: false,
    parent_transaction_id: null as string | null,
  };

  // Order bumps no Hotmart vêm em purchase.order_bump[]
  const bumpItems: any[] = purchase?.order_bump || [];
  const bumps = bumpItems.map((bump: any, idx: number) => ({
    transaction_id: `${mainEvent.transaction_id}_bump${idx + 1}`,
    product_id: String(bump?.product?.id || bump?.product_id || ""),
    product_name: bump?.product?.name || bump?.product_name || `Order Bump ${idx + 1}`,
    buyer_email: mainEvent.buyer_email,
    buyer_phone: mainEvent.buyer_phone,
    buyer_name: mainEvent.buyer_name,
    status: mainEvent.status,
    gross_amount: toNumber(bump?.price?.value ?? bump?.amount),
    net_amount: toNumber(bump?.price?.value ?? bump?.amount),
    currency: mainEvent.currency,
    occurred_at: mainEvent.occurred_at,
    is_order_bump: true,
    parent_transaction_id: mainEvent.transaction_id,
  }));

  return [mainEvent, ...bumps];
}

// ─────────────────────────────────────────────────────────────────────────────
// Kiwify: normaliza payload
// ─────────────────────────────────────────────────────────────────────────────
function normalizeKiwify(body: any) {
  const order = body?.order || body;
  const customer = order?.Customer || {};

  const mainEvent = {
    transaction_id: String(order?.order_id || order?.id || body?.webhook_event_id || ""),
    product_id: String(order?.Product?.product_id || order?.product_id || ""),
    product_name: order?.Product?.product_name || order?.product_name || "",
    buyer_email: (customer?.email || "").trim().toLowerCase(),
    buyer_phone: customer?.mobile || customer?.phone || null,
    buyer_name: customer?.full_name || customer?.name || null,
    status: normalizeStatus(order?.order_status || body?.webhook_event_type || ""),
    gross_amount: toNumber(order?.Commissions?.charge_amount ?? order?.charge_amount) / 100,
    net_amount: toNumber(order?.Commissions?.my_commission ?? order?.commission) / 100,
    currency: order?.Commissions?.currency || "BRL",
    occurred_at: order?.created_at
      ? new Date(order.created_at).toISOString()
      : new Date().toISOString(),
    is_order_bump: false,
    parent_transaction_id: null as string | null,
  };

  // Kiwify order bumps vêm em order.order_bumps[]
  const bumpItems: any[] = order?.order_bumps || [];
  const bumps = bumpItems.map((bump: any, idx: number) => ({
    transaction_id: `${mainEvent.transaction_id}_bump${idx + 1}`,
    product_id: String(bump?.product_id || ""),
    product_name: bump?.product_name || `Order Bump ${idx + 1}`,
    buyer_email: mainEvent.buyer_email,
    buyer_phone: mainEvent.buyer_phone,
    buyer_name: mainEvent.buyer_name,
    status: mainEvent.status,
    gross_amount: toNumber(bump?.price) / 100,
    net_amount: toNumber(bump?.price) / 100,
    currency: mainEvent.currency,
    occurred_at: mainEvent.occurred_at,
    is_order_bump: true,
    parent_transaction_id: mainEvent.transaction_id,
  }));

  return [mainEvent, ...bumps];
}

// ─────────────────────────────────────────────────────────────────────────────
// Eduzz: normaliza payload
// ─────────────────────────────────────────────────────────────────────────────
function normalizeEduzz(body: any) {
  const trx = body?.trans_cod ? body : body?.data || body;

  const mainEvent = {
    transaction_id: String(trx?.trans_cod || trx?.transaction || trx?.id || ""),
    product_id: String(trx?.product_cod || trx?.product_id || ""),
    product_name: trx?.product_name || trx?.product || "",
    buyer_email: (trx?.client_email || trx?.email || "").trim().toLowerCase(),
    buyer_phone: trx?.client_cel || trx?.client_phone || null,
    buyer_name: trx?.client_name || null,
    status: normalizeStatus(trx?.trans_status || trx?.status || ""),
    gross_amount: toNumber(trx?.trans_value || trx?.value),
    net_amount: toNumber(trx?.trans_value_partner || trx?.commission || trx?.trans_value),
    currency: "BRL",
    occurred_at: trx?.trans_createdate
      ? new Date(trx.trans_createdate).toISOString()
      : new Date().toISOString(),
    is_order_bump: false,
    parent_transaction_id: null as string | null,
  };

  return [mainEvent];
}

function normalize(platform: string, body: any) {
  if (platform === "hotmart") return normalizeHotmart(body);
  if (platform === "kiwify") return normalizeKiwify(body);
  if (platform === "eduzz") return normalizeEduzz(body);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Disparo de CAPI após salvar venda — chama a edge function capi-dispatch
// ─────────────────────────────────────────────────────────────────────────────
async function triggerCapiDispatch(
  clientId: string,
  salesEventId: string,
  event: any,
  lead: any
) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/capi-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        sales_event_id: salesEventId,
        transaction_id: event.transaction_id,
        product_id: event.product_id,
        product_name: event.product_name,
        buyer_email: event.buyer_email,
        buyer_phone: event.buyer_phone,
        gross_amount: event.gross_amount,
        currency: event.currency,
        occurred_at: event.occurred_at,
        is_order_bump: event.is_order_bump,
        tracking_lead: lead,
      }),
    });
  } catch (e) {
    console.error("Failed to trigger capi-dispatch:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("sales-webhook");
    const clientId = parts[idx + 1];
    const platform = (parts[idx + 2] || "").toLowerCase();
    const token = url.searchParams.get("token") || req.headers.get("x-webhook-token") || "";

    // ── Bulk import via CSV (chamado do app, autenticado por JWT) ───────────
    if (platform === "import") {
      const claims = await getUserClaims(req);
      if (!claims) return unauthorized(corsHeaders);
      if (!(await hasAdminOrEditor(claims.sub))) return forbidden(corsHeaders, "Admin or editor role required");
      const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const body = await req.json().catch(() => ({}));
      const events = Array.isArray(body?.events) ? body.events : [];
      if (events.length === 0) {
        return new Response(JSON.stringify({ error: "no events" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rows = events.map((e: any) => ({
        client_id: clientId,
        platform: String(e.platform || "csv").toLowerCase(),
        transaction_id: String(e.transaction_id || crypto.randomUUID()),
        product_id: e.product_id || null,
        product_name: e.product_name || null,
        buyer_email: e.buyer_email || null,
        status: normalizeStatus(e.status || "approved"),
        gross_amount: toNumber(e.gross_amount ?? e.amount ?? e.value),
        net_amount: toNumber(e.net_amount ?? e.gross_amount ?? e.amount ?? e.value),
        currency: e.currency || "BRL",
        occurred_at: e.occurred_at ? new Date(e.occurred_at).toISOString() : new Date().toISOString(),
        raw_payload: e,
      }));
      const { error: bulkErr, count } = await supabaseAdmin
        .from("sales_events")
        .upsert(rows, { onConflict: "client_id,platform,transaction_id", count: "exact" });
      if (bulkErr) throw bulkErr;
      return new Response(JSON.stringify({ ok: true, imported: rows.length, count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!clientId || !["hotmart", "kiwify", "eduzz"].includes(platform)) {
      return new Response(JSON.stringify({ error: "invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar token — agora busca na tracking_config também
    const [webhookCfgResult, trackingCfgResult] = await Promise.all([
      supabase
        .from("sales_webhook_config")
        .select("webhook_token, product_filters")
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase
        .from("tracking_config")
        .select("webhook_token, active")
        .eq("client_id", clientId)
        .maybeSingle(),
    ]);

    const cfg = webhookCfgResult.data;
    const tkCfg = trackingCfgResult.data;

    // Token pode vir de sales_webhook_config OU de tracking_config
    const validTokens = [cfg?.webhook_token, tkCfg?.webhook_token].filter(Boolean);
    if (!validTokens.includes(token)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const events = normalize(platform, body);

    if (!events || events.length === 0 || !events[0].transaction_id) {
      return new Response(JSON.stringify({ error: "could not parse event", body }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Processar cada evento (produto principal + order bumps)
    const results = [];
    for (const event of events) {
      // Filtro de produto (somente no produto principal)
      if (!event.is_order_bump && cfg) {
        const allowed: string[] = (cfg.product_filters as any)?.[platform] || [];
        if (allowed.length > 0 && event.product_id && !allowed.includes(event.product_id)) {
          results.push({ ignored: true, product_id: event.product_id });
          continue;
        }
      }

      // Buscar tracking_lead para cruzamento de UTMs
      let lead = null;
      if (event.buyer_email) {
        const { data: foundLead } = await supabase
          .from("tracking_leads")
          .select("*")
          .eq("client_id", clientId)
          .eq("email", event.buyer_email)
          .maybeSingle();
        lead = foundLead;
      }

      // Salvar evento de venda
      const { data: savedEvent, error } = await supabase
        .from("sales_events")
        .upsert(
          {
            client_id: clientId,
            platform,
            transaction_id: event.transaction_id,
            product_id: event.product_id || null,
            product_name: event.product_name || null,
            buyer_email: event.buyer_email || null,
            buyer_phone: event.buyer_phone || null,
            status: event.status,
            gross_amount: event.gross_amount,
            net_amount: event.net_amount,
            currency: event.currency,
            occurred_at: event.occurred_at,
            is_order_bump: event.is_order_bump,
            parent_transaction_id: event.parent_transaction_id || null,
            tracking_lead_id: lead?.id || null,
            raw_payload: event.is_order_bump ? null : body, // só salva raw no principal
          },
          { onConflict: "client_id,platform,transaction_id" }
        )
        .select("id")
        .single();

      if (error) {
        console.error("Error saving event:", error);
        results.push({ error: error.message, transaction_id: event.transaction_id });
        continue;
      }

      results.push({
        ok: true,
        transaction_id: event.transaction_id,
        is_order_bump: event.is_order_bump,
        sales_event_id: savedEvent?.id,
      });

      // Disparar CAPI + GA4 apenas para eventos aprovados
      // Order bumps também são disparados (com is_order_bump: true para análise)
      if (event.status === "approved" && savedEvent?.id && tkCfg?.active) {
        // Fire-and-forget — não bloqueamos o response do webhook
        triggerCapiDispatch(clientId, savedEvent.id, event, lead);
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sales-webhook error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});