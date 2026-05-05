import { useMemo, useState } from "react";
import { Campaign } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { ALL_FUNNEL_METRICS } from "@/hooks/useFunnelCardConfig";
import { useFunnelLeadMapping } from "@/hooks/useFunnelLeadMapping";
import {
  useFunnelManualMetrics,
  formatManualMetric,
} from "@/hooks/useFunnelManualMetrics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Search, Table as TableIcon } from "lucide-react";

const STORAGE_KEY = (clientId: string) => `metrics-spreadsheet-cols:${clientId}`;

const DEFAULT_COLS = [
  "spend",
  "impressions",
  "reach",
  "linkClicks",
  "ctr",
  "landingPageViews",
  "leads",
  "cpl",
  "purchases",
  "purchaseValue",
  "roas",
  "cpa",
];

interface Props {
  clientId: string;
  campaigns: Campaign[];
  currencySymbol?: string;
}

export function MetricsSpreadsheet({ clientId, campaigns, currencySymbol = "R$" }: Props) {
  const [search, setSearch] = useState("");
  const [openCols, setOpenCols] = useState(false);

  const [columns, setColumns] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(clientId));
      return raw ? JSON.parse(raw) : DEFAULT_COLS;
    } catch {
      return DEFAULT_COLS;
    }
  });
  const [draftCols, setDraftCols] = useState<string[]>(columns);

  const { data: leadMap } = useFunnelLeadMapping(clientId);
  const { data: manualMap } = useFunnelManualMetrics(clientId);

  const groupedMetrics = useMemo(() => {
    const groups: Record<string, typeof ALL_FUNNEL_METRICS> = {};
    for (const m of ALL_FUNNEL_METRICS) {
      const g = m.group || "outros";
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }
    return groups;
  }, []);
  const groupLabels: Record<string, string> = {
    performance: "Performance",
    alcance: "Alcance",
    trafego: "Tráfego",
    engajamento: "Engajamento",
    video: "Vídeo",
    leads: "Leads / Conversões",
    vendas: "Vendas",
    custos: "Custos",
  };

  const funnelGroups = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const code = extractFunnelCode(c.name);
      if (!code && c.spend <= 0) continue;
      const fb = code || `CAMP-${c.id}`;
      const arr = map.get(fb) || [];
      arr.push(c);
      map.set(fb, arr);
    }
    const ordered = FUNNEL_DEFINITIONS.filter((d) => map.has(d.code)).map((d) => ({
      code: d.code,
      label: d.label,
      campaigns: map.get(d.code) || [],
    }));
    const fallback = Array.from(map.entries())
      .filter(([k]) => !FUNNEL_DEFINITIONS.some((d) => d.code === k))
      .map(([k, items]) => ({ code: k, label: items[0]?.name || k, campaigns: items }));
    return [...ordered, ...fallback];
  }, [campaigns]);

  const filtered = funnelGroups.filter(
    (g) =>
      !search ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.label.toLowerCase().includes(search.toLowerCase()),
  );

  const persistCols = (cols: string[]) => {
    setColumns(cols);
    try {
      localStorage.setItem(STORAGE_KEY(clientId), JSON.stringify(cols));
    } catch {}
  };

  // Collect all manual metric labels across funis to show as extra columns
  const manualColumns = useMemo(() => {
    const set = new Set<string>();
    Object.values(manualMap || {}).forEach((arr) => arr.forEach((m) => set.add(m.metric_label)));
    return Array.from(set);
  }, [manualMap]);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold">Planilha de Métricas</h3>
              <p className="text-[10px] text-muted-foreground">
                Visão consolidada por funil — escolha as colunas e adicione métricas manuais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar funil…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Dialog open={openCols} onOpenChange={(v) => { setOpenCols(v); if (v) setDraftCols(columns); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> Colunas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Colunas da planilha</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">
                  Catálogo completo de métricas da Meta. Escolha o que quer ver na tabela.
                </p>
                <ScrollArea className="max-h-[60vh] pr-3">
                  <div className="space-y-3">
                    {Object.entries(groupedMetrics).map(([group, items]) => (
                      <div key={group}>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          {groupLabels[group] || group}
                        </p>
                        <div className="space-y-0.5">
                          {items.map((m) => {
                            const checked = draftCols.includes(m.key);
                            return (
                              <label
                                key={m.key}
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    setDraftCols((prev) =>
                                      v ? [...prev, m.key] : prev.filter((k) => k !== m.key),
                                    )
                                  }
                                />
                                <span className="flex-1">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {m.key}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenCols(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      persistCols(draftCols);
                      setOpenCols(false);
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-muted/40 z-10 min-w-[200px] border-b border-border/40">
                  Funil
                </th>
                {columns.map((key) => {
                  const meta = ALL_FUNNEL_METRICS.find((m) => m.key === key);
                  return (
                    <th key={key} className="text-right px-3 py-2 font-semibold whitespace-nowrap border-b border-border/40">
                      {meta?.label || key}
                    </th>
                  );
                })}
                {manualColumns.map((label) => (
                  <th
                    key={`manual-${label}`}
                    className="text-right px-3 py-2 font-semibold whitespace-nowrap text-primary border-b border-border/40"
                    title="Métrica manual"
                  >
                    {label} *
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, idx) => {
                const totals = aggregateCampaignMetrics(g.campaigns, {
                  leadActionTypes: leadMap?.[g.code] || [],
                });
                const manuals = manualMap?.[g.code] || [];
                return (
                  <tr
                    key={g.code}
                    className={`border-b border-border/20 hover:bg-muted/20 ${idx % 2 === 0 ? "bg-background" : "bg-muted/5"}`}
                  >
                    <td className="px-3 py-2 sticky left-0 z-10 bg-inherit border-r border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {g.code}
                        </span>
                        <span className="font-medium truncate max-w-[200px]" title={g.label}>
                          {g.label.replace(/^F\d+\s*[\-—]\s*/, "")}
                        </span>
                      </div>
                    </td>
                    {columns.map((key) => {
                      const value = (totals as any)[key] ?? 0;
                      return (
                        <td key={key} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatMetricValue(key, value, currencySymbol)}
                        </td>
                      );
                    })}
                    {manualColumns.map((label) => {
                      const m = manuals.find((mm) => mm.metric_label === label);
                      return (
                        <td
                          key={`manual-${label}`}
                          className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-primary/90"
                        >
                          {m
                            ? formatManualMetric(Number(m.metric_value), m.metric_format, currencySymbol)
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum funil encontrado para esse período.
            </div>
          )}
        </div>
        {manualColumns.length > 0 && (
          <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border/40">
            * Colunas marcadas são métricas manuais adicionadas em cada funil. Edite-as nos cards da aba "Análise de Funis".
          </p>
        )}
      </Card>
    </div>
  );
}