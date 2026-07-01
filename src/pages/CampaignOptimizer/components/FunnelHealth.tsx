import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeData } from '../../../data/mockCampaigns';
import { ArrowRight, Activity, AlertTriangle, Eye, MousePointerClick, Globe, ShoppingCart, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelHealthProps {
  creatives: CreativeData[];
}

export function FunnelHealth({ creatives }: FunnelHealthProps) {
  // Aggregate metrics
  const stats = creatives.reduce((acc, curr) => {
    acc.impressions += curr.impressions;
    acc.clicks += curr.linkClicks;
    acc.lpv += curr.landingPageViews;
    acc.checkouts += curr.initiateCheckouts;
    acc.purchases += curr.purchases;
    return acc;
  }, {
    impressions: 0,
    clicks: 0,
    lpv: 0,
    checkouts: 0,
    purchases: 0
  });

  if (stats.impressions === 0) return null;

  // Calculate Conversion Rates
  const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
  const connectRate = stats.clicks > 0 ? (stats.lpv / stats.clicks) * 100 : 0;
  const icRate = stats.lpv > 0 ? (stats.checkouts / stats.lpv) * 100 : 0;
  const purchaseRate = stats.checkouts > 0 ? (stats.purchases / stats.checkouts) * 100 : 0;

  // Find Bottleneck
  let bottleneck = null;
  if (ctr > 0 && ctr < 1) {
    bottleneck = { stage: 'Anúncios (CTR)', message: 'Baixo interesse. Troque os criativos.', value: ctr, ideal: '> 1%', icon: MousePointerClick };
  } else if (connectRate > 0 && connectRate < 70) {
    bottleneck = { stage: 'Carregamento (Connect Rate)', message: 'Muitos cliques falsos ou site lento. Revise a LP.', value: connectRate, ideal: '> 70%', icon: Globe };
  } else if (icRate > 0 && icRate < 10) {
    bottleneck = { stage: 'Página de Vendas (IC Rate)', message: 'A copy ou a oferta não está convencendo.', value: icRate, ideal: '> 10%', icon: ShoppingCart };
  } else if (stats.checkouts > 0 && purchaseRate < 15) {
    bottleneck = { stage: 'Checkout (Conversão Final)', message: 'Fuga no pagamento. Objeção de preço ou frete.', value: purchaseRate, ideal: '> 15%', icon: CreditCard };
  }

  const steps = [
    { label: "Impressões", value: stats.impressions, icon: Eye },
    { label: "Cliques", value: stats.clicks, rate: ctr, rateLabel: "CTR", isBad: ctr < 1, icon: MousePointerClick },
    { label: "Visitas", value: stats.lpv, rate: connectRate, rateLabel: "Connect", isBad: connectRate < 70, icon: Globe },
    { label: "Checkouts", value: stats.checkouts, rate: icRate, rateLabel: "IC Rate", isBad: icRate < 10, icon: ShoppingCart },
    { label: "Vendas", value: stats.purchases, rate: purchaseRate, rateLabel: "Conversão", isBad: stats.checkouts > 0 && purchaseRate < 15, icon: CreditCard },
  ];

  return (
    <div className="space-y-4">
      {bottleneck && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-destructive flex items-center gap-2">
                Gargalo Detectado: {bottleneck.stage}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {bottleneck.message} Atual: <strong>{bottleneck.value.toFixed(1)}%</strong> (Ideal: {bottleneck.ideal})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Saúde do Funil (Caminho do Usuário)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                {/* Etapa */}
                <div className="flex flex-col items-center text-center w-full md:w-32">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-sm border",
                    step.isBad ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-background text-primary"
                  )}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-foreground text-xl">{step.value.toLocaleString('pt-BR')}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{step.label}</span>
                </div>

                {/* Seta de Conversão */}
                {idx < steps.length - 1 && (
                  <div className="flex flex-col items-center justify-center w-full md:w-24 gap-1">
                    <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                    {steps[idx + 1].rate !== undefined && (
                      <BadgeRate 
                        label={steps[idx + 1].rateLabel} 
                        value={steps[idx + 1].rate} 
                        isBad={steps[idx + 1].isBad} 
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BadgeRate({ label, value, isBad }: { label?: string, value?: number, isBad?: boolean }) {
  if (value === undefined) return null;
  
  return (
    <div className={cn(
      "text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border",
      isBad 
        ? "bg-destructive/10 text-destructive border-destructive/20" 
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    )}>
      {value.toFixed(1)}% {label}
    </div>
  );
}
