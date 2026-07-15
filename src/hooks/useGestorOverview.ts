import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientOverview {
  clientId: string;
  loading?: boolean;
  error?: string;
  totalSpend: number;
  totalConversions: number;
  avgCTR: number;
  avgROAS: number;
  alerts: Array<{ severity: "high" | "medium" | "low"; message: string }>;
  accountIssues: number;
  budgetAlertsCount: number;
  highCpaCount: number;
}

interface ClientCfg {
  id: string;
  name?: string;
  target_cpa_lead?: number;
  target_cpa_purchase?: number;
  cpa_alert_multiplier?: number;
  budget_alert_threshold_pct?: number;
}

async function fetchOne(client: ClientCfg, period: string): Promise<ClientOverview> {
  try {
    const [metaRes, statusRes] = await Promise.all([
      supabase.functions.invoke("meta-ads", { body: { clientId: client.id, datePreset: period } }),
      supabase.functions.invoke("meta-account-status", { body: { clientId: client.id } }),
    ]);
    const m: any = metaRes.data || {};
    const s: any = statusRes.data || {};
    const ov = m.overviewMetrics || {};
    const camps: any[] = m.campaigns || [];

    const alerts: ClientOverview["alerts"] = [];

    // Account health issues (prioridade alta)
    const accounts: any[] = s.accounts || [];
    accounts.forEach((a: any) => {
      if (a.health?.level === "ok") return;
      if (a.error) {
        alerts.push({
          severity: "high",
          message: `${a.name || a.id}: ${a.health?.message || a.error}`,
        });
      } else if (a.health?.level === "critical") {
        alerts.push({
          severity: "high",
          message: `${a.name || a.id}: ${a.health.message}`,
        });
      } else if (a.health?.level === "warning") {
        alerts.push({
          severity: "medium",
          message: `${a.name || a.id}: ${a.health.message}`,
        });
      }
    });

    // Se todas as contas estiverem saudáveis mas houver saldo negativo
    accounts.forEach((a: any) => {
      if (a.health?.level === "ok" && a.balance < 0) {
        alerts.push({
          severity: "medium",
          message: `${a.name || a.id}: Saldo negativo ${a.currency} ${a.balance.toFixed(2)}`,
        });
      }
    });

    // Budget
    const budgetThreshold = client.budget_alert_threshold_pct ?? 90;
    const budgetAlerts = (s.budgetAlerts || []).filter((b: any) => b.pct >= budgetThreshold);
    budgetAlerts.slice(0, 3).forEach((b: any) => {
      alerts.push({
        severity: b.pct >= 100 ? "high" : "medium",
        message: `${b.campaignName} usou ${b.pct.toFixed(0)}% do budget`,
      });
    });

    // CPA elevado
    const mult = client.cpa_alert_multiplier ?? 1.5;
    const cpaLead = (client.target_cpa_lead ?? 0) * mult;
    const cpaPur = (client.target_cpa_purchase ?? 0) * mult;
    const highCpa = camps.filter((c: any) => {
      if (c.costPerConversion <= 0 || c.spend <= 10) return false;
      if (cpaPur > 0 && c.purchases > 0) return c.costPerConversion > cpaPur;
      if (cpaLead > 0 && c.conversions > 0) return c.costPerConversion > cpaLead;
      return false;
    });
    highCpa.slice(0, 3).forEach((c: any) => {
      alerts.push({
        severity: "medium",
        message: `${c.name} — CPA alto (${c.costPerConversion.toFixed(2)})`,
      });
    });

    // Dispatch alerts webhook in background sequentially to avoid race conditions and respect daily limits
    // Front-end dedup: only dispatch once per client per calendar day (UTC-3 / BRT)
    if (alerts.length > 0) {
      const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const dedupKey = `alert_sent:${client.id}:${todayKey}`;
      const alreadySentToday = localStorage.getItem(dedupKey);

      if (!alreadySentToday) {
        (async () => {
          for (const a of alerts) {
            let alertKey = "generic";
            if (a.message.includes("usou")) {
              alertKey = `budget_limit:${client.id}:${a.message.split(" ")[0]}`;
            } else if (a.message.includes("CPA alto")) {
              alertKey = `high_cpa:${client.id}:${a.message.split(" — ")[0]}`;
            } else if (a.message.includes("Saldo negativo")) {
              alertKey = `negative_balance:${client.id}`;
            } else {
              alertKey = `account_status:${client.id}`;
            }

            try {
              const { data } = await supabase.functions.invoke("whatsapp-alerts", {
                body: {
                  clientId: client.id,
                  clientName: client.name || "Cliente",
                  alertKey,
                  message: a.message,
                }
              });
              
              // If the alert was sent successfully, mark this client as notified today and stop
              if (data && data.status === "sent") {
                localStorage.setItem(dedupKey, "1");
                break;
              }
              // If skipped (already notified server-side), also mark locally to avoid future calls
              if (data && data.status === "skipped") {
                localStorage.setItem(dedupKey, "1");
                break;
              }
            } catch (err) {
              console.error("Error sending whatsapp alert:", err);
            }
          }
        })();
      }
    }

    return {
      clientId: client.id,
      totalSpend: ov.totalSpend || 0,
      totalConversions: ov.totalConversions || 0,
      avgCTR: ov.avgCTR || 0,
      avgROAS: ov.avgROAS || 0,
      alerts,
      accountIssues: accounts.filter((a: any) => a.health?.level !== "ok").length,
      budgetAlertsCount: budgetAlerts.length,
      highCpaCount: highCpa.length,
    };
  } catch (e: any) {
    return {
      clientId: client.id,
      error: e?.message || "Erro ao carregar",
      totalSpend: 0, totalConversions: 0, avgCTR: 0, avgROAS: 0,
      alerts: [], accountIssues: 0, budgetAlertsCount: 0, highCpaCount: 0,
    };
  }
}

export function useGestorOverview(clients: ClientCfg[] | undefined, period: string) {
  return useQuery({
    queryKey: ["gestor-overview", (clients || []).map((c) => c.id).join(","), period],
    queryFn: async () => {
      if (!clients?.length) return [] as ClientOverview[];
      // Concorrência limitada a 3 workers para não sobrecarregar a API do Meta
      const results: ClientOverview[] = [];
      const queue = [...clients];
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          const c = queue.shift()!;
          results.push(await fetchOne(c, period));
        }
      });
      await Promise.all(workers);
      return results;
    },
    enabled: !!clients?.length,
    staleTime: 10 * 60 * 1000, // 10 min — dados de overview não precisam ser tão frescos
    gcTime: 15 * 60 * 1000,    // 15 min — mantém em cache entre navegações
  });
}