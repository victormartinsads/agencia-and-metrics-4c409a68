import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  if (s.includes("approv") || s.includes("paid") || s.includes("complet")) return "approved";
  if (s.includes("refund") || s.includes("reembol")) return "refunded";
  if (s.includes("chargeback")) return "chargeback";
  if (s.includes("pend")) return "pending";
  return s || "approved";
}

/** Normaliza payload de cada plataforma para um formato único. */
function normalize(platform: string, body: any) {
  if (platform === "hotmart") {
    const d = body?.data || body;
    const purchase = d?.purchase || {};
    const product = d?.product || {};
    const buyer = d?.buyer || {};
    return {
      transaction_id: String(purchase?.transaction || purchase?.order_ref || d?.id || ""),
      product_id: String(product?.id || product?.ucode || ""),
      product_name: product?.name || "",
      buyer_email: buyer?.email || "",
      status: normalizeStatus(purchase?.status || body?.event || ""),
      gross_amount: toNumber(purchase?.price?.value ?? purchase?.full_price?.value),
      net_amount: toNumber(purchase?.commission?.value ?? purchase?.price?.value),
      currency: purchase?.price?.currency_value || "BRL",
      occurred_at: purchase?.approved_date
        ? new Date(Number(purchase.approved_date)).toISOString()
        : new Date().toISOString(),
    };
  }
  if (platform === "kiwify") {
    const order = body?.order || body;
    return {
      transaction_id: String(order?.order_id || order?.id || body?.webhook_event_id || ""),
      product_id: String(order?.Product?.product_id || order?.product_id || ""),
      product_name: order?.Product?.product_name || order?.product_name || "",
      buyer_email: order?.Customer?.email || "",
      status: normalizeStatus(order?.order_status || body?.webhook_event_type || ""),
      gross_amount: toNumber(order?.Commissions?.charge_amount ?? order?.charge_amount) / 100,
      net_amount: toNumber(order?.Commissions?.my_commission ?? order?.commission) / 100,
      currency: order?.Commissions?.currency || "BRL",
      occurred_at: order?.created_at
        ? new Date(order.created_at).toISOString()
        : new Date().toISOString(),
    };
  }
  if (platform === "eduzz") {
    const trx = body?.trans_cod ? body : body?.data || body;
    return {
      transaction_id: String(trx?.trans_cod || trx?.transaction || trx?.id || ""),
      product_id: String(trx?.product_cod || trx?.product_id || ""),
      product_name: trx?.product_name || trx?.product || "",
      buyer_email: trx?.client_email || trx?.email || "",
      status: normalizeStatus(trx?.trans_status || trx?.status || ""),
      gross_amount: toNumber(trx?.trans_value || trx?.value),
      net_amount: toNumber(trx?.trans_value_partner || trx?.commission || trx?.trans_value),
      currency: "BRL",
      occurred_at: trx?.trans_createdate
        ? new Date(trx.trans_createdate).toISOString()
        : new Date().toISOString(),
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // path: /sales-webhook/:clientId/:platform?token=xxx
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("sales-webhook");
    const clientId = parts[idx + 1];
    const platform = (parts[idx + 2] || "").toLowerCase();
    const token = url.searchParams.get("token") || req.headers.get("x-webhook-token") || "";

    if (!clientId || !["hotmart", "kiwify", "eduzz"].includes(platform)) {
      return new Response(JSON.stringify({ error: "invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: cfg } = await supabase
      .from("sales_webhook_config")
      .select("webhook_token, product_filters")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!cfg || cfg.webhook_token !== token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const event = normalize(platform, body);
    if (!event || !event.transaction_id) {
      return new Response(JSON.stringify({ error: "could not parse event", body }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtro de produto
    const allowed: string[] = (cfg.product_filters as any)?.[platform] || [];
    if (allowed.length > 0 && event.product_id && !allowed.includes(event.product_id)) {
      return new Response(
        JSON.stringify({ ok: true, ignored: "product not in filter", product_id: event.product_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase.from("sales_events").upsert(
      {
        client_id: clientId,
        platform,
        transaction_id: event.transaction_id,
        product_id: event.product_id || null,
        product_name: event.product_name || null,
        buyer_email: event.buyer_email || null,
        status: event.status,
        gross_amount: event.gross_amount,
        net_amount: event.net_amount,
        currency: event.currency,
        occurred_at: event.occurred_at,
        raw_payload: body,
      },
      { onConflict: "client_id,platform,transaction_id" },
    );

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, event }), {
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