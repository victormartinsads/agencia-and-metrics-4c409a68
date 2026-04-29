import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEETS_GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

function authHeaders(target: "sheets" | "drive") {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const key =
    target === "drive"
      ? Deno.env.get("GOOGLE_DRIVE_API_KEY")
      : Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!key) {
    throw new Error(
      target === "drive"
        ? "GOOGLE_DRIVE_API_KEY not configured (Google Drive connector not linked)"
        : "GOOGLE_SHEETS_API_KEY not configured (Google Sheets connector not linked)",
    );
  }
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": key,
  };
}

async function listFiles(query: string | null) {
  // Use Sheets connector key with Drive gateway: works because the connector OAuth
  // includes drive.file/drive.readonly scopes.
  const q = [`mimeType = 'application/vnd.google-apps.spreadsheet'`, `trashed = false`];
  if (query) q.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  const params = new URLSearchParams({
    q: q.join(" and "),
    fields: "files(id,name,modifiedTime,webViewLink),nextPageToken",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });
  const r = await fetch(`${DRIVE_GATEWAY}/files?${params.toString()}`, {
    headers: authHeaders("drive"),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Drive list failed [${r.status}]: ${JSON.stringify(data)}`);
  return { files: data.files || [], nextPageToken: data.nextPageToken };
}

async function getMeta(spreadsheetId: string) {
  const url = `${SHEETS_GATEWAY}/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;
  const r = await fetch(url, { headers: authHeaders("sheets") });
  const data = await r.json();
  if (!r.ok) throw new Error(`Sheets meta failed [${r.status}]: ${JSON.stringify(data)}`);
  return {
    spreadsheet_name: data.properties?.title || "",
    sheets: (data.sheets || []).map((s: any) => ({
      name: s.properties?.title,
      gridId: s.properties?.sheetId,
      rowCount: s.properties?.gridProperties?.rowCount || 0,
      columnCount: s.properties?.gridProperties?.columnCount || 0,
    })),
  };
}

async function preview(spreadsheetId: string, sheetName: string, headerRow: number) {
  // Read header_row + 10 data rows. Range: SheetName!A{headerRow}:Z{headerRow+10}
  const start = headerRow;
  const end = headerRow + 10;
  const range = `'${sheetName.replace(/'/g, "''")}'!A${start}:Z${end}`;
  const url = `${SHEETS_GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}`;
  const r = await fetch(url, { headers: authHeaders("sheets") });
  const data = await r.json();
  if (!r.ok) throw new Error(`Sheets preview failed [${r.status}]: ${JSON.stringify(data)}`);
  const values: string[][] = data.values || [];
  const headers = (values[0] || []).map((h) => String(h || "").trim());
  const rows = values.slice(1);
  return { headers, rows };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, query, spreadsheet_id, sheet_name, header_row } = await req.json();
    let result;
    if (action === "list_files") {
      result = await listFiles(query || null);
    } else if (action === "get_meta") {
      if (!spreadsheet_id) throw new Error("spreadsheet_id required");
      result = await getMeta(spreadsheet_id);
    } else if (action === "preview") {
      if (!spreadsheet_id || !sheet_name) throw new Error("spreadsheet_id and sheet_name required");
      result = await preview(spreadsheet_id, sheet_name, Number(header_row || 1));
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("sheets-browse error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});