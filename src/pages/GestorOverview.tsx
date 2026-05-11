import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Brain, Search, Star, Loader2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useClients } from "@/hooks/useClients";
import { useMyAssignments, useToggleAssignment } from "@/hooks/useClientAssignments";
import { useGestorOverview } from "@/hooks/useGestorOverview";
import { ClientOverviewCard } from "@/components/gestor/ClientOverviewCard";

const periods = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
];

export default function GestorOverview() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: clients } = useClients();
  const { data: assignments } = useMyAssignments();
  const toggleAssign = useToggleAssignment();

  const [period, setPeriod] = useState("last_7d");
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const favoriteIds = useMemo(
    () => new Set((assignments || []).map((a) => a.client_id)),
    [assignments]
  );

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let list = clients;
    if (favOnly) list = list.filter((c) => favoriteIds.has(c.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [clients, favOnly, favoriteIds, search]);

  const { data: overview, isLoading } = useGestorOverview(filteredClients as any, period);

  const sortedClients = useMemo(() => {
    const map = new Map((overview || []).map((o) => [o.clientId, o]));
    return [...filteredClients].sort((a, b) => {
      const af = favoriteIds.has(a.id) ? 1 : 0;
      const bf = favoriteIds.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      const ao = map.get(a.id);
      const bo = map.get(b.id);
      const ah = (ao?.alerts.filter((x) => x.severity === "high").length || 0);
      const bh = (bo?.alerts.filter((x) => x.severity === "high").length || 0);
      if (ah !== bh) return bh - ah;
      const aa = ao?.alerts.length || 0;
      const ba = bo?.alerts.length || 0;
      if (aa !== ba) return ba - aa;
      return a.name.localeCompare(b.name);
    });
  }, [filteredClients, overview, favoriteIds]);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!role?.isAdmin && !role?.isEditor) return <Navigate to="/" replace />;

  const overviewMap = new Map((overview || []).map((o) => [o.clientId, o]));

  const header = (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-elevated)]">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">
            Visão do <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Gestor</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">Todos os clientes · alertas em tempo real</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="h-9 pl-8 w-[200px] text-xs"
          />
        </div>
        <Button
          size="sm"
          variant={favOnly ? "default" : "outline"}
          onClick={() => setFavOnly((v) => !v)}
          className="h-9 gap-1.5"
        >
          <Star className={`h-3.5 w-3.5 ${favOnly ? "fill-current" : ""}`} />
          Favoritos
        </Button>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AppShell currentPage="manager" header={header} noContainer>
      <main className="max-w-[1500px] mx-auto px-4 md:px-6 py-5">
        {!filteredClients.length ? (
          <Card className="p-12 text-center text-muted-foreground text-sm rounded-2xl">
            {favOnly ? "Você ainda não favoritou nenhum cliente." : "Nenhum cliente encontrado."}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedClients.map((c) => (
              <ClientOverviewCard
                key={c.id}
                clientId={c.id}
                clientName={c.name}
                currencySymbol={c.currency_symbol}
                isFavorite={favoriteIds.has(c.id)}
                onToggleFavorite={() =>
                  toggleAssign.mutate({ clientId: c.id, assigned: !favoriteIds.has(c.id) })
                }
                data={overviewMap.get(c.id)}
                isLoading={isLoading && !overviewMap.has(c.id)}
              />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}