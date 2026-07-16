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
          if (defaultItem) {
            const dbContentStr = JSON.stringify(item.content || "");
            const defContentStr = JSON.stringify(defaultItem.content || "");
            
            // Check if db content is a placeholder (short description or empty space)
            const isPlaceholder = 
              dbContentStr.includes("Espaço destinado") || 
              dbContentStr.includes("Escreva aqui a descrição") || 
              !item.content || 
              item.content.length <= 2;
              
            const hasRicherDefault = 
              defaultItem.content && 
              defaultItem.content.length > 2 && 
              defContentStr.length > dbContentStr.length;

            if (isPlaceholder && hasRicherDefault) {
              const updatedItem = { ...item, content: defaultItem.content };
              toUpdate.push(updatedItem);
              return updatedItem;
            }
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
          return getLocal<ProcessCard[]>("agency-processes-local", DEFAULT_PROCESSES);
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
