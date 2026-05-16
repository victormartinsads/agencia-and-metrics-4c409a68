import { useState } from "react";
import { Check, Plus, Trash2, ListChecks, Loader2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useClientTasks, useCreateClientTask, useUpdateClientTask, useDeleteClientTask,
} from "@/hooks/useClientTasks";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientTasksDialog({ open, onOpenChange, clientId, clientName }: Props) {
  const { data: tasks, isLoading } = useClientTasks(open ? clientId : undefined);
  const createTask = useCreateClientTask();
  const updateTask = useUpdateClientTask();
  const deleteTask = useDeleteClientTask();
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);

  const handleAdd = async () => {
    const c = draft.trim();
    if (!c) return;
    try {
      await createTask.mutateAsync({ clientId, content: c });
      setDraft("");
      toast.success("Tarefa salva");
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const open_ = (tasks || []).filter(t => !t.completed);
  const done_ = (tasks || []).filter(t => t.completed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Tarefas · {clientName.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Bloco de notas com tarefas relacionadas a este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma tarefa..."
            className="min-h-[70px] text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
            }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={!draft.trim() || createTask.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Salvar tarefa
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Em aberto ({open_.length})
                </p>
                {open_.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 italic">Nenhuma tarefa pendente.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {open_.map((t) => (
                      <li key={t.id} className="group flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2.5">
                        <button
                          onClick={() => updateTask.mutate({ id: t.id, completed: true })}
                          title="Marcar como concluída"
                          className="mt-0.5 h-4 w-4 rounded border border-border hover:border-primary hover:bg-primary/10 grid place-items-center shrink-0"
                        >
                          <Check className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                        </button>
                        <p className="flex-1 text-xs whitespace-pre-wrap leading-relaxed">{t.content}</p>
                        <button
                          onClick={() => deleteTask.mutate(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 shrink-0"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {done_.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDone(v => !v)}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 hover:text-foreground"
                  >
                    Concluídas ({done_.length}) {showDone ? "▾" : "▸"}
                  </button>
                  {showDone && (
                    <ul className="space-y-1.5">
                      {done_.map((t) => (
                        <li key={t.id} className="group flex items-start gap-2 rounded-lg border border-border/40 bg-card/50 p-2.5">
                          <button
                            onClick={() => updateTask.mutate({ id: t.id, completed: false })}
                            title="Reabrir"
                            className="mt-0.5 h-4 w-4 rounded border border-primary/60 bg-primary/20 grid place-items-center shrink-0"
                          >
                            <Check className="h-3 w-3 text-primary" />
                          </button>
                          <p className="flex-1 text-xs whitespace-pre-wrap leading-relaxed line-through text-muted-foreground">{t.content}</p>
                          <button
                            onClick={() => updateTask.mutate({ id: t.id, completed: false })}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0"
                            title="Reabrir"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteTask.mutate(t.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 shrink-0"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}