import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const aggregated = useMemo(() => aggregate(rows, tab), [rows, tab]);
  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return aggregated;
    return aggregated.filter((r) => r.name.toLowerCase().includes(q));
  }, [aggregated, query]);
  const max = data[0]?.revenue || 0;

  const totalRevenue = aggregated.reduce((a, b) => a + b.revenue, 0);
  const totalSales = aggregated.reduce((a, b) => a + b.sales, 0);

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Nenhuma UTM mapeada na planilha. Configure as colunas em <strong>Sheets</strong>.
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <TabsList className="bg-muted/40 h-8 flex-wrap">
        {(["source", "medium", "campaign", "content", "term", "all"] as GroupKey[]).map((k) => (
          <TabsTrigger key={k} value={k} className="text-xs h-6">
            {TAB_LABEL[k]}
          </TabsTrigger>
        ))}
        </TabsList>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar UTM..."
              className="h-7 text-xs pl-7 w-44"
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {data.length}/{aggregated.length} • {totalSales} venda(s) • {formatCurrency(totalRevenue, currencySymbol)}
          </span>
        </div>
      </div>
      <TabsContent value={tab} className="mt-0">
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {data.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Nenhum resultado</p>
          )}
          {data.map((d) => {
            const pct = max > 0 ? (d.revenue / max) * 100 : 0;
            const sharePct = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0;
            return (
              <div key={d.name} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate text-card-foreground font-medium" title={d.name}>
                    {d.name}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0 text-[11px]">
                    {formatCurrency(d.revenue, currencySymbol)}
                    <span className="opacity-60"> · {d.sales} venda(s) · {sharePct.toFixed(1)}%</span>
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
