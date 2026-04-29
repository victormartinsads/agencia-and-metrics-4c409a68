import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, DailyMetric } from "@/data/mockMetaData";

export interface MetaAdsData {
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  overviewMetrics: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCTR: number;
    avgCPC: number;
    avgROAS: number;
    totalReach: number;
    totalLeadActions?: number;
    totalPurchases?: number;
    totalLandingPageViews?: number;
    totalAddToCart?: number;
    totalInitiateCheckout?: number;
  };
  accountErrors?: { accountId: string; message: string }[];
}

export function useMetaAds(clientId: string | undefined, datePreset = "last_7d") {
  return useQuery<MetaAdsData>({
    queryKey: ["meta-ads", clientId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads", {
        body: { clientId, datePreset },
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
