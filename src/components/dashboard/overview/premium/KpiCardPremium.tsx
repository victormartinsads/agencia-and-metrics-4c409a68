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
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/60 px-5 pt-4 pb-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30">
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/80 mb-2.5">
        <span>{label}</span>
        {icon && <span className="text-primary/70">{icon}</span>}
      </div>
      <div
        className={`font-display text-[26px] leading-none font-bold tracking-tight mb-2 ${
          emphasis ? "text-primary" : "text-foreground"
        }`}
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
      >
        {value}
      </div>
      <div className="flex items-center gap-1.5">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
            tone === "up" ? "text-primary" : tone === "dn" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {tone === "up" ? <ArrowUpRight className="h-3 w-3" /> : tone === "dn" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-[10px] text-muted-foreground/70">{sub}</span>}
      </div>
    </div>
  );
}