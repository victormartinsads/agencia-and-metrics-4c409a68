import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Globe, Users, Shield, Loader2, FileSpreadsheet, ExternalLink, KanbanSquare, KeyRound, Mail as MailIcon, User as UserIcon, Upload, Save as SaveIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useClients } from "@/hooks/useClients";
import { GoogleAnalyticsPanel } from "@/components/dashboard/GoogleAnalyticsPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMembers,
  useInviteMember,
  useSetMemberRole,
  useRemoveMember,
  useSetMemberPassword,
} from "@/hooks/useMembers";
import { toast } from "sonner";
import { Trash2, UserPlus, Mail } from "lucide-react";
import {
  useClientUsers,
  useCreateClientUser,
  useSetClientUserPassword,
  useSetClientUserEmail,
  useSetClientUserClient,
  useRemoveClientUser,
} from "@/hooks/useClientUsers";
import AppShell from "@/components/layout/AppShell";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Link2, Unlink } from "lucide-react";
import { useMetaConnectionStatus, useConnectMeta, useDisconnectMeta } from "@/hooks/useMetaAds";
import { getMetaOAuthRedirectUri } from "@/lib/metaOAuth";
import { friendlyError } from "@/lib/friendlyError";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { data: role, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = !!role?.isAdmin;

  const header = (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" /> Configurações
      </h1>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isAdmin ? "Painel de administração e conta pessoal" : "Configurações da sua conta"}
      </p>
    </div>
  );

  return (
    <AppShell currentPage="settings" header={header} noContainer>
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-6">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="account" className="gap-1.5">
              <UserIcon className="h-3.5 w-3.5" /> Minha conta
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="google" className="gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Conexões
                </TabsTrigger>
                <TabsTrigger value="sheets" className="gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Planilhas
                </TabsTrigger>
                <TabsTrigger value="members" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Membros
                </TabsTrigger>
                <TabsTrigger value="client-access" className="gap-1.5">
                  <KanbanSquare className="h-3.5 w-3.5" /> Acessos de Clientes
                </TabsTrigger>
                <TabsTrigger value="permissions" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Permissões
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="account">
            <MyAccountSection />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="google"><GoogleAnalyticsSection /></TabsContent>
              <TabsContent value="sheets"><SheetsSection /></TabsContent>
              <TabsContent value="members"><MembersSection /></TabsContent>
              <TabsContent value="client-access"><ClientAccessSection /></TabsContent>
              <TabsContent value="permissions"><PermissionsSection /></TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </AppShell>
  );
}

function MyAccountSection() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setRoleTitle(profile.role_title || "");
    }
    if (user?.email && !emailValue) setEmailValue(user.email);
  }, [profile, user]);

  const initials = ((firstName || user?.email || "U")[0] || "U").toUpperCase();

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Foto atualizada");
    } catch (err: any) { toast.error(err.message || "Erro ao enviar foto"); }
  };

  const saveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        role_title: roleTitle.trim() || null,
        full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
      });
      toast.success("Perfil atualizado");
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  const saveEmail = async () => {
    if (!emailValue.includes("@")) return toast.error("Email inválido");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: emailValue.trim() });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de confirmação para o novo email");
  };

  const changePassword = async () => {
    if (newPwd.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (newPwd !== confirmPwd) return toast.error("As senhas não conferem");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada");
    setNewPwd(""); setConfirmPwd("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">Perfil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Essas informações aparecem em todo o sistema. O nome será exibido na tela de boas-vindas.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-[hsl(152_69%_45%)] grid place-items-center text-lg font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-surface text-xs font-medium text-foreground">
            <Upload className="h-3.5 w-3.5" />
            {uploadAvatar.isPending ? "Enviando..." : "Trocar foto"}
            <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">Nome</Label>
            <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Sobrenome</Label>
            <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="role_title">Cargo</Label>
            <Input id="role_title" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Ex. Gestor de Mídia" />
          </div>
        </div>

        <div>
          <Button onClick={saveProfile} disabled={updateProfile.isPending} className="gap-2">
            {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            Salvar perfil
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">Email</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ao alterar, enviaremos um link de confirmação para o novo endereço.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="email">Endereço de email</Label>
            <Input id="email" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} />
          </div>
          <Button onClick={saveEmail} disabled={savingEmail} variant="outline" className="gap-2">
            {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} Atualizar email
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">Senha</h2>
          <p className="text-sm text-muted-foreground mt-1">Mínimo de 6 caracteres.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Nova senha</Label>
            <Input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Confirmar</Label>
            <Input id="confirm-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <Button onClick={changePassword} disabled={savingPwd} className="gap-2">
          {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Alterar senha
        </Button>
      </Card>
    </div>
  );
}

function SheetsSection() {
  const { data: clients, isLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-card-foreground">
          Configuração de Planilhas por Cliente
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione um cliente para mapear colunas, filtros e fontes de dados das planilhas.
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label>Cliente</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente..." />
          </SelectTrigger>
          <SelectContent>
            {(clients || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClientId && (
        <div className="border-t border-border pt-5">
          <Link
            to={`/dashboard/${selectedClientId}/sheets`}
            className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Abrir configuração de planilhas
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <p className="text-xs text-muted-foreground mt-3">
            Você será redirecionado para a tela de mapeamento de colunas, sincronização e webhooks deste cliente.
          </p>
        </div>
      )}
    </Card>
  );
}

function MetaConnectionSection({ clientId }: { clientId: string }) {
  const { data: status, isLoading: statusLoading } = useMetaConnectionStatus(clientId);
  const connectMeta = useConnectMeta();
  const disconnectMeta = useDisconnectMeta();
  const [manualToken, setManualToken] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const qc = useQueryClient();

  const handleConnect = async () => {
    if (!clientId) return;
    const redirectUri = getMetaOAuthRedirectUri();
    try {
      const result = await connectMeta.mutateAsync({ clientId, redirectUri });
      window.location.href = result.authUrl;
    } catch (e) {
      toast.error(friendlyError(e, "Erro ao iniciar conexão com Facebook"));
    }
  };

  const handleDisconnect = async () => {
    if (!clientId) return;
    try {
      await disconnectMeta.mutateAsync(clientId);
      toast.success("Conexão Meta Ads removida");
    } catch (e) {
      toast.error(friendlyError(e, "Erro ao desconectar"));
    }
  };

  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) return;
    setSavingManual(true);
    try {
      const { error } = await supabase
        .from("meta_tokens")
        .upsert({
          client_id: clientId,
          access_token: manualToken.trim(),
          expires_at: null, // Permanent token has no expiry
        }, { onConflict: "client_id" });

      if (error) throw error;
      toast.success("Token permanente salvo com sucesso!");
      setManualToken("");
      qc.invalidateQueries({ queryKey: ["meta-status", clientId] });
    } catch (e) {
      toast.error(friendlyError(e, "Erro ao salvar token"));
    } finally {
      setSavingManual(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-[#1877F2]" />
          <div>
            <p className="text-sm font-semibold text-foreground">Facebook (Meta Ads)</p>
            <p className="text-xs text-muted-foreground">
              {status?.connected 
                ? `Conectado${status.token?.expires_at ? ` (Expira em: ${new Date(status.token.expires_at).toLocaleDateString("pt-BR")})` : " (Token Permanente)"}`
                : "Não conectado"}
            </p>
          </div>
        </div>
        <div>
          {status?.connected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-1.5 text-destructive hover:bg-destructive/10">
              <Unlink className="h-3.5 w-3.5" /> Desconectar
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={connectMeta.isPending} size="sm" className="gap-1.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
              {connectMeta.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Conectar Facebook
            </Button>
          )}
        </div>
      </div>

      {/* Manual Permanent Token Input */}
      <div className="border-t border-border pt-4 mt-2 space-y-3">
        <div>
          <Label className="text-xs font-semibold text-foreground">Token de Acesso Permanente (Usuário do Sistema / Meta Dev)</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Insira o Token de Usuário do Sistema gerado no seu Business Manager para uma conexão global que nunca expira.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Cole o token permanente (começa com EAAB...)"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="h-9 text-xs"
          />
          <Button
            size="sm"
            onClick={handleSaveManualToken}
            disabled={savingManual || !manualToken.trim()}
            className="h-9 text-xs"
          >
            {savingManual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar Token"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoogleAnalyticsSection() {
  const { data: clients, isLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Utilizar o primeiro cliente para a conexão global do Google
  const firstClient = clients?.[0];

  return (
    <div className="space-y-4">
      {/* Bloco de Conexão Global */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Conexão Google Ads & GA4 (Global)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte a conta do Google da agência. Essa conexão será usada de forma compartilhada por todos os clientes.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando clientes...</span>
          </div>
        ) : !firstClient ? (
          <p className="text-sm text-amber-500 font-medium py-2">
            Por favor, crie pelo menos um cliente na aba correspondente antes de conectar a conta do Google.
          </p>
        ) : (
          <div className="border-t border-border pt-4">
            <GoogleAnalyticsPanel clientId={firstClient.id} datePreset="last_7d" />
          </div>
        )}
      </Card>

      {/* Bloco de Conexão Meta Ads (Global) */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Conexão Meta Ads / Facebook (Global)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte a conta do Facebook da agência. Essa conexão será usada de forma compartilhada por todos os clientes.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando clientes...</span>
          </div>
        ) : !firstClient ? (
          <p className="text-sm text-amber-500 font-medium py-2">
            Por favor, crie pelo menos um cliente na aba correspondente antes de conectar a conta do Facebook.
          </p>
        ) : (
          <MetaConnectionSection clientId={firstClient.id} />
        )}
      </Card>

      {/* Bloco de Visualização por Cliente */}
      {clients && clients.length > 0 && (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Visualizar Dados do Analytics por Cliente
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione um cliente abaixo para visualizar o relatório e dados do GA4 dele.
            </p>
          </div>

          <div className="space-y-2 max-w-md">
            <Label>Cliente</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClientId && (
            <div className="border-t border-border pt-5">
              <GoogleAnalyticsPanel clientId={selectedClientId} datePreset="last_7d" />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function MembersSection() {
  const { data: members, isLoading } = useMembers();
  const invite = useInviteMember();
  const setRole = useSetMemberRole();
  const remove = useRemoveMember();
  const setPassword = useSetMemberPassword();
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor">("editor");
  const [pwdEditId, setPwdEditId] = useState<string | null>(null);
  const [pwdValue, setPwdValue] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Informe um email");
      return;
    }
    try {
      await invite.mutateAsync({ email: email.trim(), role: newRole });
      toast.success(`Convite enviado para ${email}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao convidar");
    }
  };

  const handleRoleChange = async (userId: string, role: "admin" | "editor") => {
    try {
      await setRole.mutateAsync({ userId, role });
      toast.success("Função atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar função");
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remover ${email}? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove.mutateAsync(userId);
      toast.success("Membro removido");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    }
  };

  const handleSavePassword = async (userId: string) => {
    if (pwdValue.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    try {
      await setPassword.mutateAsync({ userId, password: pwdValue });
      toast.success("Senha atualizada");
      setPwdEditId(null);
      setPwdValue("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar senha");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Convidar Novo Membro
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            O usuário receberá um email para definir sua senha e acessar o
            painel.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Função</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleInvite}
              disabled={invite.isPending}
              className="gap-1.5 w-full md:w-auto"
            >
              {invite.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Convidar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Membros Ativos ({members?.length || 0})
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Apenas usuários com função atribuída conseguem acessar o sistema.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !members?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum membro encontrado.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const currentRole = m.roles.includes("admin")
                ? "admin"
                : m.roles.includes("editor")
                ? "editor"
                : null;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg border border-border bg-background/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {currentRole ? (
                        <Badge
                          variant={currentRole === "admin" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {currentRole === "admin" ? "Administrador" : "Editor"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Sem função
                        </Badge>
                      )}
                      {m.last_sign_in_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Último acesso:{" "}
                          {new Date(m.last_sign_in_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={currentRole || ""}
                      onValueChange={(v) =>
                        handleRoleChange(m.id, v as "admin" | "editor")
                      }
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue placeholder="Atribuir..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    {pwdEditId === m.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          autoFocus
                          placeholder="Nova senha"
                          value={pwdValue}
                          onChange={(e) => setPwdValue(e.target.value)}
                          className="h-8 w-32 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleSavePassword(m.id)}
                          disabled={setPassword.isPending}
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setPwdEditId(null);
                            setPwdValue("");
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPwdEditId(m.id);
                          setPwdValue("");
                        }}
                        className="h-8 w-8"
                        title="Alterar senha"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(m.id, m.email)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PermissionsSection() {
  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-card-foreground">
          Níveis de Permissão
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resumo das ações permitidas para cada função do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Administrador</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Acesso total ao painel</li>
            <li>Gerenciar clientes (criar, editar, excluir)</li>
            <li>Conectar Google Analytics</li>
            <li>Convidar e remover membros</li>
            <li>Atribuir funções a outros usuários</li>
            <li>Acesso a esta tela de configurações</li>
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Editor</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Visualizar todos os dashboards</li>
            <li>Editar dados e anotações dos clientes</li>
            <li>Sincronizar planilhas e métricas</li>
            <li>Gerenciar criativos e funis</li>
            <li>
              <span className="text-destructive">Sem</span> acesso a configurações de membros ou Google Analytics
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Como funciona</p>
        <p>
          As funções são aplicadas via Row-Level Security (RLS) no banco de dados.
          Ações sensíveis (gestão de membros, conexão Google) usam Edge Functions
          que validam a função <code className="text-primary">admin</code> antes de executar.
        </p>
      </div>
    </Card>
  );
}

function ClientAccessSection() {
  const { data: clients } = useClients();
  const { data: items, isLoading } = useClientUsers();
  const create = useCreateClientUser();
  const setPwd = useSetClientUserPassword();
  const setEmail = useSetClientUserEmail();
  const setClient = useSetClientUserClient();
  const remove = useRemoveClientUser();
  const [email, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");

  const handleCreate = async () => {
    if (!email || !password || !clientId) {
      toast.error("Preencha email, senha e cliente");
      return;
    }
    try {
      await create.mutateAsync({ email, password, client_id: clientId });
      toast.success("Acesso criado");
      setEmailInput("");
      setPassword("");
      setClientId("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">Criar acesso de cliente</h2>
          <p className="text-sm text-muted-foreground mt-1">
            O cliente entra com email/senha e vê apenas o CRM e o dashboard dele (modo somente leitura).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_auto] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmailInput(e.target.value)} placeholder="cliente@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Senha (mín. 8)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="senha inicial" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(clients || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={create.isPending} className="gap-1.5">
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Criar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold">Acessos ativos ({items?.length || 0})</h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum acesso de cliente criado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 p-3 rounded-lg border border-border bg-background/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.last_sign_in_at ? `Último acesso: ${new Date(it.last_sign_in_at).toLocaleDateString("pt-BR")}` : "Nunca acessou"}
                  </p>
                </div>
                <Select value={it.client_id} onValueChange={(v) => setClient.mutate({ user_id: it.user_id, client_id: v }, {
                  onSuccess: () => toast.success("Cliente atualizado"),
                  onError: (e: any) => toast.error(e.message),
                })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(clients || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Trocar senha"
                    onClick={() => {
                      const p = prompt(`Nova senha para ${it.email} (mín. 8):`);
                      if (p && p.length >= 8) setPwd.mutate({ user_id: it.user_id, password: p }, {
                        onSuccess: () => toast.success("Senha atualizada"),
                        onError: (e: any) => toast.error(e.message),
                      });
                    }}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Trocar email"
                    onClick={() => {
                      const e2 = prompt(`Novo email para ${it.email}:`, it.email);
                      if (e2) setEmail.mutate({ user_id: it.user_id, email: e2 }, {
                        onSuccess: () => toast.success("Email atualizado"),
                        onError: (er: any) => toast.error(er.message),
                      });
                    }}>
                    <MailIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Remover acesso"
                    onClick={() => {
                      if (confirm(`Remover acesso de ${it.email}? Esta ação apaga o usuário.`)) {
                        remove.mutate(it.user_id, {
                          onSuccess: () => toast.success("Removido"),
                          onError: (e: any) => toast.error(e.message),
                        });
                      }
                    }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
