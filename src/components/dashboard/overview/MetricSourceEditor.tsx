import { useEffect, useState } from "react";
import { Sparkles, Send, Loader2, Settings, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CONFIGURABLE_METRICS,
  META_FIELDS,
  MetricSourcesMap,
  useMetricSources,
  useUpsertMetricSources,
} from "@/hooks/useMetricSources";
import { useDashboardSheet } from "@/hooks/useDashboardSheet";
import { useClients, useUpdateClient } from "@/hooks/useClients";

const DEFAULT_LEAD_ACTIONS = [
  "lead",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.messaging_conversation_started_7d",
];

const LEAD_ACTION_OPTIONS: { key: string; label: string }[] = [
  { key: "lead", label: "Lead (genérico)" },
  { key: "onsite_conversion.lead_grouped", label: "Lead Forms (Meta)" },
  { key: "onsite_conversion.messaging_conversation_started_7d", label: "Conversa por mensagem iniciada" },
  { key: "complete_registration", label: "Cadastro completo" },
  { key: "submit_application", label: "Inscrição enviada" },
  { key: "schedule", label: "Agendamento" },
  { key: "contact", label: "Contato" },
  { key: "subscribe", label: "Inscrição" },
  { key: "initiate_checkout", label: "Iniciou checkout" },
];

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pré-seleciona uma métrica ao abrir (opcional). */
  focusMetric?: string;
  /** Totais por field do Meta (mesmo objeto usado pelo dashboard). */
  metaTotals?: Record<string, number>;
  /** Contagem por action_type bruto (lead, complete_registration, etc). */
  actionBreakdown?: Record<string, number>;
}

export function MetricSourceEditor({ clientId, open, onOpenChange, focusMetric, metaTotals, actionBreakdown }: Props) {
  const { toast } = useToast();
  const { data: sources } = useMetricSources(clientId);
  const { data: sheetCfg } = useDashboardSheet(clientId);
  const { data: clients } = useClients();
  const updateClient = useUpdateClient();
  const client = clients?.find((c) => c.id === clientId);
  const upsert = useUpsertMetricSources();

  const [draft, setDraft] = useState<MetricSourcesMap>({});
  const [leadActions, setLeadActions] = useState<string[]>(DEFAULT_LEAD_ACTIONS);
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  useEffect(() => {
    if (open) setDraft(sources || {});
  }, [open, sources]);

  useEffect(() => {
    if (open && client) {
      setLeadActions(client.lead_action_types && client.lead_action_types.length > 0
        ? client.lead_action_types
        : DEFAULT_LEAD_ACTIONS);
    }
  }, [open, client?.id]);

  const sheetColumns = Object.values(sheetCfg?.field_mapping || {}).filter(Boolean);

  const setMetric = (key: string, patch: Partial<MetricSourcesMap[string]>) => {
    setDraft((d) => ({ ...d, [key]: { source: "sheets", ...d[key], ...patch } as any }));
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ clientId, sources: draft });
      // Persist lead action types if it differs from current client value
      const current = client?.lead_action_types || DEFAULT_LEAD_ACTIONS;
      const sameSet = current.length === leadActions.length && current.every((c) => leadActions.includes(c));
      if (!sameSet) {
        await updateClient.mutateAsync({ id: clientId, lead_action_types: leadActions } as any);
      }
      toast({ title: "Fontes salvas" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleAiSend = async () => {
    if (!aiMsg.trim()) return;
    const userMsg = aiMsg.trim();
    setAiMsg("");
    setAiHistory((h) => [...h, { role: "user", text: userMsg }]);
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("metric-source-ai", {
        body: {
          message: userMsg,
          currentSources: draft,
          availableMetrics: CONFIGURABLE_METRICS.map((m) => m.key),
          sheetColumns,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.sources) {
        setDraft(data.sources);
        setAiHistory((h) => [...h, { role: "ai", text: data.explanation || "Configuração atualizada." }]);
      }
    } catch (e: any) {
      setAiHistory((h) => [...h, { role: "ai", text: `Erro: ${e.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const groups = Array.from(new Set(CONFIGURABLE_METRICS.map((m) => m.group)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Fontes de dados das métricas
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="manual">Editor</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Chat IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-4 pr-2">
            {groups.map((g) => (
              <div key={g} className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide">{g}</p>
                {CONFIGURABLE_METRICS.filter((m) => m.group === g).map((m) => {
                  const cfg = draft[m.key] || { source: "sheets" as const };
                  const highlight = focusMetric === m.key ? "border-primary" : "border-border";
                  return (
                    <div key={m.key} className={`rounded-lg border ${highlight} p-3 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">{m.label}</Label>
                        <Select
                          value={cfg.source}
                          onValueChange={(v) => setMetric(m.key, { source: v as any, field: undefined, value: undefined })}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sheets">Planilha</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="meta">Meta Ads</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {cfg.source === "sheets" && (
                        <Select value={cfg.field || ""} onValueChange={(v) => setMetric(m.key, { field: v })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione a coluna da planilha" />
                          </SelectTrigger>
                          <SelectContent>
                            {sheetColumns.length === 0 && (
                              <SelectItem value="__none" disabled>Nenhuma coluna mapeada</SelectItem>
                            )}
                            {sheetColumns.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {cfg.source === "manual" && (
                        <Input
                          type="number"
                          value={cfg.value ?? ""}
                          placeholder="Valor fixo"
                          onChange={(e) => setMetric(m.key, { value: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      )}

                      {cfg.source === "meta" && (
                        <>
                          <Select value={cfg.field || ""} onValueChange={(v) => setMetric(m.key, { field: v })}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione campo do Meta" />
                            </SelectTrigger>
                            <SelectContent>
                              {META_FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                  {metaTotals && metaTotals[f.key] !== undefined && (
                                    <span className="ml-2 text-[10px] text-muted-foreground">
                                      ({Number(metaTotals[f.key] || 0).toLocaleString("pt-BR")})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {cfg.field && metaTotals && (
                            <p className="text-[10px] text-muted-foreground">
                              Valor atual no período: <strong className="text-foreground">{Number(metaTotals[cfg.field] || 0).toLocaleString("pt-BR")}</strong>
                            </p>
                          )}

                          {cfg.field === "lead_actions" && (
                            <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                <Tag className="h-3 w-3" /> Ações que contam como Lead
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                {LEAD_ACTION_OPTIONS.map((opt) => {
                                  const checked = leadActions.includes(opt.key);
                                  const count = actionBreakdown?.[opt.key];
                                  return (
                                    <label
                                      key={opt.key}
                                      className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(v) => {
                                          if (v) setLeadActions((arr) => Array.from(new Set([...arr, opt.key])));
                                          else setLeadActions((arr) => arr.filter((k) => k !== opt.key));
                                        }}
                                      />
                                      <span className="flex-1">{opt.label}</span>
                                      {count !== undefined && (
                                        <span className={`text-[10px] tabular-nums ${count > 0 ? "text-primary font-semibold" : "text-muted-foreground/60"}`}>
                                          {Number(count).toLocaleString("pt-BR")}
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Os números mostram quantos eventos cada ação registrou no período. Marque apenas as que fazem sentido como "Lead" para esse cliente.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="ai" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-muted/20 rounded-md min-h-[200px]">
              {aiHistory.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Diga em linguagem natural o que quer mudar. Ex:<br />
                  <em>"Faturamento puxa da coluna 'Receita' do sheets"</em><br />
                  <em>"Cliques vem do Meta Ads"</em><br />
                  <em>"Leads é manual com valor 150"</em>
                </p>
              )}
              {aiHistory.map((m, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded ${
                    m.role === "user" ? "bg-primary/10 ml-8" : "bg-card border border-border mr-8"
                  }`}
                >
                  <strong>{m.role === "user" ? "Você" : "IA"}:</strong> {m.text}
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> pensando...
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={aiMsg}
                onChange={(e) => setAiMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAiSend()}
                placeholder="Descreva a alteração..."
                className="text-xs"
              />
              <Button onClick={handleAiSend} disabled={aiLoading || !aiMsg.trim()} size="sm">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              A IA edita o rascunho — clique <strong>Salvar</strong> para aplicar.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}