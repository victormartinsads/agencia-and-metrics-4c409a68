import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyAssignments, useToggleAssignment } from "@/hooks/useClientAssignments";
import { motion } from "framer-motion";
import { BarChart3, Plus, Users, Settings, ArrowRight, Shield, Star, Search, KanbanSquare, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const Index = () => {
  const { data: clients, isLoading } = useClients();
  const { data: role } = useUserRole();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meta Ads Dashboard</h1>
              <p className="text-sm text-muted-foreground">Acompanhe seus clientes ou explore todos da agência</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/crm-app">
              <Button variant="outline" size="sm">
                <KanbanSquare className="h-4 w-4 mr-1" /> CRM
              </Button>
            </Link>
            {role?.isAdmin && (
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-1" /> Configurações
                </Button>
              </Link>
            )}
            <Link to="/clients">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" /> Gerenciar Clientes
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "all")} className="space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <Card className="p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group relative">
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
                            <div className="flex items-start justify-between mb-3 pr-8">
                              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-accent-foreground" />
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="font-semibold text-card-foreground mb-1 uppercase">{c.name}</h3>
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
                              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-md py-1.5 transition-colors"
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
      </main>
    </div>
  );
};

export default Index;
