import { useMemo, useState } from "react";
import { GAUtm } from "@/hooks/useGoogleAnalytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  utms: GAUtm[];
  currencySymbol?: string;
}

type GroupKey = "source" | "medium" | "campaign" | "content" | "term" | "all";

function aggregate(utms: GAUtm[], key: GroupKey) {
  if (key === "all") {
    return utms.map((u, i) => ({
      name: `${u.source} / ${u.medium} / ${u.campaign}`,
      detail: u,
      key: `${u.source}|${u.medium}|${u.campaign}|${u.content || ""}|${u.term || ""}|${i}`,
      sessions: u.sessions,
      users: u.users,
      engagedSessions: u.engagedSessions,
      conversions: u.conversions || 0,
      revenue: u.revenue || 0,
    }));
  }
  const map = new Map<
    string,
    { sessions: number; users: number; engagedSessions: number; conversions: number; revenue: number }
  >();
  for (const u of utms) {
    const k = (u as any)[key] || "(not set)";
    const cur = map.get(k) || { sessions: 0, users: 0, engagedSessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += u.sessions;
    cur.users += u.users;
    cur.engagedSessions += u.engagedSessions;
    cur.conversions += u.conversions || 0;
    cur.revenue += u.revenue || 0;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, key: name, detail: null, ...v }))
    .sort((a, b) => b.sessions - a.sessions);
}

const fmtN = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtMoney = (n: number, sym: string) =>
  `${sym} ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function UtmTrafficTable({ utms, currencySymbol = "R$" }: Props) {
  const [tab, setTab] = useState<GroupKey>("source");
  const [q, setQ] = useState("");

  const data = useMemo(() => {
    const agg = aggregate(utms, tab);
    if (!q.trim()) return agg;
    const needle = q.toLowerCase();
    return agg.filter((d) => d.name.toLowerCase().includes(needle));
  }, [utms, tab, q]);

  if (utms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Nenhum dado de UTM encontrado no período. Conecte o GA4 e configure UTMs nas suas campanhas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="bg-muted/40 h-8">
            <TabsTrigger value="source" className="text-xs h-6">Source</TabsTrigger>
            <TabsTrigger value="medium" className="text-xs h-6">Medium</TabsTrigger>
            <TabsTrigger value="campaign" className="text-xs h-6">Campaign</TabsTrigger>
            <TabsTrigger value="content" className="text-xs h-6">Content</TabsTrigger>
            <TabsTrigger value="term" className="text-xs h-6">Term</TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-6">Tudo</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar..."
              className="h-7 pl-7 text-xs w-44"
            />
          </div>
        </div>

        <TabsContent value={tab} className="mt-3">
          <div className="overflow-x-auto rounded-lg border border-border/60 max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0 backdrop-blur">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{tab === "all" ? "source / medium / campaign" : tab}</th>
                  <th className="px-3 py-2 font-medium text-right">Sessões</th>
                  <th className="px-3 py-2 font-medium text-right">Usuários</th>
                  <th className="px-3 py-2 font-medium text-right">Engajadas</th>
                  <th className="px-3 py-2 font-medium text-right">Conversões</th>
                  <th className="px-3 py-2 font-medium text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 100).map((d) => (
                  <tr key={d.key} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-3 py-1.5 max-w-[260px]">
                      <span className="block truncate text-card-foreground font-medium" title={d.name}>
                        {d.name}
                      </span>
                      {tab === "all" && d.detail && (d.detail.content !== "(not set)" || d.detail.term !== "(not set)") && (
                        <span className="block text-[10px] text-muted-foreground truncate">
                          content: {d.detail.content} · term: {d.detail.term}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(d.sessions)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(d.users)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(d.engagedSessions)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-primary">{fmtN(d.conversions)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(d.revenue, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Mostrando {Math.min(data.length, 100)} de {data.length} entradas. Conexão: GA4.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}