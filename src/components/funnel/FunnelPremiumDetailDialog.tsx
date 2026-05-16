import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelCard } from "@/components/dashboard/overview/premium/PanelCard";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { aggregateCampaignMetrics } from "@/lib/metaMetrics";
import { formatCurrency } from "@/lib/format";
import { FunnelCard } from "@/components/funnel/FunnelCard";
import { EditableOverviewFunnel } from "@/components/dashboard/overview/EditableOverviewFunnel";
import { BestAdsList } from "@/components/dashboard/overview/BestAdsList";
import { KpiCardPremium } from "@/components/dashboard/overview/premium/KpiCardPremium";
import { DollarSign, TrendingUp, Target, ShoppingCart, Users } from "lucide-react";
import { useFunnelLabels } from "@/hooks/useFunnelLabels";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol?: string;
  datePreset: string;
  readOnly?: boolean;
}

interface AdSetRow {
  name: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  adsCount: number;
}

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString("pt-BR");
}

function aggregateAdSets(campaigns: Campaign[]): AdSetRow[] {
  const map = new Map<string, AdSetRow>();
  for (const c of campaigns) {
    for (const cr of c.creatives || []) {
      const name = cr.adsetName || "Sem conjunto";
      const key = `${c.id}|${name}`;
      const result = cr.primaryResult ?? cr.conversions ?? 0;
      const cur = map.get(key) || {
        name,
        campaignName: c.name,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpa: 0,
        adsCount: 0,
      };
      cur.spend += cr.spend;
      cur.impressions += cr.impressions;
      cur.clicks += cr.clicks;
      cur.conversions += result;
      cur.adsCount += 1;
      map.set(key, cur);
    }
  }
  return Array.from(map.values())
    .map((s) => ({
      ...s,
      ctr: s.impressions > 0 ? Number(((s.clicks / s.impressions) * 100).toFixed(2)) : 0,
      cpa: s.conversions > 0 ? Number((s.spend / s.conversions).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 8);
}

export function FunnelPremiumDetailDialog({
  open,
  onClose,
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol = "R$",
  datePreset,
  readOnly = false,
}: Props) {
  const { data: labelMap } = useFunnelLabels(clientId);
  const displayLabel = (labelMap?.[funnelCode] || funnelLabel || funnelCode).replace(/^F\d+\s*[\-—]\s*/, "");

  const totals = useMemo(() => aggregateCampaignMetrics(campaigns), [campaigns]);
  const analysis = useFunnelAnalysis(campaigns);
  const adSets = useMemo(() => aggregateAdSets(campaigns), [campaigns]);

  const metaTotals = useMemo(() => {
    const sum = (k: keyof Campaign) =>
      campaigns.reduce((s, c) => s + Number((c as any)[k] || 0), 0);
    return {
      impressions: sum("impressions"),
      reach: sum("reach"),
      clicks: sum("clicks"),
      landing_page_views: sum("landingPageViews" as any),
      add_to_cart: sum("addToCart" as any),
      initiate_checkout: sum("initiateCheckout" as any),
      purchases: sum("purchases" as any),
      conversions: sum("conversions" as any),
      leads: sum("conversions" as any),
      sales: sum("purchases" as any),
      revenue: sum("purchaseValue" as any),
    } as Record<string, number>;
  }, [campaigns]);

  const allCreatives = useMemo(() => campaigns, [campaigns]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-none w-screen h-screen sm:rounded-none p-0 gap-0 border-0 bg-background overflow-hidden"
      >
        <DialogHeader className="px-8 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-primary/40 text-primary">
              {funnelCode}
            </span>
            <span style={{ fontFamily: "'Syne', system-ui, sans-serif" }} className="uppercase tracking-[0.06em]">
              {displayLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-8 py-6 h-[calc(100vh-72px)]">
          {/* KPI Strip — mesmo padrão do print */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCardPremium label="Investimento" value={formatCurrency(totals.spend, currencySymbol)} sub="vs. período anterior" icon={<DollarSign className="h-3 w-3" />} />
            <KpiCardPremium label="Faturamento" value={formatCurrency(totals.purchaseValue, currencySymbol)} sub="vs. período anterior" emphasis icon={<TrendingUp className="h-3 w-3" />} />
            <KpiCardPremium label="ROAS" value={`${(totals.roas || 0).toFixed(2)}x`} sub="Meta: 3.5x" icon={<Target className="h-3 w-3" />} />
            <KpiCardPremium label="Vendas" value={compact(totals.purchases || 0)} sub={(totals.purchases || 0) > 0 ? `CPV ${formatCurrency(totals.spend / (totals.purchases || 1), currencySymbol)}` : "—"} icon={<ShoppingCart className="h-3 w-3" />} />
            <KpiCardPremium label="Leads" value={compact(totals.conversions || 0)} icon={<Users className="h-3 w-3" />} />
          </div>

          {/* Métricas editáveis (todas) */}
          <PanelCard title="Métricas do funil" subtitle="Clique no ⚙️ para escolher o que exibir">
            <FunnelCard
              clientId={clientId}
              funnelCode={funnelCode}
              funnelLabel={displayLabel}
              campaigns={campaigns}
              currencySymbol={currencySymbol}
              datePreset={datePreset}
              readOnly={readOnly}
            />
          </PanelCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funil de conversão editável */}
            <PanelCard title="Funil de conversão" subtitle="Editar etapas e métricas">
              <EditableOverviewFunnel
                clientId={clientId}
                campaignId={funnelCode}
                metrics={{ current: metaTotals, previous: {} }}
                extraMetricLabels={[
                  { key: "leads", label: "Leads" },
                  { key: "sales", label: "Vendas" },
                  { key: "revenue", label: "Faturamento" },
                ]}
              />
            </PanelCard>

            {/* Top conjuntos de anúncio */}
            <PanelCard title="Top conjuntos de anúncio">
              {adSets.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sem dados de conjuntos.</p>
              ) : (
                <div className="space-y-1.5">
                  {adSets.map((s, i) => (
                    <div
                      key={`${s.name}-${i}`}
                      className="flex items-center gap-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors p-2"
                    >
                      <span className="text-[10px] font-bold w-5 text-center text-primary">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate" title={s.name}>{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.adsCount} anúncio{s.adsCount > 1 ? "s" : ""} • CTR {s.ctr}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold tabular-nums">{s.conversions.toLocaleString("pt-BR")}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {formatCurrency(s.spend, currencySymbol)} • CPA {formatCurrency(s.cpa, currencySymbol)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>

          {/* Criativos ativos */}
          <PanelCard title="Criativos ativos" subtitle="Anúncios em performance">
            <BestAdsList
              campaigns={allCreatives}
              limit={10}
              metrics={["primaryResult", "clicks", "ctr", "spend"]}
              currencySymbol={currencySymbol}
            />
          </PanelCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}