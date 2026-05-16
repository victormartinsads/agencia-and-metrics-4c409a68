import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientTask {
  id: string;
  client_id: string;
  content: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientTasks(clientId?: string) {
  return useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      if (!clientId) return [] as ClientTask[];
      const { data, error } = await supabase
        .from("client_tasks" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientTask[];
    },
    enabled: !!clientId,
  });
}

export function useClientTasksCount(clientId?: string) {
  return useQuery({
    queryKey: ["client-tasks-count", clientId],
    queryFn: async () => {
      if (!clientId) return { open: 0, total: 0 };
      const { data, error } = await supabase
        .from("client_tasks" as any)
        .select("completed")
        .eq("client_id", clientId);
      if (error) throw error;
      const total = (data || []).length;
      const open = (data || []).filter((r: any) => !r.completed).length;
      return { open, total };
    },
    enabled: !!clientId,
  });
}

export function useCreateClientTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, content }: { clientId: string; content: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("client_tasks" as any)
        .insert({ client_id: clientId, content, created_by: u.user?.id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["client-tasks", v.clientId] });
      qc.invalidateQueries({ queryKey: ["client-tasks-count", v.clientId] });
    },
  });
}

export function useUpdateClientTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, completed }: { id: string; content?: string; completed?: boolean }) => {
      const patch: any = {};
      if (content !== undefined) patch.content = content;
      if (completed !== undefined) {
        patch.completed = completed;
        patch.completed_at = completed ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from("client_tasks" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tasks"] });
      qc.invalidateQueries({ queryKey: ["client-tasks-count"] });
    },
  });
}

export function useDeleteClientTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_tasks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tasks"] });
      qc.invalidateQueries({ queryKey: ["client-tasks-count"] });
    },
  });
}