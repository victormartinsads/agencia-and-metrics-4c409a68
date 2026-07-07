import { useState } from "react";
import { Star, AlertTriangle, AlertOctagon, Loader2, Pencil, Heart, ListChecks, BookOpen, LayoutDashboard, ExternalLink, Eye } from "lucide-react";
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
  monthlyRevenueGoal: number | null;
  adAccountId: string | null;
}

export function ClientOverviewCard({
  clientId, clientName, currencySymbol, isFavorite, onToggleFavorite, data, isLoading, monthlyRevenueGoal, adAccountId
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

  const adsManagerUrl = adAccountId
    ? "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=" + adAccountId.replace("act_", "")
    : "https://adsmanager.facebook.com";

  return (
    <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60 hover:border-primary/40 transition-all flex flex-col gap-3 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
      
      {/* Header: Title, Favorite, Health */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-tight truncate flex-1" title={clientName}>
              {clientName}
            </h3>
            <button
              onClick={onToggleFavorite}
              className="p-1 text-muted-foreground hover:text-yellow-400 transition shrink-0"
              title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            >
              <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[9px] px-1.5 py-0 border ${sevColor}`} variant="outline">
              {severity === "high" ? "Crítico" : severity === "medium" ? "Atenção" : "Saudável"}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[9px] uppercase font-bold gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/20"
              onClick={() => setTasksOpen(true)}
            >
              <ListChecks className="h-3 w-3" />
              Tarefas
              {tasksCount && tasksCount.open > 0 && (
                <span className="inline-flex items-center justify-center min-w-[14px] h-3.5 rounded-full bg-primary/20 text-primary text-[8px] font-bold px-1 select-none">
                  {tasksCount.open}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Health input */}
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
              title="Editar saúde"
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

      {/* Metrics & Alerts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : data?.error ? (
        <p className="text-[11px] text-red-400/80">{data.error}</p>
      ) : data ? (
        <>
          {/* Valor Investido e Meta de Faturamento */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Metric label="Investido" value={`${currencySymbol} ${(data.totalSpend || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
            <Metric
              label="Meta Fat."
              value={
                monthlyRevenueGoal !== null
                  ? `${currencySymbol} ${monthlyRevenueGoal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                  : "—"
              }
            />
          </div>

          {data.alerts.length > 0 ? (
            <div className="space-y-1.5 border-t border-border/50 pt-2">
              {data.alerts.slice(0, 2).map((a, i) => {
                const isAccountAlert = a.message.includes(":") && (
                  a.message.toLowerCase().includes("conta") ||
                  a.message.toLowerCase().includes("pagamento") ||
                  a.message.toLowerCase().includes("fechada") ||
                  a.message.toLowerCase().includes("desabilitada") ||
                  a.message.toLowerCase().includes("encerrada") ||
                  a.message.toLowerCase().includes("saldo")
                );
                const Icon = isAccountAlert ? AlertOctagon : AlertTriangle;
                const iconColor = a.severity === "high" ? "text-red-400" : "text-yellow-400";
                return (
                  <div key={i} className="flex items-start gap-1.5 text-[10.5px]">
                    <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${iconColor}`} />
                    <span className={`line-clamp-1 ${isAccountAlert ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {a.message}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-400/80 border-t border-border/50 pt-2">
              Sem alertas no período
            </div>
          )}
        </>
      ) : null}

      {/* Action Navigation Buttons */}
      <div className="mt-auto flex items-center gap-1 bg-muted/25 border border-border/50 rounded-xl p-1">
        <Button asChild size="sm" variant="ghost" className="h-8 text-[11px] font-bold flex-1 gap-1 px-1 text-muted-foreground hover:text-foreground">
          <Link to={`/dashboard/${clientId}?tab=diario`}>
            <BookOpen className="h-3.5 w-3.5" />
            Diário
          </Link>
        </Button>
        <div className="w-px h-4 bg-border/40 shrink-0" />
        <Button asChild size="sm" variant="ghost" className="h-8 text-[11px] font-bold flex-1 gap-1 px-1 text-muted-foreground hover:text-foreground">
          <Link to={`/dashboard/${clientId}`}>
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dash
          </Link>
        </Button>
        <div className="w-px h-4 bg-border/40 shrink-0" />
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-8 text-[11px] font-bold flex-1 gap-1 px-1 bg-[#b5f23d]/10 text-[#b5f23d] hover:bg-[#b5f23d]/20 hover:text-[#b5f23d]"
          title="Abrir Visão Editor (Gerenciador Proprietário)"
        >
          <Link to={`/ferramentas-do-gestor?tab=meta-ads&editor=${clientId}`}>
            <Eye className="h-3.5 w-3.5" />
            Editor
          </Link>
        </Button>
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
    <div className="bg-accent/20 rounded-lg px-2 py-1 border border-border/40">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground select-none font-bold">{label}</p>
      <p className="font-display text-[13px] font-extrabold tabular-nums tracking-tight mt-0.5">{value}</p>
    </div>
  );
}