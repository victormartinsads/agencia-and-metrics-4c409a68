import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  current?: number;
  goal?: number;
  goalLabel?: string;
  /** color of the progress bar fill */
  tone?: "primary" | "warn";
}

/** Card with title, big value, delta % and a goal/budget progress bar. */
export function ProgressMetric({ label, value, delta, current, goal, goalLabel, tone = "primary" }: Props) {
  const pct = goal && goal > 0 && current != null ? Math.min(100, (current / goal) * 100) : null;
  const deltaPositive = (delta ?? 0) >= 0;
  const fillClass =
    tone === "warn"
      ? "bg-gradient-to-r from-orange-400 to-amber-500"
      : "bg-gradient-to-r from-primary/80 to-primary";

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-card-foreground tracking-tight tabular-nums">{value}</p>
      </div>
      {delta != null && (
        <div
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
            deltaPositive ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10",
          )}
        >
          {deltaPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
      {pct != null && (
        <div className="space-y-1 pt-1">
          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden ring-1 ring-inset ring-border/50">
            <div
              className={cn("h-full rounded-full transition-all duration-700", fillClass)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/80">{pct.toFixed(0)}% da meta</p>
            {goalLabel && <p className="text-[10px] text-muted-foreground/80">{goalLabel}</p>}
          </div>
        </div>
      )}
    </div>
  );
}