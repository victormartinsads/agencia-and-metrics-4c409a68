import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const sb = supabase as any;

/** Mapa client_id -> organization (CRM ativo) */
export function useClientOrgs() {
  return useQuery({
    queryKey: ["client-orgs"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("organizations")
        .select("id, name, slug, client_id")
        .not("client_id", "is", null);
      if (error) throw error;
      const map: Record<string, { id: string; name: string; slug: string }> = {};
      (data || []).forEach((o: any) => { map[o.client_id] = o; });
      return map;
    },
  });
}

export function useEnableClientCrm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ clientId, clientName, clientSlug }: { clientId: string; clientName: string; clientSlug: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { data: org, error } = await sb
        .from("organizations")
        .insert({ name: clientName, slug: `${clientSlug}-${Math.random().toString(36).slice(2, 6)}`, client_id: clientId })
        .select()
        .single();
      if (error) throw error;
      // Adiciona o admin como owner
      const { error: mErr } = await sb.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });
      if (mErr && !mErr.message?.includes("duplicate")) throw mErr;
      return org;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-orgs"] });
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
  });
}

export function useDisableClientCrm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId }: { orgId: string }) => {
      // Apaga leads, members, webhooks da org primeiro
      await sb.from("leads").delete().eq("organization_id", orgId);
      await sb.from("organization_members").delete().eq("organization_id", orgId);
      await sb.from("webhook_tokens").delete().eq("organization_id", orgId);
      await sb.from("outbound_webhooks").delete().eq("organization_id", orgId);
      const { error } = await sb.from("organizations").delete().eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-orgs"] });
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
  });
}

/** Para o cliente final: pega org vinculada ao seu client_id */
export function useMyClientOrg(clientId?: string | null) {
  return useQuery({
    queryKey: ["my-client-org", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("organizations")
        .select("id, name, slug, client_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
