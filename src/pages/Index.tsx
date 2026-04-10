import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  Target, Users, BarChart3, Percent,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart, ConversionsChart } from "@/components/dashboard/OverviewCharts";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
import { overviewMetrics, campaigns, Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Meta Ads Dashboard</h1>
              <p className="text-xs text-muted-foreground">Atualizado em 10 Abr 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-lg font-medium">
              Últimos 10 dias
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="creatives">Criativos</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Investimento Total" value={`R$ ${overviewMetrics.totalSpend.toLocaleString("pt-BR")}`} change="+12% vs período anterior" changeType="negative" icon={DollarSign} delay={0} />
              <KpiCard title="Impressões" value={`${(overviewMetrics.totalImpressions / 1000000).toFixed(1)}M`} change="+8% vs período anterior" changeType="positive" icon={Eye} delay={0.05} />
              <KpiCard title="Cliques" value={overviewMetrics.totalClicks.toLocaleString("pt-BR")} change="+15% vs período anterior" changeType="positive" icon={MousePointerClick} delay={0.1} />
              <KpiCard title="Conversões" value={overviewMetrics.totalConversions.toLocaleString("pt-BR")} change="+22% vs período anterior" changeType="positive" icon={Target} delay={0.15} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="CTR Médio" value={`${overviewMetrics.avgCTR}%`} icon={Percent} delay={0.2} />
              <KpiCard title="CPC Médio" value={`R$ ${overviewMetrics.avgCPC.toFixed(2)}`} icon={DollarSign} delay={0.25} />
              <KpiCard title="ROAS Médio" value={`${overviewMetrics.avgROAS}x`} change="Meta: 4x" changeType="positive" icon={TrendingUp} delay={0.3} />
              <KpiCard title="Alcance Total" value={`${(overviewMetrics.totalReach / 1000000).toFixed(1)}M`} icon={Users} delay={0.35} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendChart />
              <ConversionsChart />
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <CampaignTable campaigns={campaigns} onSelect={setSelectedCampaign} selectedId={selectedCampaign?.id} />
            {selectedCampaign && <CreativeGrid campaign={selectedCampaign} />}
            {!selectedCampaign && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground text-sm">
                Clique em uma campanha acima para ver os criativos
              </motion.div>
            )}
          </TabsContent>

          {/* Creatives Tab */}
          <TabsContent value="creatives" className="space-y-6">
            {campaigns.filter(c => c.status === "active").map(c => (
              <CreativeGrid key={c.id} campaign={c} />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
