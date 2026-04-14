import { useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { useComoEstamos } from "@/hooks/useComoEstamos";
import { KPIOverview } from "./KPIOverview";
import { MetricSelector } from "./MetricSelector";
import { HealthScoreCard } from "./HealthScoreCard";
import { CampaignAnalysisTable } from "./CampaignAnalysisTable";
import { WinningAdSets } from "./WinningAdSets";
import { CreativePodium } from "./CreativePodium";
import { ObjectiveAnalysis } from "./ObjectiveAnalysis";
import { ComoEstamosAlerts } from "./ComoEstamosAlerts";
import { ComoEstamosInsights } from "./ComoEstamosInsights";
import { WeeklyNotesPanel } from "./WeeklyNotesPanel";
import { ComoEstamosAIReport } from "./ComoEstamosAIReport";
import { ComoEstamosFunnel } from "./ComoEstamosFunnel";

interface Props {
  clientId: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  previousCampaigns?: Campaign[];
}

const DEFAULT_METRICS = [
  "totalSpend", "totalResults", "totalLeads", "totalConversations",
  "cpl", "cpa", "roas", "ctr", "cpc", "cpm", "conversionRate",
];

export function ComoEstamosTab({ clientId, campaigns, dailyMetrics, datePreset, previousCampaigns }: Props) {
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(DEFAULT_METRICS);
  const analysis = useComoEstamos(campaigns, previousCampaigns);

  return (
    <div className="space-y-6">
      {/* Health Score + Metric Selector */}
      <div className="flex flex-wrap items-start gap-4">
        <HealthScoreCard health={analysis.healthScore} />
        <MetricSelector selected={visibleMetrics} onChange={setVisibleMetrics} />
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <ComoEstamosAlerts alerts={analysis.alerts} />
      )}

      {/* KPI Cards */}
      <KPIOverview metrics={analysis.metrics} variations={analysis.variations} visible={visibleMetrics} />

      {/* Campaign Analysis Table */}
      <CampaignAnalysisTable campaigns={analysis.classified} />

      {/* Winning Ad Sets */}
      <WinningAdSets adSets={analysis.topAdSets} />

      {/* Creative Podium */}
      <CreativePodium
        byCPA={analysis.topCreativesByCPA}
        byCTR={analysis.topCreativesByCTR}
        byConversions={analysis.topCreativesByConv}
      />

      {/* Objective Analysis */}
      <ObjectiveAnalysis groups={analysis.objectiveGroups} />

      {/* Funnel */}
      <ComoEstamosFunnel campaigns={campaigns} />

      {/* AI Insights */}
      <ComoEstamosInsights
        clientId={clientId}
        metrics={analysis.metrics}
        prevMetrics={analysis.prevMetrics}
        classified={analysis.classified}
        alerts={analysis.alerts}
      />

      {/* Weekly Notes */}
      <WeeklyNotesPanel clientId={clientId} datePreset={datePreset} />

      {/* AI Final Report */}
      <ComoEstamosAIReport
        clientId={clientId}
        metrics={analysis.metrics}
        prevMetrics={analysis.prevMetrics}
        classified={analysis.classified}
        alerts={analysis.alerts}
        datePreset={datePreset}
      />
    </div>
  );
}
