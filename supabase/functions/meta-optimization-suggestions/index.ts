import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, hasAdminOrEditor, unauthorized, forbidden } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gera sugestões determinísticas + uma camada opcional de IA.
// Não executa nenhuma ação na Meta — só persiste em optimization_suggestions com status=pending.

type Suggestion = {
  client_id: string;
  level: string;
  object_id: string;
  object_name: string;
  action: string;
  suggested_value?: number | null;
  reason: string;
  severity: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, datePreset = "last_7d" } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await hasAdminOrEditor(claims.sub))) return forbidden(corsHeaders, "Admin or editor role required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: client } = await supabase
      .from("clients")
      .select("target_cpa_lead, target_cpa_purchase, cpa_alert_multiplier")
      .eq("id", clientId)
      .single();

    // Reusa o cache de meta-ads (já roda lá com 2h de TTL)
    const metaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-ads`;
    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ clientId, datePreset }),
    });
    const meta = await metaRes.json();
    if (meta.error) throw new Error(meta.error);

    const campaigns: any[] = meta.campaigns || [];
    const targetLead = Number(client?.target_cpa_lead || 0);
    const targetPurchase = Number(client?.target_cpa_purchase || 0);
    const multiplier = Number(client?.cpa_alert_multiplier || 1.5);

    const suggestions: Suggestion[] = [];

    for (const c of campaigns) {
      // Heurística 1: Fadiga (frequência alta)
      if (c.frequency > 3.5 && c.spend > 50) {
        suggestions.push({
          client_id: clientId,
          level: "campaign",
          object_id: c.id,
          object_name: c.name,
          action: "refresh_creative",
          reason: `Frequência ${c.frequency.toFixed(2)}x indica saturação. Considere renovar criativos.`,
          severity: c.frequency > 5 ? "high" : "medium",
          metadata: { frequency: c.frequency, spend: c.spend },
        });
      }

      // Heurística 2: ROAS baixo com gasto relevante
      if (c.roas > 0 && c.roas < 1 && c.spend > 100) {
        suggestions.push({
          client_id: clientId,
          level: "campaign",
          object_id: c.id,
          object_name: c.name,
          action: "pause",
          reason: `ROAS ${c.roas.toFixed(2)}x abaixo de 1.0 com R$ ${c.spend.toFixed(2)} gastos. Sugestão: pausar.`,
          severity: "high",
          metadata: { roas: c.roas, spend: c.spend },
        });
      }

      // Heurística 3: CPA elevado para leads
      const isLeadCampaign = /lead|cadastro|inscri/i.test(c.objective || "") || /lead/i.test(c.name || "");
      const isPurchaseCampaign = /purchase|sales|venda|conversion/i.test(c.objective || "") || /venda|compra/i.test(c.name || "");

      if (isLeadCampaign && targetLead > 0 && c.costPerConversion > targetLead * multiplier && c.conversions > 0) {
        suggestions.push({
          client_id: clientId,
          level: "campaign",
          object_id: c.id,
          object_name: c.name,
          action: "review",
          reason: `CPA de R$ ${c.costPerConversion.toFixed(2)} está ${(c.costPerConversion / targetLead).toFixed(1)}x acima do alvo (R$ ${targetLead}).`,
          severity: "high",
          metadata: { cpa: c.costPerConversion, target: targetLead },
        });
      }

      if (isPurchaseCampaign && targetPurchase > 0 && c.costPerConversion > targetPurchase * multiplier && c.conversions > 0) {
        suggestions.push({
          client_id: clientId,
          level: "campaign",
          object_id: c.id,
          object_name: c.name,
          action: "review",
          reason: `CPA de compra de R$ ${c.costPerConversion.toFixed(2)} está ${(c.costPerConversion / targetPurchase).toFixed(1)}x acima do alvo (R$ ${targetPurchase}).`,
          severity: "high",
          metadata: { cpa: c.costPerConversion, target: targetPurchase },
        });
      }

      // Heurística 4: Top performer — sugere escalar
      if (c.roas > 3 && c.spend > 100) {
        suggestions.push({
          client_id: clientId,
          level: "campaign",
          object_id: c.id,
          object_name: c.name,
          action: "increase_budget",
          suggested_value: 20,
          reason: `ROAS ${c.roas.toFixed(2)}x excelente. Sugestão: aumentar orçamento em 20%.`,
          severity: "low",
          metadata: { roas: c.roas, spend: c.spend },
        });
      }
    }

    // Limpa sugestões pendentes anteriores (não aprovadas/aplicadas) deste cliente para não duplicar
    await supabase
      .from("optimization_suggestions")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "pending");

    if (suggestions.length > 0) {
      const { error: insErr } = await supabase
        .from("optimization_suggestions")
        .insert(suggestions);
      if (insErr) console.error("insert error", insErr);
    }

    return new Response(JSON.stringify({ count: suggestions.length, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-optimization-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});