import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-diagnostics";

export interface DiagnosticBlock {
  score: number;
  text: string;
  suggestion: string;
}

export interface FunnelDiagnosticData {
  health_score: number;
  curve_data: {
    hook_rate: number;
    hold_rate: number;
    ctr_link: number;
    cost_per_play: number;
    avgVideoTime?: number;
  };
  diagnostics: {
    criativos: DiagnosticBlock;
    publico: DiagnosticBlock;
    conversao_lp: DiagnosticBlock;
    checkouts: DiagnosticBlock;
    custos: DiagnosticBlock;
    oferta: DiagnosticBlock;
  };
}

export const DEFAULT_DIAGNOSTICS: FunnelDiagnosticData = {
  health_score: 7.5,
  curve_data: {
    hook_rate: 94.5,
    hold_rate: 17.5,
    ctr_link: 2.74,
    cost_per_play: 0.05,
    avgVideoTime: 5.4,
  },
  diagnostics: {
    criativos: {
      score: 0,
      text: "Sem diagnóstico de criativos salvo. Clique para avaliar.",
      suggestion: "",
    },
    publico: {
      score: 0,
      text: "Sem diagnóstico de público alvo salvo. Clique para avaliar.",
      suggestion: "",
    },
    conversao_lp: {
      score: 0,
      text: "Sem diagnóstico de conversão de LP salvo. Clique para avaliar.",
      suggestion: "",
    },
    checkouts: {
      score: 0,
      text: "Sem diagnóstico de checkout salvo. Clique para avaliar.",
      suggestion: "",
    },
    custos: {
      score: 0,
      text: "Sem diagnóstico de custos salvo. Clique para avaliar.",
      suggestion: "",
    },
    oferta: {
      score: 0,
      text: "Sem diagnóstico de oferta salvo. Clique para avaliar.",
      suggestion: "",
    },
  },
};

export function useFunnelDiagnostics(clientId: string | undefined, funnelCode: string | undefined) {
  return useQuery({
    queryKey: [KEY, clientId, funnelCode],
    enabled: !!clientId && !!funnelCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_diagnostics")
        .select("*")
        .eq("client_id", clientId!)
        .eq("funnel_code", funnelCode!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_DIAGNOSTICS;

      return {
        health_score: Number(data.health_score ?? DEFAULT_DIAGNOSTICS.health_score),
        curve_data: (data.curve_data as any) || DEFAULT_DIAGNOSTICS.curve_data,
        diagnostics: (data.diagnostics as any) || DEFAULT_DIAGNOSTICS.diagnostics,
      } as FunnelDiagnosticData;
    },
  });
}

export function useSaveFunnelDiagnostics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      patch,
    }: {
      clientId: string;
      funnelCode: string;
      patch: Partial<FunnelDiagnosticData>;
    }) => {
      // Fetch current database state or fallback
      const { data: existing } = await supabase
        .from("funnel_diagnostics")
        .select("*")
        .eq("client_id", clientId)
        .eq("funnel_code", funnelCode)
        .maybeSingle();

      const nextPayload = {
        client_id: clientId,
        funnel_code: funnelCode,
        health_score: patch.health_score !== undefined ? patch.health_score : (existing?.health_score ?? DEFAULT_DIAGNOSTICS.health_score),
        curve_data: (patch.curve_data !== undefined ? patch.curve_data : (existing?.curve_data ?? DEFAULT_DIAGNOSTICS.curve_data)) as any,
        diagnostics: (patch.diagnostics !== undefined ? patch.diagnostics : (existing?.diagnostics ?? DEFAULT_DIAGNOSTICS.diagnostics)) as any,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("funnel_diagnostics")
        .upsert(nextPayload, { onConflict: "client_id,funnel_code" });

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId, vars.funnelCode] });
    },
  });
}
