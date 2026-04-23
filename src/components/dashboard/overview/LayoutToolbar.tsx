import { Eye, Pencil, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { OverviewLayout, OverviewBlockId } from "@/hooks/useOverviewLayout";

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onReset: () => void;
  layout: OverviewLayout;
  onShowBlock: (id: OverviewBlockId) => void;
}

export function LayoutToolbar({ editMode, onToggleEdit, onReset, layout, onShowBlock }: Props) {
  const hidden = layout.order.filter((id) => !layout.blocks[id].visible);

  return (
    <div className="flex items-center justify-end gap-2 mb-1">
      {editMode && hidden.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar bloco ({hidden.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Blocos ocultos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hidden.map((id) => (
              <DropdownMenuItem key={id} onClick={() => onShowBlock(id)}>
                {layout.blocks[id].title || id}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {editMode && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
        </Button>
      )}
      <Button
        variant={editMode ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={onToggleEdit}
      >
        {editMode ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        {editMode ? "Concluir edição" : "Editar layout"}
      </Button>
    </div>
  );
}