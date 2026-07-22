/**
 * Aggregates raw Meta campaign data into the wide catalogue of metrics
 * used across funnel cards. Many fields are not natively typed on Campaign
 * (they may be present as `actionBreakdown` or absent), so we read defensively.
 */
import { Campaign } from "@/data/mockMetaData";
import { formatCurrency } from "@/lib/format";

const num = (v: unknown) => Number(v || 0);

/** Read a field from a Campaign, falling back to actionBreakdown.<key>. */
function read(c: any, key: string): number {
  if (c[key] !== undefined && c[key] !== null) return num(c[key]);
  const ab = c.actionBreakdown || c.actions || {};
  if (ab[key] !== undefined) return num(ab[key]);
  return 0;
}

export interface FunnelTotals {
  // performance
  spend: number;
  purchaseValue: number;
  roas: number;
  profit: number;
  // alcance
  impressions: number;
  reach: number;
  frequency: number;
  // tráfego
  clicks: number;
  linkClicks: number;
  outboundClicks: number;
  uniqueClicks: number;
  ctr: number;
  linkCtr: number;
  uniqueCtr: number;
  landingPageViews: number;
  lpvRate: number;
  // engajamento
  postEngagement: number;
  pageEngagement: number;
  postReactions: number;
  postComments: number;
  postShares: number;
  postSaves: number;
  pageLikes: number;
  follows: number;
  profileVisits: number;
  // vídeo
  videoPlays: number;
  videoView3s: number;
  thruplays: number;
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP95: number;
  videoP100: number;
  hookRate: number;
  holdRate: number;
  avgVideoTime: number;
  // leads
  conversions: number;
  leadActions: number;
  leads: number;
  cpLead: number;
  cpFollow: number;
  completeRegistration: number;
  subscribe: number;
  schedule: number;
  contact: number;
  submitApplication: number;
  viewContent: number;
  messages: number;
  messagingReplies: number;
  // vendas
  addToCart: number;
  initiateCheckout: number;
  addPaymentInfo: number;
  purchases: number;
  addToWishlist: number;
  checkoutRate: number;
  // custos
  cpc: number;
  cpm: number;
  cpcLink: number;
  cpa: number;
  cpl: number;
  cpThruplay: number;
  cpLpv: number;
  cpAddToCart: number;
  cpInitiateCheckout: number;
  cpMessage: number;
}

export function aggregateCampaignMetrics(
  campaigns: Campaign[],
  options?: { leadActionTypes?: string[]; followActionTypes?: string[] },
): FunnelTotals {
  const sum = (key: string) => campaigns.reduce((s, c) => s + read(c, key), 0);
  const sumActions = (types: string[]) =>
    campaigns.reduce((s, c) => {
      const ab = (c as any).actionBreakdown || {};
      let acc = 0;
      for (const t of types) acc += Number(ab[t] || 0);
      return s + acc;
    }, 0);

  const spend = sum("spend");
  const impressions = sum("impressions");
  const reach = sum("reach");
  const clicks = sum("clicks");
  const linkClicks = sum("link_clicks") || sum("linkClicks");
  const outboundClicks = sum("outbound_clicks") || sum("outboundClicks");
  const uniqueClicks = sum("unique_clicks") || sum("uniqueClicks");
  const landingPageViews = sum("landing_page_views") || sum("landingPageViews");
  const purchases = sum("purchases");
  const purchaseValue = sum("purchaseValue") || sum("purchase_value") || sum("revenue");
  const conversions = sum("conversions");
  // Default lead catalogue — used when the user hasn't picked a mapping yet.
  // Mirrors the daily lead aggregation in the meta-ads edge function so the
  // numbers match what the Meta gerenciador shows as "Leads".
  const DEFAULT_LEAD_TYPES = [
    "lead",
    "leads",
    "offsite_conversion.fb_pixel_lead",
    "onsite_conversion.lead_grouped",
  ];
  const leadActions =
    sum("lead_actions") ||
    sum("leadActions") ||
    sumActions(DEFAULT_LEAD_TYPES);
  // Configurable "leads" for the funnel — default to broad catalogue
  const leadActionTypesUsed =
    options?.leadActionTypes && options.leadActionTypes.length > 0
      ? options.leadActionTypes
      : DEFAULT_LEAD_TYPES;
  const rawLeads = sum("leads") || sum("lead") || sumActions(leadActionTypesUsed);
  const leads = rawLeads > 0 ? rawLeads : (conversions > 0 ? conversions : 0);
  const DEFAULT_FOLLOW_TYPES = ["follow", "onsite_conversion.follow"];
  const followActionTypesUsed =
    options?.followActionTypes && options.followActionTypes.length > 0
      ? options.followActionTypes
      : DEFAULT_FOLLOW_TYPES;
  const followsCount =
    sumActions(followActionTypesUsed) ||
    sum("follow") ||
    sum("follows");
  const addToCart = sum("addToCart") || sum("add_to_cart");
  const initiateCheckout = sum("initiateCheckout") || sum("initiate_checkout");
  const addPaymentInfo = sum("add_payment_info") || sum("addPaymentInfo");
  const messages = sum("messages") || sum("messaging_started") || sum("messaging_conversations_started");
  const messagingReplies = sum("messaging_replies") || sum("messagingReplies");

  const videoView3s = sum("video_view") || sum("video_3s") || sum("videoView3s");
  const thruplays = sum("thruplays") || sum("video_thruplay_watched_actions");
  const videoPlays = sum("video_play") || sum("videoPlays");
  const videoP25 = sum("video_p25_watched_actions") || sum("videoP25");
  const videoP50 = sum("video_p50_watched_actions") || sum("videoP50");
  const videoP75 = sum("video_p75_watched_actions") || sum("videoP75");
  const videoP95 = sum("video_p95_watched_actions") || sum("videoP95");
  const videoP100 = sum("video_p100_watched_actions") || sum("videoP100");

  const totals: FunnelTotals = {
    spend,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    profit: purchaseValue - spend,

    impressions,
    reach,
    frequency: reach > 0 ? impressions / reach : 0,

    clicks,
    linkClicks,
    outboundClicks,
    uniqueClicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    uniqueCtr: reach > 0 ? (uniqueClicks / reach) * 100 : 0,
    landingPageViews,
    lpvRate: clicks > 0 ? (landingPageViews / clicks) * 100 : 0,

    postEngagement: sum("post_engagement") || sum("postEngagement"),
    pageEngagement: sum("page_engagement") || sum("pageEngagement"),
    postReactions: sum("post_reaction") || sum("postReactions"),
    postComments: sum("comment") || sum("postComments"),
    postShares: sum("post") || sum("postShares"),
    postSaves: sum("onsite_conversion.post_save") || sum("postSaves"),
    pageLikes: sum("like") || sum("pageLikes"),
    follows: sum("follow") || sum("follows"),
    // Visitas ao Perfil: Meta API não retorna "profile_visit" como action_type.
    // O backend (meta-ads) marca campanhas de Captação de Seguidores com
    // primaryResultKey === "_profile_visit" e usa `conversions = link_click`
    // como proxy. Espelhamos a mesma lógica do pódio aqui para que a
    // Análise de Funis exiba o mesmo valor.
    profileVisits:
      sum("profile_visit") ||
      sum("profileVisits") ||
      campaigns.reduce((s, c: any) => {
        const isProfileVisit =
          c?.primaryResultKey === "_profile_visit" ||
          c?.primaryActionType === "_profile_visit";
        return s + (isProfileVisit ? num(c?.conversions || c?.linkClicks || c?.link_clicks) : 0);
      }, 0),

    videoPlays,
    videoView3s,
    thruplays,
    videoP25,
    videoP50,
    videoP75,
    videoP95,
    videoP100,
    hookRate: impressions > 0 ? (videoView3s / impressions) * 100 : 0,
    holdRate: videoView3s > 0 ? (videoP95 / videoView3s) * 100 : 0,
    avgVideoTime: 0,

    conversions,
    leadActions,
    leads,
    cpLead: leads > 0 ? spend / leads : 0,
    cpFollow: followsCount > 0 ? spend / followsCount : 0,
    completeRegistration: sum("complete_registration") || sum("completeRegistration"),
    subscribe: sum("subscribe"),
    schedule: sum("schedule"),
    contact: sum("contact"),
    submitApplication: sum("submit_application") || sum("submitApplication"),
    viewContent: sum("view_content") || sum("viewContent"),
    messages,
    messagingReplies,

    addToCart,
    initiateCheckout,
    addPaymentInfo,
    purchases,
    addToWishlist: sum("add_to_wishlist") || sum("addToWishlist"),
    checkoutRate: initiateCheckout > 0 ? (purchases / initiateCheckout) * 100 : 0,

    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpcLink: linkClicks > 0 ? spend / linkClicks : 0,
    cpa: purchases > 0 ? spend / purchases : conversions > 0 ? spend / conversions : 0,
    cpl: leadActions > 0 ? spend / leadActions : conversions > 0 ? spend / conversions : 0,
    cpThruplay: thruplays > 0 ? spend / thruplays : 0,
    cpLpv: landingPageViews > 0 ? spend / landingPageViews : 0,
    cpAddToCart: addToCart > 0 ? spend / addToCart : 0,
    cpInitiateCheckout: initiateCheckout > 0 ? spend / initiateCheckout : 0,
    cpMessage: messages > 0 ? spend / messages : 0,
  };

  return totals;
}

const CURRENCY_KEYS = new Set([
  "spend",
  "purchaseValue",
  "profit",
  "cpc",
  "cpm",
  "cpcLink",
  "cpa",
  "cpl",
  "cpLead",
  "cpFollow",
  "cpThruplay",
  "cpLpv",
  "cpAddToCart",
  "cpInitiateCheckout",
  "cpMessage",
]);

const PERCENT_KEYS = new Set([
  "ctr",
  "linkCtr",
  "uniqueCtr",
  "lpvRate",
  "hookRate",
  "holdRate",
  "checkoutRate",
]);

const DECIMAL_KEYS = new Set(["roas", "frequency", "avgVideoTime"]);

export function formatMetricValue(key: string, value: number, currency = "R$"): string {
  if (CURRENCY_KEYS.has(key)) return formatCurrency(value, currency);
  if (PERCENT_KEYS.has(key)) return `${value.toFixed(2)}%`;
  if (key === "roas") return `${value.toFixed(2)}x`;
  if (DECIMAL_KEYS.has(key)) return value.toFixed(2);
  return Math.round(value).toLocaleString("pt-BR");
}
