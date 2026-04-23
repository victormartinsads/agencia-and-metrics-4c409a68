import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ClientSpreadsheet {
  id: string;
  client_id: string;
  label: string;
  spreadsheet_id: string;
  spreadsheet_url: string | null;
  sheet_name: string;
  range_notation: string;
  header_row: number;
  date_format: string;
  decimal_separator: string;
  is_primary: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

export function useClientSpreadsheets(clientId?: string) {
  return useQuery({
    queryKey: ["client-spreadsheets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_spreadsheets")
        .select("*")
        .eq("client_id", clientId!)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ClientSpreadsheet[];
    },
    enabled: !!clientId,
  });
}

export function useUpsertSpreadsheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ClientSpreadsheet> & { client_id: string }) => {
      const { data, error } = await supabase
        .from("client_spreadsheets")
        .upsert([payload as any])
        .select()
        .single();
      if (error) throw error;
      return data as ClientSpreadsheet;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-spreadsheets", vars.client_id] });
    },
  });
}

export function useDeleteSpreadsheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase.from("client_spreadsheets").delete().eq("id", id);
      if (error) throw error;
      return { id, client_id };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client-spreadsheets", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["metric-sources", vars.client_id] });
    },
  });
}

export interface MetricDataSource {
  id: string;
  client_id: string;
  metric_key: string;
  source_type: "sheet" | "meta" | "ga" | "manual";
  spreadsheet_id: string | null;
  column_letter: string | null;
  manual_value: number | null;
  notes: string | null;
}

export function useMetricSources(clientId?: string) {
  return useQuery({
    queryKey: ["metric-sources", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_data_sources")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map = new Map<string, MetricDataSource>();
      for (const row of (data || []) as MetricDataSource[]) map.set(row.metric_key, row);
      return map;
    },
    enabled: !!clientId,
  });
}

export function useUpsertMetricSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MetricDataSource> & { client_id: string; metric_key: string }) => {
      const { data, error } = await supabase
        .from("metric_data_sources")
        .upsert([payload as any], { onConflict: "client_id,metric_key" })
        .select()
        .single();
      if (error) throw error;
      return data as MetricDataSource;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["metric-sources", vars.client_id] });
    },
  });
}