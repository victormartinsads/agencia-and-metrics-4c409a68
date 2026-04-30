import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelCardMetric {
  key: string;
  label: string;
  /** Optional category to help users picking metrics. */
  group?: "performance" | "topo" | "meio" | "fundo" | "custos" | "branding";
}

/** All metrics a user can pick from for a funnel card. */
export const ALL_FUNNEL_METRICS: FunnelCardMetric[] = [
  { key: "spend",          label: "Investido",          group: "performance" },
  { key: "impressions",    label: "Impressões",         group: "topo" },
  { key: "reach",          label: "Alcance",            group: "topo" },
  { key: "frequency",      label: "Frequência",         group: "topo" },
  { key: "clicks",         label: "Cliques",            group: "meio" },
  { key: "ctr",            label: "CTR",                group: "meio" },
  { key: "cpc",            label: "CPC",                group: "custos" },
  { key: "cpm",            label: "CPM",                group: "custos" },
  { key: "landingPageViews", label: "PageViews",        group: "meio" },
  { key: "addToCart",      label: "Add ao Carrinho",    group: "fundo" },
  { key: "initiateCheckout", label: "Checkouts",        group: "fundo" },
  { key: "messages",       label: "Mensagens",          group: "meio" },
  { key: "conversions",    label: "Conversões/Leads",   group: "fundo" },
  { key: "purchases",      label: "Vendas",             group: "fundo" },
  { key: "purchaseValue",  label: "Receita",            group: "performance" },
  { key: "roas",           label: "ROAS",               group: "performance" },
  { key: "cpa",            label: "CPA",                group: "custos" },
  { key: "cpl",            label: "CPL",                group: "custos" },
];

/** Default metrics depending on funnel code. */
export function defaultMetricsFor(code: string): string[] {
  // Topo de funil → engajamento
  if (["F1", "F14", "F15"].includes(code)) {
    return ["spend", "impressions", "reach", "clicks", "ctr"];
  }
  // Mensagens / Call de Vendas
  if (["F3", "F7"].includes(code)) {
    return ["spend", "clicks", "messages", "conversions", "cpl"];
  }
  // Captura/Lead
  if (["F4", "F5", "F6", "F10"].includes(code)) {
    return ["spend", "clicks", "landingPageViews", "conversions", "cpl"];
  }
  // Workshops
  if (["F11", "F12", "F13"].includes(code)) {
    return ["spend", "landingPageViews", "conversions", "cpl", "ctr"];
  }
  // Vendas (low/mid/corredor japonês/F2)
  if (["F2", "F8", "F9"].includes(code)) {
    return ["spend", "purchases", "purchaseValue", "roas", "cpa"];
  }
  return ["spend", "clicks", "conversions", "cpa", "roas"];
}

const KEY = "funnel-card-config";

export function useFunnelCardConfig(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_card_config")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
        map[row.funnel_code] = (row.metrics as string[]) || [];
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelCardConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      metrics,
    }: {
      clientId: string;
      funnelCode: string;
      metrics: string[];
    }) => {
      const { error } = await supabase
        .from("funnel_card_config")
        .upsert(
          { client_id: clientId, funnel_code: funnelCode, metrics, updated_at: new Date().toISOString() },
          { onConflict: "client_id,funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}