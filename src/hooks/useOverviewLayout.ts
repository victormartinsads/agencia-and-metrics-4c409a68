import { useCallback, useEffect, useState } from "react";

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
}

export interface OverviewLayout {
  order: OverviewBlockId[];
  blocks: Record<OverviewBlockId, BlockConfig>;
}

const DEFAULT_LAYOUT: OverviewLayout = {
  order: ["resultados", "custos", "funil", "lowticket", "leads", "mql", "best-ads", "utm-traffic"],
  blocks: {
    resultados: { id: "resultados", visible: true, title: "Resultados Gerais" },
    custos: { id: "custos", visible: true, title: "Custos", metrics: ["cps", "cpl", "cpc", "cpm"] },
    funil: { id: "funil", visible: true, title: "Funil" },
    lowticket: { id: "lowticket", visible: true, title: "Vendas LowTicket" },
    leads: { id: "leads", visible: true, title: "Leads" },
    mql: { id: "mql", visible: true, title: "MQL & sMQL" },
    "best-ads": {
      id: "best-ads",
      visible: true,
      title: "Melhores Anúncios",
      metrics: ["primaryResult", "conversions"],
    },
    "utm-traffic": {
      id: "utm-traffic",
      visible: true,
      title: "Fontes de Tráfego (UTMs)",
    },
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(clientId));
      setLayout(mergeWithDefaults(raw ? JSON.parse(raw) : null));
    } catch {
      setLayout(DEFAULT_LAYOUT);
    }
  }, [clientId]);

  const persist = useCallback(
    (next: OverviewLayout) => {
      setLayout(next);
      try {
        localStorage.setItem(storageKey(clientId), JSON.stringify(next));
      } catch {
        /* ignore quota errors */
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

  return { layout, moveBlock, toggleVisibility, updateBlock, reset };
}

export const DEFAULT_OVERVIEW_LAYOUT = DEFAULT_LAYOUT;