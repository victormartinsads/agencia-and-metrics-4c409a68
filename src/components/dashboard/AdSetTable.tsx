import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";

interface AdSetMetrics {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  adsCount: number;
}

interface Props {
  campaign: Campaign;
  currencySymbol?: string;
}

export function AdSetTable({ campaign, currencySymbol = "R$" }: Props) {
  const adSetMap = new Map<string, AdSetMetrics>();

  for (const cr of campaign.creatives) {
    const setName = cr.adsetName || "Sem conjunto";
    const existing = adSetMap.get(setName);
    const result = cr.primaryResult ?? cr.conversions;

    if (existing) {
      existing.spend += cr.spend;
      existing.impressions += cr.impressions;
      existing.clicks += cr.clicks;
      existing.conversions += result;
      existing.adsCount += 1;
    } else {
      adSetMap.set(setName, {
        name: setName,
        spend: cr.spend,
        impressions: cr.impressions,
        clicks: cr.clicks,
        ctr: 0,
        conversions: result,
        cpa: 0,
        adsCount: 1,
      });
    }
  }

  const adSets = Array.from(adSetMap.values())
    .map((s) => ({
      ...s,
      ctr: s.impressions > 0 ? Number(((s.clicks / s.impressions) * 100).toFixed(2)) : 0,
      cpa: s.conversions > 0 ? Number((s.spend / s.conversions).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions);

  if (adSets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum dado de conjuntos de anúncio disponível
      </div>
    );
  }

  const resultLabel = campaign.primaryResultLabel || "Conversões";
  const bestCpa = Math.min(...adSets.filter((s) => s.cpa > 0).map((s) => s.cpa));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Conjuntos de Anúncio</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {adSets.length} conjunto(s) • Métrica: {resultLabel}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {["Conjunto", "Anúncios", "Investimento", "Impressões", "Cliques", "CTR", resultLabel, "CPA"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adSets.map((s) => (
              <tr key={s.name} className="border-b border-border hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-medium text-card-foreground max-w-[250px] truncate">{s.name}</td>
                <td className="px-4 py-3 text-card-foreground">{s.adsCount}</td>
                <td className="px-4 py-3 text-card-foreground">{currencySymbol} {s.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-card-foreground">{s.impressions >= 1000 ? `${(s.impressions / 1000).toFixed(0)}K` : s.impressions}</td>
                <td className="px-4 py-3 text-card-foreground">{s.clicks.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-card-foreground">{s.ctr}%</td>
                <td className="px-4 py-3 font-semibold text-card-foreground">{s.conversions}</td>
                <td className="px-4 py-3 text-card-foreground">
                  <span className={s.cpa === bestCpa && s.cpa > 0 ? "text-meta-green font-semibold" : ""}>
                    {currencySymbol} {s.cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
