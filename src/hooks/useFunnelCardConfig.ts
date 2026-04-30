import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelCardMetric {
  key: string;
  label: string;
  /** Optional category to help users picking metrics. */
  group?:
    | "performance"
    | "alcance"
    | "trafego"
    | "engajamento"
    | "video"
    | "leads"
    | "vendas"
    | "custos";
}

/**
 * All metrics a user can pick from for a funnel card.
 * Exposes the full Meta Ads catalogue: performance, reach, traffic,
 * engagement, video, leads/conversions, sales and cost metrics.
 */
export const ALL_FUNNEL_METRICS: FunnelCardMetric[] = [
  // Performance / financeiro
  { key: "spend", label: "Investido", group: "performance" },
  { key: "purchaseValue", label: "Receita", group: "performance" },
  { key: "roas", label: "ROAS", group: "performance" },
  { key: "profit", label: "Lucro estimado", group: "performance" },

  // Alcance / impressões
  { key: "impressions", label: "Impressões", group: "alcance" },
  { key: "reach", label: "Alcance", group: "alcance" },
  { key: "frequency", label: "Frequência", group: "alcance" },

  // Tráfego
  { key: "clicks", label: "Cliques (todos)", group: "trafego" },
  { key: "linkClicks", label: "Cliques no link", group: "trafego" },
  { key: "outboundClicks", label: "Cliques externos", group: "trafego" },
  { key: "uniqueClicks", label: "Cliques únicos", group: "trafego" },
  { key: "ctr", label: "CTR", group: "trafego" },
  { key: "linkCtr", label: "CTR (link)", group: "trafego" },
  { key: "uniqueCtr", label: "CTR único", group: "trafego" },
  { key: "landingPageViews", label: "PageViews (LP)", group: "trafego" },
  { key: "lpvRate", label: "Taxa LPV / clique", group: "trafego" },

  // Engajamento
  { key: "postEngagement", label: "Engajamento c/ post", group: "engajamento" },
  { key: "pageEngagement", label: "Engajamento c/ página", group: "engajamento" },
  { key: "postReactions", label: "Reações", group: "engajamento" },
  { key: "postComments", label: "Comentários", group: "engajamento" },
  { key: "postShares", label: "Compartilhamentos", group: "engajamento" },
  { key: "postSaves", label: "Salvamentos", group: "engajamento" },
  { key: "pageLikes", label: "Curtidas da página", group: "engajamento" },
  { key: "follows", label: "Seguidores", group: "engajamento" },
  { key: "profileVisits", label: "Visitas ao perfil", group: "engajamento" },

  // Vídeo
  { key: "videoPlays", label: "Plays", group: "video" },
  { key: "videoView3s", label: "Views 3s", group: "video" },
  { key: "thruplays", label: "ThruPlays", group: "video" },
  { key: "videoP25", label: "Vídeo 25%", group: "video" },
  { key: "videoP50", label: "Vídeo 50%", group: "video" },
  { key: "videoP75", label: "Vídeo 75%", group: "video" },
  { key: "videoP95", label: "Vídeo 95%", group: "video" },
  { key: "videoP100", label: "Vídeo 100%", group: "video" },
  { key: "hookRate", label: "Hook rate (3s/imp)", group: "video" },
  { key: "holdRate", label: "Hold rate (95%/3s)", group: "video" },
  { key: "avgVideoTime", label: "Tempo médio (s)", group: "video" },

  // Leads / conversões
  { key: "conversions", label: "Conversões/Leads", group: "leads" },
  { key: "leadActions", label: "Leads (ação Meta)", group: "leads" },
  { key: "completeRegistration", label: "Cadastros", group: "leads" },
  { key: "subscribe", label: "Inscrições", group: "leads" },
  { key: "schedule", label: "Agendamentos", group: "leads" },
  { key: "contact", label: "Contatos", group: "leads" },
  { key: "submitApplication", label: "Aplicações enviadas", group: "leads" },
  { key: "viewContent", label: "Visualizações de conteúdo", group: "leads" },
  { key: "messages", label: "Conversas iniciadas", group: "leads" },
  { key: "messagingReplies", label: "Respostas de mensagem", group: "leads" },

  // Vendas / e-commerce
  { key: "addToCart", label: "Add ao carrinho", group: "vendas" },
  { key: "initiateCheckout", label: "Checkouts iniciados", group: "vendas" },
  { key: "addPaymentInfo", label: "Pagamento adicionado", group: "vendas" },
  { key: "purchases", label: "Vendas (qtd)", group: "vendas" },
  { key: "addToWishlist", label: "Wishlist", group: "vendas" },
  { key: "checkoutRate", label: "Conversão checkout", group: "vendas" },

  // Custos / eficiência
  { key: "cpc", label: "CPC", group: "custos" },
  { key: "cpm", label: "CPM", group: "custos" },
  { key: "cpcLink", label: "CPC (link)", group: "custos" },
  { key: "cpa", label: "CPA", group: "custos" },
  { key: "cpl", label: "CPL", group: "custos" },
  { key: "cpThruplay", label: "Custo / ThruPlay", group: "custos" },
  { key: "cpLpv", label: "Custo / LPV", group: "custos" },
  { key: "cpAddToCart", label: "Custo / Add carrinho", group: "custos" },
  { key: "cpInitiateCheckout", label: "Custo / Checkout", group: "custos" },
  { key: "cpMessage", label: "Custo / Mensagem", group: "custos" },
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