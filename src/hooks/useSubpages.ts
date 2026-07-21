import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subpage {
  id: string;
  title: string;
  parent_process_id?: string | null;
  content?: any;
  created_at?: string;
  updated_at?: string;
}

const isMissingTableError = (error: any) => {
  const msg = (error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache")
  );
};

const LOCAL_KEY = "notion-subpages-local";

const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// Fetch single subpage by ID
export function useSubpage(id: string | undefined) {
  return useQuery({
    queryKey: ["subpage", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      try {
        const { data, error } = await supabase
          .from("notion_subpages" as any)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data as Subpage | null;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const all = getLocal<Subpage[]>(LOCAL_KEY, []);
          return all.find((p) => p.id === id) || null;
        }
        throw err;
      }
    },
    staleTime: 30 * 1000,
  });
}

// List all subpages
export function useSubpages() {
  return useQuery({
    queryKey: ["subpages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("notion_subpages" as any)
          .select("id, title, parent_process_id, created_at")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []) as Subpage[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return getLocal<Subpage[]>(LOCAL_KEY, []);
        }
        throw err;
      }
    },
    staleTime: 60 * 1000,
  });
}

// Upsert (create or update) a subpage
export function useUpsertSubpage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: Subpage) => {
      try {
        const { error } = await supabase
          .from("notion_subpages" as any)
          .upsert(page, { onConflict: "id" });
        if (error) throw error;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const all = getLocal<Subpage[]>(LOCAL_KEY, []);
          const idx = all.findIndex((p) => p.id === page.id);
          if (idx !== -1) all[idx] = page;
          else all.push(page);
          setLocal(LOCAL_KEY, all);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["subpage", vars.id] });
      qc.invalidateQueries({ queryKey: ["subpages"] });
    },
  });
}

// Delete a subpage
export function useDeleteSubpage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("notion_subpages" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const all = getLocal<Subpage[]>(LOCAL_KEY, []);
          setLocal(LOCAL_KEY, all.filter((p) => p.id !== id));
          return;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subpages"] });
    },
  });
}
