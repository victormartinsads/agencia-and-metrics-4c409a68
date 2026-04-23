import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type MetricSource = "meta" | "sheets" | "ga" | "computed";

export interface MetricSourceConfig {
  id: string;
  client_id: string;
  metric_key: string;
  source: MetricSource;
  column_letter: string | null;
  field_key: string | null;
}

export interface SheetColumn {
  letter: string;
  header: string;
  sample: string;
}

/** All editable metric keys exposed in the dashboard. */
export const METRIC_REGISTRY: Record<
  string,
  { label: string; defaultSource: MetricSource; defaultField?: string; sheetField?: string; type: "number" | "currency" | "integer" | "ratio" }
> = {
  revenue: { label: "Faturamento", defaultSource: "sheets", sheetField: "revenue", type: "currency" },
  sales: { label: "Vendas", defaultSource: "sheets", sheetField: "sales", type: "integer" },
  investment: { label: "Investimento Total", defaultSource: "meta", defaultField: "totalSpend", sheetField: "investment", type: "currency" },
  leads: { label: "Leads", defaultSource: "sheets", sheetField: "leads", type: "integer" },
  mql: { label: "MQL", defaultSource: "sheets", sheetField: "mql", type: "integer" },
  smql: { label: "sMQL (Reuniões)", defaultSource: "sheets", sheetField: "smql", type: "integer" },
  clicks: { label: "Cliques", defaultSource: "meta", defaultField: "totalClicks", type: "integer" },
  pageviews: { label: "Pageviews", defaultSource: "ga", defaultField: "pageViews", type: "integer" },
  low_ticket_meta: { label: "Low Ticket Meta", defaultSource: "sheets", sheetField: "low_ticket_meta", type: "integer" },
  low_ticket_google: { label: "Low Ticket Google", defaultSource: "sheets", sheetField: "low_ticket_google", type: "integer" },
  qualified_messages: { label: "Mensagens Qualificadas", defaultSource: "sheets", sheetField: "qualified_messages", type: "integer" },
  qualified_followers: { label: "Seguidores Qualificados", defaultSource: "sheets", sheetField: "qualified_followers", type: "integer" },
};

export function useMetricSources(clientId?: string) {
  return useQuery({
    queryKey: ["metric-sources", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_metric_sources")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return (data || []) as MetricSourceConfig[];
    },
    enabled: !!clientId,
  });
}

export function useUpsertMetricSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      client_id: string;
      metric_key: string;
      source: MetricSource;
      column_letter?: string | null;
      field_key?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("dashboard_metric_sources")
        .upsert([vars as any], { onConflict: "client_id,metric_key" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["metric-sources", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["weekly-metrics", vars.client_id] });
    },
  });
}

/** Fetch sheet headers via edge function. */
export function useSheetHeaders(clientId?: string, enabled = false) {
  return useQuery({
    queryKey: ["sheet-headers", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sheets-sync", {
        body: { clientId, action: "headers" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.columns || []) as SheetColumn[];
    },
    enabled: !!clientId && enabled,
    staleTime: 60_000,
  });
}

/** Resolve effective source for a metric (override or default). */
export function resolveSource(metricKey: string, overrides: MetricSourceConfig[] | undefined) {
  const ov = overrides?.find((o) => o.metric_key === metricKey);
  const def = METRIC_REGISTRY[metricKey];
  if (ov) return { source: ov.source, column_letter: ov.column_letter, field_key: ov.field_key };
  return { source: def?.defaultSource || "sheets", column_letter: null, field_key: def?.defaultField || def?.sheetField || null };
}