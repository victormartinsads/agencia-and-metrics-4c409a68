import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";

export interface SheetUtmRow {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  sales: number;
  revenue: number;
}

type GroupKey = "source" | "medium" | "campaign" | "content" | "term" | "all";

const TAB_LABEL: Record<GroupKey, string> = {
  source: "Source",
  medium: "Medium",
  campaign: "Campaign",
  content: "Content",
  term: "Term",
  all: "Combinação",
};

interface Props {
  rows: SheetUtmRow[];
  currencySymbol: string;
}

function aggregate(rows: SheetUtmRow[], by: GroupKey) {
  const map = new Map<string, { revenue: number; sales: number }>();
  for (const r of rows) {
    const key = by === "all"
      ? [r.source, r.medium, r.campaign, r.content, r.term].map((v) => v || "—").join(" · ")
      : (r[by] || "(vazio)");
    const cur = map.get(key) || { revenue: 0, sales: 0 };
    cur.revenue += r.revenue;
    cur.sales += r.sales;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function SheetUtmTable({ rows, currencySymbol }: Props) {
  const [tab, setTab] = useState<GroupKey>("source");
  const data = useMemo(() => aggregate(rows, tab), [rows, tab]);
  const max = data[0]?.revenue || 0;

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Nenhuma UTM mapeada na planilha. Configure as colunas em <strong>Sheets</strong>.
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
      <TabsList className="bg-muted/40 h-8 mb-3 flex-wrap">
        {(["source", "medium", "campaign", "content", "term", "all"] as GroupKey[]).map((k) => (
          <TabsTrigger key={k} value={k} className="text-xs h-6">
            {TAB_LABEL[k]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab} className="mt-0">
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {data.slice(0, 25).map((d) => {
            const pct = max > 0 ? (d.revenue / max) * 100 : 0;
            return (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate text-card-foreground font-medium" title={d.name}>
                    {d.name}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0">
                    {formatCurrency(d.revenue, currencySymbol)}{" "}
                    <span className="opacity-60">· {d.sales} venda(s)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
