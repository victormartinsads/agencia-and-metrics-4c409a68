import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OverviewBlockId, OverviewLayout } from "./useOverviewLayout";

export type TemplateKey = "ecommerce" | "infoproduto" | "leads" | "servicos" | "custom";

export interface TemplateDef {
  key: TemplateKey;
  name: string;
  description: string;
  /** Which blocks should be visible by default for this preset. */
  visibleBlocks: OverviewBlockId[];
  /** Suggested order. */
  order: OverviewBlockId[];
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: "ecommerce",
    name: "E-commerce",
    description: "Foco em ROAS, vendas, ticket médio e funil de compra.",
    order: ["resultados", "custos", "funil", "lowticket", "best-ads", "utm-traffic", "leads", "mql"],
    visibleBlocks: ["resultados", "custos", "funil", "lowticket", "best-ads", "utm-traffic"],
  },
  {
    key: "infoproduto",
    name: "Infoproduto",
    description: "Foco em low-ticket, leads, conversão e melhores criativos.",
    order: ["resultados", "lowticket", "leads", "mql", "custos", "best-ads", "funil", "utm-traffic"],
    visibleBlocks: ["resultados", "lowticket", "leads", "mql", "best-ads", "funil"],
  },
  {
    key: "leads",
    name: "Geração de Leads",
    description: "Foco em CPL, leads qualificados (MQL/sMQL) e funil.",
    order: ["resultados", "leads", "mql", "custos", "funil", "best-ads", "utm-traffic", "lowticket"],
    visibleBlocks: ["resultados", "leads", "mql", "custos", "funil", "best-ads"],
  },
  {
    key: "servicos",
    name: "Serviços / Agendamento",
    description: "Foco em conversas, leads e funil.",
    order: ["resultados", "leads", "mql", "funil", "custos", "best-ads", "utm-traffic", "lowticket"],
    visibleBlocks: ["resultados", "leads", "mql", "funil", "custos", "utm-traffic"],
  },
  {
    key: "custom",
    name: "Personalizado",
    description: "Mantém o layout que você editar manualmente.",
    order: [],
    visibleBlocks: [],
  },
];

/** Returns the active template key for a client (persisted). */
export function useOverviewTemplate(clientId?: string) {
  const [templateKey, setTemplateKey] = useState<TemplateKey>("custom");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!clientId) {
        setLoaded(true);
        return;
      }
      try {
        const { data } = await (supabase as any)
          .from("overview_templates")
          .select("template_key")
          .eq("client_id", clientId)
          .maybeSingle();
        if (alive && data?.template_key) setTemplateKey(data.template_key as TemplateKey);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [clientId]);

  const persist = useCallback(async (key: TemplateKey) => {
    setTemplateKey(key);
    if (!clientId) return;
    await (supabase as any)
      .from("overview_templates")
      .upsert(
        { client_id: clientId, template_key: key, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      );
  }, [clientId]);

  return { templateKey, setTemplateKey: persist, loaded };
}

/** Apply a template preset over a base layout (toggles visibility + reorders). */
export function applyTemplateToLayout(layout: OverviewLayout, key: TemplateKey): OverviewLayout {
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def || key === "custom") return layout;
  const blocks = { ...layout.blocks };
  for (const id of Object.keys(blocks) as OverviewBlockId[]) {
    blocks[id] = { ...blocks[id], visible: def.visibleBlocks.includes(id) };
  }
  // Build order: template order first (only known), then any leftover.
  const order: OverviewBlockId[] = [];
  for (const id of def.order) if (blocks[id] && !order.includes(id)) order.push(id);
  for (const id of layout.order) if (!order.includes(id)) order.push(id);
  return { order, blocks };
}