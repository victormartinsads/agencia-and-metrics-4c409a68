export interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm?: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
  reach: number;
  frequency: number;
  creatives: Creative[];
  primaryResultLabel?: string;
  primaryResultKey?: string;
  // Funnel metrics
  landingPageViews?: number;
  addToCart?: number;
  initiateCheckout?: number;
  purchases?: number;
  purchaseValue?: number;
  // Raw Meta breakdowns
  actionBreakdown?: Record<string, number>;
  costPerAction?: Record<string, number>;
  actionValues?: Record<string, number>;
  // Raw Video & Click metrics from Meta Edge Function
  dailyBudget?: number;
  lifetimeBudget?: number;
  videoPlays?: number;
  thruplays?: number;
  videoP25?: number;
  videoP50?: number;
  videoP75?: number;
  videoP95?: number;
  videoP100?: number;
  avgVideoTime?: number;
  linkClicks?: number;
  linkCtr?: number;
  cpcLink?: number;
  uniqueClicks?: number;
  uniqueCtr?: number;
  outboundClicks?: number;
  // Custom computed metrics for Traffic Manager
  hookRate?: number;
  holdRate?: number;
  pageLeak?: number;
  leadQuality?: number;
  costPerThruplay?: number;
  cpcUnique?: number;
  schedule?: number;
  messaging_started?: number;
}


export interface Creative {
  id: string;
  name: string;
  adsetName?: string;
  type: "image" | "video" | "carousel";
  thumbnail: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  roas: number;
  primaryResult?: number;
  permalinkUrl?: string;
}

export interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export const dailyMetrics: DailyMetric[] = [
  { date: "01/04", spend: 320, impressions: 45000, clicks: 1800, conversions: 42 },
  { date: "02/04", spend: 285, impressions: 39000, clicks: 1560, conversions: 38 },
  { date: "03/04", spend: 410, impressions: 58000, clicks: 2320, conversions: 55 },
  { date: "04/04", spend: 375, impressions: 52000, clicks: 2080, conversions: 48 },
  { date: "05/04", spend: 450, impressions: 63000, clicks: 2520, conversions: 62 },
  { date: "06/04", spend: 390, impressions: 54000, clicks: 2160, conversions: 51 },
  { date: "07/04", spend: 520, impressions: 72000, clicks: 2880, conversions: 70 },
  { date: "08/04", spend: 480, impressions: 67000, clicks: 2680, conversions: 65 },
  { date: "09/04", spend: 350, impressions: 49000, clicks: 1960, conversions: 46 },
  { date: "10/04", spend: 440, impressions: 61000, clicks: 2440, conversions: 58 },
];

const creativeNames = [
  "Banner Principal", "Story Vertical", "Carrossel Produtos", "Video Depoimento",
  "Banner Oferta", "Reels Curto", "Story Animado", "Banner Retargeting",
  "Video Tutorial", "Carrossel Lifestyle", "Banner CTA", "Video UGC",
];

function generateCreatives(count: number): Creative[] {
  return Array.from({ length: count }, (_, i) => {
    const impressions = Math.floor(Math.random() * 50000) + 10000;
    const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01));
    const spend = Math.floor(Math.random() * 200) + 50;
    const conversions = Math.floor(clicks * (Math.random() * 0.05 + 0.01));
    return {
      id: `cr-${Math.random().toString(36).slice(2, 8)}`,
      name: creativeNames[i % creativeNames.length],
      type: (["image", "video", "carousel"] as const)[i % 3],
      thumbnail: `https://picsum.photos/seed/${i + 10}/300/300`,
      impressions,
      clicks,
      ctr: Number(((clicks / impressions) * 100).toFixed(2)),
      spend,
      conversions,
      roas: Number(((conversions * 45) / spend).toFixed(2)),
    };
  });
}

export const campaigns: Campaign[] = [
  {
    id: "camp-1",
    name: "🛒 E-commerce — Vendas Q2",
    status: "active",
    objective: "Conversões",
    spend: 4250,
    impressions: 580000,
    clicks: 23200,
    ctr: 4.0,
    cpc: 0.18,
    conversions: 580,
    costPerConversion: 7.33,
    roas: 5.8,
    reach: 320000,
    frequency: 1.81,
    creatives: generateCreatives(5),
  },
  {
    id: "camp-2",
    name: "🎯 Retargeting — Carrinho Abandonado",
    status: "active",
    objective: "Conversões",
    spend: 1850,
    impressions: 210000,
    clicks: 12600,
    ctr: 6.0,
    cpc: 0.15,
    conversions: 420,
    costPerConversion: 4.4,
    roas: 8.2,
    reach: 95000,
    frequency: 2.21,
    creatives: generateCreatives(4),
  },
  {
    id: "camp-3",
    name: "📢 Brand Awareness — Lançamento",
    status: "active",
    objective: "Alcance",
    spend: 2100,
    impressions: 890000,
    clicks: 8900,
    ctr: 1.0,
    cpc: 0.24,
    conversions: 120,
    costPerConversion: 17.5,
    roas: 2.1,
    reach: 650000,
    frequency: 1.37,
    creatives: generateCreatives(6),
  },
  {
    id: "camp-4",
    name: "📱 App Install — Mobile First",
    status: "paused",
    objective: "Instalações",
    spend: 980,
    impressions: 320000,
    clicks: 9600,
    ctr: 3.0,
    cpc: 0.1,
    conversions: 290,
    costPerConversion: 3.38,
    roas: 4.5,
    reach: 280000,
    frequency: 1.14,
    creatives: generateCreatives(3),
  },
  {
    id: "camp-5",
    name: "🎥 Video Views — Institucional",
    status: "completed",
    objective: "Visualizações",
    spend: 750,
    impressions: 450000,
    clicks: 4500,
    ctr: 1.0,
    cpc: 0.17,
    conversions: 45,
    costPerConversion: 16.67,
    roas: 1.8,
    reach: 380000,
    frequency: 1.18,
    creatives: generateCreatives(4),
  },
];

export const overviewMetrics = {
  totalSpend: campaigns.reduce((s, c) => s + c.spend, 0),
  totalImpressions: campaigns.reduce((s, c) => s + c.impressions, 0),
  totalClicks: campaigns.reduce((s, c) => s + c.clicks, 0),
  totalConversions: campaigns.reduce((s, c) => s + c.conversions, 0),
  avgCTR: Number((campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length).toFixed(2)),
  avgCPC: Number((campaigns.reduce((s, c) => s + c.cpc, 0) / campaigns.length).toFixed(2)),
  avgROAS: Number((campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length).toFixed(2)),
  totalReach: campaigns.reduce((s, c) => s + c.reach, 0),
};
