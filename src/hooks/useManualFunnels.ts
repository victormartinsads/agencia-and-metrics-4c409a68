import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManualFunnel {
  id: string;
  client_id: string;
  code: string;
  label: string;
  sort_order: number;
}

const KEY = "manual-funnels";

export function useManualFunnels(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funnel_manual_groups")
        .select("id, client_id, code, label, sort_order")
        .eq("client_id", clientId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ManualFunnel[];
    },
    enabled: !!clientId,
  });
}

export function useCreateManualFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { client_id: string; code: string; label: string }) => {
      const { data: max } = await (supabase as any)
        .from("funnel_manual_groups")
        .select("sort_order")
        .eq("client_id", m.client_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((max?.[0]?.sort_order as number) ?? -1) + 1;
      const { error } = await (supabase as any).from("funnel_manual_groups").insert({
        client_id: m.client_id,
        code: m.code.toUpperCase().replace(/\s+/g, "_"),
        label: m.label,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.client_id] }),
  });
}

export function useUpdateManualFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { id: string; client_id: string; label?: string; sort_order?: number }) => {
      const patch: any = { updated_at: new Date().toISOString() };
      if (m.label !== undefined) patch.label = m.label;
      if (m.sort_order !== undefined) patch.sort_order = m.sort_order;
      const { error } = await (supabase as any)
        .from("funnel_manual_groups")
        .update(patch)
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.client_id] }),
  });
}

export function useDeleteManualFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("funnel_manual_groups").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: [KEY, v.client_id] }),
  });
}