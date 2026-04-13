import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientId: string;
  datePreset: string;
}

export function ManagerNotes({ clientId, datePreset }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("funnel_notes" as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset)
        .maybeSingle();

      if (data) setContent((data as any).content || "");
      setLoaded(true);
    };
    load();
  }, [clientId, datePreset]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("funnel_notes" as any)
        .upsert({
          client_id: clientId,
          date_preset: datePreset,
          content,
        } as any, { onConflict: "client_id,date_preset" } as any);

      if (error) throw error;
      toast.success("Notas salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar notas");
    } finally {
      setSaving(false);
    }
  }, [clientId, datePreset, content]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notas do Gestor
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">Comentários personalizados para o cliente</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>
      <div className="p-5">
        {loaded ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva aqui suas observações, insights e recomendações personalizadas para o cliente..."
            className="min-h-[120px] text-sm"
          />
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
