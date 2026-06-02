import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const DEFAULT_GOOGLE: MetricsConfig = {
  visible_metrics: ["spend", "conversions", "cpa", "ctr", "clicks", "impressions"],
  custom_metrics: [],
};

export function useDiagnosticMetricsConfig(
  clientId: string,
  datePreset: string,
  groupKey: string,
) {
  const queryClient = useQueryClient();
  const isGoogle = groupKey.startsWith("google-ads-");
  const defaultCfg = isGoogle ? DEFAULT_GOOGLE : DEFAULT;

  const queryKey = ["diagnostic-metrics-config", clientId, datePreset, groupKey];

  const { data: config = defaultCfg, isLoading } = useQuery({
    queryKey,
    enabled: !!clientId && !!groupKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_metrics_config")
        .select("*")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset)
        .eq("group_key", groupKey)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          visible_metrics: Array.isArray(data.visible_metrics)
            ? (data.visible_metrics as string[])
            : defaultCfg.visible_metrics,
          custom_metrics: Array.isArray(data.custom_metrics)
            ? (data.custom_metrics as unknown as CustomMetric[])
            : [],
        };
      }
      return defaultCfg;
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: MetricsConfig) => {
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
        const { error } = await supabase.from("diagnostic_metrics_config").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diagnostic_metrics_config").insert({
          client_id: clientId,
          date_preset: datePreset,
          group_key: groupKey,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onMutate: async (next) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (err, next, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Erro ao salvar configuração de métricas");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const update = useCallback(
    (next: MetricsConfig) => {
      mutation.mutate(next);
    },
    [mutation],
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
    loading: isLoading,
    saving: mutation.isPending,
    update,
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
