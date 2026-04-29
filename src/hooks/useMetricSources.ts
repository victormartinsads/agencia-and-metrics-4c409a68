import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MetricSource = "sheets" | "manual" | "meta" | "webhook";

export interface MetricSourceConfig {
  source: MetricSource;
  /** Para sheets: nome da coluna do header. Para meta: nome do campo. Para webhook: campo agregado (revenue|sales|avg_ticket). */
  field?: string;
  /** Para manual: valor fixo */
  value?: number;
}

export type MetricSourcesMap = Record<string, MetricSourceConfig>;

/** Catálogo de métricas configuráveis exibidas no dashboard. */
export const CONFIGURABLE_METRICS: { key: string; label: string; group: string }[] = [
  { key: "revenue", label: "Faturamento", group: "Resultados" },
  { key: "investment", label: "Investimento", group: "Resultados" },
  { key: "leads", label: "Leads", group: "Funil" },
  { key: "clicks", label: "Cliques (Funil)", group: "Funil" },
  { key: "pageviews", label: "Page Views (Funil)", group: "Funil" },
  { key: "meetings", label: "Reuniões (Funil)", group: "Funil" },
  { key: "sales", label: "Vendas (Funil)", group: "Funil" },
  { key: "low_ticket_meta", label: "Low Ticket - Meta", group: "Low Ticket" },
  { key: "low_ticket_google", label: "Low Ticket - Google", group: "Low Ticket" },
  { key: "mql", label: "MQL", group: "Qualificação" },
  { key: "smql", label: "sMQL", group: "Qualificação" },
];

/** Campos do Meta disponíveis para escolher como fonte. */
export const META_FIELDS = [
  { key: "spend", label: "Investimento (spend)" },
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques no link" },
  { key: "lead_actions", label: "Leads (ações configuradas no cliente)" },
  { key: "purchases", label: "Compras (purchase)" },
  { key: "initiate_checkout", label: "Iniciou checkout" },
  { key: "add_to_cart", label: "Adicionou ao carrinho" },
  { key: "landing_page_views", label: "Page Views (LP)" },
  { key: "reach", label: "Alcance (reach)" },
  { key: "link_clicks", label: "Link Clicks (action)" },
  { key: "post_engagement", label: "Engajamento de post" },
  { key: "page_engagement", label: "Engajamento de página" },
  { key: "video_view", label: "Visualizações de vídeo" },
  { key: "messaging_started", label: "Conversas iniciadas (msg)" },
  { key: "complete_registration", label: "Cadastros completos" },
  { key: "subscribe", label: "Inscrições (subscribe)" },
  { key: "schedule", label: "Agendamentos" },
  { key: "contact", label: "Contatos" },
  { key: "submit_application", label: "Inscrições enviadas" },
  { key: "view_content", label: "Visualizações de conteúdo" },
];

export function useMetricSources(clientId?: string) {
  return useQuery({
    queryKey: ["metric-sources", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dashboard_sheet_config")
        .select("metric_sources")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return ((data?.metric_sources as MetricSourcesMap) || {}) as MetricSourcesMap;
    },
    enabled: !!clientId,
  });
}

export function useUpsertMetricSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, sources }: { clientId: string; sources: MetricSourcesMap }) => {
      // upsert, preservando linha existente
      const { data: existing } = await (supabase as any)
        .from("dashboard_sheet_config")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("dashboard_sheet_config")
          .update({ metric_sources: sources })
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("dashboard_sheet_config")
          .insert([{ client_id: clientId, spreadsheet_id: "", metric_sources: sources }]);
        if (error) throw error;
      }
      return sources;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["metric-sources", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["dashboard-sheet", vars.clientId] });
    },
  });
}

/**
 * Resolve o valor de uma métrica respeitando a fonte configurada.
 * Fallback para o valor padrão (sheetsValue) se nenhuma fonte custom estiver definida.
 */
export function resolveMetricValue(
  metricKey: string,
  sources: MetricSourcesMap | undefined,
  defaults: {
    sheetsValue?: number;
    metaTotals?: Record<string, number>;
    webhookTotals?: Record<string, number>;
  },
): number {
  const cfg = sources?.[metricKey];
  if (!cfg) return defaults.sheetsValue || 0;
  if (cfg.source === "manual") return Number(cfg.value || 0);
  if (cfg.source === "meta" && cfg.field) {
    return Number(defaults.metaTotals?.[cfg.field] || 0);
  }
  if (cfg.source === "webhook" && cfg.field) {
    return Number(defaults.webhookTotals?.[cfg.field] || 0);
  }
  // sheets (default)
  return defaults.sheetsValue || 0;
}