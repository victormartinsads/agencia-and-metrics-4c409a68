import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useClients,
  useCreateClient,
  useDeleteClient,
  useArchiveClient,
  ClientInsert,
} from "@/hooks/useClients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStaffMemberRole,
  useStaffRoles,
  useGestorDiary,
  useSaveGestorDiary,
  useGestorCalendar,
  useAllGestorProfileMeta,
  useAllGestorClientMeta,
  useAllClientsNotionData,
  useTeamMembers,
  useUpsertTeamMember,
  useDeleteTeamMember,
  TeamMember,
} from "@/hooks/useGestorDiary";
import TeamMemberNotionTemplate from "@/components/team/TeamMemberNotionTemplate";
import ClientNotionTemplate from "@/components/clients/ClientNotionTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Video,
  User,
  Square,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Calendar as CalendarIcon,
  UserPlus,
  Lock,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Normalização de Cores e Estilos Padrão Notion ───────────────────────────
const healthColorText = (h: number) => {
  if (h <= 3) return "text-red-400";
  if (h <= 6) return "text-yellow-400";
  return "text-[#2eaadc]";
};

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

// ─── Team card (Notion Gallery Item) ─────────────────────────────────────────
function TeamMemberCard({
  member,
  onSelect,
  onDelete,
  canDelete,
}: {
  member: TeamMember;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const props = member.notion_data?.properties || {};
  return (
    <div
      onClick={onSelect}
      className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden hover:bg-[#252525] transition-colors duration-150 cursor-pointer flex flex-col group select-none shadow-sm h-fit"
    >
      {/* Cover / Icon Area */}
      <div className="h-10 w-full bg-[#262625] border-b border-[#2c2c2b] relative flex items-center px-3 gap-2">
        <span className="text-base">👤</span>
        <span className="text-[10px] text-[#9b9a97] uppercase tracking-wider font-semibold">
          {member.role}
        </span>
      </div>
      {/* Notion Card Details */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-[#e3e2e0] group-hover:text-primary transition-colors">
            {member.name}
          </p>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#5f5e5b] hover:text-red-400 shrink-0 p-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* List properties in simple Notion styling */}
        <div className="space-y-1 pt-1 border-t border-[#2c2c2b]/30">
          {props.whatsapp && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#9b9a97] font-sans">
              <span className="opacity-60 text-xs">📞</span>
              <span className="truncate">{props.whatsapp}</span>
            </div>
          )}
          {props.email_contato && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#9b9a97] font-sans">
              <span className="opacity-60 text-xs">✉️</span>
              <span className="truncate">{props.email_contato}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Team Member Dialog ───────────────────────────────────────────────
function CreateTeamMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const upsert = useUpsertTeamMember();
  const [form, setForm] = useState({ name: "", role: "", email_contato: "", whatsapp: "", salario: "" });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.role.trim()) { toast.error("Nome e cargo são obrigatórios"); return; }
    await upsert.mutateAsync({
      name: form.name.trim(),
      role: form.role.trim(),
      notion_data: {
        properties: { email_contato: form.email_contato, whatsapp: form.whatsapp, salario: form.salario },
        tarefas_diarias_checklist: [],
        plano_estrategico_checklist: [],
        clientes_ativos: [],
        reunioes: [],
        links: [],
        gravacao: "",
        inteligencia_trafego: [],
        conteudo_principal: "",
        subpaginas: [],
      },
    });
    toast.success(`Ficha de ${form.name} criada!`);
    setForm({ name: "", role: "", email_contato: "", whatsapp: "", salario: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold text-sm uppercase tracking-wider">Nova Ficha de Equipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { key: "name", label: "Nome*", placeholder: "Ex: Victor Martins" },
            { key: "role", label: "Cargo*", placeholder: "Ex: GESTOR DE TRÁFEGO" },
            { key: "email_contato", label: "Email", placeholder: "email@exemplo.com" },
            { key: "whatsapp", label: "WhatsApp", placeholder: "+55 11 99999-9999" },
            { key: "salario", label: "Salário", placeholder: "R$ 3.000,00" },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">{f.label}</Label>
              <Input
                value={(form as any)[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={upsert.isPending} className="bg-primary text-white font-bold text-xs uppercase h-8 px-5">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Ficha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Client Diary Dialog ───────────────────────────────────────────────
function CreateClientDiaryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createClient = useCreateClient();
  const [form, setForm] = useState<ClientInsert>({
    name: "", meta_access_token: "placeholder", ad_account_ids: [], currency_symbol: "R$",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    await createClient.mutateAsync(form);
    toast.success(`Cliente ${form.name} criado! Diário e Dashboard inicializados.`);
    setForm({ name: "", meta_access_token: "placeholder", ad_account_ids: [], currency_symbol: "R$" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white font-semibold text-sm uppercase tracking-wider">Novo Cliente + Diário</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-[#9b9a97] pb-1">
          O Diário Notion e o Dashboard serão automaticamente criados.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Nome do Cliente*</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Carol Gama"
              className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={createClient.isPending} className="bg-primary text-white font-bold text-xs uppercase h-8 px-5">
            {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function NotionDashboard() {
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sysRole } = useUserRole();

  // Role checks
  const { isAdmin, isCeo, isDiretor, isGestor } = useStaffMemberRole(user?.id);
  const canManageAll = isAdmin || isCeo || isDiretor;
  const canSeeAllTeam = canManageAll;

  // Active Clients
  const { data: globalClients = [], isLoading: clientsLoading } = useClients({ allClientsForStaff: true });
  
  // Archived Clients
  const { data: archivedClients = [], isLoading: archivedLoading } = useClients({
    onlyArchived: true,
    allClientsForStaff: true,
  });

  const { data: notionMap = {} } = useAllClientsNotionData();

  // Team
  const { data: allTeamMembers = [], isLoading: teamLoading } = useTeamMembers();

  // Gestor data
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list-notion"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*"); return data || []; },
  });
  const { data: allMeta = [] } = useAllGestorProfileMeta();
  const { data: staffRoles = [] } = useStaffRoles();
  const [selectedGestorId, setSelectedGestorId] = useState("");
  const deleteTeamMember = useDeleteTeamMember();
  const archiveClient = useArchiveClient();
  const deleteClient = useDeleteClient();

  const gestoresList = useMemo(
    () =>
      staffRoles.filter((r) => r.role === "gestor").map((r) => {
        const p = profiles.find((prof) => prof.user_id === r.user_id);
        const meta = allMeta.find((m) => m.gestor_id === r.user_id);
        return {
          id: r.user_id,
          name: meta?.name_override || p?.full_name || p?.email?.split("@")[0] || "Gestor",
        };
      }),
    [staffRoles, profiles, allMeta]
  );

  const activeGestorId = useMemo(() => {
    if (!canManageAll) return user?.id || "";
    return selectedGestorId || gestoresList[0]?.id || "";
  }, [canManageAll, user?.id, selectedGestorId, gestoresList]);

  const { data: diary } = useGestorDiary(activeGestorId);
  const saveDiary = useSaveGestorDiary();
  const { data: calendarEvents = [] } = useGestorCalendar(activeGestorId);
  const { data: healthMap = {} } = useAllGestorClientMeta(activeGestorId);

  // UI State
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"clients" | "archived_clients" | "team" | "global_calendar">("clients");
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Compile all tasks across all clients for the Global Calendar
  const allTasks = useMemo(() => {
    const list: any[] = [];
    Object.keys(notionMap).forEach(cid => {
      const cNotion = notionMap[cid] || {};
      const clientTasks = cNotion.notion_data?.tasks || [];
      const clientRecord = globalClients.find(c => c.id === cid) || archivedClients.find(c => c.id === cid);
      if (!clientRecord) return;
      
      clientTasks.forEach((t: any) => {
        list.push({
          ...t,
          clientId: cid,
          clientName: clientRecord.name
        });
      });
    });
    return list;
  }, [notionMap, globalClients, archivedClients]);

  // ── Access control for team members ──
  const visibleTeamMembers = useMemo(() => {
    if (canSeeAllTeam) return allTeamMembers;
    const myProfile = profiles.find((p: any) => p.user_id === user?.id);
    const myMeta = allMeta.find((m: any) => m.gestor_id === user?.id);
    const myName = (myMeta?.name_override || myProfile?.full_name || "").toLowerCase().trim();
    
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const myNorm = norm(myName);
    if (!myNorm) return [];

    return allTeamMembers.filter((m) => {
      const mNorm = norm(m.name);
      return mNorm.includes(myNorm) || myNorm.includes(mNorm);
    });
  }, [canSeeAllTeam, allTeamMembers, profiles, allMeta, user?.id]);

  // Client filtering
  const activeClientId = clientIdParam || null;
  const activeClient = useMemo(
    () => {
      const all = [...globalClients, ...archivedClients];
      return all.find((c) => c.id === activeClientId) || null;
    },
    [globalClients, archivedClients, activeClientId]
  );

  const filteredClients = useMemo(() => {
    if (!search.trim()) return globalClients;
    const q = search.toLowerCase();
    return globalClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [globalClients, search]);

  const filteredArchivedClients = useMemo(() => {
    if (!search.trim()) return archivedClients;
    const q = search.toLowerCase();
    return archivedClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [archivedClients, search]);

  const activeMeetings = useMemo(
    () => calendarEvents.filter((e) => e.status !== "done").slice(0, 5),
    [calendarEvents]
  );

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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

  // ── Team member view ──
  if (selectedTeamMember && canSeeAllTeam) {
    const canEditThisMember = true;
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] text-[#e3e2e0] pb-16">
          <div className="h-28 w-full bg-[#202020] border-b border-[#2c2c2b] relative" />
          <div className="max-w-4xl mx-auto px-8 pt-8 space-y-6">
            <button
              onClick={() => setSelectedTeamMember(null)}
              className="text-[#9b9a97] hover:text-[#e3e2e0] transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para Equipe
            </button>
            <TeamMemberNotionTemplate member={selectedTeamMember} canEdit={canEditThisMember} />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Client view ──
  if (activeClientId && activeClient) {
    const all = [...globalClients, ...archivedClients];
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] text-[#e3e2e0] pb-16">
          <div className="bg-[#202020] border-b border-[#2c2c2b] px-6 py-2 flex items-center gap-3">
            <button
              onClick={() => navigate("/notion")}
              className="text-[#9b9a97] hover:text-white transition flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <span className="text-[#3f3f3e]">/</span>
            <Select value={activeClientId} onValueChange={(val) => navigate(`/notion/${val}`)}>
              <SelectTrigger className="h-6 w-[200px] text-xs font-semibold bg-transparent border-none text-primary focus:ring-0 shadow-none p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                {all.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="hover:bg-[#2c2c2b] focus:bg-[#2c2c2b] text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-w-5xl mx-auto px-8 py-6">
            <ClientNotionTemplate clientId={activeClientId} canManage={true} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPage="notion" header={null} noContainer>
      <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-16 selection:bg-[#2c2c2b]">
        {/* Cover Banner */}
        <div className="h-36 w-full bg-[#202020] relative border-b border-[#2c2c2b] flex items-end">
          <div className="absolute -bottom-6 left-16 md:left-24 text-5xl select-none filter drop-shadow-sm">🚀</div>
        </div>

        {/* Notion-style Header */}
        <div className="max-w-6xl mx-auto px-16 pt-10 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#e3e2e0] font-sans">DASHBOARD AND</h1>
          <p className="text-sm text-[#9b9a97] max-w-xl leading-relaxed">
            Área de controle unificada da agência AND — clientes, equipe e diários operacionais.
          </p>

          {canManageAll && gestoresList.length > 0 && (
            <div className="flex items-center gap-2 pt-2 text-xs">
              <span className="text-[#9b9a97] font-semibold">Diário de:</span>
              <Select value={activeGestorId} onValueChange={setSelectedGestorId}>
                <SelectTrigger className="h-6 w-[150px] text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus:ring-0">
                  <SelectValue placeholder="Gestor" />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                  {gestoresList.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="hover:bg-[#2c2c2b] focus:bg-[#2c2c2b] text-xs">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-b border-[#2c2c2b] pt-4" />
        </div>

        {/* Notion Database Workspace layout */}
        <div className="max-w-6xl mx-auto px-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-6">
          {/* Main area */}
          <div className="lg:col-span-2 space-y-6">
            {/* View/Tab selector exactly like Notion */}
            <div className="flex items-center gap-2 border-b border-[#2c2c2b] pb-0.5">
              {[
                { key: "clients", label: "📁 Clientes Ativos" },
                { key: "archived_clients", label: "🗄️ Clientes Inativos" },
                { key: "global_calendar", label: "📅 Calendário Geral" },
                (canSeeAllTeam ? { key: "team", label: "👥 Equipe" } : null)
              ].filter(Boolean).map((item: any) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key as any)}
                  className={`text-[13px] font-medium py-1 px-3 border-b-2 transition-all ${
                    activeSection === item.key
                      ? "border-[#e3e2e0] text-[#e3e2e0]"
                      : "border-transparent text-[#9b9a97] hover:text-[#e3e2e0]"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 pb-1">
                {(activeSection === "clients" || activeSection === "archived_clients") && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-[#9b9a97]" />
                      <Input
                        placeholder="Pesquisar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 pl-8 text-xs w-36 bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px]"
                      />
                    </div>
                    {canManageAll && (
                      <Button
                        onClick={() => setCreateClientOpen(true)}
                        className="h-7 text-xs bg-primary hover:bg-primary/90 text-white px-3 gap-1 rounded-[4px]"
                      >
                        <Plus className="h-3 w-3" />Novo Cliente
                      </Button>
                    )}
                  </>
                )}
                {activeSection === "team" && canSeeAllTeam && (
                  <Button
                    onClick={() => setCreateTeamOpen(true)}
                    className="h-7 text-xs bg-primary hover:bg-primary/90 text-white px-3 gap-1 rounded-[4px]"
                  >
                    <UserPlus className="h-3 w-3" />Nova Ficha
                  </Button>
                )}
              </div>
            </div>

            {/* ── CLIENTS GALLERY VIEW (ACTIVE) ── */}
            {activeSection === "clients" && (
              <>
                {clientsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-[#9b9a97]">Carregando clientes...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClients.map((client) => {
                      const cNotion = notionMap[client.id] || {};
                      const np = cNotion.notion_data?.properties || {};
                      const coverUrl = cNotion.notion_data?.cover_url;
                      const clientMeta = healthMap[client.id] || {};
                      const hVal = clientMeta.health ?? 10;

                      return (
                        <div
                          key={client.id}
                          onClick={() => navigate(`/notion/${client.id}`)}
                          className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden hover:bg-[#252525] transition-colors duration-150 cursor-pointer flex flex-col group select-none shadow-sm h-fit"
                        >
                          <div className="h-16 w-full bg-[#262625] border-b border-[#2c2c2b]/30 relative overflow-hidden shrink-0">
                            {coverUrl ? (
                              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-slate-800/40 to-slate-900/60" />
                            )}
                          </div>
                          <div className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold text-[#e3e2e0] group-hover:text-primary transition-colors">
                                {client.name}
                              </p>
                              <span className={`text-[10px] font-mono font-bold shrink-0 ${healthColorText(hVal)}`}>
                                {hVal}/10
                              </span>
                            </div>
                            {np.prioridade && (
                              <span className="text-[9px] text-[#9b9a97] bg-[#262625] border border-[#2c2c2b] rounded px-1.5 py-0.5 w-fit uppercase font-semibold">
                                PRIORIDADE {np.prioridade}
                              </span>
                            )}
                            <div className="grid grid-cols-1 gap-1 border-t border-[#2c2c2b]/40 pt-2 text-[11px] text-[#9b9a97] font-sans">
                              {np.whatsapp && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="opacity-60 text-xs">📞</span>
                                  <span className="truncate">{np.whatsapp}</span>
                                </div>
                              )}
                              {np.vencimento && (
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-60 text-xs">📅</span>
                                  <span>Vence: <strong className="text-yellow-500">{np.vencimento}</strong></span>
                                </div>
                              )}
                              {np.mes_trafego && (
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-60 text-xs">💰</span>
                                  <span>{np.mes_trafego}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions bar for archiving and deleting */}
                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#2c2c2b]/20 mt-1 select-none">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await archiveClient.mutateAsync({ id: client.id, archived: true });
                                    toast.success("Cliente arquivado!");
                                  } catch (err: any) {
                                    toast.error("Erro ao arquivar: " + err.message);
                                  }
                                }}
                                className="text-[10px] text-[#9b9a97] hover:text-[#e3e2e0] transition-colors flex items-center gap-1 bg-[#262625] px-2 py-0.5 rounded border border-[#2c2c2b]"
                              >
                                <Archive className="h-3 w-3" />
                                Arquivar
                              </button>
                              {canManageAll && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o cliente ${client.name} e todo o diário dele?`)) {
                                      try {
                                        await deleteClient.mutateAsync(client.id);
                                        toast.success("Cliente e diário excluídos permanentemente");
                                      } catch (err: any) {
                                        toast.error("Erro ao excluir: " + err.message);
                                      }
                                    }
                                  }}
                                  className="text-[10px] text-[#9b9a97] hover:text-red-400 transition-colors flex items-center gap-1 hover:bg-red-500/10 px-2 py-0.5 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Excluir
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {filteredClients.length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-[#202020] rounded-[6px] border border-dashed border-[#2c2c2b]">
                        <p className="text-xs text-[#9b9a97]">Nenhum cliente ativo encontrado.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── CLIENTS GALLERY VIEW (INACTIVE/ARCHIVED) ── */}
            {activeSection === "archived_clients" && (
              <>
                {archivedLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-[#9b9a97]">Carregando clientes inativos...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredArchivedClients.map((client) => {
                      const cNotion = notionMap[client.id] || {};
                      const np = cNotion.notion_data?.properties || {};
                      const coverUrl = cNotion.notion_data?.cover_url;
                      const clientMeta = healthMap[client.id] || {};
                      const hVal = clientMeta.health ?? 10;

                      return (
                        <div
                          key={client.id}
                          onClick={() => navigate(`/notion/${client.id}`)}
                          className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden hover:bg-[#252525] transition-colors duration-150 cursor-pointer flex flex-col group select-none shadow-sm h-fit opacity-75 hover:opacity-100"
                        >
                          <div className="h-16 w-full bg-[#262625] border-b border-[#2c2c2b]/30 relative overflow-hidden shrink-0">
                            {coverUrl ? (
                              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-slate-800/40 to-slate-900/60" />
                            )}
                          </div>
                          <div className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold text-[#e3e2e0] group-hover:text-primary transition-colors">
                                {client.name}
                              </p>
                              <span className={`text-[10px] font-mono font-bold shrink-0 ${healthColorText(hVal)}`}>
                                {hVal}/10
                              </span>
                            </div>
                            {np.prioridade && (
                              <span className="text-[9px] text-[#9b9a97] bg-[#262625] border border-[#2c2c2b] rounded px-1.5 py-0.5 w-fit uppercase font-semibold">
                                PRIORIDADE {np.prioridade}
                              </span>
                            )}
                            <div className="grid grid-cols-1 gap-1 border-t border-[#2c2c2b]/40 pt-2 text-[11px] text-[#9b9a97] font-sans">
                              {np.whatsapp && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="opacity-60 text-xs">📞</span>
                                  <span className="truncate">{np.whatsapp}</span>
                                </div>
                              )}
                              {np.vencimento && (
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-60 text-xs">📅</span>
                                  <span>Vence: <strong className="text-yellow-500">{np.vencimento}</strong></span>
                                </div>
                              )}
                              {np.mes_trafego && (
                                <div className="flex items-center gap-1.5">
                                  <span className="opacity-60 text-xs">💰</span>
                                  <span>{np.mes_trafego}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions bar for unarchiving and deleting */}
                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#2c2c2b]/20 mt-1 select-none">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await archiveClient.mutateAsync({ id: client.id, archived: false });
                                    toast.success("Cliente reativado!");
                                  } catch (err: any) {
                                    toast.error("Erro ao reativar: " + err.message);
                                  }
                                }}
                                className="text-[10px] text-[#9b9a97] hover:text-[#e3e2e0] transition-colors flex items-center gap-1 bg-[#262625] px-2 py-0.5 rounded border border-[#2c2c2b]"
                              >
                                <ArchiveRestore className="h-3 w-3" />
                                Reativar
                              </button>
                              {canManageAll && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o cliente ${client.name} e todo o diário dele?`)) {
                                      try {
                                        await deleteClient.mutateAsync(client.id);
                                        toast.success("Cliente e diário excluídos permanentemente");
                                      } catch (err: any) {
                                        toast.error("Erro ao excluir: " + err.message);
                                      }
                                    }
                                  }}
                                  className="text-[10px] text-[#9b9a97] hover:text-red-400 transition-colors flex items-center gap-1 hover:bg-red-500/10 px-2 py-0.5 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Excluir
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {filteredArchivedClients.length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-[#202020] rounded-[6px] border border-dashed border-[#2c2c2b]">
                        <p className="text-xs text-[#9b9a97]">Nenhum cliente inativo encontrado.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── GLOBAL CALENDAR VIEW ── */}
            {activeSection === "global_calendar" && (
              <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2c2c2b]/30 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-[#e3e2e0]">Calendário Geral de Tarefas</span>
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
                    const dayTasks = allTasks.filter(t => t.date === dayObj.dateStr);
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-[75px] bg-[#202020] p-1 flex flex-col gap-1 transition-colors relative hover:bg-[#232323] ${
                          !dayObj.isCurrentMonth ? "opacity-30" : ""
                        }`}
                      >
                        <span className={`text-[9px] font-bold text-right pr-0.5 ${
                          new Date().toISOString().split('T')[0] === dayObj.dateStr
                            ? "text-primary bg-primary/10 rounded px-1"
                            : "text-[#5f5e5b]"
                        }`}>
                          {dayObj.day}
                        </span>
                        
                        <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[50px] pr-0.5">
                          {dayTasks.map((t, tIdx) => {
                            const statusColor = t.status === "Concluído" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                t.status === "Em Progresso" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                            return (
                              <div
                                key={tIdx}
                                onClick={() => navigate(`/notion/${t.clientId}`)}
                                className={`text-[8px] px-1.5 py-0.5 rounded truncate select-none border font-medium cursor-pointer ${statusColor}`}
                                title={`[${t.clientName}] ${t.name} (${t.who || 'Sem Responsável'}) - ${t.status}`}
                              >
                                <span className="font-bold">[{t.clientName.split(" ")[0]}]</span> {t.name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TEAM GALLERY VIEW ── */}
            {activeSection === "team" && (
              <>
                {teamLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-[#9b9a97]">Carregando equipe...</span>
                  </div>
                ) : visibleTeamMembers.length === 0 && !canSeeAllTeam ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <Lock className="h-8 w-8 text-[#3f3f3e]" />
                    <p className="text-xs text-[#9b9a97] max-w-xs">
                      Acesso restrito.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleTeamMembers.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        onSelect={() => setSelectedTeamMember(member)}
                        onDelete={async () => {
                          if (confirm("Remover ficha deste membro da equipe?")) {
                            await deleteTeamMember.mutateAsync(member.id);
                            toast.success("Ficha removida.");
                          }
                        }}
                        canDelete={canSeeAllTeam}
                      />
                    ))}

                    {canSeeAllTeam && (
                      <button
                        onClick={() => setCreateTeamOpen(true)}
                        className="bg-[#202020] border border-dashed border-[#2c2c2b] rounded-[6px] hover:bg-[#252525] hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-2 py-10 text-[#5f5e5b] hover:text-primary group"
                      >
                        <UserPlus className="h-5 w-5 group-hover:scale-105 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Nova Ficha</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right sidebar - clean widget list */}
          <div className="space-y-6">
            {/* Meetings Widget */}
            <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#2c2c2b] bg-[#252525] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#e3e2e0] flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Próximas Reuniões
                </span>
                <span className="text-[10px] text-[#9b9a97] font-mono">({activeMeetings.length})</span>
              </div>
              <div className="p-4 space-y-2.5">
                {activeMeetings.length === 0 ? (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4">Sem reuniões pendentes.</p>
                ) : (
                  activeMeetings.map((e) => (
                    <div key={e.id} className="p-3 bg-[#262625] border border-[#2c2c2b]/60 rounded-[4px] text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#e3e2e0] leading-snug">{e.title}</span>
                        <span className="text-[10px] text-primary font-mono shrink-0">{e.date?.split("T")[0]}</span>
                      </div>
                      {e.meet_link && (
                        <a
                          href={e.meet_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors w-fit"
                        >
                          <Video className="h-3 w-3" /> Entrar no Meet
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Metas da Semana Widget */}
            <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#2c2c2b] bg-[#252525]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#e3e2e0] flex items-center gap-1.5">
                  ⚡ Metas da Semana
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {diary?.meta_semana && diary.meta_semana.length > 0 ? (
                  diary.meta_semana.map((g: any) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        const updated = diary.meta_semana.map((x: any) =>
                          x.id === g.id ? { ...x, done: !x.done } : x
                        );
                        saveDiary.mutate({ gestor_id: activeGestorId, meta_semana: updated });
                      }}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {g.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition-colors" />
                      )}
                      <span className={`leading-snug ${g.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"}`}>
                        {g.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4">Nenhuma meta para essa semana.</p>
                )}
              </div>
            </div>

            {/* Pedidos de Clientes Widget */}
            <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#2c2c2b] bg-[#252525]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#e3e2e0] flex items-center gap-1.5">
                  📋 Pedidos de Clientes
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {diary?.pedidos_cliente && diary.pedidos_cliente.length > 0 ? (
                  diary.pedidos_cliente.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        const updated = diary.pedidos_cliente.map((x: any) =>
                          x.id === r.id ? { ...x, done: !x.done } : x
                        );
                        saveDiary.mutate({ gestor_id: activeGestorId, pedidos_cliente: updated });
                      }}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {r.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition-colors" />
                      )}
                      <span className={`leading-snug ${r.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"}`}>
                        {r.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4">Sem pedidos pendentes.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateClientDiaryDialog open={createClientOpen} onOpenChange={setCreateClientOpen} />
      <CreateTeamMemberDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
    </AppShell>
  );
}
