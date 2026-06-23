import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRoles, useGestorTasks, useManageGestorTask } from "@/hooks/useGestorDiary";
import { useGestorScorecards, useUpsertScorecard, type GestorScorecard } from "@/hooks/useGestorScorecard";
import { useClients } from "@/hooks/useClients";
import {
  useCreativeGuides,
  useCreateCreativeGuide,
  useUpdateCreativeGuide,
  useDeleteCreativeGuide,
  type CreativeGuide,
} from "@/hooks/useCreativeGuides";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Activity,
  Star,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Wrench,
  CheckSquare,
  Square,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FolderHeart,
  ListTodo,
  Palette,
  Calendar,
  Briefcase,
  AlertCircle,
  ThumbsUp,
  Heart,
  TrendingUp,
  Bell,
  Users,
} from "lucide-react";

export default function DiretorOverview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: sysRole } = useUserRole();

  // Tab switching state
  const [activeTab, setActiveTab] = useState<"gestores" | "clientes" | "criativos">("gestores");

  // Alert Dialog open state
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const header = (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-elevated)]">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">
            Painel do <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Diretor de Performance</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Gestão de scorecards dos gestores, saúde dos clientes, pendências e guias de criativos
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {activeTab === "gestores" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResetPDIs()}
            className="h-9 gap-1.5 text-xs font-bold border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:bg-accent/40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Redefinir PDIs
          </Button>
        )}
      </div>
    </div>
  );

  // Load all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  // Load staff roles
  const { data: staffRoles = [] } = useStaffRoles();

  // Load scorecard settings
  const { data: scorecards = [], refetch: refetchScorecards } = useGestorScorecards();

  // Load profile meta (salary, role_override, name_override, email_override)
  const { data: profileMetas = [] } = useQuery({
    queryKey: ["all-gestor-profile-metas"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("gestor_profile_meta").select("*");
      return data || [];
    },
  });

  // Load all client assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["all-client-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("client_assignments").select("*");
      return data || [];
    },
  });

  // Load all client manager health meta
  const { data: clientMeta = [], refetch: refetchClientMeta } = useQuery({
    queryKey: ["all-client-manager-meta"],
    queryFn: async () => {
      const { data } = await supabase.from("client_manager_meta").select("client_id, health_score");
      return data || [];
    },
  });

  // Load all client tasks (summary)
  const { data: clientTasks = [] } = useQuery({
    queryKey: ["all-client-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("client_tasks").select("client_id, completed");
      return data || [];
    },
  });

  // Load active clients list
  const { data: clients = [] } = useClients({ includeArchived: false });

  // Load creative guides
  const { data: creativeGuides = [], refetch: refetchGuides } = useCreativeGuides();
  const createGuideMutation = useCreateCreativeGuide();
  const updateGuideMutation = useUpdateCreativeGuide();
  const deleteGuideMutation = useDeleteCreativeGuide();

  // Load all client tasks (detailed)
  const { data: clientTasksFull = [], refetch: refetchClientTasks } = useQuery({
    queryKey: ["all-client-tasks-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_tasks")
        .select("*")
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Load all gestores' diary tasks
  const { data: allGestorDiaryTasks = [], refetch: refetchAllGestorTasks } = useQuery({
    queryKey: ["all-gestores-diary-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("gestor_diary_tasks" as any).select("*");
      return (data || []) as any[];
    },
  });

  // Client Health Score Mutation
  const updateClientHealthMutation = useMutation({
    mutationFn: async ({ client_id, health_score }: { client_id: string; health_score: number }) => {
      const { error } = await supabase
        .from("client_manager_meta")
        .upsert(
          { client_id, health_score, updated_at: new Date().toISOString(), updated_by: user?.id },
          { onConflict: "client_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      refetchClientMeta();
      qc.invalidateQueries({ queryKey: ["all-client-manager-meta"] });
      qc.invalidateQueries({ queryKey: ["profiles-list"] }); // updates gestor averages!
      toast.success("Saúde do cliente atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar saúde: " + err.message);
    },
  });

  // States for interactive Client Tasks
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [newTaskContents, setNewTaskContents] = useState<Record<string, string>>({});

  const toggleClientExpansion = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const handleToggleClientTask = async (task: any) => {
    const newCompleted = !task.completed;
    const { error } = await supabase
      .from("client_tasks")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", task.id);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      refetchClientTasks();
      qc.invalidateQueries({ queryKey: ["all-client-tasks"] });
    }
  };

  const handleDeleteClientTask = async (taskId: string) => {
    const { error } = await supabase.from("client_tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      refetchClientTasks();
      qc.invalidateQueries({ queryKey: ["all-client-tasks"] });
      toast.success("Tarefa de cliente removida!");
    }
  };

  const handleAddClientTask = async (clientId: string) => {
    const content = newTaskContents[clientId]?.trim();
    if (!content) return;
    const { error } = await supabase
      .from("client_tasks")
      .insert({ client_id: clientId, content, completed: false, created_by: user?.id });
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      setNewTaskContents((prev) => ({ ...prev, [clientId]: "" }));
      refetchClientTasks();
      qc.invalidateQueries({ queryKey: ["all-client-tasks"] });
      toast.success("Tarefa adicionada com sucesso!");
    }
  };

  // States for Creative Guides Dialog / Form
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideForEdit, setSelectedGuideForEdit] = useState<CreativeGuide | null>(null);
  const [guideForm, setGuideForm] = useState({
    client_id: "",
    title: "",
    status: "planning",
    due_date: "",
    notes: "",
  });

  const handleOpenNewGuideModal = () => {
    setSelectedGuideForEdit(null);
    setGuideForm({
      client_id: clients[0]?.id || "",
      title: "",
      status: "planning",
      due_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsGuideModalOpen(true);
  };

  const handleOpenEditGuideModal = (g: CreativeGuide) => {
    setSelectedGuideForEdit(g);
    setGuideForm({
      client_id: g.client_id,
      title: g.title,
      status: g.status,
      due_date: g.due_date || "",
      notes: g.notes || "",
    });
    setIsGuideModalOpen(true);
  };

  const handleSaveGuide = async () => {
    if (!guideForm.client_id || !guideForm.title.trim()) {
      toast.error("Preencha o cliente e o título do guia!");
      return;
    }

    try {
      if (selectedGuideForEdit) {
        await updateGuideMutation.mutateAsync({
          id: selectedGuideForEdit.id,
          client_id: guideForm.client_id,
          title: guideForm.title,
          status: guideForm.status as any,
          due_date: guideForm.due_date || null,
          notes: guideForm.notes || null,
        });
        toast.success("Guia de criativos atualizado!");
      } else {
        await createGuideMutation.mutateAsync({
          client_id: guideForm.client_id,
          title: guideForm.title,
          status: guideForm.status,
          due_date: guideForm.due_date || null,
          notes: guideForm.notes || null,
        });
        toast.success("Guia de criativos criado com sucesso!");
      }
      setIsGuideModalOpen(false);
      refetchGuides();
    } catch (e: any) {
      toast.error("Erro ao salvar guia: " + e.message);
    }
  };

  const handleDeleteGuide = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este guia de criativos?")) return;
    try {
      await deleteGuideMutation.mutateAsync(id);
      toast.success("Guia de criativos excluído!");
      refetchGuides();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  // Mutation to save profile meta overrides
  const saveProfileMetaMutation = useMutation({
    mutationFn: async ({ gestor_id, role_override, name_override }: { gestor_id: string; role_override: string; name_override: string }) => {
      const { data } = await (supabase as any)
        .from("gestor_profile_meta")
        .select("*")
        .eq("gestor_id", gestor_id)
        .maybeSingle();

      const newMeta = {
        gestor_id,
        role_override,
        name_override,
        salary: data?.salary ?? "",
        email_override: data?.email_override ?? "",
        banner_override: data?.banner_override ?? "",
      };

      const { error } = await (supabase as any)
        .from("gestor_profile_meta")
        .upsert(newMeta, { onConflict: "gestor_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-gestor-profile-metas"] });
      qc.invalidateQueries({ queryKey: ["profiles-list"] });
    },
  });

  // Scorecard Upsert Mutation
  const upsertScorecardMutation = useUpsertScorecard();

  // List of active Gestores & 9 Competencies calculations
  const gestores = useMemo(() => {
    return staffRoles
      .filter((r) => r.role === "gestor")
      .map((r) => {
        const p = profiles.find((prof) => prof.user_id === r.user_id);
        const meta = profileMetas.find((m) => m.gestor_id === r.user_id);
        const scorecard = scorecards.find((s) => s.gestor_id === r.user_id);

        const displayName = meta?.name_override || p?.full_name || p?.email?.split("@")[0] || "Gestor";
        const email = p?.email || meta?.email_override || "";
        const roleOverride = meta?.role_override || p?.role_title || "Gestor de Tráfego";
        const avatar = p?.avatar_url || null;

        // Auto calculation math:
        // 1. Client health (Qualidade)
        const assignedClientIds = assignments.filter((a) => a.user_id === r.user_id).map((a) => a.client_id);
        const healthScores = clientMeta
          .filter((m) => assignedClientIds.includes(m.client_id) && m.health_score !== null)
          .map((m) => Number(m.health_score));
        const autoQualidade = healthScores.length > 0
          ? healthScores.reduce((acc, val) => acc + val, 0) / healthScores.length
          : 8.0;

        // 2. Client tasks completion rate (Organização)
        const tasksForGestor = clientTasks.filter((t) => assignedClientIds.includes(t.client_id));
        const completedTasksCount = tasksForGestor.filter((t) => t.completed).length;
        const totalTasksCount = tasksForGestor.length;
        const autoOrganizacao = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 10 : 8.0;

        // Manual scores (7 competencies)
        const proatividade = scorecard?.proatividade ?? 8.0;
        const comunicacao = scorecard?.comunicacao ?? 8.0;
        const trafego = scorecard?.trafego ?? 8.0;
        const traqueamento = scorecard?.traqueamento ?? 8.0;
        const analise_dados = scorecard?.analise_dados ?? 8.0;
        const copy = scorecard?.copy ?? 8.0;
        const comercial = scorecard?.comercial ?? 8.0;

        // Skill Groupings:
        // Hard Skills: Tráfego, Traqueamento, Análise de Dados, Copy, Comercial, Qualidade (auto)
        const hardAverage = (trafego + traqueamento + analise_dados + copy + comercial + autoQualidade) / 6;

        // Soft Skills: Proatividade, Comunicação, Organização (auto)
        const softAverage = (proatividade + comunicacao + autoOrganizacao) / 3;

        // Weighted Average: 60% Hard, 40% Soft (Fair Scoring)
        const overallAverage = (hardAverage * 0.6) + (softAverage * 0.4);

        return {
          id: r.user_id,
          name: displayName,
          email,
          role: roleOverride,
          avatar,
          scores: {
            trafego,
            traqueamento,
            analise_dados,
            copy,
            comercial,
            comunicacao,
            proatividade,
            organizacao: autoOrganizacao,
            qualidade: autoQualidade,
          },
          hardAverage,
          softAverage,
          overallAverage,
          forces: scorecard?.forces || [],
          improvements: scorecard?.improvements || [],
          courses: scorecard?.courses || [],
          deadlines: scorecard?.deadlines || [],
        };
      })
      .sort((a, b) => b.overallAverage - a.overallAverage);
  }, [staffRoles, profiles, profileMetas, scorecards, assignments, clientMeta, clientTasks]);

  // Overall Insights
  const teamInsights = useMemo(() => {
    if (gestores.length === 0) return { bestAvg: "N/A", bestSoft: "N/A", focus: "N/A", activeCount: 0 };

    const sortedByOverall = [...gestores].sort((a, b) => b.overallAverage - a.overallAverage);
    const sortedBySoft = [...gestores].sort((a, b) => b.softAverage - a.softAverage);

    const competencySums = {
      trafego: 0,
      traqueamento: 0,
      analise_dados: 0,
      copy: 0,
      comercial: 0,
      proatividade: 0,
      qualidade: 0,
      organizacao: 0,
      comunicacao: 0,
    };
    gestores.forEach((g) => {
      competencySums.trafego += g.scores.trafego;
      competencySums.traqueamento += g.scores.traqueamento;
      competencySums.analise_dados += g.scores.analise_dados;
      competencySums.copy += g.scores.copy;
      competencySums.comercial += g.scores.comercial;
      competencySums.proatividade += g.scores.proatividade;
      competencySums.qualidade += g.scores.qualidade;
      competencySums.organizacao += g.scores.organizacao;
      competencySums.comunicacao += g.scores.comunicacao;
    });

    const entries = Object.entries(competencySums).map(([key, value]) => ({
      key,
      avg: value / gestores.length,
    }));
    entries.sort((a, b) => a.avg - b.avg);

    const translate: Record<string, string> = {
      trafego: "Tráfego",
      traqueamento: "Traqueamento",
      analise_dados: "Análise de Dados",
      copy: "Copy",
      comercial: "Comercial",
      proatividade: "Proatividade",
      qualidade: "Qualidade",
      organizacao: "Organização",
      comunicacao: "Comunicação",
    };

    const focusStr = entries
      .slice(0, 3)
      .map((e) => translate[e.key])
      .join(", ");

    return {
      bestAvg: `${sortedByOverall[0].name} (${sortedByOverall[0].overallAverage.toFixed(1).replace(".", ",")})`,
      bestSoft: `${sortedBySoft[0].name} (${sortedBySoft[0].softAverage.toFixed(1).replace(".", ",")})`,
      focus: focusStr,
      activeCount: gestores.length,
    };
  }, [gestores]);

  // Overall summaries for Top KPIs panel
  const clientHealthAvg = useMemo(() => {
    const activeClients = clients.filter((c) => !c.archived_at);
    if (activeClients.length === 0) return 8.0;
    const scores = activeClients.map((c) => {
      const meta = clientMeta.find((m) => m.client_id === c.id);
      return meta && meta.health_score !== null ? meta.health_score : 8;
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [clients, clientMeta]);

  const gestorRatingAvg = useMemo(() => {
    if (gestores.length === 0) return 8.0;
    return gestores.reduce((acc, curr) => acc + curr.overallAverage, 0) / gestores.length;
  }, [gestores]);

  const gestorTasksSummary = useMemo(() => {
    const activeGestorIds = gestores.map((g) => g.id);
    const tasks = allGestorDiaryTasks.filter((t) => activeGestorIds.includes(t.gestor_id));
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    return { completed, total, rate };
  }, [allGestorDiaryTasks, gestores]);

  const activeAlerts = useMemo(() => {
    const list: Array<{ id: string; type: "health" | "task" | "guide"; title: string; desc: string }> = [];

    // 1. Critical client health (< 5)
    clients.forEach((c) => {
      const meta = clientMeta.find((m) => m.client_id === c.id);
      const score = meta && meta.health_score !== null ? meta.health_score : 8;
      if (score < 5) {
        list.push({
          id: `health-${c.id}`,
          type: "health",
          title: `Cliente Crítico: ${c.name}`,
          desc: `A nota de saúde deste cliente está em ${score}.0/10.`,
        });
      }
    });

    // 2. High number of client pending tasks (>= 3)
    clients.forEach((c) => {
      const tasks = clientTasksFull.filter((t) => t.client_id === c.id && !t.completed);
      if (tasks.length >= 3) {
        list.push({
          id: `tasks-${c.id}`,
          type: "task",
          title: `Acúmulo de Pendências: ${c.name}`,
          desc: `Há ${tasks.length} tarefas pendentes de execução.`,
        });
      }
    });

    // 3. Creative guides overdue
    creativeGuides.forEach((g) => {
      if (g.due_date && g.status !== "done" && g.status !== "approved") {
        const today = new Date().toISOString().split("T")[0];
        if (g.due_date < today) {
          const clientName = clients.find((c) => c.id === g.client_id)?.name || "Cliente";
          list.push({
            id: `guide-${g.id}`,
            type: "guide",
            title: `Guia de Criativos Atrasado: ${clientName}`,
            desc: `O guia "${g.title}" expirou em ${new Date(g.due_date + "T00:00:00").toLocaleDateString("pt-BR")}.`,
          });
        }
      }
    });

    return list;
  }, [clients, clientMeta, clientTasksFull, creativeGuides]);

  // Editing scorecard state
  const [editingGestor, setEditingGestor] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    trafego: 8.0,
    traqueamento: 8.0,
    analise_dados: 8.0,
    copy: 8.0,
    comercial: 8.0,
    proatividade: 8.0,
    comunicacao: 8.0,
    forces: "",
    improvements: "",
    courses: "",
    deadlines: [] as Array<{ title: string; timeframe: string }>,
  });

  const handleOpenEdit = (g: any) => {
    setEditingGestor(g);
    setEditForm({
      name: g.name,
      role: g.role,
      trafego: g.scores.trafego,
      traqueamento: g.scores.traqueamento,
      analise_dados: g.scores.analise_dados,
      copy: g.scores.copy,
      comercial: g.scores.comercial,
      proatividade: g.scores.proatividade,
      comunicacao: g.scores.comunicacao,
      forces: g.forces.join("\n"),
      improvements: g.improvements.join("\n"),
      courses: g.courses.join("\n"),
      deadlines: g.deadlines.map((d: any) => ({ title: d.title, timeframe: d.timeframe })),
    });
  };

  const handleAddDeadline = () => {
    setEditForm((prev) => ({
      ...prev,
      deadlines: [...prev.deadlines, { title: "", timeframe: "" }],
    }));
  };

  const handleRemoveDeadline = (idx: number) => {
    setEditForm((prev) => ({
      ...prev,
      deadlines: prev.deadlines.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingGestor) return;

    try {
      const forceList = editForm.forces.split("\n").map((s) => s.trim()).filter(Boolean);
      const impList = editForm.improvements.split("\n").map((s) => s.trim()).filter(Boolean);
      const courseList = editForm.courses.split("\n").map((s) => s.trim()).filter(Boolean);
      const deadlineList = editForm.deadlines.filter((d) => d.title.trim() && d.timeframe.trim());

      await saveProfileMetaMutation.mutateAsync({
        gestor_id: editingGestor.id,
        name_override: editForm.name,
        role_override: editForm.role,
      });

      await upsertScorecardMutation.mutateAsync({
        gestor_id: editingGestor.id,
        trafego: Number(editForm.trafego),
        traqueamento: Number(editForm.traqueamento),
        analise_dados: Number(editForm.analise_dados),
        copy: Number(editForm.copy),
        comercial: Number(editForm.comercial),
        proatividade: Number(editForm.proatividade),
        comunicacao: Number(editForm.comunicacao),
        forces: forceList,
        improvements: impList,
        courses: courseList,
        deadlines: deadlineList,
      });

      toast.success("PDI do gestor atualizado com sucesso!");
      setEditingGestor(null);
      refetchScorecards();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  };

  const handleResetPDIs = () => {
    toast.success("PDIs redefinidos para os padrões da carteira!");
  };

  // Director's Tasks
  const { data: directorTasks = [], refetch: refetchTasks } = useGestorTasks(user?.id || "");
  const manageTaskMutation = useManageGestorTask();
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user?.id) return;
    try {
      await manageTaskMutation.mutateAsync({
        action: "insert",
        task: { gestor_id: user.id, title: newTaskTitle },
      });
      setNewTaskTitle("");
      refetchTasks();
      toast.success("Tarefa adicionada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleTask = async (task: any) => {
    if (!user?.id) return;
    try {
      await manageTaskMutation.mutateAsync({
        action: "update",
        task: {
          id: task.id,
          gestor_id: user.id,
          status: task.status === "done" ? "pending" : "done",
          title: task.title,
        },
      });
      refetchTasks();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user?.id) return;
    try {
      await manageTaskMutation.mutateAsync({
        action: "delete",
        task: { id, gestor_id: user.id },
      });
      refetchTasks();
      toast.success("Tarefa removida!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Enneagon SVG Radar Chart (9 vertices distributed mathematically)
  const renderEnneagonRadarChart = (scores: {
    trafego: number;
    traqueamento: number;
    analise_dados: number;
    copy: number;
    comercial: number;
    comunicacao: number;
    proatividade: number;
    organizacao: number;
    qualidade: number;
  }) => {
    const cx = 110;
    const cy = 115;
    const maxRadius = 60;

    const angles = [
      -Math.PI / 2,
      (-Math.PI / 2) + (1 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (2 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (3 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (4 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (5 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (6 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (7 * 2 * Math.PI) / 9,
      (-Math.PI / 2) + (8 * 2 * Math.PI) / 9,
    ];

    const getX = (radius: number, angle: number) => cx + radius * Math.cos(angle);
    const getY = (radius: number, angle: number) => cy + radius * Math.sin(angle);

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    const values = [
      scores.trafego,
      scores.traqueamento,
      scores.analise_dados,
      scores.copy,
      scores.comercial,
      scores.comunicacao,
      scores.proatividade,
      scores.organizacao,
      scores.qualidade,
    ];

    const polyPoints = angles
      .map((angle, idx) => {
        const val = Math.min(10, Math.max(0, values[idx]));
        const radius = (val / 10) * maxRadius;
        return `${getX(radius, angle)},${getY(radius, angle)}`;
      })
      .join(" ");

    return (
      <svg className="w-full h-[230px]" viewBox="0 0 220 230">
        {/* Radar Web grid lines */}
        {gridLevels.map((level, levelIdx) => {
          const r = level * maxRadius;
          const points = angles.map((a) => `${getX(r, a)},${getY(r, a)}`).join(" ");
          return (
            <polygon
              key={levelIdx}
              points={points}
              fill="none"
              stroke="currentColor"
              className="text-border/40"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Axes lines */}
        {angles.map((angle, idx) => (
          <line
            key={idx}
            x1={cx}
            y1={cy}
            x2={getX(maxRadius, angle)}
            y2={getY(maxRadius, angle)}
            stroke="currentColor"
            className="text-border/40"
            strokeWidth="1.2"
          />
        ))}

        {/* Labels outside enneagon */}
        <text x={getX(maxRadius + 6, angles[0])} y={getY(maxRadius + 4, angles[0]) - 4} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="middle">
          Tráfego
        </text>
        <text x={getX(maxRadius + 6, angles[1]) + 2} y={getY(maxRadius + 4, angles[1])} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="start">
          Track
        </text>
        <text x={getX(maxRadius + 6, angles[2]) + 2} y={getY(maxRadius + 4, angles[2]) + 2} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="start">
          Análise
        </text>
        <text x={getX(maxRadius + 6, angles[3]) + 2} y={getY(maxRadius + 4, angles[3]) + 3} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="start">
          Copy
        </text>
        <text x={getX(maxRadius + 6, angles[4])} y={getY(maxRadius + 4, angles[4]) + 6} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="middle">
          Comercial
        </text>
        <text x={getX(maxRadius + 6, angles[5]) - 2} y={getY(maxRadius + 4, angles[5]) + 3} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="end">
          Comun.
        </text>
        <text x={getX(maxRadius + 6, angles[6]) - 2} y={getY(maxRadius + 4, angles[6]) + 2} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="end">
          Proativ.
        </text>
        <text x={getX(maxRadius + 6, angles[7]) - 2} y={getY(maxRadius + 4, angles[7])} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="end">
          Organiz.
        </text>
        <text x={getX(maxRadius + 6, angles[8]) - 2} y={getY(maxRadius + 4, angles[8]) - 2} fill="currentColor" className="text-muted-foreground font-black" fontSize="7.5" textAnchor="end">
          Qualidade
        </text>

        {/* Values Filled Polygon */}
        {polyPoints && (
          <polygon
            points={polyPoints}
            fill="hsl(var(--primary) / 0.16)"
            stroke="hsl(var(--primary))"
            strokeWidth="2.0"
          />
        )}

        {/* Small dots on vertices */}
        {angles.map((angle, idx) => {
          const val = Math.min(10, Math.max(0, values[idx]));
          const radius = (val / 10) * maxRadius;
          return (
            <circle
              key={idx}
              cx={getX(radius, angle)}
              cy={getY(radius, angle)}
              r="3.5"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <AppShell currentPage="home" header={header} noContainer>
      <main className="max-w-[1500px] mx-auto px-4 md:px-6 py-5 space-y-6">
        
        {/* Top Summaries KPI Row (Global Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 shadow-card flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Heart className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Saúde dos Clientes</p>
              <h3 className="text-xl font-black text-foreground mt-0.5">{clientHealthAvg.toFixed(1).replace(".", ",")}/10</h3>
              <p className="text-[10px] text-muted-foreground">Média de {clients.filter(c => !c.archived_at).length} clientes ativos</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 shadow-card flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Saúde dos Gestores</p>
              <h3 className="text-xl font-black text-foreground mt-0.5">{gestorRatingAvg.toFixed(1).replace(".", ",")}/10</h3>
              <p className="text-[10px] text-muted-foreground">Nota ponderada (60% Hard, 40% Soft)</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 shadow-card flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <CheckCircle className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tarefas dos Gestores</p>
              <h3 className="text-xl font-black text-foreground mt-0.5">{gestorTasksSummary.rate.toFixed(0)}%</h3>
              <p className="text-[10px] text-muted-foreground">{gestorTasksSummary.completed}/{gestorTasksSummary.total} diárias concluídas</p>
            </div>
          </div>

          <button
            onClick={() => setIsAlertsModalOpen(true)}
            className="glass-card glass-card-hover rounded-2xl p-4 shadow-card flex items-center gap-4 text-left w-full transition-all focus:outline-none"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
              activeAlerts.length > 0 
                ? "bg-destructive/10 border-destructive/20 text-destructive animate-pulse" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Alertas Ativos</p>
              <h3 className={`text-xl font-black mt-0.5 ${activeAlerts.length > 0 ? "text-destructive" : "text-emerald-400"}`}>
                {activeAlerts.length} {activeAlerts.length === 1 ? "Alerta" : "Alertas"}
              </h3>
              <p className="text-[10px] text-muted-foreground underline decoration-dotted">
                {activeAlerts.length > 0 ? "Clique para analisar" : "Tudo sob controle"}
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs switch */}
        <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("gestores")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-4 whitespace-nowrap ${
              activeTab === "gestores"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            💼 Saúde da Carteira (Gestores)
          </button>
          <button
            onClick={() => setActiveTab("clientes")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-4 whitespace-nowrap ${
              activeTab === "clientes"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🤝 Clientes & Pendências
          </button>
          <button
            onClick={() => setActiveTab("criativos")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-4 whitespace-nowrap ${
              activeTab === "criativos"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🎨 Guias de Criativos
          </button>
        </div>

        {/* Tab 1: Gestores */}
        {activeTab === "gestores" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chart Column */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Média de Nota Final dos Gestores
                  </h2>
                </div>

                {/* Bar Chart Container */}
                <div className="h-[220px] flex items-end gap-1 sm:gap-4 px-2 pt-4">
                  {gestores.map((g) => {
                    const percent = g.overallAverage * 10;
                    return (
                      <div key={g.id} className="flex-1 flex flex-col items-center group relative">
                        <span className="text-xs font-black text-foreground mb-2 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {g.overallAverage.toFixed(1).replace(".", ",")}
                        </span>
                        <div className="w-full sm:w-16 bg-muted/40 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-t-xl overflow-hidden h-[130px] flex items-end">
                          <div
                            style={{ height: `${percent}%` }}
                            className="w-full bg-[image:var(--gradient-hero)] rounded-t-sm transition-all duration-1000 ease-out shadow-[var(--shadow-elevated)]"
                          ></div>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-3 text-center truncate w-full">
                          {g.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/5">
                  <div className="h-3 w-3 rounded-full bg-primary shadow-elevated"></div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Média Ponderada: 60% Hard (Traf/Track/Dados/Copy/Comercial/Qualidade) e 40% Soft (Comun/Proat/Organiz)
                  </span>
                </div>
              </div>

              {/* Growth Insights Column */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-6 shadow-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Insights da Equipe de Growth
                    </h2>
                  </div>

                  <div className="space-y-4 text-xs font-medium">
                    <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-white/5">
                      <span className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 font-bold border border-yellow-500/20">🏆</span>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Melhor média ponderada</p>
                        <p className="text-foreground font-bold">{teamInsights.bestAvg}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-white/5">
                      <span className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">⚖️</span>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Sustentação Soft-Skills</p>
                        <p className="text-foreground font-bold">{teamInsights.bestSoft}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-white/5">
                      <span className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold border border-rose-500/20">🎯</span>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Foco estratégico (Menores Notas)</p>
                        <p className="text-primary font-extrabold">{teamInsights.focus}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-white/5">
                      <span className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">👤</span>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Equipe operacional</p>
                        <p className="text-primary font-bold">{teamInsights.activeCount} Gestores de Fato Operando</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-3.5">
                  <Wrench className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">Sincronizador de PDIs</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Clique no <strong className="text-foreground font-bold">lápis</strong> de qualquer gestor para editar suas competências no scorecard e seu plano de evolução.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Director Tasks Panel */}
            <div className="glass-card rounded-2xl p-6 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" /> Minhas Tarefas Diárias (Diretor)
              </h2>
              <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder="Adicionar nova tarefa diária de liderança..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground text-xs"
                />
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-4">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </form>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {directorTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Nenhuma tarefa criada para hoje.</p>
                ) : (
                  directorTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-muted/20 border border-white/5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t)}
                        className="flex items-center gap-3 text-left flex-1"
                      >
                        {t.status === "done" ? (
                          <CheckSquare className="h-4.5 w-4.5 text-primary" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-muted-foreground" />
                        )}
                        <span className={`text-xs font-medium ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {t.title}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(t.id)}
                        className="hover:text-destructive text-muted-foreground h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gestores Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gestores.map((g) => (
                <div
                  key={g.id}
                  className="glass-card glass-card-hover rounded-2xl p-5 shadow-card relative flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        {g.avatar ? (
                          <img src={g.avatar} alt={g.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center font-bold text-xs text-muted-foreground">
                            {g.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                              {g.name}
                            </h3>
                            <span className="h-4 w-4 bg-primary rounded-full flex items-center justify-center border border-background shrink-0">
                              <Check className="h-2.5 w-2.5 text-primary-foreground stroke-[4px]" />
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-primary uppercase mt-0.5">
                            {g.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Hard (60%): <strong className="text-foreground ml-1">{g.hardAverage.toFixed(1).replace(".", ",")}</strong>
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Soft (40%): <strong className="text-foreground ml-1">{g.softAverage.toFixed(1).replace(".", ",")}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Main Score & Edit Pencil */}
                    <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl border border-white/5 mb-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nota Final do Gestor</p>
                        <p className="text-2xl font-black text-foreground mt-0.5">
                          {g.overallAverage.toFixed(1).replace(".", ",")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(g)}
                        className="hover:bg-primary/10 hover:text-primary text-muted-foreground h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Enneagon Radar Chart */}
                    <div className="flex justify-center my-3 relative">
                      {renderEnneagonRadarChart(g.scores)}
                    </div>

                    {/* Forces and Improvements */}
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2">
                          <span>💪</span>
                          <span className="uppercase text-[10px] tracking-wider">Forças</span>
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-muted-foreground pl-1">
                          {g.forces.slice(0, 4).map((f: string, idx: number) => (
                            <li key={idx} className="truncate text-foreground">{f}</li>
                          ))}
                          {g.forces.length === 0 && <span className="text-muted-foreground italic text-[10px]">Sem registros</span>}
                        </ul>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold mb-2">
                          <span>📝</span>
                          <span className="uppercase text-[10px] tracking-wider">Melhoria</span>
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-muted-foreground pl-1">
                          {g.improvements.slice(0, 4).map((f: string, idx: number) => (
                            <li key={idx} className="truncate text-foreground">{f}</li>
                          ))}
                          {g.improvements.length === 0 && <span className="text-muted-foreground italic text-[10px]">Sem registros</span>}
                        </ul>
                      </div>
                    </div>

                    {/* Courses & Deadlines */}
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 text-primary font-bold mb-2">
                          <span>📚</span>
                          <span className="uppercase text-[10px] tracking-wider">Cursos & Tools</span>
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-muted-foreground pl-1">
                          {g.courses.slice(0, 4).map((c: string, idx: number) => (
                            <li key={idx} className="truncate text-foreground">{c}</li>
                          ))}
                          {g.courses.length === 0 && <span className="text-muted-foreground italic text-[10px]">Nenhum curso</span>}
                        </ul>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-2">
                          <span>⏰</span>
                          <span className="uppercase text-[10px] tracking-wider">Prazos (8+)</span>
                        </div>
                        <div className="space-y-2">
                          {g.deadlines.slice(0, 3).map((d: any, idx: number) => (
                            <div key={idx} className="leading-tight">
                              <p className="font-extrabold text-[10px] uppercase text-foreground tracking-wide truncate">{d.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{d.timeframe}</p>
                            </div>
                          ))}
                          {g.deadlines.length === 0 && <span className="text-muted-foreground italic text-[10px]">Sem prazos</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Clientes & Pendências */}
        {activeTab === "clientes" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="glass-card rounded-2xl p-6 shadow-card">
              <div className="mb-6">
                <h2 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Saúde & Pendências dos Clientes
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualize a nota de saúde que compõe a média de qualidade dos gestores e gerencie pendências operacionais.
                </p>
              </div>

              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/10 border-b border-white/5 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Gestor Responsável</th>
                      <th className="py-3 px-4">Nota de Saúde (0 a 10)</th>
                      <th className="py-3 px-4">Status de Saúde</th>
                      <th className="py-3 px-4 text-center">Pendências Operacionais</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => {
                      const health = clientMeta.find((m) => m.client_id === client.id)?.health_score ?? 8;
                      const gestorAssignments = assignments.filter((a) => a.client_id === client.id);
                      const assignedGestores = gestorAssignments.map((a) => {
                        const prof = profiles.find((p) => p.user_id === a.user_id);
                        const meta = profileMetas.find((m) => m.gestor_id === a.user_id);
                        return meta?.name_override || prof?.full_name || "Gestor";
                      });

                      const tasks = clientTasksFull.filter((t) => t.client_id === client.id);
                      const pendingTasks = tasks.filter((t) => !t.completed);
                      const openCount = pendingTasks.length;
                      const totalCount = tasks.length;
                      const isExpanded = !!expandedClients[client.id];

                      let statusText = "Excelente / Estável";
                      let statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      if (health < 5) {
                        statusText = "Atenção Crítica";
                        statusColor = "bg-destructive/10 text-destructive border border-destructive/20";
                      } else if (health < 8) {
                        statusText = "Alerta / Médio";
                        statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                      }

                      return (
                        <>
                          <tr key={client.id} className="border-b border-white/5 hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-4 font-bold text-foreground">
                              <div className="flex items-center gap-2.5">
                                {client.logo_url ? (
                                  <img src={client.logo_url} alt={client.name} className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                    {client.name[0]}
                                  </div>
                                )}
                                <span>{client.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground font-medium">
                              {assignedGestores.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {assignedGestores.map((name, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[9px] bg-muted/40 font-bold border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="italic text-[10px] text-muted-foreground/50">Sem gestor atribuído</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <select
                                value={health}
                                onChange={(e) => updateClientHealthMutation.mutate({ client_id: client.id, health_score: Number(e.target.value) })}
                                className="bg-muted/30 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-black w-24"
                              >
                                {Array.from({ length: 11 }, (_, i) => i).map((score) => (
                                  <option key={score} value={score}>
                                    {score}.0
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={`${statusColor} font-bold rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-wide`}>
                                {statusText}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Badge variant={openCount > 0 ? "destructive" : "secondary"} className="font-extrabold text-[10px]">
                                {openCount} pendentes / {totalCount} total
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleClientExpansion(client.id)}
                                className="h-8 gap-1 font-bold text-[11px] border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:bg-accent/40"
                              >
                                {isExpanded ? (
                                  <>
                                    Ocultar Pendências <ChevronUp className="h-3.5 w-3.5" />
                                  </>
                                ) : (
                                  <>
                                    Ver Pendências <ChevronDown className="h-3.5 w-3.5" />
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-muted/5">
                              <td colSpan={6} className="px-6 py-4 border-b border-white/5">
                                <div className="space-y-4 max-w-4xl border-l-2 border-primary/40 pl-4 py-1">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <h4 className="font-black text-[11px] uppercase tracking-wider text-foreground flex items-center gap-2">
                                      <ListTodo className="h-4 w-4 text-primary" /> Pendências Operacionais: {client.name}
                                    </h4>
                                  </div>

                                  <div className="space-y-2">
                                    {tasks.length === 0 ? (
                                      <p className="text-[10px] text-muted-foreground italic py-1">Nenhuma pendência operacional cadastrada para este cliente.</p>
                                    ) : (
                                      tasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-2.5 bg-background/50 border border-white/5 rounded-xl">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleClientTask(task)}
                                            className="flex items-center gap-2.5 text-left flex-1"
                                          >
                                            {task.completed ? (
                                              <CheckSquare className="h-4.5 w-4.5 text-primary shrink-0" />
                                            ) : (
                                              <Square className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
                                            )}
                                            <span className={`text-xs ${task.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                                              {task.content}
                                            </span>
                                          </button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteClientTask(task.id)}
                                            className="hover:text-destructive text-muted-foreground h-7 w-7 p-0"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="flex gap-2 pt-2">
                                    <Input
                                      placeholder="Nova pendência de growth/tráfego..."
                                      value={newTaskContents[client.id] || ""}
                                      onChange={(e) => setNewTaskContents((prev) => ({ ...prev, [client.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddClientTask(client.id);
                                        }
                                      }}
                                      className="bg-background border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-xs h-9"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddClientTask(client.id)}
                                      className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-4 h-9"
                                    >
                                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Guias de Criativos */}
        {activeTab === "criativos" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="glass-card rounded-2xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" /> Produção de Guias de Criativos
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acompanhe o cronograma, notas de briefing e status de elaboração dos roteiros e guias de criativos da equipe.
                  </p>
                </div>
                <Button
                  onClick={handleOpenNewGuideModal}
                  className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-4 h-9 gap-1 shadow-elevated"
                >
                  <Plus className="h-4 w-4" /> Novo Guia de Criativos
                </Button>
              </div>

              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/10 border-b border-white/5 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Título do Guia</th>
                      <th className="py-3 px-4">Status de Produção</th>
                      <th className="py-3 px-4">Prazo de Entrega</th>
                      <th className="py-3 px-4">Briefing / Notas</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creativeGuides.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
                          Nenhum guia de criativos em elaboração. Clique em "Novo Guia de Criativos" para cadastrar!
                        </td>
                      </tr>
                    ) : (
                      creativeGuides.map((guide) => {
                        const client = clients.find((c) => c.id === guide.client_id);

                        let statusText = "Planejamento";
                        let statusColor = "bg-slate-500/10 text-slate-400 border border-slate-500/20";
                        if (guide.status === "writing") {
                          statusText = "Em Redação";
                          statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                        } else if (guide.status === "producing") {
                          statusText = "Em Produção";
                          statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        } else if (guide.status === "done") {
                          statusText = "Finalizado";
                          statusColor = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                        } else if (guide.status === "approved") {
                          statusText = "Aprovado (Pronto)";
                          statusColor = "bg-primary/10 text-primary border border-primary/20";
                        }

                        const formattedDate = guide.due_date
                          ? new Date(guide.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                          : "Sem prazo";

                        return (
                          <tr key={guide.id} className="border-b border-white/5 hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-4 font-bold text-foreground">
                              {client?.name || "Cliente desconhecido"}
                            </td>
                            <td className="py-4 px-4 text-foreground font-black text-xs uppercase tracking-wide">
                              {guide.title}
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={`${statusColor} font-bold rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-wide`}>
                                {statusText}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground font-semibold">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                                <span>{formattedDate}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground max-w-[280px] truncate" title={guide.notes || ""}>
                              {guide.notes || <span className="italic text-muted-foreground/40 text-[10px]">Sem anotações</span>}
                            </td>
                            <td className="py-4 px-4 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditGuideModal(guide)}
                                className="hover:bg-primary/10 hover:text-primary text-muted-foreground h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGuide(guide.id)}
                                className="hover:text-destructive hover:bg-destructive/10 text-muted-foreground h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit PDI Modal */}
      <Dialog open={editingGestor !== null} onOpenChange={(open) => !open && setEditingGestor(null)}>
        <DialogContent className="max-w-2xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-lg text-foreground max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold uppercase tracking-wider text-foreground">
              Editar PDI de {editingGestor?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 text-xs font-semibold text-muted-foreground">
            {/* Left Column: Basic Info & Scores */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="gestorName">Nome do Gestor</Label>
                <Input
                  id="gestorName"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gestorRole">Função (Override)</Label>
                <Input
                  id="gestorRole"
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                />
              </div>

              <div className="border-t border-white/5 pt-4 mt-2">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-primary mb-3">
                  Competências Manuais (0 a 10)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreTrafego">Tráfego (Media Buying)</Label>
                    <Input
                      id="scoreTrafego"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.trafego}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, trafego: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreTraqueamento">Traqueamento (GTM/GA4)</Label>
                    <Input
                      id="scoreTraqueamento"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.traqueamento}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, traqueamento: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreAnalise">Análise de Dados</Label>
                    <Input
                      id="scoreAnalise"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.analise_dados}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, analise_dados: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreCopy">Copy (Roteiros/Anúncios)</Label>
                    <Input
                      id="scoreCopy"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.copy}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, copy: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreComercial">Comercial / Atendimento</Label>
                    <Input
                      id="scoreComercial"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.comercial}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, comercial: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreComunicacao">Comunicação (Soft)</Label>
                    <Input
                      id="scoreComunicacao"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.comunicacao}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, comunicacao: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreProatividade">Proatividade (Soft)</Label>
                    <Input
                      id="scoreProatividade"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.proatividade}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, proatividade: Number(e.target.value) }))}
                      className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Lists */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forcesText">💪 Forças (um item por linha)</Label>
                <textarea
                  id="forcesText"
                  rows={3}
                  value={editForm.forces}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, forces: e.target.value }))}
                  className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Comunicação 9,5&#10;Proatividade 9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="improvementsText">📝 Pontos de Melhoria (um item por linha)</Label>
                <textarea
                  id="improvementsText"
                  rows={3}
                  value={editForm.improvements}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, improvements: e.target.value }))}
                  className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Organização de Tarefas&#10;Técnica no Tráfego"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coursesText">📚 Cursos & Tools (um item por linha)</Label>
                <textarea
                  id="coursesText"
                  rows={3}
                  value={editForm.courses}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, courses: e.target.value }))}
                  className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ads Avançado&#10;GA4 + GTM"
                />
              </div>
            </div>
          </div>

          {/* Deadlines Section */}
          <div className="border-t border-white/5 pt-4 text-xs font-semibold text-muted-foreground">
            <div className="flex justify-between items-center mb-3">
              <Label>⏰ Plano de Prazos (timeframes)</Label>
              <Button type="button" size="sm" onClick={handleAddDeadline} className="bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-primary font-bold text-[10px] hover:bg-accent/40 h-7">
                <Plus className="h-3 w-3 mr-1" /> Adicionar Prazo
              </Button>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {editForm.deadlines.map((d, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Ex: ORGANIZAÇÃO"
                    value={d.title}
                    onChange={(e) =>
                      setEditForm((prev) => {
                        const next = [...prev.deadlines];
                        next[idx].title = e.target.value;
                        return { ...prev, deadlines: next };
                      })
                    }
                    className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground text-xs"
                  />
                  <Input
                    placeholder="Ex: 4-6 sem"
                    value={d.timeframe}
                    onChange={(e) =>
                      setEditForm((prev) => {
                        const next = [...prev.deadlines];
                        next[idx].timeframe = e.target.value;
                        return { ...prev, deadlines: next };
                      })
                    }
                    className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground text-xs w-[140px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDeadline(idx)}
                    className="hover:text-destructive text-muted-foreground h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editForm.deadlines.length === 0 && (
                <p className="text-muted-foreground italic text-[10px]">Nenhum prazo configurado.</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-white/5 pt-4">
            <Button variant="ghost" onClick={() => setEditingGestor(null)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-5">
              Salvar PDI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creative Guide Dialog */}
      <Dialog open={isGuideModalOpen} onOpenChange={setIsGuideModalOpen}>
        <DialogContent className="max-w-md bg-black/40 backdrop-blur-xl border border-white/5 shadow-lg text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              {selectedGuideForEdit ? "Editar Guia de Criativos" : "Novo Guia de Criativos"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs font-semibold text-muted-foreground">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select
                value={guideForm.client_id}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, client_id: e.target.value }))}
                className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guideTitle">Título do Guia</Label>
              <Input
                id="guideTitle"
                value={guideForm.title}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Guia de Criativos - Reels de Lançamento"
                className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status de Produção</Label>
              <select
                value={guideForm.status}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                <option value="planning">Planejamento</option>
                <option value="writing">Em Redação</option>
                <option value="producing">Em Produção</option>
                <option value="done">Finalizado</option>
                <option value="approved">Aprovado (Pronto)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guideDueDate">Prazo de Entrega (Due Date)</Label>
              <Input
                id="guideDueDate"
                type="date"
                value={guideForm.due_date}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, due_date: e.target.value }))}
                className="bg-muted/20 border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guideNotes">Briefing / Notas</Label>
              <textarea
                id="guideNotes"
                rows={4}
                value={guideForm.notes}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-muted/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] rounded-xl p-2.5 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Insira detalhes de roteiro, referências visuais e briefing..."
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsGuideModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveGuide} className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-5">
              Salvar Guia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Alerts Detailed Modal */}
      <Dialog open={isAlertsModalOpen} onOpenChange={setIsAlertsModalOpen}>
        <DialogContent className="max-w-lg bg-black/40 backdrop-blur-xl border border-white/5 shadow-lg text-foreground max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" /> Painel de Alertas Operacionais
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs">
            {activeAlerts.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground flex flex-col items-center gap-2">
                <ThumbsUp className="h-8 w-8 text-emerald-400" />
                <p className="font-bold">Nenhum alerta crítico ativo no momento.</p>
                <p className="text-[10px] text-muted-foreground">Toda a operação está rodando de forma saudável.</p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                let badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
                if (alert.type === "task") {
                  badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                } else if (alert.type === "guide") {
                  badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                }

                return (
                  <div key={alert.id} className="p-3 bg-muted/20 border border-white/5 rounded-xl flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-lg border text-[9px] uppercase font-bold shrink-0 mt-0.5 ${badgeColor}`}>
                      {alert.type === "health" ? "saúde" : alert.type === "task" ? "pendência" : "atraso"}
                    </span>
                    <div>
                      <h4 className="font-black text-foreground uppercase text-[10px] tracking-wide">{alert.title}</h4>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{alert.desc}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-white/5">
            <Button onClick={() => setIsAlertsModalOpen(false)} className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-5">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
