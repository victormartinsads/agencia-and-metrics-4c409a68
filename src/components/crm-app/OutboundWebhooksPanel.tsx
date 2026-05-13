import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Send, Trash2, Plus, Webhook, CheckCircle2, XCircle, Copy, Eye, EyeOff } from "lucide-react";
import {
  ALL_EVENTS,
  useDeleteOutboundWebhook,
  useOutboundEvents,
  useOutboundWebhooks,
  useUpsertOutboundWebhook,
  type OutboundWebhook,
} from "@/hooks/useOutboundWebhooks";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_PAYLOAD_PREVIEW = `{
  "event_type": "qualified",
  "lead": {
    "id": "uuid",
    "name": "João da Silva",
    "email": "joao@example.com",
    "phone": "+55 11 99999-0000",
    "company": "Empresa LTDA",
    "status": "qualified",
    "value": 1500,
    "source": "instagram",
    "product": "Produto X",
    "utm_campaign": "...",
    "utm_medium": "...",
    "custom_fields": { "cidade": "São Paulo" },
    "created_at": "...",
    "updated_at": "..."
  },
  "old_status": "new"
}`;

export function OutboundWebhooksPanel({ orgId, pipelineId = null, pipelineName }: { orgId: string; pipelineId?: string | null; pipelineName?: string }) {
  const { data: hooks = [] } = useOutboundWebhooks(orgId, pipelineId);
  const { data: events = [], refetch: refetchEvents } = useOutboundEvents(orgId);
  const upsert = useUpsertOutboundWebhook(orgId, pipelineId);
  const del = useDeleteOutboundWebhook(orgId);

  const [draft, setDraft] = useState<{ name: string; url: string; events: string[] }>({
    name: "", url: "", events: ["qualified", "closed"],
  });
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const toggleDraftEvent = (k: string) =>
    setDraft((d) => ({ ...d, events: d.events.includes(k) ? d.events.filter((e) => e !== k) : [...d.events, k] }));

  const add = async () => {
    if (!draft.url) return toast.error("Informe a URL");
    if (!draft.url.startsWith("http")) return toast.error("URL deve começar com http(s)");
    try {
      await upsert.mutateAsync({ name: draft.name || "Webhook", url: draft.url, events: draft.events, active: true });
      setDraft({ name: "", url: "", events: ["qualified", "closed"] });
      toast.success("Webhook criado");
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const updateHook = async (h: OutboundWebhook, patch: Partial<OutboundWebhook>) => {
    try {
      await upsert.mutateAsync({ id: h.id, name: h.name, url: h.url, events: h.events, active: h.active, ...patch });
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const sendTest = async (h: OutboundWebhook) => {
    setTesting(h.id);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/crm-app-dispatch-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ test: true, webhook_id: h.id, event_type: h.events[0] || "test" }),
      });
      const out = await res.json();
      if (out.success) toast.success(`Teste enviado (HTTP ${out.status_code})`);
      else toast.error(`Falhou (HTTP ${out.status_code || "?"}): ${(out.response_body || out.error || "").slice(0, 120)}`);
      refetchEvents();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Webhook className="h-4 w-4" /> Webhooks de saída{pipelineName ? ` — ${pipelineName}` : " (organização)"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {pipelineId
            ? "Disparados apenas para leads deste pipeline."
            : "Disparados para leads sem pipeline."}{" "}
          Configure URLs que receberão notificações automáticas quando leads mudarem de status.
          Cada requisição envia POST com JSON e header <code>x-webhook-secret</code>.
        </p>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver formato do payload enviado</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">{SAMPLE_PAYLOAD_PREVIEW}</pre>
        </details>

        <div className="space-y-3">
          {hooks.map((h) => (
            <div key={h.id} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1 text-sm"
                  value={h.name}
                  onChange={(e) => updateHook(h, { name: e.target.value })}
                />
                <Switch checked={h.active} onCheckedChange={(v) => updateHook(h, { active: v })} />
                <Button size="sm" variant="outline" onClick={() => sendTest(h)} disabled={testing === h.id}>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {testing === h.id ? "Enviando..." : "Testar"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(h.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <Input
                className="text-xs font-mono"
                value={h.url}
                onChange={(e) => updateHook(h, { url: e.target.value })}
                placeholder="https://exemplo.com/webhook"
              />
              <div className="flex flex-wrap gap-1.5">
                {ALL_EVENTS.map((ev) => {
                  const on = h.events.includes(ev.key);
                  return (
                    <Badge
                      key={ev.key}
                      variant={on ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        updateHook(h, {
                          events: on ? h.events.filter((e) => e !== ev.key) : [...h.events, ev.key],
                        })
                      }
                    >
                      {ev.label}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Secret:</span>
                <code className="flex-1 bg-muted px-2 py-1 rounded font-mono text-[10px] truncate">
                  {showSecret[h.id] ? h.secret : "•".repeat(Math.min(32, h.secret.length))}
                </code>
                <Button size="icon" variant="ghost" onClick={() => setShowSecret((s) => ({ ...s, [h.id]: !s[h.id] }))}>
                  {showSecret[h.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(h.secret); toast.success("Copiado"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {hooks.length === 0 && <p className="text-xs text-muted-foreground">Nenhum webhook de saída configurado.</p>}
        </div>

        <div className="grid grid-cols-12 gap-2 pt-3 border-t border-border">
          <div className="col-span-3">
            <Label className="text-xs">Nome</Label>
            <Input value={draft.name} placeholder="Ex: Zapier" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="col-span-7">
            <Label className="text-xs">URL do endpoint</Label>
            <Input value={draft.url} placeholder="https://..." onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          </div>
          <div className="col-span-2 flex items-end">
            <Button className="w-full gap-1" onClick={add} disabled={upsert.isPending}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
          <div className="col-span-12 flex flex-wrap gap-1.5">
            {ALL_EVENTS.map((ev) => {
              const on = draft.events.includes(ev.key);
              return (
                <Badge key={ev.key} variant={on ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleDraftEvent(ev.key)}>
                  {ev.label}
                </Badge>
              );
            })}
          </div>
        </div>
      </Card>

      {events.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Últimos envios</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs border-b border-border/50 py-1.5">
                {e.success ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                <span className="text-muted-foreground">HTTP {e.status_code || "—"}</span>
                <span className="flex-1 truncate text-muted-foreground">{(e.response_body || "").slice(0, 80)}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
