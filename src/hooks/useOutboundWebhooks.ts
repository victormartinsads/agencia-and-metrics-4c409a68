import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface OutboundWebhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  created_at: string;
  updated_at: string;
}

export interface OutboundEvent {
  id: string;
  webhook_id: string | null;
  lead_id: string | null;
  event_type: string;
  status_code: number | null;
  success: boolean;
  payload: any;
  response_body: string | null;
  created_at: string;
}

export const ALL_EVENTS = [
  { key: "new", label: "Lead criado" },
  { key: "contacted", label: "Em contato" },
  { key: "qualified", label: "Qualificado" },
  { key: "proposal", label: "Proposta" },
  { key: "closed", label: "Ganho / Fechado" },
  { key: "lost", label: "Perdido" },
];

export function useOutboundWebhooks(orgId: string) {
  return useQuery({
    queryKey: ["outbound-webhooks", orgId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("outbound_webhooks")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OutboundWebhook[];
    },
    enabled: !!orgId,
  });
}

export function useOutboundEvents(orgId: string) {
  return useQuery({
    queryKey: ["outbound-events", orgId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("outbound_events")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as OutboundEvent[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertOutboundWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OutboundWebhook> & { url: string; name: string; events: string[]; active: boolean }) => {
      const payload: any = {
        organization_id: orgId,
        name: input.name,
        url: input.url,
        events: input.events,
        active: input.active,
      };
      if (input.id) payload.id = input.id;
      const { data, error } = await sb.from("outbound_webhooks").upsert(payload).select().single();
      if (error) throw error;
      return data as OutboundWebhook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outbound-webhooks", orgId] }),
  });
}

export function useDeleteOutboundWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("outbound_webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outbound-webhooks", orgId] }),
  });
}
