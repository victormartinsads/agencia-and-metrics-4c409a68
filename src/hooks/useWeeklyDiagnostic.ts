import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DiagnosticBlocks {
  positives: string;
  negatives: string;
  manager_actions: string;
  client_requests: string;
}

const EMPTY: DiagnosticBlocks = {
  positives: "",
  negatives: "",
  manager_actions: "",
  client_requests: "",
};

/**
 * Carrega/persiste o diagnóstico semanal (4 blocos editáveis) por cliente+período.
 * Auto-save com debounce de 1.2s após edição.
 */
export function useWeeklyDiagnostic(clientId: string, datePreset: string) {
  const [blocks, setBlocks] = useState<DiagnosticBlocks>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  // Carrega
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    dirtyRef.current = false;
    supabase
      .from("weekly_diagnostics")
      .select("*")
      .eq("client_id", clientId)
      .eq("date_preset", datePreset)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBlocks({
            positives: data.positives || "",
            negatives: data.negatives || "",
            manager_actions: data.manager_actions || "",
            client_requests: data.client_requests || "",
          });
        } else {
          setBlocks(EMPTY);
        }
        setLoading(false);
      });
  }, [clientId, datePreset]);

  const persist = useCallback(async (next: DiagnosticBlocks) => {
    if (!clientId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("weekly_diagnostics")
        .select("id")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset)
        .maybeSingle();

      if (existing) {
        await supabase.from("weekly_diagnostics").update(next).eq("id", existing.id);
      } else {
        await supabase
          .from("weekly_diagnostics")
          .insert({ client_id: clientId, date_preset: datePreset, ...next });
      }
      dirtyRef.current = false;
    } catch (e) {
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSaving(false);
    }
  }, [clientId, datePreset]);

  const updateBlock = useCallback((key: keyof DiagnosticBlocks, value: string) => {
    setBlocks(prev => {
      const next = { ...prev, [key]: value };
      dirtyRef.current = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => { persist(next); }, 1200);
      return next;
    });
  }, [persist]);

  const saveNow = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    return persist(blocks);
  }, [blocks, persist]);

  const generateWithAI = useCallback(async (summary: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-diagnostic", {
        body: { summary },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const next: DiagnosticBlocks = {
        positives: data.positives || "",
        negatives: data.negatives || "",
        manager_actions: data.manager_actions || "",
        client_requests: data.client_requests || "",
      };
      setBlocks(next);
      await persist(next);
      toast.success("Diagnóstico gerado!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar diagnóstico");
    } finally {
      setGenerating(false);
    }
  }, [persist]);

  return { blocks, updateBlock, saveNow, saving, loading, generating, generateWithAI };
}
