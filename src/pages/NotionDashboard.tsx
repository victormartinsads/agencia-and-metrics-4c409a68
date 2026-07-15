import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useClients } from "@/hooks/useClients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStaffRoles,
  useStaffMemberRole,
  useGestorDiary,
  useSaveGestorDiary,
  useGestorTasks,
  useManageGestorTask,
  useGestorLogs,
  useGestorCalendar,
  useManageGestorCalendar,
  useAllGestorProfileMeta,
  useAllGestorClientMeta,
  useAllClientsNotionData,
  useSaveGestorClientMeta,
} from "@/hooks/useGestorDiary";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  BookOpen,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  Activity,
  Plus,
  Trash2,
  Video,
  Eye,
  TrendingUp,
  Settings,
  Heart,
  AlertTriangle,
  User,
  Users,
  Compass,
  Link2,
  ExternalLink,
  PlusCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import ClientNotionTemplate from "@/components/clients/ClientNotionTemplate";

// Helper color mappings for priority/health
const prioBg = (prio: string) => {
  if (prio === "Alta") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (prio === "Média") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
};

const healthColor = (h: number) => {
  if (h <= 3) return "text-red-400";
  if (h <= 6) return "text-yellow-400";
  return "text-emerald-400";
};

const healthBg = (h: number) => {
  if (h <= 3) return "bg-red-500/10 border-red-500/20";
  if (h <= 6) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-emerald-500/10 border-emerald-500/20";
};

export default function NotionDashboard() {
  const { user } = useAuth();
  const { data: sysRole } = useUserRole();
  const { role: currentStaffRole, isAdmin, isCeo, isDiretor } = useStaffMemberRole(user?.id);
  const canManageOthers = isAdmin || isCeo || isDiretor || sysRole?.isAdmin || sysRole?.isCeo || sysRole?.isDiretor;

  // Load clients and notion properties
  const { data: globalClients = [], isLoading: clientsLoading } = useClients({ allClientsForStaff: true });
  const { data: notionMap = {}, isLoading: notionLoading } = useAllClientsNotionData();

  // Selected gestor state
  const [selectedGestorId, setSelectedGestorId] = useState<string>("");
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list-notion"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: allMeta = [] } = useAllGestorProfileMeta();
  const { data: staffRoles = [] } = useStaffRoles();

  const gestoresList = useMemo(() => {
    return staffRoles
      .filter((r) => r.role === "gestor")
      .map((r) => {
        const p = profiles.find((prof) => prof.user_id === r.user_id);
        const meta = allMeta.find((m) => m.gestor_id === r.user_id);
        return {
          id: r.user_id,
          name: meta?.name_override || p?.full_name || p?.email?.split("@")[0] || "Gestor",
          email: p?.email || "",
        };
      });
  }, [staffRoles, profiles, allMeta]);

  const activeGestorId = useMemo(() => {
    if (!canManageOthers) return user?.id || "";
    return selectedGestorId || gestoresList[0]?.id || "";
  }, [canManageOthers, user?.id, selectedGestorId, gestoresList]);

  // Load active gestor data
  const { data: diary } = useGestorDiary(activeGestorId);
  const saveDiary = useSaveGestorDiary();
  const { data: tasks = [] } = useGestorTasks(activeGestorId);
  const { data: calendarEvents = [] } = useGestorCalendar(activeGestorId);
  const { data: healthMap = {} } = useAllGestorClientMeta(activeGestorId);

  // States for search/filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("gallery");
  const [selectedClientForModal, setSelectedClientForModal] = useState<string | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    let list = [...globalClients];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [globalClients, search]);

  const handleToggleGoal = (goalId: string) => {
    if (!diary) return;
    const updatedGoals = diary.meta_semana.map((g: any) =>
      g.id === goalId ? { ...g, done: !g.done } : g
    );
    saveDiary.mutate({ gestor_id: activeGestorId, meta_semana: updatedGoals });
  };

  const handleToggleRequest = (reqId: string) => {
    if (!diary) return;
    const updatedRequests = diary.pedidos_cliente.map((r: any) =>
      r.id === reqId ? { ...r, done: !r.done } : r
    );
    saveDiary.mutate({ gestor_id: activeGestorId, pedidos_cliente: updatedRequests });
  };

  const activeMeetings = useMemo(() => {
    return calendarEvents.filter(e => e.status !== "done").slice(0, 5);
  }, [calendarEvents]);

  return (
    <AppShell currentPage="home" header={null} noContainer>
      <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-16 selection:bg-[#2c2c2b]">
        {/* Cover Banner */}
        <div className="h-44 w-full bg-[#202020] relative border-b border-[#2c2c2b]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 to-slate-900/30 object-cover" />
          <div className="absolute -bottom-7 left-12 md:left-24 text-5xl select-none filter drop-shadow-md">
            🚀
          </div>
        </div>

        {/* Header Title Section */}
        <div className="max-w-7xl mx-auto px-6 md:px-16 pt-12 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            DASHBOARD AND
          </h1>
          <p className="text-sm text-[#9b9a97] max-w-2xl leading-relaxed">
            Área de controle da agência AND. Gerencie fichas de clientes, prioridades, saúde da conta, cronogramas operacionais e diários de gestores de forma unificada.
          </p>

          {canManageOthers && gestoresList.length > 0 && (
            <div className="flex items-center gap-3 pt-2 pb-1 text-xs">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-[#9b9a97]">Filtro de Diário:</span>
              <Select
                value={activeGestorId}
                onValueChange={(val) => setSelectedGestorId(val)}
              >
                <SelectTrigger className="h-7 w-[180px] text-xs font-semibold bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus:ring-0 focus:border-[#3f3f3e]">
                  <SelectValue placeholder="Selecione um gestor" />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                  {gestoresList.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="hover:bg-[#2c2c2b] focus:bg-[#2c2c2b]">
                      {g.name.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <hr className="border-[#2c2c2b] my-4" />
        </div>

        {/* Main Operational Body */}
        <div className="max-w-7xl mx-auto px-6 md:px-16 grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mt-6">
          
          {/* Left Columns - Clients Notion Database (Notion Board) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* View selectors & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2c2b] pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("gallery")}
                  className={`text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-md transition ${
                    activeTab === "gallery"
                      ? "bg-[#2c2c2b] text-white"
                      : "text-[#9b9a97] hover:bg-[#202020] hover:text-[#e3e2e0]"
                  }`}
                >
                  📁 Galeria (Cards)
                </button>
                <button
                  onClick={() => setActiveTab("table")}
                  className={`text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-md transition ${
                    activeTab === "table"
                      ? "bg-[#2c2c2b] text-white"
                      : "text-[#9b9a97] hover:bg-[#202020] hover:text-[#e3e2e0]"
                  }`}
                >
                  📋 Tabela Geral
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#9b9a97]" />
                <Input
                  placeholder="Pesquisar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7.5 pl-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-[#3f3f3e]"
                />
              </div>
            </div>

            {clientsLoading || notionLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs text-[#9b9a97] font-semibold">Carregando banco de dados...</span>
              </div>
            ) : (
              <>
                {/* GALLERY TAB */}
                {activeTab === "gallery" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClients.map((client) => {
                      const notionProps = notionMap[client.id]?.properties || {};
                      const clientMeta = healthMap[client.id] || {};
                      const hVal = clientMeta.health ?? 10;
                      
                      return (
                        <Card
                          key={client.id}
                          onClick={() => setSelectedClientForModal(client.id)}
                          className="bg-[#202020] border border-[#2c2c2b] rounded-xl overflow-hidden hover:border-[#3f3f3e] transition-all duration-200 cursor-pointer shadow-md group"
                        >
                          {/* Mini Cover decoration */}
                          <div className="h-10 w-full bg-gradient-to-r from-emerald-500/10 to-slate-800/20 group-hover:from-emerald-500/20 transition-all" />
                          
                          <CardHeader className="p-4 pb-2 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase">
                                {client.name}
                              </CardTitle>
                              <Badge className={`text-[9px] font-bold border rounded-full px-2 py-0 shrink-0 ${healthBg(hVal)} ${healthColor(hVal)}`}>
                                Saúde: {hVal}/10
                              </Badge>
                            </div>
                            {notionProps.prioridade && (
                              <Badge className={`text-[8px] font-bold tracking-wider border rounded-full px-2 py-0 ${prioBg(notionProps.prioridade)}`}>
                                PRIORIDADE {notionProps.prioridade.toUpperCase()}
                              </Badge>
                            )}
                          </CardHeader>
                          
                          <CardContent className="p-4 pt-0 space-y-2 text-[11px] text-[#9b9a97]">
                            <div className="grid grid-cols-1 gap-1 border-t border-[#2c2c2b]/50 pt-2.5 font-mono">
                              {notionProps.whatsapp && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] text-[9px] w-20">📞 WHATSAPP:</span>
                                  <span className="text-[#e3e2e0] truncate">{notionProps.whatsapp}</span>
                                </div>
                              )}
                              {notionProps.email && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] text-[9px] w-20">📧 EMAIL:</span>
                                  <span className="text-[#e3e2e0] truncate">{notionProps.email}</span>
                                </div>
                              )}
                              {notionProps.vencimento && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] text-[9px] w-20">📅 CONTRATO:</span>
                                  <span className="text-yellow-400 font-bold">{notionProps.vencimento}</span>
                                </div>
                              )}
                              {notionProps.mes_trafego && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] text-[9px] w-20">💰 ORÇAMENTO:</span>
                                  <span className="text-[#e3e2e0]">{notionProps.mes_trafego} /mês</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {filteredClients.length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-[#202020] rounded-xl border border-[#2c2c2b] border-dashed">
                        <span className="text-xs text-[#9b9a97]">Nenhum cliente correspondente encontrado.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TABLE TAB */}
                {activeTab === "table" && (
                  <div className="bg-[#202020] border border-[#2c2c2b] rounded-xl overflow-hidden shadow-md max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-[#262625] border-b border-[#2c2c2b]">
                        <TableRow className="hover:bg-transparent border-b border-[#2c2c2b]">
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">Cliente</TableHead>
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">Prioridade</TableHead>
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">WhatsApp</TableHead>
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">Contrato Vence</TableHead>
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">Faturamento</TableHead>
                          <TableHead className="text-[#9b9a97] font-bold text-xs uppercase">Ficha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => {
                          const notionProps = notionMap[client.id]?.properties || {};
                          return (
                            <TableRow key={client.id} className="hover:bg-[#262625] border-b border-[#2c2c2b]/50">
                              <TableCell className="font-extrabold text-xs text-white uppercase">{client.name}</TableCell>
                              <TableCell>
                                {notionProps.prioridade ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${prioBg(notionProps.prioridade)}`}>
                                    {notionProps.prioridade}
                                  </span>
                                ) : (
                                  <span className="text-[#5f5e5b] italic text-xs">Vazio</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-[#e3e2e0]">{notionProps.whatsapp || "-"}</TableCell>
                              <TableCell className="text-xs text-yellow-400 font-bold font-mono">{notionProps.vencimento || "-"}</TableCell>
                              <TableCell className="text-xs text-[#e3e2e0] font-mono">{notionProps.mes_trafego || "-"}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedClientForModal(client.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Columns - Operational Diaries (Notion Callouts) */}
          <div className="space-y-6">
            
            {/* Calendar Widget */}
            <Card className="bg-[#202020] border border-[#2c2c2b] rounded-xl shadow-md overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-[#2c2c2b]">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Próximas Reuniões ({activeMeetings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {activeMeetings.map((e) => (
                  <div key={e.id} className="p-3 bg-[#262625] border border-[#2c2c2b]/60 rounded-lg hover:border-[#3f3f3e] transition text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-[#e3e2e0] leading-snug">{e.title}</span>
                      <span className="text-[10px] text-primary font-mono font-bold shrink-0">
                        {e.date ? e.date.split("T")[0] : ""}
                      </span>
                    </div>
                    {e.meet_link && (
                      <a
                        href={e.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition"
                      >
                        <Video className="h-3 w-3" /> Entrar no Google Meet
                      </a>
                    )}
                  </div>
                ))}
                {activeMeetings.length === 0 && (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4">Sem reuniões pendentes.</p>
                )}
              </CardContent>
            </Card>

            {/* Notion Callout Style: Metas da Semana */}
            <div className="bg-[#262625] border border-[#2c2c2b] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#e3e2e0]">
                ⚡ Metas Operacionais da Semana
              </div>
              <div className="space-y-2 border-t border-[#2c2c2b] pt-3">
                {diary?.meta_semana && diary.meta_semana.length > 0 ? (
                  diary.meta_semana.map((g: any) => (
                    <div
                      key={g.id}
                      onClick={() => handleToggleGoal(g.id)}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {g.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition" />
                      )}
                      <span className={`leading-snug ${g.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"}`}>
                        {g.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic py-2">Nenhuma meta adicionada para esta semana.</p>
                )}
              </div>
            </div>

            {/* Notion Callout Style: Pedidos de Clientes */}
            <div className="bg-[#202020] border border-[#2c2c2b] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#e3e2e0]">
                📋 Pedidos para o Cliente
              </div>
              <div className="space-y-2 border-t border-[#2c2c2b] pt-3">
                {diary?.pedidos_cliente && diary.pedidos_cliente.length > 0 ? (
                  diary.pedidos_cliente.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => handleToggleRequest(r.id)}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {r.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition" />
                      )}
                      <span className={`leading-snug ${r.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"}`}>
                        {r.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic py-2">Sem pedidos pendentes.</p>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Floating Modal for Client Notion Template Details */}
        <Dialog
          open={selectedClientForModal !== null}
          onOpenChange={(open) => !open && setSelectedClientForModal(null)}
        >
          <DialogContent className="max-w-6xl w-[90vw] bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] overflow-y-auto max-h-[85vh] p-6 shadow-2xl blocknote-editor-wrapper">
            {selectedClientForModal && (
              <ClientNotionTemplate
                clientId={selectedClientForModal}
                canManage={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
