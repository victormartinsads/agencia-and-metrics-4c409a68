import { useMemo } from "react";
import { useGoogleAds, type GoogleAdsCampaign } from "@/hooks/useGoogleAds";
import { useGoogleConnectionStatus } from "@/hooks/useGoogleAnalytics";
import { Target, Loader2, Play, Pause } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Props {
  clientId?: string;
  datePreset?: string;
  campaigns?: GoogleAdsCampaign[];
  currencySymbol?: string;
}

export function DiagnosticoGoogleCampaignsSection({
  clientId,
  datePreset = "last_7d",
  campaigns: staticCampaigns,
  currencySymbol = "R$",
}: Props) {
  // Check connection status if loading live data
  const { data: status } = useGoogleConnectionStatus(
    clientId && !staticCampaigns ? clientId : undefined
  );
  const isConnected = staticCampaigns ? true : status?.connected === true;

  // Query Google Ads live data
  const { data: liveData, isLoading } = useGoogleAds(
    clientId && !staticCampaigns ? clientId : undefined,
    datePreset,
    isConnected && !staticCampaigns
  );

  const rawCampaigns = staticCampaigns || liveData?.campaigns || [];

  // Filter campaigns with cost > 0 or impressions > 0, and sort by cost descending
  const campaignsList = useMemo(() => {
    return rawCampaigns
      .filter((c) => c.cost > 0 || c.impressions > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [rawCampaigns]);

  if (!isConnected || liveData?.notConnected || liveData?.needsCustomerId || (!isLoading && campaignsList.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Carregando campanhas do Google Ads...</span>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-card-foreground">Campanhas do Google Ads</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Desempenho e investimento das campanhas ativas no Google Ads
          </p>
        </div>
        <span className="text-[10px] font-medium bg-primary/15 text-primary px-2.5 py-1 rounded-full border border-primary/20 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Google Ads Conectado
        </span>
      </header>

      {/* Table grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/20 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Campanha</th>
                <th className="text-right px-3 py-2.5 font-medium">Invest.</th>
                <th className="text-right px-3 py-2.5 font-medium">Cliques</th>
                <th className="text-right px-3 py-2.5 font-medium">CTR</th>
                <th className="text-right px-3 py-2.5 font-medium">Conversões</th>
                <th className="text-right px-3 py-2.5 font-medium">CPA</th>
                <th className="text-right px-3 py-2.5 font-medium">ROAS</th>
                <th className="text-center px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaignsList.map((c) => {
                const cpa = c.conversions > 0 ? c.cost / c.conversions : 0;
                const ctr = c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0);
                const roas = c.cost > 0 ? c.revenue / c.cost : 0;
                const isStatusActive = c.status?.toLowerCase() === "enabled" || c.status?.toLowerCase() === "active";

                return (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-3 text-card-foreground font-medium truncate max-w-[280px]" title={c.name}>
                      {c.name}
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-mono">
                      {formatCurrency(c.cost, currencySymbol)}
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-mono">
                      {c.clicks.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-mono">
                      {ctr.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-semibold font-mono">
                      {c.conversions.toFixed(0)}
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-mono">
                      {cpa > 0 ? formatCurrency(cpa, currencySymbol) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-card-foreground font-mono">
                      {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                          isStatusActive
                            ? "bg-green-500/15 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isStatusActive ? (
                          <>
                            <Play className="h-2 w-2 fill-green-500" /> Ativa
                          </>
                        ) : (
                          <>
                            <Pause className="h-2 w-2 fill-muted-foreground" /> Pausada
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
