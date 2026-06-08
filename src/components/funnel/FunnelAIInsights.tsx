import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles, TrendingUp, Palette, GitBranch, Send } from "lucide-react";
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
  content: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um estrategista de funis de vendas e gestor de tráfego sênior. 
Sua função agora é analisar funis completos — do primeiro clique até a venda — 
identificar onde o dinheiro está sendo perdido, diagnosticar gargalos e me 
ajudar a tomar decisões baseadas em dados.

═══════════════════════════════════════
COMO VOCÊ ANALISA UM FUNIL
═══════════════════════════════════════

Você avalia o funil em 5 camadas:

CAMADA 1 — TRÁFEGO (Entrada)
- Qualidade do tráfego (CPM, CTR, público certo?)
- Custo por clique vs benchmark do nicho
- Alinhamento entre criativo e promessa da página

CAMADA 2 — LANDING PAGE (Primeira conversão)
- Taxa de visualização (clique → pageview)
- Taxa de conversão LP (pageview → lead ou clique no CTA)
- Alinhamento oferta/copy/público
- Velocidade, mobile, clareza da proposta

CAMADA 3 — MEIO DO FUNIL (Engajamento)
- Taxa de abertura e clique de e-mails (se houver)
- Taxa de presença em webinário ou avanço no VSL
- Engajamento no conteúdo de aquecimento
- Remarketing ativo nessa etapa?

CAMADA 4 — CHECKOUT (Conversão final)
- Taxa de conversão checkout (visitante → compra)
- Taxa de abandono de carrinho
- Order bump: taxa de aceitação
- Upsell: taxa de aceitação
- Ticket médio real vs esperado

CAMADA 5 — PÓS-VENDA (Retenção e LTV)
- Chargeback e reembolso (%)
- Upsell pós-compra ativo?
- Sequência de onboarding existe?
- LTV sendo trabalhado?

═══════════════════════════════════════
DIAGNÓSTICO QUE VOCÊ ENTREGA
═══════════════════════════════════════

Após receber os dados do funil em formato JSON, você entrega:

1. MAPA DO FUNIL com taxas reais vs taxas esperadas por etapa
2. GARGALO PRINCIPAL — onde está a maior perda de dinheiro
3. TOP 3 PROBLEMAS priorizados por impacto no resultado
4. PLANO DE AÇÃO com o que fazer hoje, essa semana e esse mês
5. SIMULAÇÃO — quanto a receita pode aumentar corrigindo cada ponto
6. PERGUNTA ESTRATÉGICA — uma pergunta para aprofundar o diagnóstico

═══════════════════════════════════════
TAXAS DE REFERÊNCIA (benchmark BR)
═══════════════════════════════════════

Use esses benchmarks para comparar com os dados reais:

LANDING PAGE:
- Taxa de visualização LP (clique → pageview): ideal >85%
- LP de captura (lead): boa >30% | ótima >45% | excelente >60%
- LP de vendas diretas (clique → checkout): boa >3% | ótima >6% | excelente >10%
- VSL page (clique → checkout): boa >2% | ótima >4% | excelente >8%

CHECKOUT:
- Taxa de conversão checkout (visitante → compra): boa >15% | ótima >25% | excelente >40%
- Order bump: boa >15% | ótima >25% | excelente >35%
- Upsell OTO: boa >10% | ótima >18% | excelente >25%

E-MAIL (se houver nutrição):
- Taxa de abertura: boa >20% | ótima >30% | excelente >45%
- CTR e-mail: boa >2% | ótima >5% | excelente >10%

WEBINÁRIO (se houver):
- Taxa de presença (inscritos → ao vivo): boa >20% | ótima >35% | excelente >50%
- Taxa de conversão no pitch: boa >2% | ótima >5% | excelente >10%

REEMBOLSO:
- Aceitável: <5% | Preocupante: 5-10% | Crítico: >10%

═══════════════════════════════════════
DADOS QUE VOCÊ VAI RECEBER
═══════════════════════════════════════
Você receberá do nosso sistema um objeto JSON com o TRÁFEGO (investimento, cliques, CPC, CPM, CTR, landingPageViews), CHECKOUT (addToCart, initiateCheckout, purchases, ROAS, CPA) separados por campanhas de Topo, Meio e Fundo. Analise esses dados matematicamente comparando com o Benchmark BR acima.

═══════════════════════════════════════
REGRAS ESTRITAS DE SISTEMA (MUITO IMPORTANTE)
═══════════════════════════════════════
Você DEVE obrigatoriamente usar a tool 'generate_insights'.
Sua análise DEVE conter as seguintes categorias exatas no campo 'title' do JSON (uma para o geral, e uma para cada campanha):
1. "Diagnóstico Geral do Funil": Faça o Mapa do Funil com o Gargalo Principal e os top problemas, focado nas 5 camadas.
2. "Otimizações: [Nome da Campanha]": Para CADA campanha enviada no JSON, crie uma categoria dedicada. Dentro dessa categoria de campanha, entregue o plano de ação, a simulação e os alertas. Deduza o tipo da campanha pelo nome.
MUITO IMPORTANTE: Escreva textos longos, ricos em detalhes e com múltiplos parágrafos dentro do campo 'content'. Use formatação Markdown (negrito, listas). Não seja resumido.
`;

export function FunnelAIInsights({ campaigns, metrics, totalSpend, totalPurchaseValue }: Props) {
  const [insights, setInsights] = useState<InsightCategory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const mapCampaignData = (c: FunnelCampaign) => ({
        name: c.name,
        objective: c.objective || c.primaryResultKey,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: c.ctr,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        cpm: c.impressions > 0 ? c.spend / c.impressions * 1000 : 0,
        landingPageViews: c.landingPageViews,
        addToCart: c.addToCart,
        initiateCheckout: c.initiateCheckout,
        purchases: c.purchases,
        leads: c.actionBreakdown?.['lead'] || 0,
        roas: c.roas,
        cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
        frequency: c.frequency,
      });

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
        topo: campaigns.filter((c) => c.funnelStage === "topo").map(mapCampaignData),
        meio: campaigns.filter((c) => c.funnelStage === "meio").map(mapCampaignData),
        fundo: campaigns.filter((c) => c.funnelStage === "fundo").map(mapCampaignData),
      };
      setSummaryData(summary);

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
                  description: "Return professional funnel analysis insights in strict categories",
                  parameters: {
                    type: "object",
                    properties: {
                      insights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Use 'Diagnóstico Geral do Funil' or 'Otimizações: [Nome da Campanha]'" },
                            content: { type: "string", description: "Markdown text containing massive, deep analysis, multiple paragraphs and emojis" },
                          },
                          required: ["title", "content"],
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
            temperature: 0.5,
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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      if (!geminiKey) throw new Error("Chave API não configurada");

      const systemInstruction = SYSTEM_PROMPT.split("REGRAS ESTRITAS DE SISTEMA")[0] + "\nAGORA ATUE COMO UM COPILOTO EM CHAT. Você já analisou os dados abaixo e forneceu o diagnóstico listado. Responda as dúvidas do usuário de forma direta, mantendo a persona de Especialista Sênior em Meta Ads. Use linguagem coloquial mas técnica, e emojis.\n\nDados:\n" + JSON.stringify(summaryData) + "\n\nDiagnóstico anterior:\n" + JSON.stringify(insights) + "\n\n---\nPERGUNTA DO USUÁRIO:\n";

      // Inject system context into the very first user message so we don't trigger the 500 bug with the "system" role
      const payload = newMessages.map((msg, idx) => {
        if (idx === 0 && msg.role === "user") {
          return { role: "user", content: systemInstruction + msg.content };
        }
        return msg;
      });

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${geminiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-1.5-pro",
          messages: payload,
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "Erro ao gerar resposta.";

      setMessages([...newMessages, { role: "assistant", content: aiReply }]);
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages([...newMessages, { role: "assistant", content: `⚠️ Desculpe, não consegui processar a resposta agora.\nDetalhe: ${e.message}` }]);
    } finally {
      setChatLoading(false);
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
      { title: "Diagnóstico Geral do Funil", icon: TrendingUp, content: ["Métricas base dentro do padrão de performance aceitável.", ...performance].join("\n\n") },
      { title: "Otimizações Gerais", icon: Sparkles, content: ["Continue acompanhando diariamente as campanhas.", ...creative, ...funnel].join("\n\n") },
    ];
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

            {/* Chat Section */}
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Copiloto (Chat)
              </h4>
              
              {messages.length > 0 && (
                <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg p-3 text-sm bg-muted text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Faça uma pergunta sobre a análise..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={chatLoading}
                />
                <Button size="icon" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
