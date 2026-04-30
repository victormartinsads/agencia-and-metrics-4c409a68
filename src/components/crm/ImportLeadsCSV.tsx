import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBulkInsertLeads, PipelineStage } from "@/hooks/useCRM";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export function ImportLeadsCSV({ clientId, stages }: { clientId: string; stages: PipelineStage[] }) {
  const bulk = useBulkInsertLeads();
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV vazio");
      const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
      const idx = (k: string) => headers.findIndex((h) => h === k);
      const iName = idx("name") >= 0 ? idx("name") : idx("nome");
      if (iName < 0) throw new Error('Coluna "name" ou "nome" obrigatória');
      const iEmail = idx("email");
      const iPhone = idx("phone") >= 0 ? idx("phone") : idx("telefone");
      const iSource = idx("source") >= 0 ? idx("source") : idx("origem");
      const iValue = idx("value") >= 0 ? idx("value") : idx("valor");
      const iTags = idx("tags");
      const iNotes = idx("notes") >= 0 ? idx("notes") : idx("observacoes");
      const defaultStage = stages[0]?.id || null;
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          name: cols[iName] || "",
          email: iEmail >= 0 ? cols[iEmail] || null : null,
          phone: iPhone >= 0 ? cols[iPhone] || null : null,
          source: iSource >= 0 ? cols[iSource] || "csv" : "csv",
          value: iValue >= 0 ? Number(cols[iValue] || 0) || 0 : 0,
          notes: iNotes >= 0 ? cols[iNotes] || null : null,
          tags: iTags >= 0 ? (cols[iTags] || "").split("|").filter(Boolean) : [],
          stage_id: defaultStage,
        };
      }).filter((r) => r.name);
      if (!rows.length) throw new Error("Nenhuma linha válida");
      await bulk.mutateAsync({ client_id: clientId, rows });
      toast.success(`${rows.length} leads importados`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Colunas suportadas (header obrigatório): <code>name, email, phone, source, value, tags, notes</code>.
        Tags separadas por <code>|</code>. Aceita vírgula ou ponto-e-vírgula como separador.
      </p>
      <Input type="file" accept=".csv,text/csv" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Upload className="h-3.5 w-3.5" /> {busy ? "Importando..." : "Selecione um CSV acima"}
      </Button>
    </div>
  );
}