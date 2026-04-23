import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  align?: "left" | "center";
  /** Highlights the value with neon styling */
  emphasis?: boolean;
}

export function MiniMetric({ label, value, delta, align = "left", emphasis }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn("group/metric", align === "center" && "text-center")}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-bold tracking-tight mt-1.5 tabular-nums",
          emphasis ? "neon-text" : "text-card-foreground",
        )}
      >
        {value}
      </p>
      {delta != null && (
        <div
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md",
            positive
              ? "text-primary bg-primary/10"
              : "text-destructive bg-destructive/10",
            align === "center" && "justify-center",
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}