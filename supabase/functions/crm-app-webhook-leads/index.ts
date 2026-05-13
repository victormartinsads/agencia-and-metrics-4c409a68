import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
    if (!token) return json({ error: "Token ausente" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tk } = await supabase
      .from("webhook_tokens")
      .select("organization_id, active, pipeline_id")
      .eq("token", token)
      .maybeSingle();
    if (!tk || !tk.active) return json({ error: "Token inválido" }, 401);

    const body = await req.json().catch(() => ({}));
    const KNOWN_FIELDS = new Set([
      "source","name","nome","email","phone","telefone","company","empresa",
      "message","mensagem","product","instagram","value",
      "utm_campaign","utm_medium","utm_term","utm_content","fclid","status"
    ]);
    const customFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!KNOWN_FIELDS.has(k) && v !== null && v !== undefined && typeof v !== "object") {
        customFields[k] = v;
      }
    }
    // Allow explicit nested object too
    if (body && typeof body.custom_fields === "object" && body.custom_fields) {
      Object.assign(customFields, body.custom_fields);
    }
    const payload: any = {
      organization_id: tk.organization_id,
      pipeline_id: tk.pipeline_id || null,
      status: 'new',
      source: body.source || 'webhook',
      name: body.name || body.nome || null,
      email: body.email || null,
      phone: body.phone || body.telefone || null,
      company: body.company || body.empresa || null,
      message: body.message || body.mensagem || null,
      product: body.product || null,
      instagram: body.instagram || null,
      value: body.value != null ? Number(body.value) : null,
      utm_campaign: body.utm_campaign || null,
      utm_medium: body.utm_medium || null,
      utm_term: body.utm_term || null,
      utm_content: body.utm_content || null,
      fclid: body.fclid || null,
      raw_data: body,
      custom_fields: customFields,
    };

    const { data: lead, error } = await supabase.from("leads").insert(payload).select().single();
    if (error) return json({ error: error.message }, 400);

    // Dispatch "new" event
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-app-dispatch-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, event_type: "new" }),
      });
    } catch { /* non-blocking */ }

    return json({ success: true, lead_id: lead.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});

function json(d: any, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}