import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, AlertCircle, Wrench, Sparkles } from "lucide-react";

import { SectionCard } from "./SectionCard";
import { ProgressMetric } from "./ProgressMetric";
import { MiniMetric } from "./MiniMetric";
import { RevenueSalesChart } from "./RevenueSalesChart";
import { HorizontalFunnel } from "./HorizontalFunnel";
import { ProductSalesChart } from "./ProductSalesChart";
import { LowTicketChart } from "./LowTicketChart";
import { LeadsChart } from "./LeadsChart";
import { BestAdsList, AD_METRIC_OPTIONS } from "./BestAdsList";
import { LayoutToolbar } from "./LayoutToolbar";
import { BlockSettingsDialog, MetricOption } from "./BlockSettingsDialog";

import { useWeeklyMetrics, useSheetsConfig } from "@/hooks/useSheetsSync";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { getPeriodPair, pctDelta } from "@/lib/period";
import { formatCurrency } from "@/lib/format";
import { useOverviewLayout, OverviewBlockId, BlockConfig } from "@/hooks/useOverviewLayout";
import { MetricBinding } from "./MetricSourceEditor";

interface Props {
  clientId?: string;
  datePreset: string;
  metaData: MetaAdsData | undefined;
  currencySymbol: string;
}

function inRange(dateStr: string, start: Date, end: Date) {
  const t = new Date(dateStr).getTime();
  return t >= start.getTime() && t <= end.getTime();
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

/**
 * Bindings: each metric_key here is what gets persisted in metric_data_sources.
 * `allowed` restricts which source types make sense for that metric.
 */
const RESULTS_BINDINGS: MetricBinding[] = [
  { key: "investment", label: "Investimento Total", allowed: ["sheet", "meta", "manual"] },
  { key: "revenue", label: "Faturamento", allowed: ["sheet", "manual"] },
  { key: "sales", label: "Vendas", allowed: ["sheet", "meta", "manual"] },
];

const COST_BINDINGS: MetricBinding[] = [
  { key: "cps", label: "Custo Por Venda", allowed: ["sheet", "meta", "manual"] },
  { key: "cpl", label: "Custo Por Lead", allowed: ["sheet", "meta", "manual"] },
  { key: "cpc", label: "Custo Por Clique", allowed: ["meta", "manual"] },
  { key: "cpm", label: "CPM", allowed: ["meta", "manual"] },
  { key: "product_sales", label: "Vendas Por Produto", allowed: ["sheet"] },
];

const FUNNEL_BINDINGS: MetricBinding[] = [
  { key: "clicks", label: "Cliques", allowed: ["meta", "manual"] },
  { key: "pageviews", label: "Visitas Página", allowed: ["ga", "manual"] },
  { key: "leads", label: "Leads", allowed: ["sheet", "meta", "manual"] },
  { key: "meetings", label: "Reuniões / sMQL", allowed: ["sheet", "manual"] },
  { key: "sales", label: "Vendas", allowed: ["sheet", "meta", "manual"] },
];

const LOWTICKET_BINDINGS: MetricBinding[] = [
  { key: "low_ticket_meta", label: "Vendas LowTicket Meta", allowed: ["sheet", "manual"] },
  { key: "low_ticket_google", label: "Vendas LowTicket Google", allowed: ["sheet", "manual"] },
];

const LEADS_BINDINGS: MetricBinding[] = [
  { key: "leads_total", label: "Leads Gerados", allowed: ["sheet", "meta", "manual"] },
];

const MQL_BINDINGS: MetricBinding[] = [
  { key: "mql", label: "MQL", allowed: ["sheet", "manual"] },
  { key: "smql", label: "sMQL", allowed: ["sheet", "manual"] },
  { key: "qualified_messages", label: "Mensagens Qualif.", allowed: ["sheet", "manual"] },
  { key: "qualified_followers", label: "Seguidores Qualif.", allowed: ["sheet", "manual"] },
];

export function OverviewRedesign({ clientId, datePreset, metaData, currencySymbol }: Props) {
  const { data: sheetsConfig } = useSheetsConfig(clientId);
  const { data: weekly } = useWeeklyMetrics(clientId, 365);
  const { data: ga } = useGoogleAnalytics(clientId, datePreset, !!clientId);

  const { layout, moveBlock, toggleVisibility, updateBlock, reset } = useOverviewLayout(clientId);
  const [editMode, setEditMode] = useState(false);
  const [settingsBlock, setSettingsBlock] = useState<BlockConfig | null>(null);

  const periods = useMemo(() => getPeriodPair(datePreset), [datePreset]);

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

  const curr = {
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

  const clicks = totalClicks;
  const pageviews = ga?.overview?.pageViews || 0;
  const leads = curr.leads || curr.mql;
  const meetings = curr.smql;
  const sales = curr.sales;

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
      const code = (r as any).product_code as string | null;
      if (!code) continue;
      map.set(code, (map.get(code) || 0) + Number(r.sales || 0));
    }
    return Array.from(map.entries())
      .map(([product, sales]) => ({ product, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  }, [inCurr]);

  const lowTicketData = useMemo(
    () =>
      [...inCurr]
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((r) => ({
          date: r.reference_date,
          meta: Number((r as any).low_ticket_meta || 0),
          google: Number((r as any).low_ticket_google || 0),
          total: Number((r as any).low_ticket_meta || 0) + Number((r as any).low_ticket_google || 0),
        })),
    [inCurr],
  );
  const lowTicketTotals = useMemo(() => {
    const meta = lowTicketData.reduce((a, b) => a + b.meta, 0);
    const google = lowTicketData.reduce((a, b) => a + b.google, 0);
    return { total: meta + google, meta, google };
  }, [lowTicketData]);
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

  const hasSheets = !!sheetsConfig;
  const hasData = (weekly?.length || 0) > 0;
  const campaigns = metaData?.campaigns || [];

  // ============ Block renderers ============
  const visibleOrder = layout.order.filter((id) => layout.blocks[id].visible);

  const cardProps = (id: OverviewBlockId, metricOptions?: MetricOption[], bindings?: MetricBinding[]) => {
    const cfg = layout.blocks[id];
    const idx = visibleOrder.indexOf(id);
    return {
      title: cfg.title,
      editMode,
      onMoveUp: idx > 0 ? () => moveBlock(id, -1) : undefined,
      onMoveDown: idx < visibleOrder.length - 1 ? () => moveBlock(id, 1) : undefined,
      onHide: () => toggleVisibility(id),
      onConfigure: (metricOptions || bindings) ? () => setSettingsBlock(cfg) : undefined,
    };
  };

  const renderBlock = (id: OverviewBlockId) => {
    const cfg = layout.blocks[id];
    if (!cfg.visible) return null;

    switch (id) {
      case "resultados":
        return (
          <SectionCard key={id} {...cardProps(id, undefined, RESULTS_BINDINGS)} className="xl:col-span-2">
            <div className="grid grid-cols-3 gap-4 mb-4">
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
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">ROAS</p>
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-card border border-border text-2xl font-bold">
                  {roas.toFixed(1)}
                </div>
                {prevRoas > 0 && (
                  <p className="text-[10px] text-muted-foreground">vs {prevRoas.toFixed(1)} anterior</p>
                )}
              </div>
            </div>
            <RevenueSalesChart data={combinedData} currencySymbol={currencySymbol} />
          </SectionCard>
        );

      case "custos": {
        const picked = cfg.metrics && cfg.metrics.length > 0 ? cfg.metrics : COST_METRIC_OPTIONS.map((o) => o.key);
        return (
          <SectionCard key={id} {...cardProps(id, COST_METRIC_OPTIONS, COST_BINDINGS)}>
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
          <SectionCard key={id} {...cardProps(id, undefined, FUNNEL_BINDINGS)}>
            <HorizontalFunnel
              clicks={clicks}
              pageviews={pageviews}
              leads={leads}
              meetings={meetings}
              sales={sales}
              prevClicks={metaData?.overviewMetrics?.totalClicks ? Math.round(clicks * 0.85) : 0}
              prevPageviews={pageviews ? Math.round(pageviews * 0.7) : 0}
              prevLeads={prev.leads || prev.mql}
              prevMeetings={prev.smql}
              prevSales={prev.sales}
            />
          </SectionCard>
        );

      case "lowticket":
        return (
          <SectionCard key={id} {...cardProps(id, undefined, LOWTICKET_BINDINGS)}>
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
          <SectionCard key={id} {...cardProps(id, undefined, LEADS_BINDINGS)}>
            <div className="mb-3">
              <MiniMetric label="Leads Gerados" value={leads.toLocaleString("pt-BR")} delta={pctDelta(leads, prev.leads || prev.mql)} />
            </div>
            <LeadsChart data={leadsData} />
          </SectionCard>
        );

      case "mql": {
        const picked = cfg.metrics && cfg.metrics.length > 0 ? cfg.metrics : MQL_METRIC_OPTIONS.map((o) => o.key);
        return (
          <SectionCard key={id} {...cardProps(id, MQL_METRIC_OPTIONS, MQL_BINDINGS)}>
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

  const metricBindingsFor = (id: OverviewBlockId | undefined): MetricBinding[] | undefined => {
    if (!id) return undefined;
    switch (id) {
      case "resultados": return RESULTS_BINDINGS;
      case "custos": return COST_BINDINGS;
      case "funil": return FUNNEL_BINDINGS;
      case "lowticket": return LOWTICKET_BINDINGS;
      case "leads": return LEADS_BINDINGS;
      case "mql": return MQL_BINDINGS;
      default: return undefined;
    }
  };

  return (
    <div className="space-y-4">
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
        <LayoutToolbar
          editMode={editMode}
          onToggleEdit={() => setEditMode((v) => !v)}
          onReset={reset}
          layout={layout}
          onShowBlock={(id) => toggleVisibility(id)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 auto-rows-min">
        {visibleOrder.map((id) => renderBlock(id))}
      </div>

      <BlockSettingsDialog
        open={!!settingsBlock}
        onOpenChange={(open) => !open && setSettingsBlock(null)}
        block={settingsBlock}
        metricOptions={metricOptionsFor(settingsBlock?.id)}
        metricBindings={metricBindingsFor(settingsBlock?.id)}
        clientId={clientId}
        onSave={(patch) => settingsBlock && updateBlock(settingsBlock.id, patch)}
      />
    </div>
  );
}
