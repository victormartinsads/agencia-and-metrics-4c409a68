import type { Campaign } from "@/data/mockMetaData";
import type { GoogleAdsCampaign } from "@/hooks/useGoogleAds";

/**
 * Adapts a Google Ads campaign to the internal Campaign shape so it can flow
 * through the same funnel components as Meta campaigns. Only fields that
 * Google reports are populated; everything else is left at 0/undefined.
 */
export function googleAdsToCampaign(g: GoogleAdsCampaign): Campaign {
  const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
  const cpc = g.clicks > 0 ? g.cost / g.clicks : 0;
  const roas = g.cost > 0 ? g.revenue / g.cost : 0;
  return {
    id: `gads-${g.id}`,
    name: g.name,
    status: g.status?.toLowerCase().includes("enabled") ? "active" : "paused",
    objective: "GOOGLE_ADS",
    spend: g.cost || 0,
    impressions: g.impressions || 0,
    clicks: g.clicks || 0,
    ctr,
    cpc,
    conversions: g.conversions || 0,
    costPerConversion: g.conversions > 0 ? g.cost / g.conversions : 0,
    roas,
    reach: 0,
    frequency: 0,
    creatives: [],
    primaryResultLabel: "Conversões",
    primaryResultKey: "conversions",
    purchases: g.conversions || 0,
    purchaseValue: g.revenue || 0,
  };
}