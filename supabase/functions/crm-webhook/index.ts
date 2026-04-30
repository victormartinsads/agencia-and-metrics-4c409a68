import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * POST /crm-webhook?token=XXXX
 * body: { name, email?, phone?, source?, value?, tags?, notes?, stage?, custom_fields? }
 */
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

    const { data: cfg } = await supabase
      .from("crm_webhook_config")
      .select("client_id, default_stage_id")
      .eq("webhook_token", token)
      .maybeSingle();
    if (!cfg) return json({ error: "Token inválido" }, 401);

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || body.nome || "").trim();
    if (!name) return json({ error: "Campo 'name' obrigatório" }, 400);

    let stage_id = cfg.default_stage_id;
    if (!stage_id) {
      const { data: s } = await supabase
        .from("crm_pipeline_stages")
        .select("id")
        .eq("client_id", cfg.client_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      stage_id = s?.id || null;
    }

    const { data: lead, error } = await supabase
      .from("crm_leads")
      .insert({
        client_id: cfg.client_id,
        stage_id,
        name,
        email: body.email || null,
        phone: body.phone || body.telefone || null,
        source: body.source || "webhook",
        value: Number(body.value || 0),
        notes: body.notes || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        custom_fields: body.custom_fields || {},
      })
      .select()
      .single();
    if (error) return json({ error: error.message }, 400);
    return json({ success: true, lead_id: lead.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});

function json(d: any, status = 200) {
  return new Response(JSON.stringify(d), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}