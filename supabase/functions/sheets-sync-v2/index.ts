import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEETS_GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function parseNumber(raw: unknown, decimalSep: string): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  let s = String(raw).trim();
  s = s.replace(/[R$€£\s]/g, "");
  if (decimalSep === ",") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseCount(raw: unknown, decimalSep: string): number {
  if (raw === null || raw === undefined) return 0;
  const text = String(raw).trim();
  if (!text || text === "-" || text.toLowerCase() === "null") return 0;
  const numeric = parseNumber(text, decimalSep);
  return numeric > 0 ? Math.round(numeric) : 1;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

function parseDate(raw: unknown, format: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, a, b, c] = m;
    const year = c.length === 2 ? `20${c}` : c;
    if (format.startsWith("MM")) return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { client_id } = await req.json();
    if (!client_id) throw new Error("client_id required");

    const { data: cfg, error: cfgErr } = await supabase
      .from("dashboard_sheet_config")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!cfg) throw new Error("Configuração de planilha não encontrada");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SHEETS_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");

    let allRows: string[][] = [];
    const range = `'${cfg.sheet_name.replace(/'/g, "''")}'!A${cfg.header_row}:ZZ`;

    if (LOVABLE_API_KEY && SHEETS_KEY) {
      const url = `${SHEETS_GATEWAY}/spreadsheets/${cfg.spreadsheet_id}/values/${range}`;
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": SHEETS_KEY,
        },
      });

      if (r.ok) {
        const data = await r.json();
        allRows = data.values || [];
      } else {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheet_id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.sheet_name)}`;
        const csvResponse = await fetch(csvUrl);
        const csvText = await csvResponse.text();
        if (!csvResponse.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(`Sheets API ${r.status}: ${JSON.stringify(data)}`);
        }
        allRows = parseCsv(csvText).slice(Math.max(0, Number(cfg.header_row || 1) - 1));
      }
    } else {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${cfg.spreadsheet_id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.sheet_name)}`;
      const csvResponse = await fetch(csvUrl);
      const csvText = await csvResponse.text();
      if (!csvResponse.ok) {
        throw new Error(`Planilha pública indisponível [${csvResponse.status}]`);
      }
      allRows = parseCsv(csvText).slice(Math.max(0, Number(cfg.header_row || 1) - 1));
    }

    if (allRows.length === 0) {
      await supabase.from("dashboard_sheet_config").update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
        last_sync_rows: 0,
      }).eq("client_id", client_id);
      return new Response(JSON.stringify({ synced: 0, message: "Planilha vazia" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = (allRows[0] || []).map((h) => String(h || "").trim());
    const dataRows = allRows.slice(1);

    const mapping = (cfg.field_mapping || {}) as Record<string, string>;

    // Map each dashboard field key -> column index by header name (case-insensitive).
    const colIndex = (headerName: string | undefined): number | null => {
      if (!headerName) return null;
      const target = headerName.trim().toLowerCase();
      const idx = headers.findIndex((h) => h.toLowerCase() === target);
      return idx >= 0 ? idx : null;
    };

    const idx = {
      date: colIndex(mapping.date),
      revenue: colIndex(mapping.revenue),
      sales: colIndex(mapping.sales),
      leads: colIndex(mapping.leads),
      mql: colIndex(mapping.mql),
      smql: colIndex(mapping.smql),
      investment: colIndex(mapping.investment),
      avg_ticket: colIndex(mapping.avg_ticket),
      ltv: colIndex(mapping.ltv),
      low_ticket_meta: colIndex(mapping.low_ticket_meta),
      low_ticket_google: colIndex(mapping.low_ticket_google),
      product_code: colIndex(mapping.product_code),
      qualified_messages: colIndex(mapping.qualified_messages),
      qualified_followers: colIndex(mapping.qualified_followers),
      utm_source: colIndex(mapping.utm_source),
      utm_medium: colIndex(mapping.utm_medium),
      utm_campaign: colIndex(mapping.utm_campaign),
      utm_content: colIndex(mapping.utm_content),
      utm_term: colIndex(mapping.utm_term),
    };

    if (idx.date === null) {
      throw new Error("Campo 'Data' não está mapeado. Volte à configuração e selecione qual coluna tem a data.");
    }

    const sep = cfg.decimal_separator || ",";
    const fmt = cfg.date_format || "DD/MM/YYYY";

    const aggregate = new Map<string, any>();
    for (const row of dataRows) {
      const refDate = parseDate(row[idx.date!], fmt);
      if (!refDate) continue;
      const productCode = idx.product_code !== null ? String(row[idx.product_code] || "").trim() || null : null;
      const key = refDate;
      const current = aggregate.get(key) || {
        client_id,
        reference_date: refDate,
        revenue: 0,
        sales: 0,
        mql: 0,
        smql: 0,
        leads: 0,
        investment: 0,
        avg_ticket: 0,
        ltv: 0,
        low_ticket_meta: 0,
        low_ticket_google: 0,
        product_code: null,
        qualified_messages: 0,
        qualified_followers: 0,
        raw_row: {
          rows: 0,
          product_breakdown: {} as Record<string, number>,
          utm_breakdown: [] as Array<{
            source: string; medium: string; campaign: string; content: string; term: string;
            sales: number; revenue: number;
          }>,
        },
        source: "google_sheets",
      };

      current.revenue += idx.revenue !== null ? parseNumber(row[idx.revenue], sep) : 0;
      current.sales += idx.sales !== null ? parseCount(row[idx.sales], sep) : 0;
      current.mql += idx.mql !== null ? parseCount(row[idx.mql], sep) : 0;
      current.smql += idx.smql !== null ? parseCount(row[idx.smql], sep) : 0;
      current.leads += idx.leads !== null ? parseCount(row[idx.leads], sep) : 0;
      current.investment += idx.investment !== null ? parseNumber(row[idx.investment], sep) : 0;
      current.avg_ticket += idx.avg_ticket !== null ? parseNumber(row[idx.avg_ticket], sep) : 0;
      current.ltv += idx.ltv !== null ? parseNumber(row[idx.ltv], sep) : 0;
      current.low_ticket_meta += idx.low_ticket_meta !== null ? parseCount(row[idx.low_ticket_meta], sep) : 0;
      current.low_ticket_google += idx.low_ticket_google !== null ? parseCount(row[idx.low_ticket_google], sep) : 0;
      current.qualified_messages += idx.qualified_messages !== null ? parseCount(row[idx.qualified_messages], sep) : 0;
      current.qualified_followers += idx.qualified_followers !== null ? parseCount(row[idx.qualified_followers], sep) : 0;
      current.raw_row.rows += 1;
      if (productCode) {
        current.raw_row.product_breakdown[productCode] = (current.raw_row.product_breakdown[productCode] || 0)
          + (idx.sales !== null ? parseCount(row[idx.sales], sep) : 1);
      }

      // UTM aggregation: 1 entry per row, summed later by combination on the client side.
      const hasAnyUtm = (
        idx.utm_source !== null || idx.utm_medium !== null ||
        idx.utm_campaign !== null || idx.utm_content !== null || idx.utm_term !== null
      );
      if (hasAnyUtm) {
        const rowRevenue = idx.revenue !== null ? parseNumber(row[idx.revenue], sep) : 0;
        const rowSales = idx.sales !== null ? parseCount(row[idx.sales], sep) : 1;
        current.raw_row.utm_breakdown.push({
          source: idx.utm_source !== null ? String(row[idx.utm_source] || "").trim() : "",
          medium: idx.utm_medium !== null ? String(row[idx.utm_medium] || "").trim() : "",
          campaign: idx.utm_campaign !== null ? String(row[idx.utm_campaign] || "").trim() : "",
          content: idx.utm_content !== null ? String(row[idx.utm_content] || "").trim() : "",
          term: idx.utm_term !== null ? String(row[idx.utm_term] || "").trim() : "",
          sales: rowSales,
          revenue: rowRevenue,
        });
      }
      aggregate.set(key, current);
    }

    const records = Array.from(aggregate.values()).map((record) => {
      if (record.sales > 0) {
        if (!record.avg_ticket && record.revenue > 0) record.avg_ticket = record.revenue / record.sales;
        if (!record.ltv && record.revenue > 0) record.ltv = record.revenue / record.sales;
      }
      return record;
    });

    if (records.length > 0) {
      // Delete existing rows for this client to avoid duplicates from rows without product_code
      await supabase.from("weekly_metrics").delete().eq("client_id", client_id).eq("source", "google_sheets");
      const { error: insErr } = await supabase.from("weekly_metrics").insert(records);
      if (insErr) throw new Error(`Insert error: ${insErr.message}`);
    }

    await supabase.from("dashboard_sheet_config").update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: "success",
      last_sync_error: null,
      last_sync_rows: records.length,
    }).eq("client_id", client_id);

    return new Response(JSON.stringify({ synced: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sheets-sync-v2 error", msg);
    if (req.method === "POST") {
      try {
        const body = await req.clone().json().catch(() => ({}));
        if (body?.client_id) {
          await supabase.from("dashboard_sheet_config").update({
            last_sync_status: "error",
            last_sync_error: msg,
          }).eq("client_id", body.client_id);
        }
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});