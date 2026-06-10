import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import GestorOverview from "./GestorOverview";

export default function Home() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se for Gestor, exibe a visão do Gestor na Home
  if (role?.isGestor) {
    return <GestorOverview isHomePage={true} />;
  }

  // Para Admin, CEO, Diretor (e outros), redireciona por enquanto para a listagem geral de clientes (/clients)
  // Futuramente, outras visões de dashboard específicas de Home podem ser implementadas aqui.
  return <Navigate to="/clients" replace />;
}
