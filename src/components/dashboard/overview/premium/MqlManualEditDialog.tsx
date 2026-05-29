import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  periods: {
    current: {
      start: Date;
      end: Date;
    };
  };
  weeklyMetrics: any[];
}

export function MqlManualEditDialog({ open, onClose, clientId, periods, weeklyMetrics }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  // Generate all dates in the range and map existing values
  useEffect(() => {
    if (!open) return;
    
    const start = new Date(periods.current.start);
    const end = new Date(periods.current.end);
    const dateList: string[] = [];

    let currentMs = start.getTime();
    const endMs = end.getTime();
    while (currentMs <= endMs + 3600000) {
      const currDate = new Date(currentMs);
      const yyyyMmDd = currDate.toISOString().slice(0, 10);
      if (!dateList.includes(yyyyMmDd)) {
        dateList.push(yyyyMmDd);
      }
      currentMs += 24 * 60 * 60 * 1000;
    }

    // Sort dates ascending for the spreadsheet view
    dateList.sort();

    // Map existing metrics for this client
    const mappedRows = dateList.map((date) => {
      // Find row in weeklyMetrics for this date
      const existing = weeklyMetrics.find((r) => r.reference_date === date);
      
      return {
        date,
        mql: existing?.mql ?? "",
        smql: existing?.smql ?? "",
        mql3: existing?.raw_row?.mql3 ?? "",
        qualified_messages: existing?.qualified_messages ?? "",
        amostragem_messages: existing?.raw_row?.amostragem_mensagens ?? "",
        qualified_followers: existing?.qualified_followers ?? "",
        amostragem_followers: existing?.raw_row?.amostragem_seguidores ?? "",
      };
    });

    setRows(mappedRows);
  }, [open, periods, weeklyMetrics]);

  const handleInputChange = (index: number, field: string, value: string) => {
    // Restrict to numbers or empty string
    const numVal = value === "" ? "" : Number(value);
    if (value !== "" && isNaN(numVal as number)) return;

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: numVal };
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const datesList = rows.map((r) => r.date);

      // 1. Fetch existing weekly_metrics for these dates
      const { data: existingRows, error: fetchErr } = await supabase
        .from("weekly_metrics")
        .select("*")
        .eq("client_id", clientId)
        .in("reference_date", datesList);

      if (fetchErr) throw fetchErr;

      const existingMap = new Map(existingRows?.map((r) => [r.reference_date, r]) || []);

      // 2. Prepare the upsert payload
      const payload = rows.map((row) => {
        const existing = existingMap.get(row.date);

        const rawRow = {
          ...(existing?.raw_row as Record<string, any> || {}),
          mql3: row.mql3 === "" ? null : Number(row.mql3),
          amostragem_mensagens: row.amostragem_messages === "" ? null : Number(row.amostragem_messages),
          amostragem_seguidores: row.amostragem_followers === "" ? null : Number(row.amostragem_followers),
        };

        return {
          ...(existing || { client_id: clientId, reference_date: row.date }),
          source: "manual",
          mql: row.mql === "" ? null : Number(row.mql),
          smql: row.smql === "" ? null : Number(row.smql),
          qualified_messages: row.qualified_messages === "" ? null : Number(row.qualified_messages),
          qualified_followers: row.qualified_followers === "" ? null : Number(row.qualified_followers),
          raw_row: rawRow,
        };
      });

      // 3. Upsert to Supabase
      const { error: upsertErr } = await supabase.from("weekly_metrics").upsert(payload);
      if (upsertErr) throw upsertErr;

      toast.success("Métricas salvas com sucesso!");
      
      // Invalidate queries so UI updates in real-time
      qc.invalidateQueries({ queryKey: ["weekly-metrics", clientId] });
      
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar métricas manuais:", error);
      toast.error(`Erro ao salvar métricas: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const fmtDisplayDate = (s: string) => {
    const parts = s.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return s;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-[900px] bg-card border border-border p-6 text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
            Planilha de Qualificação — MQL & sMQL
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Insira os valores manuais correspondentes a cada data do período. As células vazias serão interpretadas como nulas (sem dados).
          </p>
        </DialogHeader>

        <div className="overflow-x-auto max-h-[60vh] border border-border/80 rounded-md mt-4 bg-background/20 scrollbar-thin">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-muted/40 sticky top-0 backdrop-blur-sm border-b border-border z-10">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground border-r border-border min-w-[70px]">Data</th>
                <th className="px-3 py-2.5 font-semibold text-primary/90 border-r border-border">MQL 1</th>
                <th className="px-3 py-2.5 font-semibold text-primary/90 border-r border-border">MQL 2</th>
                <th className="px-3 py-2.5 font-semibold text-primary/90 border-r border-border">MQL 3</th>
                <th className="px-3 py-2.5 font-semibold text-foreground/90 border-r border-border">Msg Qualif.</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground border-r border-border">Amostragem Msg</th>
                <th className="px-3 py-2.5 font-semibold text-foreground/90 border-r border-border">Seg Qualif.</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Amostragem Seg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, index) => (
                <tr key={row.date} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-1.5 font-mono text-muted-foreground font-semibold border-r border-border bg-muted/10 min-w-[70px]">
                    {fmtDisplayDate(row.date)}
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.mql}
                      onChange={(e) => handleInputChange(index, "mql", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/30"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.smql}
                      onChange={(e) => handleInputChange(index, "smql", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.mql3}
                      onChange={(e) => handleInputChange(index, "mql3", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.qualified_messages}
                      onChange={(e) => handleInputChange(index, "qualified_messages", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.amostragem_messages}
                      onChange={(e) => handleInputChange(index, "amostragem_messages", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1 border-r border-border">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.qualified_followers}
                      onChange={(e) => handleInputChange(index, "qualified_followers", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={row.amostragem_followers}
                      onChange={(e) => handleInputChange(index, "amostragem_followers", e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-primary/80 focus:ring-0 p-1 text-center font-mono text-foreground focus:outline-none"
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-border text-foreground hover:bg-muted/30">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[90px]">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Salvando
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
