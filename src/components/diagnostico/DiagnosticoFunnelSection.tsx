import { useMemo } from "react";
import { Campaign } from "@/data/mockMetaData";
import { FunnelGroup } from "@/lib/funnelGrouping";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
import { Layers, Target } from "lucide-react";
import { MetricsCustomizer } from "./MetricsCustomizer";
import {
  AVAILABLE_METRICS,
  formatCustomValue,
  useDiagnosticMetricsConfig,
} from "@/hooks/useDiagnosticMetricsConfig";

interface Props {
  group: FunnelGroup;
  clientId?: string;
  currencySymbol?: string;
}

function formatMoney(v: number, symbol: string) {
  return `${symbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function aggregate(campaigns: Campaign[]) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const reach = campaigns.reduce((s, c) => s + c.reach, 0);
  const purchaseValue = campaigns.reduce((s, c) => s + (c.purchaseValue || 0), 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0;
  return { spend, impressions, clicks, conversions, reach, ctr, cpc, cpm, cpa, roas };
}

function aggregateAdsets(campaigns: Campaign[]) {
  const map = new Map<string, { name: string; spend: number; impressions: number; clicks: number; conversions: number }>();
  for (const c of campaigns) {
    for (const cr of c.creatives) {
      const name = cr.adsetName || "—";
      const ex = map.get(name);
      if (ex) {
        ex.spend += cr.spend;
        ex.impressions += cr.impressions;
        ex.clicks += cr.clicks;
        ex.conversions += (cr.primaryResult ?? cr.conversions);
      } else {
        map.set(name, {
          name,
          spend: cr.spend,
          impressions: cr.impressions,
          clicks: cr.clicks,
          conversions: cr.primaryResult ?? cr.conversions,
        });
      }
    }
  }
  return Array.from(map.values())
    .map(a => ({
      ...a,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export function DiagnosticoFunnelSection({ group, clientId, currencySymbol = "R$" }: Props) {
  const totals = useMemo(() => aggregate(group.campaigns), [group.campaigns]);
  const adsets = useMemo(() => aggregateAdsets(group.campaigns), [group.campaigns]);
  const resultLabel =
    group.campaigns.find(c => c.primaryResultLabel)?.primaryResultLabel || "Resultados";

  const { config } = useDiagnosticMetricsConfig(
    clientId || "",
    "current",
    group.key,
  );

  const renderMetricValue = (key: string): string => {
    switch (key) {
      case "spend": return formatMoney(totals.spend, currencySymbol);
      case "conversions": return totals.conversions.toLocaleString("pt-BR");
      case "cpa": return totals.cpa > 0 ? formatMoney(totals.cpa, currencySymbol) : "—";
      case "ctr": return `${totals.ctr.toFixed(2)}%`;
      case "cpc": return totals.cpc > 0 ? formatMoney(totals.cpc, currencySymbol) : "—";
      case "cpm": return formatMoney(totals.cpm, currencySymbol);
      case "reach": return totals.reach.toLocaleString("pt-BR");
      case "impressions": return totals.impressions.toLocaleString("pt-BR");
      case "clicks": return totals.clicks.toLocaleString("pt-BR");
      case "roas": return totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : "—";
      default: return "—";
    }
  };

  const getMetricLabel = (key: string): string => {
    if (key === "conversions") return resultLabel;
    return AVAILABLE_METRICS.find(m => m.key === key)?.label || key;
  };

  const isHighlight = (key: string) => key === "spend" || key === "conversions";

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            {group.isFunnel ? (
              <Layers className="h-5 w-5 text-primary" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            <h3 className="text-xl font-bold text-card-foreground">
              {group.isFunnel ? `Funil: ${group.key}` : group.key}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {group.isFunnel
              ? `${group.campaigns.length} campanha(s) agrupadas • dados consolidados`
              : "Campanha individual"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-1 rounded-full">
            Métrica primária: {resultLabel}
          </span>
          {clientId && (
            <MetricsCustomizer clientId={clientId} datePreset="current" groupKey={group.key} />
          )}
        </div>
      </header>

      {/* KPIs consolidados — personalizáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {config.visible_metrics.map(key => (
          <Kpi
            key={key}
            label={getMetricLabel(key)}
            value={renderMetricValue(key)}
            highlight={isHighlight(key)}
          />
        ))}
        {config.custom_metrics.map(m => (
          <Kpi
            key={m.id}
            label={m.label}
            value={formatCustomValue(m, currencySymbol)}
            custom
          />
        ))}
      </div>

      {/* Quando é funil agrupando várias campanhas, lista as campanhas */}
      {group.isFunnel && group.campaigns.length > 1 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-card-foreground">
            Campanhas deste funil
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Campanha</th>
                  <th className="text-right px-3 py-2 font-medium">Invest.</th>
                  <th className="text-right px-3 py-2 font-medium">{resultLabel}</th>
                  <th className="text-right px-3 py-2 font-medium">CPA</th>
                  <th className="text-right px-3 py-2 font-medium">CTR</th>
                  <th className="text-right px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.campaigns
                  .slice()
                  .sort((a, b) => b.spend - a.spend)
                  .map(c => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-3 py-2 text-card-foreground truncate max-w-[280px]" title={c.name}>{c.name}</td>
                      <td className="px-3 py-2 text-right text-card-foreground">{formatMoney(c.spend, currencySymbol)}</td>
                      <td className="px-3 py-2 text-right text-card-foreground font-semibold">{c.conversions}</td>
                      <td className="px-3 py-2 text-right text-card-foreground">
                        {c.conversions > 0 ? formatMoney(c.spend / c.conversions, currencySymbol) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-card-foreground">{c.ctr.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          c.status === "active" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conjuntos (adsets) consolidados */}
      {adsets.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-card-foreground">
            Conjuntos de anúncios ({adsets.length})
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Conjunto</th>
                  <th className="text-right px-3 py-2 font-medium">Invest.</th>
                  <th className="text-right px-3 py-2 font-medium">{resultLabel}</th>
                  <th className="text-right px-3 py-2 font-medium">CPA</th>
                  <th className="text-right px-3 py-2 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {adsets.slice(0, 10).map(a => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="px-3 py-2 text-card-foreground truncate max-w-[280px]" title={a.name}>{a.name}</td>
                    <td className="px-3 py-2 text-right text-card-foreground">{formatMoney(a.spend, currencySymbol)}</td>
                    <td className="px-3 py-2 text-right text-card-foreground font-semibold">{a.conversions}</td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {a.conversions > 0 ? formatMoney(a.cpa, currencySymbol) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">{a.ctr.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pódio de criativos: agregado quando funil, individual quando campanha solta */}
      <div>
        {group.isFunnel ? (
          <AggregatedCreativeGrid
            campaigns={group.campaigns}
            funnelLabel={group.key}
            clientId={clientId}
            currencySymbol={currencySymbol}
          />
        ) : (
          <CreativeGrid campaign={group.campaigns[0]} clientId={clientId} currencySymbol={currencySymbol} />
        )}
      </div>
    </section>
  );
}

function Kpi({ label, value, highlight, custom }: { label: string; value: string; highlight?: boolean; custom?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      custom
        ? "border-amber-500/30 bg-amber-500/5"
        : highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-muted/20"
    }`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {custom && <span className="text-amber-500">✦</span>}
        {label}
      </div>
      <div className={`mt-1 text-base font-bold ${
        custom ? "text-amber-500" : highlight ? "text-primary" : "text-card-foreground"
      }`}>{value}</div>
    </div>
  );
}
