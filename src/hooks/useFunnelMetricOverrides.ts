import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-metric-overrides";

/** Map: funnel_code -> { metric_key -> value } */
export function useFunnelMetricOverrides(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funnel_metric_overrides")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, Record<string, number>> = {};
      for (const row of (data || []) as any[]) {
        if (!map[row.funnel_code]) map[row.funnel_code] = {};
        map[row.funnel_code][row.metric_key] = Number(row.metric_value);
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelMetricOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      metricKey,
      metricValue,
    }: {
      clientId: string;
      funnelCode: string;
      metricKey: string;
      metricValue: number;
    }) => {
      const { error } = await (supabase as any)
        .from("funnel_metric_overrides")
        .upsert(
          {
            client_id: clientId,
            funnel_code: funnelCode,
            metric_key: metricKey,
            metric_value: metricValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code,metric_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}

export function useDeleteFunnelMetricOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      metricKey,
    }: {
      clientId: string;
      funnelCode: string;
      metricKey: string;
    }) => {
      const { error } = await (supabase as any)
        .from("funnel_metric_overrides")
        .delete()
        .eq("client_id", clientId)
        .eq("funnel_code", funnelCode)
        .eq("metric_key", metricKey);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}