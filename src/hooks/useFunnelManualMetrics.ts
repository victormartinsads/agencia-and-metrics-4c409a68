import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ManualMetricFormat = "number" | "currency" | "percent";

export interface ManualMetric {
  id: string;
  client_id: string;
  funnel_code: string;
  metric_label: string;
  metric_value: number;
  metric_format: ManualMetricFormat;
  display_order: number;
}

const KEY = "funnel-manual-metrics";

export function useFunnelManualMetrics(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_manual_metrics")
        .select("*")
        .eq("client_id", clientId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const map: Record<string, ManualMetric[]> = {};
      for (const row of (data || []) as any[]) {
        const code = row.funnel_code;
        if (!map[code]) map[code] = [];
        map[code].push(row as ManualMetric);
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveManualMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<ManualMetric> & { client_id: string; funnel_code: string }) => {
      if (m.id) {
        const { error } = await supabase
          .from("funnel_manual_metrics")
          .update({
            metric_label: m.metric_label,
            metric_value: m.metric_value,
            metric_format: m.metric_format,
            display_order: m.display_order,
          })
          .eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funnel_manual_metrics").insert({
          client_id: m.client_id,
          funnel_code: m.funnel_code,
          metric_label: m.metric_label || "Métrica",
          metric_value: m.metric_value ?? 0,
          metric_format: m.metric_format || "number",
          display_order: m.display_order ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.client_id] });
    },
  });
}

export function useDeleteManualMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId: string }) => {
      const { error } = await supabase.from("funnel_manual_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}

export function formatManualMetric(value: number, format: ManualMetricFormat, currencySymbol = "R$"): string {
  if (format === "currency") {
    return `${currencySymbol} ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === "percent") {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
  return value.toLocaleString("pt-BR");
}