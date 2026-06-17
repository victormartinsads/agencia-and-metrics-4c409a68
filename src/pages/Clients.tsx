import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Star, Copy, ExternalLink, MoreHorizontal,
  LayoutGrid, Rows3, Trash2, Pencil, Power, PowerOff, KanbanSquare, Archive, ArchiveRestore,
  Users, X, Save, Key, Hash, DollarSign, Zap,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useClients, useCreateClient, useUpdateClient, useDeleteClient, useArchiveClient, Client, ClientInsert,
} from "@/hooks/useClients";
import {
  useClientOrgs, useEnableClientCrm, useDisableClientCrm,
} from "@/hooks/useClientCrm";
import { useMyAssignments, useToggleAssignment } from "@/hooks/useClientAssignments";
import { useProfile, displayName } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

type Filter = "all" | "mine" | "active" | "with-crm";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "mine", label: "Meus" },
  { id: "active", label: "Ativos" },
  { id: "with-crm", label: "Com CRM" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function emptyForm(): ClientInsert {
  return {
    name: "",
    meta_access_token: "",
    ad_account_ids: [""],
    currency_symbol: "R$",
    google_ads_customer_id: "",
    target_cpa_lead: 0,
    target_cpa_purchase: 0,
    cpa_alert_multiplier: 1.5,
    budget_alert_threshold_pct: 90,
  };
}

export default function ClientsPage() {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const welcomeName = displayName(profile, user?.email);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const { data: clients = [], isLoading } = useClients(
    tab === "archived" ? { onlyArchived: true } : undefined,
  );
  const { data: clientOrgs } = useClientOrgs();
  const { data: assignments } = useMyAssignments();
  const toggleFav = useToggleAssignment();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const archiveClient = useArchiveClient();
  const enableCrm = useEnableClientCrm();
  const disableCrm = useDisableClientCrm();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInsert>(emptyForm);

  const favoriteIds = useMemo(
    () => new Set((assignments || []).map((a) => a.client_id)),
    [assignments],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "mine": return favoriteIds.has(c.id);
        case "active": return (c.ad_account_ids?.length ?? 0) > 0;
        case "with-crm": return !!clientOrgs?.[c.id];
        default: return true;
      }
    });
  }, [clients, search, filter, favoriteIds, clientOrgs]);

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setCreating(true); };
  const openEdit = (c: Client) => {
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
    setEditing(c);
    setCreating(false);
  };
  const closeSheet = () => { setCreating(false); setEditing(null); };

  const updateAccountId = (idx: number, value: string) => {
    const ids = [...form.ad_account_ids];
    ids[idx] = value;
    setForm({ ...form, ad_account_ids: ids });
  };
  const addAccountField = () => {
    if (form.ad_account_ids.length >= 5) return toast.error("Máximo de 5 contas de anúncio");
    setForm({ ...form, ad_account_ids: [...form.ad_account_ids, ""] });
  };
  const removeAccountField = (idx: number) =>
    setForm({ ...form, ad_account_ids: form.ad_account_ids.filter((_, i) => i !== idx) });

  const saveClient = async () => {
    if (!form.name.trim() || !form.meta_access_token.trim())
      return toast.error("Preencha o nome e o token");
    const cleanIds = form.ad_account_ids.filter((id) => id.trim() !== "");
    if (cleanIds.length === 0) return toast.error("Adicione ao menos uma conta de anúncio");
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, ...form, ad_account_ids: cleanIds });
        toast.success("Cliente atualizado");
      } else {
        await createClient.mutateAsync({ ...form, ad_account_ids: cleanIds });
        toast.success("Cliente criado");
      }
      closeSheet();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClient.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name.toUpperCase()} foi removido`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleFav = async (c: Client) => {
    const isFav = favoriteIds.has(c.id);
    try {
      await toggleFav.mutateAsync({ clientId: c.id, assigned: !isFav });
      toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (e: any) { toast.error(e.message || "Erro ao atualizar"); }
  };

  const handleToggleCrm = async (c: Client) => {
    const existing = clientOrgs?.[c.id];
    if (existing) {
      if (!confirm(`Desativar CRM de ${c.name.toUpperCase()}? Todos os leads e configurações serão apagados.`)) return;
      try {
        await disableCrm.mutateAsync({ orgId: existing.id });
        toast.success("CRM desativado");
      } catch (e: any) { toast.error(e.message || "Erro ao desativar"); }
    } else {
      try {
        await enableCrm.mutateAsync({ clientId: c.id, clientName: c.name, clientSlug: c.slug });
        toast.success("CRM ativado");
      } catch (e: any) { toast.error(e.message || "Erro ao ativar"); }
    }
  };

  const handleArchive = async (c: Client, archived: boolean) => {
    try {
      await archiveClient.mutateAsync({ id: c.id, archived });
      toast.success(archived ? `${c.name.toUpperCase()} arquivado` : `${c.name.toUpperCase()} reativado`);
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const copyLink = async (c: Client) => {
    const url = `${window.location.origin}/share/${c.slug || c.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado", { description: url });
    } catch { toast.error("Não foi possível copiar"); }
  };

  const sheetOpen = creating || !!editing;

  return (
    <AppShell currentPage="clients">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground uppercase">
              <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Home</span>
            </h1>
            <p className="mt-1 text-sm text-foreground/80">
              {greeting}{welcomeName ? `, ` : ""}
              {welcomeName && <span className="font-semibold text-foreground">{welcomeName}</span>}
              {" "}— bem-vindo de volta 👋
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {clients.length} clientes na base · {favoriteIds.size} favoritados
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-primary text-primary-foreground hover:opacity-90 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.7)]"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </motion.header>

        {/* Active / Archived tabs */}
        <div className="mt-5 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 w-fit">
          {([
            { id: "active", label: "Ativos" },
            { id: "archived", label: "Desativados" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label === "Desativados" && <Archive className="inline h-3 w-3 mr-1" />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome…"
              className="border-border bg-surface pl-9 placeholder:text-muted-foreground"
              aria-label="Buscar clientes"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.id
                    ? "bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Visualizar em grade"
              className={`grid h-7 w-7 place-items-center rounded ${view === "grid" ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              aria-label="Visualizar em tabela"
              className={`grid h-7 w-7 place-items-center rounded ${view === "table" ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Loading / empty */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-16">Carregando…</p>
        ) : filtered.length === 0 ? (
          <Card className="mt-8 border-dashed border-border bg-transparent p-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros ou{" "}
              <button onClick={openCreate} className="text-primary hover:underline">crie um novo cliente</button>.
            </p>
          </Card>
        ) : view === "grid" ? (
          <motion.div layout className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((c) => {
                const isFav = favoriteIds.has(c.id);
                const hasCrm = !!clientOrgs?.[c.id];
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Card className="group relative overflow-hidden border-0 bg-surface p-4 transition-all hover:bg-surface-elevated hover:shadow-[0_10px_40px_-16px_hsl(var(--primary)/0.4)]">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/dashboard/${c.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="h-10 w-10 shrink-0 rounded-md object-cover bg-black border border-border" />
                          ) : (
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-sm font-semibold">
                              {getInitials(c.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground uppercase">{c.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">/{c.slug || c.id.slice(0, 8)}</p>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleToggleFav(c)}
                          aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-warning"
                        >
                          <Star className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/10 text-primary">
                          Meta ✓
                        </Badge>
                        {hasCrm && (
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                            <KanbanSquare className="mr-1 h-2.5 w-2.5" /> CRM
                          </Badge>
                        )}
                        {c.ad_account_ids.slice(0, 2).map((aid) => (
                          <Badge key={aid} variant="outline" className="text-[10px] border-border bg-surface-elevated text-muted-foreground font-mono">
                            {aid}
                          </Badge>
                        ))}
                        {c.ad_account_ids.length > 2 && (
                          <Badge variant="outline" className="text-[10px] border-border bg-surface-elevated text-muted-foreground">
                            +{c.ad_account_ids.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                        <span>{c.ad_account_ids.length} conta{c.ad_account_ids.length !== 1 ? "s" : ""}</span>
                        <div className="flex items-center gap-0.5">
                          <Link to={`/tracking/${c.id}`} aria-label="TrackingHub" className="rounded p-1.5 hover:bg-background hover:text-foreground" title="TrackingHub CAPI">
                            <Zap className="h-3.5 w-3.5" />
                          </Link>
                          <button onClick={() => copyLink(c)} aria-label="Copiar link público" className="rounded p-1.5 hover:bg-background hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <a href={`/share/${c.slug || c.id}`} target="_blank" rel="noreferrer" aria-label="Abrir dashboard" className="rounded p-1.5 hover:bg-background hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button aria-label="Mais ações" className="rounded p-1.5 hover:bg-background hover:text-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleCrm(c)}>
                                {hasCrm ? <><PowerOff className="mr-2 h-3.5 w-3.5" /> Desativar CRM</> : <><Power className="mr-2 h-3.5 w-3.5" /> Ativar CRM</>}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {tab === "active" ? (
                                <DropdownMenuItem onClick={() => handleArchive(c, true)}>
                                  <Archive className="mr-2 h-3.5 w-3.5" /> Arquivar (desativar)
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleArchive(c, false)}>
                                  <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Reativar cliente
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Card className="mt-6 overflow-hidden border-0 bg-surface">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">Integrações</TableHead>
                  <TableHead className="text-right text-muted-foreground">Contas</TableHead>
                  <TableHead className="text-right text-muted-foreground">Moeda</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const hasCrm = !!clientOrgs?.[c.id];
                  const isFav = favoriteIds.has(c.id);
                  return (
                    <TableRow key={c.id} className="border-border/60 transition-colors hover:bg-surface-elevated">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <button onClick={() => handleToggleFav(c)} className="text-muted-foreground hover:text-warning">
                            <Star className={`h-3.5 w-3.5 ${isFav ? "fill-primary text-primary" : ""}`} />
                          </button>
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded-md object-cover bg-black border border-border" />
                          ) : (
                            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 font-mono text-xs font-semibold">
                              {getInitials(c.name)}
                            </div>
                          )}
                          <div>
                            <Link to={`/dashboard/${c.id}`} className="text-sm font-medium text-foreground uppercase hover:text-primary">
                              {c.name}
                            </Link>
                            <p className="font-mono text-[11px] text-muted-foreground">/{c.slug || c.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/10 text-primary">Meta ✓</Badge>
                          {hasCrm && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                              <KanbanSquare className="mr-1 h-2.5 w-2.5" /> CRM
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{c.ad_account_ids.length}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{c.currency_symbol || "R$"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button aria-label="Mais ações" className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/tracking/${c.id}`} className="flex items-center">
                                <Zap className="mr-2 h-3.5 w-3.5" /> TrackingHub (CAPI)
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyLink(c)}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> Copiar link público
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleCrm(c)}>
                              {hasCrm ? <><PowerOff className="mr-2 h-3.5 w-3.5" /> Desativar CRM</> : <><Power className="mr-2 h-3.5 w-3.5" /> Ativar CRM</>}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tab === "active" ? (
                              <DropdownMenuItem onClick={() => handleArchive(c, true)}>
                                <Archive className="mr-2 h-3.5 w-3.5" /> Arquivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleArchive(c, false)}>
                                <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Sheet: create/edit */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <SheetContent className="w-full bg-surface text-foreground sm:max-w-xl border-l border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Editar ${editing.name.toUpperCase()}` : "Novo cliente"}</SheetTitle>
            <SheetDescription>
              Preencha em três etapas. Você pode finalizar e completar depois.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="ident" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-background">
              <TabsTrigger value="ident">1. Identificação</TabsTrigger>
              <TabsTrigger value="integ">2. Integrações</TabsTrigger>
              <TabsTrigger value="goals">3. Metas</TabsTrigger>
            </TabsList>

            <TabsContent value="ident" className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cname" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Nome do cliente
                </Label>
                <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Loja ABC" className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ccurr" className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Símbolo da moeda
                </Label>
                <select
                  id="ccurr"
                  value={form.currency_symbol || "R$"}
                  onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                  className="flex h-10 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="R$">R$</option>
                  <option value="$">$</option>
                  <option value="€">€</option>
                  <option value="£">£</option>
                  <option value="¥">¥</option>
                </select>
              </div>
            </TabsContent>

            <TabsContent value="integ" className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="meta" className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" /> Meta access token
                </Label>
                <Input
                  id="meta"
                  type="password"
                  placeholder="EAAB..."
                  value={form.meta_access_token}
                  onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Contas de anúncio (act_…) — máx. 5
                </Label>
                <div className="space-y-2">
                  {form.ad_account_ids.map((id, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`act_xxxxxxxxx (conta ${idx + 1})`}
                        value={id}
                        onChange={(e) => updateAccountId(idx, e.target.value)}
                        className="bg-background border-border font-mono text-sm"
                      />
                      {form.ad_account_ids.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeAccountField(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.ad_account_ids.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addAccountField} className="border-border bg-background">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar conta
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gads" className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Google Ads customer ID (opcional)
                </Label>
                <Input
                  id="gads"
                  placeholder="123-456-7890"
                  value={form.google_ads_customer_id || ""}
                  onChange={(e) => setForm({ ...form, google_ads_customer_id: e.target.value })}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="goals" className="mt-6 space-y-4">
              <p className="text-xs text-muted-foreground">Limites de alertas (Visão do Gestor)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cpa-l">CPA meta · Lead ({form.currency_symbol})</Label>
                  <Input id="cpa-l" type="number" step="0.01" min="0"
                    value={form.target_cpa_lead ?? 0}
                    onChange={(e) => setForm({ ...form, target_cpa_lead: Number(e.target.value) })}
                    className="bg-background border-border font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpa-p">CPA meta · Compra ({form.currency_symbol})</Label>
                  <Input id="cpa-p" type="number" step="0.01" min="0"
                    value={form.target_cpa_purchase ?? 0}
                    onChange={(e) => setForm({ ...form, target_cpa_purchase: Number(e.target.value) })}
                    className="bg-background border-border font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mult">Multiplicador alerta</Label>
                  <Input id="mult" type="number" step="0.1" min="1"
                    value={form.cpa_alert_multiplier ?? 1.5}
                    onChange={(e) => setForm({ ...form, cpa_alert_multiplier: Number(e.target.value) })}
                    className="bg-background border-border font-mono" />
                  <p className="text-[10px] text-muted-foreground">Alerta quando CPA &gt; alvo × multiplicador</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bud">Alerta orçamento (%)</Label>
                  <Input id="bud" type="number" step="1" min="50" max="100"
                    value={form.budget_alert_threshold_pct ?? 90}
                    onChange={(e) => setForm({ ...form, budget_alert_threshold_pct: Number(e.target.value) })}
                    className="bg-background border-border font-mono" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-8 flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={closeSheet} className="border-border bg-background">
              Cancelar
            </Button>
            <Button
              onClick={saveClient}
              disabled={createClient.isPending || updateClient.isPending}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              <Save className="mr-2 h-4 w-4" />
              {editing ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.name.toUpperCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o cliente, suas métricas e configurações. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:opacity-90">
              Excluir cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}