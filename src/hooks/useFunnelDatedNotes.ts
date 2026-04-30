import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelDatedNote {
  id: string;
  client_id: string;
  funnel_code: string;
  note_date: string;
  content: string;
  author: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = "funnel-dated-notes";

export function useFunnelDatedNotes(clientId?: string, funnelCode?: string) {
  return useQuery({
    queryKey: [KEY, clientId, funnelCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_dated_notes")
        .select("*")
        .eq("client_id", clientId!)
        .eq("funnel_code", funnelCode!)
        .order("note_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FunnelDatedNote[];
    },
    enabled: !!clientId && !!funnelCode,
  });
}

export function useAddFunnelDatedNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      clientId: string;
      funnelCode: string;
      content: string;
      noteDate?: string;
      author?: string;
    }) => {
      const { error } = await supabase.from("funnel_dated_notes").insert({
        client_id: vars.clientId,
        funnel_code: vars.funnelCode,
        content: vars.content,
        note_date: vars.noteDate || new Date().toISOString().slice(0, 10),
        author: vars.author || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId, vars.funnelCode] });
    },
  });
}

export function useDeleteFunnelDatedNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; clientId: string; funnelCode: string }) => {
      const { error } = await supabase.from("funnel_dated_notes").delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId, vars.funnelCode] });
    },
  });
}