import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useClients, useCreateClient, ClientInsert } from "@/hooks/useClients";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStaffRoles,
  useStaffMemberRole,
  useGestorDiary,
  useSaveGestorDiary,
  useGestorTasks,
  useGestorCalendar,
  useAllGestorProfileMeta,
  useAllGestorClientMeta,
  useAllClientsNotionData,
  useTeamMembers,
  useUpsertTeamMember,
  useDeleteTeamMember,
  TeamMember,
} from "@/hooks/useGestorDiary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Video,
  Eye,
  User,
  Users,
  Square,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  ArrowLeft,
  Calendar as CalendarIcon,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import ClientNotionTemplate from "@/components/clients/ClientNotionTemplate";

// ─── Helpers ────────────────────────────────────────────────────────────────
const prioBg = (prio: string) => {
  if (prio === "Alta" || prio === "ALTA")
    return "bg-red-500/10 text-red-400 border-red-500/20";
  if (prio === "Média" || prio === "MÉDIA")
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
};

const healthBg = (h: number) => {
  if (h <= 3) return "bg-red-500/10 border-red-500/20 text-red-400";
  if (h <= 6) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
  return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
};

const CARGO_COLORS: Record<string, string> = {
  "DIRETOR DE OPERAÇÕES": "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "GESTOR DE TRÁFEGO": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "SOCIAL SELLING": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "FINANCEIRO": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "WEBDESIGNER E DESIGNER": "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

// ─── Team Member Card ────────────────────────────────────────────────────────
function TeamMemberCard({
  member,
  onSelect,
  onDelete,
}: {
  member: TeamMember;
  onSelect: (m: TeamMember) => void;
  onDelete: (id: string) => void;
}) {
  const cargoColor =
    CARGO_COLORS[member.role.toUpperCase()] ||
    "bg-slate-500/10 text-slate-400 border-slate-500/20";
  const props = member.notion_data?.properties || {};

  return (
    <div
      className="bg-[#202020] border border-[#2c2c2b] rounded-xl overflow-hidden hover:border-[#3f3f3e] transition-all duration-200 cursor-pointer shadow-md group"
      onClick={() => onSelect(member)}
    >
      <div className="h-14 w-full bg-gradient-to-r from-slate-800/60 to-slate-900/80 group-hover:from-slate-700/60 transition-all relative">
        <div className="absolute bottom-2 left-3 text-2xl select-none">👤</div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-extrabold text-white uppercase leading-tight group-hover:text-primary transition-colors">
            {member.name}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(member.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition text-[#5f5e5b] hover:text-red-400 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <Badge
          className={`text-[9px] font-bold border rounded-full px-2 py-0 ${cargoColor}`}
        >
          {member.role.toUpperCase()}
        </Badge>
        {props.whatsapp && (
          <p className="text-[10px] text-[#9b9a97] font-mono truncate">
            📞 {props.whatsapp}
          </p>
        )}
        {props.email_contato && (
          <p className="text-[10px] text-[#9b9a97] font-mono truncate">
            📧 {props.email_contato}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Team Member Page (full-screen) ─────────────────────────────────────────
function TeamMemberPage({
  member,
  onBack,
}: {
  member: TeamMember;
  onBack: () => void;
}) {
  const upsert = useUpsertTeamMember();
  const props = member.notion_data?.properties || {};
  const subpaginas: Array<{ titulo: string; conteudo: string }> =
    member.notion_data?.subpaginas || [];
  const conteudo = member.notion_data?.conteudo_principal || "";

  return (
    <div className="min-h-screen bg-[#191919] text-[#e3e2e0] pb-16">
      {/* Cover */}
      <div className="h-40 w-full bg-gradient-to-r from-slate-800/60 to-slate-900/80 relative border-b border-[#2c2c2b]" />

      <div className="max-w-5xl mx-auto px-6 md:px-12 pt-8 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-[#9b9a97] hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Equipe
          </button>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
            {member.name}
          </h1>
          <Badge
            className={`text-[10px] font-bold border rounded-full px-3 py-0.5 ${
              CARGO_COLORS[member.role.toUpperCase()] ||
              "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}
          >
            {member.role.toUpperCase()}
          </Badge>
        </div>

        <hr className="border-[#2c2c2b]" />

        {/* Properties Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Email Contato", value: props.email_contato },
            { label: "Email Meta", value: props.email_meta },
            { label: "Email Google", value: props.email_google },
            { label: "WhatsApp", value: props.whatsapp },
            { label: "Salário", value: props.salario },
            { label: "Comissão", value: props.comissao },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-[#202020] border border-[#2c2c2b] rounded-xl p-3 space-y-1"
            >
              <p className="text-[9px] text-[#5f5e5b] uppercase font-bold tracking-wider">
                {f.label}
              </p>
              <p className="text-xs text-[#e3e2e0] font-mono">
                {f.value || "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        {conteudo && (
          <div className="bg-[#202020] border border-[#2c2c2b] rounded-xl p-5 space-y-2">
            <p className="text-[10px] text-primary font-black uppercase tracking-wider">
              📋 Conteúdo Principal
            </p>
            <pre className="text-xs text-[#9b9a97] whitespace-pre-wrap leading-relaxed font-sans">
              {conteudo}
            </pre>
          </div>
        )}

        {/* Subpages */}
        {subpaginas.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-[#9b9a97]">
              📁 Subpáginas
            </p>
            {subpaginas.map((sp, i) => (
              <div
                key={i}
                className="bg-[#202020] border border-[#2c2c2b] rounded-xl p-5 space-y-2"
              >
                <p className="text-[10px] text-primary font-black uppercase tracking-wider">
                  {sp.titulo}
                </p>
                <pre className="text-xs text-[#9b9a97] whitespace-pre-wrap leading-relaxed font-sans">
                  {sp.conteudo}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Team Member Dialog ───────────────────────────────────────────────
function CreateTeamMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const upsert = useUpsertTeamMember();
  const [form, setForm] = useState({
    name: "",
    role: "",
    email_contato: "",
    whatsapp: "",
    salario: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Nome e cargo são obrigatórios");
      return;
    }
    await upsert.mutateAsync({
      name: form.name.trim(),
      role: form.role.trim(),
      notion_data: {
        properties: {
          email_contato: form.email_contato,
          whatsapp: form.whatsapp,
          salario: form.salario,
        },
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
      <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-extrabold uppercase">
            Nova Ficha de Equipe
          </DialogTitle>
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
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">
                {f.label}
              </Label>
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
          <Button
            onClick={handleCreate}
            disabled={upsert.isPending}
            className="bg-primary text-white font-bold text-xs uppercase h-8 px-5"
          >
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Ficha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Client Diary Dialog ───────────────────────────────────────────────
function CreateClientDiaryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createClient = useCreateClient();
  const [form, setForm] = useState<ClientInsert>({
    name: "",
    meta_access_token: "placeholder",
    ad_account_ids: [],
    currency_symbol: "R$",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    await createClient.mutateAsync(form);
    toast.success(`Cliente ${form.name} criado! Diário e Dashboard inicializados.`);
    setForm({
      name: "",
      meta_access_token: "placeholder",
      ad_account_ids: [],
      currency_symbol: "R$",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-extrabold uppercase">
            Novo Cliente + Diário
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-[#9b9a97] pb-1">
          Ao criar o cliente, o <span className="text-primary font-bold">Diário Notion</span> e o{" "}
          <span className="text-primary font-bold">Dashboard</span> serão automaticamente
          inicializados.
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">
              Nome do Cliente*
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Carol Gama"
              className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={createClient.isPending}
            className="bg-primary text-white font-bold text-xs uppercase h-8 px-5"
          >
            {createClient.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Criar Cliente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main NotionDashboard Page ───────────────────────────────────────────────
export default function NotionDashboard() {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sysRole } = useUserRole();
  const { isAdmin, isCeo, isDiretor } = useStaffMemberRole(user?.id);
  const canManageOthers =
    isAdmin || isCeo || isDiretor || sysRole?.isAdmin || sysRole?.isCeo || sysRole?.isDiretor;

  // Clients & Notion data
  const { data: globalClients = [], isLoading: clientsLoading } = useClients({
    allClientsForStaff: true,
  });
  const { data: notionMap = {} } = useAllClientsNotionData();

  // Team members
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers();
  const deleteTeamMember = useDeleteTeamMember();

  // Gestor diary data (right panel)
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list-notion"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });
  const { data: allMeta = [] } = useAllGestorProfileMeta();
  const { data: staffRoles = [] } = useStaffRoles();
  const [selectedGestorId, setSelectedGestorId] = useState<string>("");

  const gestoresList = useMemo(
    () =>
      staffRoles
        .filter((r) => r.role === "gestor")
        .map((r) => {
          const p = profiles.find((prof) => prof.user_id === r.user_id);
          const meta = allMeta.find((m) => m.gestor_id === r.user_id);
          return {
            id: r.user_id,
            name:
              meta?.name_override ||
              p?.full_name ||
              p?.email?.split("@")[0] ||
              "Gestor",
          };
        }),
    [staffRoles, profiles, allMeta]
  );

  const activeGestorId = useMemo(() => {
    if (!canManageOthers) return user?.id || "";
    return selectedGestorId || gestoresList[0]?.id || "";
  }, [canManageOthers, user?.id, selectedGestorId, gestoresList]);

  const { data: diary } = useGestorDiary(activeGestorId);
  const saveDiary = useSaveGestorDiary();
  const { data: calendarEvents = [] } = useGestorCalendar(activeGestorId);
  const { data: healthMap = {} } = useAllGestorClientMeta(activeGestorId);

  // UI state
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"clients" | "team">("clients");
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // Determine if we are in client detail page (via URL param)
  const activeClientId = clientIdParam || null;
  const activeClient = useMemo(
    () => globalClients.find((c) => c.id === activeClientId) || null,
    [globalClients, activeClientId]
  );

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!search.trim()) return globalClients;
    const q = search.toLowerCase();
    return globalClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [globalClients, search]);

  const activeMeetings = useMemo(
    () => calendarEvents.filter((e) => e.status !== "done").slice(0, 5),
    [calendarEvents]
  );

  // If we have a team member selected, show their full page
  if (selectedTeamMember) {
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <TeamMemberPage
          member={selectedTeamMember}
          onBack={() => setSelectedTeamMember(null)}
        />
      </AppShell>
    );
  }

  // If we have a client param, show the full client diary page
  if (activeClientId && activeClient) {
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] text-[#e3e2e0] pb-16">
          {/* Discrete client selector strip */}
          <div className="bg-[#202020] border-b border-[#2c2c2b] px-6 py-2 flex items-center gap-3">
            <button
              onClick={() => navigate("/notion")}
              className="text-[#9b9a97] hover:text-white transition flex items-center gap-1 text-[11px] font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <span className="text-[#3f3f3e]">/</span>
            <Select
              value={activeClientId}
              onValueChange={(val) => navigate(`/notion/${val}`)}
            >
              <SelectTrigger className="h-6 w-[220px] text-[11px] font-bold bg-transparent border-none text-primary focus:ring-0 shadow-none p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                {globalClients.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="hover:bg-[#2c2c2b] focus:bg-[#2c2c2b] text-[11px]"
                  >
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Full client diary */}
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-6">
            <ClientNotionTemplate clientId={activeClientId} canManage={true} />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Main Dashboard (Gallery + Teams + Diary Panel) ──
  return (
    <AppShell currentPage="notion" header={null} noContainer>
      <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-16 selection:bg-[#2c2c2b]">
        {/* Cover Banner */}
        <div className="h-40 w-full bg-[#202020] relative border-b border-[#2c2c2b]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 to-slate-900/30" />
          <div className="absolute -bottom-6 left-12 md:left-20 text-5xl select-none filter drop-shadow-md">
            🚀
          </div>
        </div>

        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 md:px-16 pt-10 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            DASHBOARD AND
          </h1>
          <p className="text-xs text-[#9b9a97] max-w-xl leading-relaxed">
            Área de controle unificada da agência AND — clientes, equipe e diários operacionais.
          </p>

          {canManageOthers && gestoresList.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <User className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[#9b9a97] font-semibold">Diário de:</span>
              <Select
                value={activeGestorId}
                onValueChange={setSelectedGestorId}
              >
                <SelectTrigger className="h-6 w-[160px] text-[11px] font-bold bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus:ring-0">
                  <SelectValue placeholder="Gestor" />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                  {gestoresList.map((g) => (
                    <SelectItem
                      key={g.id}
                      value={g.id}
                      className="hover:bg-[#2c2c2b] focus:bg-[#2c2c2b] text-xs"
                    >
                      {g.name.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <hr className="border-[#2c2c2b] mt-4" />
        </div>

        {/* Body: Left main | Right diary panel */}
        <div className="max-w-7xl mx-auto px-6 md:px-16 grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mt-6">

          {/* ── LEFT: Sections (Clients + Team) ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Section Tabs */}
            <div className="flex items-center gap-1 border-b border-[#2c2c2b] pb-2">
              {(["clients", "team"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  className={`text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-md transition ${
                    activeSection === s
                      ? "bg-[#2c2c2b] text-white"
                      : "text-[#9b9a97] hover:bg-[#202020] hover:text-[#e3e2e0]"
                  }`}
                >
                  {s === "clients" ? "📁 Clientes" : "👥 Equipe"}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                {activeSection === "clients" && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-[#9b9a97]" />
                      <Input
                        placeholder="Pesquisar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 pl-7 text-xs w-36 bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-[#3f3f3e]"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setCreateClientOpen(true)}
                      className="h-7 text-[10px] font-bold uppercase bg-primary text-white px-3 gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Novo Cliente
                    </Button>
                  </>
                )}
                {activeSection === "team" && (
                  <Button
                    size="sm"
                    onClick={() => setCreateTeamOpen(true)}
                    className="h-7 text-[10px] font-bold uppercase bg-primary text-white px-3 gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    Nova Ficha
                  </Button>
                )}
              </div>
            </div>

            {/* ── CLIENTS SECTION ── */}
            {activeSection === "clients" && (
              <>
                {clientsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs text-[#9b9a97]">Carregando clientes...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClients.map((client) => {
                      const np = notionMap[client.id]?.properties || {};
                      const clientMeta = healthMap[client.id] || {};
                      const hVal = clientMeta.health ?? 10;

                      return (
                        <div
                          key={client.id}
                          onClick={() => navigate(`/notion/${client.id}`)}
                          className="bg-[#202020] border border-[#2c2c2b] rounded-xl overflow-hidden hover:border-[#3f3f3e] transition-all duration-200 cursor-pointer shadow-md group"
                        >
                          <div className="h-9 w-full bg-gradient-to-r from-emerald-500/10 to-slate-800/20 group-hover:from-emerald-500/20 transition-all" />
                          <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-extrabold text-white group-hover:text-primary transition-colors uppercase leading-tight">
                                {client.name}
                              </p>
                              <Badge
                                className={`text-[9px] font-bold border rounded-full px-2 py-0 shrink-0 ${healthBg(hVal)}`}
                              >
                                {hVal}/10
                              </Badge>
                            </div>
                            {np.prioridade && (
                              <Badge
                                className={`text-[8px] font-bold border rounded-full px-2 py-0 ${prioBg(np.prioridade)}`}
                              >
                                PRIORIDADE {np.prioridade.toUpperCase()}
                              </Badge>
                            )}
                            <div className="grid grid-cols-1 gap-1 border-t border-[#2c2c2b]/50 pt-2 font-mono text-[10px] text-[#9b9a97]">
                              {np.whatsapp && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[#5f5e5b] shrink-0">📞</span>
                                  <span className="truncate">{np.whatsapp}</span>
                                </div>
                              )}
                              {np.vencimento && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] shrink-0">📅</span>
                                  <span className="text-yellow-400 font-bold">{np.vencimento}</span>
                                </div>
                              )}
                              {np.mes_trafego && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#5f5e5b] shrink-0">💰</span>
                                  <span>{np.mes_trafego}/mês</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end pt-0.5">
                              <span className="text-[9px] text-primary font-bold opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Abrir Ficha →
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredClients.length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-[#202020] rounded-xl border border-dashed border-[#2c2c2b]">
                        <p className="text-xs text-[#9b9a97]">
                          Nenhum cliente encontrado.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── TEAM SECTION ── */}
            {activeSection === "team" && (
              <>
                {teamLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs text-[#9b9a97]">Carregando equipe...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        onSelect={setSelectedTeamMember}
                        onDelete={async (id) => {
                          if (confirm("Remover ficha desta pessoa?")) {
                            await deleteTeamMember.mutateAsync(id);
                            toast.success("Ficha removida.");
                          }
                        }}
                      />
                    ))}

                    {/* Add new card button */}
                    <button
                      onClick={() => setCreateTeamOpen(true)}
                      className="bg-[#202020] border border-dashed border-[#2c2c2b] rounded-xl hover:border-primary/40 transition-all duration-200 flex flex-col items-center justify-center gap-2 py-10 text-[#5f5e5b] hover:text-primary group"
                    >
                      <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase">Nova Ficha</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: Diary Panel ── */}
          <div className="space-y-5">
            {/* Meetings */}
            <Card className="bg-[#202020] border border-[#2c2c2b] rounded-xl shadow-md overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-[#2c2c2b]">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Próximas Reuniões ({activeMeetings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {activeMeetings.length === 0 ? (
                  <p className="text-xs text-[#9b9a97] italic text-center py-4">
                    Sem reuniões pendentes.
                  </p>
                ) : (
                  activeMeetings.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 bg-[#262625] border border-[#2c2c2b]/60 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-[#e3e2e0] leading-snug">
                          {e.title}
                        </span>
                        <span className="text-[10px] text-primary font-mono font-bold shrink-0">
                          {e.date?.split("T")[0]}
                        </span>
                      </div>
                      {e.meet_link && (
                        <a
                          href={e.meet_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition"
                        >
                          <Video className="h-3 w-3" /> Entrar no Meet
                        </a>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Metas da Semana */}
            <div className="bg-[#262625] border border-[#2c2c2b] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#e3e2e0]">
                ⚡ Metas da Semana
              </div>
              <div className="space-y-2 border-t border-[#2c2c2b] pt-3">
                {diary?.meta_semana && diary.meta_semana.length > 0 ? (
                  diary.meta_semana.map((g: any) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        const updated = diary.meta_semana.map((x: any) =>
                          x.id === g.id ? { ...x, done: !x.done } : x
                        );
                        saveDiary.mutate({
                          gestor_id: activeGestorId,
                          meta_semana: updated,
                        });
                      }}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {g.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition" />
                      )}
                      <span
                        className={`leading-snug ${
                          g.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"
                        }`}
                      >
                        {g.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic py-2">
                    Nenhuma meta para essa semana.
                  </p>
                )}
              </div>
            </div>

            {/* Pedidos de Clientes */}
            <div className="bg-[#202020] border border-[#2c2c2b] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#e3e2e0]">
                📋 Pedidos de Clientes
              </div>
              <div className="space-y-2 border-t border-[#2c2c2b] pt-3">
                {diary?.pedidos_cliente && diary.pedidos_cliente.length > 0 ? (
                  diary.pedidos_cliente.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        const updated = diary.pedidos_cliente.map((x: any) =>
                          x.id === r.id ? { ...x, done: !x.done } : x
                        );
                        saveDiary.mutate({
                          gestor_id: activeGestorId,
                          pedidos_cliente: updated,
                        });
                      }}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs group"
                    >
                      {r.done ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#5f5e5b] group-hover:text-[#9b9a97] shrink-0 mt-0.5 transition" />
                      )}
                      <span
                        className={`leading-snug ${
                          r.done ? "line-through text-[#5f5e5b]" : "text-[#e3e2e0]"
                        }`}
                      >
                        {r.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#9b9a97] italic py-2">
                    Sem pedidos pendentes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateClientDiaryDialog
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
      />
      <CreateTeamMemberDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
      />
    </AppShell>
  );
}
