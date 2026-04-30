import { useMemo } from "react";
import { Campaign, Creative } from "@/data/mockMetaData";
import { classifyFunnel, FunnelStage } from "@/hooks/useFunnelAnalysis";
import { getFunnelLabelOrNull } from "@/lib/funnelGrouping";

export type CampaignClassification = "escalar" | "manter" | "revisar" | "pausar";

export interface ClassifiedCampaign extends Campaign {
  funnelStage: FunnelStage;
  classification: CampaignClassification;
}

export interface AdSetPerformance {
  name: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  roas: number;
}

export interface ObjectiveGroup {
  objective: string;
  campaigns: ClassifiedCampaign[];
  totalSpend: number;
  totalResults: number;
  avgCPA: number;
  avgCTR: number;
  avgCPM: number;
}

export interface HealthScore {
  score: number;
  label: string;
  color: string;
}

export interface ComoEstamosMetrics {
  totalSpend: number;
  totalResults: number;
  totalLeads: number;
  totalConversations: number;
  cpl: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversionRate: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgFrequency: number;
  trafficUtilization: number;
  trafficLoss: number;
}

function calcMetrics(campaigns: Campaign[]): ComoEstamosMetrics {
  const active = campaigns.filter(c => c.spend > 0);
  const totalSpend = active.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = active.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = active.reduce((s, c) => s + c.clicks, 0);
  const totalResults = active.reduce((s, c) => s + c.conversions, 0);
  const totalReach = active.reduce((s, c) => s + c.reach, 0);
  const totalLeads = active.filter(c => 
    c.primaryResultKey === "lead" || c.objective?.toLowerCase().includes("lead")
  ).reduce((s, c) => s + c.conversions, 0);
  const totalConversations = active.filter(c => 
    c.primaryResultKey?.includes("messaging") || c.name.toLowerCase().includes("whatsapp") || c.name.toLowerCase().includes("wpp")
  ).reduce((s, c) => s + c.conversions, 0);

  const count = active.length || 1;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const cpa = totalResults > 0 ? totalSpend / totalResults : 0;
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const conversionRate = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;
  const trafficUtilization = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;
  const avgFrequency = active.reduce((s, c) => s + c.frequency, 0) / count;
  
  const totalPurchaseValue = active.reduce((s, c) => s + (c.purchaseValue || 0), 0);
  const roas = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;

  return {
    totalSpend, totalResults, totalLeads, totalConversations,
    cpl, cpa, roas, ctr, cpc, cpm, conversionRate,
    totalImpressions, totalClicks, totalReach,
    avgFrequency, trafficUtilization, trafficLoss: 100 - trafficUtilization,
  };
}

function classifyCampaign(c: Campaign): CampaignClassification {
  if (c.status !== "active" || c.spend === 0) return "pausar";
  const hasGoodCTR = c.ctr >= 1.5;
  const hasGoodCPA = c.costPerConversion > 0 && c.costPerConversion < 50;
  const hasGoodROAS = c.roas >= 2;
  const hasResults = c.conversions >= 3;

  if (hasGoodCTR && hasResults && (hasGoodCPA || hasGoodROAS)) return "escalar";
  if (hasResults && (c.ctr >= 0.8 || c.roas >= 1)) return "manter";
  if (c.impressions > 1000 && (c.ctr < 0.5 || (c.costPerConversion > 0 && c.roas < 0.5))) return "pausar";
  return "revisar";
}

export function calcHealthScore(m: ComoEstamosMetrics): HealthScore {
  let score = 50;
  if (m.ctr >= 2) score += 15; else if (m.ctr >= 1) score += 8; else score -= 10;
  if (m.cpa > 0 && m.cpa < 20) score += 15; else if (m.cpa < 50) score += 5; else score -= 10;
  if (m.cpm < 15) score += 10; else if (m.cpm < 30) score += 5; else score -= 5;
  if (m.conversionRate >= 5) score += 10; else if (m.conversionRate >= 2) score += 5;
  if (m.trafficUtilization >= 10) score += 10; else if (m.trafficUtilization >= 5) score += 5;
  
  score = Math.max(0, Math.min(100, score));
  
  if (score >= 90) return { score, label: "Excelente", color: "text-green-400" };
  if (score >= 70) return { score, label: "Saudável", color: "text-blue-400" };
  if (score >= 50) return { score, label: "Atenção", color: "text-yellow-400" };
  return { score, label: "Crítico", color: "text-red-400" };
}

export function generateAlerts(m: ComoEstamosMetrics, prev?: ComoEstamosMetrics): string[] {
  const alerts: string[] = [];
  if (m.ctr < 1) alerts.push("CTR abaixo de 1% — criativos podem precisar de renovação");
  if (m.cpm > 30) alerts.push(`CPM elevado (R$ ${m.cpm.toFixed(2)}) — público pode estar saturado`);
  if (m.trafficLoss > 80) alerts.push(`Perda de tráfego de ${m.trafficLoss.toFixed(0)}% — revisar página de destino`);
  if (m.avgFrequency > 3) alerts.push(`Frequência alta (${m.avgFrequency.toFixed(1)}x) — risco de fadiga`);
  if (prev) {
    if (prev.ctr > 0 && m.ctr < prev.ctr * 0.7) alerts.push(`CTR caiu ${(((prev.ctr - m.ctr) / prev.ctr) * 100).toFixed(0)}% vs período anterior`);
    if (prev.cpa > 0 && m.cpa > prev.cpa * 1.3) alerts.push(`CPA subiu ${(((m.cpa - prev.cpa) / prev.cpa) * 100).toFixed(0)}% vs período anterior`);
    if (prev.totalResults > 0 && m.totalResults < prev.totalResults * 0.7) alerts.push(`Conversões caíram ${(((prev.totalResults - m.totalResults) / prev.totalResults) * 100).toFixed(0)}%`);
  }
  return alerts;
}

export function useComoEstamos(campaigns: Campaign[], previousCampaigns?: Campaign[]) {
  return useMemo(() => {
    const metrics = calcMetrics(campaigns);
    const prevMetrics = previousCampaigns ? calcMetrics(previousCampaigns) : undefined;

    const classified: ClassifiedCampaign[] = campaigns.map(c => ({
      ...c,
      funnelStage: classifyFunnel(c.name),
      classification: classifyCampaign(c),
    }));

    // Ad sets
    const adSetMap = new Map<string, AdSetPerformance>();
    for (const c of classified) {
      for (const cr of c.creatives) {
        const name = cr.adsetName || cr.name;
        const existing = adSetMap.get(name);
        if (existing) {
          existing.spend += cr.spend;
          existing.impressions += cr.impressions;
          existing.clicks += cr.clicks;
          existing.conversions += cr.conversions;
        } else {
          adSetMap.set(name, {
            name,
            campaignName: c.name,
            spend: cr.spend,
            impressions: cr.impressions,
            clicks: cr.clicks,
            ctr: 0, cpc: 0, conversions: cr.conversions, cpa: 0, roas: 0,
          });
        }
      }
    }
    const adSets = Array.from(adSetMap.values()).map(a => ({
      ...a,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
      cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
      roas: a.spend > 0 ? (a.conversions * 50) / a.spend : 0,
    }));
    const topAdSets = [...adSets].sort((a, b) => a.cpa - b.cpa || b.conversions - a.conversions).filter(a => a.conversions > 0).slice(0, 5);

    // By objective
    const objMap = new Map<string, ClassifiedCampaign[]>();
    for (const c of classified) {
      const obj = c.objective || "Outros";
      if (!objMap.has(obj)) objMap.set(obj, []);
      objMap.get(obj)!.push(c);
    }
    const objectiveGroups: ObjectiveGroup[] = Array.from(objMap.entries()).map(([objective, camps]) => {
      const ts = camps.reduce((s, c) => s + c.spend, 0);
      const tr = camps.reduce((s, c) => s + c.conversions, 0);
      const count = camps.length || 1;
      return {
        objective,
        campaigns: camps,
        totalSpend: ts,
        totalResults: tr,
        avgCPA: tr > 0 ? ts / tr : 0,
        avgCTR: camps.reduce((s, c) => s + c.ctr, 0) / count,
        avgCPM: camps.reduce((s, c) => s + (c.cpm || 0), 0) / count,
      };
    });

    // Creative podium
    const allCreatives: (Creative & { campaignName: string })[] = [];
    for (const c of classified) {
      const funnelLabel = getFunnelLabelOrNull(c.name) || c.name;
      for (const cr of c.creatives) {
        allCreatives.push({ ...cr, campaignName: funnelLabel });
      }
    }
    const topCreativesByCPA = [...allCreatives].filter(c => c.conversions > 0).sort((a, b) => (a.spend / a.conversions) - (b.spend / b.conversions)).slice(0, 3);
    const topCreativesByCTR = [...allCreatives].filter(c => c.impressions > 500).sort((a, b) => b.ctr - a.ctr).slice(0, 3);
    const topCreativesByConv = [...allCreatives].sort((a, b) => b.conversions - a.conversions).slice(0, 3);

    const healthScore = calcHealthScore(metrics);
    const alerts = generateAlerts(metrics, prevMetrics);

    // Variations
    const variations: Record<string, { value: number; change: number; trend: "up" | "down" | "neutral" }> = {};
    if (prevMetrics) {
      const keys: (keyof ComoEstamosMetrics)[] = ["totalSpend", "totalResults", "cpl", "cpa", "roas", "ctr", "cpc", "cpm", "conversionRate", "totalLeads", "totalConversations"];
      for (const k of keys) {
        const curr = metrics[k] as number;
        const prev = prevMetrics[k] as number;
        const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
        variations[k] = { value: curr, change, trend: change > 1 ? "up" : change < -1 ? "down" : "neutral" };
      }
    }

    return {
      metrics, prevMetrics, variations, classified, adSets, topAdSets,
      objectiveGroups, topCreativesByCPA, topCreativesByCTR, topCreativesByConv,
      healthScore, alerts, allCreatives,
    };
  }, [campaigns, previousCampaigns]);
}
