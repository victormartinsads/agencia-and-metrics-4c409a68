import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Member {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: ("admin" | "editor")[];
}

export function useMembers(enabled = true) {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.members || []) as Member[];
    },
    enabled,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: "admin" | "editor" }) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "invite", email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "editor" }) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "set_role", userId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "remove", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}
