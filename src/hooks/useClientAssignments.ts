import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface ClientAssignment {
  id: string;
  user_id: string;
  client_id: string;
  is_favorite: boolean;
  assigned_by: string | null;
  created_at: string;
}

/** Returns the set of client_ids the current user has favorited / been assigned. */
export function useMyAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [] as ClientAssignment[];
      const { data, error } = await (supabase as any)
        .from("client_assignments")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as ClientAssignment[];
    },
    enabled: !!user,
  });
}

export function useToggleAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ clientId, assigned }: { clientId: string; assigned: boolean }) => {
      if (!user) throw new Error("Não autenticado");
      if (assigned) {
        const { error } = await (supabase as any)
          .from("client_assignments")
          .insert({ user_id: user.id, client_id: clientId, is_favorite: true });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("client_assignments")
          .delete()
          .eq("user_id", user.id)
          .eq("client_id", clientId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-assignments"] }),
  });
}