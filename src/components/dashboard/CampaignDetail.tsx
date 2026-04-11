import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, Eye, MousePointerClick, Target, Users, Percent, BarChart3, RefreshCw } from "lucide-react";

interface Props {
  campaign: Campaign;
  onBack: () => void;
}

export function CampaignDetail({ campaign, onBack }: Props) {
  const resultLabel = campaign.primaryResultLabel || "Conversões";

  const metrics = [
    { label: "Investimento", value: `R$ ${campaign.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Impressões", value: campaign.impressions >= 1000000 ? `${(campaign.impressions / 1000000).toFixed(1)}M` : campaign.impressions.toLocaleString("pt-BR"), icon: Eye },
    { label: "Cliques", value: campaign.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: resultLabel, value: campaign.conversions.toLocaleString("pt-BR"), icon: Target },
    { label: "CTR", value: `${campaign.ctr}%`, icon: Percent },
    { label: "CPC", value: `R$ ${campaign.cpc.toFixed(2)}`, icon: DollarSign },
    { label: "CPA", value: campaign.costPerConversion > 0 ? `R$ ${campaign.costPerConversion.toFixed(2)}` : "—", icon: BarChart3 },
    { label: "ROAS", value: campaign.roas > 0 ? `${campaign.roas}x` : "—", icon: BarChart3 },
    { label: "Alcance", value: campaign.reach >= 1000000 ? `${(campaign.reach / 1000000).toFixed(1)}M` : campaign.reach.toLocaleString("pt-BR"), icon: Users },
    { label: "Frequência", value: `${campaign.frequency}x`, icon: RefreshCw },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4 text-secondary-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-card-foreground truncate">{campaign.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            Objetivo: {campaign.objective || "—"} • Métrica principal: {resultLabel}
          </p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-base font-bold text-card-foreground">{m.value}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
