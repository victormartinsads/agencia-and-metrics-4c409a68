import { useMemo, useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { useFunnelAnalysis, FunnelStage } from "@/hooks/useFunnelAnalysis";
import { FunnelVisualization } from "@/components/funnel/FunnelVisualization";
import { FunnelMetricsCards } from "@/components/funnel/FunnelMetricsCards";
import { FunnelStageSummary } from "@/components/funnel/FunnelStageSummary";
import { CampaignRoasChart, DailyEvolutionChart, CtrCpaScatter } from "@/components/funnel/FunnelCharts";
import { FunnelPodium } from "@/components/funnel/FunnelPodium";
import { FunnelAIInsights } from "@/components/funnel/FunnelAIInsights";
import { FunnelRecommendations } from "@/components/funnel/FunnelRecommendations";
import { ManagerNotes } from "@/components/funnel/ManagerNotes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { FunnelDetailView } from "@/components/funnel/FunnelDetailView";
import { Layers, Target } from "lucide-react";

interface Props {
  clientId: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  currencySymbol?: string;
}

export function FunnelAnalysisTab({ clientId, campaigns, dailyMetrics, datePreset, currencySymbol = "R$" }: Props) {
  const [overrides, setOverrides] = useState<Record<string, FunnelStage>>({});

  const handleOverride = (campaignId: string, stage: FunnelStage) => {
    setOverrides((prev) => ({ ...prev, [campaignId]: stage }));
  };

  const analysis = useFunnelAnalysis(campaigns, overrides);

  // Group campaigns by funnel code F1..F15
  const funnelGroups = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const code = extractFunnelCode(c.name);
      if (!code) continue;
      const arr = map.get(code) || [];
      arr.push(c);
      map.set(code, arr);
    }
    return FUNNEL_DEFINITIONS.filter((d) => map.has(d.code)).map((d) => ({
      code: d.code,
      label: d.label,
      campaigns: map.get(d.code) || [],
    }));
  }, [campaigns]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-card border border-border h-auto flex-wrap">
          <TabsTrigger value="geral" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          {funnelGroups.map((g) => (
            <TabsTrigger key={g.code} value={g.code} className="gap-1.5">
              <Target className="h-3.5 w-3.5" /> {g.code}
              <span className="ml-1 text-[10px] opacity-60">({g.campaigns.length})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
      {/* Resumo Geral */}
      <FunnelMetricsCards
        metrics={analysis.metrics}
        totalSpend={analysis.totalSpend}
        totalPurchaseValue={analysis.totalPurchaseValue}
      />

      {/* Funil de Conversão */}
      <FunnelVisualization steps={analysis.funnelSteps} />

      {/* Classificação por Estágio */}
      <FunnelStageSummary
        topo={analysis.topo}
        meio={analysis.meio}
        fundo={analysis.fundo}
        onOverride={handleOverride}
      />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignRoasChart campaigns={analysis.classified} />
        <CtrCpaScatter campaigns={campaigns} />
      </div>

      {dailyMetrics.length > 0 && (
        <DailyEvolutionChart dailyMetrics={dailyMetrics} />
      )}

      {/* Pódio */}
      <FunnelPodium
        topRoas={analysis.topRoas}
        topCpa={analysis.topCpa}
        topCtr={analysis.topCtr}
      />

      {/* Insights com IA */}
      <FunnelAIInsights
        campaigns={analysis.classified}
        metrics={analysis.metrics}
        totalSpend={analysis.totalSpend}
        totalPurchaseValue={analysis.totalPurchaseValue}
      />

      {/* Recomendações */}
      <FunnelRecommendations recommendations={analysis.recommendations} />

      {/* Notas do Gestor */}
      <ManagerNotes clientId={clientId} datePreset={datePreset} />
        </TabsContent>

        {funnelGroups.map((g) => (
          <TabsContent key={g.code} value={g.code} className="space-y-6">
            <FunnelDetailView
              clientId={clientId}
              funnelCode={g.code}
              funnelLabel={g.label}
              campaigns={g.campaigns}
              currencySymbol={currencySymbol}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
