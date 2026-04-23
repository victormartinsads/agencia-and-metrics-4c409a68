import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DollarSign, ShoppingBag, Target, Sparkles, TrendingUp, Coins, FileSpreadsheet, AlertCircle } from "lucide-react";

import { MetricBlock } from "./MetricBlock";
import { SideFunnel } from "./SideFunnel";
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

export function OverviewRedesign({ clientId, datePreset, metaData, currencySymbol }: Props) {
  const { data: sheetsConfig } = useSheetsConfig(clientId);
  const { data: weekly } = useWeeklyMetrics(clientId, 200);
  const { data: ga } = useGoogleAnalytics(clientId, datePreset, !!clientId);

  const periods = useMemo(() => getPeriodPair(datePreset), [datePreset]);

  const aggregated = useMemo(() => {
    const sumRange = (range: { start: Date; end: Date }) => {
      const rows = (weekly || []).filter((m) => inRange(m.reference_date, range.start, range.end));
      return rows.reduce(
        (acc, m) => ({
          revenue: acc.revenue + Number(m.revenue || 0),
          sales: acc.sales + Number(m.sales || 0),
          mql: acc.mql + Number(m.mql || 0),
          smql: acc.smql + Number(m.smql || 0),
          avg_ticket: acc.avg_ticket + Number(m.avg_ticket || 0),
          ltv: acc.ltv + Number(m.ltv || 0),
          count: acc.count + 1,
        }),
        { revenue: 0, sales: 0, mql: 0, smql: 0, avg_ticket: 0, ltv: 0, count: 0 },
      );
    };
    const curr = sumRange(periods.current);
    const prev = sumRange(periods.previous);
    return {
      curr: {
        ...curr,
        avg_ticket: curr.count ? curr.avg_ticket / curr.count : (curr.sales ? curr.revenue / curr.sales : 0),
        ltv: curr.count ? curr.ltv / curr.count : 0,
      },
      prev: {
        ...prev,
        avg_ticket: prev.count ? prev.avg_ticket / prev.count : (prev.sales ? prev.revenue / prev.sales : 0),
        ltv: prev.count ? prev.ltv / prev.count : 0,
      },
    };
  }, [weekly, periods]);

  // Funnel: clicks (Meta) → pageviews (GA4) → leads (sheets MQL) → meetings (sheets sMQL) → sales (sheets)
  const clicks = metaData?.overviewMetrics?.totalClicks || 0;
  const pageviews = ga?.overview?.pageViews || 0;
  const leads = aggregated.curr.mql;
  const meetings = aggregated.curr.smql;
  const sales = aggregated.curr.sales;

  const totalSpend = metaData?.overviewMetrics?.totalSpend || 0;
  const cac = sales > 0 ? totalSpend / sales : 0;
  const roas = totalSpend > 0 ? aggregated.curr.revenue / totalSpend : 0;
  const prevSpend = totalSpend; // sem histórico de spend por período prévio aqui — comparação só vs vendas
  const prevCac = aggregated.prev.sales > 0 ? prevSpend / aggregated.prev.sales : 0;

  const hasSheets = !!sheetsConfig;
  const hasData = (weekly?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {!hasSheets && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Configure a planilha deste cliente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Para ver Faturamento, Vendas, MQL/sMQL e LTV, conecte a planilha do cliente.
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Métricas principais */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricBlock
              label="Faturamento"
              value={formatCurrency(aggregated.curr.revenue, currencySymbol)}
              delta={pctDelta(aggregated.curr.revenue, aggregated.prev.revenue)}
              subValue={`vs ${formatCurrency(aggregated.prev.revenue, currencySymbol)}`}
              icon={DollarSign}
              accent="success"
              size="lg"
              delay={0}
            />
            <MetricBlock
              label="Vendas"
              value={aggregated.curr.sales.toLocaleString("pt-BR")}
              delta={pctDelta(aggregated.curr.sales, aggregated.prev.sales)}
              subValue={`vs ${aggregated.prev.sales} no período anterior`}
              icon={ShoppingBag}
              accent="primary"
              size="lg"
              delay={0.05}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBlock
              label="MQL"
              value={aggregated.curr.mql.toLocaleString("pt-BR")}
              delta={pctDelta(aggregated.curr.mql, aggregated.prev.mql)}
              icon={Target}
              accent="muted"
              delay={0.1}
            />
            <MetricBlock
              label="sMQL"
              value={aggregated.curr.smql.toLocaleString("pt-BR")}
              delta={pctDelta(aggregated.curr.smql, aggregated.prev.smql)}
              icon={Sparkles}
              accent="muted"
              delay={0.15}
            />
            <MetricBlock
              label="Ticket Médio"
              value={formatCurrency(aggregated.curr.avg_ticket, currencySymbol)}
              delta={pctDelta(aggregated.curr.avg_ticket, aggregated.prev.avg_ticket)}
              icon={Coins}
              accent="muted"
              delay={0.2}
            />
            <MetricBlock
              label="LTV"
              value={formatCurrency(aggregated.curr.ltv, currencySymbol)}
              delta={pctDelta(aggregated.curr.ltv, aggregated.prev.ltv)}
              icon={TrendingUp}
              accent="muted"
              delay={0.25}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricBlock
              label="Investimento Meta"
              value={formatCurrency(totalSpend, currencySymbol)}
              icon={DollarSign}
              accent="warning"
              delay={0.3}
            />
            <MetricBlock
              label="ROAS"
              value={`${roas.toFixed(2)}x`}
              icon={TrendingUp}
              accent="warning"
              delay={0.35}
            />
            <MetricBlock
              label="CAC"
              value={formatCurrency(cac, currencySymbol)}
              delta={prevCac ? pctDelta(cac, prevCac) : null}
              icon={Target}
              accent="warning"
              delay={0.4}
            />
          </div>
        </div>

        {/* Funil lateral */}
        <SideFunnel
          clicks={clicks}
          pageviews={pageviews}
          leads={leads}
          meetings={meetings}
          sales={sales}
        />
      </div>
    </div>
  );
}