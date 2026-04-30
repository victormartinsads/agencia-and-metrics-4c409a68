import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Wrap em rotas internas: se o usuário for apenas 'client', redireciona pro portal.
 */
export default function ClientPortalRouter({ children }: { children: React.ReactNode }) {
  const { data: role, isLoading } = useUserRole();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (role?.isClient && !role?.isAdmin && !role?.isEditor) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}