import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHEETS_GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const SHEETS_DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/drive/v3";

function getConnectorKeys(prefix: "GOOGLE_DRIVE_API_KEY" | "GOOGLE_SHEETS_API_KEY") {
  const env = Deno.env.toObject();
  return Object.keys(env)
    .filter((key) => key === prefix || key.startsWith(`${prefix}_`))
    .sort((a, b) => {
      const getOrder = (value: string) => {
        if (value === prefix) return 0;
        const match = value.match(/_(\d+)$/);
        return match ? Number(match[1]) : 0;
      };
      return getOrder(b) - getOrder(a);
    })
    .map((name) => env[name])
    .filter((value): value is string => Boolean(value));
}

function getGatewayHeaders(key: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": key,
  };
}

async function fetchWithCandidateKeys(
  attempts: { url: string; keys: string[]; label: string }[],
) {
  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.keys || attempt.keys.length === 0) {
      errors.push(`${attempt.label} skipped: no credentials available`);
      continue;
    }
    for (const key of attempt.keys) {
      const r = await fetch(attempt.url, { headers: getGatewayHeaders(key) });
      const data = await r.json();
      if (r.ok) return data;

      const message = `${attempt.label} failed [${r.status}]: ${JSON.stringify(data)}`;
      errors.push(message);

      const isMissingCredential = r.status === 401 && data?.message === "Credential not found";
      if (!isMissingCredential) {
        throw new Error(message);
      }
    }
  }

  throw new Error(errors[errors.length - 1] || "Connector request failed");
}

async function listFiles(query: string | null) {
  const q = [`mimeType = 'application/vnd.google-apps.spreadsheet'`, `trashed = false`];
  if (query) q.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  const params = new URLSearchParams({
    q: q.join(" and "),
    fields: "files(id,name,modifiedTime,webViewLink),nextPageToken",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });
  const driveKeys = getConnectorKeys("GOOGLE_DRIVE_API_KEY");
  const sheetsKeys = getConnectorKeys("GOOGLE_SHEETS_API_KEY");
  if (driveKeys.length === 0 && sheetsKeys.length === 0) {
    throw new Error("Google Drive / Google Sheets connector not configured");
  }

  const data = await fetchWithCandidateKeys([
    { url: `${DRIVE_GATEWAY}/files?${params.toString()}`, keys: driveKeys, label: "Drive list" },
    { url: `${SHEETS_DRIVE_GATEWAY}/files?${params.toString()}`, keys: sheetsKeys, label: "Drive list" },
  ]);
  return { files: data.files || [], nextPageToken: data.nextPageToken };
}

async function getMeta(spreadsheetId: string) {
  const url = `${SHEETS_GATEWAY}/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;
  const sheetsKeys = getConnectorKeys("GOOGLE_SHEETS_API_KEY");
  try {
    if (sheetsKeys.length === 0) throw new Error("GOOGLE_SHEETS_API_KEY not configured (Google Sheets connector not linked)");
    const data = await fetchWithCandidateKeys([{ url, keys: sheetsKeys, label: "Sheets meta" }]);
    return {
      spreadsheet_name: data.properties?.title || "",
      sheets: (data.sheets || []).map((s: any) => ({
        name: s.properties?.title,
        gridId: s.properties?.sheetId,
        rowCount: s.properties?.gridProperties?.rowCount || 0,
        columnCount: s.properties?.gridProperties?.columnCount || 0,
      })),
    };
  } catch (_error) {
    const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(publicUrl);
    const html = await response.text();
    if (!response.ok) {
      throw new Error(`Sheets meta fallback failed [${response.status}]`);
    }
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i)
      || html.match(/<title>([^<]+) - Google Sheets<\/title>/i);
    return {
      spreadsheet_name: titleMatch?.[1] || "Planilha pública",
      sheets: [],
    };
  }
}

async function preview(spreadsheetId: string, sheetName: string, headerRow: number) {
  // Read header_row + 10 data rows. Range: SheetName!A{headerRow}:Z{headerRow+10}
  const start = headerRow;
  const end = headerRow + 10;
  const range = `'${sheetName.replace(/'/g, "''")}'!A${start}:Z${end}`;
  const url = `${SHEETS_GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}`;
  const sheetsKeys = getConnectorKeys("GOOGLE_SHEETS_API_KEY");
  try {
    if (sheetsKeys.length === 0) throw new Error("GOOGLE_SHEETS_API_KEY not configured (Google Sheets connector not linked)");
    const data = await fetchWithCandidateKeys([{ url, keys: sheetsKeys, label: "Sheets preview" }]);
    const values: string[][] = data.values || [];
    const headers = (values[0] || []).map((h) => String(h || "").trim());
    const rows = values.slice(1);
    return { headers, rows };
  } catch (_error) {
    const publicCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(publicCsvUrl);
    const csvText = await response.text();
    if (!response.ok) {
      throw new Error(`Sheets preview fallback failed [${response.status}]`);
    }

    const parseCsvLine = (line: string) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          values.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current);
      return values;
    };

    const lines = csvText.split(/\r?\n/).filter((line) => line.length > 0);
    const sliced = lines.slice(Math.max(0, headerRow - 1), headerRow + 9).map(parseCsvLine);
    const headers = (sliced[0] || []).map((h) => String(h || "").trim());
    const rows = sliced.slice(1);
    return { headers, rows };
  }
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