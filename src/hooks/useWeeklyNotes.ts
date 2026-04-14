import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useWeeklyNotes(clientId: string, datePreset: string) {
  const [whatWeDid, setWhatWeDid] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("weekly_notes")
      .select("*")
      .eq("client_id", clientId)
      .eq("date_preset", datePreset)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWhatWeDid(data.what_we_did || "");
          setNextActions(data.next_actions || "");
        } else {
          setWhatWeDid("");
          setNextActions("");
        }
      });
  }, [clientId, datePreset]);

  const save = useCallback(async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("weekly_notes")
        .select("id")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("weekly_notes")
          .update({ what_we_did: whatWeDid, next_actions: nextActions })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("weekly_notes")
          .insert({ client_id: clientId, date_preset: datePreset, what_we_did: whatWeDid, next_actions: nextActions });
      }
      toast.success("Notas salvas!");
    } catch (e) {
      toast.error("Erro ao salvar notas");
    } finally {
      setSaving(false);
    }
  }, [clientId, datePreset, whatWeDid, nextActions]);

  return { whatWeDid, setWhatWeDid, nextActions, setNextActions, save, saving };
}
