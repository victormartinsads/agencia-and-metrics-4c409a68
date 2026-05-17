import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, FileSpreadsheet, DollarSign, TrendingUp, Target, ShoppingCart, Users, Pencil, Eye, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { KpiCardPremium } from "./KpiCardPremium";
import { PanelCard } from "./PanelCard";
import { InsightsStrip, InsightItem } from "./InsightsStrip";
import { ChannelsDonut } from "./ChannelsDonut";
import { MetricSourceEditor } from "../MetricSourceEditor";
import { EditableOverviewFunnel } from "../EditableOverviewFunnel";

import { RevenueSalesChart } from "../RevenueSalesChart";
import { ConversionFunnelPremium } from "./ConversionFunnelPremium";
import { AgeBarsPanel } from "./AgeBarsPanel";
import { ProductSalesChart } from "../ProductSalesChart";
import { LowTicketChart } from "../LowTicketChart";
import { LeadsChart } from "../LeadsChart";
import { BestAdsList } from "../BestAdsList";
import { UtmTrafficTable } from "../UtmTrafficTable";
import { SheetUtmTable, SheetUtmRow } from "../SheetUtmTable";

import { useWeeklyMetrics, useDashboardSheet } from "@/hooks/useDashboardSheet";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { useSalesEvents, aggregateSales } from "@/hooks/useSalesEvents";
import { useMetricSources, resolveMetricValue } from "@/hooks/useMetricSources";
import { useMetaDemographics } from "@/hooks/useMetaDemographics";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { getPeriodPair, pctDelta } from "@/lib/period";
import { formatCurrency } from "@/lib/format";
import { useFunnelStages, DEFAULT_STAGES } from "@/hooks/useFunnelStages";

interface Props {
  clientId?: string;
  datePreset: string;
  metaData: MetaAdsData | undefined;
  currencySymbol: string;
}

function inRange(dateStr: string, start: Date, end: Date) {
  const d = String(dateStr).slice(0, 10);
  const toKey = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return d >= toKey(start) && d <= toKey(end);
}

export function OverviewPremium({ clientId, datePreset, metaData, currencySymbol }: Props) {
  const { data: sheetsConfig } = useDashboardSheet(clientId);
  const { data: weekly } = useWeeklyMetrics(clientId, 365);
  const { data: ga } = useGoogleAnalytics(clientId, datePreset, !!clientId);
  const { data: gAds } = useGoogleAds(clientId, datePreset, !!clientId);
  const { data: metricSources } = useMetricSources(clientId);
  const { data: demographics } = useMetaDemographics(clientId, datePreset, !!clientId);
  const { data: savedFunnelStages } = useFunnelStages(clientId, null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [funnelEdit, setFunnelEdit] = useState(false);

  // Edit / hide mode
  const HIDE_KEY = `overview-premium-hidden:${clientId || "default"}`;
  const [editMode, setEditMode] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(HIDE_KEY) : null;
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(Array.from(hidden))); } catch {}
  }, [hidden, HIDE_KEY]);
  const hidePanel = useCallback((id: string) => setHidden((s) => new Set([...s, id])), []);
  const showPanel = useCallback((id: string) => setHidden((s) => { const n = new Set(s); n.delete(id); return n; }), []);
  const resetHidden = useCallback(() => setHidden(new Set()), []);
  const isVisible = (id: string) => !hidden.has(id);

  const PANEL_LABELS: Record<string, string> = {
    performance: "Performance do período",
    custos: "Custos & Produtos",
    funil: "Funil de Conversão",
    canais: "Canais (UTM)",
    demografico: "Demográfico — Idade",
    lowticket: "Low Ticket",
    bestads: "Melhores Criativos",
    leads: "Leads",
    utms: "Fontes de tráfego (UTM)",
  };

  const EditSourceBtn = ({ title = "Editar fonte de dados" }: { title?: string }) => (
    <button
      onClick={() => setSourcesOpen(true)}
      className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      title={title}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );

  useEffect(() => {
    const openSrc = () => setSourcesOpen(true);
    window.addEventListener("overview:open-sources", openSrc);
    window.addEventListener("overview:open-template", openSrc);
    return () => {
      window.removeEventListener("overview:open-sources", openSrc);
      window.removeEventListener("overview:open-template", openSrc);
    };
  }, []);

  const periods = useMemo(() => getPeriodPair(datePreset), [datePreset]);
  const salesRange = useMemo(() => ({ from: periods.current.start, to: periods.current.end }), [periods]);
  const salesPrevRange = useMemo(() => ({ from: periods.previous.start, to: periods.previous.end }), [periods]);
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
  const sumKey = (rows: typeof inCurr, key: string) =>
    rows.reduce((acc, r) => acc + Number((r as any)[key] || 0), 0);

  const sheetsCurr = {
    revenue: sumKey(inCurr, "revenue"),
    sales: sumKey(inCurr, "sales"),
    mql: sumKey(inCurr, "mql"),
    smql: sumKey(inCurr, "smql"),
    leads: sumKey(inCurr, "leads"),
    investment: sumKey(inCurr, "investment"),
    low_ticket_meta: sumKey(inCurr, "low_ticket_meta"),
    low_ticket_google: sumKey(inCurr, "low_ticket_google"),
  };
  const prev = {
    revenue: sumKey(inPrev, "revenue"),
    sales: sumKey(inPrev, "sales"),
    leads: sumKey(inPrev, "leads"),
    mql: sumKey(inPrev, "mql"),
    smql: sumKey(inPrev, "smql"),
    investment: sumKey(inPrev, "investment"),
    low_ticket_meta: sumKey(inPrev, "low_ticket_meta"),
    low_ticket_google: sumKey(inPrev, "low_ticket_google"),
  };

  const metaTotals: Record<string, number> = {
    spend: (metaData?.overviewMetrics?.totalSpend || 0) + (gAds?.totals?.cost || 0),
    impressions: metaData?.overviewMetrics?.totalImpressions || 0,
    clicks: metaData?.overviewMetrics?.totalClicks || 0,
    reach: (metaData?.overviewMetrics as any)?.totalReach || 0,
    purchases: (metaData?.overviewMetrics as any)?.totalPurchases || 0,
    initiate_checkout: (metaData?.overviewMetrics as any)?.totalInitiateCheckout || 0,
    add_to_cart: (metaData?.overviewMetrics as any)?.totalAddToCart || 0,
    landing_page_views: (metaData?.overviewMetrics as any)?.totalLandingPageViews || 0,
    lead_actions:
      (metaData?.overviewMetrics as any)?.totalLeadActions ??
      (metaData?.overviewMetrics as any)?.totalConversions ?? 0,
    messaging_started: (metaData?.overviewMetrics as any)?.messaging_started || 0,
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

  const resolve = (key: string, v: number) =>
    resolveMetricValue(key, metricSources, { sheetsValue: v, metaTotals, webhookTotals });
  const resolvePrev = (key: string, v: number) =>
    resolveMetricValue(key, metricSources, { sheetsValue: v, metaTotals, webhookTotals: webhookTotalsPrev });

  const curr = {
    ...sheetsCurr,
    revenue: resolve("revenue", sheetsCurr.revenue),
    investment: resolve("investment", sheetsCurr.investment),
    leads: resolve("leads", sheetsCurr.leads),
    sales: resolve("sales", sheetsCurr.sales),
    mql: resolve("mql", sheetsCurr.mql),
    smql: resolve("smql", sheetsCurr.smql),
  };
  prev.revenue = resolvePrev("revenue", prev.revenue);
  prev.sales = resolvePrev("sales", prev.sales);

  const totalSpend = curr.investment > 0 ? curr.investment : metaTotals.spend;
  const prevSpend = prev.investment;
  const roas = totalSpend > 0 ? curr.revenue / totalSpend : 0;
  const prevRoas = prevSpend > 0 ? prev.revenue / prevSpend : 0;
  const cps = curr.sales > 0 ? totalSpend / curr.sales : 0;
  const cpl = curr.leads > 0 ? totalSpend / curr.leads : 0;
  const cpc = metaTotals.clicks > 0 ? totalSpend / metaTotals.clicks : 0;
  const cpm = metaTotals.impressions > 0 ? (totalSpend / metaTotals.impressions) * 1000 : 0;
  const ctr = metaTotals.impressions > 0 ? (metaTotals.clicks / metaTotals.impressions) * 100 : 0;
  const freq = metaTotals.reach > 0 ? metaTotals.impressions / metaTotals.reach : 0;

  const leads = resolve("leads", curr.leads || curr.mql);
  const sales = resolve("sales", curr.sales);
  const pageviews = resolve("pageviews", ga?.overview?.pageViews || 0);

  // Combined chart data
  const combinedData = useMemo(
    () =>
      [...inCurr]
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((r) => ({ date: r.reference_date, revenue: Number(r.revenue || 0), sales: Number(r.sales || 0) })),
    [inCurr],
  );

  const productData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of inCurr) {
      const breakdown = (r as any).raw_row?.product_breakdown as Record<string, number> | undefined;
      if (breakdown) {
        for (const [p, a] of Object.entries(breakdown)) map.set(p, (map.get(p) || 0) + Number(a || 0));
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
  const ltTotal = sheetsCurr.low_ticket_meta + sheetsCurr.low_ticket_google;
  const prevLt = prev.low_ticket_meta + prev.low_ticket_google;

  // Fallback: se planilha não trouxer Meta low ticket, usa Vendas (purchases) da Meta API
  const lowTicketMetaDisplay = sheetsCurr.low_ticket_meta > 0
    ? sheetsCurr.low_ticket_meta
    : (metaTotals.purchases || 0);
  const lowTicketGoogleDisplay = sheetsCurr.low_ticket_google;
  const ltTotalDisplay = lowTicketMetaDisplay + lowTicketGoogleDisplay;
  const prevLtMeta = prev.low_ticket_meta || 0;

  // Se chart sheet data está vazio mas temos vendas Meta, sintetiza 1 ponto
  const lowTicketDataDisplay = useMemo(() => {
    const hasSheetData = lowTicketData.some((d) => d.meta > 0 || d.google > 0);
    if (hasSheetData) return lowTicketData;
    if (lowTicketMetaDisplay > 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ date: today, meta: lowTicketMetaDisplay, google: 0, total: lowTicketMetaDisplay }];
    }
    return lowTicketData;
  }, [lowTicketData, lowTicketMetaDisplay]);

  const leadsData = useMemo(
    () =>
      [...inCurr]
        .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
        .map((r) => ({ date: r.reference_date, leads: Number((r as any).leads || r.mql || 0) })),
    [inCurr],
  );

  const sheetUtmRows = useMemo<SheetUtmRow[]>(() => {
    const rows: SheetUtmRow[] = [];
    for (const r of inCurr) {
      const breakdown = (r as any).raw_row?.utm_breakdown as SheetUtmRow[] | undefined;
      if (Array.isArray(breakdown)) rows.push(...breakdown);
    }
    return rows;
  }, [inCurr]);

  // Channels rows derived from UTMs (planilha) — fallback to GA4 UTMs
  const channelRows = useMemo(() => {
    const map = new Map<string, { revenue: number; sales: number; impressions: number }>();
    for (const r of sheetUtmRows) {
      const key = (r.source || "(direct)").toLowerCase();
      const cur = map.get(key) || { revenue: 0, sales: 0, impressions: 0 };
      cur.revenue += r.revenue;
      cur.sales += r.sales;
      map.set(key, cur);
    }
    if (map.size === 0 && ga?.utms?.length) {
      for (const u of ga.utms as any[]) {
        const key = (u.source || u.utm_source || "(direct)").toLowerCase();
        const cur = map.get(key) || { revenue: 0, sales: 0, impressions: 0 };
        cur.impressions += Number(u.sessions || u.users || u.impressions || 0);
        map.set(key, cur);
      }
    }
    return Array.from(map.entries()).map(([label, v]) => ({
      label,
      // ChannelsDonut sorts by `impressions`; use revenue if present, else session impressions
      impressions: v.revenue > 0 ? v.revenue : v.impressions,
      spend: 0,
      reach: 0,
      clicks: 0,
      results: v.sales,
    }));
  }, [sheetUtmRows, ga?.utms]);

  // Auto-derived insights
  const insights = useMemo<InsightItem[]>(() => {
    const out: InsightItem[] = [];
    if (combinedData.length > 0) {
      const best = [...combinedData].sort((a, b) => b.revenue - a.revenue)[0];
      const totalRev = combinedData.reduce((a, b) => a + b.revenue, 0);
      if (best && totalRev > 0) {
        const pct = ((best.revenue / totalRev) * 100).toFixed(0);
        const date = new Date(best.date).toLocaleDateString("pt-BR", { weekday: "long" });
        out.push({
          icon: "best",
          title: "Melhor dia",
          body: <><span className="capitalize">{date}</span> gerou <strong>{formatCurrency(best.revenue, currencySymbol)}</strong> — {pct}% do faturamento.</>,
        });
      }
    }
    const platform = demographics?.platform || [];
    if (platform.length > 0) {
      const totalImpr = platform.reduce((a, b) => a + b.impressions, 0);
      const top = platform.sort((a, b) => b.impressions - a.impressions)[0];
      if (top && totalImpr > 0) {
        const pct = ((top.impressions / totalImpr) * 100).toFixed(1);
        out.push({
          icon: "channel",
          title: "Canal top",
          body: <><span className="capitalize">{top.label}</span> levou <strong>{pct}%</strong> das impressões.</>,
        });
      }
    }
    if (roas > 0) {
      const goal = 3.5;
      if (roas < goal) {
        out.push({
          icon: "warn",
          title: "Atenção",
          body: <>ROAS abaixo da meta de <strong>{goal.toFixed(1)}x</strong>. Considere otimizar criativos.</>,
        });
      }
    }
    if (productData.length > 0) {
      const top = productData[0];
      const tot = productData.reduce((a, b) => a + b.sales, 0);
      const pct = tot > 0 ? ((top.sales / tot) * 100).toFixed(0) : "0";
      out.push({
        icon: "winner",
        title: "Produto destaque",
        body: <><strong>{top.product}</strong> concentrou <strong>{pct}%</strong> com {top.sales} vendas.</>,
      });
    }
    if (curr.sales > 0 && curr.revenue > 0) {
      const ticket = curr.revenue / curr.sales;
      out.push({
        icon: "ticket",
        title: "Ticket médio",
        body: <>Ticket de <strong>{formatCurrency(ticket, currencySymbol)}</strong> no período.</>,
      });
    }
    return out;
  }, [combinedData, demographics, roas, productData, curr.sales, curr.revenue, currencySymbol]);

  const hasSheets = !!sheetsConfig;
  const hasData = (weekly?.length || 0) > 0;
  const campaigns = metaData?.campaigns || [];
  const totalImpr = metaTotals.impressions;
  const compactImpr = totalImpr > 1_000_000
    ? (totalImpr / 1_000_000).toFixed(1) + "M"
    : totalImpr > 1_000 ? (totalImpr / 1_000).toFixed(1) + "k" : String(totalImpr);
  const compactReach = metaTotals.reach > 1_000_000
    ? (metaTotals.reach / 1_000_000).toFixed(1) + "M"
    : metaTotals.reach > 1_000 ? (metaTotals.reach / 1_000).toFixed(1) + "k" : String(metaTotals.reach);

  return (
    <div className="space-y-4 max-w-[1500px]">
      {/* Edit toolbar */}
      <div className="flex items-center justify-end gap-2">
        {editMode && hidden.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Mostrar bloco ({hidden.size})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Blocos ocultos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Array.from(hidden).map((id) => (
                <DropdownMenuItem key={id} onClick={() => showPanel(id)}>
                  {PANEL_LABELS[id] || id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {editMode && hidden.size > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={resetHidden}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </Button>
        )}
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? <Eye className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          {editMode ? "Concluir" : "Editar layout"}
        </Button>
      </div>

      {!hasSheets && (
        <div className="rounded-2xl border border-primary/20 bg-card p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Configure suas planilhas</p>
            <p className="text-xs text-muted-foreground mt-1">Cadastre uma planilha para ativar todas as métricas.</p>
          </div>
          <Link
            to={`/dashboard/${clientId}/sheets`}
            className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg font-semibold hover:bg-primary/90 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Configurar
          </Link>
        </div>
      )}
      {hasSheets && !hasData && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Planilha configurada mas ainda sem dados.{" "}
            <Link to={`/dashboard/${clientId}/sheets`} className="text-primary underline font-medium">
              Sincronizar agora
            </Link>
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCardPremium
          label="Investimento"
          value={formatCurrency(totalSpend, currencySymbol)}
          delta={prevSpend ? pctDelta(totalSpend, prevSpend) : null}
          sub="vs. período anterior"
          inverse
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <KpiCardPremium
          label="Faturamento"
          value={formatCurrency(curr.revenue, currencySymbol)}
          delta={prev.revenue ? pctDelta(curr.revenue, prev.revenue) : null}
          sub="vs. período anterior"
          emphasis
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCardPremium
          label="ROAS"
          value={roas > 0 ? `${roas.toFixed(2)}x` : "—"}
          delta={prevRoas ? pctDelta(roas, prevRoas) : null}
          sub="Meta: 3.5x"
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <KpiCardPremium
          label="Vendas"
          value={curr.sales.toLocaleString("pt-BR")}
          delta={prev.sales ? pctDelta(curr.sales, prev.sales) : null}
          sub={cps > 0 ? `CPV ${formatCurrency(cps, currencySymbol)}` : undefined}
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
        />
        <KpiCardPremium
          label="Leads"
          value={leads.toLocaleString("pt-BR")}
          delta={prev.leads ? pctDelta(leads, prev.leads || prev.mql) : null}
          sub={cpl > 0 ? `CPL ${formatCurrency(cpl, currencySymbol)}` : undefined}
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Insights strip */}
      <InsightsStrip items={insights} />

      {/* Row 1: Performance + Custos/Produtos (1.7fr / 1fr) */}
      {(isVisible("performance") || isVisible("custos")) && (
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-3.5">
        {isVisible("performance") && (
        <PanelCard title="Performance do período" noPadding actions={<EditSourceBtn />} panelId="performance" editMode={editMode} onHide={hidePanel}>
          <div className="grid grid-cols-2 border-b border-border/60">
            <div className="px-5 py-4 border-r border-border/60">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">
                Investimento Total
              </div>
              <div className="text-[28px] leading-none font-bold text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>
                {formatCurrency(totalSpend, currencySymbol)}
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">
                Faturamento
              </div>
              <div className="text-[28px] leading-none font-bold text-primary" style={{ fontFamily: "'Syne',sans-serif" }}>
                {formatCurrency(curr.revenue, currencySymbol)}
              </div>
            </div>
          </div>
          <div className="p-5">
            <RevenueSalesChart data={combinedData} currencySymbol={currencySymbol} />
          </div>
        </PanelCard>
        )}

        {isVisible("custos") && (
        <PanelCard title="Custos & Produtos" noPadding actions={<EditSourceBtn />} panelId="custos" editMode={editMode} onHide={hidePanel}>
          <div className="grid grid-cols-2 gap-px bg-border/60">
            {[
              { l: "Custo / Venda", v: cps > 0 ? formatCurrency(cps, currencySymbol) : "—" },
              { l: "Custo / Lead", v: cpl > 0 ? formatCurrency(cpl, currencySymbol) : "—" },
              { l: "CPC", v: cpc > 0 ? formatCurrency(cpc, currencySymbol) : "—" },
              { l: "CPM", v: cpm > 0 ? formatCurrency(cpm, currencySymbol) : "—" },
            ].map((c) => (
              <div key={c.l} className="bg-muted/30 px-4 py-3.5">
                <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">{c.l}</div>
                <div className="text-[19px] font-bold text-foreground tracking-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pt-4 pb-2">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">Vendas por produto</div>
          </div>
          <div className="p-3">
            <ProductSalesChart data={productData} />
          </div>
        </PanelCard>
        )}
      </div>
      )}

      {/* Row 2: Funil + Canais Donut + Demografico */}
      {(isVisible("funil") || isVisible("canais") || isVisible("demografico")) && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {isVisible("funil") && (
        <PanelCard
          title="Funil de Conversão"
          panelId="funil"
          editMode={editMode}
          onHide={hidePanel}
          actions={
            <>
              <button
                onClick={() => setFunnelEdit((v) => !v)}
                className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title={funnelEdit ? "Ver funil" : "Editar funil"}
              >
                {funnelEdit ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
              <EditSourceBtn title="Editar fontes do funil" />
            </>
          }
        >
          {funnelEdit && clientId ? (
            <EditableOverviewFunnel
              clientId={clientId}
              startInEdit
              metrics={{
                current: {
                  impressions: metaTotals.impressions,
                  reach: metaTotals.reach,
                  clicks: metaTotals.clicks,
                  landing_page_views: metaTotals.landing_page_views,
                  add_to_cart: metaTotals.add_to_cart,
                  initiate_checkout: metaTotals.initiate_checkout,
                  purchases: metaTotals.purchases || sales,
                  conversions: metaTotals.lead_actions,
                  pageviews,
                  leads,
                  sales,
                  revenue: curr.revenue,
                },
                previous: {
                  leads: prev.leads || prev.mql,
                  sales: prev.sales,
                  revenue: prev.revenue,
                  purchases: prev.sales,
                },
              }}
              extraMetricLabels={[
                { key: "pageviews", label: "Pageviews (GA4)" },
                { key: "sales", label: "Vendas" },
                { key: "revenue", label: "Faturamento" },
              ]}
            />
          ) : (() => {
            const metricResolver: Record<string, number> = {
              impressions: metaTotals.impressions,
              reach: metaTotals.reach,
              clicks: metaTotals.clicks,
              landing_page_views: metaTotals.landing_page_views,
              messaging_conversations_started: metaTotals.messaging_started,
              add_to_cart: metaTotals.add_to_cart,
              initiate_checkout: metaTotals.initiate_checkout,
              purchases: metaTotals.purchases || sales,
              conversions: metaTotals.lead_actions,
              leads,
              sales,
              revenue: curr.revenue,
              pageviews,
            };
            const stages = (savedFunnelStages && savedFunnelStages.length > 0)
              ? savedFunnelStages.map((s) => ({ name: s.name, metric_key: s.metric_key }))
              : DEFAULT_STAGES.map((s) => ({ name: s.name, metric_key: s.metric_key }));
            const steps = stages.map((s) => ({
              name: s.name,
              value: Number(metricResolver[s.metric_key] ?? 0),
            }));
            const firstClickIdx = stages.findIndex((s) => s.metric_key === "clicks");
            const leadIdx = stages.findIndex((s) => ["leads", "conversions"].includes(s.metric_key));
            const saleIdx = stages.findIndex((s) => ["purchases", "sales"].includes(s.metric_key));
            const summary: { label: string; value: string }[] = [];
            if (firstClickIdx >= 0 && leadIdx > firstClickIdx) {
              const c = steps[firstClickIdx].value;
              const l = steps[leadIdx].value;
              summary.push({
                label: `Taxa ${stages[firstClickIdx].name.toLowerCase()}→${stages[leadIdx].name.toLowerCase()}`,
                value: c > 0 ? `${((l / c) * 100).toFixed(2)}%` : "—",
              });
            }
            if (leadIdx >= 0 && saleIdx > leadIdx) {
              const l = steps[leadIdx].value;
              const v = steps[saleIdx].value;
              summary.push({
                label: `Taxa ${stages[leadIdx].name.toLowerCase()}→${stages[saleIdx].name.toLowerCase()}`,
                value: l > 0 ? `${((v / l) * 100).toFixed(1)}%` : "—",
              });
            }
            return <ConversionFunnelPremium steps={steps} summary={summary} />;
          })()}
        </PanelCard>
        )}

        {isVisible("canais") && (
        <PanelCard title="Canais (UTM)" actions={<EditSourceBtn />} panelId="canais" editMode={editMode} onHide={hidePanel}>
          <ChannelsDonut
            rows={channelRows}
            centerValue={
              channelRows.length > 0
                ? formatCurrency(channelRows.reduce((a, b) => a + b.impressions, 0), currencySymbol)
                : compactImpr
            }
            centerLabel={channelRows.length > 0 ? "Receita UTM" : "Impressões"}
            extraStats={[
              { label: "Frequência", value: freq > 0 ? freq.toFixed(2) : "—" },
              { label: "CTR", value: ctr > 0 ? `${ctr.toFixed(2)}%` : "—", emphasis: true },
              { label: "Alcance", value: compactReach },
            ]}
          />
        </PanelCard>
        )}

        {isVisible("demografico") && (
        <PanelCard title="Demográfico — Idade" actions={<EditSourceBtn />} panelId="demografico" editMode={editMode} onHide={hidePanel}>
          <AgeBarsPanel clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
        </PanelCard>
        )}
      </div>
      )}

      {/* Row 3: Low ticket + Top ads + Leads */}
      {(isVisible("lowticket") || isVisible("bestads") || isVisible("leads")) && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {isVisible("lowticket") && (
        <PanelCard title="Low Ticket" noPadding actions={<EditSourceBtn />} panelId="lowticket" editMode={editMode} onHide={hidePanel}>
          <div className="grid grid-cols-3 border-b border-border/60">
            {[
              { l: "Total", v: ltTotalDisplay, delta: pctDelta(ltTotalDisplay, prevLt || prevLtMeta), tone: "text-foreground" },
              { l: "Meta Ads", v: lowTicketMetaDisplay, delta: pctDelta(lowTicketMetaDisplay, prevLtMeta), tone: "text-primary" },
              { l: "Google Ads", v: lowTicketGoogleDisplay, delta: pctDelta(lowTicketGoogleDisplay, prev.low_ticket_google), tone: "text-muted-foreground" },
            ].map((c, i) => (
              <div key={i} className={`px-4 py-3.5 ${i < 2 ? "border-r border-border/60" : ""}`}>
                <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">{c.l}</div>
                <div className={`text-[24px] font-bold ${c.tone}`} style={{ fontFamily: "'Syne',sans-serif" }}>
                  {c.v.toLocaleString("pt-BR")}
                </div>
                {c.delta != null && (
                  <div className={`text-[9px] mt-1 font-semibold ${c.delta >= 0 ? "text-primary" : "text-destructive"}`}>
                    {c.delta >= 0 ? "↑" : "↓"} {Math.abs(c.delta).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4">
            <LowTicketChart data={lowTicketDataDisplay} />
          </div>
        </PanelCard>
        )}

        {isVisible("bestads") && (
        <PanelCard title="Melhores Criativos" noPadding actions={<EditSourceBtn />} panelId="bestads" editMode={editMode} onHide={hidePanel}>
          <div className="p-2">
            <BestAdsList campaigns={campaigns} limit={3} currencySymbol={currencySymbol} />
          </div>
        </PanelCard>
        )}

        {isVisible("leads") && (
        <PanelCard title="Leads" noPadding actions={<EditSourceBtn />} panelId="leads" editMode={editMode} onHide={hidePanel}>
          <div className="p-5 pb-3">
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">
              Leads Gerados
            </div>
            <div className="text-[26px] font-bold text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>
              {leads.toLocaleString("pt-BR")}
            </div>
            {prev.leads > 0 && (
              <div className={`text-[10px] mt-1 font-semibold ${(pctDelta(leads, prev.leads || prev.mql) ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                {(pctDelta(leads, prev.leads || prev.mql) ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(pctDelta(leads, prev.leads || prev.mql) || 0).toFixed(1)}% vs. anterior
              </div>
            )}
          </div>
          <div className="px-2">
            <LeadsChart data={leadsData} />
          </div>
          <div className="border-t border-border/60 p-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">MQL</div>
              <div className="text-[14px] font-bold text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>
                {curr.mql.toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">SMQL</div>
              <div className="text-[14px] font-bold text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>
                {curr.smql.toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        </PanelCard>
        )}
      </div>
      )}

      {/* Row 4: UTMs full width */}
      {isVisible("utms") && (
      <PanelCard title="Fontes de tráfego (UTM)" noPadding actions={<EditSourceBtn />} panelId="utms" editMode={editMode} onHide={hidePanel}>
        <div className="p-4">
          {sheetUtmRows.length > 0
            ? <SheetUtmTable rows={sheetUtmRows} currencySymbol={currencySymbol} />
            : <UtmTrafficTable utms={ga?.utms || []} currencySymbol={currencySymbol} />}
        </div>
      </PanelCard>
      )}

      {clientId && (
        <MetricSourceEditor
          clientId={clientId}
          open={sourcesOpen}
          onOpenChange={setSourcesOpen}
          metaTotals={metaTotals}
        />
      )}
    </div>
  );
}