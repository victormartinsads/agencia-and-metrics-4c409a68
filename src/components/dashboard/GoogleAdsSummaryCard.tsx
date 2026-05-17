import { useGoogleAds } from "@/hooks/useGoogleAds";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { SiGoogleads } from "react-icons/si";

interface Props {
  clientId?: string;
  datePreset?: string;
  currencySymbol?: string;
}

/** Compact Google Ads totals strip — shown on Como Estamos and Funil tabs. */
export function GoogleAdsSummaryCard({ clientId, datePreset = "last_7d", currencySymbol = "R$" }: Props) {
  const { data } = useGoogleAds(clientId, datePreset, !!clientId);
  const totals = data?.totals;
  if (!totals || totals.cost <= 0) return null;

  const cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  const items = [
    { label: "Investimento", value: formatCurrency(totals.cost, currencySymbol) },
    { label: "Impressões", value: totals.impressions.toLocaleString("pt-BR") },
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR") },
    { label: "CTR", value: `${ctr.toFixed(2)}%` },
    { label: "Conversões", value: totals.conversions.toFixed(0) },
    { label: "CPA", value: formatCurrency(cpa, currencySymbol) },
    { label: "ROAS", value: `${roas.toFixed(2)}x` },
  ];

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
          Google Ads — período
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</p>
            <p className="text-base font-semibold text-foreground">{it.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}