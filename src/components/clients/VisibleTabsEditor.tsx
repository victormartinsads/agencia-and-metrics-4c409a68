import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye } from "lucide-react";

const ALL = [
  { key: "overview", label: "Visão Geral" },
  { key: "diagnostico", label: "Como Estamos" },
  { key: "funnel", label: "Análise de Funis" },
  { key: "spreadsheet", label: "Planilha de Métricas" },
  { key: "creatives", label: "Pódio de Criativos" },
  { key: "branding", label: "Distribuição" },
  { key: "analytics", label: "Analytics" },
  { key: "google-ads", label: "Google Ads" },
];

export function VisibleTabsEditor({ clientId }: { clientId: string }) {
  const [tabs, setTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("visible_tabs")
        .eq("id", clientId)
        .maybeSingle();
      setTabs(((data as any)?.visible_tabs as string[]) || ["overview", "funnel", "spreadsheet", "creatives", "branding"]);
      setLoading(false);
    })();
  }, [clientId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("clients").update({ visible_tabs: tabs }).eq("id", clientId);
    setSaving(false);
    if (error) toast.error("Erro ao salvar"); else toast.success("Abas atualizadas");
  };

  if (loading) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
        <Eye className="h-3 w-3" /> Abas visíveis no link público
      </p>
      <div className="grid sm:grid-cols-3 gap-1">
        {ALL.map((t) => {
          const checked = tabs.includes(t.key);
          return (
            <label key={t.key} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/40 cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) =>
                  setTabs((prev) => (v ? [...prev, t.key] : prev.filter((k) => k !== t.key)))
                }
              />
              {t.label}
            </label>
          );
        })}
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={saving}>
        {saving ? "Salvando…" : "Salvar abas"}
      </Button>
    </div>
  );
}