import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { getUserClaims, canAccessClient, unauthorized, forbidden } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = "https://graph.facebook.com/v21.0";

const STATUS_MAP: Record<number, string> = {
  1: "ACTIVE",
  2: "DISABLED",
  3: "UNSETTLED",
  7: "PENDING_RISK_REVIEW",
  8: "PENDING_SETTLEMENT",
  9: "IN_GRACE_PERIOD",
  100: "PENDING_CLOSURE",
  101: "CLOSED",
  201: "ANY_ACTIVE",
  202: "ANY_CLOSED",
};

const DISABLE_REASON_MAP: Record<number, string> = {
  0: "Nenhum",
  1: "Violação de política de anúncios",
  2: "Revisão de IP em andamento",
  3: "Problema de pagamento (cartão recusado / saldo pendente)",
  4: "Conta encerrada",
  5: "Encerramento AFC",
  6: "Reavaliação de integridade",
  7: "Encerrada permanentemente",
  8: "Conta revendedor inativa",
  9: "Conta inativa",
  10: "BM não utilizado",
  11: "Verificação de negócio pendente",
  16: "Verificação solicitada",
  20: "Saldo excedido (massive balance)",
};

function getHealthMessage(statusCode: number, disableReason?: number) {
  if (statusCode === 1) return { level: "ok" as const, message: "Conta ativa" };
  if (disableReason && DISABLE_REASON_MAP[disableReason]) {
    return { level: "critical" as const, message: DISABLE_REASON_MAP[disableReason] };
  }
  if (statusCode === 2) return { level: "critical" as const, message: "Conta desabilitada" };
  if (statusCode === 3) return { level: "critical" as const, message: "Conta com saldo pendente (UNSETTLED)" };
  if (statusCode === 7) return { level: "warning" as const, message: "Revisão de risco pendente" };
  if (statusCode === 8) return { level: "warning" as const, message: "Acordo de pagamento pendente" };
  if (statusCode === 9) return { level: "warning" as const, message: "Período de carência" };
  if (statusCode === 100) return { level: "critical" as const, message: "Fechamento da conta pendente" };
  if (statusCode === 101) return { level: "critical" as const, message: "Conta fechada" };
  return { level: "warning" as const, message: `Status desconhecido (${statusCode})` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await getUserClaims(req);
    if (!claims) return unauthorized(corsHeaders);
    if (!(await canAccessClient(claims.sub, clientId))) return forbidden(corsHeaders);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: client } = await supabase
      .from("clients")
      .select("meta_access_token, ad_account_ids, currency_symbol, target_cpa_lead, target_cpa_purchase, cpa_alert_multiplier, budget_alert_threshold_pct")
      .eq("id", clientId)
      .single();

    if (!client?.meta_access_token) {
      return new Response(JSON.stringify({ error: "Token Meta não configurado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = client.meta_access_token;
    const accountIds: string[] = (client.ad_account_ids || []).filter(Boolean);
    if (accountIds.length === 0) {
      return new Response(JSON.stringify({ accounts: [], budgetAlerts: [], thresholds: client }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Status de cada conta
    const accounts = await Promise.all(accountIds.map(async (id) => {
      const acctId = id.startsWith("act_") ? id : `act_${id}`;
      try {
        const r = await fetch(`${GRAPH}/${acctId}?fields=name,account_status,disable_reason,balance,amount_spent,spend_cap,currency,timezone_name&access_token=${token}`);
        const j = await r.json();
        if (j.error) {
          return {
            id: acctId,
            error: j.error.message,
            status: "ERROR",
            statusCode: 0,
            health: { level: "critical" as const, message: `Erro ao consultar conta: ${j.error.message}` },
          };
        }
        const health = getHealthMessage(j.account_status, j.disable_reason);
        return {
          id: acctId,
          name: j.name || acctId,
          statusCode: j.account_status,
          status: STATUS_MAP[j.account_status] || `UNKNOWN(${j.account_status})`,
          disableReason: j.disable_reason,
          disableReasonLabel: DISABLE_REASON_MAP[j.disable_reason] || null,
          balance: Number(j.balance || 0) / 100,
          amountSpent: Number(j.amount_spent || 0) / 100,
          spendCap: j.spend_cap ? Number(j.spend_cap) / 100 : null,
          currency: j.currency,
          health,
        };
      } catch (e) {
        return {
          id: acctId,
          error: String(e),
          status: "ERROR",
          statusCode: 0,
          health: { level: "critical" as const, message: `Erro na consulta: ${String(e)}` },
        };
      }
    }));

    // 2. Orçamento das campanhas ativas + gasto do dia (today)
    const budgetAlerts: any[] = [];
    for (const acct of accounts) {
      if (acct.statusCode !== 1) continue;
      try {
        const campRes = await fetch(`${GRAPH}/${acct.id}/campaigns?fields=name,status,daily_budget,lifetime_budget,insights.date_preset(today){spend}&effective_status=["ACTIVE"]&limit=50&access_token=${token}`);
        const campJ = await campRes.json();
        if (campJ.error || !Array.isArray(campJ.data)) continue;
        for (const c of campJ.data) {
          const dailyBudget = c.daily_budget ? Number(c.daily_budget) / 100 : 0;
          const todaySpend = Number(c.insights?.data?.[0]?.spend || 0);
          if (dailyBudget > 0 && todaySpend > 0) {
            const pct = (todaySpend / dailyBudget) * 100;
            const threshold = Number(client.budget_alert_threshold_pct || 90);
            if (pct >= threshold) {
              budgetAlerts.push({
                accountId: acct.id,
                accountName: acct.name,
                campaignId: c.id,
                campaignName: c.name,
                dailyBudget,
                todaySpend,
                pct: Math.round(pct),
              });
            }
          }
        }
      } catch (_) { /* ignore */ }
    }

    return new Response(JSON.stringify({
      accounts,
      budgetAlerts,
      thresholds: {
        target_cpa_lead: Number(client.target_cpa_lead || 0),
        target_cpa_purchase: Number(client.target_cpa_purchase || 0),
        cpa_alert_multiplier: Number(client.cpa_alert_multiplier || 1.5),
        budget_alert_threshold_pct: Number(client.budget_alert_threshold_pct || 90),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-account-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});