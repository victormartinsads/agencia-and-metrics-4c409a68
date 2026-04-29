import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OverviewBlockId =
  | "resultados"
  | "custos"
  | "funil"
  | "lowticket"
  | "leads"
  | "mql"
  | "best-ads"
  | "utm-traffic";

export interface BlockConfig {
  id: OverviewBlockId;
  visible: boolean;
  /** Picked metric keys for blocks that support metric selection (best-ads, mql, custos…). */
  metrics?: string[];
  /** Optional override label. */
  title?: string;
  /** Optional data source override (sheets | meta | ga | manual). */
  source?: string;
  /** Grid position: x, y in cols; w, h in cells. (12 cols, ~80px row height) */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface OverviewLayout {
  order: OverviewBlockId[];
  blocks: Record<OverviewBlockId, BlockConfig>;
}

/** Default 12-col grid: cards arranged side-by-side. h is in row units (80px). */
const DEFAULT_LAYOUT: OverviewLayout = {
  order: ["resultados", "custos", "funil", "lowticket", "leads", "mql", "best-ads", "utm-traffic"],
  blocks: {
    resultados:    { id: "resultados",    visible: true, title: "Resultados Gerais", x: 0, y: 0,  w: 8, h: 5 },
    custos:        { id: "custos",        visible: true, title: "Custos", metrics: ["cps", "cpl", "cpc", "cpm"], x: 8, y: 0,  w: 4, h: 5 },
    funil:         { id: "funil",         visible: true, title: "Funil", x: 0, y: 5,  w: 8, h: 6 },
    lowticket:     { id: "lowticket",     visible: true, title: "Vendas LowTicket", x: 8, y: 5,  w: 4, h: 6 },
    leads:         { id: "leads",         visible: true, title: "Leads", x: 0, y: 11, w: 4, h: 4 },
    mql:           { id: "mql",           visible: true, title: "MQL & sMQL", x: 4, y: 11, w: 4, h: 4 },
    "best-ads":    { id: "best-ads",      visible: true, title: "Melhores Anúncios", metrics: ["primaryResult", "conversions"], x: 8, y: 11, w: 4, h: 4 },
    "utm-traffic": { id: "utm-traffic",   visible: true, title: "Fontes de Tráfego (UTMs)", x: 0, y: 15, w: 12, h: 5 },
  },
};

function storageKey(clientId?: string) {
  return `overview-layout:${clientId || "default"}`;
}

function mergeWithDefaults(saved: Partial<OverviewLayout> | null): OverviewLayout {
  if (!saved) return DEFAULT_LAYOUT;
  const blocks = { ...DEFAULT_LAYOUT.blocks } as OverviewLayout["blocks"];
  for (const key of Object.keys(blocks) as OverviewBlockId[]) {
    blocks[key] = { ...blocks[key], ...(saved.blocks?.[key] || {}) };
  }
  const order = (saved.order || DEFAULT_LAYOUT.order).filter((id) => blocks[id]);
  // Append any default blocks that weren't in saved order
  for (const id of DEFAULT_LAYOUT.order) {
    if (!order.includes(id)) order.push(id);
  }
  return { order, blocks };
}

export function useOverviewLayout(clientId?: string) {
  const [layout, setLayout] = useState<OverviewLayout>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);

  // Load from Supabase first; fallback to localStorage; fallback to defaults.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (clientId) {
          const { data } = await (supabase as any)
            .from("overview_layouts")
            .select("layout")
            .eq("client_id", clientId)
            .maybeSingle();
          if (alive && data?.layout) {
            setLayout(mergeWithDefaults(data.layout));
            setLoaded(true);
            return;
          }
        }
        const raw = localStorage.getItem(storageKey(clientId));
        setLayout(mergeWithDefaults(raw ? JSON.parse(raw) : null));
      } catch {
        setLayout(DEFAULT_LAYOUT);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientId]);

  const persist = useCallback(
    (next: OverviewLayout) => {
      setLayout(next);
      try {
        localStorage.setItem(storageKey(clientId), JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      if (clientId) {
        (supabase as any)
          .from("overview_layouts")
          .upsert(
            { client_id: clientId, layout: next, updated_at: new Date().toISOString() },
            { onConflict: "client_id" },
          )
          .then(() => {});
      }
    },
    [clientId],
  );

  const moveBlock = useCallback(
    (id: OverviewBlockId, dir: -1 | 1) => {
      const idx = layout.order.indexOf(id);
      if (idx < 0) return;
      const target = idx + dir;
      if (target < 0 || target >= layout.order.length) return;
      const order = [...layout.order];
      [order[idx], order[target]] = [order[target], order[idx]];
      persist({ ...layout, order });
    },
    [layout, persist],
  );

  const toggleVisibility = useCallback(
    (id: OverviewBlockId) => {
      const current = layout.blocks[id];
      persist({
        ...layout,
        blocks: { ...layout.blocks, [id]: { ...current, visible: !current.visible } },
      });
    },
    [layout, persist],
  );

  const updateBlock = useCallback(
    (id: OverviewBlockId, patch: Partial<BlockConfig>) => {
      const current = layout.blocks[id];
      persist({
        ...layout,
        blocks: { ...layout.blocks, [id]: { ...current, ...patch } },
      });
    },
    [layout, persist],
  );

  const reset = useCallback(() => persist(DEFAULT_LAYOUT), [persist]);

  /** Update grid positions/sizes from react-grid-layout. */
  const updatePositions = useCallback(
    (items: { i: string; x: number; y: number; w: number; h: number }[]) => {
      const blocks = { ...layout.blocks };
      for (const it of items) {
        const id = it.i as OverviewBlockId;
        if (blocks[id]) {
          blocks[id] = { ...blocks[id], x: it.x, y: it.y, w: it.w, h: it.h };
        }
      }
      persist({ ...layout, blocks });
    },
    [layout, persist],
  );

  return { layout, loaded, moveBlock, toggleVisibility, updateBlock, updatePositions, reset };
}

export const DEFAULT_OVERVIEW_LAYOUT = DEFAULT_LAYOUT;