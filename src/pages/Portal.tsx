import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useClientUserAccess } from "@/hooks/useClientUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useMyClientOrg } from "@/hooks/useClientCrm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Rota raiz para usuários do tipo 'client': leva direto para o CRM/Dashboard do cliente.
 */
export default function Portal() {
  const { signOut } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: clientId, isLoading } = useClientUserAccess();
  const { data: org, isLoading: orgLoading } = useMyClientOrg(clientId);

  if (roleLoading || isLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin/editor não usam o portal
  if (role?.isAdmin || role?.isEditor) return <Navigate to="/" replace />;

  if (!clientId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-6 max-w-md text-center space-y-3">
          <h1 className="text-lg font-bold">Acesso pendente</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ainda não está vinculada a um cliente. Entre em contato com o administrador.
          </p>
          <Button onClick={() => signOut()} variant="outline" size="sm">Sair</Button>
        </Card>
      </div>
    );
  }

  // Se cliente tem CRM novo ativo, manda pra lá. Caso contrário, mantém o CRM antigo.
  if (org?.id) return <Navigate to={`/crm-app?org=${org.id}`} replace />;
  return <Navigate to="/crm" replace />;
}