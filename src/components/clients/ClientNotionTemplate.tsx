import { useState, useEffect, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as locales from "@blocknote/core/locales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateClient } from "@/hooks/useClients";

// Calendar math helper
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  const startDay = date.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      month: month - 1,
      year: year,
      isCurrentMonth: false,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
    });
  }
  
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: year,
      isCurrentMonth: false,
      dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }
  
  return days;
};

// List of responsibles for select options
const TEAM_RESPONSIBLES = [
  "Eduardo", "Daine Stoque", "Alexandre", "José Renato",
  "Guilherme Herculano", "Guilherme Maletta", "Victor Martins",
  "Karina Miguel", "Marina Tsuge", "Wilhelm Valente"
];

// List of status options
const TASK_STATUSES = ["Concluído", "Agendado", "Em Progresso", "Agendar", "A Fazer"];

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

  // Calendar State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [addTaskDate, setAddTaskDate] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // New task form fields
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskWho, setNewTaskWho] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("A Fazer");

  // useMemo hooks MUST be before any conditional return to respect React hooks rules
  const calendarDays = useMemo(() => {
    return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const monthLabel = useMemo(() => {
    const monthsPt = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthsPt[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
  }, [currentDate]);

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
  const tasks = notionData?.tasks || [];

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

  // ─── Task Manager Operations ───────────────────────────────────────────────
  const handleUpdateTaskField = (taskId: string, field: string, value: any) => {
    const updatedTasks = tasks.map((t: any) =>
      t.id === taskId ? { ...t, [field]: value } : t
    );
    const updated = {
      ...notionData,
      tasks: updatedTasks
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated
    });
  };

  const handleAddTask = (dateStr: string) => {
    const newTask = {
      id: Math.random().toString(36).substring(2, 10),
      name: "Nova Tarefa",
      date: dateStr,
      who: "",
      status: "A Fazer"
    };
    const updatedTasks = [...tasks, newTask];
    const updated = {
      ...notionData,
      tasks: updatedTasks
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated
    });
    toast.success("Tarefa adicionada!");
  };

  const handleCreateTaskDialog = () => {
    if (!newTaskName.trim()) {
      toast.error("Nome da tarefa é obrigatório");
      return;
    }
    const newTask = {
      id: Math.random().toString(36).substring(2, 10),
      name: newTaskName.trim(),
      date: addTaskDate || "",
      who: newTaskWho,
      status: newTaskStatus
    };
    const updatedTasks = [...tasks, newTask];
    const updated = {
      ...notionData,
      tasks: updatedTasks
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated
    });
    setNewTaskName("");
    setNewTaskWho("");
    setNewTaskStatus("A Fazer");
    setAddTaskDate(null);
    toast.success("Tarefa criada!");
  };

  const handleSaveTaskDialog = () => {
    if (!selectedTask.name.trim()) {
      toast.error("Nome da tarefa é obrigatório");
      return;
    }
    const updatedTasks = tasks.map((t: any) =>
      t.id === selectedTask.id ? selectedTask : t
    );
    const updated = {
      ...notionData,
      tasks: updatedTasks
    };
    saveNotionData.mutate({
      client_id: clientId,
      data: updated
    });
    setSelectedTask(null);
    toast.success("Tarefa atualizada!");
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Remover esta tarefa do gerenciador?")) {
      const updatedTasks = tasks.filter((t: any) => t.id !== taskId);
      const updated = {
        ...notionData,
        tasks: updatedTasks
      };
      saveNotionData.mutate({
        client_id: clientId,
        data: updated
      });
      setSelectedTask(null);
      toast.success("Tarefa removida");
    }
  };

  // ─── Cover and Logo Uploads ────────────────────────────────────────────────
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

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // calendarDays and monthLabel are computed above (before conditional return)

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

        {/* ── NAVEGAÇÃO SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          NAVEGAÇÃO
        </div>

        {/* Database Blocks layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <DiaryCard
              title="PLANO DA VEZ - CLIENTE"
              icon={<ListChecks className="h-4 w-4" />}
              sectionKey="plano_vez_cliente"
              initialContent={sectionsData.plano_vez_cliente}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="PLANO ESTRATÉGICO - CLIENTE"
              icon={<Compass className="h-4 w-4" />}
              sectionKey="plano_cliente"
              initialContent={sectionsData.plano_cliente}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="PLANO DA VEZ - EQUIPE AND"
              icon={<Users className="h-4 w-4" />}
              sectionKey="plano_equipe"
              initialContent={sectionsData.plano_equipe}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="DOCUMENTOS"
              icon={<FolderOpen className="h-4 w-4" />}
              sectionKey="documentos"
              initialContent={sectionsData.documentos}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="ESTRATÉGIAS ATIVAS"
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
            <DiaryCard
              title="MATERIAL DE APOIO"
              icon={<Link2 className="h-4 w-4" />}
              sectionKey="material_apoio"
              initialContent={sectionsData.material_apoio}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />

            <DiaryCard
              title="DADOS"
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
              title="GRAVAÇÃO DA CALL"
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
              title="TRILHA SEMANAL"
              icon={<Milestone className="h-4 w-4" />}
              sectionKey="trilha_semanal"
              initialContent={sectionsData.trilha_semanal}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="PROCESSOS"
              icon={<GitMerge className="h-4 w-4" />}
              sectionKey="processos"
              initialContent={sectionsData.processos}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
            <DiaryCard
              title="METAS"
              icon={<Trophy className="h-4 w-4" />}
              sectionKey="metas"
              initialContent={sectionsData.metas}
              onSave={handleSaveSection}
              canManage={canManage}
              clientId={clientId}
            />
          </div>
        </div>

        {/* ── PANORAMA GERAL SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          PANORAMA GERAL
        </div>

        {/* ── TASK MANAGER TABLE ── */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden">
          <div className="px-4 py-3 bg-[#252525] border-b border-[#2c2c2b] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wider uppercase font-mono">
              📋 TASK MANAGER - AND
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#191919]/50 select-none">
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] pl-4">Nome</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-40">Data</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-48">Responsável</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-36">Status</th>
                  {canManage && (
                    <th className="text-[11px] text-[#9b9a97] font-semibold text-center p-2.5 border-b border-[#2c2c2b] w-12"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-xs text-[#9b9a97] italic">
                      Nenhuma tarefa cadastrada no Task Manager.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t: any) => {
                    const statusColor = t.status === "Concluído" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                        t.status === "Em Progresso" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                        t.status === "Agendar" ? "text-red-400 bg-red-500/10 border-red-500/20" :
                                        "text-blue-400 bg-blue-500/10 border-blue-500/20";
                    return (
                      <tr key={t.id} className="hover:bg-[#252525]/30 group transition-colors">
                        <td className="p-2 border-b border-[#2c2c2b] pl-4">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => handleUpdateTaskField(t.id, "name", e.target.value)}
                            disabled={!canManage}
                            className="bg-transparent border-none outline-none focus:bg-[#191919] focus:ring-0 rounded px-1.5 py-0.5 text-xs text-[#e3e2e0] w-full"
                          />
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <input
                            type="date"
                            value={t.date || ""}
                            onChange={(e) => handleUpdateTaskField(t.id, "date", e.target.value)}
                            disabled={!canManage}
                            className="bg-transparent border-none outline-none focus:bg-[#191919] focus:ring-0 rounded px-1.5 py-0.5 text-xs text-[#e3e2e0] w-full font-mono cursor-pointer"
                          />
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <select
                            value={t.who || ""}
                            onChange={(e) => handleUpdateTaskField(t.id, "who", e.target.value)}
                            disabled={!canManage}
                            className="bg-transparent border-none outline-none focus:bg-[#191919] focus:ring-0 rounded px-1.5 py-0.5 text-xs text-[#e3e2e0] w-full cursor-pointer"
                          >
                            <option value="" className="bg-[#191919] text-[#5f5e5b]">Sem Responsável</option>
                            {TEAM_RESPONSIBLES.map(r => (
                              <option key={r} value={r} className="bg-[#191919] text-[#e3e2e0]">{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <select
                            value={t.status || "A Fazer"}
                            onChange={(e) => handleUpdateTaskField(t.id, "status", e.target.value)}
                            disabled={!canManage}
                            className={`border outline-none focus:ring-0 rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer w-full text-center ${statusColor}`}
                          >
                            {TASK_STATUSES.map(st => (
                              <option key={st} value={st} className="bg-[#191919] text-[#e3e2e0] font-semibold">{st}</option>
                            ))}
                          </select>
                        </td>
                        {canManage && (
                          <td className="p-2 border-b border-[#2c2c2b] text-center">
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="text-[#5f5e5b] hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {canManage && (
            <div className="p-2 bg-[#252525]/30 border-t border-[#2c2c2b] flex justify-start">
              <button
                onClick={() => setAddTaskDate(new Date().toISOString().split('T')[0])}
                className="text-xs text-primary hover:text-primary/80 transition font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Item
              </button>
            </div>
          )}
        </div>

        {/* ── CALENDÁRIO SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          CALENDÁRIO
        </div>

        {/* ── DETAILED CALENDAR ── */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2c2c2b]/30 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-[#e3e2e0]">Calendário de Atividades</span>
            </div>
            <div className="flex items-center gap-2 select-none">
              <button
                onClick={handlePrevMonth}
                className="p-1 text-[#9b9a97] hover:text-white transition rounded hover:bg-[#2c2c2b]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-[#e3e2e0] min-w-[120px] text-center font-mono">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 text-[#9b9a97] hover:text-white transition rounded hover:bg-[#2c2c2b]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-[#2c2c2b] overflow-hidden rounded-[4px] text-center text-[10px] text-[#9b9a97] font-semibold border border-[#2c2c2b]">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="bg-[#252525] py-1.5">{d}</div>
            ))}
            {calendarDays.map((dayObj, idx) => {
              const dayTasks = tasks.filter((t: any) => t.date === dayObj.dateStr);
              
              return (
                <div
                  key={idx}
                  onClick={() => canManage && !dayTasks.length && setAddTaskDate(dayObj.dateStr)}
                  className={`min-h-[85px] bg-[#202020] p-1.5 flex flex-col gap-1.5 transition-colors relative hover:bg-[#232323] cursor-pointer ${
                    !dayObj.isCurrentMonth ? "opacity-30" : ""
                  }`}
                >
                  <span className={`text-[9px] font-bold text-right pr-0.5 ${
                    new Date().toISOString().split('T')[0] === dayObj.dateStr
                      ? "text-primary bg-primary/10 rounded px-1.5"
                      : "text-[#5f5e5b]"
                  }`}>
                    {dayObj.day}
                  </span>
                  
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-[60px] pr-0.5">
                    {dayTasks.map((t: any, tIdx: number) => {
                      const statusColor = t.status === "Concluído" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                          t.status === "Em Progresso" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                          t.status === "Agendar" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                          "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                      return (
                        <div
                          key={tIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(t);
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded truncate select-none border font-medium cursor-pointer ${statusColor}`}
                          title={`${t.name} (${t.who || 'Sem Responsável'}) - ${t.status}`}
                        >
                          {t.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── EQUIPE SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          EQUIPE
        </div>

        <div className="pb-16">
          <DiaryCard
            title="Membros da Equipe Envolvidos"
            icon={<Users className="h-4 w-4" />}
            sectionKey="equipe"
            initialContent={sectionsData.equipe}
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

      {/* Add Task Dialog */}
      <Dialog open={addTaskDate !== null} onOpenChange={(open) => !open && setAddTaskDate(null)}>
        <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-sm uppercase tracking-wider font-mono">Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Título da Tarefa*</Label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Ex: REUNIÃO DE ALINHAMENTO"
                className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Responsável</Label>
              <select
                value={newTaskWho}
                onChange={(e) => setNewTaskWho(e.target.value)}
                className="h-8 w-full bg-[#202020] border border-[#2c2c2b] rounded px-2 text-xs text-[#e3e2e0] focus:ring-0"
              >
                <option value="">Sem Responsável</option>
                {TEAM_RESPONSIBLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Status</Label>
              <select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value)}
                className="h-8 w-full bg-[#202020] border border-[#2c2c2b] rounded px-2 text-xs text-[#e3e2e0] focus:ring-0"
              >
                {TASK_STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateTaskDialog} className="bg-primary text-white font-bold text-xs uppercase h-8 px-5">
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        {selectedTask && (
          <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-sm rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-white font-semibold text-sm uppercase tracking-wider font-mono">Editar Tarefa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Título da Tarefa*</Label>
                <Input
                  value={selectedTask.name}
                  onChange={(e) => setSelectedTask({ ...selectedTask, name: e.target.value })}
                  placeholder="Ex: REUNIÃO DE ALINHAMENTO"
                  className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Data de Vencimento</Label>
                <Input
                  type="date"
                  value={selectedTask.date || ""}
                  onChange={(e) => setSelectedTask({ ...selectedTask, date: e.target.value })}
                  className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus-visible:ring-0 focus-visible:border-primary font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Responsável</Label>
                <select
                  value={selectedTask.who || ""}
                  onChange={(e) => setSelectedTask({ ...selectedTask, who: e.target.value })}
                  className="h-8 w-full bg-[#202020] border border-[#2c2c2b] rounded px-2 text-xs text-[#e3e2e0] focus:ring-0"
                >
                  <option value="">Sem Responsável</option>
                  {TEAM_RESPONSIBLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Status</Label>
                <select
                  value={selectedTask.status || "A Fazer"}
                  onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                  className="h-8 w-full bg-[#202020] border border-[#2c2c2b] rounded px-2 text-xs text-[#e3e2e0] focus:ring-0"
                >
                  {TASK_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="flex justify-between items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase h-8 px-4 border border-red-500/20"
              >
                Excluir
              </Button>
              <Button onClick={handleSaveTaskDialog} className="bg-primary text-white font-bold text-xs uppercase h-8 px-5">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
