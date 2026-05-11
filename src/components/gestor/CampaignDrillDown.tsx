import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play, DollarSign, AlertCircle, TrendingDown, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ObjectEditDrawer } from "./ObjectEditDrawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  campaignId: string;
  campaignName: string;
  datePreset: string;
  currencySymbol?: string;
}

function num(n: any) { return Number(n || 0); }
function fmtMoney(v: any, c = "R$") { return `${c} ${num(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`; }
function fmtNum(v: any) { return num(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 }); }
function fmtPct(v: any) { return `${num(v).toFixed(2)}%`; }
function getAction(actions: any[] | undefined, type: string) {
  return Number(actions?.find((a) => a.action_type === type)?.value || 0);
}

export function CampaignDrillDown({ open, onOpenChange, clientId, campaignId, campaignName, datePreset, currencySymbol = "R$" }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ level: "campaign" | "adset" | "ad"; obj: any } | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["meta-ads-detail", clientId, campaignId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads-detail", {
        body: { clientId, campaignId, datePreset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { campaign: any; adsets: any[]; ads: any[] };
    },
    enabled: open && !!clientId && !!campaignId,
    staleTime: 60_000,
  });

  const camp = data?.campaign;
  const ci = camp?.insights?.data?.[0];
  const adsets = data?.adsets || [];
  const ads = data?.ads || [];

  // Funil dentro da campanha
  const funnel = useMemo(() => {
    if (!ci) return null;
    const impressions = num(ci.impressions);
    const clicks = num(ci.clicks);
    const lpv = getAction(ci.actions, "landing_page_view");
    const atc = getAction(ci.actions, "add_to_cart") || getAction(ci.actions, "offsite_conversion.fb_pixel_add_to_cart");
    const ic = getAction(ci.actions, "initiate_checkout") || getAction(ci.actions, "offsite_conversion.fb_pixel_initiate_checkout");
    const purchase = getAction(ci.actions, "purchase") || getAction(ci.actions, "offsite_conversion.fb_pixel_purchase");
    const lead = getAction(ci.actions, "lead") || getAction(ci.actions, "onsite_conversion.lead_grouped");
    const stages = [
      { label: "Impressões", value: impressions },
      { label: "Cliques", value: clicks },
      { label: "LPV", value: lpv },
      { label: "Add to Cart", value: atc },
      { label: "Checkout iniciado", value: ic },
      { label: "Compras", value: purchase },
    ].filter((s, i) => s.value > 0 || i < 2);
    if (lead > 0) stages.push({ label: "Leads", value: lead });
    return stages;
  }, [ci]);

  const doAction = async (level: "campaign"|"adset"|"ad", objectId: string, action: "pause"|"activate"|"set_daily_budget", value?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-action", {
        body: { clientId, level, objectId, action, value },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error, { description: data.hint });
        return;
      }
      toast.success("Ação aplicada no Meta");
      qc.invalidateQueries({ queryKey: ["meta-ads", clientId] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao executar ação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            <span className="truncate">{campaignName}</span>
            {camp && (
              <>
                <Badge variant={camp.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                  {camp.status}
                </Badge>
                {camp.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction("campaign", campaignId, "pause")}>
                    <Pause className="h-3 w-3 mr-1" /> Pausar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doAction("campaign", campaignId, "activate")}>
                    <Play className="h-3 w-3 mr-1" /> Ativar
                  </Button>
                )}
                <BudgetEditor
                  current={num(camp.daily_budget) / 100}
                  onSave={(v) => doAction("campaign", campaignId, "set_daily_budget", v)}
                  currencySymbol={currencySymbol}
                />
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => setEditing({ level: "campaign", obj: { id: campaignId, ...camp } })}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar tudo
                </Button>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Carregando detalhes da Meta...</span>
          </div>
        )}

        {!isLoading && camp && (
          <Tabs defaultValue="funil" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="self-start">
              <TabsTrigger value="funil" className="text-xs">Funil</TabsTrigger>
              <TabsTrigger value="adsets" className="text-xs">AdSets ({adsets.length})</TabsTrigger>
              <TabsTrigger value="ads" className="text-xs">Ads ({ads.length})</TabsTrigger>
              <TabsTrigger value="metricas" className="text-xs">Métricas avançadas</TabsTrigger>
            </TabsList>

            <TabsContent value="funil" className="flex-1 overflow-auto mt-3">
              {funnel && funnel.length > 0 ? (
                <div className="space-y-2">
                  {funnel.map((s, i) => {
                    const top = funnel[0].value || 1;
                    const pct = (s.value / top) * 100;
                    const prev = i > 0 ? funnel[i - 1].value : null;
                    const conv = prev && prev > 0 ? (s.value / prev) * 100 : null;
                    return (
                      <div key={s.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{s.label}</span>
                          <span className="tabular-nums">
                            {fmtNum(s.value)}
                            {conv !== null && (
                              <span className={`ml-2 text-[10px] ${conv < 30 ? "text-red-400" : "text-muted-foreground"}`}>
                                ({conv.toFixed(1)}% conv)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-2 bg-accent/30 rounded">
                          <div className="h-full bg-primary rounded" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <FunnelDiagnosis stages={funnel} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sem dados de funil para o período.</p>
              )}
            </TabsContent>

            <TabsContent value="adsets" className="flex-1 overflow-auto mt-3">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">AdSet</th>
                    <th className="text-right py-2">Status</th>
                    <th className="text-right py-2">Gasto</th>
                    <th className="text-right py-2">Imp.</th>
                    <th className="text-right py-2">CTR</th>
                    <th className="text-right py-2">CPC</th>
                    <th className="text-right py-2">Freq</th>
                    <th className="text-right py-2">Budget/dia</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {adsets.map((a) => {
                    const ins = a.insights?.data?.[0] || {};
                    return (
                      <tr key={a.id} className="border-b border-border/40 hover:bg-accent/20">
                        <td className="py-2 pr-2 truncate max-w-[280px]" title={a.name}>{a.name}</td>
                        <td className="text-right py-2"><Badge variant={a.status === "ACTIVE" ? "default" : "secondary"} className="text-[9px]">{a.status}</Badge></td>
                        <td className="text-right py-2 tabular-nums">{fmtMoney(ins.spend, currencySymbol)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtNum(ins.impressions)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtPct(ins.ctr)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtMoney(ins.cpc, currencySymbol)}</td>
                        <td className={`text-right py-2 tabular-nums ${num(ins.frequency) > 3 ? "text-yellow-400" : ""}`}>{num(ins.frequency).toFixed(2)}</td>
                        <td className="text-right py-2 tabular-nums">{a.daily_budget ? fmtMoney(num(a.daily_budget) / 100, currencySymbol) : "—"}</td>
                        <td className="text-right py-2">
                          <div className="flex justify-end gap-1">
                            {a.status === "ACTIVE" ? (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => doAction("adset", a.id, "pause")} title="Pausar">
                                <Pause className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => doAction("adset", a.id, "activate")} title="Ativar">
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <BudgetEditor
                              compact
                              current={num(a.daily_budget) / 100}
                              onSave={(v) => doAction("adset", a.id, "set_daily_budget", v)}
                              currencySymbol={currencySymbol}
                            />
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar tudo"
                              onClick={() => setEditing({ level: "adset", obj: a })}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="ads" className="flex-1 overflow-auto mt-3">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Ad</th>
                    <th className="text-left py-2">AdSet</th>
                    <th className="text-right py-2">Status</th>
                    <th className="text-right py-2">Gasto</th>
                    <th className="text-right py-2">CTR</th>
                    <th className="text-right py-2">CPC</th>
                    <th className="text-right py-2">Conv.</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => {
                    const ins = ad.insights?.data?.[0] || {};
                    const purchase = getAction(ins.actions, "purchase") || getAction(ins.actions, "lead") || getAction(ins.actions, "link_click");
                    return (
                      <tr key={ad.id} className="border-b border-border/40 hover:bg-accent/20">
                        <td className="py-2 pr-2 truncate max-w-[260px]" title={ad.name}>{ad.name}</td>
                        <td className="py-2 pr-2 truncate max-w-[180px] text-muted-foreground" title={ad.adset?.name}>{ad.adset?.name}</td>
                        <td className="text-right py-2"><Badge variant={ad.status === "ACTIVE" ? "default" : "secondary"} className="text-[9px]">{ad.status}</Badge></td>
                        <td className="text-right py-2 tabular-nums">{fmtMoney(ins.spend, currencySymbol)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtPct(ins.ctr)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtMoney(ins.cpc, currencySymbol)}</td>
                        <td className="text-right py-2 tabular-nums">{fmtNum(purchase)}</td>
                        <td className="text-right py-2">
                          <div className="flex justify-end gap-1">
                            {ad.status === "ACTIVE" ? (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => doAction("ad", ad.id, "pause")} title="Pausar">
                                <Pause className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => doAction("ad", ad.id, "activate")} title="Ativar">
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar tudo"
                              onClick={() => setEditing({ level: "ad", obj: ad })}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="metricas" className="flex-1 overflow-auto mt-3">
              <ScrollArea className="h-full">
                <pre className="text-[10px] p-3 bg-accent/20 rounded border border-border whitespace-pre-wrap break-all">
                  {JSON.stringify(ci || {}, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ObjectEditDrawer
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        level={editing?.level || "adset"}
        clientId={clientId}
        object={editing?.obj || null}
        onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["meta-ads", clientId] }); }}
      />
    </Dialog>
  );
}

function FunnelDiagnosis({ stages }: { stages: { label: string; value: number }[] }) {
  // Identifica o maior gargalo (menor taxa de conversão entre etapas consecutivas)
  let worstIdx = -1;
  let worstRate = 1;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].value;
    if (!prev) continue;
    const r = stages[i].value / prev;
    if (r < worstRate) { worstRate = r; worstIdx = i; }
  }
  if (worstIdx < 0) return null;
  return (
    <div className="mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 flex gap-2 items-start">
      <TrendingDown className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
      <div className="text-xs">
        <p className="font-medium">Maior gargalo: {stages[worstIdx - 1].label} → {stages[worstIdx].label}</p>
        <p className="text-muted-foreground">Apenas {(worstRate * 100).toFixed(1)}% passam dessa etapa. Foque otimizações aqui.</p>
      </div>
    </div>
  );
}

function BudgetEditor({ current, onSave, currencySymbol = "R$", compact = false }: { current: number; onSave: (v: number) => void; currencySymbol?: string; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current ? String(current.toFixed(2)) : "");
  if (!editing) {
    return (
      <Button size="sm" variant="ghost" className={compact ? "h-6 w-6 p-0" : "h-7 text-xs"} onClick={() => setEditing(true)} title="Editar budget diário">
        <DollarSign className="h-3 w-3" />
        {!compact && <span className="ml-1">Budget</span>}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{currencySymbol}/dia</span>
      <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-7 w-20 text-xs" autoFocus />
      <Button size="sm" className="h-7 text-xs" onClick={() => { const n = parseFloat(val.replace(",", ".")); if (n > 0) { onSave(n); setEditing(false); } }}>OK</Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>X</Button>
    </div>
  );
}