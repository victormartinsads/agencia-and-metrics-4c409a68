import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-follow-mapping";

/** Catalog of Meta action_types that commonly represent a "Follower". */
export const FOLLOW_ACTION_CATALOG: { key: string; label: string }[] = [
  { key: "follow", label: "Seguidor (action_type: follow)" },
  { key: "onsite_conversion.follow", label: "Seguidor — onsite conversion" },
  { key: "like", label: "Curtida da página (like)" },
  { key: "page_engagement", label: "Engajamento c/ página" },
  { key: "post_engagement", label: "Engajamento c/ post" },
  { key: "profile_visit", label: "Visita ao perfil" },
];

export function useFunnelFollowMapping(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funnel_follow_mapping")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of (data || []) as any[]) {
        map[row.funnel_code] = (row.action_types as string[]) || [];
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelFollowMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      actionTypes,
    }: {
      clientId: string;
      funnelCode: string;
      actionTypes: string[];
    }) => {
      const { error } = await (supabase as any)
        .from("funnel_follow_mapping")
        .upsert(
          {
            client_id: clientId,
            funnel_code: funnelCode,
            action_types: actionTypes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}