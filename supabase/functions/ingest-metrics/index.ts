import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * POST /functions/v1/ingest-metrics
 *
 * Headers:
 *   x-ingest-token: <INGEST_METRICS_TOKEN>           (required)
 *
 * Body (single):
 * {
 *   "client_id": "uuid",                  // OR "client_slug": "nome-do-cliente"
 *   "date": "2026-04-29",                 // ISO date (YYYY-MM-DD)
 *   "revenue": 1234.56,                   // optional
 *   "sales": 12,                          // optional
 *   "leads": 80,                          // optional
 *   "mql": 30,                            // optional
 *   "smql": 8,                            // optional
 *   "investment": 500,                    // optional
 *   "avg_ticket": 102.5,                  // optional
 *   "ltv": 320,                           // optional
 *   "low_ticket_meta": 5,                 // optional
 *   "low_ticket_google": 3,               // optional
 *   "qualified_messages": 18,             // optional
 *   "qualified_followers": 22,            // optional
 *   "product_code": "PROD-001"            // optional
 * }
 *
 * Body (batch): { "rows": [ { ...as above... }, ... ] }
 *
 * Notes:
 * - One row per (client_id, reference_date, product_code). Re-sending overwrites.
 * - Either `client_id` OR `client_slug` must be provided.
 */

type Row = Record<string, unknown> & {
  client_id?: string;
  client_slug?: string;
  date?: string;
  reference_date?: string;
};

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[R$€£\s.]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? `20${y}` : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("INGEST_METRICS_TOKEN");
    if (!expected) {
      return new Response(JSON.stringify({ error: "INGEST_METRICS_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const provided = req.headers.get("x-ingest-token") || req.headers.get("X-Ingest-Token");
    if (provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid x-ingest-token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const rows: Row[] = Array.isArray(body?.rows)
      ? body.rows
      : Array.isArray(body)
        ? body
        : [body as Row];

    if (!rows.length) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build slug → id map for any rows using client_slug
    const slugs = Array.from(
      new Set(rows.map((r) => r.client_slug).filter((s): s is string => !!s)),
    );
    const slugMap = new Map<string, string>();
    if (slugs.length > 0) {
      const { data: clientsBySlug, error: slugErr } = await supabase
        .from("clients")
        .select("id, slug")
        .in("slug", slugs);
      if (slugErr) throw new Error(`Lookup slug error: ${slugErr.message}`);
      for (const c of clientsBySlug || []) slugMap.set(c.slug, c.id);
    }

    const records: any[] = [];
    const errors: { index: number; reason: string }[] = [];

    rows.forEach((r, idx) => {
      let clientId = r.client_id;
      if (!clientId && r.client_slug) clientId = slugMap.get(r.client_slug);
      if (!clientId) {
        errors.push({ index: idx, reason: "Missing client_id or unknown client_slug" });
        return;
      }
      const refDate = toIsoDate(r.date ?? r.reference_date);
      if (!refDate) {
        errors.push({ index: idx, reason: "Invalid or missing date" });
        return;
      }
      records.push({
        client_id: clientId,
        reference_date: refDate,
        revenue: num(r.revenue),
        sales: Math.round(num(r.sales)),
        mql: Math.round(num(r.mql)),
        smql: Math.round(num(r.smql)),
        avg_ticket: num(r.avg_ticket),
        ltv: num(r.ltv),
        investment: num(r.investment),
        leads: Math.round(num(r.leads)),
        low_ticket_meta: Math.round(num(r.low_ticket_meta)),
        low_ticket_google: Math.round(num(r.low_ticket_google)),
        product_code: r.product_code ? String(r.product_code).trim() || null : null,
        qualified_messages: Math.round(num(r.qualified_messages)),
        qualified_followers: Math.round(num(r.qualified_followers)),
        raw_row: r,
        source: "n8n",
      });
    });

    if (records.length === 0) {
      return new Response(JSON.stringify({ error: "No valid rows", errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertErr } = await supabase
      .from("weekly_metrics")
      .upsert(records, { onConflict: "client_id,reference_date" });
    if (upsertErr) throw new Error(`Upsert error: ${upsertErr.message}`);

    return new Response(
      JSON.stringify({ ok: true, ingested: records.length, skipped: errors.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ingest-metrics error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});