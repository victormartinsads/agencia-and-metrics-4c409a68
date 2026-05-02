import { useState } from "react";
import { ImageIcon, ExternalLink } from "lucide-react";
import { Campaign, Creative } from "@/data/mockMetaData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";

export const AD_METRIC_OPTIONS: { key: string; label: string; format?: "currency" | "number" | "percent" }[] = [
  { key: "primaryResult", label: "Resultado", format: "number" },
  { key: "conversions", label: "Conversões", format: "number" },
  { key: "spend", label: "Investimento", format: "currency" },
  { key: "impressions", label: "Impressões", format: "number" },
  { key: "clicks", label: "Cliques", format: "number" },
  { key: "ctr", label: "CTR", format: "percent" },
  { key: "roas", label: "ROAS", format: "number" },
];

interface CreativeRow extends Creative {
  campaignName: string;
}

interface Props {
  campaigns: Campaign[];
  limit?: number;
  metrics?: string[]; // metric keys to display (defaults to ["primaryResult","conversions"])
  currencySymbol?: string;
}

function fmt(value: number | undefined, format?: string, currencySymbol = "R$") {
  const v = Number(value || 0);
  if (format === "currency") return formatCurrency(v, currencySymbol);
  if (format === "percent") return `${v.toFixed(2)}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function CreativeRowItem({
  cr,
  metrics,
  currencySymbol,
}: {
  cr: CreativeRow;
  metrics: typeof AD_METRIC_OPTIONS;
  currencySymbol: string;
}) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors">
      {cr.thumbnail ? (
        <img
          src={cr.thumbnail}
          alt=""
          className="h-24 w-24 rounded-lg object-cover shrink-0 ring-1 ring-border/60 group-hover:ring-primary/40 transition"
          loading="lazy"
        />
      ) : (
        <div className="h-24 w-24 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 ring-1 ring-border/60">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-card-foreground truncate" title={cr.name}>
          {cr.name}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mb-2">{cr.campaignName}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {metrics.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted/40 border border-border/40"
            >
              <span className="uppercase tracking-wider text-muted-foreground/80">{m.label}</span>
              <span className="text-card-foreground font-semibold tabular-nums">
                {fmt((cr as any)[m.key], m.format, currencySymbol)}
              </span>
            </span>
          ))}
        </div>
      </div>
      {cr.permalinkUrl && (
        <a
          href={cr.permalinkUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:text-primary/80 shrink-0 p-1.5 rounded-md hover:bg-primary/10 transition"
          title="Ver publicação"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

/** Ranks creatives across all campaigns; shows top N + "ver todos" modal. */
export function BestAdsList({ campaigns, limit = 3, metrics, currencySymbol = "R$" }: Props) {
  const [open, setOpen] = useState(false);

  const selectedMetrics = AD_METRIC_OPTIONS.filter((m) =>
    (metrics && metrics.length > 0 ? metrics : ["primaryResult", "conversions"]).includes(m.key),
  );

  const all: CreativeRow[] = campaigns.flatMap((c) =>
    (c.creatives || []).map((cr) => ({ ...cr, campaignName: c.name })),
  );

  const ranked = [...all]
    .filter((c) => (c.primaryResult || 0) > 0 || (c.spend || 0) > 0)
    .sort((a, b) => (b.primaryResult || 0) - (a.primaryResult || 0));

  const top = ranked.slice(0, limit);

  if (ranked.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground">Nenhum criativo no período</div>
    );
  }

  return (
    <div className="space-y-1">
      {top.map((cr) => (
        <CreativeRowItem key={cr.id} cr={cr} metrics={selectedMetrics} currencySymbol={currencySymbol} />
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
            Ver todos os criativos ativos ({ranked.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criativos Ativos</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-3">
            <div className="space-y-1">
              {ranked.map((cr) => (
                <CreativeRowItem
                  key={`all-${cr.id}`}
                  cr={cr}
                  metrics={selectedMetrics}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}