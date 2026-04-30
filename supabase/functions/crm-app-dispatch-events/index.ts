import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { lead_id, event_type, old_status } = await req.json();
    if (!lead_id || !event_type) return json({ error: "lead_id e event_type obrigatórios" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lead } = await supabase.from("leads").select("*").eq("id", lead_id).maybeSingle();
    if (!lead) return json({ error: "Lead não encontrado" }, 404);

    const { data: hooks } = await supabase
      .from("outbound_webhooks")
      .select("*")
      .eq("organization_id", lead.organization_id)
      .eq("active", true);

    const targets = (hooks || []).filter((h: any) => Array.isArray(h.events) && h.events.includes(event_type));

    await Promise.all(targets.map(async (h: any) => {
      let success = false; let status = 0; let body = "";
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": h.secret },
          body: JSON.stringify({ event_type, old_status, lead }),
        });
        status = res.status; body = await res.text(); success = res.ok;
      } catch (e) { body = String(e); }
      await supabase.from("outbound_events").insert({
        organization_id: lead.organization_id, lead_id, webhook_id: h.id, event_type,
        success, status_code: status, response_body: body.slice(0, 2000),
        payload: { event_type, old_status, lead_id },
      });
    }));

    return json({ success: true, dispatched: targets.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});

function json(d: any, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}