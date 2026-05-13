import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
}

const sb = supabase as any;

export function useLeadTags(orgId?: string) {
  return useQuery({
    queryKey: ["lead-tags", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("lead_tags")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return (data || []) as LeadTag[];
    },
  });
}

export function useCreateLeadTag(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data, error } = await sb
        .from("lead_tags")
        .insert({ organization_id: orgId, name, color: color || "#22c55e" })
        .select()
        .single();
      if (error) throw error;
      return data as LeadTag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-tags", orgId] }),
  });
}

export function useDeleteLeadTag(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("lead_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-tags", orgId] }),
  });
}

export function useBulkLeadActions(orgId?: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await sb.from("leads").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await sb.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addTag = useMutation({
    mutationFn: async ({ ids, tag }: { ids: string[]; tag: string }) => {
      // Fetch current tags then merge
      const { data, error } = await sb.from("leads").select("id, tags").in("id", ids);
      if (error) throw error;
      await Promise.all(
        (data || []).map((row: any) => {
          const next = Array.from(new Set([...(row.tags || []), tag]));
          return sb.from("leads").update({ tags: next }).eq("id", row.id);
        }),
      );
    },
    onSuccess: invalidate,
  });

  const removeTag = useMutation({
    mutationFn: async ({ ids, tag }: { ids: string[]; tag: string }) => {
      const { data, error } = await sb.from("leads").select("id, tags").in("id", ids);
      if (error) throw error;
      await Promise.all(
        (data || []).map((row: any) => {
          const next = (row.tags || []).filter((t: string) => t !== tag);
          return sb.from("leads").update({ tags: next }).eq("id", row.id);
        }),
      );
    },
    onSuccess: invalidate,
  });

  return { updateStatus, remove, addTag, removeTag };
}