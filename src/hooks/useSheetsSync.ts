import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SheetsConfig {
  id: string;
  client_id: string;
  spreadsheet_id: string;
  spreadsheet_url: string | null;
  sheet_name: string;
  range_notation: string;
  column_date: string | null;
  column_revenue: string | null;
  column_sales: string | null;
  column_mql: string | null;
  column_smql: string | null;
  column_avg_ticket: string | null;
  column_ltv: string | null;
  header_row: number;
  decimal_separator: string;
  date_format: string;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

export interface WeeklyMetric {
  id: string;
  client_id: string;
  reference_date: string;
  revenue: number;
  sales: number;
  mql: number;
  smql: number;
  avg_ticket: number;
  ltv: number;
}

export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(url.trim())) return url.trim();
  return null;
}

export function useSheetsConfig(clientId?: string) {
  return useQuery({
    queryKey: ["sheets-config", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sheets_config")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as SheetsConfig | null;
    },
    enabled: !!clientId,
  });
}

export function useUpsertSheetsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<SheetsConfig> & { client_id: string }) => {
      const { data, error } = await supabase
        .from("client_sheets_config")
        .upsert(config, { onConflict: "client_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sheets-config", vars.client_id] });
    },
  });
}

export function useSyncSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, action }: { clientId: string; action?: "test" | "sync" }) => {
      const { data, error } = await supabase.functions.invoke("sheets-sync", {
        body: { clientId, action: action || "sync" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sheets-config", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["weekly-metrics", vars.clientId] });
    },
  });
}

export function useWeeklyMetrics(clientId?: string, limit = 52) {
  return useQuery({
    queryKey: ["weekly-metrics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_metrics")
        .select("*")
        .eq("client_id", clientId!)
        .order("reference_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as WeeklyMetric[];
    },
    enabled: !!clientId,
  });
}