import { useMemo } from "react";
import { Campaign, Creative } from "@/data/mockMetaData";
import { getMetricValue, resolveMetricKey, findMetricDef } from "@/lib/metaMetricCatalog";
import { extractFunnelCode } from "@/lib/funnelGrouping";
import { PRIMARY_METRIC_OPTIONS } from "./useFunnelPrimaryMetric";

export function getCustomPrimaryMetricValue(c: Campaign, key: string): number {
  if (!key || key === "auto") {
    return c.primaryResult ?? c.conversions;
  }
  if (key === "conversions") {
    return c.conversions;
  }
  if (key === "_profile_visit") {
    const isProfileVisit = c?.primaryResultKey === "_profile_visit" || c?.name?.toLowerCase()?.includes("seguidores") || c?.name?.toLowerCase()?.includes("perfil");
    return isProfileVisit ? (c.conversions || c.linkClicks || 0) : (c.actionBreakdown?.["link_click"] || c.linkClicks || 0);
  }

  // 1. Leads specific lookup
  if (key === "lead" || key === "leads") {
    if ((c as any).leads !== undefined && Number((c as any).leads) > 0) return Number((c as any).leads);
    if ((c as any).lead !== undefined && Number((c as any).lead) > 0) return Number((c as any).lead);
    if ((c as any).leadActions !== undefined && Number((c as any).leadActions) > 0) return Number((c as any).leadActions);
    if (c.actionBreakdown) {
      const leadVal = c.actionBreakdown["lead"] ?? c.actionBreakdown["leads"] ?? c.actionBreakdown["offsite_conversion.fb_pixel_lead"] ?? c.actionBreakdown["onsite_conversion.lead_grouped"];
      if (leadVal !== undefined && Number(leadVal) > 0) return Number(leadVal);
    }
    if (c.primaryResultLabel?.toLowerCase()?.includes("lead") && (c as any).primaryResult !== undefined) {
      return Number((c as any).primaryResult);
    }
  }

  // 2. Try action breakdown with key
  if (c.actionBreakdown) {
    if (c.actionBreakdown[key] !== undefined && Number(c.actionBreakdown[key]) > 0) {
      return Number(c.actionBreakdown[key]);
    }
  }

  // 3. Direct property on campaign
  const canonical = resolveMetricKey(key);
  if ((c as any)[canonical] !== undefined && Number((c as any)[canonical]) > 0) {
    return Number((c as any)[canonical]);
  }
  if ((c as any)[key] !== undefined && Number((c as any)[key]) > 0) {
    return Number((c as any)[key]);
  }

  // 4. Metric Catalog lookup
  const catalogVal = getMetricValue(c, key);
  if (catalogVal > 0) return catalogVal;

  return 0;
}

export function useAdaptedCampaigns(
  campaigns: Campaign[],
  primaryMetricsMap: Record<string, string> | undefined
) {
  return useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    if (!primaryMetricsMap) return campaigns;

    return campaigns.map(c => {
      // Resolve funnel code or campaign ID
      const funnelCode = extractFunnelCode(c.name);
      const customKey = (funnelCode && primaryMetricsMap[funnelCode]) || primaryMetricsMap[c.id];
      
      if (!customKey) return c;

      const opt = PRIMARY_METRIC_OPTIONS.find(o => o.key === customKey);
      const customLabel = opt?.label || findMetricDef(customKey)?.label || "Resultados";
      const value = getCustomPrimaryMetricValue(c, customKey);
      
      const adaptedCreatives = (c.creatives || []).map(cr => {
        let crConv = cr.conversions;
        if (customKey === "link_click" || customKey === "clicks") {
          crConv = cr.clicks;
        } else if (customKey === "spend") {
          crConv = cr.spend;
        } else {
          // Proportional estimate
          const campaignConvs = c.conversions || 1;
          const campaignClicks = c.clicks || 1;
          crConv = cr.conversions > 0
            ? (cr.conversions / campaignConvs) * value
            : (cr.clicks / campaignClicks) * value;
        }
        return {
          ...cr,
          conversions: crConv,
          primaryResult: crConv,
        };
      });

      return {
        ...c,
        primaryResultKey: customKey,
        primaryResultLabel: customLabel,
        conversions: value,
        primaryResult: value,
        costPerConversion: value > 0 ? c.spend / value : 0,
        creatives: adaptedCreatives,
      };
    });
  }, [campaigns, primaryMetricsMap]);
}
