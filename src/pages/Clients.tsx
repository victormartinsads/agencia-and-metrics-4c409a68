import { useState } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client, ClientInsert } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Users, Key, Hash, DollarSign, KanbanSquare, Power, PowerOff, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useClientOrgs, useEnableClientCrm, useDisableClientCrm } from "@/hooks/useClientCrm";
import { VisibleTabsEditor } from "@/components/clients/VisibleTabsEditor";
import AppShell from "@/components/layout/AppShell";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: clientOrgs } = useClientOrgs();
  const enableCrm = useEnableClientCrm();
  const disableCrm = useDisableClientCrm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<ClientInsert>({
    name: "",
    meta_access_token: "",
    ad_account_ids: [""],
    currency_symbol: "R$",
    google_ads_customer_id: "",
    target_cpa_lead: 0,
    target_cpa_purchase: 0,
    cpa_alert_multiplier: 1.5,
    budget_alert_threshold_pct: 90,
  });

  const resetForm = () => {
    setForm({
      name: "", meta_access_token: "", ad_account_ids: [""], currency_symbol: "R$",
      google_ads_customer_id: "", target_cpa_lead: 0, target_cpa_purchase: 0,
      cpa_alert_multiplier: 1.5, budget_alert_threshold_pct: 90,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (c: Client) => {
    setForm({
      name: c.name,
      meta_access_token: c.meta_access_token,
      ad_account_ids: c.ad_account_ids.length > 0 ? c.ad_account_ids : [""],
      currency_symbol: c.currency_symbol || "R$",
      google_ads_customer_id: (c as any).google_ads_customer_id || "",
      target_cpa_lead: c.target_cpa_lead ?? 0,
      target_cpa_purchase: c.target_cpa_purchase ?? 0,
      cpa_alert_multiplier: c.cpa_alert_multiplier ?? 1.5,
      budget_alert_threshold_pct: c.budget_alert_threshold_pct ?? 90,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const addAccountField = () => {
    if (form.ad_account_ids.length >= 5) {
      toast.error("Máximo de 5 contas de anúncio por cliente");
      return;
    }
    setForm({ ...form, ad_account_ids: [...form.ad_account_ids, ""] });
  };

  const removeAccountField = (idx: number) => {
    setForm({
      ...form,
      ad_account_ids: form.ad_account_ids.filter((_, i) => i !== idx),
    });
  };

  const updateAccountId = (idx: number, value: string) => {
    const ids = [...form.ad_account_ids];
    ids[idx] = value;
    setForm({ ...form, ad_account_ids: ids });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.meta_access_token.trim()) {
      toast.error("Preencha o nome e o token");
      return;
    }
    const cleanIds = form.ad_account_ids.filter((id) => id.trim() !== "");
    if (cleanIds.length === 0) {
      toast.error("Adicione pelo menos uma conta de anúncio");
      return;
    }

    try {
      if (editingId) {
        await updateClient.mutateAsync({ id: editingId, ...form, ad_account_ids: cleanIds });
        toast.success("Cliente atualizado!");
      } else {
        await createClient.mutateAsync({ ...form, ad_account_ids: cleanIds });
        toast.success("Cliente criado!");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast.success("Cliente excluído");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const toggleCrm = async (c: Client) => {
    const existing = clientOrgs?.[c.id];
    if (existing) {
      if (!confirm(`Desativar CRM de ${c.name.toUpperCase()}? Todos os leads e configurações serão apagados.`)) return;
      try {
        await disableCrm.mutateAsync({ orgId: existing.id });
        toast.success("CRM desativado");
      } catch (e: any) {
        toast.error(e.message || "Erro ao desativar");
      }
    } else {
      try {
        await enableCrm.mutateAsync({ clientId: c.id, clientName: c.name, clientSlug: c.slug });
        toast.success("CRM ativado!");
      } catch (e: any) {
        toast.error(e.message || "Erro ao ativar");
      }
    }
  };

  const copyPortalLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const header = (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Gerenciar Clientes
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure tokens e contas de anúncio da Meta</p>
      </div>
      {!showForm && (
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Cliente
        </Button>
      )}
    </div>
  );

  return (
    <AppShell currentPage="manage" header={header} noContainer>
      <main className="max-w-[1000px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-card-foreground">
                    {editingId ? "Editar Cliente" : "Novo Cliente"}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Nome do Cliente
                  </Label>
                  <Input
                    placeholder="Ex: Loja ABC"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" /> Token de Acesso da Meta API
                  </Label>
                  <Input
                    type="password"
                    placeholder="EAAxxxxxxx..."
                    value={form.meta_access_token}
                    onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Token gerado no Meta Business Suite → Configurações → Tokens de Acesso
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> IDs das Contas de Anúncio (máx. 5)
                  </Label>
                  <div className="space-y-2">
                    {form.ad_account_ids.map((id, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder={`act_xxxxxxxxx (conta ${idx + 1})`}
                          value={id}
                          onChange={(e) => updateAccountId(idx, e.target.value)}
                        />
                        {form.ad_account_ids.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeAccountField(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {form.ad_account_ids.length < 5 && (
                      <Button variant="outline" size="sm" onClick={addAccountField}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Conta
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Símbolo da Moeda
                  </Label>
                  <select
                    value={form.currency_symbol || "R$"}
                    onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="R$">R$ (Real)</option>
                    <option value="$">$ (Dólar)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="£">£ (Libra)</option>
                    <option value="¥">¥ (Iene)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Símbolo exibido nos valores monetários do dashboard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Google Ads Customer ID (opcional)
                  </Label>
                  <Input
                    placeholder="123-456-7890"
                    value={form.google_ads_customer_id || ""}
                    onChange={(e) => setForm({ ...form, google_ads_customer_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da conta do Google Ads (com ou sem traços). Necessário para puxar campanhas do Google Ads quando a integração for ativada.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSubmit} disabled={createClient.isPending || updateClient.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {editingId ? "Salvar Alterações" : "Criar Cliente"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client list */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : !clients?.length ? (
          <div className="text-center py-16 space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Primeiro Cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <Link
                        to={`/dashboard/${c.id}`}
                        className="text-base font-semibold text-card-foreground hover:text-primary transition-colors"
                      >
                        {c.name.toUpperCase()}
                      </Link>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-accent/50">
                          <Key className="h-3 w-3 mr-1" />
                          Token configurado
                        </Badge>
                        {c.ad_account_ids.map((aid) => (
                          <Badge key={aid} variant="secondary" className="text-xs font-mono">
                            {aid}
                          </Badge>
                        ))}
                        {clientOrgs?.[c.id] && (
                          <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                            <KanbanSquare className="h-3 w-3 mr-1" /> CRM ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      <Button
                        variant={clientOrgs?.[c.id] ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleCrm(c)}
                        disabled={enableCrm.isPending || disableCrm.isPending}
                        className="gap-1.5"
                      >
                        {clientOrgs?.[c.id] ? (
                          <><PowerOff className="h-3.5 w-3.5" /> Desativar CRM</>
                        ) : (
                          <><Power className="h-3.5 w-3.5" /> Ativar CRM</>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {clientOrgs?.[c.id] && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        Links para o cliente
                      </p>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <LinkRow label="CRM (com login)" path={`/portal`} onCopy={copyPortalLink} />
                        <LinkRow label="Dashboard (público)" path={`/share/${c.id}`} onCopy={copyPortalLink} />
                        <LinkRow label="Pódio (público)" path={`/podio/${c.slug}`} onCopy={copyPortalLink} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Link to={`/crm-app?org=${clientOrgs[c.id].id}`}>
                          <Button size="sm" variant="secondary" className="gap-1.5">
                            <KanbanSquare className="h-3.5 w-3.5" /> Abrir CRM
                          </Button>
                        </Link>
                      </div>
                      <VisibleTabsEditor clientId={c.id} />
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

function LinkRow({ label, path, onCopy }: { label: string; path: string; onCopy: (p: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-md px-2 py-1.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <code className="flex-1 truncate font-mono text-[10px]">{path}</code>
      <button onClick={() => onCopy(path)} className="p-1 hover:bg-accent rounded" title="Copiar">
        <Copy className="h-3 w-3" />
      </button>
      <a href={path} target="_blank" rel="noopener" className="p-1 hover:bg-accent rounded" title="Abrir">
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
