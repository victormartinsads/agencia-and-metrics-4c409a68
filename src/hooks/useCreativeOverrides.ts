import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CreativeOverride {
  id: string;
  client_id: string;
  creative_id: string;
  metric_name: string;
  metric_value: number;
}

export function useCreativeOverrides(clientId: string | undefined) {
  return useQuery({
    queryKey: ["creative-overrides", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creative_metric_overrides")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data as CreativeOverride[];
    },
    enabled: !!clientId,
  });
}

export function useUpsertCreativeOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (override: { client_id: string; creative_id: string; metric_name: string; metric_value: number }) => {
      const { data, error } = await supabase
        .from("creative_metric_overrides")
        .upsert(override, { onConflict: "client_id,creative_id,metric_name" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["creative-overrides", vars.client_id] });
    },
  });
}

export function useDeleteCreativeOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from("creative_metric_overrides")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      qc.invalidateQueries({ queryKey: ["creative-overrides", clientId] });
    },
  });
}

/** Helper: apply overrides to a creative's metrics, returns overridden values */
export function applyOverrides(
  creativeId: string,
  original: Record<string, number>,
  overrides: CreativeOverride[]
): Record<string, number> {
  const result = { ...original };
  for (const o of overrides) {
    if (o.creative_id === creativeId) {
      result[o.metric_name] = o.metric_value;
    }
  }
  return result;
}
