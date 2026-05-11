import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AccountStatusData {
  accounts: Array<{
    id: string;
    name?: string;
    status: string;
    statusCode: number;
    disableReason?: number;
    balance?: number;
    amountSpent?: number;
    spendCap?: number | null;
    currency?: string;
    error?: string;
  }>;
  budgetAlerts: Array<{
    accountId: string;
    accountName: string;
    campaignId: string;
    campaignName: string;
    dailyBudget: number;
    todaySpend: number;
    pct: number;
  }>;
  thresholds: {
    target_cpa_lead: number;
    target_cpa_purchase: number;
    cpa_alert_multiplier: number;
    budget_alert_threshold_pct: number;
  };
}

export function useAccountStatus(clientId?: string) {
  return useQuery<AccountStatusData>({
    queryKey: ["account-status", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-account-status", {
        body: { clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AccountStatusData;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

export interface Suggestion {
  id: string;
  client_id: string;
  level: string;
  object_id: string;
  object_name: string;
  action: string;
  suggested_value: number | null;
  reason: string;
  severity: string;
  status: string;
  metadata: any;
  created_at: string;
}

export function useSuggestions(clientId?: string) {
  return useQuery<Suggestion[]>({
    queryKey: ["optimization-suggestions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_suggestions")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Suggestion[];
    },
    enabled: !!clientId,
  });
}

export function useGenerateSuggestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, datePreset = "last_7d" }: { clientId: string; datePreset?: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-optimization-suggestions", {
        body: { clientId, datePreset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["optimization-suggestions", vars.clientId] }),
  });
}

export function useApplySuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Suggestion) => {
      // Mapeia ação → meta-ads-action
      let action: string | null = null;
      let value: number | undefined;
      if (s.action === "pause") action = "pause";
      else if (s.action === "activate") action = "activate";
      else if (s.action === "increase_budget" || s.action === "decrease_budget") {
        // Sem valor base atual aqui — apenas marca aprovada (gestor ajusta no Meta)
        action = null;
      }

      if (action) {
        const { data, error } = await supabase.functions.invoke("meta-ads-action", {
          body: { clientId: s.client_id, level: s.level, objectId: s.object_id, action, value },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      const { error: upErr } = await supabase
        .from("optimization_suggestions")
        .update({ status: action ? "applied" : "approved", applied_at: new Date().toISOString() })
        .eq("id", s.id);
      if (upErr) throw upErr;
    },
    onSuccess: (_d, s) => qc.invalidateQueries({ queryKey: ["optimization-suggestions", s.client_id] }),
  });
}

export function useRejectSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Suggestion) => {
      const { error } = await supabase
        .from("optimization_suggestions")
        .update({ status: "rejected" })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_d, s) => qc.invalidateQueries({ queryKey: ["optimization-suggestions", s.client_id] }),
  });
}

export interface CampaignDraft {
  id: string;
  client_id: string;
  ad_account_id: string;
  prompt: string;
  structure: any;
  status: string;
  meta_campaign_id: string | null;
  publish_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useCampaignDrafts(clientId?: string) {
  return useQuery<CampaignDraft[]>({
    queryKey: ["campaign-drafts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_drafts")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CampaignDraft[];
    },
    enabled: !!clientId,
  });
}

export function useGenerateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { clientId: string; adAccountId: string; prompt: string; draftId?: string }) => {
      const { data, error } = await supabase.functions.invoke("campaign-draft-ai", { body: vars });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.draft as CampaignDraft;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["campaign-drafts", v.clientId] }),
  });
}

export function usePublishDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const { data, error } = await supabase.functions.invoke("meta-campaign-create", { body: { draftId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign-drafts"] }),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaign_drafts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign-drafts"] }),
  });
}