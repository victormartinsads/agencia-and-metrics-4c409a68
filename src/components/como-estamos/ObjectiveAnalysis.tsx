import { motion } from "framer-motion";
import { useMemo } from "react";
import type { ObjectiveGroup } from "@/hooks/useComoEstamos";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { CreativePodium } from "@/components/como-estamos/CreativePodium";
import type { Campaign, Creative } from "@/data/mockMetaData";

interface Props {
  groups: ObjectiveGroup[];
  currencySymbol?: string;
  campaigns?: Campaign[];
  clientId?: string;
}

export function ObjectiveAnalysis({ groups, currencySymbol = "R$", campaigns = [], clientId }: Props) {
  // Criativos somente dos funis F1 (Captação Seguidores) e F2 (Corredor Japonês)
  const distributionPodium = useMemo(() => {
    const wanted = new Set(["F1", "F2"]);
    const labelByCode: Record<string, string> = Object.fromEntries(
      FUNNEL_DEFINITIONS.map((f) => [f.code, f.label]),
    );
    const creatives: (Creative & { campaignName: string })[] = [];
    for (const c of campaigns) {
      const code = extractFunnelCode(c.name);
      if (!code || !wanted.has(code)) continue;
      const label = labelByCode[code] || c.name;
      for (const cr of c.creatives || []) creatives.push({ ...cr, campaignName: label });
    }
    const byCPA = [...creatives]
      .filter((c) => c.conversions > 0)
      .sort((a, b) => a.spend / a.conversions - b.spend / b.conversions)
      .slice(0, 3);
    const byCTR = [...creatives]
      .filter((c) => c.impressions > 500)
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 3);
    const byConv = [...creatives]
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 3);
    return { creatives, byCPA, byCTR, byConv };
  }, [campaigns]);

  if (groups.length === 0 && distributionPodium.creatives.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h3
        className="text-lg font-bold text-card-foreground"
        style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
      >
        🎯 Distribuição por Objetivo
      </h3>

      {distributionPodium.creatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Pódio — Captação de Seguidores + Corredor Japonês
          </p>
          <CreativePodium
            byCPA={distributionPodium.byCPA}
            byCTR={distributionPodium.byCTR}
            byConversions={distributionPodium.byConv}
            clientId={clientId}
            currencySymbol={currencySymbol}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.objective} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-card-foreground">{g.objective}</h4>
              <span className="text-xs text-muted-foreground">{g.campaigns.length} campanha(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Investimento</p>
                <p className="font-semibold">{currencySymbol} {g.totalSpend.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultados</p>
                <p className="font-semibold">{g.totalResults}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPA Médio</p>
                <p className="font-semibold">{currencySymbol} {g.avgCPA.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR Médio</p>
                <p className="font-semibold">{g.avgCTR.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
