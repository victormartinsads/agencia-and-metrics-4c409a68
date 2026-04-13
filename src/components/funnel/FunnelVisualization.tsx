import { motion } from "framer-motion";
import { FunnelStep } from "@/hooks/useFunnelAnalysis";
import { ArrowDown } from "lucide-react";

interface Props {
  steps: FunnelStep[];
}

export function FunnelVisualization({ steps }: Props) {
  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Funil de Conversão</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Volume, taxa de conversão e custo por etapa</p>
      </div>
      <div className="p-6 flex flex-col items-center gap-1">
        {steps.map((step, i) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 15);
          const colors = [
            "from-blue-500 to-blue-600",
            "from-cyan-500 to-cyan-600",
            "from-teal-500 to-teal-600",
            "from-emerald-500 to-emerald-600",
            "from-green-500 to-green-600",
            "from-primary to-primary/80",
          ];

          return (
            <div key={step.label} className="w-full flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`bg-gradient-to-r ${colors[i % colors.length]} rounded-lg px-4 py-3 flex items-center justify-between text-white relative`}
                style={{ width: `${widthPercent}%`, minWidth: "200px" }}
              >
                <span className="text-xs font-medium truncate">{step.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{step.value.toLocaleString("pt-BR")}</span>
                  {step.costPer !== undefined && step.costPer > 0 && (
                    <span className="text-[10px] opacity-80">
                      R$ {step.costPer.toFixed(2)}
                    </span>
                  )}
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="flex items-center gap-2 py-1">
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {step.rate !== undefined && steps[i + 1]?.rate !== undefined && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {steps[i + 1].rate!.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
