import { Lightbulb, Target, TrendingDown, Trophy, BarChart3 } from "lucide-react";

export interface InsightItem {
  icon: "best" | "channel" | "warn" | "winner" | "ticket";
  title: string;
  body: React.ReactNode;
}

const ICONS = {
  best: Lightbulb,
  channel: Target,
  warn: TrendingDown,
  winner: Trophy,
  ticket: BarChart3,
};

export function InsightsStrip({ items }: { items: InsightItem[] }) {
  if (!items.length) return null;
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
      {items.map((it, i) => {
        const Icon = ICONS[it.icon];
        return (
          <div
            key={i}
            className="flex-shrink-0 min-w-[220px] max-w-[280px] rounded-xl bg-card border border-border/60 px-4 py-3.5 hover:border-primary/30 transition-colors"
          >
            <Icon className="h-4 w-4 text-primary mb-2" />
            <div className="text-[11px] font-semibold text-foreground/80 mb-1">{it.title}</div>
            <div className="text-[11px] leading-relaxed text-muted-foreground [&_strong]:text-primary [&_strong]:font-semibold">
              {it.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}