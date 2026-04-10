import { useQuery } from "@tanstack/react-query";
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
  };
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
