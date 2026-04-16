import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SavedInsight {
  id: string;
  client_id: string;
  date_preset: string;
  content: string;
  is_manual: boolean;
}

const KEY = "saved-insights";

export function useSavedInsights(clientId: string | undefined, datePreset: string) {
  return useQuery({
    queryKey: [KEY, clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_insights")
        .select("*")
        .eq("client_id", clientId!)
        .eq("date_preset", datePreset)
        .order("created_at");
      if (error) throw error;
      return (data || []) as SavedInsight[];
    },
    enabled: !!clientId,
  });
}

export function useAddInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; date_preset: string; content: string; is_manual: boolean }) => {
      const { error } = await supabase.from("saved_insights").insert(input);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.client_id, v.date_preset] }),
  });
}

export function useUpdateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, clientId, datePreset }: { id: string; content: string; clientId: string; datePreset: string }) => {
      const { error } = await supabase.from("saved_insights").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.clientId, v.datePreset] }),
  });
}

export function useDeleteInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId, datePreset }: { id: string; clientId: string; datePreset: string }) => {
      const { error } = await supabase.from("saved_insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.clientId, v.datePreset] }),
  });
}
