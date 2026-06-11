import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScorecardDeadline {
  title: string;
  timeframe: string;
}

export interface GestorScorecard {
  gestor_id: string;
  proatividade: number;
  comunicacao: number;
  trafego: number;
  traqueamento: number;
  analise_dados: number;
  comercial: number;
  copy: number;
  forces: string[];
  improvements: string[];
  courses: string[];
  deadlines: ScorecardDeadline[];
  updated_at?: string;
}

export function useGestorScorecards() {
  return useQuery({
    queryKey: ["gestor-scorecards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gestor_scorecard" as any)
        .select("*");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        gestor_id: row.gestor_id,
        proatividade: Number(row.proatividade ?? 8.0),
        comunicacao: Number(row.comunicacao ?? 8.0),
        trafego: Number(row.trafego ?? 8.0),
        traqueamento: Number(row.traqueamento ?? 8.0),
        analise_dados: Number(row.analise_dados ?? 8.0),
        comercial: Number(row.comercial ?? 8.0),
        copy: Number(row.copy ?? 8.0),
        forces: Array.isArray(row.forces) ? row.forces : [],
        improvements: Array.isArray(row.improvements) ? row.improvements : [],
        courses: Array.isArray(row.courses) ? row.courses : [],
        deadlines: Array.isArray(row.deadlines) ? row.deadlines : [],
        updated_at: row.updated_at,
      })) as unknown as GestorScorecard[];
    },
  });
}

export function useUpsertScorecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scorecard: Partial<GestorScorecard> & { gestor_id: string }) => {
      const { data, error } = await supabase
        .from("gestor_scorecard" as any)
        .upsert(scorecard, { onConflict: "gestor_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor-scorecards"] });
    },
  });
}
