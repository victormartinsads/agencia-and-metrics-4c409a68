import { motion } from "framer-motion";
import { FunnelMetrics } from "@/hooks/useFunnelAnalysis";
import {
  MousePointerClick, Eye, ShoppingCart, CreditCard,
  ShoppingBag, TrendingUp, DollarSign,
} from "lucide-react";

interface Props {
  metrics: FunnelMetrics;
  totalSpend: number;
  totalPurchaseValue: number;
}

export function FunnelMetricsCards({ metrics, totalSpend, totalPurchaseValue }: Props) {
  const cards = [
    { label: "Taxa de Clique (CTR)", value: `${metrics.ctrRate.toFixed(2)}%`, icon: MousePointerClick },
    { label: "Taxa de LP View", value: `${metrics.lpRate.toFixed(1)}%`, icon: Eye },
    { label: "Taxa de Add to Cart", value: `${metrics.atcRate.toFixed(1)}%`, icon: ShoppingCart },
    { label: "Taxa de Checkout", value: `${metrics.checkoutRate.toFixed(1)}%`, icon: CreditCard },
    { label: "Taxa de Compra", value: `${metrics.purchaseRate.toFixed(1)}%`, icon: ShoppingBag },
    { label: "ROAS", value: `${metrics.roas.toFixed(2)}x`, icon: TrendingUp },
    { label: "CPA", value: `R$ ${metrics.cpa.toFixed(2)}`, icon: DollarSign },
    { label: "Receita Total", value: `R$ ${totalPurchaseValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card shadow-sm p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-lg font-bold text-card-foreground">{card.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
