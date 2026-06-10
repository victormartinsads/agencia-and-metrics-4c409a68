import { useState } from "react";
import { useClientNotionData, useSaveClientNotionData } from "@/hooks/useGestorDiary";
import { Loader2, CheckCircle, Square, Plus, Trash2, ListChecks, Compass, Users, FolderOpen, Flame, Link2, Database, Video, Milestone, GitMerge, Trophy } from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { useClientTasks, useCreateClientTask, useUpdateClientTask, useDeleteClientTask } from "@/hooks/useClientTasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as locales from "@blocknote/core/locales";

// Template padrão estilo Notion apenas para a seção DADOS (como no print)
const defaultDadosTemplate: any[] = [
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
  }
];

function SectionEditor({ initialContent, sectionKey, onSave, canManage }: any) {
  // Cria o editor apenas UMA VEZ na montagem usando o conteúdo fornecido
  const options = {
    initialContent: (initialContent && initialContent.length > 0) ? initialContent : [{ type: "paragraph", content: [] }],
    dictionary: locales.pt
  };
  const editor = useCreateBlockNote(options);

  const handleChange = () => {
    if (!editor) return;
    onSave(sectionKey, editor.document);
  };

  return (
    <div className="ml-[-46px]">
      <BlockNoteView
        editor={editor}
        editable={canManage}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}

function DiaryCard({ title, icon, sectionKey, initialContent, onSave, canManage, clientId }: any) {
  return (
    <div className="border border-border/80 rounded-xl p-5 bg-card shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
          {title}
        </span>
      </div>
      <div className="flex-1 min-h-[80px]">
        <SectionEditor
          key={`${clientId}-${sectionKey}`} // Força a recriação do editor ao mudar de cliente
          initialContent={initialContent}
          sectionKey={sectionKey}
          onSave={onSave}
          canManage={canManage}
        />
      </div>
    </div>
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

  // Resolve os conteúdos de cada seção
  let sectionsData: any = {};
  if (notionData) {
    if (Array.isArray(notionData)) {
      // Caso haja dado legado no formato flat array, colocamos na primeira seção
      sectionsData = { plano_cliente: notionData };
    } else {
      sectionsData = notionData;
    }
  }

  const handleSaveSection = (key: string, doc: any) => {
    const updated = {
      ...sectionsData,
      [key]: doc
    };
    saveNotionData.mutate({ client_id: clientId, data: updated });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Coluna Esquerda */}
      <div className="space-y-6">
        <DiaryCard
          title="Plano Estratégico - Cliente"
          icon={<Compass className="h-4 w-4" />}
          sectionKey="plano_cliente"
          initialContent={sectionsData.plano_cliente}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Plano Estratégico - Equipe AND"
          icon={<Users className="h-4 w-4" />}
          sectionKey="plano_equipe"
          initialContent={sectionsData.plano_equipe}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Documentos"
          icon={<FolderOpen className="h-4 w-4" />}
          sectionKey="documentos"
          initialContent={sectionsData.documentos}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Estratégias Ativas"
          icon={<Flame className="h-4 w-4" />}
          sectionKey="estrategias_ativas"
          initialContent={sectionsData.estrategias_ativas}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
      </div>

      {/* Coluna Direita */}
      <div className="space-y-6">
        {/* Card de Tarefas Sincronizado */}
        <div className="border border-border/80 rounded-xl p-5 bg-card shadow-sm flex flex-col h-fit">
          <ClientTasksSection clientId={clientId} canManage={canManage} />
        </div>

        <DiaryCard
          title="Material de Apoio"
          icon={<Link2 className="h-4 w-4" />}
          sectionKey="material_apoio"
          initialContent={sectionsData.material_apoio}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Dados"
          icon={<Database className="h-4 w-4" />}
          sectionKey="dados"
          initialContent={sectionsData.dados || defaultDadosTemplate}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Gravação da Call"
          icon={<Video className="h-4 w-4" />}
          sectionKey="gravacao_call"
          initialContent={sectionsData.gravacao_call}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Trilha Semanal"
          icon={<Milestone className="h-4 w-4" />}
          sectionKey="trilha_semanal"
          initialContent={sectionsData.trilha_semanal}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Processos"
          icon={<GitMerge className="h-4 w-4" />}
          sectionKey="processos"
          initialContent={sectionsData.processos}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
        <DiaryCard
          title="Metas"
          icon={<Trophy className="h-4 w-4" />}
          sectionKey="metas"
          initialContent={sectionsData.metas}
          onSave={handleSaveSection}
          canManage={canManage}
          clientId={clientId}
        />
      </div>
    </div>
  );
}
