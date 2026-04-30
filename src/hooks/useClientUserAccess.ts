import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Para usuários com role 'client', retorna o client_id ao qual ele tem acesso.
 */
export function useClientUserAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-user-access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_users")
        .select("client_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.client_id as string | null) || null;
    },
  });
}