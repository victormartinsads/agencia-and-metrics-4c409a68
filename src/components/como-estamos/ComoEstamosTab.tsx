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
import { getFunnelLabelOrNull } from "@/lib/funnelGrouping";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunnelPreviewCard } from "@/components/funnel/FunnelPreviewCard";
import { FunnelPremiumDetailDialog } from "@/components/funnel/FunnelPremiumDetailDialog";
import { useManualFunnels, useCreateManualFunnel } from "@/hooks/useManualFunnels";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [createManualOpen, setCreateManualOpen] = useState(false);
  const [newManualCode, setNewManualCode] = useState("");
  const [newManualLabel, setNewManualLabel] = useState("");
  const [detailManual, setDetailManual] = useState<{ code: string; label: string } | null>(null);
  const { data: manualFunnels } = useManualFunnels(clientId);
  const createManual = useCreateManualFunnel();

  const handleCreateManual = async () => {
    const code = newManualCode.trim().toUpperCase();
    const label = newManualLabel.trim();
    if (!code || !label) { toast.error("Informe código e nome"); return; }
    try {
      await createManual.mutateAsync({ client_id: clientId, code, label });
      toast.success("Funil manual criado");
      setNewManualCode(""); setNewManualLabel(""); setCreateManualOpen(false);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Já existe um funil com esse código" : "Erro ao criar funil");
    }
  };

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
    const funnelLabel = getFunnelLabelOrNull(camp.name) || camp.name;
    const creatives = camp.creatives.map(cr => ({ ...cr, campaignName: funnelLabel }));
    return {
      ...analysis,
      topCreativesByCPA: [...creatives].filter(c => c.conversions > 0).sort((a, b) => (a.spend / a.conversions) - (b.spend / b.conversions)).slice(0, 3),
      topCreativesByCTR: [...creatives].filter(c => c.impressions > 500).sort((a, b) => b.ctr - a.ctr).slice(0, 3),
      topCreativesByConv: [...creatives].sort((a, b) => b.conversions - a.conversions).slice(0, 3),
    };
  }, [podiumCampaignId, campaigns, analysis]);

  return (
    <div className="space-y-5">
      {/* Unified toolbar — período vem do header do dashboard, aqui ficam só filtros do módulo */}
      <div className="rounded-xl border border-border/60 bg-surface-elevated/50 backdrop-blur p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
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
        <div className="flex items-center gap-2 px-2 border-l border-border/60">
          <Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} id="active-only" />
          <Label htmlFor="active-only" className="text-xs cursor-pointer whitespace-nowrap">Só ativas</Label>
        </div>
        <div className="flex items-center gap-2 px-2 border-l border-border/60">
          <Switch checked={showAIRecommendations} onCheckedChange={setShowAIRecommendations} id="ai-toggle" />
          <Label htmlFor="ai-toggle" className="text-xs cursor-pointer">IA</Label>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Métricas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Métricas visíveis nos KPIs
            </p>
            <MetricSelector selected={visibleMetrics} onChange={setVisibleMetrics} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Alerts (above health) */}
      {analysis.alerts.length > 0 && <ComoEstamosAlerts alerts={analysis.alerts} />}

      {/* Health row — score + receita/roas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1"><HealthScoreCard health={analysis.healthScore} /></div>
        <div className="lg:col-span-2">
          <RevenueRoasCard
            clientId={clientId}
            totalSpend={analysis.metrics.totalSpend}
            currentRevenue={clientData?.monthly_revenue || 0}
            currencySymbol={currencySymbol}
          />
        </div>
      </div>

      {/* KPI cards (always visible) */}
      <KPIOverview metrics={analysis.metrics} variations={analysis.variations} visible={visibleMetrics} currencySymbol={currencySymbol} />

      {/* Tabs internas — agrupam o resto pra reduzir scroll infinito */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="criativos">Criativos</TabsTrigger>
          <TabsTrigger value="funil">Funil & Notas</TabsTrigger>
          {showAIRecommendations && <TabsTrigger value="ia">IA</TabsTrigger>}
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <CampaignAnalysisTable campaigns={analysis.classified} currencySymbol={currencySymbol} />
          <WinningAdSets adSets={analysis.topAdSets} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="criativos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-card-foreground">🏅 Pódio de Criativos</h3>
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
          <ObjectiveAnalysis groups={analysis.objectiveGroups} currencySymbol={currencySymbol} campaigns={filteredCampaigns} clientId={clientId} />
        </TabsContent>

        <TabsContent value="funil" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-card-foreground">Funis Manuais</h3>
              <p className="text-xs text-muted-foreground">
                Crie um funil 100% manual (ex.: Google Ads) e edite as métricas no lápis. Os valores sincronizam com a aba "Análise de Funis".
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateManualOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo funil manual
            </Button>
          </div>
          {(manualFunnels || []).length > 0 && (
            <div className="space-y-4">
              {(manualFunnels || []).map((m) => (
                <FunnelPreviewCard
                  key={m.id}
                  clientId={clientId}
                  funnelCode={m.code}
                  funnelLabel={m.label}
                  campaigns={[]}
                  currencySymbol={currencySymbol}
                  datePreset={datePreset}
                  isManual
                  manualId={m.id}
                  onOpenDetail={() => setDetailManual({ code: m.code, label: m.label })}
                />
              ))}
            </div>
          )}
          <EditableFunnel
            clientId={clientId}
            campaigns={filteredCampaigns}
            selectedCampaignId={selectedCampaignId !== "all" ? selectedCampaignId : undefined}
            currencySymbol={currencySymbol}
          />
          <WeeklyNotesPanel clientId={clientId} datePreset={datePreset} />
        </TabsContent>

        {showAIRecommendations && (
          <TabsContent value="ia" className="space-y-4">
            <EditableInsights
              clientId={clientId}
              datePreset={datePreset}
              metrics={analysis.metrics}
              prevMetrics={analysis.prevMetrics}
              classified={analysis.classified}
              alerts={analysis.alerts}
              showAI={showAIRecommendations}
            />
            <ComoEstamosAIReport
              clientId={clientId}
              metrics={analysis.metrics}
              prevMetrics={analysis.prevMetrics}
              classified={analysis.classified}
              alerts={analysis.alerts}
              datePreset={datePreset}
            />
          </TabsContent>
        )}
      </Tabs>

      {detailManual && (
        <FunnelPremiumDetailDialog
          open={!!detailManual}
          onClose={() => setDetailManual(null)}
          clientId={clientId}
          funnelCode={detailManual.code}
          funnelLabel={detailManual.label}
          campaigns={[]}
          currencySymbol={currencySymbol}
          datePreset={datePreset}
          isManual
        />
      )}

      <Dialog open={createManualOpen} onOpenChange={setCreateManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo funil manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Código curto</Label>
              <Input
                value={newManualCode}
                onChange={(e) => setNewManualCode(e.target.value.toUpperCase())}
                placeholder="GADS"
                maxLength={12}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Identificador único (ex.: GADS, ORG, OUTROS).</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome de exibição</Label>
              <Input
                value={newManualLabel}
                onChange={(e) => setNewManualLabel(e.target.value)}
                placeholder="Google Ads — Performance Max"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateManualOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateManual} disabled={createManual.isPending}>Criar funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
