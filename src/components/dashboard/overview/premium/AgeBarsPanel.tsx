import { useMemo } from "react";
import { useMetaDemographics } from "@/hooks/useMetaDemographics";
import { formatCurrency } from "@/lib/format";

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

interface Props {
  clientId?: string;
  datePreset: string;
  currencySymbol: string;
}

export function AgeBarsPanel({ clientId, datePreset, currencySymbol }: Props) {
  const { data, isLoading } = useMetaDemographics(clientId, datePreset, !!clientId);

  const rows = useMemo(() => {
    const ag = data?.ageGender || [];
    const map = new Map<string, number>();
    for (const r of ag) {
      // labels are "<age> • <gender>"; sum spend per age
      const age = r.label.split("•")[0].trim();
      map.set(age, (map.get(age) || 0) + r.spend);
    }
    const present = AGE_ORDER.filter((a) => map.has(a));
    const ordered = (present.length ? present : Array.from(map.keys())).map((age) => ({
      age,
      spend: map.get(age) || 0,
    }));
    return ordered;
  }, [data]);

  const max = Math.max(1, ...rows.map((r) => r.spend));
  const top = rows.slice().sort((a, b) => b.spend - a.spend)[0];

  return (
    <div className="space-y-3">
      {isLoading && <div className="text-xs text-muted-foreground py-6 text-center">Carregando…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground py-6 text-center">Sem dados demográficos no período.</div>
      )}
      {!isLoading && rows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const pct = Math.max(4, Math.round((r.spend / max) * 100));
            return (
              <div key={r.age} className="grid grid-cols-[44px_1fr_64px] items-center gap-3">
                <div className="text-[10px] text-muted-foreground font-semibold tracking-wide text-right">{r.age}</div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-right tabular-nums">
                  {formatCurrency(r.spend, currencySymbol)}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {top && (
        <div className="pt-3 mt-2 border-t border-border/60 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground">
            Faixa <strong className="text-foreground">{top.age}</strong> é a maior em investimento:{" "}
            <strong className="text-primary">{formatCurrency(top.spend, currencySymbol)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}