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

const SYSTEM_PROMPT = `Você é um Analista de Mídia Pleno/Sênior especialista em Meta Ads.
Analise os dados do funil fornecidos e gere um diagnóstico COMPLETO e PROFISSIONAL em português brasileiro.

Sua análise DEVE conter exatamente estas 4 categorias, usando a tool 'generate_insights':
1. Fortalezas (O que está bom) - Destaque métricas de alta performance, CTR alto, ROAS bom.
2. Gargalos (O que está ruim) - Identifique com precisão onde o funil trava (CPA alto, CTR baixo, frequência excessiva).
3. Oportunidades (O que melhorar) - Sugestões táticas de realocação de verba, novos testes.
4. Plano de Ação (Como melhorar) - Instruções diretas passo a passo (ex: 'Pausar campanha X', 'Aumentar budget em 20%').

Seja extremamente analítico. Use os NÚMEROS REAIS dos dados fornecidos nas suas explicações. Não seja genérico.
Retorne de 2 a 4 insights poderosos para CADA categoria.`;

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

      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (geminiKey) {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${geminiKey}`,
          },
          body: JSON.stringify({
            model: "gemini-1.5-pro",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Dados consolidados do Funil:\n${JSON.stringify(summary, null, 2)}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_insights",
                  description: "Return professional funnel analysis insights in 4 strict categories",
                  parameters: {
                    type: "object",
                    properties: {
                      insights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", enum: ["Fortalezas", "Gargalos", "Oportunidades", "Plano de Ação"] },
                            insights: { type: "array", items: { type: "string" } },
                          },
                          required: ["title", "insights"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["insights"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "generate_insights" } },
            temperature: 0.2,
          }),
        });

        if (!response.ok) throw new Error("Falha na API do Gemini");
        const aiData = await response.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          setInsights(parsed.insights || []);
          return;
        }
      }

      // Fallback para edge function antiga caso não tenha a chave no frontend
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
      { title: "Fortalezas", icon: TrendingUp, insights: performance.length > 0 ? performance : ["Métricas base dentro do padrão de performance aceitável."] },
      { title: "Gargalos", icon: Brain, insights: creative.length > 0 ? creative : ["Não foram encontrados grandes gargalos técnicos."] },
      { title: "Oportunidades", icon: Sparkles, insights: funnel.length > 0 ? funnel : ["Mantenha as otimizações em andamento."] },
      { title: "Plano de Ação", icon: GitBranch, insights: ["Continue acompanhando diariamente as métricas."] },
    ];
  };

  const iconMap: Record<string, typeof TrendingUp> = {
    Fortalezas: TrendingUp,
    Gargalos: Brain,
    Oportunidades: Sparkles,
    "Plano de Ação": GitBranch,
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
                  <div className="space-y-3">
                    {category.insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-primary mt-1 flex-shrink-0 text-[10px]">■</span>
                        <span className="text-muted-foreground text-xs leading-relaxed">{insight}</span>
                      </div>
                    ))}
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
