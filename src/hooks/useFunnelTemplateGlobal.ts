import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-template-global";

/** Returns map { funnel_code -> string[] of metric keys } */
export function useFunnelTemplateGlobal() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_card_template_global")
        .select("*");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of (data || []) as any[]) {
        map[row.funnel_code] = (row.metrics as string[]) || [];
      }
      return map;
    },
  });
}

export function useSaveFunnelTemplateGlobal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ funnelCode, metrics }: { funnelCode: string; metrics: string[] }) => {
      const { error } = await supabase
        .from("funnel_card_template_global")
        .upsert(
          { funnel_code: funnelCode, metrics, updated_at: new Date().toISOString() },
          { onConflict: "funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}