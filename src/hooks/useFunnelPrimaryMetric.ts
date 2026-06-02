import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-primary-metrics";

export const PRIMARY_METRIC_OPTIONS = [
  { key: "conversions", label: "Resultados" },
  { key: "lead", label: "Leads" },
  { key: "purchase", label: "Compras" },
  { key: "link_click", label: "Cliques no Link" },
  { key: "onsite_conversion.messaging_conversation_started_7d", label: "Conversas por Mensagem" },
  { key: "complete_registration", label: "Cadastros" },
  { key: "subscribe", label: "Inscrições" },
  { key: "schedule", label: "Agendamentos" },
  { key: "contact", label: "Contato" },
  { key: "submit_application", label: "Aplicação Enviada" },
  { key: "view_content", label: "Visualização de Conteúdo" },
  { key: "_profile_visit", label: "Visitas ao Perfil" },
];

export function useFunnelPrimaryMetrics(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_primary_metrics")
        .select("funnel_code,primary_metric")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data || []) {
        map[row.funnel_code] = row.primary_metric;
      }
      return map;
    },
  });
}

export function useSaveFunnelPrimaryMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      metricKey,
    }: {
      clientId: string;
      funnelCode: string;
      metricKey: string;
    }) => {
      const { error } = await supabase
        .from("funnel_primary_metrics")
        .upsert(
          {
            client_id: clientId,
            funnel_code: funnelCode,
            primary_metric: metricKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
      qc.invalidateQueries({ queryKey: ["meta-ads", vars.clientId] });
    },
  });
}
