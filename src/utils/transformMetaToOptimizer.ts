import { Campaign } from '../data/mockMetaData';
import { Client } from '../hooks/useClients';
import { Funnel, AdSetData, CreativeData } from '../data/mockCampaigns';

export function transformMetaToOptimizer(
  clientId: string,
  client: Client | undefined,
  metaCampaigns: Campaign[]
): { funnels: Funnel[], adSets: AdSetData[], creatives: CreativeData[] } {
  const funnels: Funnel[] = [];
  const adSets: AdSetData[] = [];
  const creatives: CreativeData[] = [];

  if (!metaCampaigns) return { funnels, adSets, creatives };

  // Generate fallback goals if the client doesn't have target CPAs configured
  const fallbackGoals = {
    maxCPA: client?.target_cpa_purchase || 100,
    maxCPL: client?.target_cpa_lead || 15,
    maxCheckoutCost: 30,
    maxRegistrationCost: 20,
    maxLPVCost: 2
  };

  metaCampaigns.forEach((camp) => {
    // 1. Create a Funnel per Campaign
    const funnelId = camp.id;
    funnels.push({
      id: funnelId,
      clientId,
      name: camp.name,
      goals: fallbackGoals
    });

    // We will group creatives by adsetName to synthesize AdSets
    const adSetsMap = new Map<string, CreativeData[]>();

    if (camp.creatives && Array.isArray(camp.creatives)) {
      camp.creatives.forEach(cr => {
        const adSetName = cr.adsetName || 'Público Geral';
        
        // Ensure map exists
        if (!adSetsMap.has(adSetName)) {
          adSetsMap.set(adSetName, []);
        }

        // Map to CreativeData
        // We will fake some metrics if they are missing since Meta edge function might not map all funnel fields per creative,
        // but we'll use whatever is available. The edge function returns standard metrics.
        const cData: CreativeData = {
          id: cr.id,
          adSetId: `as_${funnelId}_${adSetName.replace(/\s/g, '_')}`,
          funnelId,
          name: cr.name,
          status: cr.status === 'active' ? 'active' : 'paused', // Or rely on Campaign status if not available
          thumbnailUrl: cr.thumbnail,
          spent: cr.spend || 0,
          purchases: camp.primaryResultKey === 'purchase' || camp.objective === 'OUTCOME_SALES' ? (cr.conversions || 0) : 0,
          initiateCheckouts: 0, // Not explicitly provided per creative in edge function output
          leads: camp.primaryResultKey === 'lead' || camp.objective === 'OUTCOME_LEADS' ? (cr.conversions || 0) : 0,
          completeRegistrations: 0,
          landingPageViews: cr.linkClicks || 0,
          linkClicks: cr.linkClicks || cr.clicks || 0,
          impressions: cr.impressions || 0,
          hookRate: 0, // Computed later or kept 0 if no video data
          frequencyWeekly: 1
        };

        // If objective is sales, prioritize purchases
        if (camp.objective === 'OUTCOME_SALES' || camp.objective === 'Conversões') {
          cData.purchases = cr.conversions || 0;
          cData.leads = 0;
        } else if (camp.objective === 'OUTCOME_LEADS') {
          cData.leads = cr.conversions || 0;
          cData.purchases = 0;
        }

        adSetsMap.get(adSetName)!.push(cData);
        creatives.push(cData);
      });
    }

    // 2. Synthesize AdSetData by aggregating Creative metrics
    adSetsMap.forEach((crs, adSetName) => {
      const adSetId = `as_${funnelId}_${adSetName.replace(/\s/g, '_')}`;
      
      const totalSpent = crs.reduce((sum, c) => sum + c.spent, 0);
      const totalPurchases = crs.reduce((sum, c) => sum + c.purchases, 0);
      const totalLeads = crs.reduce((sum, c) => sum + c.leads, 0);
      const totalImpressions = crs.reduce((sum, c) => sum + c.impressions, 0);
      
      const cpm = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;

      adSets.push({
        id: adSetId,
        funnelId,
        name: adSetName,
        status: camp.status === 'active' ? 'active' : 'paused',
        budget: camp.dailyBudget || (camp.spend / 7) || 100, // Estimate if unknown
        spent: totalSpent,
        purchases: totalPurchases,
        leads: totalLeads,
        cpm,
        frequencyWeekly: camp.frequency || 1
      });
    });
  });

  return { funnels, adSets, creatives };
}
