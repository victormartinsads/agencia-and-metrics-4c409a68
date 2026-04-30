import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Campaign } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  clientId: string;
  clientName: string;
  campaigns: Campaign[];
  datePreset: string;
  currencySymbol: string;
}

interface FunnelStat {
  code: string;
  label: string;
  campaigns: number;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  ctr: number;
  cpa: number;
  impressions: number;
}

function buildContext(campaigns: Campaign[]): {
  funnels: FunnelStat[];
  topCampaigns: Array<{ name: string; spend: number; conversions: number; roas: number; ctr: number }>;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
} {
  const funnelMap = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    const code = extractFunnelCode(c.name);
    if (!code) continue;
    const arr = funnelMap.get(code) || [];
    arr.push(c);
    funnelMap.set(code, arr);
  }
  const funnels: FunnelStat[] = Array.from(funnelMap.entries()).map(([code, cs]) => {
    const spend = cs.reduce((s, c) => s + (c.spend || 0), 0);
    const revenue = cs.reduce((s, c) => s + ((c as any).purchaseValue || 0), 0);
    const conversions = cs.reduce((s, c) => s + (c.conversions || 0), 0);
    const impressions = cs.reduce((s, c) => s + (c.impressions || 0), 0);
    const clicks = cs.reduce((s, c) => s + (c.clicks || 0), 0);
    return {
      code,
      label: FUNNEL_DEFINITIONS.find((f) => f.code === code)?.label || code,
      campaigns: cs.length,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      conversions,
      impressions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
    };
  });
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      spend: c.spend,
      conversions: c.conversions,
      roas: c.roas,
      ctr: c.ctr,
    }));
  return {
    funnels,
    topCampaigns,
    totalSpend: campaigns.reduce((s, c) => s + (c.spend || 0), 0),
    totalRevenue: campaigns.reduce((s, c) => s + ((c as any).purchaseValue || 0), 0),
    totalConversions: campaigns.reduce((s, c) => s + (c.conversions || 0), 0),
  };
}

function fmt(v: number, currency: string, kind: "money" | "num" | "pct" | "x" = "num") {
  if (!Number.isFinite(v)) v = 0;
  if (kind === "money") return `${currency} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (kind === "pct") return `${v.toFixed(2)}%`;
  if (kind === "x") return `${v.toFixed(2)}x`;
  return v.toLocaleString("pt-BR");
}

/**
 * Motor local de respostas — sem chamar IA, sem gastar tokens.
 * Detecta intenção por palavras-chave e responde com base nos dados reais.
 */
function answerLocally(question: string, ctx: ReturnType<typeof buildContext>, currency: string): string {
  const q = question.toLowerCase();
  const { funnels, topCampaigns, totalSpend, totalRevenue, totalConversions } = ctx;

  if (funnels.length === 0 && topCampaigns.length === 0) {
    return "Não há dados de campanhas para o período selecionado. Tente outro intervalo.";
  }

  const sortedByRoas = [...funnels].filter((f) => f.revenue > 0).sort((a, b) => b.roas - a.roas);
  const sortedBySpend = [...funnels].sort((a, b) => b.spend - a.spend);
  const sortedByCpa = [...funnels].filter((f) => f.cpa > 0).sort((a, b) => a.cpa - b.cpa);
  const lowCtr = topCampaigns.filter((c) => c.ctr > 0 && c.ctr < 1);
  const negativeRoas = funnels.filter((f) => f.spend > 0 && f.roas < 1 && f.revenue > 0);
  const noResult = funnels.filter((f) => f.spend > 50 && f.conversions === 0 && f.revenue === 0);

  // ===== Intents =====
  if (/(melhor|top|campe|destaque|bom|ótim)/.test(q) && /(funil|funis|performan|roas)/.test(q)) {
    if (sortedByRoas.length === 0) return "Ainda não há funis com receita atribuída no período.";
    const lines = sortedByRoas.slice(0, 5).map((f, i) => `${i + 1}. **${f.code}** ${f.label.replace(/^F\d+\s*-\s*/, "")} — ROAS ${fmt(f.roas, currency, "x")}, receita ${fmt(f.revenue, currency, "money")}, CPA ${fmt(f.cpa, currency, "money")}`);
    return `**Funis com melhor performance:**\n\n${lines.join("\n")}`;
  }

  if (/(corta|pausa|ruim|matar|desligar|pior)/.test(q)) {
    const out: string[] = [];
    if (negativeRoas.length) {
      out.push("**ROAS negativo (prejuízo):**");
      negativeRoas.forEach((f) => out.push(`- ${f.code} — ROAS ${fmt(f.roas, currency, "x")}, gastou ${fmt(f.spend, currency, "money")}`));
    }
    if (noResult.length) {
      out.push("\n**Sem conversão apesar do gasto > " + currency + " 50:**");
      noResult.forEach((f) => out.push(`- ${f.code} — ${fmt(f.spend, currency, "money")} sem retorno`));
    }
    if (lowCtr.length) {
      out.push("\n**CTR baixo (< 1%) — criativo cansado:**");
      lowCtr.slice(0, 3).forEach((c) => out.push(`- ${c.name.slice(0, 50)} — CTR ${fmt(c.ctr, currency, "pct")}`));
    }
    if (!out.length) return "Nenhum funil com sinais críticos de corte. Tudo dentro dos parâmetros aceitáveis.";
    return out.join("\n");
  }

  if (/(escala|aumentar|investir mais|subir)/.test(q)) {
    const winners = sortedByRoas.filter((f) => f.roas >= 2).slice(0, 3);
    if (!winners.length) return "Nenhum funil com ROAS ≥ 2x identificado para escala segura no momento.";
    const lines = winners.map((f) => `- **${f.code}**: ROAS ${fmt(f.roas, currency, "x")}, gasto atual ${fmt(f.spend, currency, "money")} → testar +20-30% de orçamento`);
    return `**Funis aptos para escala (ROAS ≥ 2x):**\n\n${lines.join("\n")}`;
  }

  if (/(criativ|ctr baixo|frequência|saturad)/.test(q)) {
    if (!lowCtr.length) return "Nenhuma campanha com CTR < 1% no período. Criativos estão performando bem.";
    return `**Campanhas precisando de novos criativos (CTR < 1%):**\n\n${lowCtr.slice(0, 5).map((c) => `- ${c.name.slice(0, 60)} — CTR ${fmt(c.ctr, currency, "pct")}, gasto ${fmt(c.spend, currency, "money")}`).join("\n")}`;
  }

  if (/(roas|retorno|lucro)/.test(q) && /(geral|total|conta)/.test(q)) {
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    return `**Resumo geral da conta:**\n\n- Investido: ${fmt(totalSpend, currency, "money")}\n- Receita: ${fmt(totalRevenue, currency, "money")}\n- ROAS: ${fmt(roas, currency, "x")}\n- Conversões: ${fmt(totalConversions, currency, "num")}\n- CPA médio: ${fmt(cpa, currency, "money")}`;
  }

  if (/(cpa|custo por)/.test(q)) {
    if (!sortedByCpa.length) return "Não há funis com conversões registradas no período.";
    return `**Melhor CPA por funil:**\n\n${sortedByCpa.slice(0, 5).map((f, i) => `${i + 1}. **${f.code}** — CPA ${fmt(f.cpa, currency, "money")} (${fmt(f.conversions, currency, "num")} conv.)`).join("\n")}`;
  }

  if (/(gasto|investi|spend|orçamento)/.test(q)) {
    return `**Distribuição de investimento por funil:**\n\n${sortedBySpend.slice(0, 6).map((f) => `- **${f.code}** — ${fmt(f.spend, currency, "money")} (${((f.spend / Math.max(totalSpend, 1)) * 100).toFixed(1)}% do total)`).join("\n")}\n\nTotal: ${fmt(totalSpend, currency, "money")}`;
  }

  if (/(resumo|panorama|overview|geral)/.test(q)) {
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    return `**Panorama da conta:**\n\n- ${funnels.length} funis ativos, ${topCampaigns.length} campanhas no top de gasto\n- Investido: ${fmt(totalSpend, currency, "money")}\n- Receita: ${fmt(totalRevenue, currency, "money")} (ROAS ${fmt(roas, currency, "x")})\n- Conversões: ${fmt(totalConversions, currency, "num")}\n- Melhor funil: ${sortedByRoas[0]?.code || "—"}\n- Maior gasto: ${sortedBySpend[0]?.code || "—"}`;
  }

  if (/(ação|acao|recomenda|sugestão|sugestao|fazer|próximo|proximo)/.test(q)) {
    const recs: string[] = [];
    if (sortedByRoas[0]) recs.push(`✅ Escalar **${sortedByRoas[0].code}** (ROAS ${fmt(sortedByRoas[0].roas, currency, "x")})`);
    if (negativeRoas[0]) recs.push(`⛔ Pausar **${negativeRoas[0].code}** (ROAS ${fmt(negativeRoas[0].roas, currency, "x")})`);
    if (lowCtr[0]) recs.push(`🎨 Renovar criativos: ${lowCtr[0].name.slice(0, 40)} (CTR ${fmt(lowCtr[0].ctr, currency, "pct")})`);
    if (noResult[0]) recs.push(`⚠️ Investigar **${noResult[0].code}** — gastou sem retorno`);
    if (!recs.length) return "Sem ações críticas no momento. Continue monitorando.";
    return `**Próximas ações sugeridas:**\n\n${recs.join("\n")}`;
  }

  // Fallback: lista funis
  return `Não entendi exatamente. Tente perguntar sobre:\n- "melhores funis" / "pior performance"\n- "onde cortar" / "o que escalar"\n- "ROAS geral" / "CPA por funil"\n- "criativos com CTR baixo"\n- "próximas ações"\n\n**Você tem ${funnels.length} funis ativos** com investimento total de ${fmt(totalSpend, currency, "money")}.`;
}

const SUGGESTIONS = [
  "Quais funis estão com melhor performance?",
  "Onde devo cortar investimento?",
  "Próximas ações recomendadas",
  "Quais campanhas precisam de novos criativos?",
  "Resumo geral da conta",
  "Qual o melhor CPA por funil?",
];

export function FunnelChatWidget({
  clientId,
  clientName,
  campaigns,
  datePreset,
  currencySymbol,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctx = useMemo(() => buildContext(campaigns), [campaigns]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const reply: Msg = { role: "assistant", content: answerLocally(text, ctx, currencySymbol) };
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Abrir chat de IA"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-7rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">Assistente de Funis</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {clientName} · {campaigns.length} campanhas
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center px-4 py-2">
                    Pergunte qualquer coisa sobre as campanhas, funis e performance da conta.
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left text-xs p-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40"
                      >
                        💡 {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t border-border">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Pergunte algo sobre as campanhas…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !loading) send(input.trim());
                    }
                  }}
                  rows={1}
                  className="text-sm resize-none min-h-[40px] max-h-24"
                />
                <Button
                  size="icon"
                  onClick={() => input.trim() && send(input.trim())}
                  disabled={loading || !input.trim()}
                  className="h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}