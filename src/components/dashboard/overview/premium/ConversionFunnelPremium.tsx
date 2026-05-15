import { useMemo } from "react";

export interface FunnelStep {
  name: string;
  value: number;
  display?: string;
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString("pt-BR");
}

interface Props {
  steps: FunnelStep[];
  /** Two summary KPIs (taxa clique→lead, taxa lead→venda) */
  summary?: { label: string; value: string }[];
}

export function ConversionFunnelPremium({ steps, summary }: Props) {
  const max = useMemo(() => Math.max(1, ...steps.map((s) => s.value)), [steps]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        {steps.map((s, i) => {
          const pct = Math.max(35, (s.value / max) * 100);
          const conv = i === 0 ? "topo" : steps[0].value > 0
            ? `${((s.value / steps[0].value) * 100).toFixed(1)}% conversão`
            : "—";
          // Lime tint per step (stronger at top, fading down)
          const tints = [1, 0.78, 0.55, 0.38];
          const tint = tints[i] ?? 0.32;
          return (
            <div key={s.name}>
              <div className="grid grid-cols-[90px_1fr_100px] items-center gap-3">
                <div className="text-[11px] text-muted-foreground font-medium text-right">{s.name}</div>
                <div className="relative h-9 flex items-center justify-center">
                  <div
                    className="absolute h-full rounded-lg flex items-center justify-center transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `hsl(var(--primary) / ${tint * 0.18})`,
                      border: `1px solid hsl(var(--primary) / ${tint * 0.45})`,
                    }}
                  >
                    <span
                      className="text-[11px] font-bold"
                      style={{ fontFamily: "'Syne',sans-serif", color: `hsl(var(--primary) / ${Math.max(0.7, tint)})` }}
                    >
                      {s.display ?? compact(s.value)}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-bold leading-none" style={{ fontFamily: "'Syne',sans-serif", color: `hsl(var(--primary) / ${Math.max(0.65, tint)})` }}>
                    {s.display ?? compact(s.value)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{conv}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="grid grid-cols-[90px_1fr_100px] gap-3 my-1">
                  <div />
                  <div className="relative h-1 mx-auto w-3/5 rounded bg-border/60 overflow-hidden">
                    <div className="absolute inset-y-0 -left-full w-full bg-primary animate-[flow_2s_ease_infinite]" />
                  </div>
                  <div />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {summary && summary.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/30 border border-border/60 px-4 py-2.5">
              <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-1">
                {s.label}
              </div>
              <div className="text-[15px] font-bold text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes flow { to { left: 100%; } }`}</style>
    </div>
  );
}