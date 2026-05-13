import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadCustomFieldDef {
  id: string;
  organization_id: string;
  pipeline_id: string | null;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "url";
  sort_order: number;
}

const sb = supabase as any;

/**
 * Loads custom field defs for the org.
 * - When pipelineId is undefined: returns ALL defs (used by display contexts).
 * - When pipelineId is null: returns ONLY global defs (pipeline_id IS NULL).
 * - When pipelineId is a string: returns global + that pipeline's defs.
 */
export function useLeadCustomFieldDefs(orgId?: string, pipelineId?: string | null) {
  return useQuery({
    queryKey: ["lead-custom-field-defs", orgId, pipelineId === undefined ? "__all__" : pipelineId ?? null],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lead_custom_field_defs")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const all = (data || []) as LeadCustomFieldDef[];
      if (pipelineId === undefined) return all;
      if (pipelineId === null) return all.filter((d) => !d.pipeline_id);
      return all.filter((d) => !d.pipeline_id || d.pipeline_id === pipelineId);
    },
  });
}

export function useUpsertLeadCustomFieldDef(orgId?: string, pipelineId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (def: Partial<LeadCustomFieldDef> & { key: string; label: string }) => {
      const payload = {
        organization_id: orgId,
        pipeline_id: def.pipeline_id !== undefined ? def.pipeline_id : pipelineId ?? null,
        key: def.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        label: def.label,
        field_type: def.field_type || "text",
        sort_order: def.sort_order ?? 0,
      };
      if (def.id) {
        const { error } = await sb.from("lead_custom_field_defs").update(payload).eq("id", def.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("lead_custom_field_defs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-custom-field-defs", orgId] }),
  });
}

export function useDeleteLeadCustomFieldDef(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("lead_custom_field_defs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-custom-field-defs", orgId] }),
  });
}