import { useState } from "react";
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

interface Props {
  clientId: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
}

export function FunnelAnalysisTab({ clientId, campaigns, dailyMetrics, datePreset }: Props) {
  const [overrides, setOverrides] = useState<Record<string, FunnelStage>>({});

  const handleOverride = (campaignId: string, stage: FunnelStage) => {
    setOverrides((prev) => ({ ...prev, [campaignId]: stage }));
  };

  const analysis = useFunnelAnalysis(campaigns, overrides);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
