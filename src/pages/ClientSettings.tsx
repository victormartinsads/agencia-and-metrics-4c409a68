import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, X, FileSpreadsheet, Webhook, Settings as SettingsIcon, KanbanSquare, Power, PowerOff, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Client, useClients, useUpdateClient } from "@/hooks/useClients";
import { VisibleTabsEditor } from "@/components/clients/VisibleTabsEditor";
import { useClientOrgs, useEnableClientCrm, useDisableClientCrm } from "@/hooks/useClientCrm";

export default function ClientSettings() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: clients, isLoading } = useClients();
  const update = useUpdateClient();
  const client = clients?.find((c) => c.id === clientId);
  const { data: clientOrgs } = useClientOrgs();
  const enableCrm = useEnableClientCrm();
  const disableCrm = useDisableClientCrm();
  const org = client ? clientOrgs?.[client.id] : null;

  const [form, setForm] = useState<Partial<Client> & { google_ads_customer_id?: string; ga_property_id?: string }>({});

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        currency_symbol: client.currency_symbol || "R$",
        meta_access_token: client.meta_access_token,
        ad_account_ids: client.ad_account_ids?.length ? client.ad_account_ids : [""],
        lead_action_types: client.lead_action_types || [],
        target_cpa_lead: client.target_cpa_lead ?? 0,
        target_cpa_purchase: client.target_cpa_purchase ?? 0,
        cpa_alert_multiplier: client.cpa_alert_multiplier ?? 1.5,
        budget_alert_threshold_pct: client.budget_alert_threshold_pct ?? 90,
        google_ads_customer_id: (client as any).google_ads_customer_id || "",
        ga_property_id: (client as any).ga_property_id || "",
      });
    }
  }, [client?.id]);

  if (isLoading || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const updateAdAccount = (idx: number, value: string) => {
    const ids = [...(form.ad_account_ids || [])];
    ids[idx] = value;
    setForm({ ...form, ad_account_ids: ids });
  };
  const addAdAccount = () => {
    if ((form.ad_account_ids || []).length >= 5) return toast.error("Máximo de 5 contas");
    setForm({ ...form, ad_account_ids: [...(form.ad_account_ids || []), ""] });
  };
  const removeAdAccount = (idx: number) =>
    setForm({ ...form, ad_account_ids: (form.ad_account_ids || []).filter((_, i) => i !== idx) });

  const save = async () => {
    try {
      const payload: any = {
        id: client.id,
        name: form.name,
        currency_symbol: form.currency_symbol,
        meta_access_token: form.meta_access_token,
        ad_account_ids: (form.ad_account_ids || []).filter((a) => (a || "").trim() !== ""),
        lead_action_types: form.lead_action_types,
        target_cpa_lead: Number(form.target_cpa_lead) || 0,
        target_cpa_purchase: Number(form.target_cpa_purchase) || 0,
        cpa_alert_multiplier: Number(form.cpa_alert_multiplier) || 1.5,
        budget_alert_threshold_pct: Number(form.budget_alert_threshold_pct) || 90,
        google_ads_customer_id: form.google_ads_customer_id || null,
        ga_property_id: form.ga_property_id || null,
      };
      await update.mutateAsync(payload);
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const header = (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 flex items-center gap-3 flex-wrap">
      <Link to={`/dashboard/${client.id}`} className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold uppercase truncate flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" /> {client.name}
        </h1>
        <p className="text-xs text-muted-foreground">Configurações do cliente</p>
      </div>
      <Button onClick={save} size="sm" className="gap-1.5" disabled={update.isPending}>
        <Save className="h-3.5 w-3.5" /> {update.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );

  return (
    <AppShell currentPage="dashboard" header={header}>
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <Tabs defaultValue="general">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="sheets">Planilhas</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Símbolo da moeda</Label>
                  <Input value={form.currency_symbol || ""} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
                </div>
                <div>
                  <Label>Meta de CPA — Lead</Label>
                  <Input type="number" value={form.target_cpa_lead ?? 0} onChange={(e) => setForm({ ...form, target_cpa_lead: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Meta de CPA — Compra</Label>
                  <Input type="number" value={form.target_cpa_purchase ?? 0} onChange={(e) => setForm({ ...form, target_cpa_purchase: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Multiplicador alerta CPA</Label>
                  <Input type="number" step="0.1" value={form.cpa_alert_multiplier ?? 1.5} onChange={(e) => setForm({ ...form, cpa_alert_multiplier: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>% alerta orçamento</Label>
                  <Input type="number" value={form.budget_alert_threshold_pct ?? 90} onChange={(e) => setForm({ ...form, budget_alert_threshold_pct: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Abas visíveis no dashboard</Label>
                <VisibleTabsEditor clientId={client.id} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="meta" className="mt-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label>Token de acesso Meta</Label>
                <Input type="password" value={form.meta_access_token || ""} onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contas de anúncio (até 5)</Label>
                {(form.ad_account_ids || []).map((id, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input placeholder="act_123..." value={id} onChange={(e) => updateAdAccount(idx, e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeAdAccount(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addAdAccount} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adicionar conta
                </Button>
              </div>
              <div>
                <Label>Tipos de ação contados como lead (separados por vírgula)</Label>
                <Input
                  value={(form.lead_action_types || []).join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lead_action_types: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="google" className="mt-4">
            <Card className="p-6 space-y-4">
              <div>
                <Label>Google Ads Customer ID</Label>
                <Input value={form.google_ads_customer_id || ""} onChange={(e) => setForm({ ...form, google_ads_customer_id: e.target.value })} placeholder="123-456-7890" />
              </div>
              <div>
                <Label>GA4 Property ID</Label>
                <Input value={form.ga_property_id || ""} onChange={(e) => setForm({ ...form, ga_property_id: e.target.value })} placeholder="properties/123456789" />
              </div>
              <p className="text-xs text-muted-foreground">
                A conexão OAuth do Google é feita uma única vez por agência e compartilhada por todos os clientes.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="sheets" className="mt-4">
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Integração com Google Sheets</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Conecte uma planilha para importar vendas, leads e outras métricas. A sincronização roda automaticamente uma vez por dia.
              </p>
              <Link to={`/dashboard/${client.id}/sheets`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir configuração de planilhas
                </Button>
              </Link>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Webhooks de vendas</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure os webhooks de plataformas como Hotmart, Kiwify e Eduzz para receber vendas em tempo real.
              </p>
              <Link to={`/clients/${client.id}/webhooks`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir configuração de webhooks
                </Button>
              </Link>
            </Card>
          </TabsContent>

          <TabsContent value="crm" className="mt-4">
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <KanbanSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">CRM do cliente</h3>
                {org && <Badge variant="default" className="ml-2">Ativo</Badge>}
              </div>
              {org ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    O CRM deste cliente está ativo. Todos os membros administradores e editores da plataforma têm acesso automático.
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/crm-app?org=${org.id}`}>
                      <Button size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir CRM
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        if (!confirm("Desativar o CRM deste cliente? Todos os leads serão removidos.")) return;
                        try {
                          await disableCrm.mutateAsync({ orgId: org.id });
                          toast.success("CRM desativado");
                        } catch (e: any) {
                          toast.error(e.message || "Erro");
                        }
                      }}
                    >
                      <PowerOff className="h-3.5 w-3.5" /> Desativar CRM
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ative o CRM para gerenciar leads, pipelines e integrações de captura de leads para este cliente.
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      try {
                        await enableCrm.mutateAsync({ clientId: client.id, clientName: client.name, clientSlug: client.slug });
                        toast.success("CRM ativado");
                      } catch (e: any) {
                        toast.error(e.message || "Erro");
                      }
                    }}
                  >
                    <Power className="h-3.5 w-3.5" /> Ativar CRM
                  </Button>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}