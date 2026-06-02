import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  AVAILABLE_METRICS,
  CustomMetric,
  MetricFormat,
  useDiagnosticMetricsConfig,
} from "@/hooks/useDiagnosticMetricsConfig";

interface Props {
  clientId: string;
  datePreset: string;
  groupKey: string;
}

export function useMetricsConfig(clientId: string, datePreset: string, groupKey: string) {
  return useDiagnosticMetricsConfig(clientId, datePreset, groupKey);
}

export function MetricsCustomizer({ clientId, datePreset, groupKey }: Props) {
  const {
    config,
    saving,
    toggleMetric,
    reorderMetrics,
    addCustomMetric,
    updateCustomMetric,
    removeCustomMetric,
    availableMetrics,
  } = useDiagnosticMetricsConfig(clientId, datePreset, groupKey);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newFormat, setNewFormat] = useState<MetricFormat>("number");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addCustomMetric({ label: newLabel.trim(), value: newValue.trim(), format: newFormat });
    setNewLabel("");
    setNewValue("");
    setNewFormat("number");
  };

  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...config.visible_metrics];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    reorderMetrics(arr);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-7 text-[11px]">
          <Settings2 className="h-3 w-3" />
          Personalizar métricas
          {saving && <span className="text-primary text-[9px]">salvando…</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-5">
          {/* Métricas padrão */}
          <div>
            <h4 className="text-sm font-bold text-card-foreground mb-2">Métricas padrão</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              Escolha quais aparecem e em que ordem.
            </p>
            <div className="space-y-1.5 mb-3">
              {config.visible_metrics.map((key, idx) => {
                const meta = availableMetrics.find(m => m.key === key);
                if (!meta) return null;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-border bg-muted/30"
                  >
                    <span className="text-xs flex-1">{meta.label}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, 1)} disabled={idx === config.visible_metrics.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => toggleMetric(key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-2 space-y-1">
              <p className="text-[11px] text-muted-foreground mb-1">Adicionar métrica padrão:</p>
              {availableMetrics.filter(m => !config.visible_metrics.includes(m.key)).map(m => (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted/50"
                >
                  <Plus className="h-3 w-3 text-primary" /> {m.label}
                </button>
              ))}
              {availableMetrics.every(m => config.visible_metrics.includes(m.key)) && (
                <p className="text-[11px] text-muted-foreground italic">Todas adicionadas.</p>
              )}
            </div>
          </div>

          {/* Métricas manuais */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-bold text-card-foreground mb-2">Métricas manuais</h4>
            <p className="text-[11px] text-muted-foreground mb-3">
              Adicione métricas customizadas (ex: "Vendas confirmadas", "ROI", etc.)
            </p>

            {config.custom_metrics.length > 0 && (
              <div className="space-y-2 mb-3">
                {config.custom_metrics.map(m => (
                  <CustomMetricRow
                    key={m.id}
                    metric={m}
                    onChange={patch => updateCustomMetric(m.id, patch)}
                    onRemove={() => removeCustomMetric(m.id)}
                  />
                ))}
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Nome</Label>
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value.slice(0, 50))}
                    placeholder="Ex: Vendas confirmadas"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Valor</Label>
                  <Input
                    value={newValue}
                    onChange={e => setNewValue(e.target.value.slice(0, 30))}
                    placeholder="Ex: 12 ou 1500.50"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Formato</Label>
                <Select value={newFormat} onValueChange={v => setNewFormat(v as MetricFormat)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="currency">Moeda</SelectItem>
                    <SelectItem value="percent">Percentual</SelectItem>
                    <SelectItem value="text">Texto livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full h-8 gap-1" onClick={handleAdd} disabled={!newLabel.trim()}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CustomMetricRow({
  metric,
  onChange,
  onRemove,
}: {
  metric: CustomMetric;
  onChange: (p: Partial<CustomMetric>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-border p-2 space-y-1.5 bg-muted/20">
      <div className="flex items-center gap-1">
        <Input
          value={metric.label}
          onChange={e => onChange({ label: e.target.value.slice(0, 50) })}
          className="h-7 text-xs flex-1"
          placeholder="Nome"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <Input
          value={metric.value}
          onChange={e => onChange({ value: e.target.value.slice(0, 30) })}
          className="h-7 text-xs"
          placeholder="Valor"
        />
        <Select value={metric.format} onValueChange={v => onChange({ format: v as MetricFormat })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Número</SelectItem>
            <SelectItem value="currency">Moeda</SelectItem>
            <SelectItem value="percent">%</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
