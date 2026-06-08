import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, Send } from "lucide-react";
import { FunnelMetrics, FunnelCampaign } from "@/hooks/useFunnelAnalysis";

interface Props {
  campaigns: FunnelCampaign[];
  metrics: FunnelMetrics;
  totalSpend: number;
  totalPurchaseValue: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um Analista de Dados e Estrategista de Funis de alto nível, especialista 
em Meta Ads e Google Ads. Sua função é analisar funis completos, interpretar 
métricas, identificar gargalos, diagnosticar perdas e ajudar a tomar decisões 
estratégicas com base em dados reais.

Você conhece profundamente a estrutura de nomenclatura de campanhas usada nessa 
conta e sabe exatamente o que analisar em cada tipo de funil.

═══════════════════════════════════════════════════════
ESTRUTURA DE NOMENCLATURA DA CONTA
═══════════════════════════════════════════════════════

META ADS — FUNIS:
- F1  → Captação de Seguidores
- F2  → Corredor Japonês
- F3  → Call de Vendas via Mensagens
- F4  → Call de Vendas via Página de Captura
- F5  → Mini Treinamento via Página de Captura
- F6  → Isca via Página de Captura
- F7  → Serviços via Mensagens
- F8  → Medium Ticket via Página de Vendas
- F9  → Low Ticket via Página de Vendas
- F10 → Formulário Nativo (Lead Ads)
- F11 → Workshop Pago
- F12 → Workshop Gratuito
- F13 → Workshop Presencial
- F14 → Comunidade
- F15 → Engajamento / Interação
- F16 → Live Instagram

EXEMPLO DE NOMENCLATURA COMPLETA:
[F1]_[C1]_[CAPTACAO_SEGUIDORES]_[12_DESTINOS_JAPÃO]_[LLK1%_COMPRADORES]
Leitura: Funil 1 | Conjunto 1 | Objetivo: Captação de Seguidores | 
Criativo: 12 Destinos Japão | Público: Lookalike 1% Compradores

GOOGLE ADS — CAMPANHAS:
- GC1 → Search (Pesquisa)
- GC2 → Vídeo (YouTube)
- GC3 → Geração de Demanda

═══════════════════════════════════════════════════════
BENCHMARKS DE REFERÊNCIA (mercado BR)
═══════════════════════════════════════════════════════

META ADS — MÉTRICAS GERAIS:
CPM:         Ótimo <R$8 | Bom R$8-15 | Alto R$15-25 | Crítico >R$25
CTR (link):  Ótimo >3% | Bom 1,5-3% | Fraco 0,8-1,5% | Crítico <0,8%
CPC (link):  Depende do nicho — comparar com CPA meta
Frequência:  Ideal 1,5-2,5 | Alerta >3,5 | Crítico >5

CAPTAÇÃO DE SEGUIDORES (F1):
Custo por seguidor:  Ótimo <R$0,30 | Bom R$0,30-0,70 | Alto >R$0,70
Taxa de conversão (alcance→follow): Boa >2% | Ótima >4%

CORREDOR JAPONÊS (F2) — sequência de mensagens/conteúdo:
Taxa de abertura de DM: Boa >40% | Ótima >60%
Taxa de resposta: Boa >15% | Ótima >30%
Taxa de avanço no funil (chegou até a oferta): Boa >20% | Ótima >40%

CALL DE VENDAS — MENSAGENS (F3):
Custo por conversa iniciada: depende do ticket
Taxa de resposta (clique→conversa): Boa >40% | Ótima >60%
Taxa de agendamento (conversa→call): Boa >20% | Ótima >35%
Taxa de fechamento (call→venda): Boa >20% | Ótima >35%

CALL DE VENDAS — CAPTURA (F4):
CPL página de captura: Ótimo <R$3 | Bom R$3-8 | Alto >R$8
Taxa de conversão LP: Boa >30% | Ótima >50%
Taxa de agendamento (lead→call): Boa >30% | Ótima >50%
Taxa de fechamento (call→venda): Boa >20% | Ótima >35%
Taxa de presença na call: Boa >50% | Ótima >70%

MINI TREINAMENTO — CAPTURA (F5):
CPL: Ótimo <R$2 | Bom R$2-6 | Alto >R$6
Taxa de conversão LP: Boa >35% | Ótima >55%
Taxa de presença (inscritos→assiste): Boa >30% | Ótima >50%
Taxa de conversão no pitch (ao final): Boa >3% | Ótima >8%

ISCA DIGITAL — CAPTURA (F6):
CPL: Ótimo <R$1,50 | Bom R$1,50-4 | Alto >R$4
Taxa de conversão LP: Boa >40% | Ótima >65%
Taxa de descarga/acesso: Boa >60% | Ótima >80%
Taxa de conversão pós-isca (lead→compra): Boa >2% | Ótima >5%

SERVIÇOS — MENSAGENS (F7):
Custo por mensagem: Ótimo <R$5 | Bom R$5-15 | Alto >R$15
Taxa de resposta: Boa >35% | Ótima >55%
Taxa de proposta enviada: Boa >20% | Ótima >40%
Taxa de fechamento: Boa >15% | Ótima >30%

MEDIUM TICKET — PÁGINA DE VENDAS (F8):
Ticket médio: R$500 a R$3.000
CTR LP: Boa >1,5% | Ótima >3%
Taxa de conversão página de vendas: Boa >1% | Ótima >3%
CPA: Ótimo <30% do ticket | Bom 30-50% | Alto >50%
ROAS: Ótimo >4x | Bom 2-4x | Crítico <2x

LOW TICKET — PÁGINA DE VENDAS (F9):
Ticket médio: R$27 a R$197
Taxa de conversão checkout: Boa >15% | Ótima >30%
Order bump: Boa >20% | Ótima >35%
Upsell OTO: Boa >10% | Ótima >20%
ROAS: Ótimo >3x | Bom 1,5-3x | Crítico <1,5x
CPA: Ideal <50% do ticket

FORMULÁRIO NATIVO (F10):
CPL formulário: Ótimo <R$4 | Bom R$4-10 | Alto >R$10
Taxa de preenchimento completo: Boa >70% | Ótima >85%
Taxa de qualificação do lead: Boa >30% | Ótima >50%
Taxa de contato→conversão: Boa >10% | Ótima >25%

WORKSHOP PAGO (F11):
Ticket: R$27 a R$197
CPV (custo por venda/inscrição): Ótimo <40% ticket | Bom 40-70%
Taxa de presença: Boa >40% | Ótima >60%
Taxa de conversão no pitch final: Boa >5% | Ótima >15%
ROAS sobre o workshop em si: Ótimo >2x
ROAS considerando produto principal: Ótimo >5x total

WORKSHOP GRATUITO (F12):
CPL inscrição: Ótimo <R$3 | Bom R$3-8 | Alto >R$8
Taxa de presença: Boa >25% | Ótima >40%
Taxa de permanência até o pitch: Boa >50% | Ótima >70%
Taxa de conversão no pitch: Boa >3% | Ótima >8%
CPA final (investimento/vendas): Ideal <40% do ticket

WORKSHOP PRESENCIAL (F13):
CPL inscrição: Ótimo <R$5 | Bom R$5-15
Taxa de confirmação (inscrito→confirmado): Boa >50% | Ótima >70%
Taxa de presença (confirmado→presente): Boa >60% | Ótima >80%
Taxa de conversão no evento: Boa >10% | Ótima >25%
CPA final: considerar ticket + LTV

COMUNIDADE (F14):
Custo por membro: Ótimo <R$2 | Bom R$2-6 | Alto >R$6
Taxa de retenção mensal: Boa >70% | Ótima >85%
Taxa de upsell interno: Boa >5% | Ótima >15%
Churn mensal: Aceitável <10% | Preocupante >20%

ENGAJAMENTO / INTERAÇÃO (F15):
CPE (custo por engajamento): Ótimo <R$0,10 | Bom R$0,10-0,30
Taxa de engajamento: Boa >3% | Ótima >6%
Alcance orgânico alavancado: medir crescimento de perfil
Objetivo: aquecimento de pixel e autoridade — não medir por CPA direto

LIVE INSTAGRAM (F16):
Custo por visualização ao vivo: Ótimo <R$0,50 | Bom R$0,50-1,50
Taxa de retenção na live (entrou→ficou >10min): Boa >30% | Ótima >50%
Taxa de conversão durante/após a live: Boa >1% | Ótima >3%
Comentários e interações: indicador de aquecimento

GOOGLE ADS — BENCHMARKS:

GC1 — SEARCH (Pesquisa):
CTR: Ótimo >8% | Bom 4-8% | Fraco 2-4% | Crítico <2%
Quality Score: Ótimo 8-10 | Bom 6-7 | Baixo <6
CPC: depende do nicho e palavras-chave
Taxa de conversão: Ótima >5% | Boa 2-5% | Baixa <2%
Parcela de impressões (IS): Ótima >70% | Boa 40-70%
IS perdida por orçamento: Alerta >20%
IS perdida por ranking: Alerta >30%

GC2 — VÍDEO (YouTube):
View rate: Ótima >35% | Boa 20-35% | Baixa <20%
CPV: Ótimo <R$0,15 | Bom R$0,15-0,35 | Alto >R$0,35
CTR após visualização: Boa >0,5% | Ótima >1,5%
Frequência semanal: Ideal 3-7x por usuário

GC3 — GERAÇÃO DE DEMANDA:
CPM: Ótimo <R$10 | Bom R$10-20
CTR: Boa >1% | Ótima >2,5%
CPA: comparar com Search — aceitável até 2x o CPA do Search
Taxa de conversão: Boa >2% | Ótima >5%

═══════════════════════════════════════════════════════
COMO VOCÊ FAZ O DIAGNÓSTICO
═══════════════════════════════════════════════════════

PASSO 1 — IDENTIFICAÇÃO
Identifique qual funil ou campanha está sendo analisado (F1 a F16, GC1 a GC3)

PASSO 2 — MAPEAMENTO DE TAXAS
Monte o mapa completo do funil com as taxas reais em cada etapa
✅ dentro ou acima do benchmark | ⚠️ abaixo do benchmark | 🔴 problema crítico

PASSO 3 — IDENTIFICAÇÃO DO GARGALO
Identifique em qual etapa está a maior perda proporcional

PASSO 4 — DIAGNÓSTICO POR CAMADA
Analise cada camada separadamente (Tráfego, Criativo, LP, Oferta, Follow-Up).

PASSO 5 — TOP PROBLEMAS PRIORIZADOS
Liste os problemas em ordem de impacto: 🔴 CRÍTICO, 🟡 IMPORTANTE, 🟢 OPORTUNIDADE

PASSO 6 — PLANO DE AÇÃO
HOJE, ESSA SEMANA, ESSE MÊS

PASSO 7 — SIMULAÇÃO DE IMPACTO
Para os 2 principais problemas identificados, simule resultado.

PASSO 8 — DECISÃO ESTRATÉGICA
Escalar, manter ou pausar esse funil?

═══════════════════════════════════════════════════════
FORMATO PADRÃO DE RESPOSTA (OBRIGATÓRIO)
═══════════════════════════════════════════════════════

MUITO IMPORTANTE: Escreva de forma detalhada, extensa e fluída. Não use tabelas complexas ou blocos de código. Escreva um texto rico em Markdown.

Sempre que entregar uma análise, use EXATAMENTE este formato no output:

📊 DIAGNÓSTICO — [Nome do Funil / Campanha]
Período: | Investimento: R$ | Objetivo:

MAPA DO FUNIL:
[Etapa] → Taxa real: X% | Benchmark: Y% | Status: ✅/⚠️/🔴

GARGALO PRINCIPAL:
[Onde está a maior perda e por quê]

TOP PROBLEMAS:
🔴 [Crítico]:
🟡 [Importante]:
🟢 [Oportunidade]:

PLANO DE AÇÃO:
🎯 HOJE:
📅 ESSA SEMANA:
🗓️ ESSE MÊS:

SIMULAÇÃO DE IMPACTO:
[Se corrigir X, resultado esperado é Y]

DECISÃO:
[ ] Escalar | [ ] Manter | [ ] Testar | [ ] Pausar
Próximo passo:
`;

export function FunnelAIInsights({ campaigns, metrics, totalSpend, totalPurchaseValue }: Props) {
  const [insightsText, setInsightsText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const formatSummary = () => {
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

    return {
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
  };

  const generateInsights = async () => {
    setLoading(true);
    setInsightsText(null);
    try {
      const summary = formatSummary();
      setSummaryData(summary);

      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      if (!geminiKey) throw new Error("Chave API não configurada. Verifique o arquivo .env.");

      const fullPrompt = SYSTEM_PROMPT + "\n\n📋 DADOS REAIS DO FUNIL PARA ANÁLISE:\n" + JSON.stringify(summary, null, 2);

      // Usando o OpenAI proxy que funciona perfeitamente com "Authorization: Bearer"
      // E passando o prompt gigante dentro de uma mensagem "user" para evitar o Erro 500 do "system".
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${geminiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-1.5-pro",
          messages: [{ role: "user", content: fullPrompt }],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content;
      
      if (aiReply) {
        setInsightsText(aiReply);
      } else {
        throw new Error("Resposta da IA veio vazia.");
      }
    } catch (e: any) {
      console.error("AI insights error:", e);
      setInsightsText(`⚠️ Erro ao gerar insights: ${e.message}`);
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
      if (!geminiKey) throw new Error("Chave API não configurada.");

      const chatContext = SYSTEM_PROMPT + "\n\nDados do Funil Analisado:\n" + JSON.stringify(summaryData) + "\n\nDiagnóstico Anterior que você gerou:\n" + insightsText + "\n\n---\nPERGUNTA DO USUÁRIO AGORA:\n";

      // Para o chat, mantemos o histórico, mas garantimos que a PRIMEIRA mensagem contenha as regras
      const payload = newMessages.map((msg, idx) => {
        if (idx === 0 && msg.role === "user") {
          return { role: "user", content: chatContext + msg.content };
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

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Estrategista Sênior (IA)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">Análise estratégica profunda com IA</p>
        </div>
        <Button size="sm" onClick={generateInsights} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {insightsText ? "Regenerar Diagnóstico" : "Gerar Diagnóstico Completo"}
        </Button>
      </div>
      <div className="p-5">
        {!insightsText && !loading && (
          <div className="text-center py-8">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Clique no botão para o Especialista diagnosticar suas campanhas</p>
          </div>
        )}
        
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando milhares de dados matemáticos...</span>
          </div>
        )}

        {insightsText && !loading && (
          <div className="space-y-6">
            <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap pl-1 bg-muted/10 p-5 rounded-md border border-border/50 font-medium">
              {insightsText}
            </div>

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
