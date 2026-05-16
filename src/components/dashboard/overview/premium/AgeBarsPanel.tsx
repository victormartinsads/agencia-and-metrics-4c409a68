import { useMemo } from "react";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";

const AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

interface Props {
  clientId?: string;
  datePreset: string;
  currencySymbol: string;
}

export function AgeBarsPanel({ clientId, datePreset, currencySymbol }: Props) {
  const { data, isLoading } = useGoogleAnalytics(clientId, datePreset, !!clientId);

  const rows = useMemo(() => {
    const ag = data?.ageDemographics || [];
    const map = new Map<string, number>();
    for (const r of ag) {
      const age = (r.age || "").trim();
      if (!age || age === "unknown") continue;
      map.set(age, (map.get(age) || 0) + (r.sessions || 0));
    }
    const present = AGE_ORDER.filter((a) => map.has(a));
    const keys = present.length ? present : Array.from(map.keys());
    return keys.map((age) => ({ age, sessions: map.get(age) || 0 }));
  }, [data]);

  const max = Math.max(1, ...rows.map((r) => r.sessions));
  const total = rows.reduce((a, b) => a + b.sessions, 0);
  const top = rows.slice().sort((a, b) => b.sessions - a.sessions)[0];

  return (
    <div className="space-y-3">
      {isLoading && <div className="text-xs text-muted-foreground py-6 text-center">Carregando…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground py-6 text-center">
          Sem dados demográficos no GA4. Verifique se "Sinais do Google" está ativo na propriedade.
        </div>
      )}
      {!isLoading && rows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const pct = Math.max(4, Math.round((r.sessions / max) * 100));
            const share = total > 0 ? Math.round((r.sessions / total) * 100) : 0;
            return (
              <div key={r.age} className="grid grid-cols-[48px_1fr_72px] items-center gap-3">
                <div className="text-[10px] text-muted-foreground font-semibold tracking-wide text-right">{r.age}</div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-right tabular-nums">
                  {r.sessions.toLocaleString("pt-BR")} ({share}%)
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
            <strong className="text-primary">{top.sessions.toLocaleString("pt-BR")} sessões</strong>
          </span>
        </div>
      )}
    </div>
  );
}