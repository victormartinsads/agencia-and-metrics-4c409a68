import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles, TrendingUp, Palette, GitBranch } from "lucide-react";
import { FunnelMetrics, FunnelCampaign } from "@/hooks/useFunnelAnalysis";

interface Props {
  campaigns: FunnelCampaign[];
  metrics: FunnelMetrics;
  totalSpend: number;
  totalPurchaseValue: number;
}

interface InsightCategory {
  title: string;
  icon: typeof TrendingUp;
  insights: string[];
}

export function FunnelAIInsights({ campaigns, metrics, totalSpend, totalPurchaseValue }: Props) {
  const [insights, setInsights] = useState<InsightCategory[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const summary = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        totalSpend: totalSpend.toFixed(2),
        totalRevenue: totalPurchaseValue.toFixed(2),
        roas: metrics.roas.toFixed(2),
        cpa: metrics.cpa.toFixed(2),
        ctrRate: metrics.ctrRate.toFixed(2),
        lpRate: metrics.lpRate.toFixed(2),
        atcRate: metrics.atcRate.toFixed(2),
        checkoutRate: metrics.checkoutRate.toFixed(2),
        purchaseRate: metrics.purchaseRate.toFixed(2),
        topo: campaigns.filter((c) => c.funnelStage === "topo").map((c) => ({ name: c.name, spend: c.spend, ctr: c.ctr, roas: c.roas, frequency: c.frequency })),
        meio: campaigns.filter((c) => c.funnelStage === "meio").map((c) => ({ name: c.name, spend: c.spend, ctr: c.ctr, roas: c.roas, frequency: c.frequency })),
        fundo: campaigns.filter((c) => c.funnelStage === "fundo").map((c) => ({ name: c.name, spend: c.spend, ctr: c.ctr, roas: c.roas, frequency: c.frequency })),
      };

      const { data, error } = await supabase.functions.invoke("funnel-insights", {
        body: { summary },
      });

      if (error) throw error;
      if (data?.insights) {
        setInsights(data.insights);
      }
    } catch (e) {
      console.error("AI insights error:", e);
      // Fallback to rule-based insights
      setInsights(generateFallbackInsights());
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackInsights = (): InsightCategory[] => {
    const performance: string[] = [];
    const creative: string[] = [];
    const funnel: string[] = [];

    if (metrics.ctrRate < 1) performance.push("CTR abaixo de 1% indica que os criativos podem não estar chamando atenção do público-alvo.");
    if (metrics.ctrRate > 3) performance.push(`CTR de ${metrics.ctrRate.toFixed(1)}% indica excelente alinhamento entre criativo e público.`);
    if (metrics.lpRate > 0 && metrics.lpRate < 50) performance.push("Alta taxa de clique mas baixa taxa de LP pode indicar problema na página de destino.");
    if (metrics.atcRate > 0 && metrics.purchaseRate < 30) performance.push("Add to cart alto mas poucas compras pode indicar fricção no checkout.");
    if (metrics.roas > 3) performance.push(`ROAS de ${metrics.roas.toFixed(1)}x está excelente — considere escalar.`);
    if (metrics.roas > 0 && metrics.roas < 1) performance.push(`ROAS de ${metrics.roas.toFixed(1)}x está negativo — revise estratégia urgentemente.`);

    const highFreq = campaigns.filter((c) => c.frequency > 3);
    if (highFreq.length > 0) creative.push(`${highFreq.length} campanha(s) com frequência acima de 3x — renove os criativos para evitar fadiga.`);
    const lowCtr = campaigns.filter((c) => c.ctr < 1 && c.spend > 50);
    if (lowCtr.length > 0) creative.push(`${lowCtr.length} campanha(s) com CTR baixo — teste novos formatos (vídeo, carrossel, UGC).`);

    const topo = campaigns.filter((c) => c.funnelStage === "topo");
    const meio = campaigns.filter((c) => c.funnelStage === "meio");
    const fundo = campaigns.filter((c) => c.funnelStage === "fundo");

    if (topo.length === 0) funnel.push("Sem campanhas de topo de funil — considere criar campanhas de awareness/alcance.");
    if (topo.length > 0 && meio.length === 0) funnel.push("Campanhas de topo gerando pouco tráfego para meio de funil — crie campanhas de consideração.");
    if (fundo.length === 0 && meio.length > 0) funnel.push("Sem campanhas de fundo de funil — está perdendo oportunidades de conversão.");
    if (fundo.length > meio.length * 2) funnel.push("Proporção desproporcional de campanhas de fundo vs meio — equilibre o funil.");

    return [
      { title: "Performance", icon: TrendingUp, insights: performance.length > 0 ? performance : ["Métricas dentro dos parâmetros normais."] },
      { title: "Criativo", icon: Palette, insights: creative.length > 0 ? creative : ["Criativos com performance adequada."] },
      { title: "Estrutura de Funil", icon: GitBranch, insights: funnel.length > 0 ? funnel : ["Estrutura de funil equilibrada."] },
    ];
  };

  const iconMap: Record<string, typeof TrendingUp> = {
    Performance: TrendingUp,
    Criativo: Palette,
    "Estrutura de Funil": GitBranch,
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Insights com IA
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">Análise estratégica automática dos dados</p>
        </div>
        <Button size="sm" onClick={generateInsights} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {insights ? "Regenerar" : "Gerar Insights"}
        </Button>
      </div>
      <div className="p-5">
        {!insights && !loading && (
          <div className="text-center py-8">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Clique em "Gerar Insights" para a IA analisar seus dados</p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando dados...</span>
          </div>
        )}
        {insights && (
          <div className="space-y-5">
            {insights.map((category, ci) => {
              const Icon = iconMap[category.title] || category.icon || TrendingUp;
              return (
                <div key={category.title} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {category.title}
                  </h4>
                  {category.insights.map((insight, ii) => (
                    <motion.div
                      key={ii}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (ci * 3 + ii) * 0.05 }}
                      className="p-3 rounded-lg bg-primary/5 border border-primary/10"
                    >
                      <p className="text-xs text-card-foreground leading-relaxed">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
