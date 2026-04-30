import { useMemo, useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { FunnelCard } from "@/components/funnel/FunnelCard";
import { FunnelChatWidget } from "@/components/funnel/FunnelChatWidget";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Layers, Settings2 } from "lucide-react";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { ALL_FUNNEL_METRICS } from "@/hooks/useFunnelCardConfig";
import { useFunnelCardConfig, useSaveFunnelCardConfig } from "@/hooks/useFunnelCardConfig";

interface Props {
  clientId: string;
  clientName?: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  currencySymbol?: string;
}

export function FunnelAnalysisTab({
  clientId,
  clientName = "",
  campaigns,
  datePreset,
  currencySymbol = "R$",
}: Props) {
  const [search, setSearch] = useState("");
  const [openConsolidatedSettings, setOpenConsolidatedSettings] = useState(false);

  // Consolidated metrics (all campaigns)
  const consolidatedTotals = useMemo(
    () => aggregateCampaignMetrics(campaigns),
    [campaigns],
  );

  // Reuse the funnel_card_config table with a sentinel funnel_code to persist
  // which consolidated metrics are visible (per client).
  const CONSOLIDATED_KEY = "__CONSOLIDATED__";
  const { data: configMap } = useFunnelCardConfig(clientId);
  const saveCfg = useSaveFunnelCardConfig();
  const consolidatedSelected =
    configMap?.[CONSOLIDATED_KEY] ||
    ["spend", "purchaseValue", "roas", "conversions", "cpa", "ctr", "impressions", "cpm"];
  const [draftConsolidated, setDraftConsolidated] = useState<string[]>(consolidatedSelected);
  useMemo(
    () => setDraftConsolidated(consolidatedSelected),
    [consolidatedSelected.join(",")],
  );

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
      const fallbackCode = code || `CAMP-${c.id}`;
      const arr = map.get(code) || [];
      arr.push(c);
      map.set(fallbackCode, arr);
    }
    const orderedFunnels = FUNNEL_DEFINITIONS.filter((d) => map.has(d.code)).map((d) => ({
      code: d.code,
      label: d.label,
      campaigns: map.get(d.code) || [],
    }));

    const fallbackFunnels = Array.from(map.entries())
      .filter(([key]) => !FUNNEL_DEFINITIONS.some((d) => d.code === key))
      .map(([key, items]) => ({
        code: key,
        label: items[0]?.name || key,
        campaigns: items,
      }))
      .sort((a, b) => b.campaigns.reduce((sum, c) => sum + c.spend, 0) - a.campaigns.reduce((sum, c) => sum + c.spend, 0));

    return [...orderedFunnels, ...fallbackFunnels];
  }, [campaigns]);

  const filtered = funnelGroups.filter(
    (g) =>
      !search ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 relative">
      {/* Consolidated header — editable */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold">Métricas consolidadas da conta</h3>
              <p className="text-[10px] text-muted-foreground">
                {funnelGroups.length} funis • {campaigns.length} campanhas
              </p>
            </div>
          </div>
          <Dialog open={openConsolidatedSettings} onOpenChange={setOpenConsolidatedSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Métricas consolidadas</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground -mt-2">
                Escolha quais métricas exibir no topo da Análise de Funis.
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
                          const checked = draftConsolidated.includes(m.key);
                          return (
                            <label
                              key={m.key}
                              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setDraftConsolidated((prev) =>
                                    v ? [...prev, m.key] : prev.filter((k) => k !== m.key),
                                  );
                                }}
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
                <Button variant="outline" size="sm" onClick={() => setOpenConsolidatedSettings(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await saveCfg.mutateAsync({
                      clientId,
                      funnelCode: CONSOLIDATED_KEY,
                      metrics: draftConsolidated,
                    });
                    setOpenConsolidatedSettings(false);
                  }}
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {consolidatedSelected.map((key) => {
            const meta = ALL_FUNNEL_METRICS.find((m) => m.key === key);
            if (!meta) return null;
            const value = (consolidatedTotals as any)[key] ?? 0;
            return (
              <div key={key} className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
                  {meta.label}
                </p>
                <p className="text-base font-bold tabular-nums truncate mt-0.5">
                  {formatMetricValue(key, value, currencySymbol)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold">Análise por Funil</h2>
          <p className="text-xs text-muted-foreground">
            Cada card mostra as métricas relevantes do funil. Personalize com o ⚙️ e adicione notas com 📝.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar funil…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Funnel grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha com gasto encontrada para esse período.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Campanhas fora do padrão <code>[F1]_NOME_CAMPANHA</code> agora aparecem como cards avulsos, mas padronizar os nomes melhora o agrupamento.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((g) => (
            <FunnelCard
              key={g.code}
              clientId={clientId}
              funnelCode={g.code}
              funnelLabel={g.label}
              campaigns={g.campaigns}
              currencySymbol={currencySymbol}
              datePreset={datePreset}
            />
          ))}
        </div>
      )}

      {/* Floating AI chat */}
      <FunnelChatWidget
        clientId={clientId}
        clientName={clientName}
        campaigns={campaigns}
        datePreset={datePreset}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
