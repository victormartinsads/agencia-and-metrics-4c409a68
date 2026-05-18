import { useEffect, useState } from "react";
import { Pencil, Check, RotateCcw, Trash2 } from "lucide-react";
import { KpiCardPremium } from "@/components/dashboard/overview/premium/KpiCardPremium";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSaveFunnelPeriodMetric, useDeleteFunnelPeriodMetric, presetToRange } from "@/hooks/useFunnelPeriodMetrics";

interface Props {
  clientId: string;
  funnelCode: string;
  metricKey: string;
  metricLabel: string;
  displayLabel: string;
  displayValue: string;
  sub?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
  /** Raw numeric value currently rendered (override or auto). */
  rawValue: number;
  /** Whether the rendered value comes from a manual override. */
  isManualOverride: boolean;
  /** True if this metric is fully manual (custom or in manual funnel) and can be removed. */
  isCustomMetric?: boolean;
  onCustomRemoved?: () => void;
  datePreset?: string;
  readOnly?: boolean;
}

/**
 * Wraps a KPI card with inline manual-edit popover. Persists in
 * funnel_period_metrics for the currently selected date range, so the value
 * is shared between the preview card and the Full analysis dialog.
 */
export function EditableKpiCell({
  clientId,
  funnelCode,
  metricKey,
  metricLabel,
  displayLabel,
  displayValue,
  sub,
  icon,
  emphasis,
  rawValue,
  isManualOverride,
  isCustomMetric,
  onCustomRemoved,
  datePreset,
  readOnly,
}: Props) {
  const save = useSaveFunnelPeriodMetric();
  const del = useDeleteFunnelPeriodMetric();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(rawValue ?? ""));

  useEffect(() => {
    if (open) setDraft(rawValue ? String(rawValue) : "");
  }, [open, rawValue]);

  const range = datePreset ? presetToRange(datePreset) : null;

  const handleSave = async () => {
    if (!range) return;
    const v = Number(String(draft).replace(",", "."));
    if (!Number.isFinite(v)) {
      toast.error("Valor inválido");
      return;
    }
    try {
      await save.mutateAsync({
        client_id: clientId,
        funnel_code: funnelCode,
        metric_key: metricKey,
        metric_label: metricLabel,
        metric_value: v,
        period_start: range.start,
        period_end: range.end,
        source: "manual_edit",
      });
      toast.success("Valor salvo");
      setOpen(false);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleClear = async () => {
    if (!range) return;
    try {
      await del.mutateAsync({
        client_id: clientId,
        funnel_code: funnelCode,
        metric_key: metricKey,
        period_start: range.start,
        period_end: range.end,
      });
      toast.success(isCustomMetric ? "Métrica removida" : "Voltou ao valor automático");
      setOpen(false);
      if (isCustomMetric) onCustomRemoved?.();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="relative group">
      <KpiCardPremium
        label={displayLabel}
        value={displayValue}
        sub={sub}
        emphasis={emphasis}
        icon={icon}
      />
      {isManualOverride && (
        <span
          className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-primary/15 text-primary border border-primary/30"
          title="Valor manual"
        >
          Manual
        </span>
      )}
      {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
              title="Editar valor manualmente"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Editar {metricLabel}
            </p>
            <Input
              type="number"
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="0"
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={save.isPending} className="flex-1 h-7 text-xs gap-1">
                <Check className="h-3 w-3" /> Salvar
              </Button>
              {(isManualOverride || isCustomMetric) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  disabled={del.isPending}
                  className="h-7 text-xs gap-1"
                  title={isCustomMetric ? "Remover métrica" : "Usar valor automático"}
                >
                  {isCustomMetric ? <Trash2 className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              Aplicado ao período selecionado. Sincroniza com a Análise completa.
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}