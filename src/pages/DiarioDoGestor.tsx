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
  useGestorProfileMeta,
  useSaveGestorProfileMeta,
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
  ClipboardList,
  Users,
  UserX,
  Edit3,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ClientCard from "@/components/gestor/ClientCard";

export default function DiarioDoGestor() {
  const { user } = useAuth();
  const { data: sysRole } = useUserRole();
  
  // Current user custom staff role
  const {
    role: currentStaffRole,
    isAdmin,
    isCeo,
    isDiretor,
    isGestor,
  } = useStaffMemberRole(user?.id);

  // Can manage other diaries
  const canManageOthers = isAdmin || isCeo || isDiretor || sysRole?.isAdmin || sysRole?.isCeo || sysRole?.isDiretor;

  // Active members
  const { data: members = [] } = useMembers();

  // Load global active clients list (for supervisors, load all; for gestores, load only their assigned clients)
  const { data: globalClients = [] } = useClients({ allClientsForStaff: canManageOthers });

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
        return !!uRole?.role;
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

  const { data: gestorClients = [] } = useGestorClients(activeGestorId);
  const manageClient = useManageGestorClient();

  const { data: calendarEvents = [] } = useGestorCalendar(activeGestorId);
  const manageCalendar = useManageGestorCalendar();

  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Partial<GestorDiaryCalendarEvent> | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const handleOpenMeetingDialog = (meeting?: GestorDiaryCalendarEvent) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setMeetingTitle(meeting.title || "");
      setMeetingDate(meeting.date ? meeting.date.split("T")[0] : "");
      setMeetingLink(meeting.meet_link || "");
    } else {
      setEditingMeeting(null);
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingLink("");
    }
    setIsMeetingDialogOpen(true);
  };

  const handleSaveMeeting = () => {
    if (!meetingTitle || !meetingDate) {
      toast.error("Título e Data são obrigatórios!");
      return;
    }
    
    manageCalendar.mutate({
      action: editingMeeting ? "update" : "insert",
      event: {
        id: editingMeeting?.id,
        gestor_id: activeGestorId,
        title: meetingTitle,
        date: meetingDate,
        meet_link: meetingLink,
        status: editingMeeting?.status || "pending",
      }
    }, {
      onSuccess: () => {
        toast.success("Reunião salva!");
        setIsMeetingDialogOpen(false);
      },
      onError: (err) => toast.error(`Erro: ${err.message}`)
    });
  };

  const { data: profileMeta } = useGestorProfileMeta(activeGestorId);
  const saveProfileMeta = useSaveGestorProfileMeta();

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
  const handleAddClient = (status: "Em andamento" | "Pausado") => {
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
        status: status,
        client_id: clientObj.id,
      },
    }, {
      onError: (err) => {
        toast.error(`Erro ao vincular: ${err.message}`);
      }
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

  // Profile Form States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editSalary, setEditSalary] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBanner, setEditBanner] = useState("");

  const handleOpenEditProfile = () => {
    setEditSalary(profileMeta?.salary || "");
    setEditRole(profileMeta?.role_override || activeGestor.roleName);
    setEditName(profileMeta?.name_override || activeGestor.name);
    setEditEmail(profileMeta?.email_override || activeGestor.email);
    setEditBanner(profileMeta?.banner_override || "");
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = () => {
    saveProfileMeta.mutate({
      gestor_id: activeGestorId,
      meta: {
        salary: editSalary,
        role_override: editRole,
        name_override: editName,
        email_override: editEmail,
        banner_override: editBanner,
      }
    });
    setIsEditProfileOpen(false);
    toast.success("Perfil atualizado localmente!");
  };

  const displayRole = profileMeta?.role_override || activeGestor.roleName;
  const displayName = profileMeta?.name_override || activeGestor.name;
  const displayEmail = profileMeta?.email_override || activeGestor.email;
  const displaySalary = profileMeta?.salary || "R$ 0,00";

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
          <img src={profileMeta?.banner_override || "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=2070&auto=format&fit=crop"} alt="Cover" className="h-full w-full object-cover opacity-50" />
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

        <div className="px-8 md:px-16 mt-16 w-full space-y-6">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
              {displayName}
            </h1>
            
            {canManageOthers && (
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleOpenEditProfile} className="gap-2">
                    <Edit3 className="h-4 w-4" /> Editar Perfil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Perfil do Gestor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo / Função</Label>
                      <Input value={editRole} onChange={e => setEditRole(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Salário</Label>
                      <Input value={editSalary} onChange={e => setEditSalary(e.target.value)} placeholder="R$ 3.000,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Imagem de Capa (URL)</Label>
                      <Input value={editBanner} onChange={e => setEditBanner(e.target.value)} placeholder="https://..." />
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full">Salvar Alterações</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Properties */}
          <div className="flex flex-wrap gap-4 text-[13px] items-center">
            <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg">
              <span className="text-muted-foreground"><Activity className="h-4 w-4"/></span>
              <span className="font-medium">{displayEmail}</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg">
              <span className="text-muted-foreground"><Settings className="h-4 w-4"/></span>
              <Badge variant="outline" className="text-[10px] uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Ativo</Badge>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg">
              <span className="text-muted-foreground"><User className="h-4 w-4"/></span>
              <span className="font-medium bg-muted/50 px-2 py-0.5 rounded text-xs">{displayRole}</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg">
              <span className="text-muted-foreground"><Clock className="h-4 w-4"/></span>
              <span className="font-medium text-xs">{activeGestor.created_at ? new Date(activeGestor.created_at).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg">
              <span className="text-muted-foreground"><DollarSign className="h-4 w-4 text-emerald-500"/></span>
              <span className="font-bold text-emerald-500">{displaySalary}</span>
            </div>
          </div>

          <div className="w-full border-t border-border/40 my-8"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <Tabs defaultValue="ativos" className="w-full space-y-6">
                <TabsList className="bg-muted/30 p-1 w-full flex justify-start border border-border/50">
                  <TabsTrigger value="ativos" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary flex-1 sm:flex-none">
                    <Users className="h-4 w-4" /> Clientes Ativos
                  </TabsTrigger>
                  <TabsTrigger value="pausados" className="flex items-center gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-primary flex-1 sm:flex-none">
                    <UserX className="h-4 w-4" /> Clientes Pausados
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ativos" className="space-y-6 outline-none focus-visible:ring-0">
                  {/* Add Client Bar (Admins/CEOs/Diretores only) */}
                  {canManageOthers && (
                    <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Cliente Ativo:
                      </span>
                      <Select value={selectedClientToLink} onValueChange={setSelectedClientToLink}>
                        <SelectTrigger className="h-8 w-[250px] text-xs">
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {globalClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleAddClient("Em andamento")}>Vincular Cliente</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gestorClients.filter((c: any) => c.status !== "Pausado").length === 0 ? (
                      <div className="col-span-full py-12 text-center text-muted-foreground italic bg-muted/10 rounded border border-dashed border-border/50">
                        Nenhum cliente ativo vinculado a este gestor.
                      </div>
                    ) : (
                      gestorClients
                        .filter((c: any) => c.status !== "Pausado")
                        .map((c: any) => (
                          <ClientCard 
                            key={c.client_id} 
                            gestorId={activeGestorId} 
                            clientId={c.client_id} 
                            clientName={c.client_name} 
                            clientStatus={c.status}
                            isPaused={false}
                            onUnlink={canManageOthers ? () => handleDeleteClient(c.id) : undefined}
                          />
                        ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pausados" className="space-y-6 outline-none focus-visible:ring-0">
                  {/* Add Paused Client Bar (Admins/CEOs/Diretores only) */}
                  {canManageOthers && (
                    <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Cliente Pausado:
                      </span>
                      <Select value={selectedClientToLink} onValueChange={setSelectedClientToLink}>
                        <SelectTrigger className="h-8 w-[250px] text-xs">
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {globalClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleAddClient("Pausado")}>Vincular Cliente Pausado</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gestorClients.filter((c: any) => c.status === "Pausado").length === 0 ? (
                      <div className="col-span-full py-12 text-center text-muted-foreground italic bg-muted/10 rounded border border-dashed border-border/50">
                        Nenhum cliente pausado.
                      </div>
                    ) : (
                      gestorClients
                        .filter((c: any) => c.status === "Pausado")
                        .map((c: any) => (
                          <ClientCard 
                            key={c.client_id} 
                            gestorId={activeGestorId} 
                            clientId={c.client_id} 
                            clientName={c.client_name} 
                            clientStatus={c.status}
                            isPaused={true}
                            onUnlink={canManageOthers ? () => handleDeleteClient(c.id) : undefined}
                          />
                        ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-card border border-border/50 px-4 py-3 rounded-lg shadow-sm">
                <ClipboardList className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-bold tracking-tight">Tarefa Diária</h2>
              </div>
              <GestorNotionTemplate gestorId={activeGestorId} canManage={canManageOthers} />
            </div>
          </div>

          <div className="w-full border-t border-border/40 my-8"></div>
            
          {/* REUNIÕES */}
          <div className="space-y-12 pb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">▼</span> REUNIÕES
                </h3>
                <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleOpenMeetingDialog()}>
                      <Plus className="h-4 w-4 mr-1" /> Nova Reunião
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{editingMeeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Título da Reunião</Label>
                        <Input 
                          placeholder="Ex: Alinhamento Estratégico" 
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input 
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link do Meet (opcional)</Label>
                        <Input 
                          placeholder="https://meet.google.com/..." 
                          value={meetingLink}
                          onChange={(e) => setMeetingLink(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsMeetingDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveMeeting}>Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="border border-border/50 rounded-lg overflow-hidden bg-card text-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-border/50">
                    <tr>
                      <th className="font-medium p-2.5">Aa Título</th>
                      <th className="font-medium p-2.5">Data</th>
                      <th className="font-medium p-2.5">Status</th>
                      <th className="font-medium p-2.5 text-right">Ações</th>
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
                          <td className="p-2.5 flex items-center justify-end gap-2">
                            {ev.meet_link && (
                              <a href={ev.meet_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                Acessar Meet
                              </a>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleOpenMeetingDialog(ev)}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
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
    </AppShell>
  );
}
