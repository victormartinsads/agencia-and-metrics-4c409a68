/**
 * Catálogo unificado de métricas Meta usado em TODOS os seletores
 * (Análise de Funis, Funis individuais, Como Estamos, Diagnóstico).
 *
 * As chaves seguem o naming de `FunnelTotals` (camelCase) retornado por
 * `aggregateCampaignMetrics()`. Aliases legados (snake_case ou apelidos
 * históricos como "revenue", "sales") são resolvidos em `getMetricValue`.
 */
import type { FunnelTotals } from "./metaMetrics";

export type MetricGroup =
  | "performance"
  | "alcance"
  | "trafego"
  | "engajamento"
  | "video"
  | "leads"
  | "vendas"
  | "custos";

export type MetricFormat = "currency" | "number" | "percent" | "multiplier" | "decimal";

export interface MetricDef {
  key: string;
  label: string;
  format: MetricFormat;
  group: MetricGroup;
}

export const GROUP_LABELS: Record<MetricGroup, string> = {
  performance: "Performance",
  alcance: "Alcance",
  trafego: "Tráfego",
  engajamento: "Engajamento",
  video: "Vídeo",
  leads: "Leads & Conversões",
  vendas: "Vendas",
  custos: "Custos",
};

export const META_METRIC_CATALOG: MetricDef[] = [
  // Performance
  { key: "spend", label: "Investimento", format: "currency", group: "performance" },
  { key: "purchaseValue", label: "Faturamento", format: "currency", group: "performance" },
  { key: "roas", label: "ROAS", format: "multiplier", group: "performance" },
  { key: "profit", label: "Lucro", format: "currency", group: "performance" },
  // Alcance
  { key: "impressions", label: "Impressões", format: "number", group: "alcance" },
  { key: "reach", label: "Alcance", format: "number", group: "alcance" },
  { key: "frequency", label: "Frequência", format: "decimal", group: "alcance" },
  // Tráfego
  { key: "clicks", label: "Cliques (todos)", format: "number", group: "trafego" },
  { key: "linkClicks", label: "Cliques no link", format: "number", group: "trafego" },
  { key: "outboundClicks", label: "Cliques de saída", format: "number", group: "trafego" },
  { key: "uniqueClicks", label: "Cliques únicos", format: "number", group: "trafego" },
  { key: "ctr", label: "CTR", format: "percent", group: "trafego" },
  { key: "linkCtr", label: "CTR (link)", format: "percent", group: "trafego" },
  { key: "uniqueCtr", label: "CTR único", format: "percent", group: "trafego" },
  { key: "landingPageViews", label: "Visualizações de página", format: "number", group: "trafego" },
  { key: "lpvRate", label: "Taxa LPV", format: "percent", group: "trafego" },
  // Engajamento
  { key: "postEngagement", label: "Engajamento c/ publicação", format: "number", group: "engajamento" },
  { key: "pageEngagement", label: "Engajamento c/ página", format: "number", group: "engajamento" },
  { key: "postReactions", label: "Reações", format: "number", group: "engajamento" },
  { key: "postComments", label: "Comentários", format: "number", group: "engajamento" },
  { key: "postShares", label: "Compartilhamentos", format: "number", group: "engajamento" },
  { key: "postSaves", label: "Salvamentos", format: "number", group: "engajamento" },
  { key: "pageLikes", label: "Curtidas na página", format: "number", group: "engajamento" },
  { key: "follows", label: "Novos seguidores", format: "number", group: "engajamento" },
  { key: "profileVisits", label: "Visitas ao perfil", format: "number", group: "engajamento" },
  // Vídeo
  { key: "videoPlays", label: "Reproduções de vídeo", format: "number", group: "video" },
  { key: "videoView3s", label: "Visualizações de vídeo 3s", format: "number", group: "video" },
  { key: "thruplays", label: "ThruPlays", format: "number", group: "video" },
  { key: "videoP25", label: "Visualizações 25%", format: "number", group: "video" },
  { key: "videoP50", label: "Visualizações 50%", format: "number", group: "video" },
  { key: "videoP75", label: "Visualizações 75%", format: "number", group: "video" },
  { key: "videoP95", label: "Visualizações 95%", format: "number", group: "video" },
  { key: "videoP100", label: "Visualizações 100%", format: "number", group: "video" },
  { key: "hookRate", label: "Hook rate", format: "percent", group: "video" },
  { key: "holdRate", label: "Hold rate", format: "percent", group: "video" },
  // Leads & Conversões
  { key: "conversions", label: "Resultados (primária)", format: "number", group: "leads" },
  { key: "leads", label: "Leads", format: "number", group: "leads" },
  { key: "leadActions", label: "Ações de lead (Meta)", format: "number", group: "leads" },
  { key: "completeRegistration", label: "Cadastros completos", format: "number", group: "leads" },
  { key: "subscribe", label: "Assinaturas", format: "number", group: "leads" },
  { key: "schedule", label: "Agendamentos", format: "number", group: "leads" },
  { key: "contact", label: "Contatos", format: "number", group: "leads" },
  { key: "submitApplication", label: "Aplicações enviadas", format: "number", group: "leads" },
  { key: "viewContent", label: "Visualizou conteúdo", format: "number", group: "leads" },
  { key: "messages", label: "Mensagens iniciadas", format: "number", group: "leads" },
  { key: "messagingReplies", label: "Respostas (msg)", format: "number", group: "leads" },
  // Vendas
  { key: "addToCart", label: "Adicionou ao carrinho", format: "number", group: "vendas" },
  { key: "initiateCheckout", label: "Iniciou checkout", format: "number", group: "vendas" },
  { key: "addPaymentInfo", label: "Adicionou pagamento", format: "number", group: "vendas" },
  { key: "purchases", label: "Compras / Vendas", format: "number", group: "vendas" },
  { key: "addToWishlist", label: "Lista de desejos", format: "number", group: "vendas" },
  { key: "checkoutRate", label: "Taxa de compra", format: "percent", group: "vendas" },
  // Custos
  { key: "cpc", label: "CPC", format: "currency", group: "custos" },
  { key: "cpm", label: "CPM", format: "currency", group: "custos" },
  { key: "cpcLink", label: "CPC (link)", format: "currency", group: "custos" },
  { key: "cpa", label: "CPA", format: "currency", group: "custos" },
  { key: "cpl", label: "CPL", format: "currency", group: "custos" },
  { key: "cpLead", label: "Custo por lead", format: "currency", group: "custos" },
  { key: "cpFollow", label: "Custo por seguidor", format: "currency", group: "custos" },
  { key: "cpThruplay", label: "Custo por ThruPlay", format: "currency", group: "custos" },
  { key: "cpLpv", label: "Custo por LPV", format: "currency", group: "custos" },
  { key: "cpAddToCart", label: "Custo por add ao carrinho", format: "currency", group: "custos" },
  { key: "cpInitiateCheckout", label: "Custo por checkout", format: "currency", group: "custos" },
  { key: "cpMessage", label: "Custo por mensagem", format: "currency", group: "custos" },
];

/** Aliases legados → chaves do catálogo (FunnelTotals). */
const KEY_ALIASES: Record<string, string> = {
  revenue: "purchaseValue",
  purchase_value: "purchaseValue",
  sales: "purchases",
  link_clicks: "linkClicks",
  outbound_clicks: "outboundClicks",
  unique_clicks: "uniqueClicks",
  landing_page_views: "landingPageViews",
  messaging_conversations_started: "messages",
  add_to_cart: "addToCart",
  initiate_checkout: "initiateCheckout",
  add_payment_info: "addPaymentInfo",
};

/** Resolve uma chave (qualquer alias) para a chave canônica do catálogo. */
export function resolveMetricKey(key: string): string {
  return KEY_ALIASES[key] || key;
}

/** Lê o valor numérico de um totals (FunnelTotals) usando alias-aware lookup. */
export function getMetricValue(totals: Partial<FunnelTotals> | any, key: string): number {
  const k = resolveMetricKey(key);
  return Number(totals?.[k] ?? totals?.[key] ?? 0);
}

/** Procura a definição (label + format) para uma chave qualquer. */
export function findMetricDef(key: string): MetricDef | undefined {
  const k = resolveMetricKey(key);
  return META_METRIC_CATALOG.find((m) => m.key === k);
}

/** Catálogo agrupado para renderização em popovers/seletores. */
export function groupedCatalog(): { group: MetricGroup; label: string; items: MetricDef[] }[] {
  const groups: MetricGroup[] = [
    "performance", "alcance", "trafego", "engajamento", "video", "leads", "vendas", "custos",
  ];
  return groups.map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    items: META_METRIC_CATALOG.filter((m) => m.group === g),
  }));
}