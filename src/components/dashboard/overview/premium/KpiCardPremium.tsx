import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
  inverse?: boolean;
  emphasis?: boolean;
  icon?: React.ReactNode;
}

export function KpiCardPremium({ label, value, delta, sub, emphasis, icon }: Omit<Props, "inverse">) {
  const isPos = delta != null && delta > 0.01;
  const isNeg = delta != null && delta < -0.01;
  const tone = delta == null
    ? "neu"
    : isPos ? "up"
    : isNeg ? "dn"
    : "neu";

  // Dynamic progress value based on comparison trend
  const progressValue = delta != null ? Math.min(100, Math.max(15, Math.round(75 + delta))) : 100;
  const progressColor = tone === "dn" ? "bg-destructive" : "bg-primary";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        {delta != null && (
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
            tone === "up" ? "text-[#a3e635] bg-[#a3e635]/10 border-[#a3e635]/20" : 
            tone === "dn" ? "text-destructive bg-destructive/10 border-destructive/20" : 
            "text-muted-foreground bg-muted border-border/30"
          }`}>
            {tone === "up" ? "+" : ""}{delta.toFixed(1)}%
          </span>
        )}
      </div>

      <div
        className={`text-2xl font-bold tracking-tight mb-2 ${
          emphasis ? "text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" : "text-foreground"
        }`}
        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
      >
        {value}
      </div>

      {/* Progress Bar & Targets */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-medium">
          <span>{sub || "vs. período anterior"}</span>
          <span>{delta != null ? `${Math.round(75 + delta)}%` : "100%"}</span>
        </div>
        <div className="w-full bg-muted-foreground/10 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>
    </div>
  );
}