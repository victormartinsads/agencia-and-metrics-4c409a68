import { ImageIcon } from "lucide-react";
import { Campaign } from "@/data/mockMetaData";

interface Props {
  campaigns: Campaign[];
  limit?: number;
}

/** Ranks creatives across all campaigns by primary result volume; shows thumb + leads + sales. */
export function BestAdsList({ campaigns, limit = 8 }: Props) {
  const all = campaigns.flatMap((c) =>
    (c.creatives || []).map((cr) => ({
      campaignName: c.name,
      ...cr,
    })),
  );

  const ranked = [...all]
    .filter((c) => (c.results || 0) > 0 || (c.spend || 0) > 0)
    .sort((a, b) => (b.results || 0) - (a.results || 0))
    .slice(0, limit);

  if (ranked.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground">Nenhum criativo no período</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_60px_60px] text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-1 border-b border-border">
        <span>Anúncio</span>
        <span className="text-right">Leads</span>
        <span className="text-right">Vendas</span>
      </div>
      {ranked.map((cr, i) => (
        <div key={`${cr.id}-${i}`} className="grid grid-cols-[1fr_60px_60px] items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
          <div className="flex items-center gap-2 min-w-0">
            {cr.thumbnailUrl ? (
              <img src={cr.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <p className="text-[11px] text-card-foreground truncate" title={cr.name}>{cr.name}</p>
          </div>
          <p className="text-xs font-semibold text-card-foreground text-right">{cr.results || 0}</p>
          <p className="text-xs font-semibold text-card-foreground text-right">{cr.results || 0}</p>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground text-right pt-1">{ranked.length} de {all.length}</p>
    </div>
  );
}