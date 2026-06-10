import { useState } from "react";
import { useClientNotionData, useSaveClientNotionData } from "@/hooks/useGestorDiary";
import { Loader2, CheckCircle, Square, Plus, Trash2, ListChecks } from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { useClientTasks, useCreateClientTask, useUpdateClientTask, useDeleteClientTask } from "@/hooks/useClientTasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as locales from "@blocknote/core/locales";

// Template padrão estilo Notion com as seções solicitadas
const defaultClientTemplate: any[] = [
  {
    type: "heading",
    props: { level: 3 },
    content: "PLANO ESTRATÉGICO - CLIENTE:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "PLANO ESTRATÉGICO - EQUIPE AND:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "DOCUMENTOS:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "ESTRATÉGIAS ATIVAS:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "MATERIAL DE APOIO:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "DADOS:"
  },
  {
    type: "bulletListItem",
    content: "PÁGINAS"
  },
  {
    type: "bulletListItem",
    content: "ICP"
  },
  {
    type: "bulletListItem",
    content: "PRODUTOS"
  },
  {
    type: "bulletListItem",
    content: "CRIATIVOS"
  },
  {
    type: "bulletListItem",
    content: "INTELIGÊNCIA DO TRÁFEGO"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "GRAVAÇÃO DA CALL:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "TRILHA SEMANAL:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "PROCESSOS:"
  },
  {
    type: "paragraph"
  },
  {
    type: "heading",
    props: { level: 3 },
    content: "METAS:"
  },
  {
    type: "paragraph"
  }
];

function InnerEditor({ initialContent, clientId, canManage, saveNotionData }: any) {
  // Cria o editor apenas UMA VEZ na montagem usando o conteúdo fornecido ou o template default.
  const options = {
    initialContent: initialContent || defaultClientTemplate,
    dictionary: locales.pt
  };
  const editor = useCreateBlockNote(options);

  const handleChange = () => {
    if (!editor) return;
    saveNotionData.mutate({ client_id: clientId, data: editor.document });
  };

  return (
    <BlockNoteView
      editor={editor}
      editable={canManage}
      onChange={handleChange}
      theme="dark"
    />
  );
}

function ClientTasksSection({ clientId, canManage }: { clientId: string; canManage: boolean }) {
  const { data: tasks, isLoading: tasksLoading } = useClientTasks(clientId);
  const createTask = useCreateClientTask();
  const updateTask = useUpdateClientTask();
  const deleteTask = useDeleteClientTask();
  const [newText, setNewText] = useState("");

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      await createTask.mutateAsync({ clientId, content: newText.trim() });
      setNewText("");
      toast.success("Tarefa adicionada!");
    } catch (e: any) {
      toast.error("Erro ao adicionar tarefa: " + e.message);
    }
  };

  if (tasksLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <ListChecks className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-tight">Pendências e Tarefas</span>
        </div>
        <div className="flex justify-center py-12 text-muted-foreground text-xs gap-2 items-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Carregando pendências...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold uppercase tracking-tight">Pendências e Tarefas</span>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2.5 group">
              <button
                disabled={!canManage}
                onClick={() => updateTask.mutate({ id: task.id, completed: !task.completed })}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-90 disabled:cursor-not-allowed"
              >
                {task.completed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span
                className={`text-sm flex-1 break-words leading-tight ${
                  task.completed
                    ? "line-through text-muted-foreground opacity-60"
                    : "text-foreground font-medium"
                }`}
              >
                {task.content}
              </span>
              {canManage && (
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-muted-foreground hover:text-red-400 transition-all"
                  title="Excluir tarefa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground/70 italic text-center py-6 bg-muted/10 rounded-lg border border-dashed border-border/50">
            Nenhuma pendência anotada.
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-auto">
          <Input
            placeholder="Nova pendência..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-8 text-xs bg-background"
          />
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            onClick={handleAdd}
            disabled={!newText.trim() || createTask.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClientNotionTemplate({ clientId, canManage }: { clientId: string, canManage: boolean }) {
  const { data: notionData, isLoading } = useClientNotionData(clientId);
  const saveNotionData = useSaveClientNotionData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando diário do cliente...</span>
      </div>
    );
  }

  // Resolve o conteúdo inicial se for um array válido
  let initialContent = undefined;
  if (Array.isArray(notionData) && notionData.length > 0) {
    initialContent = notionData;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-h-[500px] border border-border/80 rounded-xl p-4 md:p-8 bg-card shadow-sm">
        <InnerEditor
          key={clientId} // Força a recriação do editor ao mudar de cliente
          initialContent={initialContent}
          clientId={clientId}
          canManage={canManage}
          saveNotionData={saveNotionData}
        />
      </div>
      <div className="lg:col-span-1 border border-border/80 rounded-xl p-6 bg-card shadow-sm flex flex-col h-fit">
        <ClientTasksSection clientId={clientId} canManage={canManage} />
      </div>
    </div>
  );
}
