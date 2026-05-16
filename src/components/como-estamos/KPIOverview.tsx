import { motion } from "framer-motion";
import { DollarSign, Target, Users, MessageSquare, TrendingUp, TrendingDown, Minus, Percent, MousePointerClick, Eye } from "lucide-react";
import type { ComoEstamosMetrics } from "@/hooks/useComoEstamos";

interface Variation {
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface Props {
  metrics: ComoEstamosMetrics;
  variations: Record<string, Variation>;
  visible: string[];
  currencySymbol?: string;
}

function buildMetricConfig(currencySymbol: string): Record<string, { label: string; icon: any; format: (v: number) => string; invertTrend?: boolean }> {
  return {
    totalSpend: { label: "Investimento Total", icon: DollarSign, format: v => `${currencySymbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    totalResults: { label: "Resultados", icon: Target, format: v => v.toLocaleString("pt-BR") },
    totalLeads: { label: "Leads", icon: Users, format: v => v.toLocaleString("pt-BR") },
    totalConversations: { label: "Conversas Iniciadas", icon: MessageSquare, format: v => v.toLocaleString("pt-BR") },
    cpl: { label: "CPL", icon: DollarSign, format: v => `${currencySymbol} ${v.toFixed(2)}`, invertTrend: true },
    cpa: { label: "CPA", icon: DollarSign, format: v => `${currencySymbol} ${v.toFixed(2)}`, invertTrend: true },
    roas: { label: "ROAS", icon: TrendingUp, format: v => `${v.toFixed(2)}x` },
    ctr: { label: "CTR", icon: Percent, format: v => `${v.toFixed(2)}%` },
    cpc: { label: "CPC", icon: MousePointerClick, format: v => `${currencySymbol} ${v.toFixed(2)}`, invertTrend: true },
    cpm: { label: "CPM", icon: Eye, format: v => `${currencySymbol} ${v.toFixed(2)}`, invertTrend: true },
    conversionRate: { label: "Taxa de Conversão", icon: Target, format: v => `${v.toFixed(2)}%` },
  };
}

export function KPIOverview({ metrics, variations, visible, currencySymbol = "R$" }: Props) {
  const METRIC_CONFIG = buildMetricConfig(currencySymbol);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {visible.map((key, i) => {
        const config = METRIC_CONFIG[key];
        if (!config) return null;
        const value = metrics[key as keyof ComoEstamosMetrics] as number;
        const variation = variations[key];
        const Icon = config.icon;
        const isPositive = variation ? (config.invertTrend ? variation.change < 0 : variation.change > 0) : undefined;

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-5 pt-4 pb-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/80 mb-2.5">
              <span className="truncate">{config.label}</span>
              <Icon className="h-3 w-3 text-primary/70 shrink-0" />
            </div>
            <div
              className="font-display text-[22px] leading-none font-bold tracking-tight text-foreground mb-1"
              style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
            >
              {config.format(value)}
            </div>
            {variation && variation.change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${isPositive ? "text-primary" : "text-destructive"}`}>
                {variation.trend === "up" ? <TrendingUp className="h-3 w-3" /> : variation.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                <span>{variation.change > 0 ? "+" : ""}{variation.change.toFixed(1)}%</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
