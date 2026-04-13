import { motion } from "framer-motion";
import { Trophy, Medal, Award } from "lucide-react";
import { Campaign } from "@/data/mockMetaData";

interface PodiumSection {
  title: string;
  subtitle: string;
  campaigns: Campaign[];
  metricFn: (c: Campaign) => string;
  metricLabel: string;
}

function PodiumCard({ rank, campaign, metric, metricLabel }: {
  rank: number;
  campaign: Campaign;
  metric: string;
  metricLabel: string;
}) {
  const icons = [Trophy, Medal, Award];
  const colors = ["text-yellow-400", "text-gray-400", "text-amber-600"];
  const Icon = icons[rank] || Award;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50"
    >
      <div className={`mt-0.5 ${colors[rank]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-card-foreground truncate">{campaign.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">{metricLabel}: <strong className="text-card-foreground">{metric}</strong></span>
          <span className="text-[10px] text-muted-foreground">R$ {campaign.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-muted-foreground">{campaign.conversions} conv.</span>
        </div>
      </div>
    </motion.div>
  );
}

export function FunnelPodium({ topRoas, topCpa, topCtr }: {
  topRoas: Campaign[];
  topCpa: Campaign[];
  topCtr: Campaign[];
}) {
  const sections: PodiumSection[] = [
    {
      title: "🏆 Maior ROAS",
      subtitle: "Melhor retorno sobre investimento",
      campaigns: topRoas,
      metricFn: (c) => `${c.roas}x`,
      metricLabel: "ROAS",
    },
    {
      title: "💰 Menor CPA",
      subtitle: "Menor custo por aquisição",
      campaigns: topCpa,
      metricFn: (c) => `R$ ${c.costPerConversion.toFixed(2)}`,
      metricLabel: "CPA",
    },
    {
      title: "🎯 Maior CTR",
      subtitle: "Melhor taxa de clique",
      campaigns: topCtr,
      metricFn: (c) => `${c.ctr}%`,
      metricLabel: "CTR",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-semibold text-card-foreground">{section.title}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">{section.subtitle}</p>
          </div>
          <div className="p-3 space-y-2">
            {section.campaigns.length > 0 ? section.campaigns.map((c, i) => (
              <PodiumCard
                key={c.id}
                rank={i}
                campaign={c}
                metric={section.metricFn(c)}
                metricLabel={section.metricLabel}
              />
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados suficientes</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
