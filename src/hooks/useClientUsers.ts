import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
}

async function call(action: string, body: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("manage-client-users", {
    body: { action, ...body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useClientUsers(enabled = true) {
  return useQuery({
    queryKey: ["client-users"],
    enabled,
    queryFn: async () => {
      const data = await call("list");
      return (data?.items || []) as ClientUser[];
    },
  });
}

export function useCreateClientUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { email: string; password: string; client_id: string }) =>
      call("create", b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-users"] }),
  });
}

export function useSetClientUserPassword() {
  return useMutation({
    mutationFn: (b: { user_id: string; password: string }) => call("set_password", b),
  });
}

export function useSetClientUserEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { user_id: string; email: string }) => call("set_email", b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-users"] }),
  });
}

export function useSetClientUserClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { user_id: string; client_id: string }) => call("set_client", b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-users"] }),
  });
}

export function useRemoveClientUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => call("remove", { user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-users"] }),
  });
}