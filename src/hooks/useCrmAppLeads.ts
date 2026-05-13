import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsService, webhookService, Lead, LeadStatus } from "@/lib/crm-app";
import { supabase } from "@/integrations/supabase/client";

export function useLeadsForOrg(orgId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["crm-app-leads", orgId],
    enabled: !!orgId,
    queryFn: () => leadsService.getAll(orgId!),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`crm-app-leads:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);

  return query;
}

export function useUpdateLeadStatus(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, oldStatus }: { id: string; status: LeadStatus; oldStatus?: LeadStatus }) =>
      leadsService.updateStatus(id, status, oldStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] }),
  });
}

export function useUpdateLead(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lead> }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).from("leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] }),
  });
}

export function useDeleteLead(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] }),
  });
}

export function useWebhookTokens(orgId?: string, pipelineId?: string | null) {
  return useQuery({
    queryKey: ["crm-app-webhooks", orgId, pipelineId ?? null],
    enabled: !!orgId,
    queryFn: async () => {
      await webhookService.ensureToken(orgId!, pipelineId ?? null);
      return webhookService.getTokens(orgId!, pipelineId ?? null);
    },
  });
}