import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelineStages(pipelineId?: string | null) {
  return useQuery({
    queryKey: ["pipeline-stages", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PipelineStage[];
    },
  });
}

export function useCreatePipelineStage(pipelineId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string; sort_order: number; is_won?: boolean; is_lost?: boolean }) => {
      const { data, error } = await sb
        .from("pipeline_stages")
        .insert({
          pipeline_id: pipelineId,
          name: input.name,
          color: input.color ?? "#94a3b8",
          sort_order: input.sort_order,
          is_won: input.is_won ?? false,
          is_lost: input.is_lost ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages", pipelineId] });
    },
  });
}

export function useUpdatePipelineStage(pipelineId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; color?: string; sort_order?: number; is_won?: boolean; is_lost?: boolean }) => {
      const { data, error } = await sb
        .from("pipeline_stages")
        .update({
          name: input.name,
          color: input.color,
          sort_order: input.sort_order,
          is_won: input.is_won,
          is_lost: input.is_lost,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm-app-leads"] });
    },
  });
}

export function useDeletePipelineStage(pipelineId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-stages", pipelineId] });
      qc.invalidateQueries({ queryKey: ["crm-app-leads"] });
    },
  });
}
