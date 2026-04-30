import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CRMLead, PipelineStage, CRMTag, useUpsertLead, useDeleteLead } from "@/hooks/useCRM";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  lead?: CRMLead | null;
  stages: PipelineStage[];
  tags: CRMTag[];
  defaultStageId?: string | null;
}

export function LeadModal({ open, onClose, clientId, lead, stages, tags, defaultStageId }: Props) {
  const upsert = useUpsertLead();
  const del = useDeleteLead();
  const [form, setForm] = useState<Partial<CRMLead>>({});

  useEffect(() => {
    setForm(lead ? { ...lead } : {
      name: "", email: "", phone: "", source: "", value: 0, notes: "",
      tags: [], stage_id: defaultStageId || stages[0]?.id || null,
    });
  }, [lead, open, defaultStageId, stages]);

  const setF = (k: keyof CRMLead, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const toggleTag = (name: string) => {
    const cur = (form.tags as string[]) || [];
    setF("tags", cur.includes(name) ? cur.filter((t) => t !== name) : [...cur, name]);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      await upsert.mutateAsync({ ...(form as any), client_id: clientId });
      toast.success(lead ? "Lead atualizado" : "Lead criado");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!confirm("Excluir este lead?")) return;
    try {
      await del.mutateAsync({ id: lead.id, client_id: clientId });
      toast.success("Lead excluído");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name || ""} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email || ""} onChange={(e) => setF("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone || ""} onChange={(e) => setF("phone", e.target.value)} />
            </div>
            <div>
              <Label>Origem</Label>
              <Input value={form.source || ""} onChange={(e) => setF("source", e.target.value)} placeholder="Instagram, Indicação..." />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.value ?? 0} onChange={(e) => setF("value", Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label>Etapa</Label>
              <Select value={form.stage_id || ""} onValueChange={(v) => setF("stage_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.name}{s.is_won ? " (Ganho)" : s.is_lost ? " (Perdido)" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((t) => {
                  const active = ((form.tags as string[]) || []).includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.name)}
                      className={`px-2 py-0.5 rounded-full text-xs border transition-all ${active ? "" : "opacity-50"}`}
                      style={{ background: active ? t.color : "transparent", borderColor: t.color, color: active ? "#fff" : t.color }}
                    >
                      {t.name}{active && <X className="inline h-3 w-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes || ""} onChange={(e) => setF("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {lead && (
            <Button variant="ghost" onClick={handleDelete} className="text-destructive mr-auto">
              <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}