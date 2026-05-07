import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useMyAssignments, useToggleAssignment } from "@/hooks/useClientAssignments";
import { motion } from "framer-motion";
import { BarChart3, Plus, Users, ArrowRight, Star, Search, Link2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";

const Index = () => {
  const { data: clients, isLoading } = useClients();
  const { data: assignments } = useMyAssignments();
  const toggle = useToggleAssignment();
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [search, setSearch] = useState("");

  const favoriteIds = useMemo(
    () => new Set((assignments || []).map((a) => a.client_id)),
    [assignments],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clients || [];
    if (tab === "mine") list = list.filter((c) => favoriteIds.has(c.id));
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    return list;
  }, [clients, tab, favoriteIds, search]);

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

  const handleCopyPublicLink = async (e: React.MouseEvent, slugOrId: string) => {
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

  const header = (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie e acompanhe todos os seus clientes
        </p>
      </div>
      <Link to="/clients">
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </Link>
    </div>
  );

  return (
    <AppShell currentPage="dashboard" header={header}>
      <div className="space-y-6">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-16">Carregando...</p>
        ) : !clients?.length ? (
          <div className="text-center py-20 space-y-4">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground">Nenhum cliente cadastrado</h2>
            <p className="text-muted-foreground text-sm">Adicione seu primeiro cliente com o token da Meta API</p>
            <Link to="/clients">
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Cliente
              </Button>
            </Link>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "all")} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="mine" className="gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Meus Clientes
                  <Badge variant="secondary" className="ml-1 text-[10px]">{favoriteIds.size}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Todos
                  <Badge variant="secondary" className="ml-1 text-[10px]">{clients.length}</Badge>
                </TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            <TabsContent value={tab} className="mt-0">
              {filteredClients.length === 0 ? (
                <div className="text-center py-16 space-y-3 border border-dashed border-border rounded-xl">
                  <Star className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {tab === "mine"
                      ? "Você ainda não favoritou nenhum cliente. Vá em \"Todos\" e clique na estrela."
                      : "Nenhum cliente encontrado."}
                  </p>
                  {tab === "mine" && (
                    <Button size="sm" variant="outline" onClick={() => setTab("all")}>
                      Ver todos os clientes
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredClients.map((c, i) => {
                    const isFav = favoriteIds.has(c.id);
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="relative">
                        <Link to={`/dashboard/${c.id}`}>
                          <Card className="p-5 hover:shadow-elevated hover:border-primary/40 transition-all cursor-pointer group relative bg-card">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFav(e, c.id)}
                              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-accent transition-colors"
                              title={isFav ? "Remover dos meus clientes" : "Adicionar aos meus clientes"}
                            >
                              <Star
                                className={`h-4 w-4 transition-colors ${
                                  isFav ? "fill-primary text-primary" : "text-muted-foreground"
                                }`}
                              />
                            </button>
                            <div className="flex items-start justify-between mb-4 pr-8">
                              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {c.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="font-semibold text-card-foreground mb-1 uppercase truncate">{c.name}</h3>
                            <p className="text-xs text-muted-foreground mb-3">
                              {c.ad_account_ids.length} conta{c.ad_account_ids.length !== 1 ? "s" : ""} de anúncio
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.ad_account_ids.slice(0, 3).map((aid) => (
                                <Badge key={aid} variant="secondary" className="text-[10px] font-mono">
                                  {aid}
                                </Badge>
                              ))}
                              {c.ad_account_ids.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">+{c.ad_account_ids.length - 3}</Badge>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPublicLink(e, c.slug || c.id)}
                              className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-md py-2 transition-colors"
                              title="Copiar link de visualização aberta para o cliente"
                            >
                              <Link2 className="h-3 w-3" />
                              Copiar link público do cliente
                            </button>
                          </Card>
                        </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                  {tab === "all" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <Link to="/clients">
                        <Card className="p-5 border-dashed hover:border-primary/30 transition-all cursor-pointer flex flex-col items-center justify-center h-full min-h-[140px]">
                          <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          <span className="text-sm text-muted-foreground">Adicionar Cliente</span>
                        </Card>
                      </Link>
                    </motion.div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
};

export default Index;
