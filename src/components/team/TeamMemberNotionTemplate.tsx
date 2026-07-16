import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Square,
  Mail,
  Phone,
  DollarSign,
  User,
  Link2,
  Video,
  Calendar,
  Target,
  Users,
  AlertCircle,
  BookOpen,
  Flag,
  Camera,
  Image as ImageIcon,
  ListChecks,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useUpsertTeamMember,
  TeamMember,
  useAllClientsNotionData,
  useSaveClientNotionData,
} from "@/hooks/useGestorDiary";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import * as locales from "@blocknote/core/locales";

// List of status options
const TASK_STATUSES = ["Concluído", "Agendado", "Em Progresso", "Agendar", "A Fazer"];

// ─── Notion Property Row ─────────────────────────────────────────────────────
function PropField({
  icon,
  label,
  value,
  onSave,
  canEdit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onSave: (v: string) => void;
  canEdit: boolean;
}) {
  const [local, setLocal] = useState(value || "");

  useEffect(() => {
    setLocal(value || "");
  }, [value]);

  const isLink = local.startsWith("http");

  return (
    <div className="flex items-center text-xs py-1 hover:bg-[#202020] px-2 rounded transition-colors group h-7">
      <div className="w-40 flex items-center gap-2 text-[#9b9a97] select-none shrink-0 font-medium">
        <span className="opacity-70">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        {canEdit ? (
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => local !== value && onSave(local)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="Vazio"
            className="w-full bg-transparent border-none outline-none focus:ring-0 rounded px-1 text-[#e3e2e0] hover:bg-[#252525] focus:bg-[#252525] transition-all placeholder:italic placeholder:opacity-30"
          />
        ) : isLink ? (
          <a href={local} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block px-1">
            {local}
          </a>
        ) : (
          <div className="px-1 text-[#e3e2e0] truncate font-sans">
            {local || <span className="text-[#5f5e5b] italic">Vazio</span>}
          </div>
        )}
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

function DiaryCard({ title, icon, sectionKey, initialContent, onSave, canManage, memberId, children }: any) {
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
      </div>
      <div className="flex-1 min-h-[85px] pt-1">
        {children ? children : (
          <SectionEditor
            key={`${memberId}-${sectionKey}`}
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

// ─── Main Component ──────────────────────────────────────────────────────────
interface TeamMemberNotionTemplateProps {
  member: TeamMember;
  canEdit: boolean;
}

export default function TeamMemberNotionTemplate({
  member,
  canEdit,
}: TeamMemberNotionTemplateProps) {
  const upsert = useUpsertTeamMember();

  const data = member.notion_data || {};
  const props = data.properties || {};
  const sectionsData = data.sections || {};

  const save = async (patch: Partial<typeof data>) => {
    try {
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        notion_data: { ...data, ...patch },
      });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const saveProp = (key: string, value: string) => {
    save({ properties: { ...props, [key]: value } });
  };

  const handleSaveSection = (key: string, content: any) => {
    save({
      sections: { ...sectionsData, [key]: content },
    });
  };

  // Clientes Ativos List
  const [newClientName, setNewClientName] = useState("");
  const [newClientHealth, setNewClientHealth] = useState("10");
  const clientesAtivos = data.clientes_ativos || [];

  // Clients database references
  const { data: globalClients = [] } = useClients({ allClientsForStaff: true });
  const { data: archivedClients = [] } = useClients({ onlyArchived: true, allClientsForStaff: true });
  const { data: notionMap = {}, refetch: refetchNotionMap } = useAllClientsNotionData();
  const saveClientNotion = useSaveClientNotionData();

  // ─── Compile general tasks from all clients assigned to this gestor ──────────
  const gestorTasks = useMemo(() => {
    const list: any[] = [];
    const memberNameNorm = member.name.toLowerCase().trim();
    
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetNorm = norm(memberNameNorm);

    Object.keys(notionMap).forEach(cid => {
      const cNotion = notionMap[cid] || {};
      const clientTasks = cNotion.notion_data?.tasks || [];
      const clientRecord = globalClients.find(c => c.id === cid) || archivedClients.find(c => c.id === cid);
      if (!clientRecord) return;

      clientTasks.forEach((t: any) => {
        const taskWhoNorm = norm(t.who || "");
        if (taskWhoNorm.includes(targetNorm) || targetNorm.includes(taskWhoNorm)) {
          list.push({
            ...t,
            clientId: cid,
            clientName: clientRecord.name
          });
        }
      });
    });
    
    // Sort tasks by date
    return list.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [notionMap, member.name, globalClients, archivedClients]);

  const handleUpdateClientTaskField = async (task: any, field: string, value: any) => {
    const clientNotion = notionMap[task.clientId];
    if (!clientNotion) return;
    
    const updatedTasks = (clientNotion.notion_data?.tasks || []).map((t: any) =>
      t.id === task.id ? { ...t, [field]: value } : t
    );
    
    const updatedNotionData = {
      ...clientNotion.notion_data,
      tasks: updatedTasks
    };
    
    try {
      await saveClientNotion.mutateAsync({
        client_id: task.clientId,
        data: updatedNotionData
      });
      refetchNotionMap();
    } catch (err: any) {
      toast.error("Erro ao atualizar tarefa: " + err.message);
    }
  };

  const handleDeleteClientTask = async (task: any) => {
    if (confirm("Remover esta tarefa permanentemente do diário do cliente?")) {
      const clientNotion = notionMap[task.clientId];
      if (!clientNotion) return;
      
      const updatedTasks = (clientNotion.notion_data?.tasks || []).filter((t: any) =>
        t.id !== task.id
      );
      
      const updatedNotionData = {
        ...clientNotion.notion_data,
        tasks: updatedTasks
      };
      
      try {
        await saveClientNotion.mutateAsync({
          client_id: task.clientId,
          data: updatedNotionData
        });
        refetchNotionMap();
        toast.success("Tarefa removida.");
      } catch (err: any) {
        toast.error("Erro ao remover: " + err.message);
      }
    }
  };

  // ─── Cover and Logo uploads ────────────────────────────────────────────────
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Enviando capa...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `team-members/cover-${member.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: link } = supabase.storage.from("client-logos").getPublicUrl(path);
      const url = link.publicUrl;
      
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        banner_url: url,
      });
      toast.success("Capa atualizada com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao enviar capa: " + err.message, { id: toastId });
    }
  };

  const handleRemoveCover = async () => {
    const toastId = toast.loading("Removendo capa...");
    try {
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        banner_url: null,
      });
      toast.success("Capa removida!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao remover capa: " + err.message, { id: toastId });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Enviando foto...");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `team-members/avatar-${member.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: link } = supabase.storage.from("client-logos").getPublicUrl(path);
      const url = link.publicUrl;
      
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        avatar_url: url,
      });
      toast.success("Foto atualizada!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message, { id: toastId });
    }
  };

  const handleRemoveAvatar = async () => {
    const toastId = toast.loading("Removendo foto...");
    try {
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        avatar_url: null,
      });
      toast.success("Foto removida!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao remover foto: " + err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6 -mx-8 -mt-6">
      {/* ── COVER IMAGE BANNER ── */}
      <div className="h-48 md:h-56 w-full bg-[#202020] relative overflow-hidden group/cover border-b border-[#2c2c2b]">
        {member.banner_url ? (
          <img src={member.banner_url} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-[#1e1e20] to-slate-900 opacity-60" />
        )}
        
        {canEdit && (
          <div className="absolute top-3 right-3 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2 z-20">
            <input
              type="file"
              accept="image/*"
              id={`cover-upload-${member.id}`}
              className="hidden"
              onChange={handleCoverUpload}
            />
            <label
              htmlFor={`cover-upload-${member.id}`}
              className="bg-[#202020]/90 border border-[#2c2c2b] hover:bg-[#252525] text-[10px] font-semibold text-[#e3e2e0] px-2.5 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1 select-none"
            >
              <ImageIcon className="h-3 w-3" />
              {member.banner_url ? "Alterar Capa" : "Adicionar Capa"}
            </label>
            {member.banner_url && (
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
        {/* ── AVATAR PROFILE PHOTO OVERLAY ── */}
        <div className="absolute -top-12 left-8 h-20 w-20 rounded-xl overflow-hidden border border-[#2c2c2b] bg-[#191919] group/logo flex items-center justify-center shadow-md shrink-0 z-10">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl select-none">👤</span>
          )}
          {canEdit && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <input
                type="file"
                accept="image/*"
                id={`avatar-upload-${member.id}`}
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <label
                htmlFor={`avatar-upload-${member.id}`}
                className="cursor-pointer text-[10px] font-bold text-white hover:underline flex items-center gap-1"
              >
                <Camera className="h-3 w-3" />
                Alterar
              </label>
              {member.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
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
            {member.name}
          </h1>
          <span className="text-[10px] text-[#9b9a97] bg-[#262625] border border-[#2c2c2b] rounded px-2.5 py-0.5 uppercase tracking-wider font-semibold w-fit block font-mono">
            {member.role}
          </span>

          {/* Properties list */}
          <div className="max-w-xl space-y-0.5 pt-2">
            <PropField
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email Contato"
              value={props.email_contato || ""}
              onSave={(v) => saveProp("email_contato", v)}
              canEdit={canEdit}
            />
            <PropField
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email Meta"
              value={props.email_meta || ""}
              onSave={(v) => saveProp("email_meta", v)}
              canEdit={canEdit}
            />
            <PropField
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email Google"
              value={props.email_google || ""}
              onSave={(v) => saveProp("email_google", v)}
              canEdit={canEdit}
            />
            <PropField
              icon={<Phone className="h-3.5 w-3.5" />}
              label="WhatsApp"
              value={props.whatsapp || ""}
              onSave={(v) => saveProp("whatsapp", v)}
              canEdit={canEdit}
            />
            <PropField
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Salário"
              value={props.salario || ""}
              onSave={(v) => saveProp("salario", v)}
              canEdit={canEdit}
            />
            <PropField
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Comissão"
              value={props.comissao || ""}
              onSave={(v) => saveProp("comissao", v)}
              canEdit={canEdit}
            />
          </div>
        </div>

        {/* ── NAVEGAÇÃO SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          NAVEGAÇÃO
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Clientes Ativos & Desempenho */}
            <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 flex flex-col gap-3 h-full">
              <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide uppercase font-mono">
                  CLIENTES ATIVOS & DESEMPENHO
                </span>
              </div>
              
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto flex-1 font-sans">
                {clientesAtivos.length > 0 ? (
                  clientesAtivos.map((c: any, i: number) => {
                    const healthColor = c.health <= 3 ? "text-red-400" : c.health <= 6 ? "text-yellow-400" : "text-emerald-400";
                    const bullet = c.health <= 3 ? "🟥" : c.health <= 6 ? "🟨" : "🟩";
                    return (
                      <div key={i} className="flex items-center justify-between gap-2.5 py-1 px-2 rounded hover:bg-[#252525] group text-xs text-[#e3e2e0]">
                        <span className="font-semibold">{c.name} {bullet}</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold ${healthColor}`}>({c.health}/10)</span>
                          {canEdit && (
                            <button
                              onClick={() => {
                                const list = clientesAtivos.filter((_: any, j: number) => j !== i);
                                save({ clientes_ativos: list });
                              }}
                              className="opacity-0 group-hover:opacity-100 text-[#5f5e5b] hover:text-red-400 transition-all shrink-0 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4 bg-[#262625] border border-dashed border-[#2c2c2b] rounded-[6px]">
                    Nenhum cliente ativo.
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2b]/30">
                  <Input
                    placeholder="Nome do cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px] flex-1"
                  />
                  <Input
                    placeholder="Saúde"
                    value={newClientHealth}
                    onChange={(e) => setNewClientHealth(e.target.value)}
                    className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px] w-16 text-center"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white rounded-[4px] shrink-0"
                    onClick={() => {
                      if (!newClientName.trim()) return;
                      const list = [
                        ...clientesAtivos,
                        {
                          name: newClientName.trim(),
                          health: Number(newClientHealth) || 10,
                          status: "Ativo",
                        },
                      ];
                      save({ clientes_ativos: list });
                      setNewClientName("");
                      setNewClientHealth("10");
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <DiaryCard
              title="REUNIÕES"
              icon={<Calendar className="h-4 w-4" />}
              sectionKey="reunioes"
              initialContent={sectionsData.reunioes}
              onSave={handleSaveSection}
              canManage={canEdit}
              memberId={member.id}
            />

            <DiaryCard
              title="LINKS OPERACIONAIS"
              icon={<Link2 className="h-4 w-4" />}
              sectionKey="links_operacionais"
              initialContent={sectionsData.links_operacionais}
              onSave={handleSaveSection}
              canManage={canEdit}
              memberId={member.id}
            />

            <DiaryCard
              title="GRAVAÇÃO ONBOARDING"
              icon={<Video className="h-4 w-4" />}
              sectionKey="gravacao_onboarding"
              initialContent={sectionsData.gravacao_onboarding}
              onSave={handleSaveSection}
              canManage={canEdit}
              memberId={member.id}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <DiaryCard
              title="PLANOS & TAREFAS"
              icon={<ListChecks className="h-4 w-4" />}
              sectionKey="planos_tarefas"
              initialContent={sectionsData.planos_tarefas}
              onSave={handleSaveSection}
              canManage={canEdit}
              memberId={member.id}
            />
          </div>
        </div>

        {/* ── TASKS GERAL SAGE BAND ── */}
        <div className="w-full bg-[#7a9d96] text-[#191919] py-1 text-center font-bold text-xs uppercase tracking-widest rounded-[4px] my-6 select-none font-mono">
          TASKS GERAL
        </div>

        {/* ── UNIFIED GESTOR TASKS TABLE ── */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden pb-16">
          <div className="px-4 py-3 bg-[#252525] border-b border-[#2c2c2b] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wider uppercase font-mono">
              📋 TASKS COMPILADAS - {member.name}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#191919]/50 select-none">
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] pl-4">Nome da Tarefa</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-36">Vencimento</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-48">Cliente</th>
                  <th className="text-[11px] text-[#9b9a97] font-semibold text-left p-2.5 border-b border-[#2c2c2b] w-36">Status</th>
                  {canEdit && (
                    <th className="text-[11px] text-[#9b9a97] font-semibold text-center p-2.5 border-b border-[#2c2c2b] w-12"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {gestorTasks.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="p-8 text-center text-xs text-[#9b9a97] italic">
                      Nenhuma tarefa atribuída a este gestor nos diários de clientes.
                    </td>
                  </tr>
                ) : (
                  gestorTasks.map((t: any) => {
                    const statusColor = t.status === "Concluído" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                        t.status === "Em Progresso" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                        t.status === "Agendar" ? "text-red-400 bg-red-500/10 border-red-500/20" :
                                        "text-blue-400 bg-blue-500/10 border-blue-500/20";
                    return (
                      <tr key={`${t.clientId}-${t.id}`} className="hover:bg-[#252525]/30 group transition-colors">
                        <td className="p-2 border-b border-[#2c2c2b] pl-4">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => handleUpdateClientTaskField(t, "name", e.target.value)}
                            disabled={!canEdit}
                            className="bg-transparent border-none outline-none focus:bg-[#191919] focus:ring-0 rounded px-1.5 py-0.5 text-xs text-[#e3e2e0] w-full"
                          />
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <input
                            type="date"
                            value={t.date || ""}
                            onChange={(e) => handleUpdateClientTaskField(t, "date", e.target.value)}
                            disabled={!canEdit}
                            className="bg-transparent border-none outline-none focus:bg-[#191919] focus:ring-0 rounded px-1.5 py-0.5 text-xs text-[#e3e2e0] w-full font-mono cursor-pointer"
                          />
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <span className="px-2 py-0.5 text-xs text-[#9b9a97] border border-[#2c2c2b] rounded bg-[#252525] font-semibold">
                            {t.clientName}
                          </span>
                        </td>
                        <td className="p-2 border-b border-[#2c2c2b]">
                          <select
                            value={t.status || "A Fazer"}
                            onChange={(e) => handleUpdateClientTaskField(t, "status", e.target.value)}
                            disabled={!canEdit}
                            className={`border outline-none focus:ring-0 rounded px-2 py-0.5 text-[11px] font-semibold cursor-pointer w-full text-center ${statusColor}`}
                          >
                            {TASK_STATUSES.map(st => (
                              <option key={st} value={st} className="bg-[#191919] text-[#e3e2e0] font-semibold">{st}</option>
                            ))}
                          </select>
                        </td>
                        {canEdit && (
                          <td className="p-2 border-b border-[#2c2c2b] text-center">
                            <button
                              onClick={() => handleDeleteClientTask(t)}
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
        </div>

      </div>
    </div>
  );
}
