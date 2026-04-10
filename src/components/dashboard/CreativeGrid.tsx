import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers, Trophy, Medal } from "lucide-react";

const typeIcon = { image: Image, video: Video, carousel: Layers };
const rankBadge = [
  { label: "🏆 TOP 1", className: "bg-meta-green text-primary-foreground" },
  { label: "🥈 TOP 2", className: "bg-muted text-card-foreground" },
  { label: "🥉 TOP 3", className: "bg-meta-orange/20 text-meta-orange" },
];

interface Props {
  campaign: Campaign;
}

export function CreativeGrid({ campaign }: Props) {
  const resultLabel = campaign.primaryResultLabel || "Conversões";

  // Sort by primary result (volume) desc, then by CPA asc (lower cost = better)
  const sorted = [...campaign.creatives]
    .sort((a, b) => {
      const aResult = a.primaryResult ?? a.conversions;
      const bResult = b.primaryResult ?? b.conversions;
      if (bResult !== aResult) return bResult - aResult;
      // Secondary: lower CPA is better
      const aCpa = aResult > 0 ? a.spend / aResult : Infinity;
      const bCpa = bResult > 0 ? b.spend / bResult : Infinity;
      return aCpa - bCpa;
    })
    .slice(0, 3); // Only top 3

  if (sorted.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">
          Top 3 Criativos — {campaign.name}
        </h3>
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          Métrica: {resultLabel}
        </span>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sorted.map((cr, i) => {
          const Icon = typeIcon[cr.type];
          const primaryVal = cr.primaryResult ?? cr.conversions;
          const cpa = primaryVal > 0 ? (cr.spend / primaryVal) : 0;
          const badge = rankBadge[i];

          return (
            <motion.div
              key={cr.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-lg border overflow-hidden transition-shadow group ${
                i === 0 ? "border-meta-green/40 shadow-md" : "border-border hover:shadow-md"
              }`}
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={cr.thumbnail}
                  alt={cr.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </div>
                <div className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm rounded-md p-1">
                  <Icon className="h-3.5 w-3.5 text-card-foreground" />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-card-foreground truncate">{cr.name}</p>
                {cr.adsetName && (
                  <p className="text-[10px] text-muted-foreground truncate">Conjunto: {cr.adsetName}</p>
                )}
                <div className="space-y-1.5">
                  <div className="bg-primary/5 rounded-md p-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{resultLabel}</span>
                    <p className="font-bold text-primary text-base">{primaryVal}</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">CPA</span>
                    <p className="font-semibold text-card-foreground text-sm">
                      R$ {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-muted/30 rounded p-1.5">
                      <span className="text-muted-foreground">Invest.</span>
                      <p className="font-semibold text-card-foreground">R$ {cr.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-1.5">
                      <span className="text-muted-foreground">CTR</span>
                      <p className="font-semibold text-card-foreground">{cr.ctr}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
