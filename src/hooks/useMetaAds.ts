import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, DailyMetric } from "@/data/mockMetaData";

export interface MetaAdsData {
  campaigns: Campaign[];
  dailyMetrics: (DailyMetric & { purchases?: number; leads?: number })[];
  overviewMetrics: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCTR: number;
    avgCPC: number;
    avgROAS: number;
    totalReach: number;
    totalLinkClicks?: number;
    totalOutboundClicks?: number;
    totalUniqueClicks?: number;
    avgCTRAll?: number;
    avgCPCAll?: number;
    totalLeadActions?: number;
    totalPurchases?: number;
    totalLandingPageViews?: number;
    totalAddToCart?: number;
    totalInitiateCheckout?: number;
    link_clicks?: number;
    post_engagement?: number;
    page_engagement?: number;
    video_view?: number;
    messaging_started?: number;
    complete_registration?: number;
    subscribe?: number;
    schedule?: number;
    contact?: number;
    submit_application?: number;
    view_content?: number;
    actionBreakdown?: Record<string, number>;
  };
  accountErrors?: { accountId: string; message: string }[];
}

export function useMetaAds(clientId: string | undefined, datePreset = "last_7d", publicSlug?: string) {
  return useQuery<MetaAdsData>({
    queryKey: ["meta-ads", clientId, datePreset, publicSlug || ""],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: { clientId, datePreset, publicSlug },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as MetaAdsData;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });
}

export function useRefreshMetaAds() {
  const qc = useQueryClient();
  return async (clientId: string, datePreset = "last_7d") => {
    const { data, error } = await supabase.functions.invoke("meta-ads", {
      body: { clientId, datePreset, forceRefresh: true },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    qc.setQueryData(["meta-ads", clientId, datePreset], data);
    return data as MetaAdsData;
  };
}

export function useMetaConnectionStatus(clientId?: string) {
  return useQuery({
    queryKey: ["meta-status", clientId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("meta-oauth", {
          body: { action: "check_status", clientId },
        });
        if (error) throw error;
        return (data || { connected: false }) as { connected: boolean; token?: { expires_at: string } };
      } catch (err) {
        console.error("Error checking Meta status:", err);
        return { connected: false };
      }
    },
    enabled: !!clientId,
  });
}

export function useConnectMeta() {
  return useMutation({
    mutationFn: async ({ clientId, redirectUri }: { clientId: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-oauth", {
        body: { action: "get_auth_url", clientId, redirectUri },
      });
      if (error) throw error;
      return data as { authUrl: string };
    },
  });
}

export function useExchangeMetaCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, code, redirectUri }: { clientId: string; code: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-oauth", {
        body: { action: "exchange_code", clientId, code, redirectUri },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meta-status", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["meta-ads", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["meta-assets", vars.clientId] });
    },
  });
}

export function useDisconnectMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("meta-oauth", {
        body: { action: "disconnect", clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, clientId) => {
      qc.invalidateQueries({ queryKey: ["meta-status", clientId] });
      qc.invalidateQueries({ queryKey: ["meta-ads", clientId] });
      qc.invalidateQueries({ queryKey: ["meta-assets", clientId] });
    },
  });
}

export interface MetaAsset {
  id: string;
  name: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
}

export function useListMetaAssets(clientId?: string, enabled = true) {
  return useQuery({
    queryKey: ["meta-assets", clientId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("meta-oauth", {
          body: { action: "list_meta_assets", clientId },
        });
        if (error) throw error;
        return (data || { businesses: [], adAccounts: [] }) as {
          businesses: MetaAsset[];
          adAccounts: MetaAdAccount[];
        };
      } catch (err) {
        console.error("Error listing Meta assets:", err);
        return { businesses: [], adAccounts: [] };
      }
    },
    enabled: !!clientId && enabled,
    retry: false,
  });
}

