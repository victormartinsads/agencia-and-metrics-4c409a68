import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  Target, Users, BarChart3, Percent, ArrowLeft, Settings, AlertCircle, Loader2,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart, ConversionsChart } from "@/components/dashboard/OverviewCharts";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
import { Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DATE_PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_3d", label: "Últimos 3 dias" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data: client, isLoading: clientLoading } = useQuery({
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

  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds(clientId, datePreset);

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

  const overview = metaData?.overviewMetrics;
  const campaigns = metaData?.campaigns || [];
  const dailyMetrics = metaData?.dailyMetrics || [];

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
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {metaError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erro ao carregar dados da Meta</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(metaError as Error).message || "Verifique o token de acesso e os IDs das contas de anúncio."}
              </p>
            </div>
          </motion.div>
        )}

        {metaLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando dados da Meta Ads API...</span>
          </div>
        )}

        {!metaLoading && !metaError && overview && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="campaigns">Campanhas ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="creatives">Criativos</TabsTrigger>
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
                <KpiCard title="ROAS Médio" value={`${overview.avgROAS}x`} icon={TrendingUp} delay={0.3} />
                <KpiCard title="Alcance Total" value={overview.totalReach >= 1000000 ? `${(overview.totalReach / 1000000).toFixed(1)}M` : overview.totalReach.toLocaleString("pt-BR")} icon={Users} delay={0.35} />
              </div>
              {dailyMetrics.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SpendChart data={dailyMetrics} />
                  <ConversionsChart data={dailyMetrics} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-6">
              {campaigns.length > 0 ? (
                <>
                  <CampaignTable campaigns={campaigns} onSelect={setSelectedCampaign} selectedId={selectedCampaign?.id} />
                  {selectedCampaign && <CreativeGrid campaign={selectedCampaign} />}
                  {!selectedCampaign && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground text-sm">
                      Clique em uma campanha para ver os criativos
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Nenhuma campanha encontrada para este período
                </div>
              )}
            </TabsContent>

            <TabsContent value="creatives" className="space-y-6">
              {campaigns.filter(c => c.status === "active" && c.creatives.length > 0).map(c => (
                <CreativeGrid key={c.id} campaign={c} />
              ))}
              {campaigns.filter(c => c.status === "active" && c.creatives.length > 0).length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Nenhum criativo encontrado para campanhas ativas
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!metaLoading && !metaError && !overview && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nenhum dado encontrado. Verifique o token e os IDs das contas de anúncio.
          </div>
        )}
      </main>
    </div>
  );
}
