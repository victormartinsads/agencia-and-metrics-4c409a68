import { useState, useMemo } from "react";
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
import { EditableInsights } from "./EditableInsights";
import { WeeklyNotesPanel } from "./WeeklyNotesPanel";
import { ComoEstamosAIReport } from "./ComoEstamosAIReport";
import { EditableFunnel } from "./EditableFunnel";
import { RevenueRoasCard } from "./RevenueRoasCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientId: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  previousCampaigns?: Campaign[];
  currencySymbol?: string;
}

const DEFAULT_METRICS = [
  "totalSpend", "totalResults", "totalLeads", "totalConversations",
  "cpl", "cpa", "roas", "ctr", "cpc", "cpm", "conversionRate",
];

export function ComoEstamosTab({ clientId, campaigns, dailyMetrics, datePreset, previousCampaigns, currencySymbol = "R$" }: Props) {
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(DEFAULT_METRICS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  const [podiumCampaignId, setPodiumCampaignId] = useState<string>("all");

  // Fetch monthly_revenue
  const { data: clientData } = useQuery({
    queryKey: ["client-revenue", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("monthly_revenue").eq("id", clientId).single();
      return data;
    },
    enabled: !!clientId,
  });

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (showActiveOnly) {
      result = result.filter(c => c.status === "active");
    }
    if (selectedCampaignId !== "all") {
      result = result.filter(c => c.id === selectedCampaignId);
    }
    return result;
  }, [campaigns, showActiveOnly, selectedCampaignId]);

  const analysis = useComoEstamos(filteredCampaigns, previousCampaigns);

  // Filter podium creatives by campaign
  const podiumCreatives = useMemo(() => {
    if (podiumCampaignId === "all") return analysis;
    const camp = campaigns.find(c => c.id === podiumCampaignId);
    if (!camp) return analysis;
    const creatives = camp.creatives.map(cr => ({ ...cr, campaignName: camp.name }));
    return {
      ...analysis,
      topCreativesByCPA: [...creatives].filter(c => c.conversions > 0).sort((a, b) => (a.spend / a.conversions) - (b.spend / b.conversions)).slice(0, 3),
      topCreativesByCTR: [...creatives].filter(c => c.impressions > 500).sort((a, b) => b.ctr - a.ctr).slice(0, 3),
      topCreativesByConv: [...creatives].sort((a, b) => b.conversions - a.conversions).slice(0, 3),
    };
  }, [podiumCampaignId, campaigns, analysis]);

  return (
    <div className="space-y-6">
      {/* Controls: Campaign Selector + Toggles */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Campaign Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Campanha</label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.status !== "active" && `(${c.status})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active-only toggle */}
          <div className="flex items-center gap-2">
            <Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} id="active-only" />
            <Label htmlFor="active-only" className="text-xs cursor-pointer">Só ativas</Label>
          </div>

          {/* AI toggle */}
          <div className="flex items-center gap-2">
            <Switch checked={showAIRecommendations} onCheckedChange={setShowAIRecommendations} id="ai-toggle" />
            <Label htmlFor="ai-toggle" className="text-xs cursor-pointer">IA</Label>
          </div>
        </div>
      </div>

      {/* Health Score + Metric Selector */}
      <div className="flex flex-wrap items-start gap-4">
        <HealthScoreCard health={analysis.healthScore} />
        <MetricSelector selected={visibleMetrics} onChange={setVisibleMetrics} />
      </div>

      {/* Revenue & ROAS */}
      <RevenueRoasCard
        clientId={clientId}
        totalSpend={analysis.metrics.totalSpend}
        currentRevenue={clientData?.monthly_revenue || 0}
        currencySymbol={currencySymbol}
      />

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <ComoEstamosAlerts alerts={analysis.alerts} />
      )}

      {/* KPI Cards */}
      <KPIOverview metrics={analysis.metrics} variations={analysis.variations} visible={visibleMetrics} currencySymbol={currencySymbol} />

      {/* Campaign Analysis Table */}
      <CampaignAnalysisTable campaigns={analysis.classified} currencySymbol={currencySymbol} />

      {/* Winning Ad Sets */}
      <WinningAdSets adSets={analysis.topAdSets} currencySymbol={currencySymbol} />

      {/* Creative Podium with campaign filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-card-foreground">🏅 Pódio de Criativos</h3>
          <Select value={podiumCampaignId} onValueChange={setPodiumCampaignId}>
            <SelectTrigger className="h-8 text-xs w-[220px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.filter(c => c.creatives.length > 0).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CreativePodium
          byCPA={podiumCreatives.topCreativesByCPA}
          byCTR={podiumCreatives.topCreativesByCTR}
          byConversions={podiumCreatives.topCreativesByConv}
          clientId={clientId}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* Objective Analysis */}
      <ObjectiveAnalysis groups={analysis.objectiveGroups} currencySymbol={currencySymbol} />

      {/* Editable Funnel */}
      <EditableFunnel
        clientId={clientId}
        campaigns={filteredCampaigns}
        selectedCampaignId={selectedCampaignId !== "all" ? selectedCampaignId : undefined}
        currencySymbol={currencySymbol}
      />

      {/* Editable AI Insights */}
      <EditableInsights
        clientId={clientId}
        datePreset={datePreset}
        metrics={analysis.metrics}
        prevMetrics={analysis.prevMetrics}
        classified={analysis.classified}
        alerts={analysis.alerts}
        showAI={showAIRecommendations}
      />

      {/* Weekly Notes */}
      <WeeklyNotesPanel clientId={clientId} datePreset={datePreset} />

      {/* AI Final Report */}
      {showAIRecommendations && (
        <ComoEstamosAIReport
          clientId={clientId}
          metrics={analysis.metrics}
          prevMetrics={analysis.prevMetrics}
          classified={analysis.classified}
          alerts={analysis.alerts}
          datePreset={datePreset}
        />
      )}
    </div>
  );
}
