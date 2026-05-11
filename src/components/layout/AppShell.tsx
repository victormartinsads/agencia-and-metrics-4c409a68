import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  LogOut,
  KanbanSquare,
  Brain,
  Shield,
  KeyRound,
  Loader2,
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
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /** Identifier of the current top-level page (highlights nav). */
  currentPage?:
    | "dashboard"
    | "clients"
    | "settings"
    | "crm"
    | "manager"
    | "manage";
  /** Optional page header rendered as a sticky bar above the content. */
  header?: ReactNode;
  /** Disable the inner max-width / padding wrapper around children. */
  noContainer?: boolean;
}

export default function AppShell({
  children,
  currentPage = "dashboard",
  header,
  noContainer = false,
}: AppShellProps) {
  const [open, setOpen] = useState(true);
  const { signOut } = useAuth();
  const { data: role } = useUserRole();
  const location = useLocation();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (newPwd.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("As senhas não conferem");
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha alterada com sucesso");
    setNewPwd("");
    setConfirmPwd("");
    setPwdOpen(false);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, href: "/" },
    { id: "crm", label: "CRM", icon: KanbanSquare, href: "/crm-app" },
    ...(role?.isAdmin
      ? [
          {
            id: "manager",
            label: "Visão do Gestor",
            icon: Brain,
            href: "/gestor",
          },
        ]
      : []),
    {
      id: "manage",
      label: "Gerenciar Clientes",
      icon: Users,
      href: "/clients",
    },
    ...(role?.isAdmin
      ? [
          {
            id: "settings",
            label: "Configurações",
            icon: SettingsIcon,
            href: "/settings",
          },
        ]
      : []),
  ] as const;

  const isActive = (item: (typeof navItems)[number]) => {
    if (currentPage && item.id === currentPage) return true;
    if (item.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.href);
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
          open ? "w-64" : "w-[72px]",
        )}
      >
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between gap-2">
          {open && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0 neon-glow">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-base truncate">Agência AND</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((o) => !o)}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0"
            aria-label={open ? "Recolher menu" : "Expandir menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.id}
                to={item.href}
                title={!open ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
                {open && active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {role?.isAdmin && open && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-sidebar-accent/30 text-[11px] text-sidebar-accent-foreground">
              <Shield className="h-3 w-3 text-primary" /> Admin
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPwdOpen(true)}
            className={cn(
              "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground mb-1",
              open ? "justify-start" : "justify-center px-0",
            )}
            title="Alterar senha"
          >
            <KeyRound className="h-4 w-4" />
            {open && <span className="ml-2 text-sm">Alterar senha</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className={cn(
              "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
              open ? "justify-start" : "justify-center px-0",
            )}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2 text-sm">Sair</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {header && (
          <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
            {header}
          </div>
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
              <Input
                id="new-pwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd">Confirmar nova senha</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={savingPwd}>
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
