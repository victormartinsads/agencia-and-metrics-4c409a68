import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllClientManagerMeta() {
  return useQuery({
    queryKey: ["client-manager-meta", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_manager_meta" as any)
        .select("client_id, health_score");
      if (error) throw error;
      const map: Record<string, number | null> = {};
      (data || []).forEach((r: any) => { map[r.client_id] = r.health_score; });
      return map;
    },
  });
}

export function useUpsertClientHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, score }: { clientId: string; score: number | null }) => {
      const { error } = await supabase
        .from("client_manager_meta" as any)
        .upsert({ client_id: clientId, health_score: score, updated_at: new Date().toISOString() }, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-manager-meta"] }),
  });
}