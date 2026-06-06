import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, GripVertical, Zap, MousePointerClick, Eye,
  FormInput, Clock, ArrowDownToLine, Webhook, RefreshCw, Info,
} from "lucide-react";

interface TrackingEvent {
  id: string;
  client_id: string;
  event_name: string;
  display_name: string | null;
  is_standard: boolean;
  enabled: boolean;
  trigger_type: string;
  trigger_selector: string | null;
  trigger_value: string | null;
  custom_params: Record<string, any>;
  sort_order: number;
}

const TRIGGER_TYPES = [
  { value: "page_load",       label: "Carregamento da página",     icon: <Zap className="h-3.5 w-3.5" />,           desc: "Dispara assim que a LP carrega" },
  { value: "checkout_click",  label: "Clique no checkout",         icon: <MousePointerClick className="h-3.5 w-3.5" />, desc: "Detecta automaticamente links da Hotmart, Kiwify e Eduzz" },
  { value: "form_submit",     label: "Envio de formulário",        icon: <FormInput className="h-3.5 w-3.5" />,      desc: "Detecta qualquer <form> na página" },
  { value: "element_visible", label: "Elemento visível na tela",   icon: <Eye className="h-3.5 w-3.5" />,            desc: "Usa Intersection Observer — informe o seletor CSS" },
  { value: "element_click",   label: "Clique em elemento",         icon: <MousePointerClick className="h-3.5 w-3.5" />, desc: "Informe o seletor CSS do botão/link" },
  { value: "scroll_depth",    label: "Profundidade de scroll",     icon: <ArrowDownToLine className="h-3.5 w-3.5" />, desc: "Dispara quando o usuário rolar X% da página" },
  { value: "time_on_page",    label: "Tempo na página",            icon: <Clock className="h-3.5 w-3.5" />,          desc: "Dispara após X segundos na página" },
  { value: "webhook_only",    label: "Somente via webhook",        icon: <Webhook className="h-3.5 w-3.5" />,        desc: "Evento enviado pelo servidor (ex: Purchase)" },
];

const STANDARD_EVENTS = [
  { name: "PageView",         label: "Visualização de Página",     trigger: "page_load",      locked: true  },
  { name: "ViewContent",      label: "Visualização de Oferta",     trigger: "page_load",      locked: false },
  { name: "InitiateCheckout", label: "Clique no Checkout",         trigger: "checkout_click", locked: false },
  { name: "Lead",             label: "Envio de Formulário",        trigger: "form_submit",    locked: false },
  { name: "Purchase",         label: "Compra (via webhook)",       trigger: "webhook_only",   locked: true  },
];

const triggerIcon = (type: string) =>
  TRIGGER_TYPES.find(t => t.value === type)?.icon ?? <Zap className="h-3.5 w-3.5" />;
const triggerLabel = (type: string) =>
  TRIGGER_TYPES.find(t => t.value === type)?.label ?? type;

function needsSelector(type: string) {
  return type === "element_visible" || type === "element_click";
}
function needsValue(type: string) {
  return type === "scroll_depth" || type === "time_on_page";
}

interface Props {
  clientId: string;
}

export default function TrackingEvents({ clientId }: Props) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customForm, setCustomForm] = useState({
    event_name: "",
    display_name: "",
    trigger_type: "element_click",
    trigger_selector: "",
    trigger_value: "",
  });

  const db = supabase as any;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Garantir que os eventos padrão existem
      await db.rpc("tracking_ensure_events", { _client_id: clientId });

      const { data, error } = await db
        .from("tracking_events")
        .select("*")
        .eq("client_id", clientId)
        .order("sort_order");

      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleEnabled = async (ev: TrackingEvent) => {
    if (ev.event_name === "PageView" || ev.event_name === "Purchase") {
      toast.info("Este evento não pode ser desativado.");
      return;
    }
    setSaving(ev.id);
    try {
      const { error } = await db
        .from("tracking_events")
        .update({ enabled: !ev.enabled })
        .eq("id", ev.id);
      if (error) throw error;
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, enabled: !e.enabled } : e));
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const updateTrigger = async (ev: TrackingEvent, field: string, value: string) => {
    setSaving(ev.id);
    try {
      const { error } = await db
        .from("tracking_events")
        .update({ [field]: value || null })
        .eq("id", ev.id);
      if (error) throw error;
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, [field]: value } : e));
      toast.success("Salvo!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const deleteEvent = async (ev: TrackingEvent) => {
    if (ev.is_standard) return;
    if (!confirm(`Remover evento "${ev.display_name || ev.event_name}"?`)) return;
    try {
      const { error } = await db
        .from("tracking_events")
        .delete()
        .eq("id", ev.id);
      if (error) throw error;
      setEvents(prev => prev.filter(e => e.id !== ev.id));
      toast.success("Evento removido");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const createCustomEvent = async () => {
    if (!customForm.event_name.trim()) {
      toast.error("Informe o nome do evento (ex: VideoAssistido)");
      return;
    }
    try {
      const { error } = await db
        .from("tracking_events")
        .insert({
          client_id: clientId,
          event_name: customForm.event_name.trim().replace(/\s+/g, "_"),
          display_name: customForm.display_name || customForm.event_name,
          is_standard: false,
          enabled: true,
          trigger_type: customForm.trigger_type,
          trigger_selector: customForm.trigger_selector || null,
          trigger_value: customForm.trigger_value || null,
          sort_order: events.length + 1,
        });
      if (error) throw error;
      toast.success("Evento criado!");
      setShowCustomDialog(false);
      setCustomForm({ event_name: "", display_name: "", trigger_type: "element_click", trigger_selector: "", trigger_value: "" });
      fetchEvents();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const standardEvents = events.filter(e => e.is_standard);
  const customEvents = events.filter(e => !e.is_standard);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Sem GTM necessário para os eventos do funil</p>
              <p className="text-xs mt-1 text-blue-700">
                O script detecta automaticamente cliques em checkouts, envios de formulários e outros gatilhos.
                Eventos personalizados podem usar qualquer seletor CSS da sua página.
                Tudo é configurado aqui e embutido no script gerado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eventos Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos Padrão do Funil</CardTitle>
          <CardDescription>
            Ative ou desative cada evento. O gatilho é detectado automaticamente pelo script.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {standardEvents.map((ev) => {
            const isLocked = ev.event_name === "PageView" || ev.event_name === "Purchase";
            const isSaving = saving === ev.id;
            return (
              <div key={ev.id} className="flex items-start gap-4 px-6 py-4 border-t first:border-t-0">
                {/* Toggle */}
                <div className="pt-0.5">
                  <Switch
                    checked={ev.enabled}
                    onCheckedChange={() => toggleEnabled(ev)}
                    disabled={isLocked || isSaving}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{ev.display_name || ev.event_name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{ev.event_name}</Badge>
                    {isLocked && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">sempre ativo</Badge>
                    )}
                    {ev.event_name === "Purchase" && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                        via webhook
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    {triggerIcon(ev.trigger_type)}
                    <span>{triggerLabel(ev.trigger_type)}</span>
                  </div>

                  {/* Campos extras para eventos não-locked */}
                  {!isLocked && ev.enabled && ev.event_name !== "Purchase" && (
                    <div className="mt-3 space-y-2">
                      {/* Seletor alternativo de trigger */}
                      {ev.event_name === "ViewContent" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs shrink-0 w-28">Gatilho:</Label>
                          <Select
                            value={ev.trigger_type}
                            onValueChange={(v) => updateTrigger(ev, "trigger_type", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-52">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="page_load">Carregamento da página</SelectItem>
                              <SelectItem value="element_visible">Elemento visível (seletor CSS)</SelectItem>
                              <SelectItem value="scroll_depth">Scroll de X%</SelectItem>
                              <SelectItem value="time_on_page">Após X segundos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {needsSelector(ev.trigger_type) && (
                        <SelectorInput
                          value={ev.trigger_selector || ""}
                          placeholder=".minha-oferta, #secao-produto"
                          label="Seletor CSS:"
                          onSave={(v) => updateTrigger(ev, "trigger_selector", v)}
                        />
                      )}
                      {needsValue(ev.trigger_type) && (
                        <SelectorInput
                          value={ev.trigger_value || ""}
                          placeholder={ev.trigger_type === "scroll_depth" ? "50 (porcentagem)" : "30 (segundos)"}
                          label={ev.trigger_type === "scroll_depth" ? "% scroll:" : "Segundos:"}
                          onSave={(v) => updateTrigger(ev, "trigger_value", v)}
                          type="number"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Eventos Personalizados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Eventos Personalizados</CardTitle>
              <CardDescription className="mt-1">
                Crie eventos com nome e gatilho customizados. O script vai disparar via Meta CAPI + GA4.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowCustomDialog(true)}>
              <Plus className="h-4 w-4" />
              Novo evento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {customEvents.length === 0 ? (
            <div className="px-6 pb-6 text-center">
              <div className="border-2 border-dashed rounded-lg p-8">
                <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum evento personalizado ainda</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Exemplos: VideoAssistido, ContagemRegressiva, BotaoCtaClicado
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => setShowCustomDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro evento
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {customEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="pt-0.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                  <div className="pt-0.5">
                    <Switch
                      checked={ev.enabled}
                      onCheckedChange={() => toggleEnabled(ev)}
                      disabled={saving === ev.id}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ev.display_name || ev.event_name}</span>
                      <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-600 border-purple-200">
                        custom
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">{ev.event_name}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      {triggerIcon(ev.trigger_type)}
                      <span>{triggerLabel(ev.trigger_type)}</span>
                      {ev.trigger_selector && (
                        <code className="ml-1 text-xs bg-muted px-1 rounded">{ev.trigger_selector}</code>
                      )}
                      {ev.trigger_value && (
                        <span className="ml-1 font-medium">{ev.trigger_value}{ev.trigger_type === "scroll_depth" ? "%" : "s"}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEvent(ev)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informativo de como funciona */}
      <Card className="border-dashed">
        <CardContent className="pt-5 space-y-3">
          <p className="text-sm font-medium">Como o script detecta os gatilhos automaticamente:</p>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {[
              { trigger: "Clique no checkout", how: "Intercepta <a href> que contenham hotmart.com, kiwify.com ou eduzz.com antes do redirecionamento" },
              { trigger: "Envio de formulário", how: "Ouve o evento submit em todos os <form> da página — funciona com Elementor, RD Station, ActiveCampaign etc." },
              { trigger: "Elemento visível", how: "Usa IntersectionObserver: quando o seletor CSS aparecer na tela, dispara o evento" },
              { trigger: "Clique em elemento", how: "Adiciona event listener de click no seletor CSS informado" },
              { trigger: "Scroll depth", how: "Monitora window.scrollY e dispara quando % de scroll for atingida (uma vez por sessão)" },
              { trigger: "Tempo na página", how: "setTimeout que dispara após X segundos sem reload" },
            ].map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-44">{item.trigger}:</span>
                <span>{item.how}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog novo evento */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar evento personalizado</DialogTitle>
            <DialogDescription>
              O evento será disparado via Meta CAPI e GA4 automaticamente quando o gatilho for acionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do evento (Meta/GA4)</Label>
                <Input
                  placeholder="VideoAssistido"
                  value={customForm.event_name}
                  onChange={(e) => setCustomForm({ ...customForm, event_name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Sem espaços. CamelCase ou snake_case.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nome amigável (opcional)</Label>
                <Input
                  placeholder="Vídeo assistido até o fim"
                  value={customForm.display_name}
                  onChange={(e) => setCustomForm({ ...customForm, display_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Gatilho</Label>
              <Select
                value={customForm.trigger_type}
                onValueChange={(v) => setCustomForm({ ...customForm, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.filter(t => t.value !== "webhook_only" && t.value !== "checkout_click").map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        {t.icon}
                        <div>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsSelector(customForm.trigger_type) && (
              <div className="space-y-1.5">
                <Label>Seletor CSS</Label>
                <Input
                  placeholder="#meu-botao, .cta-final, [data-evento=comprar]"
                  value={customForm.trigger_selector}
                  onChange={(e) => setCustomForm({ ...customForm, trigger_selector: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use o DevTools do browser (F12) para encontrar o seletor do elemento.
                </p>
              </div>
            )}

            {needsValue(customForm.trigger_type) && (
              <div className="space-y-1.5">
                <Label>
                  {customForm.trigger_type === "scroll_depth" ? "Porcentagem de scroll (%)" : "Tempo em segundos"}
                </Label>
                <Input
                  type="number"
                  placeholder={customForm.trigger_type === "scroll_depth" ? "50" : "30"}
                  value={customForm.trigger_value}
                  onChange={(e) => setCustomForm({ ...customForm, trigger_value: e.target.value })}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancelar</Button>
            <Button onClick={createCustomEvent} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-componente: campo de seletor com botão salvar
function SelectorInput({
  value, placeholder, label, onSave, type = "text"
}: {
  value: string; placeholder: string; label: string;
  onSave: (v: string) => void; type?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs shrink-0 w-28">{label}</Label>
      <Input
        type={type}
        className="h-8 text-xs font-mono flex-1"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onSave(local)}
        onKeyDown={(e) => e.key === "Enter" && onSave(local)}
      />
    </div>
  );
}
