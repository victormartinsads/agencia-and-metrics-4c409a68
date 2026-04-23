import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "editor";

export function useUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      const roles = (data || []).map((r) => r.role as AppRole);
      return {
        roles,
        isAdmin: roles.includes("admin"),
        isEditor: roles.includes("editor") || roles.includes("admin"),
      };
    },
    enabled: !!user,
  });
}
