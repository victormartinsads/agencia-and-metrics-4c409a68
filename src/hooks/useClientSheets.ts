import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientSheet {
  id?: string;
  client_id: string;
  name: string;
  spreadsheet_id: string;
  spreadsheet_url?: string | null;
  sheet_name?: string;
  header_row?: number;
  range_a1?: string | null;
  field_mapping?: Record<string, any>;
  last_synced_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  last_sync_rows?: number | null;
}

const KEY = "client-sheets";

export function useClientSheets(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_sheets")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ClientSheet[];
    },
    enabled: !!clientId,
  });
}

export function useSaveClientSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: ClientSheet) => {
      if (s.id) {
        const { error } = await (supabase as any)
          .from("client_sheets")
          .update({ ...s, updated_at: new Date().toISOString() })
          .eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("client_sheets").insert(s);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.client_id] }),
  });
}

export function useDeleteClientSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; clientId: string }) => {
      const { error } = await (supabase as any).from("client_sheets").delete().eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.clientId] }),
  });
}