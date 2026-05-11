import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = "https://graph.facebook.com/v21.0";

// Edge function que executa AÇÕES no Meta (precisa permissão ads_management no token).
// Suporta: pause / activate / set_daily_budget / set_lifetime_budget para campanhas, adsets e ads.

type Level = "campaign" | "adset" | "ad";
type Action =
  | "pause" | "activate"
  | "set_daily_budget" | "set_lifetime_budget"
  | "rename"
  | "set_bid_strategy" | "set_bid_amount"
  | "set_optimization_goal" | "set_billing_event"
  | "set_targeting" | "set_promoted_object"
  | "set_start_end" | "set_spend_cap"
  | "update_creative";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: apenas usuários autenticados (admin é validado no client por enquanto)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { clientId, level, objectId, action, value, payload } = await req.json() as {
      clientId: string; level: Level; objectId: string; action: Action;
      value?: number; payload?: Record<string, any>;
    };
    if (!clientId || !level || !objectId || !action) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: client } = await supabase.from("clients").select("meta_access_token").eq("id", clientId).single();
    if (!client?.meta_access_token) {
      return new Response(JSON.stringify({ error: "Token Meta não configurado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = client.meta_access_token;

    // Monta payload
    const body = new URLSearchParams();
    body.set("access_token", token);
    switch (action) {
      case "pause": body.set("status", "PAUSED"); break;
      case "activate": body.set("status", "ACTIVE"); break;
      case "set_daily_budget":
        if (!value || value <= 0) throw new Error("Valor de orçamento inválido");
        body.set("daily_budget", String(Math.round(value * 100)));
        break;
      case "set_lifetime_budget":
        if (!value || value <= 0) throw new Error("Valor de orçamento inválido");
        body.set("lifetime_budget", String(Math.round(value * 100)));
        break;
      case "rename":
        if (!payload?.name) throw new Error("Nome obrigatório");
        body.set("name", String(payload.name));
        break;
      case "set_bid_strategy":
        if (!payload?.bid_strategy) throw new Error("bid_strategy obrigatório");
        body.set("bid_strategy", String(payload.bid_strategy));
        if (payload.bid_amount != null) body.set("bid_amount", String(Math.round(Number(payload.bid_amount) * 100)));
        break;
      case "set_bid_amount":
        if (!value || value <= 0) throw new Error("bid_amount inválido");
        body.set("bid_amount", String(Math.round(value * 100)));
        break;
      case "set_optimization_goal":
        if (level !== "adset") throw new Error("optimization_goal só em adset");
        if (!payload?.optimization_goal) throw new Error("optimization_goal obrigatório");
        body.set("optimization_goal", String(payload.optimization_goal));
        break;
      case "set_billing_event":
        if (level !== "adset") throw new Error("billing_event só em adset");
        if (!payload?.billing_event) throw new Error("billing_event obrigatório");
        body.set("billing_event", String(payload.billing_event));
        break;
      case "set_targeting":
        if (level !== "adset") throw new Error("targeting só em adset");
        if (!payload?.targeting) throw new Error("targeting obrigatório");
        body.set("targeting", JSON.stringify(payload.targeting));
        break;
      case "set_promoted_object":
        if (level !== "adset") throw new Error("promoted_object só em adset");
        if (!payload?.promoted_object) throw new Error("promoted_object obrigatório");
        body.set("promoted_object", JSON.stringify(payload.promoted_object));
        break;
      case "set_start_end":
        if (payload?.start_time) body.set(level === "adset" ? "start_time" : "start_time", String(payload.start_time));
        if (payload?.end_time) body.set(level === "adset" ? "end_time" : "stop_time", String(payload.end_time));
        break;
      case "set_spend_cap":
        if (!value || value <= 0) throw new Error("spend_cap inválido");
        body.set("spend_cap", String(Math.round(value * 100)));
        break;
      case "update_creative":
        if (level !== "ad") throw new Error("update_creative só em ad");
        if (payload?.creative_id) body.set("creative", JSON.stringify({ creative_id: payload.creative_id }));
        else if (payload?.creative) body.set("creative", JSON.stringify(payload.creative));
        else throw new Error("creative_id ou creative obrigatório");
        break;
      default:
        throw new Error("Ação não suportada: " + action);
    }

    const url = `${GRAPH}/${objectId}`;
    const res = await fetch(url, { method: "POST", body });
    const json = await res.json();

    if (json.error) {
      const msg = json.error.message || "Erro Meta";
      // Erro típico de permissão insuficiente
      const needsScope = msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("ads_management");
      return new Response(JSON.stringify({
        error: msg,
        needsScope,
        hint: needsScope ? "O token Meta deste cliente não possui ads_management. Gere um novo System User Token incluindo ads_management e ads_read e atualize em Clientes." : undefined,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invalidar cache do meta-ads para refletir a mudança rápido
    await supabase.from("meta_ads_cache").delete().eq("client_id", clientId);

    return new Response(JSON.stringify({ success: true, response: json, level, action, objectId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-ads-action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});