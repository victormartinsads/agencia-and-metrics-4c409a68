import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemographicsRow {
  label: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  results: number;
}

export interface MetaDemographicsData {
  ageGender: DemographicsRow[];
  region: DemographicsRow[];
  country: DemographicsRow[];
  platform?: DemographicsRow[];
  fetched_at?: string;
}

export function useMetaDemographics(clientId?: string, datePreset = "last_30d", enabled = true, publicSlug?: string) {
  return useQuery<MetaDemographicsData>({
    queryKey: ["meta-demographics", clientId, datePreset, publicSlug || ""],
    enabled: enabled && !!clientId,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-demographics", {
        body: { clientId, datePreset, publicSlug },
      });
      if (error) throw error;
      return (data as MetaDemographicsData) || { ageGender: [], region: [], country: [] };
    },
  });
}