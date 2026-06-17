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
} from "lucide-react";
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
    | "home";
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
      ],
    },
    {
      label: "Operação",
      items: [
        { id: "crm", label: "CRM", icon: KanbanSquare, href: "/crm-app" },
        ...((role?.isAdmin || role?.isCeo || role?.isDiretor || role?.isGestor || isStaffAdmin || isStaffCeo || isStaffDiretor || isStaffGestor)
          ? [{ id: "manager", label: "Gestor", icon: Brain, href: "/gestor" }]
          : []),
        ...((role?.isAdmin || isStaffAdmin || isStaffCeo || isStaffDiretor || isStaffGestor)
          ? [{ id: "diario-gestor", label: "Diário do Gestor", icon: BookOpen, href: "/diario-do-gestor" }]
          : []),
        { id: "robo-analista", label: "Robô Analista", icon: Bot, href: "/robo-analista" },
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
    return location.pathname.startsWith(item.href);
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

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
          open ? "w-64" : "w-[72px]",
        )}
      >
        {/* Brand */}
        <div className="border-b border-sidebar-border px-2 py-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/40 transition-colors"
            aria-label="Ir para CENTRAL AND"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-black overflow-hidden">
              <img src={andLogo} alt="AND" className="h-7 w-7 object-contain" />
            </span>
            {open && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-bold tracking-[0.18em] truncate text-primary">
                  CENTRAL AND
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Mídia · Criativos · CRM
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
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
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors relative",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {open && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
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
              "w-full text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
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
              "w-full text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
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
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            aria-label={open ? "Recolher menu" : "Expandir menu"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm min-w-0 overflow-hidden">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
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
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Busca global"
              className="group hidden md:flex h-9 items-center gap-2 rounded-md border border-border/60 bg-surface px-2.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground sm:w-64"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buscar clientes, leads, criativos…</span>
              <span className="ml-auto hidden items-center gap-0.5 rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] sm:flex">
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
          {noContainer ? (
            children
          ) : (
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">{children}</div>
          )}
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