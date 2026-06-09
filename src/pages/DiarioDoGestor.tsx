import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import GestorNotionTemplate from "@/components/gestor/GestorNotionTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
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
  useManageGestorLog,
  useGestorClients,
  useManageGestorClient,
  useGestorCalendar,
  useManageGestorCalendar,
  type GestorDiaryTask,
  type GestorDiaryLog,
  type GestorDiaryClient,
  type GestorDiaryCalendarEvent,
} from "@/hooks/useGestorDiary";
import { useGestorAssignments } from "@/hooks/useGestorAssignments";
import { useMembers } from "@/hooks/useMembers";
import { useClients } from "@/hooks/useClients";
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
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User,
  Activity,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Settings,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function DiarioDoGestor() {
  const { user } = useAuth();
  const { data: sysRole } = useUserRole();
  
  // Current user custom staff role
  const {
    role: currentStaffRole,
    isAdmin,
    isCeo,
    isGerente,
    isGestor,
  } = useStaffMemberRole(user?.id);

  // Can manage other diaries
  const canManageOthers = isAdmin || isCeo || isGerente || sysRole?.isAdmin;

  // Active members
  const { data: members = [] } = useMembers();

  // Load global active clients list
  const { data: globalClients = [] } = useClients();

  // Load all user profiles to map names/avatars/jobs
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  // Get active roles of staff to filter "Gestores"
  const { data: staffRoles = [] } = useStaffRoles();

  // Gestores list
  const gestoresList = useMemo(() => {
    return members
      .filter((m) => {
        const uRole = staffRoles.find((r) => r.user_id === m.id);
        return uRole?.role === "gestor";
      })
      .map((m) => {
        const profile = profiles.find((p) => p.user_id === m.id);
        return {
          id: m.id,
          email: m.email,
          name: profile?.full_name || m.email.split("@")[0],
          avatar: profile?.avatar_url || null,
        };
      });
  }, [members, staffRoles, profiles]);

  // Selected gestor state
  const [selectedGestorId, setSelectedGestorId] = useState<string>("");

  // Determine active gestor ID being viewed
  const activeGestorId = useMemo(() => {
    if (!canManageOthers) {
      return user?.id || "";
    }
    return selectedGestorId || gestoresList[0]?.id || "";
  }, [canManageOthers, user?.id, selectedGestorId, gestoresList]);

  // Active gestor profile details
  const activeGestor = useMemo(() => {
    const profile = profiles.find((p) => p.user_id === activeGestorId);
    const member = members.find((m) => m.id === activeGestorId);
    const uRole = staffRoles.find((r) => r.user_id === activeGestorId);
    
    return {
      id: activeGestorId,
      name: profile?.full_name || member?.email?.split("@")[0] || "Gestor",
      email: member?.email || "",
      avatar: profile?.avatar_url || null,
      roleName: uRole?.role || "gestor",
      created_at: profile?.created_at,
    };
  }, [activeGestorId, profiles, members, staffRoles]);

  // ----------------------------------------------------
  // DIARY MUTATIONS & HOOKS
  // ----------------------------------------------------
  const { data: diary } = useGestorDiary(activeGestorId);
  const saveDiary = useSaveGestorDiary();

  const { data: tasks = [] } = useGestorTasks(activeGestorId);
  const manageTask = useManageGestorTask();

  const { data: logs = [] } = useGestorLogs(activeGestorId);
  const manageLog = useManageGestorLog();

  const { data: gestorClients = [] } = useGestorAssignments(activeGestorId);
  // manageClient is kept if needed elsewhere, otherwise we can ignore it
  const manageClient = useManageGestorClient();

  const { data: calendarEvents = [] } = useGestorCalendar(activeGestorId);
  const manageCalendar = useManageGestorCalendar();

  // ----------------------------------------------------
  // SUB-COMPONENTS/HANDLERS
  // ----------------------------------------------------
  
  // Weekly goals / client requests logic
  const [newGoalText, setNewGoalText] = useState("");
  const handleAddGoal = () => {
    if (!newGoalText.trim() || !diary) return;
    const updatedGoals = [
      ...(diary.meta_semana || []),
      { id: `goal-${Date.now()}`, text: newGoalText.trim(), done: false },
    ];
    saveDiary.mutate({ gestor_id: activeGestorId, meta_semana: updatedGoals });
    setNewGoalText("");
  };

  const handleToggleGoal = (goalId: string) => {
    if (!diary) return;
    const updatedGoals = diary.meta_semana.map((g) =>
      g.id === goalId ? { ...g, done: !g.done } : g
    );
    saveDiary.mutate({ gestor_id: activeGestorId, meta_semana: updatedGoals });
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!diary) return;
    const updatedGoals = diary.meta_semana.filter((g) => g.id !== goalId);
    saveDiary.mutate({ gestor_id: activeGestorId, meta_semana: updatedGoals });
  };

  // Pedidos ao cliente
  const [newRequestText, setNewRequestText] = useState("");
  const handleAddRequest = () => {
    if (!newRequestText.trim() || !diary) return;
    const updatedRequests = [
      ...(diary.pedidos_cliente || []),
      { id: `req-${Date.now()}`, text: newRequestText.trim(), done: false },
    ];
    saveDiary.mutate({ gestor_id: activeGestorId, pedidos_cliente: updatedRequests });
    setNewRequestText("");
  };

  const handleToggleRequest = (reqId: string) => {
    if (!diary) return;
    const updatedRequests = diary.pedidos_cliente.map((r) =>
      r.id === reqId ? { ...r, done: !r.done } : r
    );
    saveDiary.mutate({ gestor_id: activeGestorId, pedidos_cliente: updatedRequests });
  };

  const handleDeleteRequest = (reqId: string) => {
    if (!diary) return;
    const updatedRequests = diary.pedidos_cliente.filter((r) => r.id !== reqId);
    saveDiary.mutate({ gestor_id: activeGestorId, pedidos_cliente: updatedRequests });
  };

  // Routine Checklist Tasks
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTag, setNewTaskTag] = useState("Campanha");
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    manageTask.mutate({
      action: "insert",
      task: { gestor_id: activeGestorId, title: newTaskTitle.trim(), tag: newTaskTag },
    }, {
      onSuccess: () => toast.success("Tarefa adicionada!"),
      onError: (err: any) => toast.error("Erro ao adicionar tarefa: " + (err.message || "Erro desconhecido"))
    });
    setNewTaskTitle("");
  };

  const handleToggleTask = (task: GestorDiaryTask) => {
    manageTask.mutate({
      action: "update",
      task: {
        gestor_id: activeGestorId,
        id: task.id,
        status: task.status === "done" ? "pending" : "done",
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    manageTask.mutate({
      action: "delete",
      task: { gestor_id: activeGestorId, id: taskId },
    });
  };

  // Daily log notes
  const [newLogContent, setNewLogContent] = useState("");
  const [newLogIcon, setNewLogIcon] = useState("Activity");
  const handleAddLog = () => {
    if (!newLogContent.trim()) return;
    manageLog.mutate({
      action: "insert",
      log: {
        gestor_id: activeGestorId,
        content: newLogContent.trim(),
        icon: newLogIcon,
        date: new Date().toISOString().split("T")[0],
      },
    });
    setNewLogContent("");
  };

  const handleDeleteLog = (logId: string) => {
    manageLog.mutate({
      action: "delete",
      log: { gestor_id: activeGestorId, id: logId },
    });
  };

  // Clients
  const [selectedClientToLink, setSelectedClientToLink] = useState("");
  const [newClientStatus, setNewClientStatus] = useState<"Pendente" | "Configurando" | "Em andamento">("Pendente");
  const handleAddClient = () => {
    if (!selectedClientToLink) {
      toast.error("Selecione um cliente para vincular!");
      return;
    }
    const clientObj = globalClients.find((c) => c.id === selectedClientToLink);
    if (!clientObj) return;

    manageClient.mutate({
      action: "insert",
      item: {
        gestor_id: activeGestorId,
        client_name: clientObj.name,
        status: newClientStatus,
        client_id: clientObj.id,
      },
    });
    setSelectedClientToLink("");
  };

  const handleUpdateClientStatus = (clientId: string, status: "Pendente" | "Configurando" | "Em andamento") => {
    manageClient.mutate({
      action: "update",
      item: { gestor_id: activeGestorId, id: clientId, status },
    });
  };

  const handleDeleteClient = (clientId: string) => {
    manageClient.mutate({
      action: "delete",
      item: { gestor_id: activeGestorId, id: clientId },
    });
  };

  // Calendar Logic
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarInputOpen, setCalendarInputOpen] = useState(false);
  const [calendarInputTitle, setCalendarInputTitle] = useState("");
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(null);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const startOffset = useMemo(() => {
    if (daysInMonth.length === 0) return 0;
    return daysInMonth[0].getDay();
  }, [daysInMonth]);

  const monthName = currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (dayNum: number) => {
    setCalendarSelectedDay(dayNum);
    setCalendarInputOpen(true);
  };

  const handleAddCalendarEvent = () => {
    if (!calendarInputTitle.trim() || calendarSelectedDay === null) return;
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const day = String(calendarSelectedDay).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    manageCalendar.mutate({
      action: "insert",
      event: { gestor_id: activeGestorId, date: dateStr, title: calendarInputTitle.trim() },
    });

    setCalendarInputTitle("");
    setCalendarInputOpen(false);
    setCalendarSelectedDay(null);
  };

  const handleToggleCalendarEvent = (event: GestorDiaryCalendarEvent) => {
    manageCalendar.mutate({
      action: "update",
      event: {
        gestor_id: activeGestorId,
        id: event.id,
        status: event.status === "done" ? "pending" : "done",
      },
    });
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    manageCalendar.mutate({
      action: "delete",
      event: { gestor_id: activeGestorId, id: eventId },
    });
  };

  // Helper icons mapper for log notes
  const getLogIcon = (iconName?: string) => {
    switch (iconName) {
      case "Flame":
        return <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />;
      case "Settings":
        return <Settings className="h-4 w-4 text-primary" />;
      case "MessageSquare":
        return <MessageSquare className="h-4 w-4 text-sky-500" />;
      default:
        return <Activity className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <AppShell currentPage="manager" header={null}>
      <div className="min-h-screen bg-background pb-12">
        
        {/* Superior selector (Admins/CEOs/Gerentes only) */}
        {canManageOthers && gestoresList.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-8 py-4 border-b border-border/40 bg-card/50">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Visualizando Diário de:</span>
            <Select
              value={activeGestorId}
              onValueChange={(val) => setSelectedGestorId(val)}
            >
              <SelectTrigger className="h-8 w-[200px] text-xs font-semibold bg-background">
                <SelectValue placeholder="Selecione um gestor..." />
              </SelectTrigger>
              <SelectContent>
                {gestoresList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notion Cover */}
        <div className="h-48 w-full bg-[#2a2b2d] border-b border-border relative">
          <img src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop" alt="Cover" className="h-full w-full object-cover opacity-50" />
          <div className="absolute -bottom-12 left-8 md:left-16">
            <div className="h-24 w-24 shrink-0 rounded bg-card ring-4 ring-background grid place-items-center text-4xl font-bold text-foreground overflow-hidden shadow-sm">
              {activeGestor.avatar ? (
                <img src={activeGestor.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                (activeGestor.name?.[0] || "G").toUpperCase()
              )}
            </div>
          </div>
        </div>

        <div className="px-8 md:px-16 mt-16 max-w-5xl space-y-6">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
            GESTOR DE TRÁFEGO - {activeGestor.name}
          </h1>

          {/* Properties */}
          <div className="flex flex-col gap-1.5 text-[13px] max-w-md">
            <div className="grid grid-cols-[120px_1fr] items-center hover:bg-muted/30 py-1 px-1 rounded transition-colors">
              <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5"/> E-mail</span>
              <span className="font-medium truncate">{activeGestor.email}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center hover:bg-muted/30 py-1 px-1 rounded transition-colors">
              <span className="text-muted-foreground flex items-center gap-1.5"><Settings className="h-3.5 w-3.5"/> Status</span>
              <Badge variant="outline" className="text-[10px] w-fit uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Ativo
              </Badge>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center hover:bg-muted/30 py-1 px-1 rounded transition-colors">
              <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5"/> Funções</span>
              <span className="font-medium bg-muted/50 px-1.5 py-0.5 rounded text-xs">{activeGestor.roleName}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center hover:bg-muted/30 py-1 px-1 rounded transition-colors">
              <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/> Criado em</span>
              <span className="font-medium text-xs">{activeGestor.created_at ? new Date(activeGestor.created_at).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
          </div>

          <div className="w-full border-t border-border/40 my-8"></div>

          {/* Main Content: Gestor Notion Template */}
          <GestorNotionTemplate gestorId={activeGestorId} canManage={canManageOthers} />

          <div className="w-full border-t border-border/40 my-8"></div>

          {/* Databases: PROJETOS e REUNIÕES */}
          <div className="space-y-12 pb-12">
            
            {/* PROJETOS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">▼</span> PROJETOS
                </h3>
              </div>
              
              <div className="border border-border/50 rounded-lg overflow-hidden bg-card text-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-border/50">
                    <tr>
                      <th className="font-medium p-2.5">Aa Nome</th>
                      <th className="font-medium p-2.5">Status</th>
                      <th className="font-medium p-2.5 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {gestorClients.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground text-xs italic">Nenhum projeto vinculado.</td>
                      </tr>
                    ) : (
                      gestorClients.map((c: any) => (
                        <tr key={c.client_id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 font-medium flex items-center gap-2">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.client_name}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 font-medium">
                              Em andamento
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <a href={`/dashboard/${c.client_id}`} className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors">
                              Abrir
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* REUNIÕES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">▼</span> REUNIÕES
                </h3>
              </div>
              
              <div className="border border-border/50 rounded-lg overflow-hidden bg-card text-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-border/50">
                    <tr>
                      <th className="font-medium p-2.5">Aa Título</th>
                      <th className="font-medium p-2.5">Data</th>
                      <th className="font-medium p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {calendarEvents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground text-xs italic">Nenhuma reunião agendada.</td>
                      </tr>
                    ) : (
                      calendarEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 font-medium flex items-center gap-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {ev.title}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {new Date(ev.date + "T00:00:00").toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-2.5">
                            {ev.status === "done" ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Concluído</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Pendente</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
