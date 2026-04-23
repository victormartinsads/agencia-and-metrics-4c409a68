import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

function colLetterToIndex(letter: string | null | undefined): number | null {
  if (!letter) return null;
  const clean = letter.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(clean)) return null;
  let idx = 0;
  for (let i = 0; i < clean.length; i++) {
    idx = idx * 26 + (clean.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseNumber(raw: unknown, decimalSep: string): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  let s = String(raw).trim();
  s = s.replace(/[R$€£\s]/g, "");
  if (decimalSep === ",") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(raw: unknown, format: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, a, b, c] = m;
    const year = c.length === 2 ? `20${c}` : c;
    if (format.startsWith("MM")) {
      return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }
    return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, action } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: config, error: cfgErr } = await supabase
      .from("client_sheets_config")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (cfgErr) throw new Error(`Config error: ${cfgErr.message}`);
    if (!config) {
      return new Response(JSON.stringify({ error: "Configure a planilha deste cliente primeiro." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SHEETS_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");

    if (!LOVABLE_API_KEY || !SHEETS_KEY) {
      const msg = "Conexão Google Sheets ainda não está ativa. Vá em Connectors → Google Sheets para conectar.";
      await supabase.from("client_sheets_config").update({
        last_sync_status: "pending_connection",
        last_sync_error: msg,
      }).eq("id", config.id);
      return new Response(JSON.stringify({ error: msg, needsConnection: true }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const url = `${GATEWAY_URL}/spreadsheets/${config.spreadsheet_id}?fields=properties.title,sheets.properties.title`;
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": SHEETS_KEY,
        },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(`Sheets API ${r.status}: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify({ ok: true, spreadsheet: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync
    const range = `${config.sheet_name}!${config.range_notation}`;
    const url = `${GATEWAY_URL}/spreadsheets/${config.spreadsheet_id}/values/${range}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SHEETS_KEY,
      },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`Sheets API ${r.status}: ${JSON.stringify(data)}`);

    const rows: string[][] = data.values || [];
    const startIdx = Math.max(0, (config.header_row || 1));
    const dataRows = rows.slice(startIdx);

    const map = {
      date: colLetterToIndex(config.column_date),
      revenue: colLetterToIndex(config.column_revenue),
      sales: colLetterToIndex(config.column_sales),
      mql: colLetterToIndex(config.column_mql),
      smql: colLetterToIndex(config.column_smql),
      avg_ticket: colLetterToIndex(config.column_avg_ticket),
      ltv: colLetterToIndex(config.column_ltv),
    };

    if (map.date === null) throw new Error("Coluna de data não configurada.");

    const records = [];
    for (const row of dataRows) {
      const dateRaw = row[map.date];
      const refDate = parseDate(dateRaw, config.date_format || "DD/MM/YYYY");
      if (!refDate) continue;
      records.push({
        client_id: clientId,
        reference_date: refDate,
        revenue: map.revenue !== null ? parseNumber(row[map.revenue], config.decimal_separator) : 0,
        sales: map.sales !== null ? Math.round(parseNumber(row[map.sales], config.decimal_separator)) : 0,
        mql: map.mql !== null ? Math.round(parseNumber(row[map.mql], config.decimal_separator)) : 0,
        smql: map.smql !== null ? Math.round(parseNumber(row[map.smql], config.decimal_separator)) : 0,
        avg_ticket: map.avg_ticket !== null ? parseNumber(row[map.avg_ticket], config.decimal_separator) : 0,
        ltv: map.ltv !== null ? parseNumber(row[map.ltv], config.decimal_separator) : 0,
        raw_row: row,
        source: "google_sheets",
      });
    }

    if (records.length > 0) {
      const { error: upsertErr } = await supabase
        .from("weekly_metrics")
        .upsert(records, { onConflict: "client_id,reference_date" });
      if (upsertErr) throw new Error(`Upsert error: ${upsertErr.message}`);
    }

    await supabase.from("client_sheets_config").update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: "success",
      last_sync_error: null,
    }).eq("id", config.id);

    return new Response(JSON.stringify({ ok: true, synced: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sheets-sync error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});