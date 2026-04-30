import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PipelineStage {
  id: string;
  client_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface CRMTag {
  id: string;
  client_id: string;
  name: string;
  color: string;
}

export interface CRMLead {
  id: string;
  client_id: string;
  stage_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  value: number;
  currency: string;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  sales_event_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMWebhookConfig {
  id: string;
  client_id: string;
  webhook_token: string;
  default_stage_id: string | null;
}

export function usePipelineStages(clientId?: string) {
  return useQuery({
    queryKey: ["crm-stages", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_pipeline_stages")
        .select("*")
        .eq("client_id", clientId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PipelineStage[];
    },
  });
}

export function useUpsertStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<PipelineStage> & { client_id: string }) => {
      const payload: any = { ...s };
      if (s.id) {
        const { error } = await (supabase as any).from("crm_pipeline_stages").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("crm_pipeline_stages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-stages", v.client_id] }),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("crm_pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["crm-stages", v.client_id] });
      qc.invalidateQueries({ queryKey: ["crm-leads", v.client_id] });
    },
  });
}

export function useTags(clientId?: string) {
  return useQuery({
    queryKey: ["crm-tags", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_tags").select("*").eq("client_id", clientId!).order("name");
      if (error) throw error;
      return (data || []) as CRMTag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { client_id: string; name: string; color: string }) => {
      const { error } = await (supabase as any).from("crm_tags").insert(t);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-tags", v.client_id] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("crm_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-tags", v.client_id] }),
  });
}

export function useLeads(clientId?: string) {
  return useQuery({
    queryKey: ["crm-leads", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_leads").select("*").eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CRMLead[];
    },
  });
}

export function useUpsertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Partial<CRMLead> & { client_id: string }) => {
      if (l.id) {
        const { error } = await (supabase as any).from("crm_leads").update(l).eq("id", l.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("crm_leads").insert(l);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-leads", v.client_id] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("crm_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-leads", v.client_id] }),
  });
}

export function useWebhookConfig(clientId?: string) {
  return useQuery({
    queryKey: ["crm-webhook", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_webhook_config").select("*").eq("client_id", clientId!).maybeSingle();
      if (error) throw error;
      return data as CRMWebhookConfig | null;
    },
  });
}

export function useBulkInsertLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, rows }: { client_id: string; rows: Partial<CRMLead>[] }) => {
      const payload = rows.map((r) => ({ ...r, client_id }));
      const { error } = await (supabase as any).from("crm_leads").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["crm-leads", v.client_id] }),
  });
}