import { useState, useEffect } from "react";
import { useClientNotionData, useSaveClientNotionData, useSyncDriveCalls } from "@/hooks/useGestorDiary";
import { Loader2, CheckCircle, Square, Plus, Trash2, ListChecks, Compass, Users, FolderOpen, Flame, Link2, Database, Video, Milestone, GitMerge, Trophy, Calendar, MessageCircle, Mail, DollarSign, Flag, Instagram, RefreshCw } from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { useClientTasks, useCreateClientTask, useUpdateClientTask, useDeleteClientTask } from "@/hooks/useClientTasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as locales from "@blocknote/core/locales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function PropertyInput({ label, icon, value, onChange, canManage }: any) {
  const [localVal, setLocalVal] = useState(value || "");

  useEffect(() => {
    setLocalVal(value || "");
  }, [value]);

  const handleBlur = () => {
    if (localVal !== (value || "")) {
      onChange(localVal);
    }
  };

  const isLink = localVal.startsWith("http://") || localVal.startsWith("https://");

  return (
    <div className="grid grid-cols-3 py-1.5 items-center hover:bg-accent/15 px-2 rounded-md transition-colors text-xs border-b border-border/10">
      <div className="flex items-center gap-2 text-muted-foreground select-none">
        {icon}
        <span>{label}</span>
      </div>
      <div className="col-span-2">
        {canManage ? (
          <input
            type="text"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="Vazio"
            className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary/20 rounded px-1.5 py-0.5 text-foreground hover:bg-accent/30 transition-all placeholder:italic placeholder:opacity-50"
          />
        ) : (
          <div className="px-1.5 py-0.5 text-foreground min-h-[20px] truncate">
            {isLink ? (
              <a href={localVal} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                {localVal}
              </a>
            ) : (
              localVal || <span className="text-muted-foreground/30 italic">Vazio</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityProperty({ value, onChange, canManage }: any) {
  const badgeColor = value === "Alta" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                     value === "Média" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                     value === "Baixa" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                     "text-muted-foreground/30 italic";

  if (!canManage) {
    return (
      <div className="grid grid-cols-3 py-1.5 items-center hover:bg-accent/15 px-2 rounded-md transition-colors text-xs border-b border-border/10">
        <div className="flex items-center gap-2 text-muted-foreground select-none">
          <Flag className="h-3.5 w-3.5" />
          <span>Prioridade</span>
        </div>
        <div className="col-span-2 px-1.5 py-0.5 text-foreground">
          {value ? (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
              {value.toUpperCase()}
            </span>
          ) : (
            <span className="text-muted-foreground/30 italic">Vazio</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 py-1.5 items-center hover:bg-accent/15 px-2 rounded-md transition-colors text-xs border-b border-border/10">
      <div className="flex items-center gap-2 text-muted-foreground select-none">
        <Flag className="h-3.5 w-3.5" />
        <span>Prioridade</span>
      </div>
      <div className="col-span-2 px-1.5">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none outline-none focus:ring-1 focus:ring-primary/20 rounded py-0.5 text-foreground cursor-pointer hover:bg-accent/30 transition-all font-semibold"
        >
          <option value="" className="bg-card text-muted-foreground">Vazio</option>
          <option value="Alta" className="bg-card text-red-400">ALTA</option>
          <option value="Média" className="bg-card text-yellow-400">MÉDIA</option>
          <option value="Baixa" className="bg-card text-emerald-400">BAIXA</option>
        </select>
      </div>
    </div>
  );
}

function SectionEditor({ initialContent, sectionKey, onSave, canManage }: any) {
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
    <div className="blocknote-editor-wrapper">
      <BlockNoteView
        editor={editor}
        editable={canManage}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}

function DiaryCard({ title, icon, sectionKey, initialContent, onSave, canManage, clientId, children, action }: any) {
  return (
    <div className="border border-border/80 rounded-xl p-5 bg-card shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
            {title}
          </span>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-[85px]">
        {children ? children : (
          <SectionEditor
            key={`${clientId}-${sectionKey}`} // Força a recriação do editor ao mudar de cliente
            initialContent={initialContent}
            sectionKey={sectionKey}
            onSave={onSave}
            canManage={canManage}
          />
        )}
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
  const syncDrive = useSyncDriveCalls();
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);

  const handleSyncDrive = async () => {
    try {
      toast.loading("Buscando gravações no Google Drive...", { id: "sync-drive" });
      const res = await syncDrive.mutateAsync(clientId);
      toast.success(`Sincronização concluída! ${res.count} gravações encontradas.`, { id: "sync-drive" });
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message, { id: "sync-drive" });
    }
  };

  const { data: clientInfo } = useQuery({
    queryKey: ["client-info-notion", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("name").eq("id", clientId).single();
      return data;
    },
    enabled: !!clientId
  });

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
      sectionsData = { plano_cliente: notionData };
    } else {
      sectionsData = notionData;
    }
  }

  const propsData = sectionsData.properties || {};

  const handleSaveSection = (key: string, doc: any) => {
    const updated = {
      ...sectionsData,
      [key]: doc
    };
    saveNotionData.mutate({ client_id: clientId, data: updated });
  };

  const handlePropertyChange = (key: string, value: string) => {
    const updatedProperties = {
      ...propsData,
      [key]: value
    };
    const updated = {
      ...sectionsData,
      properties: updatedProperties
    };
    saveNotionData.mutate({ client_id: clientId, data: updated });
  };

  const subSections = [
    { key: "dados_paginas", label: "Páginas" },
    { key: "dados_icp", label: "ICP" },
    { key: "dados_produtos", label: "Produtos" },
    { key: "dados_criativos", label: "Criativos" },
    { key: "dados_trafego", label: "Inteligência do Tráfego" }
  ];

  const clientName = clientInfo?.name || "Ficha do Cliente";

  return (
    <div className="space-y-8">
      {/* CSS overrides to fix grey background leakage and alignment */}
      <style dangerouslySetInnerHTML={{ __html: `
        .blocknote-editor-wrapper .bn-container,
        .blocknote-editor-wrapper .bn-editor {
          background-color: transparent !important;
          padding: 0 !important;
        }
        .blocknote-editor-wrapper .bn-editor {
          margin-inline-start: 12px !important;
        }
      ` }} />

      {/* Notion Page Header & Properties */}
      <div className="border-b border-border/40 pb-6 space-y-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase">
          {clientName}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 max-w-4xl bg-card/25 p-4 rounded-xl border border-border/40 shadow-sm">
          <PropertyInput
            label="Assinatura"
            icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.assinatura}
            onChange={(val: string) => handlePropertyChange("assinatura", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="WhatsApp"
            icon={<MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.whatsapp}
            onChange={(val: string) => handlePropertyChange("whatsapp", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Vencimento do Contrato"
            icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.vencimento}
            onChange={(val: string) => handlePropertyChange("vencimento", val)}
            canManage={canManage}
          />
          <PriorityProperty
            value={propsData.prioridade}
            onChange={(val: string) => handlePropertyChange("prioridade", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Email"
            icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.email}
            onChange={(val: string) => handlePropertyChange("email", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Mês no Tráfego"
            icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.mes_trafego}
            onChange={(val: string) => handlePropertyChange("mes_trafego", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Instagram - 01"
            icon={<Instagram className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.instagram1}
            onChange={(val: string) => handlePropertyChange("instagram1", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Dia no Tráfego"
            icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.dia_trafego}
            onChange={(val: string) => handlePropertyChange("dia_trafego", val)}
            canManage={canManage}
          />
          <PropertyInput
            label="Instagram - 02"
            icon={<Instagram className="h-3.5 w-3.5 text-muted-foreground" />}
            value={propsData.instagram2}
            onChange={(val: string) => handlePropertyChange("instagram2", val)}
            canManage={canManage}
          />
        </div>
      </div>

      {/* Grade de Cards do Diário */}
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
            clientId={clientId}
          >
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2.5 py-1.5 mb-2 font-bold select-none uppercase tracking-wide">
                ICP, Produtos, Seguidores, etc.
              </p>
              {subSections.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubSection(sub.key)}
                  className="w-full text-left bg-accent/20 border border-border/40 hover:bg-accent/40 hover:border-primary/30 px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs font-bold text-foreground transition-all group"
                >
                  <span className="uppercase tracking-wider select-none">{sub.label}</span>
                  <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors font-bold uppercase select-none">
                    Abrir Bloco →
                  </span>
                </button>
              ))}
            </div>
          </DiaryCard>

          <DiaryCard
            title="Gravação da Call"
            icon={<Video className="h-4 w-4" />}
            sectionKey="gravacao_call"
            initialContent={sectionsData.gravacao_call}
            onSave={handleSaveSection}
            canManage={canManage}
            clientId={clientId}
            action={canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncDrive}
                disabled={syncDrive.isPending}
                className="h-6 text-[10px] uppercase font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2 border border-primary/20"
              >
                {syncDrive.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Sincronizar Drive
              </Button>
            )}
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

      {/* Sub-Section Dialog Editor for DADOS */}
      <Dialog
        open={activeSubSection !== null}
        onOpenChange={(open) => !open && setActiveSubSection(null)}
      >
        <DialogContent className="max-w-3xl bg-card border-border/80 blocknote-editor-wrapper">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="uppercase tracking-wider flex items-center gap-2 text-sm font-bold text-foreground">
              <Database className="h-4 w-4 text-primary" />
              Dados · {subSections.find(s => s.key === activeSubSection)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-[350px] border border-border/60 rounded-xl p-4 bg-muted/10 mt-4 overflow-y-auto max-h-[60vh]">
            {activeSubSection && (
              <SectionEditor
                key={`${clientId}-${activeSubSection}`} // Recria o editor se o cliente ou subseção mudar
                initialContent={sectionsData[activeSubSection]}
                sectionKey={activeSubSection}
                onSave={handleSaveSection}
                canManage={canManage}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
