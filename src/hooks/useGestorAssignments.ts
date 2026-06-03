import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useGestorAssignments(gestorId: string) {
  return useQuery({
    queryKey: ["gestor-assignments", gestorId],
    queryFn: async () => {
      if (!gestorId) return [];
      const { data, error } = await (supabase as any)
        .from("client_assignments")
        .select("client_id, clients(name, slug)")
        .eq("user_id", gestorId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        client_id: d.client_id,
        client_name: d.clients?.name || "Cliente Desconhecido",
        client_slug: d.clients?.slug || d.client_id,
      }));
    },
    enabled: !!gestorId,
  });
}
