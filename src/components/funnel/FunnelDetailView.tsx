import { useMemo } from "react";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { FunnelMetricsCards } from "./FunnelMetricsCards";
import { FunnelPodium } from "./FunnelPodium";
import { FunnelRecommendations } from "./FunnelRecommendations";
import { EditableOverviewFunnel } from "@/components/dashboard/overview/EditableOverviewFunnel";
import { BestAdsList } from "@/components/dashboard/overview/BestAdsList";
import { Card } from "@/components/ui/card";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol: string;
}

export function FunnelDetailView({ clientId, funnelCode, funnelLabel, campaigns, currencySymbol }: Props) {
  const analysis = useFunnelAnalysis(campaigns);

  // Métricas relevantes para a exibição de criativos por tipo de funil.
  // Limitamos a 3 para manter o card limpo na visão do cliente.
  const adMetricsByFunnel = useMemo(() => {
    const code = (funnelCode || "").toUpperCase();
    // Vendas / ROAS
    if (["F8", "F9", "F11"].includes(code)) {
      return ["primaryResult", "clicks", "ctr", "roas"];
    }
    // Captação de lead / inscrições
    if (["F4", "F5", "F6", "F10", "F12", "F13"].includes(code)) {
      return ["primaryResult", "clicks", "ctr"];
    }
    // Mensagens / Call de vendas
    if (["F2", "F3", "F7"].includes(code)) {
      return ["primaryResult", "clicks", "ctr"];
    }
    // Topo: engajamento / seguidores / interação
    if (["F1", "F14", "F15"].includes(code)) {
      return ["primaryResult", "clicks", "ctr"];
    }
    return ["primaryResult", "clicks", "ctr", "conversions"];
  }, [funnelCode]);

  // Aggregate Meta totals from these campaigns to feed EditableOverviewFunnel
  const metaTotals = useMemo(() => {
    const sum = (k: keyof Campaign) =>
      campaigns.reduce((s, c) => s + Number((c as any)[k] || 0), 0);
    return {
      impressions: sum("impressions"),
      reach: sum("reach"),
      clicks: sum("clicks"),
      landing_page_views: sum("landingPageViews" as any),
      messaging_conversations_started: sum("messagingConversationsStarted" as any) || 0,
      add_to_cart: sum("addToCart" as any),
      initiate_checkout: sum("initiateCheckout" as any),
      purchases: sum("purchases" as any),
      conversions: sum("conversions" as any),
      leads: sum("conversions" as any),
      sales: sum("purchases" as any),
      revenue: sum("purchaseValue" as any),
    };
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Nenhuma campanha encontrada para este funil no período.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 bg-muted/10">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold">{funnelLabel}</h3>
            <p className="text-xs text-muted-foreground">
              {campaigns.length} campanha{campaigns.length > 1 ? "s" : ""} agrupadas em <strong>{funnelCode}</strong>
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Investimento</p>
              <p className="font-bold tabular-nums">
                {currencySymbol} {analysis.totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Receita</p>
              <p className="font-bold tabular-nums text-primary">
                {currencySymbol} {analysis.totalPurchaseValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ROAS</p>
              <p className="font-bold tabular-nums">{analysis.metrics.roas.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      </Card>

      <FunnelMetricsCards
        metrics={analysis.metrics}
        totalSpend={analysis.totalSpend}
        totalPurchaseValue={analysis.totalPurchaseValue}
      />

      {/* Funil EDITÁVEL específico para este funil (único funil exibido) */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold mb-4">Funil de {funnelCode}</h4>
        <EditableOverviewFunnel
          clientId={clientId}
          campaignId={funnelCode}
          metrics={{
            current: metaTotals,
            previous: {},
          }}
          extraMetricLabels={[
            { key: "leads", label: "Leads" },
            { key: "sales", label: "Vendas" },
            { key: "revenue", label: "Faturamento" },
          ]}
        />
      </Card>

      {/* Pódio interno do funil */}
      <FunnelPodium
        topRoas={analysis.topRoas}
        topCpa={analysis.topCpa}
        topCtr={analysis.topCtr}
      />

      {/* Melhores anúncios deste funil */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Melhores Anúncios do {funnelCode}</h4>
        <BestAdsList
          campaigns={campaigns}
          limit={5}
          metrics={adMetricsByFunnel}
          currencySymbol={currencySymbol}
        />
      </Card>

      <FunnelRecommendations recommendations={analysis.recommendations} />
    </div>
  );
}