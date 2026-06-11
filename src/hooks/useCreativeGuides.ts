import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreativeGuide {
  id: string;
  client_id: string;
  title: string;
  status: "planning" | "writing" | "producing" | "done" | "approved";
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreativeGuides() {
  return useQuery({
    queryKey: ["client-creative-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_creative_guides" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CreativeGuide[];
    },
  });
}

export function useCreateCreativeGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guide: { client_id: string; title: string; status: string; due_date?: string | null; notes?: string | null }) => {
      const { data, error } = await supabase
        .from("client_creative_guides" as any)
        .insert(guide)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-creative-guides"] });
    },
  });
}

export function useUpdateCreativeGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreativeGuide> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_creative_guides" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-creative-guides"] });
    },
  });
}

export function useDeleteCreativeGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_creative_guides" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-creative-guides"] });
    },
  });
}
