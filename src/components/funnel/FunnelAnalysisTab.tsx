import { useMemo, useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { FunnelPreviewCard } from "@/components/funnel/FunnelPreviewCard";
import { FunnelPremiumDetailDialog } from "@/components/funnel/FunnelPremiumDetailDialog";
import { FunnelChatWidget } from "@/components/funnel/FunnelChatWidget";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { GoogleAdsSummaryCard } from "@/components/dashboard/GoogleAdsSummaryCard";

interface Props {
  clientId: string;
  clientName?: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  currencySymbol?: string;
  readOnly?: boolean;
}

export function FunnelAnalysisTab({
  clientId,
  clientName = "",
  campaigns,
  datePreset,
  currencySymbol = "R$",
  readOnly = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [detailFunnel, setDetailFunnel] = useState<{ code: string; label: string } | null>(null);

  const funnelGroups = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const code = extractFunnelCode(c.name);
      if (!code && c.spend <= 0) continue;
      const fallbackCode = code || `CAMP-${c.id}`;
      const arr = map.get(fallbackCode) || [];
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

  // Apenas funis ativos (com gasto > 0)
  const activeFunnels = useMemo(
    () => funnelGroups.filter((g) => g.campaigns.some((c) => (c.spend || 0) > 0)),
    [funnelGroups],
  );

  const filtered = activeFunnels.filter(
    (g) =>
      !search ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 relative">
      <GoogleAdsSummaryCard clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
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

      {/* Funnel previews — mesmo padrão visual da Visão Geral */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum funil ativo com gasto encontrado para esse período.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Campanhas fora do padrão <code>[F1]_NOME_CAMPANHA</code> agora aparecem como cards avulsos, mas padronizar os nomes melhora o agrupamento.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((g) => (
            <FunnelPreviewCard
              key={g.code}
              clientId={clientId}
              funnelCode={g.code}
              funnelLabel={g.label}
              campaigns={g.campaigns}
              currencySymbol={currencySymbol}
              readOnly={readOnly}
              datePreset={datePreset}
              onOpenDetail={() => setDetailFunnel({ code: g.code, label: g.label })}
            />
          ))}
        </div>
      )}

      {detailFunnel && (
        <FunnelPremiumDetailDialog
          open={!!detailFunnel}
          onClose={() => setDetailFunnel(null)}
          clientId={clientId}
          funnelCode={detailFunnel.code}
          funnelLabel={detailFunnel.label}
          campaigns={
            activeFunnels.find((g) => g.code === detailFunnel.code)?.campaigns || []
          }
          currencySymbol={currencySymbol}
          datePreset={datePreset}
          readOnly={readOnly}
        />
      )}

      {/* Floating AI chat */}
      {!readOnly && (<FunnelChatWidget
        clientId={clientId}
        clientName={clientName}
        campaigns={campaigns}
        datePreset={datePreset}
        currencySymbol={currencySymbol}
      />)}
    </div>
  );
}
