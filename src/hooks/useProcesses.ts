import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import defaultProcesses from "./default_processes.json";

export interface ProcessCard {
  id: string;
  name: string;
  column_name: "PRE_VENDA" | "CLIENTE_ATIVO" | "CONTROLE";
  icon_type: "logo" | "cyclone" | "stop" | "cross";
  content?: any;
  order_index: number;
}

const DEFAULT_PROCESSES: ProcessCard[] = defaultProcesses as ProcessCard[];

const isMissingTableError = (error: any) => {
  const msg = (error?.message || "").toLowerCase();
  const hint = (error?.hint || "").toLowerCase();
  const details = (error?.details || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    hint.includes("table") ||
    details.includes("table")
  );
};

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
  } catch (e) {
    console.error("Local storage write error:", e);
  }
};

const shouldReplaceWithDefault = (currentContent: any, defaultContent: any) => {
  if (!defaultContent || !Array.isArray(defaultContent) || defaultContent.length <= 1) return false;
  
  const currentStr = JSON.stringify(currentContent || "");
  const defaultStr = JSON.stringify(defaultContent);
  
  // If current is empty or a placeholder
  const isPlaceholder = 
    !currentContent || 
    !Array.isArray(currentContent) || 
    currentContent.length === 0 || 
    currentStr.includes("Espaço destinado") || 
    currentStr.includes("Escreva aqui") || 
    currentStr.includes("descrição detalhada deste processo") ||
    currentStr.length < 200;
    
  const isDefaultRicher = defaultStr.length > currentStr.length && defaultStr.length > 200;
  
  return isPlaceholder && isDefaultRicher;
};

export function useProcesses() {
  return useQuery({
    queryKey: ["agency-processes"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("agency_processes" as any)
          .select("*")
          .order("order_index", { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          // Attempt to insert default values if database is empty
          await supabase.from("agency_processes" as any).insert(DEFAULT_PROCESSES);
          return DEFAULT_PROCESSES;
        }

        // Check if any process has placeholder/short content and needs to be updated with the rich parsed content
        const toUpdate: ProcessCard[] = [];
        const merged = data.map((item: any) => {
          const defaultItem = DEFAULT_PROCESSES.find(d => d.id === item.id || d.name === item.name);
          if (defaultItem && shouldReplaceWithDefault(item.content, defaultItem.content)) {
            const updatedItem = { ...item, content: defaultItem.content };
            toUpdate.push(updatedItem);
            return updatedItem;
          }
          return item;
        });

        if (toUpdate.length > 0) {
          // Upsert in background
          Promise.all(
            toUpdate.map(item => 
              supabase.from("agency_processes" as any).upsert(item, { onConflict: "id" })
            )
          ).catch(err => console.error("Error seeding rich content:", err));
        }
        
        return merged as ProcessCard[];
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const localData = getLocal<ProcessCard[]>("agency-processes-local", DEFAULT_PROCESSES);
          let updated = false;
          const merged = localData.map((item: any) => {
            const defaultItem = DEFAULT_PROCESSES.find(d => d.id === item.id || d.name === item.name);
            if (defaultItem && shouldReplaceWithDefault(item.content, defaultItem.content)) {
              updated = true;
              return { ...item, content: defaultItem.content };
            }
            return item;
          });
          if (updated) {
            setLocal("agency-processes-local", merged);
          }
          return merged;
        }
        throw err;
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useUpsertProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: Partial<ProcessCard> & { id: string }) => {
      try {
        const { error } = await supabase
          .from("agency_processes" as any)
          .upsert(card, { onConflict: "id" });
        if (error) throw error;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<ProcessCard[]>("agency-processes-local", DEFAULT_PROCESSES);
          const idx = list.findIndex(c => c.id === card.id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...card } as ProcessCard;
          } else {
            list.push(card as ProcessCard);
          }
          setLocal("agency-processes-local", list);
          return;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-processes"] });
    },
  });
}

export function useDeleteProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("agency_processes" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        if (isMissingTableError(err)) {
          const list = getLocal<ProcessCard[]>("agency-processes-local", DEFAULT_PROCESSES);
          const updated = list.filter(c => c.id !== id);
          setLocal("agency-processes-local", updated);
          return;
        }
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-processes"] });
    },
  });
}
