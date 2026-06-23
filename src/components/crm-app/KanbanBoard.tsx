import { useMemo, useState } from "react";
import { Lead } from "@/lib/crm-app";
import { LeadCard } from "./LeadCard";
import { useUpdateLeadStage } from "@/hooks/useCrmAppLeads";
import { PipelineStage, useCreatePipelineStage, useUpdatePipelineStage, useDeletePipelineStage } from "@/hooks/usePipelineStages";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function KanbanBoard({
  leads,
  orgId,
  pipelineId,
  stages = [],
  onCardClick,
  selectedIds,
  onToggleSelect,
}: {
  leads: Lead[];
  orgId: string;
  pipelineId: string | null;
  stages?: PipelineStage[];
  onCardClick: (l: Lead) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const updateLeadStage = useUpdateLeadStage(orgId);
  const createStage = useCreatePipelineStage(pipelineId);
  const updateStage = useUpdatePipelineStage(pipelineId);
  const deleteStage = useDeletePipelineStage(pipelineId);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDraggingOverId, setIsDraggingOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const safeStages = useMemo(() => Array.isArray(stages) ? stages : [], [stages]);
  const safeLeads = useMemo(() => Array.isArray(leads) ? leads : [], [leads]);

  const grouped = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const s of safeStages) m.set(s.id, []);
    
    for (const l of safeLeads) {
      let sId = l.stage_id;
      if (!sId || !safeStages.some((s) => s.id === sId)) {
        sId = safeStages[0]?.id; // fallback to first stage if unassigned
      }
      if (sId) {
        m.get(sId)?.push(l);
      }
    }
    return m;
  }, [safeLeads, safeStages]);

  const handleDrop = async (stageId: string) => {
    if (!draggingId) return;
    const lead = safeLeads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead) return;

    const destStage = safeStages.find((s) => s.id === stageId);
    if (!destStage) return;

    const currentStageId = lead.stage_id || safeStages[0]?.id;
    if (currentStageId === stageId) return;

    const newStatus = destStage.is_won ? "closed" : destStage.is_lost ? "lost" : "new";

    try {
      await updateLeadStage.mutateAsync({
        id: lead.id,
        stageId: stageId,
        status: newStatus,
        oldStatus: lead.status,
      });
      toast.success("Lead movido");
    } catch (e: any) {
      toast.error(e.message || "Erro ao mover");
    }
  };

  const handleAddStage = async () => {
    if (!pipelineId) return;
    try {
      const nextSortOrder = safeStages.length > 0 ? Math.max(...safeStages.map((s) => s.sort_order)) + 1 : 0;
      await createStage.mutateAsync({
        name: "Nova Etapa",
        color: "#94a3b8",
        sort_order: nextSortOrder,
      });
      toast.success("Etapa adicionada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar etapa");
    }
  };

  const startEdit = (s: PipelineStage) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const saveEdit = async (s: PipelineStage) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateStage.mutateAsync({
        id: s.id,
        name: editName.trim(),
      });
      toast.success("Etapa atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setEditingId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, s: PipelineStage) => {
    if (e.key === "Enter") saveEdit(s);
    if (e.key === "Escape") setEditingId(null);
  };

  const handleDeleteStage = async (s: PipelineStage) => {
    const leadCount = grouped.get(s.id)?.length || 0;
    let confirmMsg = `Excluir a etapa "${s.name}"?`;
    if (leadCount > 0) {
      confirmMsg = `Excluir a etapa "${s.name}"? Existem ${leadCount} leads nesta etapa que serão movidos para a primeira etapa do funil.`;
    }
    if (!confirm(confirmMsg)) return;

    try {
      await deleteStage.mutateAsync(s.id);
      toast.success("Etapa excluída");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir etapa");
    }
  };

  const moveStage = async (s: PipelineStage, direction: "left" | "right") => {
    const idx = stages.findIndex((item) => item.id === s.id);
    if (idx === -1) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const targetStage = stages[targetIdx];
    
    try {
      await Promise.all([
        updateStage.mutateAsync({ id: s.id, sort_order: targetStage.sort_order }),
        updateStage.mutateAsync({ id: targetStage.id, sort_order: s.sort_order }),
      ]);
      toast.success("Ordem atualizada");
    } catch (e: any) {
      toast.error("Erro ao reordenar");
    }
  };

  if (!pipelineId) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/80">
        Selecione ou crie um pipeline para visualizar o Kanban.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 items-start">
      {stages.map((s, idx) => {
        const list = grouped.get(s.id) || [];
        const isFirst = idx === 0;
        const isLast = idx === stages.length - 1;

        return (
          <div
            key={s.id}
            className="min-w-[280px] w-[280px] shrink-0"
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOverId(s.id); }}
            onDragLeave={() => setIsDraggingOverId(null)}
            onDrop={() => { setIsDraggingOverId(null); handleDrop(s.id); }}
          >
            <div 
              className={cn(
                "rounded-xl bg-card border p-3 h-full flex flex-col group/column shadow-sm overflow-hidden relative transition-colors duration-200",
                isDraggingOverId === s.id ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60"
              )}
              style={{ borderTop: `4px solid ${s.color || '#94a3b8'}` }}
            >
              <div className="flex flex-col gap-1.5 mb-3 px-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1 w-full">
                        <Input
                          size={1}
                          className="h-7 py-0.5 px-1.5 text-xs font-semibold focus-visible:ring-1 focus-visible:ring-ring"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, s)}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => saveEdit(s)}>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        className="text-sm font-bold text-card-foreground truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={() => startEdit(s)}
                        title="Clique para renomear"
                      >
                        {s.name}
                      </span>
                    )}
                  </div>

                  {editingId !== s.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/column:opacity-100 transition-opacity shrink-0 ml-1">
                      <button
                        disabled={isFirst}
                        onClick={() => moveStage(s, "left")}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Mover para esquerda"
                      >
                        <span className="text-xs">←</span>
                      </button>
                      <button
                        disabled={isLast}
                        onClick={() => moveStage(s, "right")}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Mover para direita"
                      >
                        <span className="text-xs">→</span>
                      </button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground p-0.5" title="Configurar Etapa">
                            <Palette className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="end">
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold">Configurações da Etapa</h4>
                            
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Cor da bolinha</label>
                              <div className="grid grid-cols-6 gap-1.5">
                                {["#94a3b8", "#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"].map((c) => (
                                  <button
                                    key={c}
                                    className="h-4 w-4 rounded-full border border-border/80 focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
                                    style={{ backgroundColor: c }}
                                    onClick={() => updateStage.mutate({ id: s.id, color: c })}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1 pt-1.5 border-t border-border/50">
                              <label className="text-[10px] text-muted-foreground block mb-1">Tipo de Etapa</label>
                              <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={s.is_won}
                                    className="rounded border-border text-primary focus:ring-0 h-3.5 w-3.5"
                                    onChange={(e) => updateStage.mutate({ id: s.id, is_won: e.target.checked, is_lost: false })}
                                  />
                                  Marcar como Ganho (Won)
                                </label>
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={s.is_lost}
                                    className="rounded border-border text-primary focus:ring-0 h-3.5 w-3.5"
                                    onChange={(e) => updateStage.mutate({ id: s.id, is_lost: e.target.checked, is_won: false })}
                                  />
                                  Marcar como Perdido (Lost)
                                </label>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-foreground p-0.5" title="Editar nome">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDeleteStage(s)} className="text-muted-foreground hover:text-destructive p-0.5" title="Excluir etapa">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Resumo da Coluna (Flowlu style) */}
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground bg-muted/40 p-1.5 rounded-lg border border-border/30">
                  <span className="font-medium">{list.length} {list.length === 1 ? "Oportunidade" : "Oportunidades"}</span>
                  <span className="font-extrabold text-foreground">
                    {list.reduce((sum, lead) => sum + Number(lead.value || 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </span>
                </div>

                {s.is_won && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1 py-0.2 rounded font-semibold self-start uppercase mt-1">Ganho (Won)</span>
                )}
                {s.is_lost && (
                  <span className="text-[9px] bg-rose-500/10 text-rose-500 px-1 py-0.2 rounded font-semibold self-start uppercase mt-1">Perdido (Lost)</span>
                )}
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 max-h-[65vh] min-h-[150px]">
                {list.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onClick={() => onCardClick(l)}
                    onDragStart={() => setDraggingId(l.id)}
                    selected={selectedIds?.has(l.id)}
                    onToggleSelect={onToggleSelect ? () => onToggleSelect(l.id) : undefined}
                  />
                ))}
                {list.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-8 border border-dashed border-border/40 rounded-lg">Vazio</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {pipelineId && (
        <div className="min-w-[280px] w-[280px] shrink-0">
          <div className="rounded-lg bg-secondary/10 border border-dashed border-border/80 p-4 flex flex-col justify-center items-center text-center gap-2 min-h-[140px]">
            <span className="text-xs text-muted-foreground font-medium">Nova etapa do pipeline</span>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleAddStage}
              disabled={createStage.isPending}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Etapa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}