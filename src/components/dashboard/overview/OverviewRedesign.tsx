import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, AlertCircle, Wrench, Sparkles, Database } from "lucide-react";
// react-grid-layout default export is the basic grid; named exports are inconsistent across builds.
// Use require-style namespace import to grab Responsive + WidthProvider safely.
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";

import { SectionCard } from "./SectionCard";
import { ProgressMetric } from "./ProgressMetric";
import { MiniMetric } from "./MiniMetric";
import { RevenueSalesChart } from "./RevenueSalesChart";
import { EditableOverviewFunnel } from "./EditableOverviewFunnel";
import { ProductSalesChart } from "./ProductSalesChart";
import { LowTicketChart } from "./LowTicketChart";
import { LeadsChart } from "./LeadsChart";
import { BestAdsList, AD_METRIC_OPTIONS } from "./BestAdsList";
import { UtmTrafficTable } from "./UtmTrafficTable";
import { SheetUtmTable, SheetUtmRow } from "./SheetUtmTable";
import { LayoutToolbar } from "./LayoutToolbar";
import { BlockSettingsDialog, MetricOption } from "./BlockSettingsDialog";
import { MetricSourceEditor } from "./MetricSourceEditor";
import { TemplatePicker } from "./TemplatePicker";
import { Button } from "@/components/ui/button";

import { useWeeklyMetrics, useDashboardSheet } from "@/hooks/useDashboardSheet";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { getPeriodPair, pctDelta } from "@/lib/period";
import { formatCurrency } from "@/lib/format";
import { useOverviewLayout, OverviewBlockId, BlockConfig } from "@/hooks/useOverviewLayout";
import { useMetricSources, resolveMetricValue } from "@/hooks/useMetricSources";
import { useSalesEvents, aggregateSales } from "@/hooks/useSalesEvents";
import { useOverviewTemplate, applyTemplateToLayout, TemplateKey } from "@/hooks/useOverviewTemplate";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  clientId?: string;
  datePreset: string;
  metaData: MetaAdsData | undefined;
  currencySymbol: string;
}

function inRange(dateStr: string, start: Date, end: Date) {
  // Compare by YYYY-MM-DD in local time to avoid UTC/timezone shifts
  // (reference_date is a date-only string from Postgres).
  const d = String(dateStr).slice(0, 10);
  const toKey = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const sk = toKey(start);
  const ek = toKey(end);
  return d >= sk && d <= ek;
}

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function PlaceholderBox({ label = "Mais detalhes" }: { label?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-dashed border-border h-20 flex items-center justify-center gap-1.5 text-xs text-primary/80">
      <Wrench className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </div>
  );
}

const COST_METRIC_OPTIONS: MetricOption[] = [
  { key: "cps", label: "Custo Por Venda" },
  { key: "cpl", label: "Custo Por Lead" },
  { key: "cpc", label: "Custo Por Clique" },
  { key: "cpm", label: "CPM" },
];

const MQL_METRIC_OPTIONS: MetricOption[] = [
  { key: "mql", label: "MQL" },
  { key: "smql", label: "sMQL" },
  { key: "qualified_messages", label: "Mensagens Qualif." },
  { key: "qualified_followers", label: "Seguidores Qualif." },
];








export function OverviewRedesign({ clientId, datePreset, metaData, currencySymbol }: Props) {
  const { data: sheetsConfig } = useDashboardSheet(clientId);
  const { data: weekly } = useWeeklyMetrics(clientId, 365);
  const { data: ga } = useGoogleAnalytics(clientId, datePreset, !!clientId);
  const { data: metricSources } = useMetricSources(clientId);

  const { layout, moveBlock, toggleVisibility, updateBlock, updatePositions, reset, replaceLayout } = useOverviewLayout(clientId);
  const { templateKey, setTemplateKey } = useOverviewTemplate(clientId);
  const [editMode, setEditMode] = useState(false);
  const [settingsBlock, setSettingsBlock] = useState<BlockConfig | null>(null);
  const [sourceEditorOpen, setSourceEditorOpen] = useState(false);
  const [focusMetric, setFocusMetric] = useState<string | undefined>(undefined);

  const periods = useMemo(() => getPeriodPair(datePreset), [datePreset]);

  const salesRange = useMemo(
    () => ({ from: periods.current.start, to: periods.current.end }),
    [periods],
  );
  const salesPrevRange = useMemo(
    () => ({ from: periods.previous.start, to: periods.previous.end }),
    [periods],
  );
  const { data: salesEvents } = useSalesEvents(clientId, salesRange);
  const { data: salesEventsPrev } = useSalesEvents(clientId, salesPrevRange);
  const salesAgg = useMemo(() => aggregateSales(salesEvents), [salesEvents]);
  const salesAggPrev = useMemo(() => aggregateSales(salesEventsPrev), [salesEventsPrev]);

  const inCurr = useMemo(
    () => (weekly || []).filter((m) => inRange(m.reference_date, periods.current.start, periods.current.end)),
    [weekly, periods],
  );
  const inPrev = useMemo(
    () => (weekly || []).filter((m) => inRange(m.reference_date, periods.previous.start, periods.previous.end)),
    [weekly, periods],
  );

  const sumKey = (rows: typeof inCurr, key: keyof (typeof inCurr)[number]) =>
    rows.reduce((acc, r) => acc + Number((r as any)[key] || 0), 0);

  // Totais brutos por fonte
  const sheetsCurr = {
    revenue: sumKey(inCurr, "revenue"),
    sales: sumKey(inCurr, "sales"),
    mql: sumKey(inCurr, "mql"),
    smql: sumKey(inCurr, "smql"),
    leads: sumKey(inCurr, "leads"),
    investment: sumKey(inCurr, "investment"),
    low_ticket_meta: sumKey(inCurr, "low_ticket_meta"),
    low_ticket_google: sumKey(inCurr, "low_ticket_google"),
    qualified_messages: sumKey(inCurr, "qualified_messages"),
    qualified_followers: sumKey(inCurr, "qualified_followers"),
  };
  const prev = {
    revenue: sumKey(inPrev, "revenue"),
    sales: sumKey(inPrev, "sales"),
    mql: sumKey(inPrev, "mql"),
    smql: sumKey(inPrev, "smql"),
    leads: sumKey(inPrev, "leads"),
    investment: sumKey(inPrev, "investment"),
    low_ticket_meta: sumKey(inPrev, "low_ticket_meta"),
    low_ticket_google: sumKey(inPrev, "low_ticket_google"),
    qualified_messages: sumKey(inPrev, "qualified_messages"),
    qualified_followers: sumKey(inPrev, "qualified_followers"),
  };

  const metaTotals: Record<string, number> = {
    spend: metaData?.overviewMetrics?.totalSpend || 0,
    impressions: metaData?.overviewMetrics?.totalImpressions || 0,
    clicks: metaData?.overviewMetrics?.totalClicks || 0,
    // "lead_actions" sums the action types configured per client (clients.lead_action_types).
    // Fallback to totalConversions (primary action priority) when not yet present in payload.
    lead_actions:
      (metaData?.overviewMetrics as any)?.totalLeadActions ??
      (metaData?.overviewMetrics as any)?.totalConversions ?? 0,
    purchases: (metaData?.overviewMetrics as any)?.totalPurchases || 0,
    initiate_checkout: (metaData?.overviewMetrics as any)?.totalInitiateCheckout || 0,
    add_to_cart: (metaData?.overviewMetrics as any)?.totalAddToCart || 0,
    landing_page_views: (metaData?.overviewMetrics as any)?.totalLandingPageViews || 0,
    reach: (metaData?.overviewMetrics as any)?.totalReach || 0,
    link_clicks: (metaData?.overviewMetrics as any)?.link_clicks || 0,
    post_engagement: (metaData?.overviewMetrics as any)?.post_engagement || 0,
    page_engagement: (metaData?.overviewMetrics as any)?.page_engagement || 0,
    video_view: (metaData?.overviewMetrics as any)?.video_view || 0,
    messaging_started: (metaData?.overviewMetrics as any)?.messaging_started || 0,
    complete_registration: (metaData?.overviewMetrics as any)?.complete_registration || 0,
    subscribe: (metaData?.overviewMetrics as any)?.subscribe || 0,
    schedule: (metaData?.overviewMetrics as any)?.schedule || 0,
    contact: (metaData?.overviewMetrics as any)?.contact || 0,
    submit_application: (metaData?.overviewMetrics as any)?.submit_application || 0,
    view_content: (metaData?.overviewMetrics as any)?.view_content || 0,
  };

  const webhookTotals: Record<string, number> = {
    revenue: salesAgg.revenue,
    sales: salesAgg.sales,
    avg_ticket: salesAgg.avgTicket,
  };
  const webhookTotalsPrev: Record<string, number> = {
    revenue: salesAggPrev.revenue,
    sales: salesAggPrev.sales,
    avg_ticket: salesAggPrev.avgTicket,
  };

  const resolve = (key: string, sheetsValue: number) =>
    resolveMetricValue(key, metricSources, { sheetsValue, metaTotals, webhookTotals });
  const resolvePrev = (key: string, sheetsValue: number) =>
    resolveMetricValue(key, metricSources, { sheetsValue, metaTotals, webhookTotals: webhookTotalsPrev });

  // curr aplicando metric sources (sobrescreve quando configurado)
  const curr = {
    ...sheetsCurr,
    revenue: resolve("revenue", sheetsCurr.revenue),
    investment: resolve("investment", sheetsCurr.investment),
    leads: resolve("leads", sheetsCurr.leads),
    sales: resolve("sales", sheetsCurr.sales),
    mql: resolve("mql", sheetsCurr.mql),
    smql: resolve("smql", sheetsCurr.smql),
    low_ticket_meta: resolve("low_ticket_meta", sheetsCurr.low_ticket_meta),
    low_ticket_google: resolve("low_ticket_google", sheetsCurr.low_ticket_google),
  };

  // Aplica metric sources também ao período anterior (para comparativos corretos)
  prev.revenue = resolvePrev("revenue", prev.revenue);
  prev.sales = resolvePrev("sales", prev.sales);

  const totalSpend = curr.investment > 0 ? curr.investment : (metaData?.overviewMetrics?.totalSpend || 0);
  const prevSpend = prev.investment;

  const roas = totalSpend > 0 ? curr.revenue / totalSpend : 0;
  const prevRoas = prevSpend > 0 ? prev.revenue / prevSpend : 0;
  const cps = curr.sales > 0 ? totalSpend / curr.sales : 0;
  const prevCps = prev.sales > 0 ? prevSpend / prev.sales : 0;
  const cpl = curr.leads > 0 ? totalSpend / curr.leads : 0;
  const prevCpl = prev.leads > 0 ? prevSpend / prev.leads : 0;
  const totalClicks = metaData?.overviewMetrics?.totalClicks || 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const totalImpressions = metaData?.overviewMetrics?.totalImpressions || 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const clicks = resolve("clicks", totalClicks);
  const pageviews = resolve("pageviews", ga?.overview?.pageViews || 0);
  const leads = resolve("leads", curr.leads || curr.mql);
  const meetings = resolve("meetings", curr.smql);
  const sales = resolve("sales", curr.sales);

  const monthlyRevenueGoal = Number(sheetsConfig?.monthly_revenue_goal || 0);
  const monthlyInvestmentBudget = Number(sheetsConfig?.monthly_investment_budget || 0);

  const combinedData = useMemo(() => {
    return [...inCurr]
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((r) => ({
        date: r.reference_date,
        revenue: Number(r.revenue || 0),
        sales: Number(r.sales || 0),
      }));
  }, [inCurr]);

  const productData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of inCurr) {
      const breakdown = (r as any).raw_row?.product_breakdown as Record<string, number> | undefined;
      if (breakdown && Object.keys(breakdown).length > 0) {
        for (const [product, amount] of Object.entries(breakdown)) {
          map.set(product, (map.get(product) || 0) + Number(amount || 0));
        }
        continue;
      }

      const code = (r as any).product_code as string | null;
      if (!code) continue;
      map.set(code, (map.get(code) || 0) + Number(r.sales || 0));
    }
    return Array.from(map.entries())
      .map(([product, sales]) => ({ product, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  }, [inCurr]);

  // If low_ticket_meta source is Meta, build the daily series from Meta's daily insights
  // (uses `conversions` which already prefers `purchase` action). Otherwise fall back to sheet data.
  const lowTicketMetaSource = metricSources?.low_ticket_meta?.source;

  const lowTicketData = useMemo(() => {
    const sheetSeries = [...inCurr]
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((r) => ({
        date: r.reference_date,
        meta: Number((r as any).low_ticket_meta || 0),
        google: Number((r as any).low_ticket_google || 0),
        total: Number((r as any).low_ticket_meta || 0) + Number((r as any).low_ticket_google || 0),
      }));

    if (lowTicketMetaSource === "meta" && (metaData?.dailyMetrics?.length || 0) > 0) {
      // Merge by date label from Meta daily series; google stays from sheets if present
      const sheetByLabel = new Map<string, { google: number }>();
      for (const r of inCurr) {
        const d = new Date(r.reference_date);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        sheetByLabel.set(label, { google: Number((r as any).low_ticket_google || 0) });
      }
      return (metaData!.dailyMetrics || []).map((d) => {
        // Use purchases specifically (matches the period total which sums purchase actions).
        const meta = Number((d as any).purchases ?? d.conversions ?? 0);
        const google = sheetByLabel.get(d.date)?.google || 0;
        return { date: d.date, meta, google, total: meta + google };
      });
    }
    return sheetSeries;
  }, [inCurr, lowTicketMetaSource, metaData]);

  const lowTicketTotals = useMemo(() => {
    const google = lowTicketData.reduce((a, b) => a + b.google, 0);
    // For "meta" total, prefer the resolved value (curr.low_ticket_meta) so it matches the configured source.
    const meta = curr.low_ticket_meta || lowTicketData.reduce((a, b) => a + b.meta, 0);
    return { total: meta + google, meta, google };
  }, [lowTicketData, curr.low_ticket_meta]);
  const prevLowTicket = {
    total: prev.low_ticket_meta + prev.low_ticket_google,
    meta: prev.low_ticket_meta,
    google: prev.low_ticket_google,
  };

  const leadsData = useMemo(
    () =>
      [...inCurr]
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((r) => ({ date: r.reference_date, leads: Number((r as any).leads || r.mql || 0) })),
    [inCurr],
  );

  // UTMs from the spreadsheet (aggregated in raw_row.utm_breakdown by sheets-sync-v2)
  const sheetUtmRows = useMemo<SheetUtmRow[]>(() => {
    const rows: SheetUtmRow[] = [];
    for (const r of inCurr) {
      const breakdown = (r as any).raw_row?.utm_breakdown as SheetUtmRow[] | undefined;
      if (Array.isArray(breakdown)) rows.push(...breakdown);
    }
    return rows;
  }, [inCurr]);

  const hasSheets = !!sheetsConfig;
  const hasData = (weekly?.length || 0) > 0;
  const campaigns = metaData?.campaigns || [];

  // ============ Block renderers ============
  const visibleOrder = layout.order.filter((id) => layout.blocks[id].visible);

  const cardProps = (id: OverviewBlockId, metricOptions?: MetricOption[]) => {
    const cfg = layout.blocks[id];
    const idx = visibleOrder.indexOf(id);
    return {
      title: cfg.title,
      editMode,
      onMoveUp: idx > 0 ? () => moveBlock(id, -1) : undefined,
      onMoveDown: idx < visibleOrder.length - 1 ? () => moveBlock(id, 1) : undefined,
      onHide: () => toggleVisibility(id),
      onConfigure: metricOptions ? () => setSettingsBlock(cfg) : undefined,
    };
  };

  const renderBlock = (id: OverviewBlockId) => {
    const cfg = layout.blocks[id];
    if (!cfg.visible) return null;

    switch (id) {
      case "resultados":
        return (
          <SectionCard key={id} {...cardProps(id)} className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ProgressMetric
                label="Investimento Total"
                value={fmtNum(totalSpend)}
                delta={pctDelta(totalSpend, prevSpend)}
                current={totalSpend}
                goal={monthlyInvestmentBudget}
                goalLabel={monthlyInvestmentBudget ? fmtNum(monthlyInvestmentBudget) : undefined}
                tone="warn"
              />
              <ProgressMetric
                label="Faturamento"
                value={fmtNum(curr.revenue)}
                delta={pctDelta(curr.revenue, prev.revenue)}
                current={curr.revenue}
                goal={monthlyRevenueGoal}
                goalLabel={monthlyRevenueGoal ? fmtNum(monthlyRevenueGoal) : undefined}
                tone="primary"
              />
            </div>
            <RevenueSalesChart data={combinedData} currencySymbol={currencySymbol} />
          </SectionCard>
        );

      case "custos": {
        const picked = cfg.metrics && cfg.metrics.length > 0 ? cfg.metrics : COST_METRIC_OPTIONS.map((o) => o.key);
        return (
          <SectionCard key={id} {...cardProps(id, COST_METRIC_OPTIONS)}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {picked.includes("cps") && (
                <MiniMetric label="Custo Por Venda" value={formatCurrency(cps, currencySymbol)} delta={prevCps ? pctDelta(cps, prevCps) : null} />
              )}
              {picked.includes("cpl") && (
                <MiniMetric label="Custo Por Lead" value={cpl > 0 ? formatCurrency(cpl, currencySymbol) : "0"} delta={prevCpl ? pctDelta(cpl, prevCpl) : null} />
              )}
              {picked.includes("cpc") && <MiniMetric label="Custo Por Clique" value={formatCurrency(cpc, currencySymbol)} />}
              {picked.includes("cpm") && <MiniMetric label="CPM" value={formatCurrency(cpm, currencySymbol)} />}
            </div>
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-[13px] font-bold text-card-foreground mb-3">Vendas Por Produto</p>
              <ProductSalesChart data={productData} />
            </div>
          </SectionCard>
        );
      }

      case "funil":
        return (
          <SectionCard key={id} {...cardProps(id)} className="xl:col-span-2">
            {clientId ? (
              <EditableOverviewFunnel
                clientId={clientId}
                metrics={{
                  current: {
                    // Meta totals
                    impressions: metaTotals.impressions,
                    reach: metaTotals.reach,
                    clicks: clicks,
                    landing_page_views: metaTotals.landing_page_views,
                    messaging_conversations_started: metaTotals.messaging_started,
                    add_to_cart: metaTotals.add_to_cart,
                    initiate_checkout: metaTotals.initiate_checkout,
                    purchases: metaTotals.purchases || sales,
                    conversions: metaTotals.lead_actions,
                    // Mapped/resolved
                    pageviews: pageviews,
                    leads: leads,
                    meetings: meetings,
                    sales: sales,
                    revenue: curr.revenue,
                  },
                  previous: {
                    impressions: 0,
                    reach: 0,
                    clicks: 0,
                    pageviews: 0,
                    leads: prev.leads || prev.mql,
                    meetings: prev.smql,
                    sales: prev.sales,
                    revenue: prev.revenue,
                    purchases: prev.sales,
                  },
                }}
                extraMetricLabels={[
                  { key: "pageviews", label: "Pageviews (GA4)" },
                  { key: "meetings", label: "Reuniões" },
                  { key: "sales", label: "Vendas" },
                  { key: "revenue", label: "Faturamento" },
                ]}
              />
            ) : null}
          </SectionCard>
        );

      case "lowticket":
        return (
          <SectionCard key={id} {...cardProps(id)}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <MiniMetric label="Total" value={String(lowTicketTotals.total)} delta={pctDelta(lowTicketTotals.total, prevLowTicket.total)} />
              <MiniMetric label="Meta Ads" value={String(lowTicketTotals.meta)} delta={pctDelta(lowTicketTotals.meta, prevLowTicket.meta)} />
              <MiniMetric label="Google Ads" value={String(lowTicketTotals.google)} delta={pctDelta(lowTicketTotals.google, prevLowTicket.google)} />
            </div>
            <LowTicketChart data={lowTicketData} />
          </SectionCard>
        );

      case "leads":
        return (
          <SectionCard key={id} {...cardProps(id)}>
            <div className="mb-3">
              <MiniMetric label="Leads Gerados" value={leads.toLocaleString("pt-BR")} delta={pctDelta(leads, prev.leads || prev.mql)} />
            </div>
            <LeadsChart data={leadsData} />
          </SectionCard>
        );

      case "mql": {
        const picked = cfg.metrics && cfg.metrics.length > 0 ? cfg.metrics : MQL_METRIC_OPTIONS.map((o) => o.key);
        return (
          <SectionCard key={id} {...cardProps(id, MQL_METRIC_OPTIONS)}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {picked.includes("mql") && (
                <MiniMetric label="MQL" value={curr.mql.toLocaleString("pt-BR")} delta={pctDelta(curr.mql, prev.mql)} />
              )}
              {picked.includes("smql") && (
                <MiniMetric label="sMQL" value={curr.smql.toLocaleString("pt-BR")} delta={pctDelta(curr.smql, prev.smql)} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <PlaceholderBox label="Detalhes MQL" />
              <PlaceholderBox label="Detalhes sMQL" />
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              {picked.includes("qualified_messages") && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Mensagens Qualif.</p>
                    <p className="text-sm font-bold">{curr.qualified_messages || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">% Mensagens</p>
                    <p className="text-sm font-bold">—</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Amostragem</p>
                    <p className="text-sm font-bold">{inCurr.length}</p>
                  </div>
                </div>
              )}
              {picked.includes("qualified_followers") && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Seguidores Qualif.</p>
                    <p className="text-sm font-bold">{curr.qualified_followers || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">% Seguidores</p>
                    <p className="text-sm font-bold">—</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Amostragem</p>
                    <p className="text-sm font-bold">{inCurr.length}</p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        );
      }

      case "best-ads":
        return (
          <SectionCard
            key={id}
            {...cardProps(id, AD_METRIC_OPTIONS.map((o) => ({ key: o.key, label: o.label })))}
          >
            <BestAdsList campaigns={campaigns} limit={3} metrics={cfg.metrics} currencySymbol={currencySymbol} />
          </SectionCard>
        );

      case "utm-traffic":
        if (sheetUtmRows.length > 0) {
          return (
            <SectionCard
              key={id}
              {...cardProps(id)}
              title="Fontes (UTMs da Planilha)"
              className="xl:col-span-2"
            >
              <SheetUtmTable rows={sheetUtmRows} currencySymbol={currencySymbol} />
            </SectionCard>
          );
        }
        return (
          <SectionCard key={id} {...cardProps(id)} className="xl:col-span-2">
            <UtmTrafficTable utms={ga?.utms || []} currencySymbol={currencySymbol} />
          </SectionCard>
        );

      default:
        return null;
    }
  };

  // metric options lookup for the settings dialog
  const metricOptionsFor = (id: OverviewBlockId | undefined): MetricOption[] | undefined => {
    if (!id) return undefined;
    if (id === "custos") return COST_METRIC_OPTIONS;
    if (id === "mql") return MQL_METRIC_OPTIONS;
    if (id === "best-ads") return AD_METRIC_OPTIONS.map((o) => ({ key: o.key, label: o.label }));
    return undefined;
  };


  return (
    <div className="space-y-3">
      {!hasSheets && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 glass-card p-5 flex items-start gap-3">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Configure suas planilhas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre uma ou mais planilhas e mapeie de qual coluna cada métrica vai puxar dados.
            </p>
          </div>
          <Link
            to={`/dashboard/${clientId}/sheets`}
            className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg font-semibold hover:bg-primary/90 flex items-center gap-1.5 neon-glow"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Configurar
          </Link>
        </div>
      )}

      {hasSheets && !hasData && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-center backdrop-blur">
          <p className="text-xs text-muted-foreground">
            Planilha configurada mas ainda sem dados sincronizados.{" "}
            <Link to={`/dashboard/${clientId}/sheets`} className="text-primary underline font-medium">
              Sincronizar agora
            </Link>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary neon-glow" />
          <h2 className="text-sm font-semibold tracking-tight">Visão Geral</h2>
          <span className="text-[11px] text-muted-foreground">— layout personalizável por cliente</span>
        </div>
        <div className="flex items-center gap-2">
          <TemplatePicker
            value={templateKey}
            onChange={(k: TemplateKey) => {
              setTemplateKey(k);
              if (k !== "custom") replaceLayout(applyTemplateToLayout(layout, k));
            }}
          />
          {clientId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFocusMetric(undefined); setSourceEditorOpen(true); }}
              className="h-8 gap-1.5 text-xs"
            >
              <Database className="h-3.5 w-3.5" /> Fontes de dados
            </Button>
          )}
          <LayoutToolbar
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
            onReset={reset}
            layout={layout}
            onShowBlock={(id) => toggleVisibility(id)}
          />
        </div>
      </div>

      {/* Container fluido: cards crescem o suficiente para mostrar todo o conteúdo, alinhados na grid. */}
      <div className="mx-auto w-full">
      <ResponsiveGridLayout
        className="layout"
        layouts={{
          lg: visibleOrder.map((id) => {
            const b = layout.blocks[id];
            return {
              i: id,
              x: b.x ?? 0,
              y: b.y ?? 0,
              w: b.w ?? 4,
              h: b.h ?? 4,
              minW: 2,
              minH: 2,
            };
          }),
        }}
        breakpoints={{ lg: 1100, md: 768, sm: 0 }}
        cols={{ lg: 12, md: 8, sm: 1 }}
        rowHeight={56}
        margin={[10, 10]}
        containerPadding={[0, 0]}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".grid-drag-handle"
        onLayoutChange={(curLayout: any[]) => {
          if (editMode) updatePositions(curLayout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
        }}
      >
        {visibleOrder.map((id) => (
          <div key={id} className="overflow-hidden">
            {editMode && (
              <div className="grid-drag-handle absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary cursor-move select-none border border-primary/30">
                ⋮⋮ arrastar
              </div>
            )}
            <div className="h-full">{renderBlock(id)}</div>
          </div>
        ))}
      </ResponsiveGridLayout>
      </div>

      <BlockSettingsDialog
        open={!!settingsBlock}
        onOpenChange={(open) => !open && setSettingsBlock(null)}
        block={settingsBlock}
        metricOptions={metricOptionsFor(settingsBlock?.id)}
        onSave={(patch) => settingsBlock && updateBlock(settingsBlock.id, patch)}
      />

      {clientId && (
        <MetricSourceEditor
          clientId={clientId}
          open={sourceEditorOpen}
          onOpenChange={setSourceEditorOpen}
          focusMetric={focusMetric}
          metaTotals={metaTotals}
          actionBreakdown={(metaData?.overviewMetrics as any)?.actionBreakdown}
        />
      )}
    </div>
  );
}
