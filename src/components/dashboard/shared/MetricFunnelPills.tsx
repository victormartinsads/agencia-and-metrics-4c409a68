import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface FunnelPill {
  label: string;
  value: string;
  /** 0–100, how full the pill should appear (relative to the previous step). */
  pct?: number;
  delta?: number | null;
  inverse?: boolean;
}

interface Props {
  steps: FunnelPill[];
  className?: string;
}

/**
 * Vertical funnel of pill-shaped metric cards (visual reference: the dashboard
 * template the user shared). Each pill auto-scales to highlight the funnel drop-off.
 */
export function MetricFunnelPills({ steps, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {steps.map((s, i) => {
        const widthPct = Math.max(45, Math.min(100, s.pct ?? 100 - i * 12));
        const positive = (s.delta ?? 0) >= 0;
        const good = s.inverse ? !positive : positive;
        return (
          <div
            key={s.label}
            className="relative rounded-full border border-border/60 bg-surface-elevated/70 backdrop-blur px-4 py-2.5 text-center transition-all hover:border-primary/40"
            style={{ width: `${widthPct}%`, minWidth: 140 }}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 truncate">
              {s.label}
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">{s.value}</p>
            {s.delta != null && Number.isFinite(s.delta) && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[9px] font-semibold mt-0.5 px-1 rounded",
                  good ? "text-primary" : "text-destructive",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" />
                )}
                {Math.abs(s.delta).toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}