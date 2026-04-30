import { useMemo } from "react";
import { Campaign } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";

export type FunnelStage = "topo" | "meio" | "fundo";

export interface FunnelCampaign extends Campaign {
  funnelStage: FunnelStage;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate?: number;
  costPer?: number;
}

export interface FunnelMetrics {
  ctrRate: number;
  lpRate: number;
  atcRate: number;
  checkoutRate: number;
  purchaseRate: number;
  roas: number;
  cpa: number;
}

const TOPO_KEYWORDS = ["captação", "captacao", "seguidores", "engajamento", "visualização", "visualizacao", "video", "awareness", "alcance", "topo"];
const MEIO_KEYWORDS = ["trafego", "tráfego", "lp", "conteudo", "conteúdo", "remarketing", "traffic", "meio", "consideracao", "consideração"];
const FUNDO_KEYWORDS = ["vendas", "conversao", "conversão", "checkout", "remarketing quente", "compra", "purchase", "sales", "fundo", "lead"];

export function classifyFunnel(campaignName: string): FunnelStage {
  const name = campaignName.toLowerCase();
  if (FUNDO_KEYWORDS.some((k) => name.includes(k))) return "fundo";
  if (MEIO_KEYWORDS.some((k) => name.includes(k))) return "meio";
  if (TOPO_KEYWORDS.some((k) => name.includes(k))) return "topo";
  return "meio"; // default
}

export function useFunnelAnalysis(campaigns: Campaign[], overrides?: Record<string, FunnelStage>) {
  return useMemo(() => {
    const classified: FunnelCampaign[] = campaigns.map((c) => ({
      ...c,
      funnelStage: overrides?.[c.id] || classifyFunnel(c.name),
    }));

    const active = classified.filter((c) => c.spend > 0);

    // Aggregate funnel steps
    const totalImpressions = active.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = active.reduce((s, c) => s + c.clicks, 0);
    const totalLPViews = active.reduce((s, c) => s + (c.landingPageViews || 0), 0);
    const totalATC = active.reduce((s, c) => s + (c.addToCart || 0), 0);
    const totalCheckout = active.reduce((s, c) => s + (c.initiateCheckout || 0), 0);
    const totalPurchases = active.reduce((s, c) => s + (c.purchases || 0), 0);
    const totalSpend = active.reduce((s, c) => s + c.spend, 0);
    const totalPurchaseValue = active.reduce((s, c) => s + (c.purchaseValue || 0), 0);

    const funnelSteps: FunnelStep[] = [
      {
        label: "Impressões",
        value: totalImpressions,
        costPer: totalImpressions > 0 ? totalSpend / totalImpressions * 1000 : 0,
      },
      {
        label: "Cliques",
        value: totalClicks,
        rate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        costPer: totalClicks > 0 ? totalSpend / totalClicks : 0,
      },
      {
        label: "Visualizações da Página",
        value: totalLPViews,
        rate: totalClicks > 0 ? (totalLPViews / totalClicks) * 100 : 0,
        costPer: totalLPViews > 0 ? totalSpend / totalLPViews : 0,
      },
      {
        label: "Adições ao Carrinho",
        value: totalATC,
        rate: totalLPViews > 0 ? (totalATC / totalLPViews) * 100 : 0,
        costPer: totalATC > 0 ? totalSpend / totalATC : 0,
      },
      {
        label: "Início de Checkout",
        value: totalCheckout,
        rate: totalATC > 0 ? (totalCheckout / totalATC) * 100 : 0,
        costPer: totalCheckout > 0 ? totalSpend / totalCheckout : 0,
      },
      {
        label: "Compras",
        value: totalPurchases,
        rate: totalCheckout > 0 ? (totalPurchases / totalCheckout) * 100 : 0,
        costPer: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
      },
    ];

    const metrics: FunnelMetrics = {
      ctrRate: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      lpRate: totalClicks > 0 ? (totalLPViews / totalClicks) * 100 : 0,
      atcRate: totalLPViews > 0 ? (totalATC / totalLPViews) * 100 : 0,
      checkoutRate: totalATC > 0 ? (totalCheckout / totalATC) * 100 : 0,
      purchaseRate: totalCheckout > 0 ? (totalPurchases / totalCheckout) * 100 : 0,
      roas: totalSpend > 0 ? totalPurchaseValue / totalSpend : 0,
      cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
    };

    // Rankings
    const withRoas = active.filter((c) => c.roas > 0).sort((a, b) => b.roas - a.roas);
    const withCpa = active.filter((c) => c.costPerConversion > 0).sort((a, b) => a.costPerConversion - b.costPerConversion);
    const withCtr = active.filter((c) => c.ctr > 0).sort((a, b) => b.ctr - a.ctr);

    const topRoas = withRoas.slice(0, 3);
    const topCpa = withCpa.slice(0, 3);
    const topCtr = withCtr.slice(0, 3);

    // By stage
    const topo = classified.filter((c) => c.funnelStage === "topo");
    const meio = classified.filter((c) => c.funnelStage === "meio");
    const fundo = classified.filter((c) => c.funnelStage === "fundo");

    // Recommendations
    const recommendations: string[] = [];
    for (const c of active) {
      if (c.ctr < 1 && c.impressions > 5000) recommendations.push(`Testar novos criativos em "${c.name}" — CTR abaixo de 1%`);
      if (c.costPerConversion > 0 && c.roas < 1) recommendations.push(`Considerar pausar "${c.name}" — ROAS negativo (${c.roas}x)`);
      if (c.ctr > 3 && c.roas > 3) recommendations.push(`Escalar "${c.name}" — CTR alto (${c.ctr}%) e ROAS positivo (${c.roas}x)`);
      if (c.costPerConversion > 0) {
        const avgCpa = active.filter((x) => x.costPerConversion > 0).reduce((s, x) => s + x.costPerConversion, 0) / (active.filter((x) => x.costPerConversion > 0).length || 1);
        if (c.costPerConversion < avgCpa * 0.5) recommendations.push(`Aumentar orçamento em "${c.name}" — CPA abaixo da média`);
      }
      if (c.frequency > 3.5) recommendations.push(`Renovar criativos em "${c.name}" — Frequência alta (${c.frequency}x)`);
    }

    return {
      classified,
      funnelSteps,
      metrics,
      topRoas,
      topCpa,
      topCtr,
      topo,
      meio,
      fundo,
      recommendations: [...new Set(recommendations)].slice(0, 10),
      totalSpend,
      totalPurchaseValue,
    };
  }, [campaigns, overrides]);
}
