import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers, ExternalLink } from "lucide-react";

const typeIcon = { image: Image, video: Video, carousel: Layers };
const rankBadge = [
  { label: "🏆 TOP 1", className: "bg-[hsl(82,85%,55%)] text-[hsl(220,30%,10%)] font-bold" },
  { label: "🥈 TOP 2", className: "bg-[hsl(82,85%,55%)]/80 text-[hsl(220,30%,10%)] font-bold" },
  { label: "🥉 TOP 3", className: "bg-[hsl(82,85%,55%)]/60 text-[hsl(220,30%,10%)] font-bold" },
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

  const top3Total = sorted.reduce((sum, creative) => {
    return sum + (creative.primaryResult ?? creative.conversions);
  }, 0);

  const remainingResults = Math.max(campaign.conversions - top3Total, 0);

  if (sorted.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-[hsl(220,30%,10%)] shadow-sm"
    >
      <div className="p-5 border-b border-[hsl(220,25%,18%)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Top 3 Criativos — {campaign.name}
          </h3>
          <p className="mt-1 text-[11px] text-white/50">
            Top 3 somam {top3Total} de {campaign.conversions} {resultLabel.toLowerCase()}
            {remainingResults > 0 ? ` • outros criativos: ${remainingResults}` : ""}
          </p>
        </div>
        <span className="text-[10px] font-medium bg-[hsl(82,85%,55%)]/15 text-[hsl(82,85%,55%)] px-2 py-0.5 rounded-full">
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
                i === 0 ? "border-[hsl(82,85%,55%)]/40 shadow-md" : "border-[hsl(220,25%,18%)] hover:shadow-md"
              }`}
            >
              <div className="relative aspect-square bg-[hsl(220,25%,15%)] overflow-hidden">
                <img
                  src={cr.thumbnail}
                  alt={cr.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </div>
                <div className="absolute top-2 right-2 bg-[hsl(220,30%,10%)]/80 backdrop-blur-sm rounded-md p-1">
                  <Icon className="h-3.5 w-3.5 text-white/70" />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-white truncate">{cr.name}</p>
                {cr.permalinkUrl && (
                  <a
                    href={cr.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-[hsl(82,85%,55%)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" /> Ver publicação
                  </a>
                )}
                {cr.adsetName && (
                  <p className="text-[10px] text-white/40 truncate">Conjunto: {cr.adsetName}</p>
                )}
                <div className="space-y-1.5">
                  <div className="bg-[hsl(82,85%,55%)]/10 rounded-md p-2 flex items-center justify-between">
                    <span className="text-xs text-white/50">{resultLabel}</span>
                    <p className="font-bold text-[hsl(82,85%,55%)] text-base">{primaryVal}</p>
                  </div>
                  <div className="bg-white/5 rounded-md p-2 flex items-center justify-between">
                    <span className="text-xs text-white/50">CPA</span>
                    <p className="font-semibold text-white text-sm">
                      R$ {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-white/5 rounded p-1.5">
                      <span className="text-white/40">Invest.</span>
                      <p className="font-semibold text-white">R$ {cr.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white/5 rounded p-1.5">
                      <span className="text-white/40">CTR</span>
                      <p className="font-semibold text-white">{cr.ctr}%</p>
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
