import { useMemo, useState } from "react";
import { CRMLead, PipelineStage, useUpsertLead } from "@/hooks/useCRM";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  stages: PipelineStage[];
  leads: CRMLead[];
  clientId: string;
  onCardClick: (l: CRMLead) => void;
  onAdd: (stageId: string) => void;
  readOnly?: boolean;
}

export function PipelineBoard({ stages, leads, clientId, onCardClick, onAdd, readOnly }: Props) {
  const upsert = useUpsertLead();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, CRMLead[]>();
    for (const s of stages) m.set(s.id, []);
    for (const l of leads) {
      const arr = m.get(l.stage_id || "") || [];
      arr.push(l);
      m.set(l.stage_id || "", arr);
    }
    return m;
  }, [stages, leads]);

  const handleDrop = async (stageId: string) => {
    if (!draggingId || readOnly) return;
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.stage_id === stageId) return;
    try {
      await upsert.mutateAsync({ id: lead.id, client_id: clientId, stage_id: stageId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao mover");
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((s) => {
        const list = grouped.get(s.id) || [];
        const total = list.reduce((sum, l) => sum + Number(l.value || 0), 0);
        return (
          <div
            key={s.id}
            className="min-w-[280px] w-[280px] shrink-0"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => handleDrop(s.id)}
          >
            <div className="rounded-lg bg-secondary/40 border border-border p-2 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => onAdd(s.id)}
                    className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center text-muted-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground px-1 mb-2">
                Total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[60vh]">
                {list.map((l) => (
                  <Card
                    key={l.id}
                    draggable={!readOnly}
                    onDragStart={() => setDraggingId(l.id)}
                    onClick={() => onCardClick(l)}
                    className="p-2.5 cursor-pointer hover:border-primary/60 transition-colors space-y-1.5"
                  >
                    <div className="text-sm font-medium text-foreground truncate">{l.name}</div>
                    {(l.email || l.phone) && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {l.email || l.phone}
                      </div>
                    )}
                    {l.value > 0 && (
                      <div className="text-[11px] text-primary font-semibold">
                        R$ {Number(l.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {Array.isArray(l.tags) && l.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {l.tags.slice(0, 3).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-accent text-accent-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
                {list.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-6">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}