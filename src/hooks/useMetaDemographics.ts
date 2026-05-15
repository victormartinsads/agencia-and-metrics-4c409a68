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
  fetched_at?: string;
}

export function useMetaDemographics(clientId?: string, datePreset = "last_30d", enabled = true) {
  return useQuery<MetaDemographicsData>({
    queryKey: ["meta-demographics", clientId, datePreset],
    enabled: enabled && !!clientId,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-demographics", {
        body: { clientId, datePreset },
      });
      if (error) throw error;
      return (data as MetaDemographicsData) || { ageGender: [], region: [], country: [] };
    },
  });
}