import { useMemo, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Brain, Search, Star, Loader2, Heart, DollarSign, TrendingUp, AlertTriangle, FileSpreadsheet } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllClientManagerMeta } from "@/hooks/useClientManagerMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useStaffMemberRole } from "@/hooks/useGestorDiary";

const periods = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
];

function SpreadsheetRow({ client, initialGoal, onSaveGoal, onSaveRevenue }: any) {
  const [localGoal, setLocalGoal] = useState(initialGoal !== null ? String(initialGoal) : "");
  const [localRev, setLocalRev] = useState(client.monthly_revenue !== null ? String(client.monthly_revenue) : "");

  useEffect(() => {
    setLocalGoal(initialGoal !== null ? String(initialGoal) : "");
  }, [initialGoal]);

  useEffect(() => {
    setLocalRev(client.monthly_revenue !== null ? String(client.monthly_revenue) : "");
  }, [client.monthly_revenue]);

  const handleBlurGoal = () => {
    const val = localGoal.trim() === "" ? null : Number(localGoal);
    if (val !== initialGoal) {
      onSaveGoal(client.id, val);
    }
  };

  const handleBlurRev = () => {
    const val = localRev.trim() === "" ? null : Number(localRev);
    if (val !== client.monthly_revenue) {
      onSaveRevenue(client.id, val);
    }
  };

  return (
    <TableRow key={client.id} className="hover:bg-accent/10 border-b border-white/5 text-xs">
      <TableCell className="font-extrabold select-none uppercase tracking-tight text-foreground">{client.name}</TableCell>
      <TableCell>
        <input
          type="number"
          value={localRev}
          onChange={(e) => setLocalRev(e.target.value)}
          onBlur={handleBlurRev}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="0"
          className="bg-accent/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary/40 outline-none w-full max-w-[140px] font-mono text-[13px] font-bold"
        />
      </TableCell>
      <TableCell>
        <input
          type="number"
          value={localGoal}
          onChange={(e) => setLocalGoal(e.target.value)}
          onBlur={handleBlurGoal}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="0"
          className="bg-accent/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary/40 outline-none w-full max-w-[140px] font-mono text-[13px] font-bold"
        />
      </TableCell>
    </TableRow>
  );
}

export default function GestorOverview({ isHomePage = false }: { isHomePage?: boolean } = {}) {
  const { user } = useAuth();
  const staffRole = useStaffMemberRole(user?.id);
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: clients } = useClients();
  const { data: assignments } = useMyAssignments();
  const toggleAssign = useToggleAssignment();
  const { data: healthMap } = useAllClientManagerMeta();
  const qc = useQueryClient();

  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);

  // Load clients assigned to the gestor if the logged-in user is a gestor
  const { data: gestorAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["gestor-assignments", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_assignments")
        .select("client_id")
        .eq("user_id", user?.id);
      return data || [];
    },
    enabled: !!user?.id && !!staffRole.isGestor,
  });

  // Load monthly revenue goals for all clients
  const { data: allConfigs } = useQuery({
    queryKey: ["all-sheet-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dashboard_sheet_config")
        .select("client_id, monthly_revenue_goal");
      return data || [];
    }
  });

  const goalsMap = useMemo(() => {
    const map = new Map<string, number>();
    (allConfigs || []).forEach((c: any) => {
      if (c.monthly_revenue_goal !== null) {
        map.set(c.client_id, Number(c.monthly_revenue_goal));
      }
    });
    return map;
  }, [allConfigs]);

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
    
    // Gestores can access all clients, but they only see their assigned ones in their overview dashboard
    if (staffRole.isGestor && gestorAssignments) {
      const assignedIds = new Set(gestorAssignments.map((a: any) => a.client_id).filter(Boolean));
      list = list.filter((c) => assignedIds.has(c.id));
    }

    if (favOnly) list = list.filter((c) => favoriteIds.has(c.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [clients, favOnly, favoriteIds, search, staffRole.isGestor, gestorAssignments]);

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

  const handleSaveGoal = async (clientId: string, goal: number | null) => {
    try {
      const { data: existing } = await (supabase as any)
        .from("dashboard_sheet_config")
        .select("client_id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("dashboard_sheet_config")
          .update({ monthly_revenue_goal: goal })
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("dashboard_sheet_config")
          .insert({
            client_id: clientId,
            monthly_revenue_goal: goal,
            spreadsheet_id: "placeholder"
          });
        if (error) throw error;
      }
      toast.success("Meta de faturamento atualizada!");
      qc.invalidateQueries({ queryKey: ["all-sheet-configs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-sheet", clientId] });
    } catch (e: any) {
      toast.error("Erro ao atualizar meta: " + e.message);
    }
  };

  const handleSaveRevenue = async (clientId: string, revenue: number | null) => {
    try {
      await supabase
        .from("clients")
        .update({ monthly_revenue: revenue })
        .eq("id", clientId);
      toast.success("Faturamento atualizado!");
      qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (e: any) {
      toast.error("Erro ao atualizar faturamento: " + e.message);
    }
  };

  const summaryStats = useMemo(() => {
    if (!filteredClients.length || !overview) {
      return { avgHealth: null, totalSpend: 0, totalConversions: 0, totalAlerts: 0 };
    }

    const overviewMap = new Map((overview || []).map((o) => [o.clientId, o]));
    let totalHealth = 0;
    let healthCount = 0;
    let totalSpend = 0;
    let totalConversions = 0;
    let totalAlerts = 0;

    filteredClients.forEach((c) => {
      const oData = overviewMap.get(c.id);
      if (oData) {
        totalSpend += oData.totalSpend || 0;
        totalConversions += oData.totalConversions || 0;
        totalAlerts += oData.alerts?.length || 0;
      }
      
      const health = healthMap?.[c.id];
      if (health !== undefined && health !== null) {
        totalHealth += health;
        healthCount++;
      }
    });

    return {
      avgHealth: healthCount > 0 ? totalHealth / healthCount : null,
      totalSpend,
      totalConversions,
      totalAlerts,
    };
  }, [filteredClients, overview, healthMap]);

  const isAllowed = role?.isAdmin || role?.isCeo || role?.isDiretor || role?.isGestor;

  const overviewMap = new Map((overview || []).map((o) => [o.clientId, o]));

  if (roleLoading || (role?.isGestor && assignmentsLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAllowed) return <Navigate to="/" replace />;

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
          <p className="text-[11px] text-muted-foreground">
            {role?.isGestor ? "Seus clientes atribuídos" : "Todos os clientes"} · alertas em tempo real
          </p>
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsSpreadsheetOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold bg-black/40 backdrop-blur-xl border border-white/5 shadow-lg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:bg-accent/40"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
          Faturamento
        </Button>
      </div>
    </div>
  );

  return (
    <AppShell currentPage={isHomePage ? "home" : "manager"} header={header} noContainer>
      <main className="max-w-[1500px] mx-auto px-4 md:px-6 py-5 space-y-6">
        {/* Painel de Métricas Resumidas (Premium) */}
        {filteredClients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saúde Média */}
            <Card className="relative overflow-hidden p-4 bg-black/40 backdrop-blur-xl backdrop-blur-md border-border/50 shadow-[var(--shadow-card)] flex items-center gap-4 group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-5 w-5 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saúde Média</p>
                <p className="text-xl font-extrabold font-display mt-0.5 tracking-tight text-emerald-400">
                  {summaryStats.avgHealth !== null ? `${summaryStats.avgHealth.toFixed(1)}/10` : "—"}
                </p>
              </div>
            </Card>

            {/* Investimento Total */}
            <Card className="relative overflow-hidden p-4 bg-black/40 backdrop-blur-xl backdrop-blur-md border-border/50 shadow-[var(--shadow-card)] flex items-center gap-4 group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Investimento Total</p>
                <p className="text-xl font-extrabold font-display mt-0.5 tracking-tight text-foreground">
                  R$ {summaryStats.totalSpend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </Card>

            {/* Conversões */}
            <Card className="relative overflow-hidden p-4 bg-black/40 backdrop-blur-xl backdrop-blur-md border-border/50 shadow-[var(--shadow-card)] flex items-center gap-4 group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Conversões</p>
                <p className="text-xl font-extrabold font-display mt-0.5 tracking-tight text-foreground">
                  {summaryStats.totalConversions.toLocaleString("pt-BR")}
                </p>
              </div>
            </Card>

            {/* Alertas Ativos */}
            <Card className="relative overflow-hidden p-4 bg-black/40 backdrop-blur-xl backdrop-blur-md border-border/50 shadow-[var(--shadow-card)] flex items-center gap-4 group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alertas Ativos</p>
                <p className={`text-xl font-extrabold font-display mt-0.5 tracking-tight ${summaryStats.totalAlerts > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                  {summaryStats.totalAlerts}
                </p>
              </div>
            </Card>
          </div>
        )}

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
                monthlyRevenueGoal={goalsMap.get(c.id) ?? null}
                adAccountId={c.ad_account_ids && c.ad_account_ids.length > 0 ? c.ad_account_ids[0] : null}
              />
            ))}
          </div>
        )}
      </main>

      {/* Spreadsheet Dialog Modal for Monthly Revenue and Goals */}
      <Dialog open={isSpreadsheetOpen} onOpenChange={setIsSpreadsheetOpen}>
        <DialogContent className="max-w-4xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-lg-white/5 shadow-2xl">
          <DialogHeader className="border-b border-white/5 pb-3">
            <DialogTitle className="uppercase tracking-wider flex items-center gap-2 text-sm font-bold text-foreground select-none">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              Faturamento Mensal por Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] mt-4 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl shadow-[var(--shadow-card)]">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                  <TableHead className="font-extrabold uppercase text-[10px] text-muted-foreground select-none">Cliente</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] text-muted-foreground select-none">Faturamento Atual (R$)</TableHead>
                  <TableHead className="font-extrabold uppercase text-[10px] text-muted-foreground select-none">Meta de Faturamento (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client) => (
                  <SpreadsheetRow
                    key={client.id}
                    client={client}
                    initialGoal={goalsMap.get(client.id) ?? null}
                    onSaveGoal={handleSaveGoal}
                    onSaveRevenue={handleSaveRevenue}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}