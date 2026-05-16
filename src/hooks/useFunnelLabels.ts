import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-custom-labels";

export function useFunnelLabels(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_custom_labels")
        .select("funnel_code,label")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data || []) map[row.funnel_code] = row.label;
      return map;
    },
  });
}

export function useSaveFunnelLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      label,
    }: {
      clientId: string;
      funnelCode: string;
      label: string;
    }) => {
      const { error } = await supabase
        .from("funnel_custom_labels")
        .upsert(
          { client_id: clientId, funnel_code: funnelCode, label, updated_at: new Date().toISOString() },
          { onConflict: "client_id,funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}