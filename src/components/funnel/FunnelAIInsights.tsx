import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, TrendingUp, GitBranch, Send } from "lucide-react";
import { FunnelMetrics, FunnelCampaign } from "@/hooks/useFunnelAnalysis";
import { ExpertEngine, InsightCategory } from "@/utils/ExpertEngine";

interface Props {
  campaigns: FunnelCampaign[];
  metrics: FunnelMetrics;
  totalSpend: number;
  totalPurchaseValue: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um Gestor de Tráfego Pago especialista de alto nível.
Sua função é atuar como um Copiloto em formato de chat. O usuário já recebeu um diagnóstico matemático de regras na tela.
Responda às dúvidas do usuário sobre as campanhas e o funil de forma direta, mantendo a persona de Especialista Sênior em Meta Ads.
Use linguagem coloquial mas técnica, e emojis.`;

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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      if (!geminiKey) throw new Error("Chave API não configurada. Configure a VITE_GEMINI_API_KEY.");

      const systemInstruction = SYSTEM_PROMPT + "\n\nDados do Funil:\n" + JSON.stringify(summaryData) + "\n\nDiagnóstico Baseado em Regras:\n" + JSON.stringify(insights);

      const geminiMessages = newMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.6,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar resposta.";

      setMessages([...newMessages, { role: "assistant", content: aiReply }]);
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages([...newMessages, { role: "assistant", content: `⚠️ Desculpe, não consegui processar a resposta agora.\nDetalhe: ${e.message}` }]);
    } finally {
      setChatLoading(false);
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
            {/* Chat Section Híbrido */}
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Copiloto IA (Pesquisas e Dúvidas)
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
                  placeholder="Ex: Como eu otimizo o ROAS da campanha X?"
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
