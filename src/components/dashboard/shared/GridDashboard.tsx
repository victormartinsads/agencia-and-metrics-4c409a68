import { ReactNode, useMemo } from "react";
import { Responsive as RGLResponsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/useDashboardLayout";

type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };
const RGL = WidthProvider(RGLResponsive);

export interface DashboardBlock {
  id: string;
  /** default w/h/x/y in 12-column grid */
  defaultLayout?: { w: number; h: number; x?: number; y?: number; minW?: number; minH?: number };
  node: ReactNode;
}

interface Props {
  clientId?: string;
  dashboardKey: string;
  editMode: boolean;
  blocks: DashboardBlock[];
  rowHeight?: number;
  cols?: number;
}

/**
 * Wrapper around react-grid-layout that persists positions per (client, dashboard)
 * and locks drag/resize unless `editMode` is true.
 */
export function GridDashboard({
  clientId, dashboardKey, editMode, blocks, rowHeight = 60, cols = 12,
}: Props) {
  const { data: saved } = useDashboardLayout(clientId, dashboardKey);
  const save = useSaveDashboardLayout();

  const layout: LayoutItem[] = useMemo(() => {
    const byId = new Map<string, LayoutItem>();
    ((saved as any) || []).forEach((l: LayoutItem) => byId.set(l.i, l));
    let cursorY = 0;
    return blocks.map((b, idx) => {
      const existing = byId.get(b.id);
      if (existing) return existing;
      const def = b.defaultLayout || { w: 12, h: 4 };
      const x = def.x ?? ((idx * (def.w)) % cols);
      const y = def.y ?? cursorY;
      cursorY += def.h;
      return { i: b.id, x, y, w: def.w, h: def.h, minW: def.minW || 2, minH: def.minH || 2 };
    });
  }, [saved, blocks, cols]);

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    if (!editMode || !clientId) return;
    save.mutate({ clientId, dashboardKey, layout: newLayout as any });
  };

  return (
    <RGL
      className={`layout ${editMode ? "is-editing" : ""}`}
      layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: cols, md: cols, sm: cols, xs: 4, xxs: 2 }}
      rowHeight={rowHeight}
      isDraggable={editMode}
      isResizable={editMode}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".rgl-drag-handle"
      margin={[16, 16]}
      containerPadding={[0, 0]}
    >
      {blocks.map(b => (
        <div key={b.id} className="overflow-hidden">
          {b.node}
        </div>
      ))}
    </RGL>
  );
}