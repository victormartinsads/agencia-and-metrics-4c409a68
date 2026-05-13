import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import { Pipeline, useDeletePipeline, usePipelines, useUpsertPipeline } from "@/hooks/usePipelines";
import { toast } from "sonner";

export function PipelineSwitcher({
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: pipelines = [] } = usePipelines(orgId);
  const upsert = useUpsertPipeline(orgId);
  const del = useDeletePipeline(orgId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", color: "#22c55e" });

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", description: "", color: "#22c55e" });
    setOpen(true);
  };
  const openEdit = (p: Pipeline) => {
    setEditing(p);
    setDraft({ name: p.name, description: p.description || "", color: p.color });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Informe um nome");
    try {
      const out = await upsert.mutateAsync({
        id: editing?.id,
        name: draft.name.trim(),
        description: draft.description || null,
        color: draft.color,
      });
      toast.success(editing ? "Pipeline atualizado" : "Pipeline criado");
      setOpen(false);
      if (!editing) onChange(out.id);
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const remove = async (p: Pipeline) => {
    if (!confirm(`Excluir o pipeline "${p.name}"? Os leads vinculados ficarão sem pipeline.`)) return;
    try {
      await del.mutateAsync(p.id);
      if (value === p.id) onChange(null);
      toast.success("Pipeline excluído");
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const current = pipelines.find((p) => p.id === value);

  return (
    <div className="flex items-center gap-2">
      <GitBranch className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? null : v)}
      >
        <SelectTrigger className="h-9 w-[220px] text-sm">
          <SelectValue placeholder="Selecione um pipeline">
            {current ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: current.color }}
                />
                {current.name}
              </span>
            ) : (
              "Todos os pipelines"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os pipelines</SelectItem>
          {pipelines.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && (
        <>
          <Button size="icon" variant="ghost" onClick={() => openEdit(current)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => remove(current)} title="Excluir">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
        <Plus className="h-3.5 w-3.5" /> Novo pipeline
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pipeline" : "Novo pipeline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={draft.name}
                placeholder="Ex: Site, Instagram, Indicações..."
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={draft.description}
                placeholder="Para que serve esse pipeline"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="m-0">Cor</Label>
              <Input
                type="color"
                className="h-9 w-16 p-1"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Após criar, um webhook de entrada exclusivo será gerado para este pipeline.
              Você também poderá definir campos personalizados e webhooks de saída específicos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
