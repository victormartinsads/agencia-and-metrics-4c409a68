import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  progressValue?: number; // 0 to 100
  progressColor?: string; // e.g. bg-primary, bg-emerald-500, etc.
  targetLabel?: string;
  targetValue?: string;
  delay?: number;
}

export function KpiCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  progressValue = 100,
  progressColor = "bg-primary",
  targetLabel,
  targetValue,
  delay = 0
}: KpiCardProps) {
  // Determine color for change pill
  const changeColor = 
    changeType === "positive" ? "text-[#a3e635] bg-[#a3e635]/10 border-[#a3e635]/20" :
    changeType === "negative" ? "text-destructive bg-destructive/10 border-destructive/20" : 
    "text-muted-foreground bg-muted border-border/30";

  const showProgress = targetLabel || targetValue || progressValue !== 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </span>
        {change && (
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${changeColor}`}>
            {change.startsWith("+") || change.startsWith("-") || change === "N/A" ? change : `+${change}`}
          </span>
        )}
      </div>

      <div 
        className="text-2xl font-bold tracking-tight text-foreground"
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
      >
        {value}
      </div>

      {/* Progress Bar & Targets */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-medium">
          <span>{targetLabel || "da meta"}</span>
          <span>{targetValue || "—"}</span>
        </div>
        <div className="w-full bg-muted-foreground/10 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, progressValue)}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
