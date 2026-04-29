import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, Save, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useFunnelStages,
  useSaveFunnelStages,
  AVAILABLE_METRICS,
  DEFAULT_STAGES,
} from "@/hooks/useFunnelStages";
import { toast } from "sonner";

export interface OverviewFunnelMetricSource {
  /** Map of metric_key -> resolved numeric value for current period */
  current: Record<string, number>;
  /** Map of metric_key -> resolved numeric value for previous period */
  previous?: Record<string, number>;
}

interface Props {
  clientId: string;
  metrics: OverviewFunnelMetricSource;
  /** Extra metric keys (besides AVAILABLE_METRICS) the dashboard can resolve */
  extraMetricLabels?: { key: string; label: string }[];
  /** Optional scope key (e.g. "F1", "F2") to persist a separate funnel per group. */
  campaignId?: string | null;
}

interface StageRow {
  name: string;
  metric_key: string;
  sort_order: number;
}

export function EditableOverviewFunnel({ clientId, metrics, extraMetricLabels = [], campaignId = null }: Props) {
  const { data: savedStages } = useFunnelStages(clientId, campaignId);
  const saveMutation = useSaveFunnelStages();
  const [stages, setStages] = useState<StageRow[]>([]);
  const [editing, setEditing] = useState(false);

  const allMetrics = useMemo(
    () => [...AVAILABLE_METRICS, ...extraMetricLabels.filter(
      (m) => !AVAILABLE_METRICS.find((x) => x.key === m.key),
    )],
    [extraMetricLabels],
  );

  useEffect(() => {
    if (savedStages && savedStages.length > 0) {
      setStages(savedStages.map((s) => ({ name: s.name, metric_key: s.metric_key, sort_order: s.sort_order })));
    } else {
      setStages(DEFAULT_STAGES.map((s) => ({ ...s })));
    }
  }, [savedStages]);

  const addStage = () =>
    setStages((p) => [...p, { name: "Nova Etapa", metric_key: "clicks", sort_order: p.length }]);
  const removeStage = (i: number) => setStages((p) => p.filter((_, idx) => idx !== i));
  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    setStages((p) => {
      const a = [...p];
      [a[i], a[j]] = [a[j], a[i]];
      return a.map((s, k) => ({ ...s, sort_order: k }));
    });
  };
  const updateStage = (i: number, field: "name" | "metric_key", v: string) =>
    setStages((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)));

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ clientId, campaignId, stages });
      toast.success("Funil salvo");
      setEditing(false);
    } catch {
      toast.error("Erro ao salvar funil");
    }
  };

  const handleReset = () => setStages(DEFAULT_STAGES.map((s) => ({ ...s })));

  const stepsData = stages.map((s) => ({
    ...s,
    value: Number(metrics.current[s.metric_key] || 0),
    prev: Number(metrics.previous?.[s.metric_key] || 0),
  }));

  const maxValue = Math.max(...stepsData.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)} className="text-xs gap-1 h-7">
          <Pencil className="h-3 w-3" /> {editing ? "Visualizar" : "Editar funil"}
        </Button>
        {editing && (
          <>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1 h-7">
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="text-xs gap-1 h-7">
              <Save className="h-3 w-3" /> Salvar
            </Button>
          </>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
              <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <GripVertical className="h-3 w-3" />
              </button>
              <Input
                value={stage.name}
                onChange={(e) => updateStage(i, "name", e.target.value)}
                className="h-8 text-xs flex-1"
                placeholder="Nome da etapa"
              />
              <Select value={stage.metric_key} onValueChange={(v) => updateStage(i, "metric_key", v)}>
                <SelectTrigger className="h-8 text-xs w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allMetrics.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={() => removeStage(i)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addStage} className="w-full text-xs gap-1 mt-2">
            <Plus className="h-3 w-3" /> Adicionar etapa
          </Button>
        </div>
      ) : (
        <FunnelShape steps={stepsData} maxValue={maxValue} />
      )}
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
}

function pct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

function FunnelShape({
  steps,
  maxValue,
}: {
  steps: { name: string; value: number; prev: number }[];
  maxValue: number;
}) {
  // Real funnel shape: each segment narrower than the previous (trapezoid stack)
  const minWidthPct = 22;
  const stepCount = steps.length;

  return (
    <div className="flex flex-col items-center gap-1.5 max-w-2xl mx-auto">
      {steps.map((s, i) => {
        // Width based on rank position so it always looks like a funnel
        const rankWidth = 100 - (i / Math.max(1, stepCount - 1)) * (100 - minWidthPct);
        // Also factor real value so big drops look bigger (50% from rank, 50% from data)
        const dataWidth = Math.max(minWidthPct, (s.value / maxValue) * 100);
        const widthPct = Math.max(minWidthPct, (rankWidth + dataWidth) / 2);

        const prevValue = i > 0 ? steps[i - 1].value : 0;
        const conversion = prevValue > 0 ? (s.value / prevValue) * 100 : null;
        const delta = pct(s.value, s.prev);

        return (
          <div key={i} className="w-full flex flex-col items-center">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${widthPct}%`, opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="relative h-14 flex items-center justify-between px-5 text-primary-foreground"
              style={{
                clipPath:
                  i === 0
                    ? "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
                    : i === stepCount - 1
                    ? "polygon(5% 0, 95% 0, 80% 100%, 20% 100%)"
                    : "polygon(3% 0, 97% 0, 92% 100%, 8% 100%)",
                background:
                  "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 50%, hsl(var(--primary)/0.55) 100%)",
              }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider drop-shadow-sm">
                {s.name}
              </span>
              <span className="text-base font-extrabold tabular-nums drop-shadow-sm">
                {fmt(s.value)}
              </span>
            </motion.div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px]">
              {conversion != null && i > 0 && (
                <span className="text-muted-foreground font-medium">
                  ↓ {conversion.toFixed(1)}%
                </span>
              )}
              {delta != null && (
                <span
                  className={
                    delta >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"
                  }
                >
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}