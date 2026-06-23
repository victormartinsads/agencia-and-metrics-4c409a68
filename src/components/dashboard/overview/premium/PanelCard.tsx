import { ReactNode } from "react";
import { EyeOff, GripVertical, Settings2 } from "lucide-react";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  subtitle?: ReactNode;
  /** When set with onHide, shows a hide button in edit mode. */
  panelId?: string;
  editMode?: boolean;
  onHide?: (panelId: string) => void;
  /** When provided + editMode, shows a "configure source" button (gear). */
  onConfigureSource?: (panelId: string) => void;
  /** Optional badge after title (e.g., source label). */
  sourceBadge?: ReactNode;
}

export function PanelCard({
  title, actions, children, className, noPadding, subtitle,
  panelId, editMode, onHide, onConfigureSource, sourceBadge,
}: Props) {
  return (
    <section className={`rounded-2xl bg-black/40 backdrop-blur-xl border ${editMode ? "border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/30" : "border-white/5"} shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col h-full transition-all duration-300 ${className || ""}`}>
      <header className={`flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02] ${editMode ? "rgl-drag-handle cursor-move" : ""}`}>
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/70" />}
          <h3
            className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/90"
            style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
          >
            {title}
          </h3>
          {subtitle && <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>}
          {sourceBadge}
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          {editMode && panelId && onConfigureSource && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfigureSource(panelId); }}
              title="Configurar fonte de dados"
              className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
          {editMode && panelId && onHide && (
            <button
              onClick={(e) => { e.stopPropagation(); onHide(panelId); }}
              title="Ocultar bloco"
              className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>
      <div className={`flex-1 overflow-auto ${noPadding ? "" : "p-5"}`}>{children}</div>
    </section>
  );
}