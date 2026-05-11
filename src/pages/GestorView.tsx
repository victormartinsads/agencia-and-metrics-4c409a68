import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain, Loader2, Send, Sparkles, TrendingUp, TrendingDown, Activity,
  AlertTriangle, ChevronRight, Zap, Layers, Image as ImageIcon, MessageSquare,
} from "lucide-react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { MetricsColumnPicker, ALL_METRIC_COLUMNS, formatMetricValue } from "@/components/gestor/MetricsColumnPicker";
import { CampaignDrillDown } from "@/components/gestor/CampaignDrillDown";
import { AlertsPanel } from "@/components/gestor/AlertsPanel";
import { SuggestionsList } from "@/components/gestor/SuggestionsList";
import { CampaignDraftDialog } from "@/components/gestor/CampaignDraftDialog";
import AppShell from "@/components/layout/AppShell";

type Msg = { role: "user" | "assistant"; content: string };

const periods = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
];

const DEFAULT_COLUMNS = ["status", "spend", "ctr", "costPerConversion", "conversions", "frequency"];
const AI_MODELS = [
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (preciso)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
];

type TabKey = "campanhas" | "conjuntos" | "anuncios";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "campanhas", label: "Campanhas", icon: Zap },
  { key: "conjuntos", label: "Conjuntos", icon: Layers },
  { key: "anuncios",  label: "Anúncios",  icon: ImageIcon },
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
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [drill, setDrill] = useState<{ id: string; name: string } | null>(null);
  const [aiModel, setAiModel] = useState(AI_MODELS[0].value);
  const [tab, setTab] = useState<TabKey>("campanhas");
  const [chatOpen, setChatOpen] = useState(false);

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!role?.isAdmin) return <Navigate to="/" replace />;

  const currentClient = clients?.find((c) => c.id === clientId);
  const overview = meta?.overviewMetrics;
  const campaigns = meta?.campaigns || [];
  const currencySymbol = currentClient?.currency_symbol || "R$";
  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 30), [campaigns]);

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
        body: JSON.stringify({ messages: newMsgs, context: buildContext(), model: aiModel }),
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

  const header = (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-elevated)]">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">
            Gerenciador <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">TráfegoIA</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">Cockpit Meta Ads · IA estratégica embutida</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
          <SelectContent>
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c.id} className="uppercase">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setChatOpen(true)}
          className="h-9 gap-2 bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-90 shadow-[var(--shadow-elevated)]"
        >
          <Sparkles className="h-4 w-4" />
          Agente IA
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell currentPage="manager" header={header} noContainer>
      <main className="max-w-[1500px] mx-auto px-4 md:px-6 py-5 space-y-5">
        {!clientId && (
          <Card className="p-12 text-center text-muted-foreground text-sm rounded-2xl">
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
            <AlertsPanel clientId={clientId} campaigns={campaigns} currencySymbol={currencySymbol} />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiTile label="Gasto" value={`${currencySymbol} ${overview.totalSpend.toFixed(2)}`} />
              <KpiTile label="Cliques" value={overview.totalClicks.toLocaleString("pt-BR")} />
              <KpiTile label="CTR" value={overview.avgCTR.toFixed(2) + "%"} accent={overview.avgCTR >= 1.5 ? "good" : overview.avgCTR < 1 ? "bad" : "warn"} />
              <KpiTile label="Conversões" value={overview.totalConversions.toString()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SuggestionsList clientId={clientId} period={period} />
              </div>
              {insights && (
                <Card className="p-4 rounded-2xl border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Sinais rápidos</h2>
                  </div>
                  <div className="space-y-3">
                    <SignalGroup
                      title="Fadiga (freq > 3)"
                      icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
                      items={insights.fadiga.slice(0, 3).map((c) => `${c.name} — ${c.frequency.toFixed(2)}x`)}
                    />
                    <SignalGroup
                      title="Top ROAS"
                      icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
                      items={insights.topRoas.map((c) => `${c.name} — ${c.roas.toFixed(2)}x`)}
                    />
                    <SignalGroup
                      title="CPA mais altos"
                      icon={<TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                      items={insights.highCpa.map((c) => `${c.name} — ${currencySymbol} ${c.costPerConversion.toFixed(2)}`)}
                    />
                  </div>
                </Card>
              )}
            </div>

            {/* Tabs estilo Meta */}
            <Card className="rounded-2xl overflow-hidden border-border/60 shadow-[var(--shadow-card)]">
              <div className="border-b border-border bg-muted/30 px-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition ${
                          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                        {active && (
                          <motion.div
                            layoutId="tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[image:var(--gradient-hero)]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 py-2">
                  <CampaignDraftDialog clientId={clientId} adAccountIds={currentClient?.ad_account_ids || []} />
                  <MetricsColumnPicker selected={columns} onChange={setColumns} />
                </div>
              </div>

              {tab === "campanhas" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground bg-muted/20">
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-4 font-medium">Campanha</th>
                        {columns.map((k) => {
                          const col = ALL_METRIC_COLUMNS.find((c) => c.key === k);
                          return <th key={k} className="text-right py-2.5 px-3 font-medium whitespace-nowrap">{col?.label || k}</th>;
                        })}
                        <th className="text-right py-2.5 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition"
                          onClick={() => setDrill({ id: c.id, name: c.name })}
                        >
                          <td className="py-2.5 px-4 truncate max-w-[320px]" title={c.name}>{c.name}</td>
                          {columns.map((k) => {
                            const col = ALL_METRIC_COLUMNS.find((x) => x.key === k);
                            const raw = (c as any)[k];
                            if (k === "status") {
                              return <td key={k} className="text-right py-2.5 px-3"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[9px]">{c.status}</Badge></td>;
                            }
                            const warn =
                              (k === "frequency" && Number(raw) > 3) ||
                              (k === "ctr" && Number(raw) < 1 && c.spend > 50);
                            return (
                              <td key={k} className={`text-right py-2.5 px-3 tabular-nums whitespace-nowrap ${warn ? "text-yellow-400" : ""}`}>
                                {formatMetricValue(raw, col?.format, currencySymbol)}
                              </td>
                            );
                          })}
                          <td className="text-right py-2.5 px-3"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab !== "campanhas" && (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Clique em uma campanha na aba <span className="text-foreground font-medium">Campanhas</span> para ver
                  {tab === "conjuntos" ? " conjuntos de anúncios" : " anúncios"} no detalhe.
                </div>
              )}
            </Card>
          </>
        )}
      </main>

      {/* Floating chat button (mobile/extra) */}
      {!chatOpen && clientId && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elevated)] flex items-center justify-center hover:scale-105 transition"
          aria-label="Abrir agente IA"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Drawer */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <div className="p-4 border-b border-border bg-[image:var(--gradient-hero)]/10">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-sm font-bold">Agente de Tráfego Pago</h3>
                <p className="text-[10px] text-muted-foreground">{currentClient?.name?.toUpperCase() || "Selecione um cliente"} · {period}</p>
              </div>
            </div>
            <div className="mt-3">
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
                    className="w-full text-left text-xs p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/40 transition disabled:opacity-50"
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
                    <div className={`p-3 rounded-xl ${m.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-accent/30 border border-border"}`}>
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
            <Button size="sm" onClick={() => send()} disabled={!clientId || sending || !input.trim()} className="bg-[image:var(--gradient-hero)] text-primary-foreground hover:opacity-90">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {drill && clientId && (
        <CampaignDrillDown
          open={!!drill}
          onOpenChange={(v) => { if (!v) setDrill(null); }}
          clientId={clientId}
          campaignId={drill.id}
          campaignName={drill.name}
          datePreset={period}
          currencySymbol={currencySymbol}
        />
      )}
    </AppShell>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: "good" | "bad" | "warn" }) {
  const color = accent === "good" ? "text-primary" : accent === "bad" ? "text-red-400" : accent === "warn" ? "text-yellow-400" : "text-foreground";
  return (
    <Card className="p-4 rounded-2xl border-border/60 hover:border-primary/30 transition shadow-[var(--shadow-card)]">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
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