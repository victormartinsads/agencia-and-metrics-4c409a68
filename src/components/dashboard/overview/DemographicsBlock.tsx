import { useMemo, useState } from "react";
import { useMetaDemographics, DemographicsRow } from "@/hooks/useMetaDemographics";
import { formatCurrency } from "@/lib/format";
import { Loader2, Users, MapPin, Globe2 } from "lucide-react";

type Tab = "ageGender" | "region" | "country";

interface Props {
  clientId?: string;
  datePreset: string;
  currencySymbol: string;
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
      <div className="h-full bg-primary/80 neon-glow" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({ row, max, currencySymbol }: { row: DemographicsRow; max: number; currencySymbol: string }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-xs py-1.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <div className="col-span-4 truncate font-medium text-card-foreground">{row.label}</div>
      <div className="col-span-4"><Bar value={row.spend} max={max} /></div>
      <div className="col-span-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.spend, currencySymbol)}</div>
      <div className="col-span-1 text-right tabular-nums text-muted-foreground">{row.reach.toLocaleString("pt-BR")}</div>
      <div className="col-span-1 text-right tabular-nums text-primary font-semibold">{row.results.toLocaleString("pt-BR")}</div>
    </div>
  );
}

export function DemographicsBlock({ clientId, datePreset, currencySymbol }: Props) {
  const { data, isLoading } = useMetaDemographics(clientId, datePreset, !!clientId);
  const [tab, setTab] = useState<Tab>("ageGender");

  const rows = useMemo<DemographicsRow[]>(() => {
    const base = (data?.[tab] || []) as DemographicsRow[];
    return base.slice(0, 8);
  }, [data, tab]);

  const max = useMemo(() => rows.reduce((m, r) => Math.max(m, r.spend), 0), [rows]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "ageGender", label: "Idade & Gênero", icon: Users },
    { id: "region", label: "Região", icon: MapPin },
    { id: "country", label: "País", icon: Globe2 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 ${
                active
                  ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                  : "text-muted-foreground hover:text-foreground border border-white/5 bg-black/20 hover:bg-black/40"
              }`}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5 pb-1">
        <div className="col-span-4">Segmento</div>
        <div className="col-span-4">Distribuição (gasto)</div>
        <div className="col-span-2 text-right">Gasto</div>
        <div className="col-span-1 text-right">Alcance</div>
        <div className="col-span-1 text-right">Result.</div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando dados demográficos…
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground py-6 text-center">
          Sem dados demográficos no período (verifique permissões da Meta API).
        </div>
      )}
      {!isLoading && rows.map((r) => (
        <Row key={r.label} row={r} max={max} currencySymbol={currencySymbol} />
      ))}
    </div>
  );
}