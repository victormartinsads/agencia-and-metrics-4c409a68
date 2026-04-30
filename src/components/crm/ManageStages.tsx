import { useState } from "react";
import { PipelineStage, useUpsertStage, useDeleteStage } from "@/hooks/useCRM";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ManageStages({ clientId, stages }: { clientId: string; stages: PipelineStage[] }) {
  const upsert = useUpsertStage();
  const del = useDeleteStage();
  const [newName, setNewName] = useState("");

  const add = async () => {
    if (!newName.trim()) return;
    await upsert.mutateAsync({
      client_id: clientId, name: newName.trim(), color: "#22c55e",
      sort_order: stages.length, is_won: false, is_lost: false,
    });
    setNewName("");
    toast.success("Etapa criada");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border bg-background/50">
            <input
              type="color" value={s.color}
              onChange={(e) => upsert.mutate({ id: s.id, client_id: clientId, color: e.target.value })}
              className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
            />
            <Input
              defaultValue={s.name}
              onBlur={(e) => e.target.value !== s.name && upsert.mutate({ id: s.id, client_id: clientId, name: e.target.value })}
              className="flex-1 h-8"
            />
            <div className="flex items-center gap-1.5">
              <Switch
                checked={s.is_won}
                onCheckedChange={(v) => upsert.mutate({ id: s.id, client_id: clientId, is_won: v, is_lost: v ? false : s.is_lost })}
              />
              <Label className="text-[11px] text-muted-foreground">Ganho</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch
                checked={s.is_lost}
                onCheckedChange={(v) => upsert.mutate({ id: s.id, client_id: clientId, is_lost: v, is_won: v ? false : s.is_won })}
              />
              <Label className="text-[11px] text-muted-foreground">Perdido</Label>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
              onClick={() => confirm(`Excluir etapa "${s.name}"?`) && del.mutate({ id: s.id, client_id: clientId })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova etapa..." className="h-8" />
        <Button onClick={add} size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
    </div>
  );
}