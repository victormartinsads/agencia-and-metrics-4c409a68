import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  align?: "left" | "center";
}

export function MiniMetric({ label, value, delta, align = "left" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={cn(align === "center" && "text-center")}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-card-foreground tracking-tight mt-1">{value}</p>
      {delta != null && (
        <div className={cn("flex items-center gap-0.5 text-[10px] font-semibold mt-0.5", positive ? "text-primary" : "text-destructive", align === "center" && "justify-center")}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}