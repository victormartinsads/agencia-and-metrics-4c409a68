import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  Target, Users, BarChart3, Percent, ArrowLeft, Settings,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart, ConversionsChart } from "@/components/dashboard/OverviewCharts";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
import { overviewMetrics, campaigns, Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@/hooks/useClients";

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Link to="/clients" className="text-primary underline">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4 text-secondary-foreground" />
            </Link>
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{client.name}</h1>
              <p className="text-xs text-muted-foreground">
                {client.ad_account_ids.length} conta(s) de anúncio • Dashboard Meta Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-lg font-medium">
              Últimos 10 dias
            </span>
            <Link
              to="/clients"
              className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-accent transition-colors flex items-center gap-1"
            >
              <Settings className="h-3.5 w-3.5" /> Configurações
            </Link>
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

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard title="Investimento Total" value={`R$ ${overviewMetrics.totalSpend.toLocaleString("pt-BR")}`} change="+12% vs período anterior" changeType="negative" icon={DollarSign} delay={0} />
              <KpiCard title="Impressões" value={`${(overviewMetrics.totalImpressions / 1000000).toFixed(1)}M`} change="+8%" changeType="positive" icon={Eye} delay={0.05} />
              <KpiCard title="Cliques" value={overviewMetrics.totalClicks.toLocaleString("pt-BR")} change="+15%" changeType="positive" icon={MousePointerClick} delay={0.1} />
              <KpiCard title="Conversões" value={overviewMetrics.totalConversions.toLocaleString("pt-BR")} change="+22%" changeType="positive" icon={Target} delay={0.15} />
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

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignTable campaigns={campaigns} onSelect={setSelectedCampaign} selectedId={selectedCampaign?.id} />
            {selectedCampaign && <CreativeGrid campaign={selectedCampaign} />}
            {!selectedCampaign && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground text-sm">
                Clique em uma campanha para ver os criativos
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="creatives" className="space-y-6">
            {campaigns.filter(c => c.status === "active").map(c => (
              <CreativeGrid key={c.id} campaign={c} />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
