import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavedDiagnostic {
  id: string;
  client_id: string;
  title: string;
  date_preset: string;
  period_start: string | null;
  period_end: string | null;
  snapshot: any;
  created_at: string;
  updated_at: string;
}

export function useSavedDiagnostics(clientId: string) {
  return useQuery({
    queryKey: ["saved-diagnostics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_diagnostics" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SavedDiagnostic[];
    },
    enabled: !!clientId,
  });
}

export function useSaveDiagnostic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      title: string;
      date_preset: string;
      period_start?: string | null;
      period_end?: string | null;
      snapshot: any;
    }) => {
      const { data, error } = await supabase
        .from("saved_diagnostics" as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SavedDiagnostic;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["saved-diagnostics", d.client_id] });
    },
  });
}

export function useDeleteSavedDiagnostic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string }) => {
      const { error } = await supabase
        .from("saved_diagnostics" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["saved-diagnostics", d.client_id] });
    },
  });
}