import { useState, useEffect } from "react";
import { useClientNotionData, useSaveClientNotionData, useSyncDriveCalls } from "@/hooks/useGestorDiary";
import {
  Loader2,
  CheckCircle,
  Square,
  Plus,
  Trash2,
  Compass,
  Users,
  FolderOpen,
  Flame,
  Link2,
  Database,
  Video,
  Milestone,
  GitMerge,
  Trophy,
  Calendar,
  MessageCircle,
  Mail,
  DollarSign,
  Flag,
  Instagram,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  ListChecks,
} from "lucide-react";
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
import { useUpdateClient } from "@/hooks/useClients";

// ─── Notion Property Row ─────────────────────────────────────────────────────
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
    <div className="flex items-center text-xs py-1 hover:bg-[#202020] px-2 rounded transition-colors group h-7">
      <div className="w-40 flex items-center gap-2 text-[#9b9a97] select-none shrink-0 font-medium">
        <span className="opacity-70">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        {canManage ? (
          <input
            type="text"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="Vazio"
            className="w-full bg-transparent border-none outline-none focus:ring-0 rounded px-1 text-[#e3e2e0] hover:bg-[#252525] focus:bg-[#252525] transition-all placeholder:italic placeholder:opacity-30"
          />
        ) : (
          <div className="px-1 text-[#e3e2e0] truncate">
            {isLink ? (
              <a href={localVal} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                {localVal}
              </a>
            ) : (
              localVal || <span className="text-[#5f5e5b] italic">Vazio</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityProperty({ value, onChange, canManage }: any) {
  const badgeColor = value === "Alta" ? "text-red-400" :
                     value === "Média" ? "text-yellow-400" :
                     value === "Baixa" ? "text-emerald-400" :
                     "text-[#5f5e5b] italic";

  if (!canManage) {
    return (
      <div className="flex items-center text-xs py-1 hover:bg-[#202020] px-2 rounded transition-colors h-7">
        <div className="w-40 flex items-center gap-2 text-[#9b9a97] select-none shrink-0 font-medium">
          <span className="opacity-70"><Flag className="h-3.5 w-3.5" /></span>
          <span>Prioridade</span>
        </div>
        <div className="flex-1 px-1">
          {value ? (
            <span className={`font-semibold ${badgeColor}`}>{value}</span>
          ) : (
            <span className="text-[#5f5e5b] italic">Vazio</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs py-1 hover:bg-[#202020] px-2 rounded transition-colors h-7">
      <div className="w-40 flex items-center gap-2 text-[#9b9a97] select-none shrink-0 font-medium">
        <span className="opacity-70"><Flag className="h-3.5 w-3.5" /></span>
        <span>Prioridade</span>
      </div>
      <div className="flex-1 px-1">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none outline-none focus:ring-0 text-[#e3e2e0] cursor-pointer hover:bg-[#252525] focus:bg-[#252525] rounded transition-all font-medium py-0.5"
        >
          <option value="" className="bg-[#191919] text-[#5f5e5b]">Vazio</option>
          <option value="Alta" className="bg-[#191919] text-red-400">Alta</option>
          <option value="Média" className="bg-[#191919] text-yellow-400">Média</option>
          <option value="Baixa" className="bg-[#191919] text-emerald-400">Baixa</option>
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

// ─── Notion Block style ──────────────────────────────────────────────────────
function DiaryCard({ title, icon, sectionKey, initialContent, onSave, canManage, clientId, children, action }: any) {
  return (
    <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between border-b border-[#2c2c2b]/30 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-primary shrink-0 select-none">
            {icon}
          </span>
          <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">
            {title}
          </span>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-[85px] pt-1">
        {children ? children : (
          <SectionEditor
            key={`${clientId}-${sectionKey}`}
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
        <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
          <ListChecks className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">Pendências e Tarefas</span>
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
      <div className="flex items-center justify-between border-b border-[#2c2c2b]/30 pb-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">Pendências e Tarefas</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2.5 group">
              <button
                disabled={!canManage}
                onClick={async () => {
                  await updateTask.mutateAsync({
                    taskId: task.id,
                    clientId,
                    done: !task.done,
                    content: task.content,
                  });
                }}
                className="mt-0.5 shrink-0 text-[#9b9a97] hover:text-[#e3e2e0] transition-colors disabled:cursor-not-allowed"
              >
                {task.done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span
                className={`text-xs flex-1 break-words leading-relaxed ${
                  task.done ? "line-through text-[#5f5e5b] opacity-60" : "text-[#e3e2e0]"
                }`}
              >
                {task.content}
              </span>
              {canManage && (
                <button
                  onClick={async () => {
                    if (confirm("Remover esta tarefa?")) {
                      await deleteTask.mutateAsync({ taskId: task.id, clientId });
                      toast.success("Tarefa removida");
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-[#5f5e5b] hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-[#9b9a97] italic text-center py-4 bg-[#262625] border border-dashed border-[#2c2c2b] rounded-[6px]">
            Sem tarefas pendentes.
          </p>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2b]/30">
          <Input
            placeholder="Nova tarefa..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px]"
          />
          <Button size="sm" onClick={handleAdd} className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white rounded-[4px]">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClientNotionTemplate({ clientId, canManage }: any) {
  // Fetch real client data from the clients table
  const { data: clientInfo, refetch: refetchClientInfo } = useQuery({
    queryKey: ["client-info-notion", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("name, logo_url")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: notionData, isLoading } = useClientNotionData(clientId);
  const saveNotionData = useSaveClientNotionData();
  const updateClient = useUpdateClient();
  const syncDrive = useSyncDriveCalls();
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs text-[#9b9a97]">Carregando diário do cliente...</span>
      </div>
    );
  }

  const clientName = clientInfo?.name || notionData?.clientName || "Cliente";
  const logoUrl = clientInfo?.logo_url || null;
  const propsData = notionData?.properties || {};
  const sectionsData = notionData?.sections || {};
  const coverUrl = notionData?.cover_url || null;

  const handlePropertyChange = (key: string, value: string) => {
    const updated = {
      ...notionData,
      properties: { ...propsData, [key]: value },
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated,
    });
  };

  const handleSaveSection = (key: string, content: any) => {
    const updated = {
      ...notionData,
      sections: { ...sectionsData, [key]: content },
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated,
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }
    const toastId = toast.loading("Enviando capa...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${clientId}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
      const url = data.publicUrl;
      
      const updated = {
        ...notionData,
        cover_url: url
      };
      await saveNotionData.mutateAsync({ client_id: clientId, data: updated });
      toast.success("Imagem de capa atualizada!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao enviar capa: " + err.message, { id: toastId });
    }
  };

  const handleRemoveCover = async () => {
    const toastId = toast.loading("Removendo capa...");
    try {
      const updated = {
        ...notionData,
        cover_url: null
      };
      await saveNotionData.mutateAsync({ client_id: clientId, data: updated });
      toast.success("Imagem de capa removida!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao remover capa: " + err.message, { id: toastId });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }
    const toastId = toast.loading("Enviando foto...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${clientId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
      const url = data.publicUrl;
      
      await updateClient.mutateAsync({ id: clientId, logo_url: url });
      refetchClientInfo();
      toast.success("Foto do cliente atualizada!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message, { id: toastId });
    }
  };

  const handleRemoveLogo = async () => {
    const toastId = toast.loading("Removendo foto...");
    try {
      await updateClient.mutateAsync({ id: clientId, logo_url: null });
      refetchClientInfo();
      toast.success("Foto do cliente removida!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao remover foto: " + err.message, { id: toastId });
    }
  };

  const handleSyncDrive = async () => {
    try {
      await syncDrive.mutateAsync({ clientId });
      toast.success("Gravações do Google Drive sincronizadas!");
    } catch (e: any) {
      toast.error("Erro ao sincronizar Drive: " + e.message);
    }
  };

  const subSections = [
    { key: "icp", label: "ICP" },
    { key: "produto", label: "Produto" },
    { key: "seguidores", label: "Seguidores" },
    { key: "proposta_unica", label: "Proposta Única de Valor (PUV)" },
    { key: "estrategias_high", label: "Estratégia High Ticket" },
    { key: "estrategias_low", label: "Estratégia Low Ticket" },
  ];

  return (
    <div className="space-y-6 -mx-8 -mt-6">
      {/* ── COVER IMAGE BANNER ── */}
      <div className="h-48 md:h-56 w-full bg-[#202020] relative overflow-hidden group/cover border-b border-[#2c2c2b]">
        {coverUrl ? (
          <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-[#1e1e20] to-slate-900 opacity-60" />
        )}
        
        {canManage && (
          <div className="absolute top-3 right-3 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2">
            <input
              type="file"
              accept="image/*"
              id={`cover-upload-${clientId}`}
              className="hidden"
              onChange={handleCoverUpload}
            />
            <label
              htmlFor={`cover-upload-${clientId}`}
              className="bg-[#202020]/90 border border-[#2c2c2b] hover:bg-[#252525] text-[10px] font-semibold text-[#e3e2e0] px-2.5 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1 select-none"
            >
              <ImageIcon className="h-3 w-3" />
              {coverUrl ? "Alterar Capa" : "Adicionar Capa"}
            </label>
            {coverUrl && (
              <button
                onClick={handleRemoveCover}
                className="bg-[#202020]/90 border border-[#2c2c2b] hover:bg-red-950/20 hover:border-red-900 text-[10px] font-semibold text-red-400 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                Remover Capa
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-8 relative space-y-6">
        {/* ── CLIENT LOGO OVERLAY ── */}
        <div className="absolute -top-12 left-8 h-20 w-20 rounded-xl overflow-hidden border border-[#2c2c2b] bg-[#191919] group/logo flex items-center justify-center shadow-md shrink-0 z-10">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl select-none">📁</span>
          )}
          {canManage && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <input
                type="file"
                accept="image/*"
                id={`logo-upload-${clientId}`}
                className="hidden"
                onChange={handleLogoUpload}
              />
              <label
                htmlFor={`logo-upload-${clientId}`}
                className="cursor-pointer text-[10px] font-bold text-white hover:underline flex items-center gap-1"
              >
                <Camera className="h-3 w-3" />
                Alterar
              </label>
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="text-[9px] font-bold text-red-400 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Notion Page Header & Properties ── */}
        <div className="border-b border-[#2c2c2b] pb-6 pt-10 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-[#e3e2e0] font-sans">
            {clientName}
          </h1>

          {/* Clean Notion-style metadata list */}
          <div className="max-w-xl space-y-0.5 pt-2">
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

        {/* Database Blocks layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
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

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 flex flex-col h-fit">
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
              <div className="flex flex-col gap-2 pt-1">
                <div className="text-[11px] text-[#9b9a97] bg-[#262625] border border-[#2c2c2b] rounded px-3 py-2 mb-2 font-mono">
                  💡 Contém ICP, especificações de Produtos, Seguidores, etc.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {subSections.map((sub) => (
                    <button
                      key={sub.key}
                      onClick={() => setActiveSubSection(sub.key)}
                      className="text-left bg-[#252525] border border-[#2c2c2b] hover:bg-[#2c2c2b] px-3 py-2 rounded flex flex-col gap-1 text-[11px] text-[#e3e2e0] transition-colors"
                    >
                      <span className="font-semibold text-primary">{sub.label}</span>
                      <span className="text-[9px] text-[#9b9a97] uppercase">Abrir Bloco →</span>
                    </button>
                  ))}
                </div>
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
                  className="h-6 text-[10px] uppercase font-bold text-primary hover:text-primary hover:bg-[#2c2c2b] border border-primary/20 gap-1 px-2 rounded"
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
          <DialogContent className="max-w-3xl bg-[#191919] border-[#2c2c2b] blocknote-editor-wrapper text-[#e3e2e0] rounded-lg">
            <DialogHeader className="border-b border-[#2c2c2b] pb-3">
              <DialogTitle className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#e3e2e0]">
                <Database className="h-4 w-4 text-primary" />
                Dados · {subSections.find(s => s.key === activeSubSection)?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-[350px] border border-[#2c2c2b] rounded-[6px] p-4 bg-[#202020] mt-4 overflow-y-auto max-h-[60vh]">
              {activeSubSection && (
                <SectionEditor
                  key={`${clientId}-${activeSubSection}`}
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
    </div>
  );
}
