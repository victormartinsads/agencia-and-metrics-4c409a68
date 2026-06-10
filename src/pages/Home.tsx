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

  // Se for Diretor, CEO ou Admin, exibe a visão do Diretor na Home
  if (isDiretor || isCeo || isAdmin) {
    return <DiretorOverview />;
  }

  return <Navigate to="/clients" replace />;
}

