import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const { data: configs, error } = await sb
    .from("dashboard_sheet_config")
    .select("client_id, spreadsheet_id")
    .not("spreadsheet_id", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ client_id: string; ok: boolean; error?: string }> = [];

  for (const cfg of configs || []) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/sheets-sync-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ client_id: cfg.client_id }),
      });
      const ok = res.ok;
      const text = ok ? "" : await res.text();
      results.push({ client_id: cfg.client_id, ok, error: ok ? undefined : text.slice(0, 500) });
    } catch (e) {
      results.push({ client_id: cfg.client_id, ok: false, error: String((e as Error).message) });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});