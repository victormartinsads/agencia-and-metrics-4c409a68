import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";

import { OverviewRedesign } from "@/components/dashboard/overview/OverviewRedesign";
import { CreativeGrid, isCaptacaoSeguidores } from "@/components/dashboard/CreativeGrid";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { BrandingPanel } from "@/components/dashboard/BrandingPanel";
import { Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";
import { FunnelAnalysisTab } from "@/components/funnel/FunnelAnalysisTab";
import { DiagnosticoSemanal } from "@/components/diagnostico/DiagnosticoSemanal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientId?: string;
  datePreset?: string;
  metaData: MetaAdsData | undefined;
  metaLoading: boolean;
  metaError: Error | null;
  currencySymbol?: string;
}

export function DashboardContent({ clientId, datePreset, metaData, metaLoading, metaError, currencySymbol = "R$" }: Props) {
  const { data: igData, isLoading: igLoading, error: igError } = useInstagramInsights(clientId);
  const { data: clientInfo } = useQuery({
    queryKey: ["client-name", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

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
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="funnel">Análise de Funis</TabsTrigger>
            <TabsTrigger value="creatives">Pódio de Criativos</TabsTrigger>
            <TabsTrigger value="branding">Distribuição</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewRedesign
              clientId={clientId}
              datePreset={datePreset || "last_7d"}
              metaData={metaData}
              currencySymbol={currencySymbol}
            />
          </TabsContent>

          <TabsContent value="diagnostico" className="space-y-6">
            <DiagnosticoSemanal
              clientId={clientId || ""}
              clientName={clientInfo?.name}
              campaigns={campaigns}
              datePreset={datePreset || "last_7d"}
              currencySymbol={currencySymbol}
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

          <TabsContent value="creatives" className="space-y-6">
            {(() => {
              const eligible = campaigns.filter(c => (c.status === "active" || c.spend > 0) && c.creatives.length > 0);
              const captacao = eligible.filter(c => isCaptacaoSeguidores(c.name));
              const others = eligible.filter(c => !isCaptacaoSeguidores(c.name));
              return (
                <>
                  {captacao.length > 0 && (
                    <AggregatedCreativeGrid
                      campaigns={captacao}
                      funnelLabel="Captação de Seguidores"
                      clientId={clientId}
                      currencySymbol={currencySymbol}
                    />
                  )}
                  {others.map(c => (
                    <CreativeGrid key={c.id} campaign={c} clientId={clientId} currencySymbol={currencySymbol} />
                  ))}
                </>
              );
            })()}
            {campaigns.filter(c => (c.status === "active" || c.spend > 0) && c.creatives.length > 0).length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum criativo encontrado para campanhas ativas ou com gasto no período
              </div>
            )}
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <BrandingPanel data={igData} isLoading={igLoading} error={igError as Error | null} currencySymbol={currencySymbol} />
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
