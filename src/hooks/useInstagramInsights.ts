import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DayOfWeekData {
  day: string;
  value: number;
}

export interface InstagramInsightsData {
  igAccountId: string;
  igAccountName: string;
  followersCount: number;
  newFollowers30d: number;
  dailyFollowers: { date: string; value: number }[];
  followersByDay: DayOfWeekData[];
  reachByDay: DayOfWeekData[];
  videoViewsByDay: DayOfWeekData[];
  adReachByDay: DayOfWeekData[];
  metrics: {
    totalClicks: number;
    totalVideoPlays: number;
    costPerVideoPlay: number;
    totalVV25: number;
    totalVV50: number;
    totalVV75: number;
    totalVV95: number;
    totalThruplay: number;
    totalAdReach: number;
    totalAdImpressions: number;
    avgCTR: number;
    avgFrequency: number;
  };
}

export function useInstagramInsights(clientId: string | undefined, publicSlug?: string) {
  return useQuery<InstagramInsightsData>({
    queryKey: ["instagram-insights", clientId, publicSlug || ""],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-insights", {
        body: { clientId, publicSlug },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as InstagramInsightsData;
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
