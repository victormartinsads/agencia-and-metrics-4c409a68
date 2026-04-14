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
}

const METRIC_CONFIG: Record<string, { label: string; icon: any; format: (v: number) => string; invertTrend?: boolean }> = {
  totalSpend: { label: "Investimento Total", icon: DollarSign, format: v => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  totalResults: { label: "Resultados", icon: Target, format: v => v.toLocaleString("pt-BR") },
  totalLeads: { label: "Leads", icon: Users, format: v => v.toLocaleString("pt-BR") },
  totalConversations: { label: "Conversas Iniciadas", icon: MessageSquare, format: v => v.toLocaleString("pt-BR") },
  cpl: { label: "CPL", icon: DollarSign, format: v => `R$ ${v.toFixed(2)}`, invertTrend: true },
  cpa: { label: "CPA", icon: DollarSign, format: v => `R$ ${v.toFixed(2)}`, invertTrend: true },
  roas: { label: "ROAS", icon: TrendingUp, format: v => `${v.toFixed(2)}x` },
  ctr: { label: "CTR", icon: Percent, format: v => `${v.toFixed(2)}%` },
  cpc: { label: "CPC", icon: MousePointerClick, format: v => `R$ ${v.toFixed(2)}`, invertTrend: true },
  cpm: { label: "CPM", icon: Eye, format: v => `R$ ${v.toFixed(2)}`, invertTrend: true },
  conversionRate: { label: "Taxa de Conversão", icon: Target, format: v => `${v.toFixed(2)}%` },
};

export function KPIOverview({ metrics, variations, visible }: Props) {
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
            className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground truncate">{config.label}</span>
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
            </div>
            <div className="text-xl font-bold text-card-foreground">{config.format(value)}</div>
            {variation && variation.change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
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
