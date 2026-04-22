import { useState } from "react";
import { Campaign } from "@/data/mockMetaData";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  campaigns: Campaign[];
  onSelect: (campaign: Campaign) => void;
  selectedId?: string;
  currencySymbol?: string;
}

const statusMap = {
  active: { label: "Ativa", className: "bg-meta-green/15 text-meta-green border-meta-green/30" },
  paused: { label: "Pausada", className: "bg-meta-orange/15 text-meta-orange border-meta-orange/30" },
  completed: { label: "Finalizada", className: "bg-muted text-muted-foreground border-border" },
};

export function CampaignTable({ campaigns, onSelect, selectedId, currencySymbol = "R$" }: Props) {
  const [activeOnly, setActiveOnly] = useState(false);

  const filtered = activeOnly ? campaigns.filter((c) => c.status === "active") : campaigns;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">
          Campanhas ({filtered.length})
        </h3>
        <div className="flex items-center gap-2">
          <Switch id="active-filter" checked={activeOnly} onCheckedChange={setActiveOnly} />
          <Label htmlFor="active-filter" className="text-xs text-muted-foreground cursor-pointer">
            Apenas ativas
          </Label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {["Campanha", "Status", "Investimento", "Impressões", "Cliques", "CTR", "CPC", "Resultado", "CPA", "Alcance", "Freq."].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const st = statusMap[c.status];
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`border-b border-border cursor-pointer transition-colors hover:bg-accent/50 ${selectedId === c.id ? "bg-accent" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-card-foreground whitespace-nowrap max-w-[250px] truncate">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={st.className}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-card-foreground">{currencySymbol} {c.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-card-foreground">{c.impressions >= 1000000 ? `${(c.impressions / 1000000).toFixed(1)}M` : `${(c.impressions / 1000).toFixed(0)}K`}</td>
                  <td className="px-4 py-3 text-card-foreground">{c.clicks.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-card-foreground">{c.ctr}%</td>
                  <td className="px-4 py-3 text-card-foreground">{currencySymbol} {c.cpc.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-card-foreground">
                    <div className="flex flex-col">
                      <span>{c.conversions}</span>
                      {c.primaryResultLabel && (
                        <span className="text-[10px] font-normal text-muted-foreground">{c.primaryResultLabel}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-card-foreground">
                    {c.costPerConversion > 0 ? `${currencySymbol} ${c.costPerConversion.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-card-foreground">
                    {c.reach >= 1000000 ? `${(c.reach / 1000000).toFixed(1)}M` : `${(c.reach / 1000).toFixed(0)}K`}
                  </td>
                  <td className="px-4 py-3 text-card-foreground">{c.frequency}x</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhuma campanha ativa encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
