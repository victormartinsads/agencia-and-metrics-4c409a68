import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers } from "lucide-react";

const typeIcon = { image: Image, video: Video, carousel: Layers };

interface Props {
  campaign: Campaign;
}

export function CreativeGrid({ campaign }: Props) {
  const sorted = [...campaign.creatives].sort((a, b) => b.roas - a.roas);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">
          Top Criativos — {campaign.name}
        </h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((cr, i) => {
          const Icon = typeIcon[cr.type];
          return (
            <motion.div
              key={cr.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={cr.thumbnail}
                  alt={cr.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {i === 0 && (
                  <div className="absolute top-2 left-2 bg-meta-green text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    🏆 TOP
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm rounded-md p-1">
                  <Icon className="h-3.5 w-3.5 text-card-foreground" />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-card-foreground truncate">{cr.name}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">CTR</span>
                    <p className="font-semibold text-card-foreground">{cr.ctr}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROAS</span>
                    <p className={`font-semibold ${cr.roas >= 4 ? "text-meta-green" : "text-card-foreground"}`}>{cr.roas}x</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Invest.</span>
                    <p className="font-semibold text-card-foreground">R$ {cr.spend}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conv.</span>
                    <p className="font-semibold text-card-foreground">{cr.conversions}</p>
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
