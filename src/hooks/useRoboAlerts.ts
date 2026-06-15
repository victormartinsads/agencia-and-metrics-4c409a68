import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClients, Client } from "./useClients";

export interface OptimizationSuggestion {
  id: string;
  client_id: string;
  level: string;
  object_id: string;
  object_name: string;
  action: string;
  suggested_value: number | null;
  reason: string;
  severity: string;
  metadata: any;
  status: string;
  created_at: string;
  client?: {
    name: string;
  };
}

// Hook para buscar os clientes atribuídos ao gestor logado
export function useMyAssignedClients() {
  const { user } = useAuth();
  const { data: allClients, isLoading: loadingClients } = useClients();

  return useQuery({
    queryKey: ["my-assigned-clients", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Verifica se é admin (admin vê tudo)
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");

      if (isAdmin && allClients) {
        return allClients;
      }

      // Se não for admin, pega as atribuições
      const { data: assignments } = await supabase
        .from("client_assignments")
        .select("client_id")
        .eq("user_id", user.id);

      if (!assignments || assignments.length === 0) return [];

      const assignedIds = assignments.map((a) => a.client_id);
      return allClients?.filter((c) => assignedIds.includes(c.id)) || [];
    },
    enabled: !!user && !loadingClients,
  });
}

// Hook para buscar os alertas (sugestões pendentes)
export function useRoboAlerts() {
  const { data: clients } = useMyAssignedClients();
  const clientIds = clients?.map((c) => c.id) || [];

  return useQuery({
    queryKey: ["robo-alerts", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];

      const { data, error } = await supabase
        .from("optimization_suggestions")
        .select(`*, client:clients(name)`)
        .in("client_id", clientIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OptimizationSuggestion[];
    },
    enabled: clientIds.length > 0,
  });
}

// Hook para forçar a geração de novos alertas rodando a Edge Function (versão AI)
export function useGenerateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      const promises = clientIds.map(clientId => 
        supabase.functions.invoke("meta-optimization-suggestions", {
          body: { clientId, datePreset: "last_7d" }
        })
      );
      
      const results = await Promise.allSettled(promises);
      const errors = results.filter(r => r.status === "rejected");
      if (errors.length > 0) {
        console.error("Some alerts generation failed:", errors);
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["robo-alerts"] });
    }
  });
}

// Hook para aplicar ou rejeitar um alerta
export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alert, resolution }: { alert: OptimizationSuggestion; resolution: "applied" | "rejected" }) => {
      // Se for "applied" e a ação for "pause", chama a API do Meta
      if (resolution === "applied") {
        let metaAction = alert.action;
        let value = alert.suggested_value || undefined;

        // Mapeamento de ações da sugestão para a ação da API
        if (alert.action === "pause") metaAction = "pause";
        // Por enquanto suportamos apenas PAUSE de forma 100% automatizada sem pedir input adicional
        // Se for increase_budget, precisaria do budget atual, então podemos apenas aprovar no UI
        
        if (metaAction === "pause") {
          const { error: invokeErr } = await supabase.functions.invoke("meta-ads-action", {
            body: {
              clientId: alert.client_id,
              level: alert.level,
              objectId: alert.object_id,
              action: metaAction,
            }
          });
          if (invokeErr) {
            console.error("Meta API error:", invokeErr);
            throw new Error("Erro ao executar ação na Meta: " + invokeErr.message);
          }
        }
      }

      // Atualiza o status no banco local
      const { error } = await supabase
        .from("optimization_suggestions")
        .update({ status: resolution, applied_at: resolution === "applied" ? new Date().toISOString() : null })
        .eq("id", alert.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["robo-alerts"] });
    }
  });
}
