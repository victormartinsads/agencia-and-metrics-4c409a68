import { useMemo, useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { FunnelCard } from "@/components/funnel/FunnelCard";
import { FunnelChatWidget } from "@/components/funnel/FunnelChatWidget";
import { FunnelMetricsCards } from "@/components/funnel/FunnelMetricsCards";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Layers, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

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
  const analysis = useFunnelAnalysis(campaigns);

  const funnelGroups = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const code = extractFunnelCode(c.name);
      if (!code) continue;
      const arr = map.get(code) || [];
      arr.push(c);
      map.set(code, arr);
    }
    return FUNNEL_DEFINITIONS.filter((d) => map.has(d.code)).map((d) => ({
      code: d.code,
      label: d.label,
      campaigns: map.get(d.code) || [],
    }));
  }, [campaigns]);

  const filtered = funnelGroups.filter(
    (g) =>
      !search ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.label.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRevenue = analysis.totalPurchaseValue;
  const totalSpend = analysis.totalSpend;

  return (
    <div className="space-y-5 relative">
      {/* Header summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Funis ativos</p>
          </div>
          <p className="text-2xl font-bold mt-1">{funnelGroups.length}</p>
          <p className="text-[10px] text-muted-foreground">{campaigns.length} campanhas no total</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Investido</p>
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(totalSpend, currencySymbol)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Receita</p>
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums text-primary">
            {formatCurrency(totalRevenue, currencySymbol)}
          </p>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">ROAS Geral</p>
          </div>
          <p className="text-2xl font-bold mt-1 tabular-nums text-emerald-400">
            {analysis.metrics.roas.toFixed(2)}x
          </p>
        </Card>
      </div>

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
            Nenhuma campanha com prefixo F1–F15 encontrada para esse período.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Renomeie suas campanhas no padrão <code>[F1]_NOME_CAMPANHA</code> para que apareçam aqui.
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

      {/* Aggregate metrics for context */}
      <Card className="p-4">
        <h3 className="text-sm font-bold mb-3">Métricas consolidadas da conta</h3>
        <FunnelMetricsCards
          metrics={analysis.metrics}
          totalSpend={analysis.totalSpend}
          totalPurchaseValue={analysis.totalPurchaseValue}
        />
      </Card>

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
