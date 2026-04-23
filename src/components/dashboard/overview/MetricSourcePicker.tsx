import { useState, useEffect } from "react";
import { Loader2, Database, FileSpreadsheet, BarChart3, Calculator, Check } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSheetsConfig } from "@/hooks/useSheetsSync";
import {
  METRIC_REGISTRY,
  MetricSource,
  resolveSource,
  useMetricSources,
  useSheetHeaders,
  useUpsertMetricSource,
} from "@/hooks/useMetricSources";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  metricKey: string;
}

const SOURCE_INFO: Record<MetricSource, { label: string; icon: typeof Database; description: string }> = {
  meta: { label: "Meta Ads", icon: BarChart3, description: "Dados vindos diretamente da API da Meta" },
  sheets: { label: "Planilha", icon: FileSpreadsheet, description: "Coluna de uma planilha do Google Sheets" },
  ga: { label: "Google Analytics", icon: Database, description: "Dados do GA4" },
  computed: { label: "Calculado", icon: Calculator, description: "Resultado de outras métricas" },
};

export function MetricSourcePicker({ open, onOpenChange, clientId, metricKey }: Props) {
  const meta = METRIC_REGISTRY[metricKey];
  const { data: sources } = useMetricSources(clientId);
  const current = resolveSource(metricKey, sources);
  const { data: sheetsConfig } = useSheetsConfig(clientId);
  const upsert = useUpsertMetricSource();

  const [pickedSource, setPickedSource] = useState<MetricSource>(current.source);
  const [pickedColumn, setPickedColumn] = useState<string | null>(current.column_letter);

  useEffect(() => {
    if (open) {
      setPickedSource(current.source);
      setPickedColumn(current.column_letter);
    }
  }, [open, current.source, current.column_letter]);

  const { data: columns, isLoading: loadingHeaders, error: headersError } = useSheetHeaders(
    clientId,
    open && pickedSource === "sheets" && !!sheetsConfig,
  );

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        metric_key: metricKey,
        source: pickedSource,
        column_letter: pickedSource === "sheets" ? pickedColumn : null,
        field_key: pickedSource === "sheets" ? meta?.sheetField || null : meta?.defaultField || null,
      });
      toast.success(`Fonte de "${meta?.label}" atualizada`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar fonte: {meta.label}</DialogTitle>
          <DialogDescription>
            Escolha de onde os dados desta métrica devem vir.
          </DialogDescription>
        </DialogHeader>

        {/* Source picker */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SOURCE_INFO) as MetricSource[]).filter((s) => s !== "computed").map((s) => {
              const info = SOURCE_INFO[s];
              const Icon = info.icon;
              const active = pickedSource === s;
              const disabled = s === "sheets" && !sheetsConfig;
              return (
                <button
                  key={s}
                  onClick={() => !disabled && setPickedSource(s)}
                  disabled={disabled}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all flex items-start gap-3",
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", active ? "bg-primary/15" : "bg-muted")}>
                    <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {info.label}
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{info.description}</p>
                    {disabled && <p className="text-[10px] text-amber-500 mt-1">Conecte uma planilha primeiro</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column picker (sheets only) */}
        {pickedSource === "sheets" && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coluna da planilha</p>

            {loadingHeaders && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando colunas da planilha…
              </div>
            )}

            {headersError && (
              <div className="text-xs text-destructive py-2 px-3 bg-destructive/5 rounded-md">
                {(headersError as Error).message || "Não foi possível ler os cabeçalhos. Verifique a conexão."}
              </div>
            )}

            {columns && columns.length > 0 && (
              <div className="max-h-72 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                    <tr className="text-left">
                      <th className="py-2 px-3 font-semibold w-12">Col</th>
                      <th className="py-2 px-3 font-semibold">Cabeçalho</th>
                      <th className="py-2 px-3 font-semibold text-muted-foreground">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c) => {
                      const active = pickedColumn === c.letter;
                      return (
                        <tr
                          key={c.letter}
                          onClick={() => setPickedColumn(c.letter)}
                          className={cn(
                            "cursor-pointer border-t border-border transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/40",
                          )}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-primary">{c.letter}</td>
                          <td className="py-2 px-3 font-medium">{c.header || <span className="text-muted-foreground italic">vazio</span>}</td>
                          <td className="py-2 px-3 text-muted-foreground truncate max-w-[200px]">{c.sample}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {columns && columns.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma coluna encontrada na linha de cabeçalho.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={upsert.isPending || (pickedSource === "sheets" && !pickedColumn)}
          >
            {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar fonte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}