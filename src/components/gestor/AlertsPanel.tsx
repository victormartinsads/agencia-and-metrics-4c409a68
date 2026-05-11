import { AlertTriangle, ShieldAlert, Wallet, TrendingDown, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccountStatus } from "@/hooks/useGestorAlerts";
import type { Campaign } from "@/data/mockMetaData";

interface Props {
  clientId: string;
  campaigns: Campaign[];
  currencySymbol: string;
}

export function AlertsPanel({ clientId, campaigns, currencySymbol }: Props) {
  const { data, isLoading, refetch, isRefetching } = useAccountStatus(clientId);

  const accountIssues = (data?.accounts || []).filter((a) => a.statusCode !== 1);
  const budgetAlerts = data?.budgetAlerts || [];
  const t = data?.thresholds;

  // CPA alerts (calculated locally a partir das campanhas)
  const cpaAlerts: Array<{ name: string; cpa: number; target: number; type: string }> = [];
  if (t) {
    for (const c of campaigns) {
      if (!c.conversions || c.costPerConversion <= 0) continue;
      const isLead = /lead|cadastro|inscri/i.test(c.objective || "") || /lead/i.test(c.name);
      const isPurchase = /purchase|sales|venda|conversion/i.test(c.objective || "") || /venda|compra/i.test(c.name);
      if (isLead && t.target_cpa_lead > 0 && c.costPerConversion > t.target_cpa_lead * t.cpa_alert_multiplier) {
        cpaAlerts.push({ name: c.name, cpa: c.costPerConversion, target: t.target_cpa_lead, type: "Lead" });
      }
      if (isPurchase && t.target_cpa_purchase > 0 && c.costPerConversion > t.target_cpa_purchase * t.cpa_alert_multiplier) {
        cpaAlerts.push({ name: c.name, cpa: c.costPerConversion, target: t.target_cpa_purchase, type: "Compra" });
      }
    }
  }

  const total = accountIssues.length + budgetAlerts.length + cpaAlerts.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`h-4 w-4 ${total > 0 ? "text-red-400" : "text-primary"}`} />
          <h2 className="text-sm font-semibold">Alertas</h2>
          <Badge variant={total > 0 ? "destructive" : "outline"} className="text-[10px]">{total}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Verificando contas e orçamentos...</p>
      ) : total === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum alerta. Tudo certo por aqui ✓</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AlertGroup
            icon={<ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
            title="Contas com problema"
            count={accountIssues.length}
            items={accountIssues.map((a) => `${a.name || a.id} — ${a.status}${a.error ? ` (${a.error})` : ""}`)}
          />
          <AlertGroup
            icon={<Wallet className="h-3.5 w-3.5 text-yellow-400" />}
            title={`Orçamento ≥ ${t?.budget_alert_threshold_pct || 90}%`}
            count={budgetAlerts.length}
            items={budgetAlerts.map((b) => `${b.campaignName} — ${b.pct}% (${currencySymbol} ${b.todaySpend.toFixed(2)} de ${currencySymbol} ${b.dailyBudget.toFixed(2)})`)}
          />
          <AlertGroup
            icon={<TrendingDown className="h-3.5 w-3.5 text-orange-400" />}
            title="CPA elevado"
            count={cpaAlerts.length}
            items={cpaAlerts.map((a) => `${a.type}: ${a.name} — ${currencySymbol} ${a.cpa.toFixed(2)} (alvo ${currencySymbol} ${a.target.toFixed(2)})`)}
            empty={!t || (t.target_cpa_lead === 0 && t.target_cpa_purchase === 0) ? "Configure CPAs alvo na ficha do cliente" : undefined}
          />
        </div>
      )}
    </Card>
  );
}

function AlertGroup({ icon, title, count, items, empty }: { icon: React.ReactNode; title: string; count: number; items: string[]; empty?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {icon}{title}
        </div>
        <Badge variant={count > 0 ? "destructive" : "outline"} className="text-[9px]">{count}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/60 italic">{empty || "Nada por aqui"}</p>
      ) : (
        <ul className="space-y-1 max-h-32 overflow-y-auto">
          {items.slice(0, 8).map((it, i) => (
            <li key={i} className="text-[11px] text-card-foreground flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}