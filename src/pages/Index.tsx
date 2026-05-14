import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Search, Star, ArrowUpRight, Sparkles, Users,
  KanbanSquare, Activity, ExternalLink, Copy,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/useClients";
import { useMyAssignments, useToggleAssignment } from "@/hooks/useClientAssignments";
import { useClientOrgs } from "@/hooks/useClientCrm";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export default function Index() {
  const { data: clients, isLoading } = useClients();
  const { data: assignments } = useMyAssignments();
  const { data: clientOrgs } = useClientOrgs();
  const toggle = useToggleAssignment();
  const { user } = useAuth();
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [search, setSearch] = useState("");

  const favoriteIds = useMemo(
    () => new Set((assignments || []).map((a) => a.client_id)),
    [assignments],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clients || [];
    if (tab === "mine") list = list.filter((c) => favoriteIds.has(c.id));
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    return list;
  }, [clients, tab, favoriteIds, search]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  }).format(new Date());
  const userName = (user?.email?.split("@")[0] || "").split(".")[0];

  const handleToggleFav = async (e: React.MouseEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = favoriteIds.has(clientId);
    try {
      await toggle.mutateAsync({ clientId, assigned: !isFav });
      toast.success(isFav ? "Removido dos meus clientes" : "Adicionado aos meus clientes");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar");
    }
  };

  const copyShareLink = async (e: React.MouseEvent, slugOrId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/share/${slugOrId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado!", { description: url });
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <AppShell currentPage="dashboard">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Greeting header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{today}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {greeting}{userName ? `, ${userName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients?.length ?? 0} clientes na base · {favoriteIds.size} favoritados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="border-border bg-surface hover:bg-surface-elevated">
              <Link to="/crm-app"><KanbanSquare className="mr-2 h-4 w-4" />Abrir CRM</Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:opacity-90 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.7)]"
            >
              <Link to="/clients"><Plus className="mr-2 h-4 w-4" />Novo cliente</Link>
            </Button>
          </div>
        </motion.header>

        {/* Toolbar (filter + search) */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="mt-8 flex flex-wrap items-center gap-2"
        >
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            {[
              { id: "mine", label: `Meus (${favoriteIds.size})` },
              { id: "all", label: `Todos (${clients?.length ?? 0})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTab(f.id as "mine" | "all")}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === f.id
                    ? "bg-surface-elevated text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="border-border bg-surface pl-9 placeholder:text-muted-foreground"
              aria-label="Buscar clientes"
            />
          </div>
        </motion.section>

        {/* Clients */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {tab === "mine" ? "Meus clientes" : "Todos os clientes"}
            </h2>
            <Link
              to="/clients"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Gerenciar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-center py-16">Carregando…</p>
          ) : !clients?.length ? (
            <Card className="border-dashed border-border bg-transparent p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">Nenhum cliente cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adicione seu primeiro cliente com o token da Meta API.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/clients"><Plus className="h-4 w-4 mr-1" /> Adicionar cliente</Link>
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed border-border bg-transparent p-12 text-center">
              <Star className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {tab === "mine"
                  ? "Você ainda não favoritou nenhum cliente. Vá em \"Todos\" e clique na estrela."
                  : "Nenhum cliente encontrado."}
              </p>
              {tab === "mine" && (
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setTab("all")}>
                  Ver todos os clientes
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c, i) => {
                const isFav = favoriteIds.has(c.id);
                const hasCrm = !!clientOrgs?.[c.id];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link to={`/dashboard/${c.id}`} className="block">
                      <Card className="group relative overflow-hidden border-0 bg-surface p-4 transition-all hover:bg-surface-elevated hover:shadow-[0_10px_40px_-16px_hsl(var(--primary)/0.4)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary/30 to-[hsl(152_69%_45%)]/30 font-mono text-sm font-semibold text-foreground">
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground uppercase">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {c.ad_account_ids.length} conta{c.ad_account_ids.length !== 1 ? "s" : ""} de anúncio
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleToggleFav(e, c.id)}
                            aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-warning"
                          >
                            <Star className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 bg-primary/10 text-primary"
                          >
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
                          <span className="truncate">/{c.slug || c.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => copyShareLink(e, c.slug || c.id)}
                              aria-label="Copiar link público"
                              className="rounded p-1.5 hover:bg-background hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <a
                              href={`/share/${c.slug || c.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Abrir dashboard público"
                              className="rounded p-1.5 hover:bg-background hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        <p className="mt-12 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Insights Hub · Agência AND
        </p>
      </div>
    </AppShell>
  );
}