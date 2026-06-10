import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffMemberRole, useStaffRoles } from "@/hooks/useGestorDiary";
import { useAuth } from "@/contexts/AuthContext";
import GestorOverview from "./GestorOverview";
import DiretorOverview from "./DiretorOverview";

export default function Home() {
  const { user } = useAuth();
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const { isLoading: isLoadingStaff } = useStaffRoles();
  const {
    isGestor,
    isDiretor,
    isCeo,
    isAdmin,
  } = useStaffMemberRole(user?.id);

  if (isLoadingRole || isLoadingStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se for Gestor, exibe a visão do Gestor na Home
  if (isGestor) {
    return <GestorOverview isHomePage={true} />;
  }

  // Se for Diretor ou CEO, exibe a visão do Diretor na Home
  if (isDiretor || isCeo) {
    return <DiretorOverview />;
  }

  // Se for Admin, redireciona para a listagem geral de clientes (/clients)
  if (isAdmin) {
    return <Navigate to="/clients" replace />;
  }

  return <Navigate to="/clients" replace />;
}

