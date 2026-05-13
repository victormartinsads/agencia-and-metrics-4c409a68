import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_LEAD = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "João da Silva (Teste)",
  email: "joao.teste@example.com",
  phone: "+55 11 99999-0000",
  company: "Empresa Teste LTDA",
  message: "Mensagem de teste enviada pelo CRM",
  source: "test",
  status: "qualified",
  value: 1500,
  product: "Produto Demo",
  instagram: "@joaoteste",
  utm_campaign: "teste-campanha",
  utm_medium: "webhook-test",
  utm_term: null,
  utm_content: null,
  fclid: null,
  notes: "Lead fictício para validar integração",
  custom_fields: { cidade: "São Paulo", origem_extra: "teste" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { lead_id, event_type, old_status, test, webhook_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === TEST MODE ===
    if (test && webhook_id) {
      const { data: hook } = await supabase
        .from("outbound_webhooks")
        .select("*")
        .eq("id", webhook_id)
        .maybeSingle();
      if (!hook) return json({ error: "Webhook não encontrado" }, 404);

      const payload = {
        event_type: event_type || "test",
        test: true,
        old_status: null,
        lead: SAMPLE_LEAD,
      };
      let success = false; let status = 0; let resBody = "";
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": hook.secret },
          body: JSON.stringify(payload),
        });
        status = res.status; resBody = await res.text(); success = res.ok;
      } catch (e) { resBody = String(e); }

      await supabase.from("outbound_events").insert({
        organization_id: hook.organization_id,
        webhook_id: hook.id,
        lead_id: null,
        event_type: "test",
        success, status_code: status,
        response_body: resBody.slice(0, 2000),
        payload,
      });

      return json({ success, status_code: status, response_body: resBody.slice(0, 1000) });
    }

    // === NORMAL DISPATCH ===
    if (!lead_id || !event_type) return json({ error: "lead_id e event_type obrigatórios" }, 400);

    const { data: lead } = await supabase.from("leads").select("*").eq("id", lead_id).maybeSingle();
    if (!lead) return json({ error: "Lead não encontrado" }, 404);

    const { data: hooks } = await supabase
      .from("outbound_webhooks")
      .select("*")
      .eq("organization_id", lead.organization_id)
      .eq("active", true);

    const leadPipelineId = lead.pipeline_id || null;
    const targets = (hooks || []).filter((h: any) => {
      if (!Array.isArray(h.events) || !h.events.includes(event_type)) return false;
      // Dispatch to webhooks matching the lead's pipeline. Org-level webhooks (pipeline_id null) only fire for leads without pipeline.
      const hookPipeline = h.pipeline_id || null;
      return hookPipeline === leadPipelineId;
    });

    await Promise.all(targets.map(async (h: any) => {
      let success = false; let status = 0; let resBody = "";
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": h.secret },
          body: JSON.stringify({ event_type, old_status, lead }),
        });
        status = res.status; resBody = await res.text(); success = res.ok;
      } catch (e) { resBody = String(e); }
      await supabase.from("outbound_events").insert({
        organization_id: lead.organization_id, lead_id, webhook_id: h.id, event_type,
        success, status_code: status, response_body: resBody.slice(0, 2000),
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
