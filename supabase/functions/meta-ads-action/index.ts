import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

const GRAPH = "https://graph.facebook.com/v21.0";

// Edge function que executa AÇÕES no Meta (precisa permissão ads_management no token).
// Suporta: pause / activate / set_daily_budget / set_lifetime_budget para campanhas, adsets e ads.

type Level = "campaign" | "adset" | "ad";
type Action = "pause" | "activate" | "set_daily_budget" | "set_lifetime_budget";

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
    const { clientId, level, objectId, action, value } = await req.json() as {
      clientId: string; level: Level; objectId: string; action: Action; value?: number;
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
    if (action === "pause") body.set("status", "PAUSED");
    if (action === "activate") body.set("status", "ACTIVE");
    if (action === "set_daily_budget") {
      if (!value || value <= 0) throw new Error("Valor de orçamento inválido");
      // Meta espera centavos
      body.set("daily_budget", String(Math.round(value * 100)));
    }
    if (action === "set_lifetime_budget") {
      if (!value || value <= 0) throw new Error("Valor de orçamento inválido");
      body.set("lifetime_budget", String(Math.round(value * 100)));
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