import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaCustomConversion {
  id: string;
  name: string;
  custom_event_type?: string;
  rule?: string;
  account_id: string;
  pixel_id?: string;
}

export function useMetaCustomConversions(clientId?: string) {
  return useQuery({
    queryKey: ["meta-custom-conversions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "meta-custom-conversions",
        { body: { clientId } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.customConversions || []) as MetaCustomConversion[];
    },
    enabled: !!clientId,
    staleTime: 30 * 60 * 1000,
  });
}