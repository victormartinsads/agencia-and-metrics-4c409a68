import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { META_METRIC_CATALOG } from "@/lib/metaMetricCatalog";

export type MetricFormat = "currency" | "number" | "percent" | "text";

export interface CustomMetric {
  id: string;
  label: string;
  value: string; // armazenado como texto pra permitir qualquer formato
  format: MetricFormat;
}

export interface MetricsConfig {
  visible_metrics: string[]; // chaves padrão (spend, conversions, cpa, ctr, cpm, reach, cpc, roas, impressions, clicks)
  custom_metrics: CustomMetric[];
}

// Catálogo completo Meta — único e compartilhado com Funis / Análise de Funis.
export const AVAILABLE_METRICS: { key: string; label: string; group?: string }[] =
  META_METRIC_CATALOG.map((m) => ({ key: m.key, label: m.label, group: m.group }));

const DEFAULT: MetricsConfig = {
  visible_metrics: ["spend", "conversions", "cpa", "ctr", "cpm", "reach"],
  custom_metrics: [],
};

export function useDiagnosticMetricsConfig(
  clientId: string,
  datePreset: string,
  groupKey: string,
) {
  const [config, setConfig] = useState<MetricsConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // Load
  useEffect(() => {
    if (!clientId || !groupKey) return;
    setLoading(true);
    supabase
      .from("diagnostic_metrics_config")
      .select("*")
      .eq("client_id", clientId)
      .eq("date_preset", datePreset)
      .eq("group_key", groupKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            visible_metrics: Array.isArray(data.visible_metrics)
              ? (data.visible_metrics as string[])
              : DEFAULT.visible_metrics,
            custom_metrics: Array.isArray(data.custom_metrics)
              ? (data.custom_metrics as unknown as CustomMetric[])
              : [],
          });
        } else {
          setConfig(DEFAULT);
        }
        setLoading(false);
      });
  }, [clientId, datePreset, groupKey]);

  const persist = useCallback(
    async (next: MetricsConfig) => {
      if (!clientId || !groupKey) return;
      setSaving(true);
      try {
        const { data: existing } = await supabase
          .from("diagnostic_metrics_config")
          .select("id")
          .eq("client_id", clientId)
          .eq("date_preset", datePreset)
          .eq("group_key", groupKey)
          .maybeSingle();

        const payload = {
          visible_metrics: next.visible_metrics as any,
          custom_metrics: next.custom_metrics as any,
        };

        if (existing) {
          await supabase.from("diagnostic_metrics_config").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("diagnostic_metrics_config").insert({
            client_id: clientId,
            date_preset: datePreset,
            group_key: groupKey,
            ...payload,
          });
        }
      } catch (e) {
        toast.error("Erro ao salvar configuração de métricas");
      } finally {
        setSaving(false);
      }
    },
    [clientId, datePreset, groupKey],
  );

  const update = useCallback(
    (next: MetricsConfig) => {
      setConfig(next);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => persist(next), 800);
    },
    [persist],
  );

  const toggleMetric = useCallback(
    (key: string) => {
      const visible = config.visible_metrics.includes(key)
        ? config.visible_metrics.filter(k => k !== key)
        : [...config.visible_metrics, key];
      update({ ...config, visible_metrics: visible });
    },
    [config, update],
  );

  const reorderMetrics = useCallback(
    (next: string[]) => {
      update({ ...config, visible_metrics: next });
    },
    [config, update],
  );

  const addCustomMetric = useCallback(
    (m: Omit<CustomMetric, "id">) => {
      const id = crypto.randomUUID();
      update({ ...config, custom_metrics: [...config.custom_metrics, { ...m, id }] });
    },
    [config, update],
  );

  const updateCustomMetric = useCallback(
    (id: string, patch: Partial<CustomMetric>) => {
      update({
        ...config,
        custom_metrics: config.custom_metrics.map(m => (m.id === id ? { ...m, ...patch } : m)),
      });
    },
    [config, update],
  );

  const removeCustomMetric = useCallback(
    (id: string) => {
      update({ ...config, custom_metrics: config.custom_metrics.filter(m => m.id !== id) });
    },
    [config, update],
  );

  return {
    config,
    loading,
    saving,
    toggleMetric,
    reorderMetrics,
    addCustomMetric,
    updateCustomMetric,
    removeCustomMetric,
  };
}

export function formatCustomValue(m: CustomMetric, currencySymbol: string): string {
  const n = Number(String(m.value).replace(",", "."));
  if (m.format === "text" || isNaN(n)) return m.value || "—";
  if (m.format === "currency")
    return `${currencySymbol} ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (m.format === "percent") return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return n.toLocaleString("pt-BR");
}
