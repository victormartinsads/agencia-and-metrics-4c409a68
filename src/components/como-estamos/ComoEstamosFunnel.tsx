import { useMemo } from "react";
import { motion } from "framer-motion";
import { Campaign } from "@/data/mockMetaData";

interface Props {
  campaigns: Campaign[];
}

export function ComoEstamosFunnel({ campaigns }: Props) {
  const steps = useMemo(() => {
    const active = campaigns.filter(c => c.spend > 0);
    const impressions = active.reduce((s, c) => s + c.impressions, 0);
    const clicks = active.reduce((s, c) => s + c.clicks, 0);
    const leads = active.filter(c => c.primaryResultKey === "lead").reduce((s, c) => s + c.conversions, 0);
    const purchases = active.reduce((s, c) => s + (c.purchases || 0), 0);
    const results = active.reduce((s, c) => s + c.conversions, 0);

    return [
      { label: "Impressões", value: impressions },
      { label: "Cliques", value: clicks, rate: impressions > 0 ? (clicks / impressions * 100) : 0 },
      { label: "Leads / Resultados", value: leads || results, rate: clicks > 0 ? ((leads || results) / clicks * 100) : 0 },
      { label: "Vendas", value: purchases, rate: (leads || results) > 0 ? (purchases / (leads || results) * 100) : 0 },
    ];
  }, [campaigns]);

  const maxValue = steps[0]?.value || 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-bold text-card-foreground">🔻 Visualização de Funil</h3>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-1 max-w-lg mx-auto">
          {steps.map((step, i) => {
            const width = Math.max(20, (step.value / maxValue) * 100);
            const isBottleneck = step.rate !== undefined && step.rate < 2 && i > 0 && step.value > 0;
            return (
              <div key={step.label} className="flex flex-col items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`rounded-lg py-3 px-4 text-center ${isBottleneck ? "bg-red-500/20 border border-red-500/30" : "bg-primary/15 border border-primary/20"}`}
                >
                  <p className="text-xs font-semibold text-card-foreground">{step.label}</p>
                  <p className="text-lg font-bold text-primary">{step.value.toLocaleString("pt-BR")}</p>
                </motion.div>
                {step.rate !== undefined && (
                  <div className={`text-[10px] font-medium py-0.5 ${isBottleneck ? "text-red-400" : "text-muted-foreground"}`}>
                    ↓ {step.rate.toFixed(1)}% {isBottleneck && "⚠️ Gargalo"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
