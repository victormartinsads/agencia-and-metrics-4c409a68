import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRoles, useGestorTasks, useManageGestorTask } from "@/hooks/useGestorDiary";
import { useGestorScorecards, useUpsertScorecard, type GestorScorecard } from "@/hooks/useGestorScorecard";
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
} from "lucide-react";

export default function DiretorOverview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: sysRole } = useUserRole();

  const header = (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-elevated)]">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">
            Saúde da <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Carteira de Gestores</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Visão comparativa de competências, pontos de melhoria e plano de evolução
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResetPDIs()}
          className="h-9 gap-1.5 text-xs font-bold border-border/60 hover:bg-accent/40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Redefinir PDIs
        </Button>
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
  const { data: clientMeta = [] } = useQuery({
    queryKey: ["all-client-manager-meta"],
    queryFn: async () => {
      const { data } = await supabase.from("client_manager_meta").select("client_id, health_score");
      return data || [];
    },
  });

  // Load all client tasks
  const { data: clientTasks = [] } = useQuery({
    queryKey: ["all-client-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("client_tasks").select("client_id, completed");
      return data || [];
    },
  });

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

  // List of active Gestores
  const gestores = useMemo(() => {
    // We want to fetch all staff roles that are 'gestor'
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

        // Manual scores
        const proatividade = scorecard?.proatividade ?? 8.0;
        const comunicacao = scorecard?.comunicacao ?? 8.0;
        const velocidade = scorecard?.velocidade ?? 8.0;
        const tecnica = scorecard?.tecnica ?? 8.0;

        // Skill Groupings
        // Hard Skills: Técnica, Velocidade, Qualidade (auto)
        const hardAverage = (tecnica + velocidade + autoQualidade) / 3;
        // Soft Skills: Proatividade, Comunicação, Organização (auto)
        const softAverage = (proatividade + comunicacao + autoOrganizacao) / 3;

        // Overall Average (All 6 competencies)
        const overallAverage = (tecnica + proatividade + autoQualidade + autoOrganizacao + comunicacao + velocidade) / 6;

        return {
          id: r.user_id,
          name: displayName,
          email,
          role: roleOverride,
          avatar,
          scores: {
            tecnica,
            proatividade,
            qualidade: autoQualidade,
            organizacao: autoOrganizacao,
            comunicacao,
            velocidade,
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

    // Focus Strategy: identify competencies that are lowest across the team
    const competencySums = { tecnica: 0, proatividade: 0, qualidade: 0, organizacao: 0, comunicacao: 0, velocidade: 0 };
    gestores.forEach((g) => {
      competencySums.tecnica += g.scores.tecnica;
      competencySums.proatividade += g.scores.proatividade;
      competencySums.qualidade += g.scores.qualidade;
      competencySums.organizacao += g.scores.organizacao;
      competencySums.comunicacao += g.scores.comunicacao;
      competencySums.velocidade += g.scores.velocidade;
    });

    const entries = Object.entries(competencySums).map(([key, value]) => ({
      key,
      avg: value / gestores.length,
    }));
    // Sort ascending (lowest averages first)
    entries.sort((a, b) => a.avg - b.avg);

    const translate: Record<string, string> = {
      tecnica: "Técnica",
      proatividade: "Proatividade",
      qualidade: "Qualidade",
      organizacao: "Organização",
      comunicacao: "Comunicação",
      velocidade: "Velocidade",
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

  // Editing state
  const [editingGestor, setEditingGestor] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    tecnica: 8.0,
    proatividade: 8.0,
    velocidade: 8.0,
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
      tecnica: g.scores.tecnica,
      proatividade: g.scores.proatividade,
      velocidade: g.scores.velocidade,
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

      // Save Profile Override Names / Roles
      await saveProfileMetaMutation.mutateAsync({
        gestor_id: editingGestor.id,
        name_override: editForm.name,
        role_override: editForm.role,
      });

      // Save Scorecard parameters
      await upsertScorecardMutation.mutateAsync({
        gestor_id: editingGestor.id,
        tecnica: Number(editForm.tecnica),
        proatividade: Number(editForm.proatividade),
        velocidade: Number(editForm.velocidade),
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

  // Reset scores mock triggers
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

  // Radar chart helper: draws the background pentagon lines and actual values polygon
  const renderRadarChart = (scores: { tecnica: number; proatividade: number; qualidade: number; organizacao: number; comunicacao: number; velocidade: number }) => {
    const cx = 110;
    const cy = 115;
    const maxRadius = 60;

    // Angles for pentagon in radians
    const angles = [
      (-126 * Math.PI) / 180, // Proatividade (Top Left)
      (-54 * Math.PI) / 180,  // Comunicação (Top Right)
      (18 * Math.PI) / 180,   // Organização (Right Bottom)
      (90 * Math.PI) / 180,   // Velocidade (Bottom)
      (162 * Math.PI) / 180,  // Qualidade (Left Bottom)
    ];

    const getX = (radius: number, angle: number) => cx + radius * Math.cos(angle);
    const getY = (radius: number, angle: number) => cy + radius * Math.sin(angle);

    // Grid Levels (20%, 40%, 60%, 80%, 100%)
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // Score coordinates
    const values = [
      scores.proatividade,
      scores.comunicacao,
      scores.organizacao,
      scores.velocidade,
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
      <svg className="w-full h-[220px]" viewBox="0 0 220 220">
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
              strokeWidth="1.5"
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
            strokeWidth="1.5"
          />
        ))}

        {/* Labels outside pentagon */}
        <text x={getX(maxRadius + 14, angles[0])} y={getY(maxRadius + 5, angles[0])} fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="end">
          Proatividade {scores.proatividade.toFixed(1).replace(".", ",")}
        </text>
        <text x={getX(maxRadius + 14, angles[1])} y={getY(maxRadius + 5, angles[1])} fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="start">
          Comunicação {scores.comunicacao.toFixed(1).replace(".", ",")}
        </text>
        <text x={getX(maxRadius + 14, angles[2])} y={getY(maxRadius + 5, angles[2])} fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="start">
          Organização {scores.organizacao.toFixed(1).replace(".", ",")}
        </text>
        <text x={getX(maxRadius + 5, angles[3])} y={getY(maxRadius + 14, angles[3])} fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="middle">
          Velocidade {scores.velocidade.toFixed(1).replace(".", ",")}
        </text>
        <text x={getX(maxRadius + 14, angles[4])} y={getY(maxRadius + 5, angles[4])} fill="currentColor" className="text-muted-foreground" fontSize="9" fontWeight="bold" textAnchor="end">
          Qualidade {scores.qualidade.toFixed(1).replace(".", ",")}
        </text>

        {/* Values Filled Polygon */}
        {polyPoints && (
          <polygon
            points={polyPoints}
            fill="hsl(var(--primary) / 0.16)"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
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
              r="4.5"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth="2.0"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <AppShell currentPage="home" header={header} noContainer>
      {/* Main Content Area */}
      <main className="max-w-[1500px] mx-auto px-4 md:px-6 py-5 space-y-6">
        {/* Top Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart Column */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Síntese da Saúde Geral dos Gestores
              </h2>
            </div>

            {/* Bar Chart Container */}
            <div className="h-[220px] flex items-end gap-1 sm:gap-4 px-2 pt-4">
              {gestores.map((g) => {
                const percent = g.overallAverage * 10;
                return (
                  <div key={g.id} className="flex-1 flex flex-col items-center group relative">
                    {/* Score Value tooltip above the bar */}
                    <span className="text-xs font-black text-foreground mb-2 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {g.overallAverage.toFixed(1).replace(".", ",")}
                    </span>
                    {/* Bar body */}
                    <div className="w-full sm:w-16 bg-muted/40 border border-border/60 rounded-t-xl overflow-hidden h-[130px] flex items-end">
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-[image:var(--gradient-hero)] rounded-t-sm transition-all duration-1000 ease-out shadow-[var(--shadow-elevated)]"
                      ></div>
                    </div>
                    {/* Name label */}
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-3 text-center truncate w-full">
                      {g.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border/40">
              <div className="h-3 w-3 rounded-full bg-primary shadow-elevated"></div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Média das 6 Competências Reais (Sincronizado de Fato)
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
                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 font-bold border border-yellow-500/20">🏆</span>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Melhor média</p>
                    <p className="text-foreground font-bold">{teamInsights.bestAvg}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">⚖️</span>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Sustentação Soft-Skills</p>
                    <p className="text-foreground font-bold">{teamInsights.bestSoft}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold border border-rose-500/20">🎯</span>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Foco estratégico da equipe</p>
                    <p className="text-primary font-extrabold">{teamInsights.focus}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                  <span className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">👤</span>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Equipe operacional</p>
                    <p className="text-primary font-bold">{teamInsights.activeCount} Gestores de Fato Operando</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Synchronizer Box */}
            <div className="mt-6 bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-3.5">
              <Wrench className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="leading-tight">
                <p className="text-[10px] font-black uppercase tracking-wider text-primary">Sincronizador Multiusuário</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Clique no <strong className="text-foreground font-bold">lápis</strong> de qualquer gestor para editar suas competências no scorecard e seu plano de cursos manual.
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
              className="bg-muted/20 border-border/60 text-foreground text-xs"
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
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/40 rounded-xl">
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
                {/* Card Header Override */}
                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-4 mb-4">
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
                      Hard: <strong className="text-foreground ml-1">{g.hardAverage.toFixed(1).replace(".", ",")}</strong>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Soft: <strong className="text-foreground ml-1">{g.softAverage.toFixed(1).replace(".", ",")}</strong>
                    </span>
                  </div>
                </div>

                {/* Main Score & Edit Pencil */}
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl border border-border/40 mb-2">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Técnica no tráfego</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">
                      {g.scores.tecnica.toFixed(1).replace(".", ",")}
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

                {/* Radar Chart */}
                <div className="flex justify-center my-3 relative">
                  {renderRadarChart(g.scores)}
                </div>

                {/* Forces and Improvements */}
                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 mt-2 text-xs">
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
                <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 mt-4 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-primary font-bold mb-2">
                      <span>📚</span>
                      <span className="uppercase text-[10px] tracking-wider">C) Cursos & Tools</span>
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
                      <span className="uppercase text-[10px] tracking-wider">D) Prazos (8+)</span>
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
      </main>

      {/* Edit PDI Modal */}
      <Dialog open={editingGestor !== null} onOpenChange={(open) => !open && setEditingGestor(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto">
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
                  className="bg-muted/20 border-border/60 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gestorRole">Função (Override)</Label>
                <Input
                  id="gestorRole"
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-muted/20 border-border/60 text-foreground"
                />
              </div>

              <div className="border-t border-border/40 pt-4 mt-2">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-primary mb-3">
                  Competências Manuais (0 a 10)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreTecnica">Técnica no Tráfego</Label>
                    <Input
                      id="scoreTecnica"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.tecnica}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tecnica: Number(e.target.value) }))}
                      className="bg-muted/20 border-border/60 text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreProatividade">Proatividade</Label>
                    <Input
                      id="scoreProatividade"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.proatividade}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, proatividade: Number(e.target.value) }))}
                      className="bg-muted/20 border-border/60 text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreVelocidade">Velocidade</Label>
                    <Input
                      id="scoreVelocidade"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.velocidade}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, velocidade: Number(e.target.value) }))}
                      className="bg-muted/20 border-border/60 text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scoreComunicacao">Comunicação</Label>
                    <Input
                      id="scoreComunicacao"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.comunicacao}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, comunicacao: Number(e.target.value) }))}
                      className="bg-muted/20 border-border/60 text-foreground"
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
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-2 text-foreground text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ads Avançado&#10;GA4 + GTM"
                />
              </div>
            </div>
          </div>

          {/* Deadlines Section */}
          <div className="border-t border-border/40 pt-4 text-xs font-semibold text-muted-foreground">
            <div className="flex justify-between items-center mb-3">
              <Label>⏰ Plano de Prazos (timeframes)</Label>
              <Button type="button" size="sm" onClick={handleAddDeadline} className="bg-muted/20 border border-border/60 text-primary font-bold text-[10px] hover:bg-accent/40 h-7">
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
                    className="bg-muted/20 border-border/60 text-foreground text-xs"
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
                    className="bg-muted/20 border-border/60 text-foreground text-xs w-[140px]"
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

          <DialogFooter className="mt-6 border-t border-border/40 pt-4">
            <Button variant="ghost" onClick={() => setEditingGestor(null)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/85 text-primary-foreground font-bold text-xs uppercase px-5">
              Salvar PDI
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
