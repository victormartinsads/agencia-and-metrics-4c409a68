import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Client {
  id: string;
  name: string;
  slug: string;
  meta_access_token: string;
  ad_account_ids: string[];
  currency_symbol: string;
  created_at: string;
  updated_at: string;
  lead_action_types?: string[];
  target_cpa_lead?: number;
  target_cpa_purchase?: number;
  cpa_alert_multiplier?: number;
  budget_alert_threshold_pct?: number;
  archived_at?: string | null;
  logo_url?: string | null;
}

export type ClientInsert = {
  name: string;
  meta_access_token: string;
  ad_account_ids: string[];
  currency_symbol?: string;
  google_ads_customer_id?: string;
  target_cpa_lead?: number;
  target_cpa_purchase?: number;
  cpa_alert_multiplier?: number;
  budget_alert_threshold_pct?: number;
};

function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function useClients(opts?: { includeArchived?: boolean; onlyArchived?: boolean }) {
  return useQuery({
    queryKey: ["clients", opts?.includeArchived ? "all" : opts?.onlyArchived ? "archived" : "active"],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (opts?.onlyArchived) {
        q = q.not("archived_at", "is", null);
      } else if (!opts?.includeArchived) {
        q = q.is("archived_at", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, slug: generateSlug(client.name) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["account-status", vars.id] });
      qc.invalidateQueries({ queryKey: ["gestor-overview", vars.id] });
      qc.invalidateQueries({ queryKey: ["google-analytics", vars.id] });
      qc.invalidateQueries({ queryKey: ["google-ads", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** Soft-archive (move to "Desativados") or unarchive a client. */
export function useArchiveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
