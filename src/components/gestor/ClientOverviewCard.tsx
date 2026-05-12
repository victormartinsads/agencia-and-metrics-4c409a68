import { Star, AlertTriangle, AlertOctagon, ChevronRight, Activity, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOverview } from "@/hooks/useGestorOverview";

interface Props {
  clientId: string;
  clientName: string;
  currencySymbol: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  data?: ClientOverview;
  isLoading?: boolean;
}

export function ClientOverviewCard({
  clientId, clientName, currencySymbol, isFavorite, onToggleFavorite, data, isLoading,
}: Props) {
  const severity = data?.alerts.some((a) => a.severity === "high")
    ? "high"
    : data?.alerts.length
    ? "medium"
    : "low";

  const sevColor =
    severity === "high" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : severity === "medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  return (
    <Card className="p-4 rounded-2xl border-border/60 hover:border-primary/40 transition flex flex-col gap-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-bold uppercase tracking-tight truncate">{clientName}</h3>
          <Badge className={`mt-1 text-[10px] border ${sevColor}`} variant="outline">
            {severity === "high" ? "Crítico" : severity === "medium" ? "Atenção" : "Saudável"}
          </Badge>
        </div>
        <button
          onClick={onToggleFavorite}
          className="p-1.5 rounded-lg hover:bg-accent/50 transition"
          title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : data?.error ? (
        <p className="text-[11px] text-red-400/80">{data.error}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Metric label="Gasto" value={`${currencySymbol} ${data.totalSpend.toFixed(0)}`} />
            <Metric label="Conv." value={data.totalConversions.toLocaleString("pt-BR")} />
            <Metric label="CTR" value={`${data.avgCTR.toFixed(2)}%`} />
            <Metric label="ROAS" value={data.avgROAS.toFixed(2)} />
          </div>

          {data.alerts.length > 0 ? (
            <div className="space-y-1.5 border-t border-border/50 pt-2">
              {data.alerts.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                  <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${a.severity === "high" ? "text-red-400" : "text-yellow-400"}`} />
                  <span className="text-muted-foreground line-clamp-1">{a.message}</span>
                </div>
              ))}
              {data.alerts.length > 3 && (
                <p className="text-[10px] text-muted-foreground/70">+ {data.alerts.length - 3} alertas</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400/80 border-t border-border/50 pt-2">
              <Activity className="h-3 w-3" /> Sem alertas no período
            </div>
          )}
        </>
      ) : null}

      <Button asChild size="sm" variant="outline" className="h-8 text-xs justify-between mt-auto">
        <Link to={`/gestor/${clientId}`}>
          Abrir gestor
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-accent/30 rounded-lg px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}