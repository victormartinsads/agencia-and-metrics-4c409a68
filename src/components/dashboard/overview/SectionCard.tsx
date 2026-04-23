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
        "relative rounded-2xl glass-card glass-card-hover overflow-hidden",
        editMode && "ring-edit",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      {/* decorative top neon line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {(title || editMode) && (
        <div className="flex items-center justify-between gap-2 mb-4">
          {title ? (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary neon-glow" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </h3>
            </div>
          ) : (
            <span />
          )}
          {editMode && (
            <div className="flex items-center gap-1">
              {onConfigure && (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={onConfigure} title="Configurar">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {onMoveUp && (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={onMoveUp} title="Mover para cima">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {onMoveDown && (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={onMoveDown} title="Mover para baixo">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              )}
              {onHide && (
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={onHide} title="Ocultar bloco">
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