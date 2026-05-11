import { Sparkles, Check, X, Loader2, RefreshCw, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSuggestions, useGenerateSuggestions, useApplySuggestion, useRejectSuggestion } from "@/hooks/useGestorAlerts";
import { toast } from "sonner";

const SEVERITY_COLOR: Record<string, string> = {
  high: "text-red-400 border-red-500/40 bg-red-500/10",
  medium: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  low: "text-muted-foreground border-border bg-muted/30",
};

export function SuggestionsList({ clientId, period }: { clientId: string; period: string }) {
  const { data: suggestions, isLoading } = useSuggestions(clientId);
  const gen = useGenerateSuggestions();
  const apply = useApplySuggestion();
  const reject = useRejectSuggestion();

  const pending = (suggestions || []).filter((s) => s.status === "pending");
  const past = (suggestions || []).filter((s) => s.status !== "pending").slice(0, 5);

  const handleGenerate = async () => {
    try {
      await gen.mutateAsync({ clientId, datePreset: period });
      toast.success("Sugestões geradas");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar sugestões");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Sugestões de Otimização</h2>
          <Badge variant={pending.length > 0 ? "destructive" : "outline"} className="text-[10px]">
            {pending.length} pendente{pending.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Analisar agora
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : !suggestions?.length ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma sugestão ainda. Clique em <strong>Analisar agora</strong> para a IA examinar suas campanhas.
        </p>
      ) : (
        <div className="space-y-2">
          {pending.map((s) => (
            <div key={s.id} className={`rounded-lg border p-3 ${SEVERITY_COLOR[s.severity] || SEVERITY_COLOR.low}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[9px] uppercase">{s.action}</Badge>
                    <Badge variant="outline" className="text-[9px]">{s.level}</Badge>
                    <span className="text-xs font-medium truncate">{s.object_name}</span>
                  </div>
                  <p className="text-[11px] text-card-foreground/90">{s.reason}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-primary"
                    onClick={() => apply.mutate(s, { onSuccess: () => toast.success("Aplicada"), onError: (e: any) => toast.error(e.message) })}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground"
                    onClick={() => reject.mutate(s)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {past.length > 0 && (
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer pt-2 hover:text-card-foreground">
                Histórico ({past.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {past.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    <span className="truncate">{s.object_name} — {s.action}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}