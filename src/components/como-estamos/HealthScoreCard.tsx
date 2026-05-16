import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { HealthScore } from "@/hooks/useComoEstamos";

interface Props {
  health: HealthScore;
}

export function HealthScoreCard({ health }: Props) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40" fill="none"
            stroke={health.score >= 70 ? "hsl(var(--meta-green))" : health.score >= 50 ? "hsl(25, 95%, 53%)" : "hsl(var(--destructive))"}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-xl font-bold ${health.color}`}
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >{health.score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/80">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span>Score de Saúde</span>
        </div>
        <span
          className={`font-display text-[22px] leading-none font-bold tracking-tight ${health.color}`}
          style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
        >
          {health.label}
        </span>
      </div>
    </motion.div>
  );
}
