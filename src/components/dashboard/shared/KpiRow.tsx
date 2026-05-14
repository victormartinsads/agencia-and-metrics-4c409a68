import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: string;
  delta?: number | null;
  /** Higher-is-better? For deltas, positive shows green; if false, negative is the good one. */
  inverse?: boolean;
  icon?: LucideIcon;
  hint?: string;
  emphasis?: boolean;
}

interface Props {
  items: KpiItem[];
  className?: string;
}

/**
 * Dense KPI strip used at the top of Visão Geral, Como Estamos and Análise de Funis.
 * Same look across all dashboards — neon green only on the emphasised one.
 */
export function KpiRow({ items, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3",
        items.length <= 3 && "grid-cols-1 sm:grid-cols-3",
        items.length === 4 && "grid-cols-2 lg:grid-cols-4",
        items.length === 5 && "grid-cols-2 lg:grid-cols-5",
        items.length >= 6 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        className,
      )}
    >
      {items.map((it) => {
        const positive = (it.delta ?? 0) >= 0;
        const good = it.inverse ? !positive : positive;
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="group relative rounded-xl border border-border/60 bg-surface-elevated/60 backdrop-blur p-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80 truncate">
                {it.label}
              </p>
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
            </div>
            <p
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate",
                it.emphasis ? "text-primary" : "text-card-foreground",
              )}
              title={it.value}
            >
              {it.value}
            </p>
            {it.delta != null && Number.isFinite(it.delta) && (
              <div
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1.5 px-1.5 py-0.5 rounded-md",
                  good ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10",
                )}
              >
                {positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(it.delta).toFixed(1)}%
              </div>
            )}
            {it.hint && (
              <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{it.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}