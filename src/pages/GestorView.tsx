import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, Loader2, Send, Sparkles, TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { useMetaAds } from "@/hooks/useMetaAds";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const periods = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
];

export default function GestorView() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState<string | undefined>();
  const [period, setPeriod] = useState("last_7d");
  const { data: meta, isLoading } = useMetaAds(clientId, period);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!role?.isAdmin) return <Navigate to="/" replace />;

  const currentClient = clients?.find((c) => c.id === clientId);
  const overview = meta?.overviewMetrics;
  const campaigns = meta?.campaigns || [];

  const insights = useMemo(() => {
    if (!campaigns.length) return null;
    const fadiga = campaigns.filter((c) => c.frequency > 3 && c.spend > 0);
    const lowCtr = campaigns.filter((c) => c.ctr < 1 && c.spend > 50);
    const highCpa = campaigns
      .filter((c) => c.conversions > 0 && c.costPerConversion > 0)
      .sort((a, b) => b.costPerConversion - a.costPerConversion)
      .slice(0, 3);
    const topRoas = campaigns
      .filter((c) => c.roas > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 3);
    return { fadiga, lowCtr, highCpa, topRoas };
  }, [campaigns]);

  const buildContext = () => {
    if (!overview || !currentClient) return null;
    return {
      cliente: currentClient.name,
      periodo: period,
      moeda: currentClient.currency_symbol,
      visaoGeral: {
        gasto: overview.totalSpend,
        impressoes: overview.totalImpressions,
        cliques: overview.totalClicks,
        conversoes: overview.totalConversions,
        ctr: overview.avgCTR,
        cpc: overview.avgCPC,
        roas: overview.avgROAS,
        compras: overview.totalPurchases,
        leads: overview.totalLeadActions,
      },
      campanhas: campaigns.slice(0, 20).map((c) => ({
        nome: c.name,
        status: c.status,
        objetivo: c.objective,
        gasto: c.spend,
        ctr: c.ctr,
        cpc: c.cpc,
        cpa: c.costPerConversion,
        roas: c.roas,
        frequencia: c.frequency,
        conversoes: c.conversions,
        compras: c.purchases,
      })),
    };
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    if (!clientId) {
      toast.error("Selecione um cliente primeiro");
      return;
    }
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setSending(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paid-media-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMsgs, context: buildContext() }),
      });

      if (resp.status === 429) { toast.error("Muitas requisições. Aguarde."); setSending(false); return; }
      if (resp.status === 402) { toast.error("Créditos de IA esgotados."); setSending(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Falha no chat");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const p = JSON.parse(json);
            const delta = p.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m)));
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao consultar IA");
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    "Faça um diagnóstico geral da conta e me diga onde estamos perdendo dinheiro.",
    "Quais campanhas devo pausar ou escalar agora? Justifique com os números.",
    "Sugira testes de criativo e segmentação para as campanhas com pior performance.",
    "Como está a saúde do funil? O que otimizar em topo, meio e fundo?",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></Link>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Visão do Gestor</h1>
                <p className="text-[11px] text-muted-foreground">Painel estratégico + IA de tráfego pago</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-[240px] h-9"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="uppercase">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6">
        <section className="space-y-5 min-w-0">
          {!clientId && (
            <Card className="p-12 text-center text-muted-foreground text-sm">
              Selecione um cliente acima para começar.
            </Card>
          )}

          {clientId && isLoading && (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando dados...</span>
            </div>
          )}

          {clientId && !isLoading && overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile label="Gasto" value={`${currentClient?.currency_symbol || "R$"} ${overview.totalSpend.toFixed(2)}`} />
                <KpiTile label="ROAS" value={overview.avgROAS.toFixed(2) + "x"} accent={overview.avgROAS >= 2 ? "good" : overview.avgROAS < 1 ? "bad" : "warn"} />
                <KpiTile label="CTR" value={overview.avgCTR.toFixed(2) + "%"} accent={overview.avgCTR >= 1.5 ? "good" : overview.avgCTR < 1 ? "bad" : "warn"} />
                <KpiTile label="Conversões" value={overview.totalConversions.toString()} />
              </div>

              {insights && (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Sinais rápidos</h2>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{campaigns.length} campanhas</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SignalGroup
                      title="Fadiga (freq > 3)"
                      icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
                      items={insights.fadiga.slice(0, 5).map((c) => `${c.name} — ${c.frequency.toFixed(2)}x`)}
                    />
                    <SignalGroup
                      title="CTR baixo (< 1%)"
                      icon={<TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                      items={insights.lowCtr.slice(0, 5).map((c) => `${c.name} — ${c.ctr.toFixed(2)}%`)}
                    />
                    <SignalGroup
                      title="CPA mais altos"
                      icon={<TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                      items={insights.highCpa.map((c) => `${c.name} — ${currentClient?.currency_symbol || "R$"} ${c.costPerConversion.toFixed(2)}`)}
                    />
                    <SignalGroup
                      title="Top ROAS"
                      icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
                      items={insights.topRoas.map((c) => `${c.name} — ${c.roas.toFixed(2)}x`)}
                    />
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <h2 className="text-sm font-semibold mb-3">Campanhas (top 20 por gasto)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Campanha</th>
                        <th className="text-right py-2 font-medium">Status</th>
                        <th className="text-right py-2 font-medium">Gasto</th>
                        <th className="text-right py-2 font-medium">CTR</th>
                        <th className="text-right py-2 font-medium">CPA</th>
                        <th className="text-right py-2 font-medium">ROAS</th>
                        <th className="text-right py-2 font-medium">Freq</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 20).map((c) => (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="py-2 pr-2 truncate max-w-[280px]" title={c.name}>{c.name}</td>
                          <td className="text-right py-2"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[9px]">{c.status}</Badge></td>
                          <td className="text-right py-2 tabular-nums">{c.spend.toFixed(0)}</td>
                          <td className="text-right py-2 tabular-nums">{c.ctr.toFixed(2)}%</td>
                          <td className="text-right py-2 tabular-nums">{c.costPerConversion ? c.costPerConversion.toFixed(2) : "—"}</td>
                          <td className={`text-right py-2 tabular-nums ${c.roas >= 2 ? "text-primary" : c.roas > 0 && c.roas < 1 ? "text-red-400" : ""}`}>{c.roas ? c.roas.toFixed(2) + "x" : "—"}</td>
                          <td className={`text-right py-2 tabular-nums ${c.frequency > 3 ? "text-yellow-400" : ""}`}>{c.frequency.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Agente de Tráfego Pago</h3>
                <p className="text-[10px] text-muted-foreground">Análises e otimizações com IA</p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Comece com uma sugestão:</p>
                  {quickPrompts.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      disabled={!clientId || sending}
                      className="w-full text-left text-xs p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs ${m.role === "user" ? "ml-6" : "mr-2"}`}
                    >
                      <div className={`text-[10px] uppercase tracking-wider mb-1 ${m.role === "user" ? "text-right text-muted-foreground" : "text-primary"}`}>
                        {m.role === "user" ? "Você" : "Agente IA"}
                      </div>
                      <div className={`p-3 rounded-lg ${m.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-accent/30 border border-border"}`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-xs prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{m.content || "..."}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> pensando...
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={clientId ? "Pergunte sobre as campanhas..." : "Selecione um cliente primeiro"}
                disabled={!clientId || sending}
                className="text-xs h-9"
              />
              <Button size="sm" onClick={() => send()} disabled={!clientId || sending || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: "good" | "bad" | "warn" }) {
  const color = accent === "good" ? "text-primary" : accent === "bad" ? "text-red-400" : accent === "warn" ? "text-yellow-400" : "text-foreground";
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </Card>
  );
}

function SignalGroup({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}{title}
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/60 italic">Nada por aqui</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => <li key={i} className="text-[11px] text-card-foreground truncate">• {it}</li>)}
        </ul>
      )}
    </div>
  );
}