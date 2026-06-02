import { ReactNode, useMemo } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/useDashboardLayout";

const RGL = WidthProvider(Responsive);

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
  const isDemoClient = clientId === "11111111-1111-1111-1111-111111111111";
  const { data: saved } = useDashboardLayout(isDemoClient ? undefined : clientId, dashboardKey);
  const save = useSaveDashboardLayout();

  const layout: Layout[] = useMemo(() => {
    const savedLayouts = ((saved as any) || []).slice().sort((a: any, b: any) => a.y - b.y);

    const grid: boolean[][] = [];
    const isAreaFree = (startX: number, startY: number, w: number, h: number): boolean => {
      for (let y = startY; y < startY + h; y++) {
        if (!grid[y]) grid[y] = Array(cols).fill(false);
        for (let x = startX; x < startX + w; x++) {
          if (x >= cols) return false;
          if (grid[y][x]) return false;
        }
      }
      return true;
    };

    const occupyArea = (startX: number, startY: number, w: number, h: number) => {
      for (let y = startY; y < startY + h; y++) {
        if (!grid[y]) grid[y] = Array(cols).fill(false);
        for (let x = startX; x < startX + w; x++) {
          grid[y][x] = true;
        }
      }
    };

    const compactedSaved = new Map<string, Layout>();

    savedLayouts.forEach((l: Layout) => {
      const w = Math.min(l.w, cols);
      const h = l.h;
      let foundY = 0;
      let placed = false;

      for (let y = 0; y <= l.y; y++) {
        if (isAreaFree(l.x, y, w, h)) {
          foundY = y;
          placed = true;
          break;
        }
      }

      if (!placed) {
        for (let y = 0; y < 1000; y++) {
          if (isAreaFree(l.x, y, w, h)) {
            foundY = y;
            break;
          }
        }
      }

      occupyArea(l.x, foundY, w, h);
      compactedSaved.set(l.i, {
        ...l,
        y: foundY,
        w,
      });
    });

    return blocks.map((b) => {
      const existing = compactedSaved.get(b.id);
      if (existing) {
        return existing;
      }

      const def = b.defaultLayout || { w: 12, h: 4 };
      const w = Math.min(def.w, cols);
      const h = def.h;

      // Se o defaultLayout tem x e y explícitos, usa diretamente (layout fixo padrão).
      if (def.x !== undefined && def.y !== undefined) {
        const x = def.x;
        const y = def.y;
        occupyArea(x, y, w, h);
        return {
          i: b.id,
          x,
          y,
          w,
          h,
          minW: def.minW || 2,
          minH: def.minH || 2,
        };
      }

      // Caso contrário, faz packing automático.
      let foundX = 0;
      let foundY = 0;
      let placed = false;

      for (let y = 0; !placed && y < 1000; y++) {
        for (let x = 0; !placed && x <= cols - w; x++) {
          if (isAreaFree(x, y, w, h)) {
            foundX = x;
            foundY = y;
            placed = true;
          }
        }
      }

      occupyArea(foundX, foundY, w, h);
      return {
        i: b.id,
        x: foundX,
        y: foundY,
        w,
        h,
        minW: def.minW || 2,
        minH: def.minH || 2,
      };
    });
  }, [saved, blocks, cols]);

  const handleLayoutChange = (newLayout: Layout[]) => {
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