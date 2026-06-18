import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

import { OverviewPremium } from "@/components/dashboard/overview/premium/OverviewPremium";
import { CreativeGrid, isCaptacaoSeguidores, CreativeMetricKey } from "@/components/dashboard/CreativeGrid";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandingPanel } from "@/components/dashboard/BrandingPanel";
import { Campaign } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaAdsData } from "@/hooks/useMetaAds";
import { friendlyError } from "@/lib/friendlyError";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";
import { FunnelAnalysisTab } from "@/components/funnel/FunnelAnalysisTab";
import { MetricsSpreadsheet } from "@/components/funnel/MetricsSpreadsheet";
import { DiagnosticoSemanal } from "@/components/diagnostico/DiagnosticoSemanal";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { GoogleAdsPanel } from "@/components/dashboard/GoogleAdsPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ClientNotionTemplate from "@/components/clients/ClientNotionTemplate";

interface Props {
  clientId?: string;
  datePreset?: string;
  metaData: MetaAdsData | undefined;
  metaLoading: boolean;
  metaError: Error | null;
  currencySymbol?: string;
  hideDiagnostico?: boolean;
  visibleTabs?: string[];
  activeTab?: string;
  onActiveTabChange?: (id: string) => void;
  hideTabList?: boolean;
  isPublicView?: boolean;
}

export function DashboardContent({ clientId, datePreset, metaData, metaLoading, metaError, currencySymbol = "R$", hideDiagnostico = false, visibleTabs, activeTab, onActiveTabChange, hideTabList = false, isPublicView = false }: Props) {
  const [selectedCreativeMetric, setSelectedCreativeMetric] = useState<CreativeMetricKey | "auto">("auto");
  const [showAll, setShowAll] = useState(false);
  const [localActiveTab, setLocalActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      if (tabParam === "como-estamos") return "diagnostico";
      if (tabParam === "visao-geral") return "overview";
      if (tabParam === "analise-de-funis") return "funnel";
      if (tabParam === "criativos") return "creatives";
      if (tabParam === "distribuicao") return "branding";
      if (tabParam === "planilha") return "spreadsheet";
      return tabParam;
    }
    return "overview";
  });

  const currentActiveTab = activeTab !== undefined ? activeTab : localActiveTab;

  const handleTabChange = (val: string) => {
    if (onActiveTabChange) {
      onActiveTabChange(val);
    } else {
      setLocalActiveTab(val);
      const url = new URL(window.location.href);
      let tabParam = val;
      if (val === "diagnostico") tabParam = "como-estamos";
      else if (val === "overview") tabParam = "visao-geral";
      else if (val === "funnel") tabParam = "analise-de-funis";
      else if (val === "creatives") tabParam = "criativos";
      else if (val === "branding") tabParam = "distribuicao";
      else if (val === "spreadsheet") tabParam = "planilha";
      url.searchParams.set("tab", tabParam);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const { data: clientInfo } = useQuery({
    queryKey: ["client-name", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase.from("clients").select("name, slug").eq("id", clientId).maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const showTab = (k: string) => !visibleTabs || visibleTabs.includes(k);
  const { data: igData, isLoading: igLoading, error: igError } = useInstagramInsights(clientId, clientInfo?.slug);

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
        <Tabs
          value={currentActiveTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {!hideTabList && <TabsList className="bg-card border border-border flex-wrap h-auto">
            {showTab("overview") && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
            {!hideDiagnostico && showTab("diagnostico") && <TabsTrigger value="diagnostico">Como Estamos</TabsTrigger>}
            {showTab("funnel") && <TabsTrigger value="funnel">Análise de Funis</TabsTrigger>}
            {showTab("diario") && <TabsTrigger value="diario">Diário</TabsTrigger>}
            {showTab("creatives") && <TabsTrigger value="creatives">Pódio de Criativos</TabsTrigger>}
            {showTab("branding") && <TabsTrigger value="branding">Distribuição</TabsTrigger>}
            {showTab("analytics") && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
            {showTab("google-ads") && <TabsTrigger value="google-ads">Google Ads</TabsTrigger>}
          </TabsList>}

          {showTab("overview") && <TabsContent value="overview" className="space-y-6">
            <OverviewPremium
              clientId={clientId}
              datePreset={datePreset || "last_7d"}
              metaData={metaData}
              currencySymbol={currencySymbol}
              publicSlug={clientInfo?.slug}
              isPublicView={isPublicView}
            />
          </TabsContent>}

          {showTab("diario") && <TabsContent value="diario" className="space-y-6">
            <ClientNotionTemplate
              clientId={clientId || ""}
              canManage={!isPublicView}
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
              readOnly={isPublicView}
            />
          </TabsContent>}



          {showTab("creatives") && <TabsContent value="creatives" className="space-y-6">
            {(() => {
              const eligible = campaigns.filter(c => (c.status === "active" || showAll || c.spend > 0) && c.creatives && c.creatives.length > 0);
              const captacao = eligible.filter(c => isCaptacaoSeguidores(c.name));
              const others = eligible.filter(c => !isCaptacaoSeguidores(c.name));
              return (
                <>
                  <div className="flex items-center justify-between mb-4 bg-card border border-border p-3 rounded-lg">
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground">Pódio de Criativos</h3>
                      <p className="text-[11px] text-muted-foreground">Avalie o desempenho dos criativos por métrica</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          showAll
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                        title={showAll ? "Mostrar apenas Top 3" : "Ver todos os criativos (ativos e desativados)"}
                      >
                        {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showAll ? "Top 3" : "Ver todos"}
                      </button>
                      <Select value={selectedCreativeMetric} onValueChange={(v) => setSelectedCreativeMetric(v as any)}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Métrica" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Métrica da Campanha</SelectItem>
                          <SelectItem value="conversions">Conversões (Resultados)</SelectItem>
                          <SelectItem value="clicks">Cliques (no Link)</SelectItem>
                          <SelectItem value="impressions">Impressões</SelectItem>
                          <SelectItem value="spend">Investimento</SelectItem>
                          <SelectItem value="roas">ROAS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {captacao.length > 0 && (
                    <AggregatedCreativeGrid
                      campaigns={captacao}
                      funnelLabel="Captação de Seguidores"
                      clientId={clientId}
                      currencySymbol={currencySymbol}
                      readOnly={isPublicView}
                      selectedMetricKey={selectedCreativeMetric === "auto" ? undefined : selectedCreativeMetric}
                      showAll={showAll}
                    />
                  )}
                  {others.map(c => (
                    <CreativeGrid key={c.id} campaign={c} clientId={clientId} currencySymbol={currencySymbol} readOnly={isPublicView} selectedMetricKey={selectedCreativeMetric === "auto" ? undefined : selectedCreativeMetric} showAll={showAll} />
                  ))}
                </>
              );
            })()}
            {campaigns.filter(c => (c.status === "active" || showAll || c.spend > 0) && c.creatives && c.creatives.length > 0).length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum criativo encontrado para campanhas ativas ou com gasto no período
              </div>
            )}
          </TabsContent>}

          {showTab("branding") && <TabsContent value="branding" className="space-y-6">
            <BrandingPanel data={igData} isLoading={igLoading} error={igError as Error | null} currencySymbol={currencySymbol} />
          </TabsContent>}

          {showTab("analytics") && <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
          </TabsContent>}

          {showTab("google-ads") && <TabsContent value="google-ads" className="space-y-6">
            <GoogleAdsPanel clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
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
