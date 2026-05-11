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

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
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
