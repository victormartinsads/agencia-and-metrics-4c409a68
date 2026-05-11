import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Level = "campaign" | "adset" | "ad";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level: Level;
  clientId: string;
  object: any | null;
  onSaved?: () => void;
}

const BID_STRATEGIES = [
  { v: "LOWEST_COST_WITHOUT_CAP", l: "Menor custo (sem limite)" },
  { v: "LOWEST_COST_WITH_BID_CAP", l: "Menor custo com bid cap" },
  { v: "COST_CAP", l: "Cost cap" },
  { v: "LOWEST_COST_WITH_MIN_ROAS", l: "Min ROAS" },
];

const OPTIMIZATION_GOALS = [
  "OFFSITE_CONVERSIONS","LEAD_GENERATION","LINK_CLICKS","LANDING_PAGE_VIEWS",
  "REACH","IMPRESSIONS","POST_ENGAGEMENT","VALUE","THRUPLAY","APP_INSTALLS",
  "MESSAGES","CONVERSATIONS","QUALITY_LEAD",
];

const BILLING_EVENTS = ["IMPRESSIONS","LINK_CLICKS","THRUPLAY","APP_INSTALLS"];

export function ObjectEditDrawer({ open, onOpenChange, level, clientId, object, onSaved }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [lifetimeBudget, setLifetimeBudget] = useState("");
  const [bidStrategy, setBidStrategy] = useState<string | undefined>();
  const [bidAmount, setBidAmount] = useState("");
  const [optGoal, setOptGoal] = useState<string | undefined>();
  const [billingEvent, setBillingEvent] = useState<string | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [targetingJson, setTargetingJson] = useState("");
  const [creativeId, setCreativeId] = useState("");

  useEffect(() => {
    if (!object) return;
    setName(object.name || "");
    setDailyBudget(object.daily_budget ? (Number(object.daily_budget) / 100).toFixed(2) : "");
    setLifetimeBudget(object.lifetime_budget ? (Number(object.lifetime_budget) / 100).toFixed(2) : "");
    setBidStrategy(object.bid_strategy);
    setBidAmount(object.bid_amount ? (Number(object.bid_amount) / 100).toFixed(2) : "");
    setOptGoal(object.optimization_goal);
    setBillingEvent(object.billing_event);
    setStartTime(object.start_time ? object.start_time.slice(0, 16) : "");
    setEndTime((object.end_time || object.stop_time || "").slice(0, 16));
    setTargetingJson(object.targeting ? JSON.stringify(object.targeting, null, 2) : "");
    setCreativeId(object.creative?.id || "");
  }, [object]);

  if (!object) return null;

  async function call(action: string, body: Record<string, any>) {
    setSaving(action);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-action", {
        body: { clientId, level, objectId: object.id, action, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Salvo no Meta");
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-sm">
            Editar {level === "campaign" ? "campanha" : level === "adset" ? "conjunto" : "anúncio"}
          </SheetTitle>
          <p className="text-[10px] text-muted-foreground truncate">{object.name}</p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Nome */}
            <Field label="Nome">
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs h-8" />
                <Button size="sm" disabled={saving === "rename" || !name} onClick={() => call("rename", { payload: { name } })}>
                  {saving === "rename" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
            </Field>

            {/* Status */}
            <Field label="Status">
              <div className="flex gap-2">
                <Button size="sm" variant={object.status === "ACTIVE" ? "default" : "outline"}
                  disabled={saving === "activate" || object.status === "ACTIVE"}
                  onClick={() => call("activate", {})} className="flex-1 h-8 text-xs">Ativar</Button>
                <Button size="sm" variant={object.status === "PAUSED" ? "default" : "outline"}
                  disabled={saving === "pause" || object.status === "PAUSED"}
                  onClick={() => call("pause", {})} className="flex-1 h-8 text-xs">Pausar</Button>
              </div>
            </Field>

            {/* Budget */}
            {level !== "ad" && (
              <>
                <Field label="Budget diário (R$)">
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="text-xs h-8" />
                    <Button size="sm" disabled={saving === "set_daily_budget" || !dailyBudget}
                      onClick={() => call("set_daily_budget", { value: parseFloat(dailyBudget) })}>
                      {saving === "set_daily_budget" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>
                <Field label="Budget total (R$)">
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" value={lifetimeBudget} onChange={(e) => setLifetimeBudget(e.target.value)} className="text-xs h-8" />
                    <Button size="sm" disabled={saving === "set_lifetime_budget" || !lifetimeBudget}
                      onClick={() => call("set_lifetime_budget", { value: parseFloat(lifetimeBudget) })}>
                      {saving === "set_lifetime_budget" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>
              </>
            )}

            {/* Bid */}
            {level !== "ad" && (
              <Field label="Estratégia de lance">
                <div className="flex gap-2">
                  <Select value={bidStrategy} onValueChange={setBidStrategy}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {BID_STRATEGIES.map((b) => <SelectItem key={b.v} value={b.v} className="text-xs">{b.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={saving === "set_bid_strategy" || !bidStrategy}
                    onClick={() => call("set_bid_strategy", { payload: { bid_strategy: bidStrategy, bid_amount: bidAmount ? parseFloat(bidAmount) : undefined } })}>
                    {saving === "set_bid_strategy" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </div>
              </Field>
            )}

            {level === "adset" && (
              <>
                <Field label="Bid amount (R$) — usado quando aplicável">
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="text-xs h-8" />
                    <Button size="sm" disabled={saving === "set_bid_amount" || !bidAmount}
                      onClick={() => call("set_bid_amount", { value: parseFloat(bidAmount) })}>
                      {saving === "set_bid_amount" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>

                <Field label="Optimization goal">
                  <div className="flex gap-2">
                    <Select value={optGoal} onValueChange={setOptGoal}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent>
                        {OPTIMIZATION_GOALS.map((g) => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={saving === "set_optimization_goal" || !optGoal}
                      onClick={() => call("set_optimization_goal", { payload: { optimization_goal: optGoal } })}>
                      {saving === "set_optimization_goal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>

                <Field label="Billing event">
                  <div className="flex gap-2">
                    <Select value={billingEvent} onValueChange={setBillingEvent}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent>
                        {BILLING_EVENTS.map((g) => <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={saving === "set_billing_event" || !billingEvent}
                      onClick={() => call("set_billing_event", { payload: { billing_event: billingEvent } })}>
                      {saving === "set_billing_event" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>
              </>
            )}

            {/* Datas */}
            {level !== "ad" && (
              <Field label="Início / Fim">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-xs h-8" />
                  <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-xs h-8" />
                </div>
                <Button size="sm" className="mt-2 h-8 text-xs" disabled={saving === "set_start_end"}
                  onClick={() => call("set_start_end", { payload: { start_time: startTime || undefined, end_time: endTime || undefined } })}>
                  {saving === "set_start_end" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar datas"}
                </Button>
              </Field>
            )}

            {/* Targeting JSON */}
            {level === "adset" && (
              <Field label="Targeting (JSON Meta API)">
                <Textarea
                  value={targetingJson}
                  onChange={(e) => setTargetingJson(e.target.value)}
                  className="font-mono text-[10px] min-h-[200px]"
                />
                <Button size="sm" className="mt-2 h-8 text-xs" disabled={saving === "set_targeting"}
                  onClick={() => {
                    try {
                      const t = JSON.parse(targetingJson);
                      call("set_targeting", { payload: { targeting: t } });
                    } catch { toast.error("JSON inválido"); }
                  }}>
                  {saving === "set_targeting" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar targeting"}
                </Button>
              </Field>
            )}

            {/* Creative swap */}
            {level === "ad" && (
              <Field label="Trocar creative (creative_id existente)">
                <div className="flex gap-2">
                  <Input value={creativeId} onChange={(e) => setCreativeId(e.target.value)} placeholder="ex.: 1234567890" className="text-xs h-8" />
                  <Button size="sm" disabled={saving === "update_creative" || !creativeId}
                    onClick={() => call("update_creative", { payload: { creative_id: creativeId } })}>
                    {saving === "update_creative" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </div>
                {object.creative?.thumbnail_url && (
                  <img src={object.creative.thumbnail_url} alt="creative" className="mt-2 w-32 rounded border border-border" />
                )}
              </Field>
            )}

            <div className="border-t border-border pt-3">
              <Label className="text-[10px] uppercase text-muted-foreground">Dados brutos (Meta)</Label>
              <pre className="mt-2 text-[9px] p-2 bg-accent/20 rounded border border-border whitespace-pre-wrap break-all max-h-64 overflow-auto">
                {JSON.stringify(object, null, 2)}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}