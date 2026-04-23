import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  subValue?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "muted";
  delay?: number;
  size?: "lg" | "md";
}

const ACCENTS = {
  primary: "from-primary/10 to-primary/0 border-primary/20",
  success: "from-emerald-500/10 to-emerald-500/0 border-emerald-500/20",
  warning: "from-amber-500/10 to-amber-500/0 border-amber-500/20",
  muted: "from-muted/40 to-transparent border-border",
};

export function MetricBlock({ label, value, delta, subValue, icon: Icon, accent = "primary", delay = 0, size = "md" }: Props) {
  const deltaColor =
    delta == null ? "text-muted-foreground"
    : delta > 0 ? "text-emerald-500"
    : delta < 0 ? "text-destructive"
    : "text-muted-foreground";

  const DeltaIcon = delta == null ? Minus : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm",
        "bg-gradient-to-br",
        ACCENTS[accent],
        size === "lg" ? "p-6" : "p-5",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        )}
      </div>
      <p className={cn("font-bold text-card-foreground tracking-tight", size === "lg" ? "text-3xl" : "text-2xl")}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {delta != null && (
          <div className={cn("flex items-center gap-0.5 text-xs font-semibold", deltaColor)}>
            <DeltaIcon className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
        {subValue && <p className="text-[11px] text-muted-foreground">{subValue}</p>}
      </div>
    </motion.div>
  );
}