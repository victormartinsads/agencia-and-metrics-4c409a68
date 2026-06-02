import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { groupCampaignsByFunnel } from "@/lib/funnelGrouping";
import {
  AVAILABLE_METRICS,
  type CustomMetric,
  type MetricFormat,
  type MetricsConfig,
} from "@/hooks/useDiagnosticMetricsConfig";
import { useUpdateSavedDiagnostic, type SavedDiagnostic } from "@/hooks/useSavedDiagnostics";

interface Props {
  item: SavedDiagnostic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VISIBLE = ["spend", "conversions", "cpa", "ctr", "cpm", "reach"];

export function EditSavedDiagnosticDialog({ item, open, onOpenChange }: Props) {
  const update = useUpdateSavedDiagnostic();
  const [title, setTitle] = useState(item.title);
  const [snapshot, setSnapshot] = useState<any>(() => JSON.parse(JSON.stringify(item.snapshot || {})));

  const blocks = snapshot.blocks || { positives: "", negatives: "", manager_actions: "", client_requests: "" };
  const metricsConfig: Record<string, MetricsConfig> = snapshot.metricsConfig || {};
  const groups = useMemo(() => groupCampaignsByFunnel(snapshot.campaigns || []), [snapshot.campaigns]);

  const setBlock = (key: string, value: string) =>
    setSnapshot((s: any) => ({ ...s, blocks: { ...(s.blocks || {}), [key]: value } }));

  const ensureGroupCfg = (key: string): MetricsConfig =>
    metricsConfig[key] || { visible_metrics: DEFAULT_VISIBLE, custom_metrics: [] };

  const updateGroupCfg = (key: string, next: MetricsConfig) =>
    setSnapshot((s: any) => ({
      ...s,
      metricsConfig: { ...(s.metricsConfig || {}), [key]: next },
    }));

  const toggleMetric = (groupKey: string, metricKey: string) => {
    const cfg = ensureGroupCfg(groupKey);
    const visible = cfg.visible_metrics.includes(metricKey)
      ? cfg.visible_metrics.filter(k => k !== metricKey)
      : [...cfg.visible_metrics, metricKey];
    updateGroupCfg(groupKey, { ...cfg, visible_metrics: visible });
  };

  const addCustom = (groupKey: string) => {
    const cfg = ensureGroupCfg(groupKey);
    const m: CustomMetric = { id: crypto.randomUUID(), label: "Nova métrica", value: "0", format: "number" };
    updateGroupCfg(groupKey, { ...cfg, custom_metrics: [...cfg.custom_metrics, m] });
  };

  const updateCustom = (groupKey: string, id: string, patch: Partial<CustomMetric>) => {
    const cfg = ensureGroupCfg(groupKey);
    updateGroupCfg(groupKey, {
      ...cfg,
      custom_metrics: cfg.custom_metrics.map(m => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  const removeCustom = (groupKey: string, id: string) => {
    const cfg = ensureGroupCfg(groupKey);
    updateGroupCfg(groupKey, { ...cfg, custom_metrics: cfg.custom_metrics.filter(m => m.id !== id) });
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: item.id,
        client_id: item.client_id,
        title,
        snapshot,
      });
      toast.success("Diagnóstico atualizado");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar diagnóstico");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar diagnóstico salvo</SheetTitle>
          <SheetDescription>
            Ajuste título, anotações, blocos do diagnóstico e métricas manuais por funil.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>O que fizemos</Label>
            <Textarea
              value={snapshot.whatWeDid || ""}
              onChange={e => setSnapshot((s: any) => ({ ...s, whatWeDid: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <BlockEditor label="🤝 Pedidos ao cliente" value={blocks.client_requests || ""} onChange={v => setBlock("client_requests", v)} />
          </div>

          {groups.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-card-foreground">Métricas por funil</h4>
              {groups.map(g => {
                const cfg = ensureGroupCfg(g.key);
                return (
                  <div key={g.key} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="font-semibold text-sm text-card-foreground">
                      {g.isFunnel ? `Funil: ${g.key}` : g.key}
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Métricas padrão visíveis</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {AVAILABLE_METRICS.map(m => {
                          const active = cfg.visible_metrics.includes(m.key);
                          return (
                            <button
                              key={m.key}
                              onClick={() => toggleMetric(g.key, m.key)}
                              className={`text-xs px-2 py-1 rounded-md border transition ${
                                active
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border bg-muted/30 text-muted-foreground hover:text-card-foreground"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Métricas manuais</Label>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => addCustom(g.key)}>
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      </div>
                      {cfg.custom_metrics.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Nenhuma métrica manual.</p>
                      )}
                      {cfg.custom_metrics.map(m => (
                        <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-5 h-8 text-xs"
                            placeholder="Rótulo"
                            value={m.label}
                            onChange={e => updateCustom(g.key, m.id, { label: e.target.value })}
                          />
                          <Input
                            className="col-span-3 h-8 text-xs"
                            placeholder="Valor"
                            value={m.value}
                            onChange={e => updateCustom(g.key, m.id, { value: e.target.value })}
                          />
                          <Select
                            value={m.format}
                            onValueChange={(v: MetricFormat) => updateCustom(g.key, m.id, { format: v })}
                          >
                            <SelectTrigger className="col-span-3 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="currency">Moeda</SelectItem>
                              <SelectItem value="percent">Percentual</SelectItem>
                              <SelectItem value="text">Texto</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="col-span-1 h-8 text-destructive hover:text-destructive"
                            onClick={() => removeCustom(g.key, m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BlockEditor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="min-h-[90px] text-sm"
        placeholder="Suporta markdown (listas com -, **negrito**, etc.)"
      />
    </div>
  );
}