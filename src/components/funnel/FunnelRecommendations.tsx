import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  recommendations: string[];
}

export function FunnelRecommendations({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Recomendações Automáticas
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">Ações sugeridas com base nos dados</p>
      </div>
      <div className="p-5 space-y-2">
        {recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10"
          >
            <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <p className="text-xs text-card-foreground">{rec}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
