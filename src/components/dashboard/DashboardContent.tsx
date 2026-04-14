import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  Target, Users, Percent, AlertCircle, Loader2,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart, ConversionsChart } from "@/components/dashboard/OverviewCharts";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CampaignDetail } from "@/components/dashboard/CampaignDetail";
import { AdSetTable } from "@/components/dashboard/AdSetTable";
import { CampaignInsights } from "@/components/dashboard/CampaignInsights";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
import { BrandingPanel } from "@/components/dashboard/BrandingPanel";
import { Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";
import { GoogleAnalyticsPanel } from "@/components/dashboard/GoogleAnalyticsPanel";
import { FunnelAnalysisTab } from "@/components/funnel/FunnelAnalysisTab";
import { ComoEstamosTab } from "@/components/como-estamos/ComoEstamosTab";

interface Props {
  clientId?: string;
  datePreset?: string;
  metaData: MetaAdsData | undefined;
  metaLoading: boolean;
  metaError: Error | null;
}

export function DashboardContent({ clientId, datePreset, metaData, metaLoading, metaError }: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { data: igData, isLoading: igLoading, error: igError } = useInstagramInsights(clientId);

  const overview = metaData?.overviewMetrics;
  const campaigns = metaData?.campaigns || [];
  const dailyMetrics = metaData?.dailyMetrics || [];

  return (
    <div className="space-y-6">
      {metaError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Erro ao carregar dados</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metaError.message || "Verifique o token de acesso e os IDs das contas de anúncio."}
            </p>
          </div>
        </motion.div>
      )}

      {metaLoading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando dados...</span>
        </div>
      )}

      {!metaLoading && !metaError && overview && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border flex-wrap h-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="como-estamos">Como Estamos</TabsTrigger>
            <TabsTrigger value="funnel">Funil</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="creatives">Criativos</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Investimento Total" value={`R$ ${overview.totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} delay={0} />
              <KpiCard title="Impressões" value={overview.totalImpressions >= 1000000 ? `${(overview.totalImpressions / 1000000).toFixed(1)}M` : overview.totalImpressions.toLocaleString("pt-BR")} icon={Eye} delay={0.05} />
              <KpiCard title="Cliques" value={overview.totalClicks.toLocaleString("pt-BR")} icon={MousePointerClick} delay={0.1} />
              <KpiCard title="Conversões" value={overview.totalConversions.toLocaleString("pt-BR")} icon={Target} delay={0.15} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="CTR Médio" value={`${overview.avgCTR}%`} icon={Percent} delay={0.2} />
              <KpiCard title="CPC Médio" value={`R$ ${overview.avgCPC.toFixed(2)}`} icon={DollarSign} delay={0.25} />
              <KpiCard title="Alcance Total" value={overview.totalReach >= 1000000 ? `${(overview.totalReach / 1000000).toFixed(1)}M` : overview.totalReach.toLocaleString("pt-BR")} icon={Users} delay={0.3} />
            </div>
            {dailyMetrics.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendChart data={dailyMetrics} />
                <ConversionsChart data={dailyMetrics} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="como-estamos" className="space-y-6">
            <ComoEstamosTab
              clientId={clientId || ""}
              campaigns={campaigns}
              dailyMetrics={dailyMetrics}
              datePreset={datePreset || "last_7d"}
            />
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <FunnelAnalysisTab
              clientId={clientId || ""}
              campaigns={campaigns}
              dailyMetrics={dailyMetrics}
              datePreset={datePreset || "last_7d"}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            {campaigns.length > 0 ? (
              <>
                {!selectedCampaign && (
                  <>
                    <CampaignTable campaigns={campaigns} onSelect={setSelectedCampaign} selectedId={selectedCampaign?.id} />
                    <CampaignInsights campaigns={campaigns} />
                  </>
                )}

                {selectedCampaign && (
                  <>
                    <CampaignDetail campaign={selectedCampaign} onBack={() => setSelectedCampaign(null)} />
                    <AdSetTable campaign={selectedCampaign} />
                    <CreativeGrid campaign={selectedCampaign} />
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhuma campanha encontrada para este período
              </div>
            )}
          </TabsContent>

          <TabsContent value="creatives" className="space-y-6">
            {campaigns.filter(c => (c.status === "active" || c.spend > 0) && c.creatives.length > 0).map(c => (
              <CreativeGrid key={c.id} campaign={c} />
            ))}
            {campaigns.filter(c => (c.status === "active" || c.spend > 0) && c.creatives.length > 0).length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum criativo encontrado para campanhas ativas ou com gasto no período
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <GoogleAnalyticsPanel clientId={clientId} datePreset={datePreset} />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <BrandingPanel data={igData} isLoading={igLoading} error={igError as Error | null} />
          </TabsContent>
        </Tabs>
      )}

      {!metaLoading && !metaError && !overview && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhum dado encontrado.
        </div>
      )}
    </div>
  );
}
