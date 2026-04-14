import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ComoEstamosMetrics, ClassifiedCampaign } from "@/hooks/useComoEstamos";

interface Props {
  clientId: string;
  metrics: ComoEstamosMetrics;
  prevMetrics?: ComoEstamosMetrics;
  classified: ClassifiedCampaign[];
  alerts: string[];
}

export function ComoEstamosInsights({ clientId, metrics, prevMetrics, classified, alerts }: Props) {
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Analise estes dados de campanhas de Meta Ads e gere insights estratégicos em português.

MÉTRICAS ATUAIS:
- Investimento: R$ ${metrics.totalSpend.toFixed(2)}
- Resultados: ${metrics.totalResults}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPA: R$ ${metrics.cpa.toFixed(2)}
- CPM: R$ ${metrics.cpm.toFixed(2)}
- Taxa de conversão: ${metrics.conversionRate.toFixed(2)}%
- Aproveitamento do tráfego: ${metrics.trafficUtilization.toFixed(1)}%
- Perda de tráfego: ${metrics.trafficLoss.toFixed(1)}%

${prevMetrics ? `COMPARAÇÃO COM PERÍODO ANTERIOR:
- Investimento anterior: R$ ${prevMetrics.totalSpend.toFixed(2)}
- Resultados anterior: ${prevMetrics.totalResults}
- CTR anterior: ${prevMetrics.ctr.toFixed(2)}%
- CPA anterior: R$ ${prevMetrics.cpa.toFixed(2)}` : ""}

ALERTAS: ${alerts.join("; ")}

TOP CAMPANHAS:
${classified.slice(0, 10).map(c => `- ${c.name}: Invest R$${c.spend.toFixed(0)}, ${c.conversions} resultados, CTR ${c.ctr}%, CPA R$${c.costPerConversion.toFixed(2)}, Class: ${c.classification}`).join("\n")}

Gere insights em 3 categorias:
1. Performance
2. Criativo
3. Estrutura de Funil

Formato: use bullet points com insights claros e acionáveis.`;

      const { data, error } = await supabase.functions.invoke("funnel-insights", {
        body: { prompt, clientId },
      });

      if (error) throw error;
      setInsights(data?.insights || data?.text || "Não foi possível gerar insights.");
    } catch (e) {
      setInsights("Erro ao gerar insights. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" /> Insights Automáticos
        </h3>
        <Button onClick={generate} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analisando..." : "Gerar Insights"}
        </Button>
      </div>
      {insights && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm text-card-foreground">
            {insights}
          </div>
        </div>
      )}
    </motion.div>
  );
}
