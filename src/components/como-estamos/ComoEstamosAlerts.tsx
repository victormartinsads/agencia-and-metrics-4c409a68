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
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2"
    >
      <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
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
