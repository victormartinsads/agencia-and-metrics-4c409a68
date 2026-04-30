import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Campaign } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  clientId: string;
  clientName: string;
  campaigns: Campaign[];
  datePreset: string;
  currencySymbol: string;
}

function buildContext(campaigns: Campaign[]) {
  const funnelMap = new Map<string, Campaign[]>();
  for (const c of campaigns) {
    const code = extractFunnelCode(c.name);
    if (!code) continue;
    const arr = funnelMap.get(code) || [];
    arr.push(c);
    funnelMap.set(code, arr);
  }
  const funnels = Array.from(funnelMap.entries()).map(([code, cs]) => {
    const spend = cs.reduce((s, c) => s + (c.spend || 0), 0);
    const revenue = cs.reduce((s, c) => s + ((c as any).purchaseValue || 0), 0);
    const conversions = cs.reduce((s, c) => s + (c.conversions || 0), 0);
    return {
      code,
      label: FUNNEL_DEFINITIONS.find((f) => f.code === code)?.label || code,
      campaigns: cs.length,
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      conversions,
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
  return { funnels, topCampaigns };
}

const SUGGESTIONS = [
  "Quais funis estão com melhor performance?",
  "Onde devo cortar investimento?",
  "Sugira ações para melhorar o ROAS geral",
  "Qual campanha precisa de novos criativos?",
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
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const ctx = buildContext(campaigns);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/funnel-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next,
          context: {
            clientName,
            datePreset,
            currencySymbol,
            ...ctx,
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "Limite de IA", description: "Aguarde alguns segundos e tente novamente.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Créditos esgotados", description: "Adicione créditos no workspace.", variant: "destructive" });
        } else {
          toast({ title: "Erro", description: err.error || "Falha no chat.", variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let assistantPushed = false;
      let streamDone = false;

      const push = (chunk: string) => {
        assistantSoFar += chunk;
        if (!assistantPushed) {
          assistantPushed = true;
          setMessages((prev) => [...prev, { role: "assistant", content: assistantSoFar }]);
        } else {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            ),
          );
        }
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) push(c);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro de conexão", description: "Não foi possível falar com a IA.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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