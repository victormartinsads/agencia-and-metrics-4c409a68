import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MetricSourceType = "auto" | "meta" | "sheet";

export interface FunnelMetricSource {
  id?: string;
  client_id: string;
  funnel_code: string;
  metric_key: string; // 'revenue' | 'sales'
  source_type: MetricSourceType;
  meta_campaign_id?: string | null;
  meta_action_type?: string | null;
  sheet_product_code?: string | null;
  sheet_field?: string | null;
}

const KEY = "funnel-metric-sources";

export function useFunnelMetricSources(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funnel_metric_sources")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, FunnelMetricSource> = {};
      for (const row of (data || []) as FunnelMetricSource[]) {
        map[`${row.funnel_code}:${row.metric_key}`] = row;
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelMetricSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (src: FunnelMetricSource) => {
      const { error } = await (supabase as any)
        .from("funnel_metric_sources")
        .upsert(
          {
            client_id: src.client_id,
            funnel_code: src.funnel_code,
            metric_key: src.metric_key,
            source_type: src.source_type,
            meta_campaign_id: src.meta_campaign_id ?? null,
            meta_action_type: src.meta_action_type ?? null,
            sheet_product_code: src.sheet_product_code ?? null,
            sheet_field: src.sheet_field ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code,metric_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, vars.client_id] }),
  });
}