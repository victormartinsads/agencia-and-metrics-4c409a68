import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
  KanbanSquare,
  Brain,
  Shield,
  KeyRound,
  Loader2,
  Sparkles,
  Search,
  Command,
  BookOpen,
  Home,
  Bot,
  MessageSquare,
  MessageCircle,
  CheckSquare,
  Webhook,
  ChevronRight,
  Bell,
  GitMerge,
  Plus,
  FilePlus,
} from "lucide-react";
import { useCreateSubpage, useSubpages } from "@/hooks/useSubpages";
import { NotionSidebarTree } from "@/components/notion/NotionSidebarTree";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile, displayName } from "@/hooks/useProfile";
import { useStaffMemberRole } from "@/hooks/useGestorDiary";
import { cn } from "@/lib/utils";
import andLogo from "@/assets/and-logo.png";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui/page-transition";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useClients } from "@/hooks/useClients";
import { useEffect as useEffectReact } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AppShellProps {
  children: ReactNode;
  currentPage?:
    | "dashboard"
    | "clients"
    | "settings"
    | "crm"
    | "manager"
    | "manage"
    | "home"
    | "notion"
    | "processos"
    | "alerts";
  header?: ReactNode;
  noContainer?: boolean;
}

const PAGE_LABELS: Record<string, string> = {
  "": "Home",
  clients: "Clientes",
  dashboard: "Dashboard",
  "crm-app": "CRM",
  gestor: "Gestor",
  "diario-do-gestor": "Diário do Gestor",
  settings: "Configurações",
  sheets: "Planilhas",
  webhooks: "Webhooks",
  portal: "Portal",
  notion: "Notion",
  processos: "Processos",
};

export default function AppShell({
  children,
  currentPage = "dashboard",
  header,
  noContainer = false,
}: AppShellProps) {
  const [open, setOpen] = useState(true);
  const { signOut, user } = useAuth();
  const { data: role } = useUserRole();
  const { data: profile } = useProfile();
  const {
    role: staffRole,
    isAdmin: isStaffAdmin,
    isCeo: isStaffCeo,
    isDiretor: isStaffDiretor,
    isGestor: isStaffGestor,
    realRole,
  } = useStaffMemberRole(user?.id);
  const { data: clientsList = [] } = useClients();

  const isRealAdmin = role?.isAdmin || realRole === "admin";
  const [simulatedRole, setSimulatedRole] = useState<string>(() => {
    return localStorage.getItem("simulated-staff-role") || "admin";
  });

  const handleSimulateRole = (val: string) => {
    setSimulatedRole(val);
    if (val === "admin") {
      localStorage.removeItem("simulated-staff-role");
    } else {
      localStorage.setItem("simulated-staff-role", val);
    }
    toast.success(`Simulando perfil de ${val.toUpperCase()}`);
    setTimeout(() => {
      navigate("/");
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }, 800);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffectReact(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleChangePassword = async () => {
    if (newPwd.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (newPwd !== confirmPwd) return toast.error("As senhas não conferem");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso");
    setNewPwd("");
    setConfirmPwd("");
    setPwdOpen(false);
  };

  const groups = [
    {
      label: "Visão geral",
      items: [
        { id: "home", label: "Home", icon: Home, href: "/" },
        { id: "clients", label: "Clientes", icon: Users, href: "/clients" },
        { id: "notion", label: "Notion", icon: Command, href: "/notion" },
        { id: "processos", label: "Processos", icon: GitMerge, href: "/processos" },
      ],
    },
    {
      label: "Operação",
      items: [
        { id: "crm", label: "CRM", icon: KanbanSquare, href: "/crm-app" },
        { id: "alerts", label: "Alertas", icon: Bell, href: "/alertas" },
        ...((role?.isAdmin || isStaffAdmin || isStaffCeo || isStaffDiretor || isStaffGestor)
          ? [{ id: "diario-gestor", label: "Diário do Gestor", icon: BookOpen, href: "/diario-do-gestor" }]
          : []),
      ],
    },
    {
      label: "Ferramentas do Gestor",
      items: [
        { id: "fg-meta", label: "Meta Ads", icon: Sparkles, href: "/ferramentas-do-gestor?tab=meta-ads" },
        { id: "fg-google", label: "Google Ads", icon: Bot, href: "/ferramentas-do-gestor?tab=google-ads" },
        { id: "fg-meetings", label: "Reuniões", icon: BookOpen, href: "/ferramentas-do-gestor?tab=meetings" },
        { id: "fg-reports", label: "Relatórios", icon: LayoutDashboard, href: "/ferramentas-do-gestor?tab=reports" },
        { id: "fg-automations", label: "Automações", icon: Webhook, href: "/ferramentas-do-gestor?tab=automations" },
        { id: "fg-templates", label: "Templates", icon: MessageCircle, href: "/ferramentas-do-gestor?tab=templates" },
        { id: "fg-integrations", label: "Integrações", icon: Users, href: "/ferramentas-do-gestor?tab=integrations" },
        { id: "fg-settings", label: "Ajustes", icon: SettingsIcon, href: "/ferramentas-do-gestor?tab=settings" },
      ],
    },
    ...((role?.canAccessSettings || isStaffAdmin || isStaffCeo || isStaffDiretor)
      ? [
          {
            label: "Conta",
            items: [
              { id: "settings", label: "Configurações", icon: SettingsIcon, href: "/settings" },
            ],
          },
        ]
      : []),
  ];

  const isActive = (item: { id: string; href: string }) => {
    if (currentPage && item.id === currentPage) return true;
    if (item.href === "/") return location.pathname === "/";

    const hasQuery = item.href.includes("?");
    const pathPart = hasQuery ? item.href.split("?")[0] : item.href;
    const queryPart = hasQuery ? item.href.split("?")[1] : "";
    const itemTab = new URLSearchParams(queryPart).get("tab");
    const currentTab = new URLSearchParams(location.search).get("tab");

    if (location.pathname.startsWith(pathPart)) {
      if (itemTab) {
        if (itemTab === "overview") {
          return currentTab === "overview" || !currentTab;
        }
        return currentTab === itemTab;
      }
      return !currentTab;
    }
    return false;
  };

  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg) => {
    if (PAGE_LABELS[seg]) return PAGE_LABELS[seg];
    // Hide raw UUIDs from breadcrumb
    if (/^[0-9a-f]{8}-/.test(seg)) return null;
    return seg;
  }).filter(Boolean) as string[];

  const userInitial = (user?.email?.[0] || "U").toUpperCase();
  const userName = displayName(profile, user?.email);
  const userAvatar = profile?.avatar_url || null;

  const createSubpage = useCreateSubpage();
  const { data: subpagesList = [] } = useSubpages();

  const handleCreatePageClick = async () => {
    try {
      const newPage = await createSubpage.mutateAsync({ title: "Nova Página" });
      toast.success("Nova página criada!");
      navigate(`/processos/pagina/${newPage.id}`);
    } catch {
      toast.error("Erro ao criar nova página");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar/80 backdrop-blur-2xl text-sidebar-foreground border-r border-sidebar-border/40 flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-30 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.8)]",
          open ? "w-64" : "w-[72px]",
        )}
      >
        {/* Brand */}
        <div className="border-b border-sidebar-border/40 px-3 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 px-2 py-1.5 min-h-[44px] rounded-xl hover:bg-sidebar-accent/40 transition-colors cursor-pointer group"
            aria-label="Ir para CENTRAL AND"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/50 border border-white/10 overflow-hidden shadow-inner group-hover:border-primary/50 transition-colors">
              <img src={andLogo} alt="AND" className="h-6 w-6 object-contain" />
            </span>
            {open && (
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-sm font-display font-black tracking-widest truncate bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  CENTRAL AND
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 mt-1 font-bold">
                  Mídia · CRM
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Quick Create Page Button */}
          <button
            type="button"
            onClick={handleCreatePageClick}
            disabled={createSubpage.isPending}
            title={!open ? "Nova Página" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer text-[#7a9d96] bg-[#7a9d96]/10 border border-[#7a9d96]/30 hover:bg-[#7a9d96]/20 hover:border-[#7a9d96]/50 mb-2",
              !open && "justify-center px-0"
            )}
          >
            <FilePlus className="h-4 w-4 shrink-0 text-[#7a9d96]" />
            {open && <span>+ Nova Página</span>}
          </button>
          {groups.map((g) => (
            <div key={g.label} className="space-y-1">
              {open && (
                <p className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {g.label}
                </p>
              )}
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    title={!open ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[40px] text-xs transition-all duration-200 relative cursor-pointer group",
                      active
                        ? "bg-primary text-black font-bold shadow-[0_4px_12px_rgba(163,230,53,0.2)]"
                        : "text-sidebar-foreground/70 hover:bg-white/[0.03] hover:text-sidebar-foreground border border-transparent",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", active ? "text-black scale-105" : "group-hover:scale-105")} />
                    {open && <span className="truncate font-semibold">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Notion Interactive Tree View */}
          <NotionSidebarTree isSidebarOpen={open} />
        </nav>

        {/* Footer / user */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {isRealAdmin && open && (
            <div className="space-y-1.5 mx-1 mb-2">
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-sidebar-accent/30 text-[11px] text-sidebar-accent-foreground">
                <span className="flex items-center gap-2 font-medium">
                  <Shield className="h-3 w-3 text-primary" /> Admin
                </span>
                {simulatedRole !== "admin" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wide">
                    Simulando
                  </span>
                )}
              </div>
              <div className="p-1.5 rounded-md bg-sidebar-accent/10 border border-sidebar-border space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Função Visualizada:
                </div>
                <Select
                  value={simulatedRole}
                  onValueChange={handleSimulateRole}
                >
                  <SelectTrigger className="h-6 text-[10px] bg-background border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border">
                    <SelectItem value="admin">Admin (Completo)</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className={cn("flex items-center gap-2 px-1 py-1.5", !open && "justify-center")}>
            <div className="h-7 w-7 shrink-0 rounded-full bg-primary grid place-items-center text-[11px] font-semibold text-primary-foreground">
              {userInitial}
            </div>
            {open && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {user?.email?.split("@")[0] || "Conta"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {role?.isMasterAdmin ? "Master Admin" : role?.isAdmin ? "Administrador" : role?.isCeo ? "CEO" : role?.isDiretor ? "Diretor" : role?.isGestor ? "Gestor" : "Membro"}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPwdOpen(true)}
            className={cn(
              "w-full min-h-[44px] text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground cursor-pointer",
              open ? "justify-start" : "justify-center px-0",
            )}
            title="Alterar senha"
          >
            <KeyRound className="h-4 w-4" />
            {open && <span className="ml-2 text-xs">Alterar senha</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className={cn(
              "w-full min-h-[44px] text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground cursor-pointer",
              open ? "justify-start" : "justify-center px-0",
            )}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2 text-xs">Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar with breadcrumbs + search + avatar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/5 bg-background/60 px-6 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer border border-white/5 hover:border-white/10"
            aria-label={open ? "Recolher menu" : "Expandir menu"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm min-w-0 overflow-hidden font-medium">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors shrink-0">
              Home
            </Link>
            {breadcrumbs.map((label, i) => (
              <span key={i} className="flex items-center gap-2 text-muted-foreground min-w-0">
                <span className="text-border">/</span>
                <span className={cn("truncate", i === breadcrumbs.length - 1 ? "text-foreground" : "")}>
                  {label}
                </span>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Busca global"
              className="group hidden md:flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-white/10 hover:text-foreground sm:w-72 cursor-pointer shadow-inner"
            >
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline">Buscar clientes, campanhas…</span>
              <span className="ml-auto hidden items-center gap-0.5 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[10px] font-bold sm:flex">
                <Command className="h-3 w-3" />K
              </span>
            </button>
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || "Sua conta"}
                title={userName || undefined}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-background"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full bg-primary ring-2 ring-background grid place-items-center text-[11px] font-semibold text-primary-foreground"
                aria-label="Sua conta"
                title={userName || undefined}
              >
                {userInitial}
              </div>
            )}
          </div>
        </header>

        {/* Optional page header */}
        {header && (
          <div className="border-b border-border/60 bg-card/40 backdrop-blur-sm">{header}</div>
        )}

        <div className="flex-1 overflow-auto">
          <PageTransition key={location.pathname}>
            {noContainer ? (
              children
            ) : (
              <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">{children}</div>
            )}
          </PageTransition>
        </div>
      </main>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar minha senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha de acesso. Mínimo 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">Nova senha</Label>
              <Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd">Confirmar nova senha</Label>
              <Input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={savingPwd}>
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar clientes, páginas…" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Clientes">
            {clientsList.slice(0, 30).map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.slug}`}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate(`/dashboard/${c.id}`);
                }}
              >
                <Users className="h-3.5 w-3.5 mr-2" />
                <span className="uppercase">{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Páginas do Notion">
            {subpagesList.slice(0, 30).map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.title} ${p.id}`}
                onSelect={() => {
                  setSearchOpen(false);
                  navigate(`/processos/pagina/${p.id}`);
                }}
              >
                <span className="mr-2 text-xs">{p.icon_emoji || "📄"}</span>
                <span className="truncate">{p.title || "Sem título"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/"); }}>
              <Home className="h-3.5 w-3.5 mr-2" /> Home
            </CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/clients"); }}>
              <Users className="h-3.5 w-3.5 mr-2" /> Clientes
            </CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); navigate("/crm-app"); }}>
              <KanbanSquare className="h-3.5 w-3.5 mr-2" /> CRM
            </CommandItem>
            {(role?.isAdmin || role?.isCeo || role?.isDiretor || role?.isGestor) && (
              <CommandItem onSelect={() => { setSearchOpen(false); navigate("/gestor"); }}>
                <Brain className="h-3.5 w-3.5 mr-2" /> Gestor
              </CommandItem>
            )}
            {role?.canAccessSettings && (
              <CommandItem onSelect={() => { setSearchOpen(false); navigate("/settings"); }}>
                <SettingsIcon className="h-3.5 w-3.5 mr-2" /> Configurações
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}