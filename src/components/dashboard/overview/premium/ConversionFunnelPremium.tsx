import { useMemo } from "react";

export interface FunnelStep {
  name: string;
  value: number;
  display?: string;
  subText?: string;
  subTextColor?: string;
}

interface Props {
  steps: FunnelStep[];
  summary?: { label: string; value: string }[];
}

export function ConversionFunnelPremium({ steps, summary }: Props) {
  const firstVal = steps[0]?.value || 1;

  return (
    <div className="space-y-4 py-1">
      <div className="flex flex-col gap-2.5">
        {steps.map((s, i) => {
          // A largura do funil diminui de forma suave e fixa (100%, 82%, 64%, 46%)
          const widthPct = Math.max(35, 100 - i * 18);
          
          // Taxa de conversão em relação à etapa anterior
          const prevStep = i > 0 ? steps[i - 1] : null;
          const convRate = prevStep && prevStep.value > 0 ? (s.value / prevStep.value) * 100 : null;

          return (
            <div key={s.name} className="w-full flex flex-col items-center">
              {/* Taxa de conversão e delta entre as etapas */}
              {i > 0 && (
                <div className="flex items-center justify-between w-full px-2 my-1 text-[9px] font-semibold text-muted-foreground/80">
                  {convRate !== null ? (
                    <span className="flex items-center gap-0.5">
                      ↓ {convRate.toFixed(1)}% conv.
                    </span>
                  ) : (
                    <span />
                  )}
                  {s.subText && s.subText !== "N/A" ? (
                    <span className={`${s.subTextColor || "text-primary"} font-bold`}>
                      {s.subText} vs ant.
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              )}

              {/* Segmento do funil arredondado com gradiente soft */}
              <div
                className="relative h-10 w-full flex items-center justify-between px-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/25 to-primary/10 border border-primary/20 hover:border-primary/45 hover:shadow-[0_0_12px_hsl(var(--primary)/0.12)] transition-all duration-300 overflow-hidden"
                style={{ width: `${widthPct}%` }}
              >
                {/* Brilho interno sutil */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                <span className="text-[11px] font-semibold text-foreground/90 truncate mr-2">
                  {s.name}
                </span>
                
                <span className="font-display text-[12px] font-bold text-primary font-mono shrink-0">
                  {s.display ?? s.value.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {summary && summary.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40 mt-1">
          {summary.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/20 border border-border/40 px-3 py-1 text-center">
              <div className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-0.5">
                {s.label}
              </div>
              <div className="text-[11px] font-bold text-foreground font-mono">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}