import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  avgCpc: number;
}

export interface GoogleAdsData {
  campaigns?: GoogleAdsCampaign[];
  totals?: {
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
  notConfigured?: boolean;
  notConnected?: boolean;
  needsCustomerId?: boolean;
  error?: string;
  message?: string;
}

export function useGoogleAds(clientId?: string, dateRange?: string, enabled = true, publicSlug?: string) {
  return useQuery({
    queryKey: ["google-ads", clientId, dateRange, publicSlug || ""],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads", {
        body: { clientId, dateRange, publicSlug },
      });
      if (error) throw error;
      return data as GoogleAdsData;
    },
    enabled: !!clientId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}