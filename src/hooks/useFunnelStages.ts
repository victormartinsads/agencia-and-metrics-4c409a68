import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FunnelStage {
  id: string;
  client_id: string;
  campaign_id: string | null;
  name: string;
  metric_key: string;
  sort_order: number;
}

const QUERY_KEY = "funnel-stages";

export const AVAILABLE_METRICS = [
  { key: "impressions", label: "Impressões" },
  { key: "reach", label: "Alcance" },
  { key: "clicks", label: "Cliques" },
  { key: "landing_page_views", label: "Visualizações de página" },
  { key: "messaging_conversations_started", label: "Conversas iniciadas" },
  { key: "leads", label: "Leads" },
  { key: "add_to_cart", label: "Adição ao carrinho" },
  { key: "initiate_checkout", label: "Finalização de compra" },
  { key: "purchases", label: "Compras / Vendas" },
  { key: "conversions", label: "Resultados (geral)" },
];

export const DEFAULT_STAGES: Omit<FunnelStage, "id" | "client_id" | "campaign_id">[] = [
  { name: "Visualização", metric_key: "impressions", sort_order: 0 },
  { name: "Clique", metric_key: "clicks", sort_order: 1 },
  { name: "Lead", metric_key: "leads", sort_order: 2 },
  { name: "Venda", metric_key: "purchases", sort_order: 3 },
];

export function useFunnelStages(clientId: string | undefined, campaignId?: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, clientId, campaignId ?? "default"],
    queryFn: async () => {
      // Try campaign-specific first, fallback to client template
      if (campaignId) {
        const { data } = await supabase
          .from("funnel_stages")
          .select("*")
          .eq("client_id", clientId!)
          .eq("campaign_id", campaignId)
          .order("sort_order");
        if (data && data.length > 0) return data as FunnelStage[];
      }
      // Client template (campaign_id is null)
      const { data, error } = await supabase
        .from("funnel_stages")
        .select("*")
        .eq("client_id", clientId!)
        .is("campaign_id", null)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as FunnelStage[];
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, campaignId, stages }: {
      clientId: string;
      campaignId?: string | null;
      stages: Omit<FunnelStage, "id" | "client_id" | "campaign_id">[];
    }) => {
      // Delete existing stages for this client+campaign
      let query = supabase
        .from("funnel_stages")
        .delete()
        .eq("client_id", clientId);
      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      } else {
        query = query.is("campaign_id", null);
      }
      await query;

      // Insert new stages
      const rows = stages.map((s, i) => ({
        client_id: clientId,
        campaign_id: campaignId || null,
        name: s.name,
        metric_key: s.metric_key,
        sort_order: i,
      }));
      const { error } = await supabase.from("funnel_stages").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, vars.clientId] });
    },
  });
}
