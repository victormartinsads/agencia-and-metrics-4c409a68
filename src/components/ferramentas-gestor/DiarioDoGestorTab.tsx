import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Heart,
  CheckCircle2,
  Circle,
  Plus,
  Pencil,
  Eye,
  AlertTriangle,
  CheckSquare,
  LayoutDashboard,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Star,
  StickyNote,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useGestorClientMeta, useSaveGestorClientMeta } from "@/hooks/useGestorDiary";
import { useAllClientManagerMeta } from "@/hooks/useClientManagerMeta";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(h: number) {
  if (h >= 8) return "text-emerald-400";
  if (h >= 5) return "text-yellow-400";
  return "text-red-400";
}
function healthBg(h: number) {
  if (h >= 8) return "bg-emerald-500/10 border-emerald-500/20";
  if (h >= 5) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}
function healthLabel(h: number) {
  if (h >= 8) return "Excelente";
  if (h >= 6) return "Bom";
  if (h >= 4) return "Regular";
  return "Crítico";
}

// ── Per-client Card ───────────────────────────────────────────────────────────

function ClientDiaryCard({
  client,
  gestorId,
  healthMapData,
}: {
  client: any;
  gestorId: string;
  healthMapData?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState("");

  const { data: meta, isLoading } = useGestorClientMeta(gestorId, client.id);
  const saveMeta = useSaveGestorClientMeta();

  const health: number = meta?.health ?? 10;
  const tasks: Array<{ id: string; text: string; done: boolean }> = meta?.tasks ?? [];
  const pendingCount = tasks.filter((t) => !t.done).length;

  // Notes from localStorage (same as ClientDetailModal)
  const notesKey = `client_notes:${client.id}`;
  const savedNote = typeof window !== "undefined" ? localStorage.getItem(notesKey) || "" : "";

  const handleHealthClick = async (newH: number) => {
    await saveMeta.mutateAsync({
      gestor_id: gestorId,
      client_id: client.id,
      meta: { health: newH },
    });
    toast.success("Saúde atualizada!");
  };

  const handleToggleTask = async (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    await saveMeta.mutateAsync({
      gestor_id: gestorId,
      client_id: client.id,
      meta: { tasks: updated },
    });
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const updated = [
      ...tasks,
      { id: crypto.randomUUID(), text: newTask.trim(), done: false },
    ];
    await saveMeta.mutateAsync({
      gestor_id: gestorId,
      client_id: client.id,
      meta: { tasks: updated },
    });
    setNewTask("");
    setAddingTask(false);
  };

  const handleSaveNote = () => {
    localStorage.setItem(notesKey, noteText);
    setEditingNote(false);
    toast.success("Observação salva!");
  };

  const alerts = healthMapData?.alerts || [];

  return (
    <Card className="bg-[#0f1117] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all">
      {/* Card Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Health Ring */}
        <div
          className={`h-10 w-10 rounded-xl border flex flex-col items-center justify-center shrink-0 ${healthBg(health)}`}
        >
          <span className={`text-sm font-black leading-none ${healthColor(health)}`}>{health}</span>
          <span className="text-[8px] text-muted-foreground leading-none mt-0.5">/ 10</span>
        </div>

        {/* Name + Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-slate-200 truncate">{client.name}</p>
            <Badge
              className={`text-[9px] font-bold border rounded-full px-1.5 py-0 ${healthBg(health)} ${healthColor(health)}`}
            >
              {healthLabel(health)}
            </Badge>
            {pendingCount > 0 && (
              <Badge className="text-[9px] font-bold border rounded-full px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                {pendingCount} tarefa{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
            {alerts.filter((a: any) => a.severity === "high").length > 0 && (
              <Badge className="text-[9px] font-bold border rounded-full px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20">
                {alerts.filter((a: any) => a.severity === "high").length} alerta{alerts.filter((a: any) => a.severity === "high").length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {client.ad_account_ids?.[0] || "Sem conta Meta vinculada"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to={`/ferramentas-do-gestor?tab=meta-ads&editor=${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="h-7 px-2 flex items-center gap-1 text-[10px] font-bold bg-[#b5f23d]/10 text-[#b5f23d] border border-[#b5f23d]/20 rounded-lg hover:bg-[#b5f23d]/20 transition"
          >
            <Eye className="h-3 w-3" /> Editor
          </Link>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Body */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (
            <>
              {/* Health Slider */}
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Heart className="h-3 w-3" /> Saúde do Cliente
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                    <button
                      key={v}
                      onClick={() => handleHealthClick(v)}
                      className={`h-7 w-full rounded-md text-[11px] font-bold transition-all ${
                        v <= health
                          ? v <= 3
                            ? "bg-red-500/70 text-white"
                            : v <= 6
                            ? "bg-yellow-500/70 text-black"
                            : "bg-emerald-500/70 text-black"
                          : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.08]"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Alertas ({alerts.length})
                  </p>
                  <div className="space-y-1.5">
                    {alerts.slice(0, 3).map((a: any, i: number) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-lg text-[11px] ${
                          a.severity === "high"
                            ? "bg-red-500/10 text-red-300 border border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{a.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <CheckSquare className="h-3 w-3" /> Tarefas ({pendingCount} pendente{pendingCount !== 1 ? "s" : ""})
                  </p>
                  <button
                    onClick={() => setAddingTask(true)}
                    className="text-[10px] text-primary font-bold hover:text-primary/80 transition flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Nova
                  </button>
                </div>

                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.02] transition cursor-pointer group"
                      onClick={() => handleToggleTask(task.id)}
                    >
                      {task.done ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition" />
                      )}
                      <span
                        className={`text-[11px] leading-snug ${
                          task.done ? "line-through text-muted-foreground/60" : "text-slate-300"
                        }`}
                      >
                        {task.text}
                      </span>
                    </div>
                  ))}

                  {tasks.length === 0 && !addingTask && (
                    <p className="text-[11px] text-muted-foreground italic py-2">
                      Nenhuma tarefa cadastrada para este cliente.
                    </p>
                  )}

                  {addingTask && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        autoFocus
                        placeholder="Descreva a tarefa..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                        className="h-8 text-xs bg-black/20 border-white/10"
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={handleAddTask}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => { setAddingTask(false); setNewTask(""); }}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Observation Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <StickyNote className="h-3 w-3" /> Observação
                  </p>
                  {!editingNote && (
                    <button
                      onClick={() => { setNoteText(savedNote); setEditingNote(true); }}
                      className="text-[10px] text-primary font-bold hover:text-primary/80 flex items-center gap-1 transition"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                  )}
                </div>
                {editingNote ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Observações sobre este cliente..."
                      className="text-xs h-16 bg-black/20 border-white/10 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveNote}>
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => setEditingNote(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    {savedNote || "Sem observações."}
                  </p>
                )}
              </div>

              {/* Quick Links */}
              <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] flex-1 gap-1 text-muted-foreground hover:text-white"
                >
                  <Link to={`/dashboard/${client.id}?tab=diario`}>
                    <BookOpen className="h-3 w-3" /> Diário
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] flex-1 gap-1 text-muted-foreground hover:text-white"
                >
                  <Link to={`/dashboard/${client.id}`}>
                    <LayoutDashboard className="h-3 w-3" /> Dashboard
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] flex-1 gap-1 text-muted-foreground hover:text-white"
                >
                  <Link to={`/dashboard/${client.id}?tab=funil`}>
                    <TrendingUp className="h-3 w-3" /> Funil
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DiarioDoGestorTab() {
  const { user } = useAuth();
  const gestorId = user?.id || "";
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: healthMap } = useAllClientManagerMeta();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "critico" | "regular" | "bom">("all");

  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [clients, search]);

  return (
    <div className="space-y-5 text-slate-100">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-100">
            Diário do Gestor
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Saúde, tarefas e observações por cliente · {clients.length} clientes
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-3 text-xs bg-card/50 border-border/60 w-[200px] rounded-xl"
            />
          </div>
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
            {(["all", "critico", "regular", "bom"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize transition ${
                  filterStatus === f
                    ? "bg-white/[0.08] text-white shadow"
                    : "text-muted-foreground hover:text-slate-300"
                }`}
              >
                {f === "all" ? "Todos" : f === "critico" ? "Críticos" : f === "regular" ? "Regular" : "Saudáveis"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Clientes", value: String(clients.length), color: "text-slate-100", icon: Star },
          { label: "Saúde Média", value: "—", color: "text-emerald-400", icon: Heart },
          { label: "Tarefas Pendentes", value: "—", color: "text-amber-400", icon: CheckSquare },
          { label: "Com Alertas", value: "—", color: "text-red-400", icon: AlertTriangle },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                {kpi.label}
              </p>
              <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Client Cards Grid */}
      {clientsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-sm rounded-2xl bg-card/50">
          Nenhum cliente encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((client) => (
            <ClientDiaryCard
              key={client.id}
              client={client}
              gestorId={gestorId}
              healthMapData={healthMap ? { score: healthMap[client.id] } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
