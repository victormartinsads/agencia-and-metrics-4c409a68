import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
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
      <div className="space-y-6 min-h-screen text-foreground pb-12">
        
        {/* Superior selector (Admins/CEOs/Gerentes only) */}
        {canManageOthers && gestoresList.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-card border border-border/80 px-4 py-3 rounded-2xl max-w-md">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Visualizando Diário de:</span>
            <Select
              value={activeGestorId}
              onValueChange={(val) => setSelectedGestorId(val)}
            >
              <SelectTrigger className="h-8 flex-1 text-xs font-semibold bg-background">
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

        {/* Gestor Header Card */}
        <Card className="relative overflow-hidden border border-border bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary to-[hsl(152_69%_45%)] ring-2 ring-primary/20 grid place-items-center text-2xl font-bold text-primary-foreground overflow-hidden">
              {activeGestor.avatar ? (
                <img src={activeGestor.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                (activeGestor.name?.[0] || "G").toUpperCase()
              )}
            </div>
            
            <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-extrabold tracking-wide uppercase">
                GESTOR DE TRÁFEGO - {activeGestor.name}
              </h2>
              
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold">{activeGestor.email}</span>
                <span className="text-border">•</span>
                <Badge variant="outline" className="text-[10px] uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {activeGestor.roleName}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Three-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* COLUMN 1: CHECKLISTS (lg:span-4) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* 1. Daily routine tasks */}
            <Card className="border border-border/80 bg-card p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground">
                    📅 Checklist de Rotina
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">Rotina e tarefas operacionais diárias</CardDescription>
                </div>
                <Badge className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {tasks.filter((t) => t.status === "done").length}/{tasks.length}
                </Badge>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Nenhuma tarefa criada.</p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="flex items-center gap-2.5 text-left text-xs min-w-0"
                      >
                        {task.status === "done" ? (
                          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={task.status === "done" ? "line-through text-muted-foreground truncate" : "truncate font-medium"}>
                          {task.title}
                        </span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.tag && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border/50 text-muted-foreground uppercase">
                            {task.tag}
                          </span>
                        )}
                        {canManageOthers && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Task Form (Admins/CEOs/Gerentes only) */}
              {canManageOthers && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Título da tarefa..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="h-8 text-xs bg-background"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    />
                    <Select value={newTaskTag} onValueChange={setNewTaskTag}>
                      <SelectTrigger className="h-8 w-24 text-[10px] bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Campanha">Campanha</SelectItem>
                        <SelectItem value="Criativos">Criativos</SelectItem>
                        <SelectItem value="Métricas">Métricas</SelectItem>
                        <SelectItem value="Relatório">Relatório</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddTask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* 2. Weekly Goals */}
            <Card className="border border-border/80 bg-card p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground">
                    🎯 Metas da Semana
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">Metas principais de tráfego</CardDescription>
                </div>
                <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {diary?.meta_semana?.filter((g) => g.done).length || 0}/{diary?.meta_semana?.length || 0}
                </Badge>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {!diary?.meta_semana || diary.meta_semana.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Nenhuma meta cadastrada.</p>
                ) : (
                  diary.meta_semana.map((goal) => (
                    <div
                      key={goal.id}
                      className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleGoal(goal.id)}
                        className="flex items-center gap-2.5 text-left text-xs min-w-0"
                      >
                        {goal.done ? (
                          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={goal.done ? "line-through text-muted-foreground truncate" : "truncate font-medium"}>
                          {goal.text}
                        </span>
                      </button>
                      
                      {canManageOthers && (
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canManageOthers && (
                <div className="flex gap-1.5 pt-2 border-t border-border/40">
                  <Input
                    placeholder="Adicionar meta da semana..."
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    className="h-8 text-xs bg-background"
                    onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0 font-bold" onClick={handleAddGoal}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>

            {/* 3. Requests to Client */}
            <Card className="border border-border/80 bg-card p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground">
                    📥 Pedidos ao Cliente
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-0.5">Acessos, criativos e solicitações</CardDescription>
                </div>
                <Badge className="text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {diary?.pedidos_cliente?.filter((r) => r.done).length || 0}/{diary?.pedidos_cliente?.length || 0}
                </Badge>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {!diary?.pedidos_cliente || diary.pedidos_cliente.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Nenhum pedido feito.</p>
                ) : (
                  diary.pedidos_cliente.map((req) => (
                    <div
                      key={req.id}
                      className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleRequest(req.id)}
                        className="flex items-center gap-2.5 text-left text-xs min-w-0"
                      >
                        {req.done ? (
                          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={req.done ? "line-through text-muted-foreground truncate" : "truncate font-medium"}>
                          {req.text}
                        </span>
                      </button>
                      
                      {canManageOthers && (
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canManageOthers && (
                <div className="flex gap-1.5 pt-2 border-t border-border/40">
                  <Input
                    placeholder="Solicitação ao cliente..."
                    value={newRequestText}
                    onChange={(e) => setNewRequestText(e.target.value)}
                    className="h-8 text-xs bg-background"
                    onKeyDown={(e) => e.key === "Enter" && handleAddRequest()}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0 font-bold" onClick={handleAddRequest}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>

          </div>

          {/* COLUMN 2: TIMELINE NOTES / DIARY LOGS (lg:span-5) */}
          <div className="lg:col-span-5">
            <Card className="border border-border/80 bg-card p-4 space-y-4 h-full flex flex-col">
              <div className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground">
                  🔥 Histórico & Logs de Rotina
                </CardTitle>
                <CardDescription className="text-[10px] mt-0.5">Linha do tempo diária de otimizações e notas</CardDescription>
              </div>

              {/* Add Log Form */}
              <div className="space-y-2.5 p-3 rounded-xl border border-border/40 bg-background/25">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nova anotação diária</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="O que foi otimizado ou anotado hoje?"
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                    className="h-8 text-xs bg-background flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddLog()}
                  />
                  <Select value={newLogIcon} onValueChange={setNewLogIcon}>
                    <SelectTrigger className="h-8 w-24 text-[10px] bg-background font-mono shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activity">⚡ Geral</SelectItem>
                      <SelectItem value="Flame">🔥 Otimização</SelectItem>
                      <SelectItem value="Settings">⚙️ Setup</SelectItem>
                      <SelectItem value="MessageSquare">💬 Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs gap-1 px-3 shrink-0" onClick={handleAddLog}>
                    Postar
                  </Button>
                </div>
              </div>

              {/* Logs Timeline */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-2 max-h-[700px]">
                {logs.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-12">Nenhum log registrado para este gestor.</p>
                ) : (
                  logs.map((log) => {
                    const logDate = new Date(log.date + "T00:00:00").toLocaleDateString("pt-BR");
                    return (
                      <div key={log.id} className="relative flex gap-3 group">
                        
                        {/* Timeline Connector node */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-border/80 shadow-inner">
                            {getLogIcon(log.icon)}
                          </div>
                          <div className="w-px flex-1 bg-border/40 group-last:bg-transparent min-h-[40px]" />
                        </div>

                        {/* Log Text Content */}
                        <div className="flex-1 p-2.5 rounded-xl border border-border/40 bg-background/25 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-primary font-mono">{logDate}</span>
                            {canManageOthers && (
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-red-400 p-0.5"
                                title="Deletar anotação"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-card-foreground leading-relaxed whitespace-pre-line font-medium">
                            {log.content}
                          </p>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* COLUMN 3: CLIENTS & CALENDAR (lg:span-3) */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* 1. Managed clients */}
            <Card className="border border-border/80 bg-card p-4 space-y-4">
              <div className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground">
                  🤝 Clientes Gerenciados
                </CardTitle>
                <CardDescription className="text-[10px] mt-0.5">Clientes atribuídos a este gestor</CardDescription>
              </div>

              {/* Clients list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {gestorClients.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Nenhum cliente vinculado.</p>
                ) : (
                  gestorClients.map((c: any) => (
                    <div
                      key={c.client_id}
                      className="group flex flex-col p-2.5 rounded-xl border border-border/40 bg-background/40 gap-2 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <a
                          href={`/dashboard/${c.client_id}`}
                          className="text-xs font-bold text-primary hover:underline truncate uppercase flex items-center gap-1"
                          title="Ir para o Dashboard"
                        >
                          {c.client_name}
                          <ArrowRight className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* 2. Interactive Calendar */}
            <Card className="border border-border/80 bg-card p-4 space-y-4">
              <div className="flex justify-between items-center pb-1">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-card-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Calendário
                  </CardTitle>
                </div>
                
                {/* Month navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={handlePrevMonth} className="p-1 hover:bg-background/80 rounded-md border border-border/40 text-muted-foreground">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button onClick={handleNextMonth} className="p-1 hover:bg-background/80 rounded-md border border-border/40 text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-primary font-mono tracking-wider block text-center pb-2 border-b border-border/40">
                {monthName}
              </span>

              {/* Monthly calendar grid */}
              <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-semibold text-muted-foreground pb-1">
                <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {/* Offset spaces */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="aspect-square" />
                ))}

                {/* Days list */}
                {daysInMonth.map((day) => {
                  const dayNum = day.getDate();
                  const yearStr = day.getFullYear();
                  const monthStr = String(day.getMonth() + 1).padStart(2, "0");
                  const dayStr = String(dayNum).padStart(2, "0");
                  const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

                  // Check events on this day
                  const dayEvents = calendarEvents.filter((ev) => ev.date === dateKey);
                  const hasDone = dayEvents.some((ev) => ev.status === "done");
                  const hasPending = dayEvents.some((ev) => ev.status === "pending");

                  let dotColor = "";
                  if (hasPending && hasDone) dotColor = "bg-amber-400";
                  else if (hasPending) dotColor = "bg-primary";
                  else if (hasDone) dotColor = "bg-emerald-400";

                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <button
                      key={dayNum}
                      onClick={() => handleDayClick(dayNum)}
                      className={`relative aspect-square rounded flex flex-col items-center justify-center border hover:border-primary/50 transition-colors ${
                        isToday 
                          ? "bg-primary/20 border-primary text-primary font-bold" 
                          : "border-border/20 bg-background/25 text-card-foreground"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {dotColor && (
                        <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${dotColor} animate-pulse`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected date events preview */}
              <div className="pt-3 border-t border-border/40 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Compromissos agendados</span>
                
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {calendarEvents.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhum evento no calendário.</p>
                  ) : (
                    calendarEvents.map((ev) => {
                      const evDate = new Date(ev.date + "T00:00:00");
                      const evDateStr = evDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                      return (
                        <div key={ev.id} className="group/event flex items-center justify-between gap-1.5 p-1.5 rounded bg-background/50 border border-border/40 text-[10px]">
                          <button
                            onClick={() => handleToggleCalendarEvent(ev)}
                            className="flex items-center gap-1.5 text-left min-w-0"
                          >
                            <span className="font-mono text-primary text-[9px] shrink-0 font-bold">[{evDateStr}]</span>
                            <span className={ev.status === "done" ? "line-through text-muted-foreground truncate" : "truncate font-medium text-card-foreground"}>
                              {ev.title}
                            </span>
                          </button>
                          {canManageOthers && (
                            <button
                              onClick={() => handleDeleteCalendarEvent(ev.id)}
                              className="opacity-0 group-hover/event:opacity-100 transition-opacity text-destructive p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Inline input for scheduling event */}
              {calendarInputOpen && calendarSelectedDay !== null && (
                <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-primary">Agendar p/ Dia {calendarSelectedDay}</span>
                    <button onClick={() => setCalendarInputOpen(false)} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Título do compromisso..."
                      value={calendarInputTitle}
                      onChange={(e) => setCalendarInputTitle(e.target.value)}
                      className="h-7 text-[10px] bg-background"
                      onKeyDown={(e) => e.key === "Enter" && handleAddCalendarEvent()}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-2.5 text-[10px]" onClick={handleAddCalendarEvent}>
                      OK
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
