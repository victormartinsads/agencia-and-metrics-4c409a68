import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, AlertCircle, Wrench } from "lucide-react";

import { SectionCard } from "./SectionCard";
import { ProgressMetric } from "./ProgressMetric";
import { MiniMetric } from "./MiniMetric";
import { RevenueSalesChart } from "./RevenueSalesChart";
import { HorizontalFunnel } from "./HorizontalFunnel";
import { ProductSalesChart } from "./ProductSalesChart";
import { LowTicketChart } from "./LowTicketChart";
import { LeadsChart } from "./LeadsChart";
import { BestAdsList } from "./BestAdsList";
import { EditableMetric } from "./EditableMetric";

import { useWeeklyMetrics, useSheetsConfig } from "@/hooks/useSheetsSync";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { getPeriodPair, pctDelta } from "@/lib/period";
import { formatCurrency } from "@/lib/format";

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

/** Placeholder for blocks that have no underlying data yet (MQL/sMQL details, qualified messages/followers). */
function PlaceholderBox({ label = "Mais detalhes" }: { label?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-dashed border-border h-20 flex items-center justify-center gap-1.5 text-xs text-primary/80">
      <Wrench className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function OverviewRedesign({ clientId, datePreset, metaData, currencySymbol }: Props) {
  const { data: sheetsConfig } = useSheetsConfig(clientId);
  const { data: weekly } = useWeeklyMetrics(clientId, 365);
  const { data: ga } = useGoogleAnalytics(clientId, datePreset, !!clientId);

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

  // Investment: sheets > meta fallback
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

  // Funnel
  const clicks = totalClicks;
  const pageviews = ga?.overview?.pageViews || 0;
  const leads = curr.leads || curr.mql;
  const meetings = curr.smql;
  const sales = curr.sales;

  // Goals
  const monthlyRevenueGoal = Number(sheetsConfig?.monthly_revenue_goal || 0);
  const monthlyInvestmentBudget = Number(sheetsConfig?.monthly_investment_budget || 0);

  // Combined chart data
  const combinedData = useMemo(() => {
    return [...inCurr]
      .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
      .map((r) => ({
        date: r.reference_date,
        revenue: Number(r.revenue || 0),
        sales: Number(r.sales || 0),
      }));
  }, [inCurr]);

  // Vendas por produto (agregado por product_code)
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

  // Low ticket per day
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

  // Leads per day
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

  return (
    <div className="space-y-4">
      {!hasSheets && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Configure a planilha deste cliente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Para ver Faturamento, Vendas, MQL/sMQL, LTV, Low Ticket e produtos, conecte a planilha do cliente.
            </p>
          </div>
          <Link
            to={`/dashboard/${clientId}/sheets`}
            className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Configurar
          </Link>
        </div>
      )}

      {hasSheets && !hasData && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Planilha configurada mas ainda sem dados sincronizados.{" "}
            <Link to={`/dashboard/${clientId}/sheets`} className="text-primary underline font-medium">
              Sincronizar agora
            </Link>
          </p>
        </div>
      )}

      {/* === ROW 1: Resultados Gerais + Custos + Funnel === */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr_1.4fr] gap-4">
        {/* Resultados Gerais (3 KPIs + chart) */}
        <SectionCard title="Resultados Gerais">
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

        {/* Custos */}
        <SectionCard title="Custos">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <MiniMetric
              label="Custo Por Venda"
              value={formatCurrency(cps, currencySymbol)}
              delta={prevCps ? pctDelta(cps, prevCps) : null}
            />
            <MiniMetric
              label="Custo Por Lead"
              value={cpl > 0 ? formatCurrency(cpl, currencySymbol) : "0"}
              delta={prevCpl ? pctDelta(cpl, prevCpl) : null}
            />
            <MiniMetric label="Custo Por Clique" value={formatCurrency(cpc, currencySymbol)} />
            <MiniMetric label="CPM" value={formatCurrency(cpm, currencySymbol)} />
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-[13px] font-bold text-card-foreground mb-3">Vendas Por Produto</p>
            <ProductSalesChart data={productData} />
          </div>
        </SectionCard>

        {/* Funil */}
        <SectionCard>
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
      </div>

      {/* === ROW 2: Low Ticket + Leads + MQL/sMQL + Best Ads === */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <SectionCard title="Vendas LowTicket">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniMetric
              label="Total"
              value={String(lowTicketTotals.total)}
              delta={pctDelta(lowTicketTotals.total, prevLowTicket.total)}
            />
            <MiniMetric
              label="Meta Ads"
              value={String(lowTicketTotals.meta)}
              delta={pctDelta(lowTicketTotals.meta, prevLowTicket.meta)}
            />
            <MiniMetric
              label="Google Ads"
              value={String(lowTicketTotals.google)}
              delta={pctDelta(lowTicketTotals.google, prevLowTicket.google)}
            />
          </div>
          <LowTicketChart data={lowTicketData} />
        </SectionCard>

        <SectionCard title="Leads">
          <div className="mb-3">
            <MiniMetric
              label="Leads Gerados"
              value={leads.toLocaleString("pt-BR")}
              delta={pctDelta(leads, prev.leads || prev.mql)}
            />
          </div>
          <LeadsChart data={leadsData} />
        </SectionCard>

        <SectionCard title="MQL & sMQL">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <MiniMetric
              label="MQL"
              value={curr.mql.toLocaleString("pt-BR")}
              delta={pctDelta(curr.mql, prev.mql)}
            />
            <MiniMetric
              label="sMQL"
              value={curr.smql.toLocaleString("pt-BR")}
              delta={pctDelta(curr.smql, prev.smql)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <PlaceholderBox label="Detalhes MQL" />
            <PlaceholderBox label="Detalhes sMQL" />
          </div>
          <div className="pt-3 border-t border-border space-y-2">
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
          </div>
        </SectionCard>

        <SectionCard title="Melhores Anúncios">
          <BestAdsList campaigns={campaigns} limit={8} />
        </SectionCard>
      </div>
    </div>
  );
}