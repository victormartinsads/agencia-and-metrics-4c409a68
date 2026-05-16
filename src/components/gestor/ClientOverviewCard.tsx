import { useState } from "react";
import { Star, AlertTriangle, AlertOctagon, ChevronRight, Activity, Loader2, Pencil, Heart, ListChecks, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientOverview } from "@/hooks/useGestorOverview";
import { useAllClientManagerMeta, useUpsertClientHealth } from "@/hooks/useClientManagerMeta";
import { useClientTasksCount } from "@/hooks/useClientTasks";
import { ClientTasksDialog } from "./ClientTasksDialog";
import { toast } from "sonner";

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
  const { data: healthMap } = useAllClientManagerMeta();
  const upsertHealth = useUpsertClientHealth();
  const { data: tasksCount } = useClientTasksCount(clientId);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [editingHealth, setEditingHealth] = useState(false);
  const [healthDraft, setHealthDraft] = useState<string>("");
  const healthScore = healthMap?.[clientId] ?? null;

  const startEditHealth = () => {
    setHealthDraft(healthScore !== null ? String(healthScore) : "");
    setEditingHealth(true);
  };
  const saveHealth = async () => {
    const n = healthDraft.trim() === "" ? null : Math.max(0, Math.min(10, Number(healthDraft)));
    if (n !== null && Number.isNaN(n)) { toast.error("Valor inválido"); return; }
    try {
      await upsertHealth.mutateAsync({ clientId, score: n });
      setEditingHealth(false);
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const healthColor = healthScore == null ? "text-muted-foreground"
    : healthScore >= 8 ? "text-emerald-400"
    : healthScore >= 5 ? "text-yellow-400"
    : "text-red-400";

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
    <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 flex flex-col gap-3 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight truncate">{clientName}</h3>
          <Badge className={`mt-1 text-[10px] border ${sevColor}`} variant="outline">
            {severity === "high" ? "Crítico" : severity === "medium" ? "Atenção" : "Saudável"}
          </Badge>
        </div>
        {/* Health input — replaces star at top-right */}
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-accent/30 px-2 py-1 shrink-0">
          <Heart className={`h-3 w-3 ${healthColor}`} />
          {editingHealth ? (
            <>
              <Input
                autoFocus
                value={healthDraft}
                onChange={(e) => setHealthDraft(e.target.value)}
                onBlur={saveHealth}
                onKeyDown={(e) => { if (e.key === "Enter") saveHealth(); if (e.key === "Escape") setEditingHealth(false); }}
                className="h-5 w-9 px-1 text-xs font-display tabular-nums text-center"
                inputMode="numeric"
              />
              <span className="text-[10px] text-muted-foreground">/10</span>
            </>
          ) : (
            <button
              onClick={startEditHealth}
              className="flex items-center gap-1 group"
              title="Editar saúde do cliente"
            >
              <span className={`font-display text-xs font-bold tabular-nums ${healthColor}`}>
                {healthScore !== null ? healthScore : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">/10</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
            </button>
          )}
        </div>
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
              {data.alerts.slice(0, 4).map((a, i) => {
                const isAccountAlert = a.message.includes(":") && (
                  a.message.toLowerCase().includes("conta") ||
                  a.message.toLowerCase().includes("pagamento") ||
                  a.message.toLowerCase().includes("fechada") ||
                  a.message.toLowerCase().includes("desabilitada") ||
                  a.message.toLowerCase().includes("encerrada") ||
                  a.message.toLowerCase().includes("saldo")
                );
                const Icon = isAccountAlert ? AlertOctagon : AlertTriangle;
                const iconColor = a.severity === "high"
                  ? (isAccountAlert ? "text-red-400" : "text-red-400")
                  : "text-yellow-400";
                return (
                  <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                    <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${iconColor}`} />
                    <span className={`line-clamp-1 ${isAccountAlert ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {a.message}
                    </span>
                  </div>
                );
              })}
              {data.alerts.length > 4 && (
                <p className="text-[10px] text-muted-foreground/70">+ {data.alerts.length - 4} alertas</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400/80 border-t border-border/50 pt-2">
              <Activity className="h-3 w-3" /> Sem alertas no período
            </div>
          )}
        </>
      ) : null}

      <div className="mt-auto flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs flex-1 justify-center gap-1.5"
          onClick={() => setTasksOpen(true)}
        >
          <ListChecks className="h-3.5 w-3.5" />
          Tarefas
          {tasksCount && tasksCount.open > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold px-1">
              {tasksCount.open}
            </span>
          )}
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs flex-1 justify-between">
          <Link to={`/gestor/${clientId}`}>
            Abrir
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <button
          onClick={onToggleFavorite}
          className="h-8 w-8 grid place-items-center rounded-md border border-border/60 hover:bg-accent/50 transition shrink-0"
          title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      </div>

      <ClientTasksDialog
        open={tasksOpen}
        onOpenChange={setTasksOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-accent/30 rounded-lg px-2 py-1.5 border border-border/40">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}