import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessCard {
  id: string;
  name: string;
  column_name: "PRE_VENDA" | "CLIENTE_ATIVO" | "CONTROLE";
  icon_type: "logo" | "cyclone" | "stop" | "cross";
  content?: any;
  order_index: number;
}

const DEFAULT_PROCESSES: ProcessCard[] = [
  // PRÉ VENDA (18 items)
  { id: "p1", name: "PROSPECÇÃO", column_name: "PRE_VENDA", icon_type: "logo", order_index: 0 },
  { id: "p2", name: "VENDA", column_name: "PRE_VENDA", icon_type: "logo", order_index: 1 },
  { id: "p3", name: "DESTAQUES", column_name: "PRE_VENDA", icon_type: "logo", order_index: 2 },
  { id: "p4", name: "CONTEÚDOS AND", column_name: "PRE_VENDA", icon_type: "logo", order_index: 3 },
  { id: "p5", name: "PERGUNTAS", column_name: "PRE_VENDA", icon_type: "logo", order_index: 4 },
  { id: "p6", name: "FOLLOW-UP", column_name: "PRE_VENDA", icon_type: "logo", order_index: 5 },
  { id: "p7", name: "METAS", column_name: "PRE_VENDA", icon_type: "logo", order_index: 6 },
  { id: "p8", name: "SOCIAL SELLING (ATT)", column_name: "PRE_VENDA", icon_type: "logo", order_index: 7 },
  { id: "p9", name: "ESTUDO", column_name: "PRE_VENDA", icon_type: "logo", order_index: 8 },
  { id: "p10", name: "ISCA - BSC", column_name: "PRE_VENDA", icon_type: "logo", order_index: 9 },
  { id: "p11", name: "FERRAMENTAS - AND", column_name: "PRE_VENDA", icon_type: "logo", order_index: 10 },
  { id: "p12", name: "DASHBOARD (MANUS)", column_name: "PRE_VENDA", icon_type: "cyclone", order_index: 11 },
  { id: "p13", name: "PROJETO - ALEXANDRE DE ALMEIDA", column_name: "PRE_VENDA", icon_type: "stop", order_index: 12 },
  { id: "p14", name: "MENTORIA A ESCALADA", column_name: "PRE_VENDA", icon_type: "stop", order_index: 13 },
  { id: "p15", name: "EDUCACIONAL", column_name: "PRE_VENDA", icon_type: "stop", order_index: 14 },
  { id: "p16", name: "CLIN LEADS", column_name: "PRE_VENDA", icon_type: "stop", order_index: 15 },
  { id: "p17", name: "PROCESSOS ROITAND", column_name: "PRE_VENDA", icon_type: "stop", order_index: 16 },
  { id: "p18", name: "GESTÃO ROITAND (PARCEIROS)", column_name: "PRE_VENDA", icon_type: "stop", order_index: 17 },

  // CLIENTE ATIVO (19 items)
  { id: "c1", name: "ONBOARDING", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 18 },
  { id: "c2", name: "REUNIÃO INTERNA", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 19 },
  { id: "c3", name: "REUNIÃO DE CONTEÚDOS", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 20 },
  { id: "c4", name: "ESTRUTURA DE TESTES", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 21 },
  { id: "c5", name: "REUNIÕES DE METAS E PROCESSOS", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 22 },
  { id: "c6", name: "TRILHA SEMANAL", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 23 },
  { id: "c7", name: "PÓDIO DE CRIATIVOS", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 24 },
  { id: "c8", name: "BLACK FRIDAY AND", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 25 },
  { id: "c9", name: "COMERCIAL", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 26 },
  { id: "c10", name: "PLANEJAMENTO ANUAL", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 27 },
  { id: "c11", name: "BIBLIOTECA DE PÁGINAS POR FUNIL", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 28 },
  { id: "c12", name: "BIBLIOTECA DE GANCHOS E FORMATOS CRIATIVOS", column_name: "CLIENTE_ATIVO", icon_type: "logo", order_index: 29 },
  { id: "c13", name: "DIAGNÓSTICO", column_name: "CLIENTE_ATIVO", icon_type: "cyclone", order_index: 30 },
  { id: "c14", name: "GUIA DE CRIATIVOS", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 31 },
  { id: "c15", name: "GESTÃO DE PERFORMANCE", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 32 },
  { id: "c16", name: "RELATÓRIOS", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 33 },
  { id: "c17", name: "REUNIÃO DE ALINHAMENTO COM CLIENTE", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 34 },
  { id: "c18", name: "FUNIS UTILIZADOS", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 35 },
  { id: "c19", name: "ALINHAMENTO COMERCIAL", column_name: "CLIENTE_ATIVO", icon_type: "cross", order_index: 36 },

  // CONTROLE (12 items)
  { id: "t1", name: "PROCESSO SELETIVO", column_name: "CONTROLE", icon_type: "logo", order_index: 37 },
  { id: "t2", name: "CONTABILIDADE - NFE", column_name: "CONTROLE", icon_type: "logo", order_index: 38 },
  { id: "t3", name: "ESTUDOS", column_name: "CONTROLE", icon_type: "logo", order_index: 39 },
  { id: "t4", name: "BONIFICAÇÃO", column_name: "CONTROLE", icon_type: "logo", order_index: 40 },
  { id: "t5", name: "BASE DE CRIATIVOS (EM ESTRUTURAÇÃO)", column_name: "CONTROLE", icon_type: "logo", order_index: 41 },
  { id: "t6", name: "ACESSOS - CURSOS/MENTORIAS", column_name: "CONTROLE", icon_type: "logo", order_index: 42 },
  { id: "t7", name: "DRE", column_name: "CONTROLE", icon_type: "logo", order_index: 43 },
  { id: "t8", name: "TRACKEAMENTO", column_name: "CONTROLE", icon_type: "cyclone", order_index: 44 },
  { id: "t9", name: "AUTOMAÇÃO", column_name: "CONTROLE", icon_type: "cyclone", order_index: 45 },
  { id: "t10", name: "CARGOS", column_name: "CONTROLE", icon_type: "cross", order_index: 46 },
  { id: "t11", name: "TREINAMENTO", column_name: "CONTROLE", icon_type: "cross", order_index: 47 },
  { id: "t12", name: "ENVIO EM MASSA (PAUSADO)", column_name: "CONTROLE", icon_type: "stop", order_index: 48 },
];

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
        
        return data as ProcessCard[];
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
