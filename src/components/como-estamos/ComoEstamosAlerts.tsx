import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  alerts: string[];
}

export function ComoEstamosAlerts({ alerts }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2"
    >
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />
      <div
        className="flex items-center gap-2 text-yellow-400 text-[10px] uppercase tracking-[0.1em] font-semibold"
      >
        <AlertTriangle className="h-4 w-4" />
        ⚠️ Alertas de Performance
      </div>
      <ul className="space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-yellow-500 mt-0.5">•</span>
            {a}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
