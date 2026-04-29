import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Field mapping for the dashboard. Each key maps to a column header NAME on the spreadsheet.
 * Block keys are the same metric_keys used in OverviewRedesign (see DASHBOARD_FIELDS below).
 */
export type FieldMapping = Record<string, string>;

export interface DashboardSheetConfig {
  id: string;
  client_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string | null;
  spreadsheet_url: string | null;
  sheet_name: string;
  header_row: number;
  date_format: string;
  decimal_separator: string;
  field_mapping: FieldMapping;
  monthly_revenue_goal: number | null;
  monthly_investment_budget: number | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_rows: number | null;
}

/** Fields the dashboard knows how to read. Edit here = edit the mapping form. */
export const DASHBOARD_FIELDS: { key: string; label: string; required?: boolean; type: "date" | "number" | "text" }[] = [
  { key: "date", label: "Data (1 linha por dia)", required: true, type: "date" },
  { key: "revenue", label: "Faturamento (R$)", type: "number" },
  { key: "sales", label: "Vendas (qtd)", type: "number" },
  { key: "leads", label: "Leads (qtd)", type: "number" },
  { key: "mql", label: "MQL", type: "number" },
  { key: "smql", label: "sMQL", type: "number" },
  { key: "investment", label: "Investimento (R$)", type: "number" },
  { key: "avg_ticket", label: "Ticket Médio (R$)", type: "number" },
  { key: "ltv", label: "LTV (R$)", type: "number" },
  { key: "low_ticket_meta", label: "Vendas Low Ticket - Meta", type: "number" },
  { key: "low_ticket_google", label: "Vendas Low Ticket - Google", type: "number" },
  { key: "product_code", label: "Código do Produto", type: "text" },
  { key: "qualified_messages", label: "Mensagens Qualificadas", type: "number" },
  { key: "qualified_followers", label: "Seguidores Qualificados", type: "number" },
];

export function useDashboardSheet(clientId?: string) {
  return useQuery({
    queryKey: ["dashboard-sheet", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dashboard_sheet_config")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as DashboardSheetConfig | null;
    },
    enabled: !!clientId,
  });
}

export function useUpsertDashboardSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DashboardSheetConfig> & { client_id: string }) => {
      const { data, error } = await (supabase as any)
        .from("dashboard_sheet_config")
        .upsert([payload], { onConflict: "client_id" })
        .select()
        .single();
      if (error) throw error;
      return data as DashboardSheetConfig;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dashboard-sheet", vars.client_id] });
    },
  });
}

export function useDeleteDashboardSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await (supabase as any)
        .from("dashboard_sheet_config")
        .delete()
        .eq("client_id", clientId);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ["dashboard-sheet", clientId] });
      qc.invalidateQueries({ queryKey: ["weekly-metrics", clientId] });
    },
  });
}

export interface SheetsBrowseResult {
  files: { id: string; name: string; modifiedTime: string; webViewLink: string }[];
  nextPageToken?: string;
}

export interface SheetMeta {
  spreadsheet_name: string;
  sheets: { name: string; gridId: number; rowCount: number; columnCount: number }[];
}

export interface SheetPreview {
  headers: string[];
  rows: string[][];
}

/** Lists spreadsheets in the connected Google account. */
export function useBrowseSheets(query?: string) {
  return useQuery({
    queryKey: ["sheets-browse", query || ""],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sheets-browse", {
        body: { action: "list_files", query: query || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SheetsBrowseResult;
    },
  });
}

/** Get metadata (sheets/tabs) for a spreadsheet. */
export function useSheetMeta(spreadsheetId?: string) {
  return useQuery({
    queryKey: ["sheet-meta", spreadsheetId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sheets-browse", {
        body: { action: "get_meta", spreadsheet_id: spreadsheetId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SheetMeta;
    },
    enabled: !!spreadsheetId,
  });
}

/** Get preview (header row + first 10 data rows) of a sheet. */
export function useSheetPreview(spreadsheetId?: string, sheetName?: string, headerRow = 1) {
  return useQuery({
    queryKey: ["sheet-preview", spreadsheetId, sheetName, headerRow],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sheets-browse", {
        body: {
          action: "preview",
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
          header_row: headerRow,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SheetPreview;
    },
    enabled: !!spreadsheetId && !!sheetName,
  });
}

export function useSyncDashboardSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("sheets-sync-v2", {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { synced: number };
    },
    onSuccess: (_d, clientId) => {
      qc.invalidateQueries({ queryKey: ["dashboard-sheet", clientId] });
      qc.invalidateQueries({ queryKey: ["weekly-metrics", clientId] });
    },
  });
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
  investment: number;
  leads: number;
  low_ticket_meta: number;
  low_ticket_google: number;
  product_code: string | null;
  qualified_messages: number;
  qualified_followers: number;
}

export function useWeeklyMetrics(clientId?: string, limit = 365) {
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
