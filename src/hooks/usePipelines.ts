import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export function usePipelines(orgId?: string) {
  return useQuery({
    queryKey: ["pipelines", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("pipelines")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Pipeline[];
    },
  });
}

export function useUpsertPipeline(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pipeline> & { name: string }) => {
      const payload: any = {
        organization_id: orgId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? "#22c55e",
        sort_order: input.sort_order ?? 0,
      };
      if (input.id) payload.id = input.id;
      const { data, error } = await sb.from("pipelines").upsert(payload).select().single();
      if (error) throw error;
      return data as Pipeline;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipelines", orgId] }),
  });
}

export function useDeletePipeline(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", orgId] });
      qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] });
    },
  });
}
