import { useEffect, useState } from "react";
import { Database, FileSpreadsheet, Hand, Sparkles, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ClientSpreadsheet,
  MetricDataSource,
  useClientSpreadsheets,
  useMetricSources,
  useUpsertMetricSource,
} from "@/hooks/useClientSpreadsheets";
import { cn } from "@/lib/utils";

export interface MetricBinding {
  /** Stable metric identifier persisted in metric_data_sources.metric_key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Which sources are valid for this metric */
  allowed?: Array<MetricDataSource["source_type"]>;
}

interface Props {
  clientId: string;
  metric: MetricBinding;
  spreadsheets: ClientSpreadsheet[];
  current?: MetricDataSource;
}

const SOURCE_LABELS: Record<MetricDataSource["source_type"], { label: string; icon: any }> = {
  sheet: { label: "Planilha", icon: FileSpreadsheet },
  meta: { label: "Meta Ads", icon: Sparkles },
  ga: { label: "Google Analytics", icon: Globe },
  manual: { label: "Manual", icon: Hand },
};

export function MetricSourceEditor({ clientId, metric, spreadsheets, current }: Props) {
  const upsert = useUpsertMetricSource();
  const { toast } = useToast();

  const allowed = metric.allowed ?? ["sheet", "meta", "ga", "manual"];

  const [sourceType, setSourceType] = useState<MetricDataSource["source_type"]>(
    current?.source_type || allowed[0],
  );
  const [spreadsheetId, setSpreadsheetId] = useState<string>(current?.spreadsheet_id || "");
  const [columnLetter, setColumnLetter] = useState<string>(current?.column_letter || "");
  const [manualValue, setManualValue] = useState<string>(
    current?.manual_value != null ? String(current.manual_value) : "",
  );

  useEffect(() => {
    setSourceType(current?.source_type || allowed[0]);
    setSpreadsheetId(current?.spreadsheet_id || "");
    setColumnLetter(current?.column_letter || "");
    setManualValue(current?.manual_value != null ? String(current.manual_value) : "");
  }, [current?.id]);

  const dirty =
    sourceType !== (current?.source_type || allowed[0]) ||
    (spreadsheetId || "") !== (current?.spreadsheet_id || "") ||
    (columnLetter || "") !== (current?.column_letter || "") ||
    manualValue !== (current?.manual_value != null ? String(current.manual_value) : "");

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        metric_key: metric.key,
        source_type: sourceType,
        spreadsheet_id: sourceType === "sheet" ? spreadsheetId || null : null,
        column_letter: sourceType === "sheet" ? columnLetter.trim().toUpperCase() || null : null,
        manual_value: sourceType === "manual" ? Number(manualValue || 0) : null,
      });
      toast({ title: "Fonte atualizada", description: metric.label });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs font-semibold truncate">{metric.label}</p>
        </div>
        <Button
          size="sm"
          variant={dirty ? "default" : "ghost"}
          className="h-7 text-[11px]"
          disabled={!dirty || upsert.isPending}
          onClick={handleSave}
        >
          {upsert.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fonte</Label>
          <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowed.map((t) => {
                const meta = SOURCE_LABELS[t];
                const Icon = meta.icon;
                return (
                  <SelectItem key={t} value={t} className="text-xs">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {sourceType === "sheet" && (
          <>
            <div className="space-y-1 col-span-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Planilha</Label>
              <Select value={spreadsheetId} onValueChange={setSpreadsheetId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Escolher" />
                </SelectTrigger>
                <SelectContent>
                  {spreadsheets.length === 0 && (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      Nenhuma planilha cadastrada
                    </div>
                  )}
                  {spreadsheets.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.label}
                      {s.is_primary && (
                        <span className="ml-1 text-[9px] text-primary">PRINCIPAL</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Coluna (ex: B, AC)
              </Label>
              <Input
                value={columnLetter}
                onChange={(e) => setColumnLetter(e.target.value)}
                placeholder="C"
                className={cn("h-8 text-xs uppercase font-mono")}
                maxLength={3}
              />
            </div>
          </>
        )}

        {sourceType === "manual" && (
          <div className="space-y-1 col-span-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor fixo</Label>
            <Input
              type="number"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="0"
              className="h-8 text-xs tabular-nums"
            />
          </div>
        )}

        {sourceType === "meta" && (
          <div className="col-span-1 self-end">
            <p className="text-[10px] text-muted-foreground">Pega direto do Meta Ads no período.</p>
          </div>
        )}

        {sourceType === "ga" && (
          <div className="col-span-1 self-end">
            <p className="text-[10px] text-muted-foreground">Usa Google Analytics 4 do cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Convenience hook returning the currently mapped sources map. */
export function useMetricBindings(clientId?: string) {
  const { data: spreadsheets = [] } = useClientSpreadsheets(clientId);
  const { data: sources } = useMetricSources(clientId);
  return { spreadsheets, sources };
}