import { ReactNode } from "react";
import { ArrowDown, ArrowUp, EyeOff, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  /** Editor controls (rendered only when editMode is true). */
  editMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onHide?: () => void;
  onConfigure?: () => void;
}

export function SectionCard({
  title,
  children,
  className,
  compact,
  editMode,
  onMoveUp,
  onMoveDown,
  onHide,
  onConfigure,
}: Props) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card shadow-sm transition-colors",
        editMode && "ring-1 ring-primary/40 border-primary/30",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      {(title || editMode) && (
        <div className="flex items-center justify-between gap-2 mb-4">
          {title ? (
            <h3 className="text-[13px] font-bold text-card-foreground tracking-tight">{title}</h3>
          ) : (
            <span />
          )}
          {editMode && (
            <div className="flex items-center gap-1">
              {onConfigure && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onConfigure} title="Configurar">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {onMoveUp && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} title="Mover para cima">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {onMoveDown && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} title="Mover para baixo">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              )}
              {onHide && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onHide} title="Ocultar bloco">
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}