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
import { friendlyError } from "@/lib/friendlyError";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";
import { FunnelAnalysisTab } from "@/components/funnel/FunnelAnalysisTab";
import { MetricsSpreadsheet } from "@/components/funnel/MetricsSpreadsheet";
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
  hideDiagnostico?: boolean;
  visibleTabs?: string[];
}

export function DashboardContent({ clientId, datePreset, metaData, metaLoading, metaError, currencySymbol = "R$", hideDiagnostico = false, visibleTabs }: Props) {
  const showTab = (k: string) => !visibleTabs || visibleTabs.includes(k);
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
              {friendlyError(metaError, "Verifique o token de acesso e os IDs das contas de anúncio.")}
            </p>
          </div>
        </motion.div>
      )}

      {!metaLoading && metaData?.accountErrors && metaData.accountErrors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2"
        >
          <p className="text-sm font-semibold text-yellow-400">⚠️ Dados parciais em algumas contas</p>
          {metaData.accountErrors.map((e, i) => (
            <p key={i} className="text-xs text-yellow-200/80">
              <strong>{e.accountId}:</strong> {friendlyError(e.message, e.message)}
            </p>
          ))}
          <p className="text-[10px] text-muted-foreground pt-1">
            Quando uma conta falha, o dashboard continua carregando o restante. Isso pode fazer alguns funis, criativos e totais parecerem incompletos.
          </p>
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
            {showTab("overview") && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
            {!hideDiagnostico && showTab("diagnostico") && <TabsTrigger value="diagnostico">Como Estamos</TabsTrigger>}
            {showTab("funnel") && <TabsTrigger value="funnel">Análise de Funis</TabsTrigger>}
            {showTab("spreadsheet") && <TabsTrigger value="spreadsheet">Planilha de Métricas</TabsTrigger>}
            {showTab("creatives") && <TabsTrigger value="creatives">Pódio de Criativos</TabsTrigger>}
            {showTab("branding") && <TabsTrigger value="branding">Distribuição</TabsTrigger>}
          </TabsList>

          {showTab("overview") && <TabsContent value="overview" className="space-y-6">
            <OverviewRedesign
              clientId={clientId}
              datePreset={datePreset || "last_7d"}
              metaData={metaData}
              currencySymbol={currencySymbol}
            />
          </TabsContent>}

          {!hideDiagnostico && showTab("diagnostico") && <TabsContent value="diagnostico" className="space-y-6">
            <DiagnosticoSemanal
              clientId={clientId || ""}
              clientName={clientInfo?.name}
              campaigns={campaigns}
              datePreset={datePreset || "last_7d"}
              currencySymbol={currencySymbol}
            />
          </TabsContent>}

          {showTab("funnel") && <TabsContent value="funnel" className="space-y-6">
            <FunnelAnalysisTab
              clientId={clientId || ""}
              clientName={clientInfo?.name}
              campaigns={campaigns}
              dailyMetrics={dailyMetrics}
              datePreset={datePreset || "last_7d"}
              currencySymbol={currencySymbol}
            />
          </TabsContent>}

          {showTab("spreadsheet") && <TabsContent value="spreadsheet" className="space-y-6">
            <MetricsSpreadsheet
              clientId={clientId || ""}
              campaigns={campaigns}
              currencySymbol={currencySymbol}
            />
          </TabsContent>}

          {showTab("creatives") && <TabsContent value="creatives" className="space-y-6">
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
          </TabsContent>}

          {showTab("branding") && <TabsContent value="branding" className="space-y-6">
            <BrandingPanel data={igData} isLoading={igLoading} error={igError as Error | null} currencySymbol={currencySymbol} />
          </TabsContent>}
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
