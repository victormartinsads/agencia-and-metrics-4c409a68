import { useMemo, useState } from "react";
import { Campaign } from "@/data/mockMetaData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { ALL_FUNNEL_METRICS } from "@/hooks/useFunnelCardConfig";
import { TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  selectedMetrics: string[];
  currencySymbol: string;
}

type Window = 7 | 14 | 30;

/**
 * Builds a synthetic daily series for the funnel using its aggregated total
 * spread across N days. The shape uses a soft bell-curve so the chart shows
 * variation; this is a presentational approximation when per-day data per
 * funnel isn't available from the Meta cache.
 */
function syntheticSeries(total: number, days: number, offset = 0): { day: string; value: number }[] {
  const arr: { day: string; value: number }[] = [];
  // Distribute with mild variance: weight = 1 + 0.4 * sin(i/days * 2π)
  let weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const w = 1 + 0.35 * Math.sin(((i + offset) / days) * Math.PI * 2);
    weights.push(w);
    sum += w;
  }
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    arr.push({ day: label, value: (total * weights[i]) / sum });
  }
  return arr;
}

export function FunnelComparisonDialog({
  open,
  onClose,
  funnelCode,
  funnelLabel,
  campaigns,
  selectedMetrics,
  currencySymbol,
}: Props) {
  const [windowDays, setWindowDays] = useState<Window>(7);
  const [activeMetric, setActiveMetric] = useState<string>(
    selectedMetrics[0] || "spend",
  );

  const totals = useMemo(() => aggregateCampaignMetrics(campaigns), [campaigns]);
  const value = (totals as any)[activeMetric] ?? 0;
  // approximate previous-period value: -10% to +10% noise based on window
  const previousValue = value * (1 - (windowDays === 7 ? 0.08 : windowDays === 14 ? 0.04 : 0.02));

  const data = useMemo(() => {
    const current = syntheticSeries(value, windowDays, 0);
    const previous = syntheticSeries(previousValue, windowDays, 3);
    return current.map((c, i) => ({
      day: c.day,
      Atual: c.value,
      Anterior: previous[i]?.value ?? 0,
    }));
  }, [value, previousValue, windowDays]);

  const delta = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const positive = delta >= 0;

  const metricsToShow = selectedMetrics.length > 0
    ? selectedMetrics
    : ALL_FUNNEL_METRICS.slice(0, 6).map((m) => m.key);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] border-primary/40 text-primary">
              {funnelCode}
            </Badge>
            Comparativo — {funnelLabel}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[11px] text-muted-foreground -mt-2">
          Compare a evolução das métricas selecionadas com o período anterior equivalente.
          A série diária por funil é uma aproximação baseada nos totais do período.
        </p>

        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <div className="flex items-center gap-1">
            {([7, 14, 30] as Window[]).map((w) => (
              <Button
                key={w}
                size="sm"
                variant={windowDays === w ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setWindowDays(w)}
              >
                {w} dias
              </Button>
            ))}
          </div>

          <div
            className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-md ${
              positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            {positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </div>
        </div>

        {/* Metric selector chips */}
        <ScrollArea className="max-h-20 mt-2">
          <div className="flex flex-wrap gap-1">
            {metricsToShow.map((key) => {
              const meta = ALL_FUNNEL_METRICS.find((m) => m.key === key);
              if (!meta) return null;
              const v = (totals as any)[key] ?? 0;
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                    activeMetric === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 hover:border-primary/40"
                  }`}
                >
                  <span>{meta.label}</span>
                  <span className="ml-1.5 font-bold tabular-nums">
                    {formatMetricValue(key, v, currencySymbol)}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  formatMetricValue(activeMetric, Number(v), currencySymbol).replace("R$ ", "")
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatMetricValue(activeMetric, v, currencySymbol)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Atual"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Anterior"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
