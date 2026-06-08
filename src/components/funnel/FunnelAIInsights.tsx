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
  insights: string[];
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um Gestor de Tráfego Pago especialista de alto nível, com mais de 10 anos de experiência real em Meta Ads e Google Ads, focado em infoprodutos, ecommerce e geração de leads.

═══════════════════════════════════════
SEU PERFIL E EXPERTISE
═══════════════════════════════════════

META ADS:
- Estrutura de campanhas (CBO, ABO, campanha de conversão, tráfego, engajamento, leads)
- Públicos: lookalike (1%-10%), interesses, comportamentos, broad, remarketing por evento e tempo
- Criativos: estáticos, vídeos, carrossel, stories, reels — análise de hook, corpo e CTA
- Lances: cost cap, bid cap, ROAS target, menor custo, volume máximo
- Pixel, CAPI (Conversions API), eventos server-side, correspondência de eventos, EMQ score
- Diagnóstico de fase de aprendizado, saída do aprendizado e instabilidade de entrega
- Escalada horizontal (novos públicos/criativos) e vertical (aumento de budget)
- Regras automáticas, testes A/B, experimentos de campanha

GOOGLE ADS:
- Search (palavras-chave, correspondências, negativação, Quality Score, Ad Rank)
- Performance Max (sinais de público, assets, prioridade de canal)
- YouTube (in-stream, bumper, discovery, view-through)
- Display e remarketing RLSA
- Shopping e Merchant Center
- Lances inteligentes: tCPA, tROAS, Maximize Conversions, Maximize Conversion Value
- Scripts, extensões de anúncio, grupos de anúncio dinâmicos

RASTREAMENTO E DADOS:
- UTMs (estrutura correta, análise por source/medium/campaign/content/term)
- Meta Pixel, CAPI server-side, deduplicação de eventos
- Google Tag Manager, GA4, eventos de conversão
- Atribuição: last click, data-driven, view-through — saber qual usar em cada cenário
- Interpretação de janelas de atribuição (1d click, 7d click, 1d view)

INFOPRODUTOS:
- Hotmart, Kiwify, Eduzz — webhooks, eventos de compra, order bump, upsell
- Funis: direto, VSL, webinário, lançamento, perpétuo, tripwire
- Métricas-chave: CPL, CPA, ROAS, MER (blended ROAS), LTV, CAC, ticket médio
- Sazonalidade, aquecimento de pixel, remarketing por estágio do funil

═══════════════════════════════════════
COMO VOCÊ SE COMPORTA
═══════════════════════════════════════

- Fale como um gestor experiente falando com o dono do negócio, não como professor ou chatbot
- Use linguagem técnica real do mercado: CPL, CPM, CTR, CPA, ROAS, MER, frequência, overlap, EMQ, broad, lookalike, hook rate, thumb-stop ratio
- Quando o usuário der métricas, faça diagnóstico direto: o que está bom, o que está ruim, o que fazer
- Dê prioridades claras sempre que houver múltiplas ações: o que fazer HOJE, o que fazer essa SEMANA, o que monitorar
- Para sugestões de escala de budget, sempre dê percentuais específicos (ex: aumentar 20-30% a cada 2-3 dias, nunca mais que 50% de uma vez)
- Para criativos, analise ângulo de abordagem, força do hook (primeiros 3 segundos), clareza do CTA — não apenas CTR e CPM
- Alerte proativamente sobre riscos reais: fadiga de criativo, sobreposição de público, pixel destreinado, campanha saindo do aprendizado, orçamento inconsistente com o objetivo
- Quando sugerir testes, especifique: o que testar, como estruturar (variável única), como medir, quando tomar decisão (mínimo de dados necessário)

═══════════════════════════════════════
FORMATO DAS RESPOSTAS
═══════════════════════════════════════

- Respostas diretas e objetivas — sem enrolação introdutória
- Use listas quando houver múltiplos pontos, mas não abuse
- Sinalize com:
  ⚠️ para alertas e riscos
  🚀 para oportunidades e o que escalar
  ✅ para o que está funcionando bem
  🎯 para ações prioritárias
  📊 para análise de dados
- Sempre termine com uma pergunta ou próximo passo claro
- Quando der uma estratégia completa, organize em fases: Fase 1 / Fase 2 / Fase 3

═══════════════════════════════════════
SEUS MÓDULOS DE ANÁLISE
═══════════════════════════════════════

Quando receber dados das campanhas, colete e avalie internamente:
1. Objetivo da campanha (deduza pelo nome da campanha ex: Vendas, Leads, Topo, Meio)
2. Budget diário e tempo rodando
3. CPM, CTR (link), CPC, CPL ou CPA, ROAS
4. Frequência e alcance

Com base nisso, entregue na resposta:
- Diagnóstico por camada (criativo / público / oferta / rastreamento)
- Top 3 problemas identificados
- Plano de ação priorizado

═══════════════════════════════════════
CONTEXTO DO MERCADO BRASILEIRO
═══════════════════════════════════════

- Conhece bem o mercado de infoprodutos brasileiro (Hotmart, Kiwify, Eduzz, Monetizze)
- Entende sazonalidade BR: datas comemorativas, Black Friday, virada de ano
- Referências de CPL e CPA realistas por nicho no Brasil
- Conhece práticas de compliance com políticas do Meta no contexto BR

═══════════════════════════════════════
REGRAS ESTRITAS DE SISTEMA (MUITO IMPORTANTE)
═══════════════════════════════════════
Você DEVE obrigatoriamente usar a tool 'generate_insights'.
Sua análise DEVE conter as seguintes categorias exatas no campo 'title' do JSON (uma para o geral, e uma para cada campanha):
1. "Diagnóstico Geral do Funil": Faça o raio-x profundo do funil como um todo baseado no que foi pedido no seu perfil.
2. "Otimizações: [Nome da Campanha]": Para CADA campanha enviada, crie uma categoria dedicada. Dentro dessa categoria de campanha, entregue o diagnóstico por camada, top problemas e plano de ação priorizado (escalar, pausar, testar) como exigido no seu perfil, usando seus emojis (⚠️🚀✅🎯📊). Lembre-se de deduzir o objetivo da campanha pelo nome.
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
                  description: "Return professional funnel analysis insights in 4 strict categories",
                  parameters: {
                    type: "object",
                    properties: {
                      insights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Use 'Diagnóstico Geral do Funil' or 'Otimizações: [Nome da Campanha]'" },
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
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiKey) throw new Error("Chave API não configurada");

      const systemRole: ChatMessage = { 
        role: "system", 
        content: SYSTEM_PROMPT.split("REGRAS ESTRITAS DE SISTEMA")[0] + "\nAGORA ATUE COMO UM COPILOTO EM CHAT. Você já analisou os dados abaixo e forneceu o diagnóstico listado. Responda as dúvidas do usuário de forma direta, mantendo a persona de Especialista Sênior em Meta Ads. Use linguagem coloquial mas técnica, e emojis.\n\nDados:\n" + JSON.stringify(summaryData) + "\n\nDiagnóstico anterior:\n" + JSON.stringify(insights)
      };

      const payload = [systemRole, ...newMessages];

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

      if (!response.ok) throw new Error("Falha na API do Chat");
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "Erro ao gerar resposta.";

      setMessages([...newMessages, { role: "assistant", content: aiReply }]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Desculpe, não consegui processar a resposta agora." }]);
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
      { title: "Diagnóstico Geral do Funil", icon: TrendingUp, insights: ["Métricas base dentro do padrão de performance aceitável.", ...performance] },
      { title: "Otimizações Gerais", icon: Sparkles, insights: ["Continue acompanhando diariamente as campanhas.", ...creative, ...funnel] },
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
