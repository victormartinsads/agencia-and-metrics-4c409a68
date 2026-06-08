import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, TrendingUp, GitBranch } from "lucide-react";
import { FunnelMetrics, FunnelCampaign } from "@/hooks/useFunnelAnalysis";
import { ExpertEngine, InsightCategory } from "@/utils/ExpertEngine";

interface Props {
  campaigns: FunnelCampaign[];
  metrics: FunnelMetrics;
  totalSpend: number;
  totalPurchaseValue: number;
}

export function FunnelAIInsights({ campaigns, metrics }: Props) {
  const [insights, setInsights] = useState<InsightCategory[] | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Simulando um tempo de "processamento" de 1 segundo para dar feedback visual de análise
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const generated = ExpertEngine.generateInsights(campaigns, metrics);
      setInsights(generated);
    } catch (e) {
      console.error("Expert Engine error:", e);
    } finally {
      setLoading(false);
    }
  };

  const iconMap: Record<string, typeof TrendingUp> = {
    "Diagnóstico Geral do Funil": Brain,
    "Otimizações Gerais": Sparkles,
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
              const Icon = iconMap[category.title] || (category.title.includes("Campanha") || category.title.includes("Otimiza") ? GitBranch : TrendingUp);
              return (
                <div key={category.title} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {category.title}
                  </h4>
                  <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-primary/20 bg-muted/10 p-3 rounded-r-md">
                    {category.content}
                  </div>
                </div>
              );
            })}



          </div>
        )}
      </div>
    </div>
  );
}
