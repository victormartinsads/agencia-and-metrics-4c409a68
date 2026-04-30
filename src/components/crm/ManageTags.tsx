import { useState } from "react";
import { CRMTag, useCreateTag, useDeleteTag } from "@/hooks/useCRM";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export function ManageTags({ clientId, tags }: { clientId: string; tags: CRMTag[] }) {
  const create = useCreateTag();
  const del = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{ background: t.color, color: "#fff" }}>
            {t.name}
            <button onClick={() => del.mutate({ id: t.id, client_id: clientId })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag.</span>}
      </div>
      <div className="flex gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
          className="h-9 w-9 rounded cursor-pointer border-0 bg-transparent" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da tag..." className="h-9" />
        <Button size="sm" onClick={() => { if (name.trim()) { create.mutate({ client_id: clientId, name: name.trim(), color }); setName(""); } }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Criar
        </Button>
      </div>
    </div>
  );
}