import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPeriodPair } from "@/lib/period";

export interface FunnelPeriodMetric {
  id?: string;
  client_id: string;
  funnel_code: string;
  metric_key: string;
  metric_label: string;
  metric_value: number;
  period_start: string;
  period_end: string;
  source?: string;
}

const KEY = "funnel-period-metrics";

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function presetToRange(preset: string) {
  const { current } = getPeriodPair(preset);
  return { start: fmtDate(current.start), end: fmtDate(current.end) };
}

export function useFunnelPeriodMetrics(clientId?: string, funnelCode?: string, datePreset?: string) {
  const range = datePreset ? presetToRange(datePreset) : null;
  return useQuery({
    queryKey: [KEY, clientId, funnelCode, range?.start, range?.end],
    queryFn: async () => {
      let q = (supabase as any)
        .from("funnel_period_metrics")
        .select("*")
        .eq("client_id", clientId!);
      if (funnelCode) q = q.eq("funnel_code", funnelCode);
      if (range) q = q.lte("period_start", range.end).gte("period_end", range.start);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FunnelPeriodMetric[];
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelPeriodMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: FunnelPeriodMetric) => {
      const { error } = await (supabase as any)
        .from("funnel_period_metrics")
        .upsert(
          {
            client_id: m.client_id,
            funnel_code: m.funnel_code,
            metric_key: m.metric_key,
            metric_label: m.metric_label,
            metric_value: m.metric_value,
            period_start: m.period_start,
            period_end: m.period_end,
            source: m.source || "como_estamos",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code,metric_key,period_start,period_end" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, vars.client_id] }),
  });
}

export function useDeleteFunnelPeriodMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: {
      client_id: string;
      funnel_code: string;
      metric_key: string;
      period_start: string;
      period_end: string;
    }) => {
      const { error } = await (supabase as any)
        .from("funnel_period_metrics")
        .delete()
        .eq("client_id", m.client_id)
        .eq("funnel_code", m.funnel_code)
        .eq("metric_key", m.metric_key)
        .eq("period_start", m.period_start)
        .eq("period_end", m.period_end);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [KEY, vars.client_id] }),
  });
}