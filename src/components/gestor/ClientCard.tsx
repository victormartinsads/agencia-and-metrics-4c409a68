import { useState, useEffect } from "react";
import { useGestorClientMeta, useSaveGestorClientMeta } from "@/hooks/useGestorDiary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, CheckCircle, Square, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAllClientManagerMeta, useUpsertClientHealth } from "@/hooks/useClientManagerMeta";
import { useClientTasks, useCreateClientTask, useUpdateClientTask, useDeleteClientTask } from "@/hooks/useClientTasks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ClientCardProps {
  gestorId: string;
  clientId: string;
  clientName: string;
  clientStatus: string;
  isPaused?: boolean;
  onUnlink?: () => void;
}

export default function ClientCard({ gestorId, clientId, clientName, clientStatus, isPaused, onUnlink }: ClientCardProps) {
  const { data: meta } = useGestorClientMeta(gestorId, clientId);
  const saveMeta = useSaveGestorClientMeta();
  const { data: healthMap } = useAllClientManagerMeta();
  const upsertHealth = useUpsertClientHealth();
  const [newTaskText, setNewTaskText] = useState("");

  const { data: tasks, isLoading: tasksLoading } = useClientTasks(clientId);
  const createTask = useCreateClientTask();
  const updateTask = useUpdateClientTask();
  const deleteTask = useDeleteClientTask();
  const qc = useQueryClient();

  // Migrar dados JSONB legados para client_tasks automaticamente se existirem
  useEffect(() => {
    if (tasks && tasks.length === 0 && meta?.tasks && meta.tasks.length > 0) {
      const migrate = async () => {
        for (const t of meta.tasks) {
          try {
            await supabase.from("client_tasks" as any).insert({
              client_id: clientId,
              content: t.text,
              completed: t.done,
              completed_at: t.done ? new Date().toISOString() : null,
            });
          } catch (e) {
            console.error("Erro na migração de tarefa legada:", e);
          }
        }
        // Limpar o array JSONB para evitar re-migração
        saveMeta.mutate({
          gestor_id: gestorId,
          client_id: clientId,
          meta: { tasks: [] }
        });
        // Invalidar queries para recarregar
        qc.invalidateQueries({ queryKey: ["client-tasks", clientId] });
        qc.invalidateQueries({ queryKey: ["client-tasks-count", clientId] });
      };
      migrate();
    }
  }, [tasks, meta, clientId, gestorId, saveMeta, qc]);

  const handleHealthChange = async (val: string) => {
    const score = parseInt(val, 10);
    try {
      // 1. Update global health score
      await upsertHealth.mutateAsync({ clientId, score });
      
      // 2. Update diary health score
      await saveMeta.mutateAsync({
        gestor_id: gestorId,
        client_id: clientId,
        meta: { health: score }
      });
      
      toast.success("Saúde do cliente atualizada!");
    } catch (e: any) {
      toast.error("Erro ao atualizar saúde: " + e.message);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      await createTask.mutateAsync({ clientId, content: newTaskText.trim() });
      setNewTaskText("");
      toast.success("Tarefa adicionada!");
    } catch (e: any) {
      toast.error("Erro ao adicionar tarefa: " + e.message);
    }
  };

  const handleToggleTask = (taskId: string, currentCompleted: boolean) => {
    updateTask.mutate({ id: taskId, completed: !currentCompleted });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate(taskId);
  };

  const health = healthMap?.[clientId] ?? meta?.health ?? 10;
  const healthColor = health >= 8 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : 
                      health >= 5 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : 
                      "text-red-500 bg-red-500/10 border-red-500/20";

  return (
    <Card className="bg-card border-border/50 overflow-hidden flex flex-col transition-all hover:border-border">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1 overflow-hidden">
          <CardTitle className="text-base font-bold truncate flex items-center gap-2">
            {clientName}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {isPaused ? (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50 font-normal">Pausado</Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal">{clientStatus}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onUnlink && (
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={onUnlink} title="Desvincular Cliente">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <a href={`/dashboard/${clientId}`} target="_blank" rel="noreferrer" className="shrink-0 p-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors" title="Acessar Dashboard">
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      
      {!isPaused && (
        <CardContent className="p-4 flex-1 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5"/> Saúde do Cliente</span>
            <Select value={health.toString()} onValueChange={handleHealthChange}>
              <SelectTrigger className={`h-7 w-20 text-xs font-bold ${healthColor}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10,9,8,7,6,5,4,3,2,1,0].map(n => (
                  <SelectItem key={n} value={n.toString()} className="text-xs font-bold">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <span className="text-xs font-semibold text-muted-foreground">Pendências e Tarefas</span>
            
            <div className="flex flex-col gap-2 flex-1">
              {tasks && tasks.length > 0 ? (
                tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2 group">
                    <button onClick={() => handleToggleTask(task.id, task.completed)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      {task.completed ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Square className="h-4 w-4" />}
                    </button>
                    <span className={`text-sm flex-1 break-words ${task.completed ? 'line-through text-muted-foreground opacity-70' : 'text-foreground'}`}>
                      {task.content}
                    </span>
                    <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-muted-foreground hover:text-red-400 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground italic text-center py-2 bg-muted/20 rounded border border-dashed border-border/50">
                  {tasksLoading ? "Carregando tarefas..." : "Nenhuma pendência anotada."}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/40">
              <Input
                placeholder="Nova pendência..."
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                className="h-8 text-xs bg-background"
              />
              <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={handleAddTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
