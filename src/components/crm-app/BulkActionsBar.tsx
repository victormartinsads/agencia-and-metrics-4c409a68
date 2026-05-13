import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tag, Trash2, X, ArrowRightLeft, Plus } from "lucide-react";
import { LeadStatus, STATUS_CONFIG } from "@/lib/crm-app";
import { useBulkLeadActions, useCreateLeadTag, useLeadTags } from "@/hooks/useLeadTags";
import { toast } from "sonner";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "closed", "lost"];

export function BulkActionsBar({
  orgId,
  selectedIds,
  onClear,
}: {
  orgId: string;
  selectedIds: string[];
  onClear: () => void;
}) {
  const { data: tags = [] } = useLeadTags(orgId);
  const createTag = useCreateLeadTag(orgId);
  const { updateStatus, remove, addTag } = useBulkLeadActions(orgId);
  const [newTag, setNewTag] = useState("");

  if (selectedIds.length === 0) return null;

  const handleStatus = async (status: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ ids: selectedIds, status });
      toast.success(`${selectedIds.length} lead(s) movido(s)`);
      onClear();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.length} lead(s)?`)) return;
    try {
      await remove.mutateAsync(selectedIds);
      toast.success("Leads excluídos");
      onClear();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddTag = async (tag: string) => {
    try {
      await addTag.mutateAsync({ ids: selectedIds, tag });
      toast.success(`Tag "${tag}" adicionada`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    try {
      await createTag.mutateAsync({ name });
      await handleAddTag(name);
      setNewTag("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="sticky top-2 z-30 mb-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-card/95 backdrop-blur px-3 py-2 shadow-lg flex-wrap">
      <span className="text-sm font-semibold text-foreground">{selectedIds.length} selecionado(s)</span>
      <span className="h-4 w-px bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 h-8">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Status
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_CONFIG[s].color }} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 h-8">
            <Tag className="h-3.5 w-3.5" /> Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-2" align="start">
          <div className="text-xs font-semibold text-muted-foreground px-1">Adicionar tag</div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {tags.length === 0 && <div className="text-xs text-muted-foreground px-2 py-1">Nenhuma tag criada</div>}
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => handleAddTag(t.name)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 pt-2 border-t border-border">
            <Input
              placeholder="Nova tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 px-2" onClick={handleCreateTag}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={handleDelete}>
        <Trash2 className="h-3.5 w-3.5" /> Excluir
      </Button>

      <div className="flex-1" />
      <Button size="sm" variant="ghost" className="gap-1 h-8" onClick={onClear}>
        <X className="h-3.5 w-3.5" /> Limpar
      </Button>
    </div>
  );
}