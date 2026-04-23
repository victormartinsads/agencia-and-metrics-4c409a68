import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Star, FileSpreadsheet, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClientSpreadsheet,
  useClientSpreadsheets,
  useDeleteSpreadsheet,
  useUpsertSpreadsheet,
} from "@/hooks/useClientSpreadsheets";
import { extractSpreadsheetId } from "@/hooks/useSheetsSync";

interface Props {
  clientId: string;
}

function emptyForm(): Partial<ClientSpreadsheet> {
  return {
    label: "",
    spreadsheet_url: "",
    spreadsheet_id: "",
    sheet_name: "Página1",
    range_notation: "A1:Z1000",
    header_row: 1,
    date_format: "DD/MM/YYYY",
    decimal_separator: ",",
    is_primary: false,
  };
}

export function SpreadsheetsManager({ clientId }: Props) {
  const { data: spreadsheets = [], isLoading } = useClientSpreadsheets(clientId);
  const upsert = useUpsertSpreadsheet();
  const del = useDeleteSpreadsheet();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientSpreadsheet>>(emptyForm());

  const handleSave = async (payload: Partial<ClientSpreadsheet>) => {
    if (!payload.label) {
      toast.error("Dê um nome para essa planilha (ex: Vendas, Tráfego)");
      return;
    }
    const sid = extractSpreadsheetId(payload.spreadsheet_url || payload.spreadsheet_id || "");
    if (!sid) {
      toast.error("Cole um link válido do Google Sheets");
      return;
    }
    try {
      await upsert.mutateAsync({
        ...payload,
        client_id: clientId,
        spreadsheet_id: sid,
      } as any);
      toast.success("Planilha salva");
      setCreating(false);
      setDraft(emptyForm());
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (sheet: ClientSpreadsheet) => {
    if (sheet.is_primary) {
      toast.error("Não é possível excluir a planilha principal");
      return;
    }
    if (!confirm(`Excluir "${sheet.label}"?`)) return;
    await del.mutateAsync({ id: sheet.id, client_id: clientId });
    toast.success("Planilha removida");
  };

  return (
    <div className="rounded-2xl glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Planilhas do cliente</h2>
            <p className="text-[11px] text-muted-foreground">
              Cadastre quantas planilhas precisar. Cada métrica do dashboard pode vir de uma planilha diferente.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nova planilha
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}

      <div className="space-y-2">
        {spreadsheets.map((s) => (
          <SpreadsheetRow
            key={s.id}
            sheet={s}
            onSave={handleSave}
            onDelete={() => handleDelete(s)}
          />
        ))}
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold">Nova planilha</p>
              <SpreadsheetFields value={draft} onChange={setDraft} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setDraft(emptyForm()); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => handleSave(draft)} disabled={upsert.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpreadsheetRow({
  sheet,
  onSave,
  onDelete,
}: {
  sheet: ClientSpreadsheet;
  onSave: (p: Partial<ClientSpreadsheet>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientSpreadsheet>>(sheet);

  if (!editing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-primary/30 transition">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{sheet.label}</p>
            {sheet.is_primary && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                <Star className="h-2.5 w-2.5 fill-primary" /> Principal
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {sheet.sheet_name} · {sheet.range_notation}
          </p>
        </div>
        {sheet.spreadsheet_url && (
          <a
            href={sheet.spreadsheet_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary p-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <Button size="sm" variant="ghost" className="text-[11px]" onClick={() => { setDraft(sheet); setEditing(true); }}>
          Editar
        </Button>
        {!sheet.is_primary && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <SpreadsheetFields value={draft} onChange={setDraft} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

function SpreadsheetFields({
  value,
  onChange,
}: {
  value: Partial<ClientSpreadsheet>;
  onChange: (v: Partial<ClientSpreadsheet>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-1">
        <Label className="text-[11px]">Nome (apelido)</Label>
        <Input
          placeholder="Ex: Vendas, Tráfego, Produtos…"
          value={value.label || ""}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <Label className="text-[11px]">Aba (sheet name)</Label>
        <Input
          value={value.sheet_name || "Página1"}
          onChange={(e) => onChange({ ...value, sheet_name: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-[11px]">Link do Google Sheets</Label>
        <Input
          placeholder="https://docs.google.com/spreadsheets/d/…"
          value={value.spreadsheet_url || ""}
          onChange={(e) => onChange({ ...value, spreadsheet_url: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-[11px]">Intervalo</Label>
        <Input
          value={value.range_notation || "A1:Z1000"}
          onChange={(e) => onChange({ ...value, range_notation: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-[11px]">Linha do cabeçalho</Label>
        <Input
          type="number"
          min={0}
          value={value.header_row ?? 1}
          onChange={(e) => onChange({ ...value, header_row: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}