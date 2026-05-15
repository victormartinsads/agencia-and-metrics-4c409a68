import { useMemo } from "react";
import { DemographicsRow } from "@/hooks/useMetaDemographics";

interface Props {
  rows?: DemographicsRow[];
  centerValue: string;
  centerLabel: string;
  extraStats?: { label: string; value: string; emphasis?: boolean }[];
}

const PALETTE = ["hsl(var(--primary))", "hsl(82 50% 35%)", "hsl(82 35% 25%)", "hsl(82 25% 18%)", "hsl(82 15% 12%)"];

function PLATFORM_LABEL(raw: string) {
  const map: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    audience_network: "Audience Net.",
    messenger: "Messenger",
    threads: "Threads",
  };
  return map[raw] || raw;
}

export function ChannelsDonut({ rows = [], centerValue, centerLabel, extraStats }: Props) {
  const data = useMemo(() => {
    const total = rows.reduce((a, b) => a + b.impressions, 0);
    if (total === 0) return [];
    return rows
      .map((r) => ({ label: PLATFORM_LABEL(r.label), pct: (r.impressions / total) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [rows]);

  // SVG donut
  const radius = 52;
  const stroke = 14;
  const c = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <div className="flex items-center gap-5">
        <div className="relative w-[130px] h-[130px] flex-shrink-0">
          <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.3} />
            {data.map((d, i) => {
              const len = (d.pct / 100) * c;
              const seg = (
                <circle
                  key={i}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke={PALETTE[i] || PALETTE[PALETTE.length - 1]}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-bold text-lg text-foreground" style={{ fontFamily: "'Syne',sans-serif" }}>{centerValue}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{centerLabel}</div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2.5">
          {data.length === 0 && <div className="text-xs text-muted-foreground">Sem dados de canais.</div>}
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i] || PALETTE[PALETTE.length - 1] }} />
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
              </div>
              <span className="text-[11px] font-bold text-foreground tabular-nums" style={{ fontFamily: "'Syne',sans-serif" }}>
                {d.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      {extraStats && extraStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-3 gap-2">
          {extraStats.map((s, i) => (
            <div key={i} className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-center">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">{s.label}</div>
              <div
                className={`text-[15px] font-bold ${s.emphasis ? "text-primary" : "text-foreground"}`}
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}