import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="min-h-screen bg-background flex flex-col p-6 gap-6">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 mt-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />
          ))}
        </div>
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

