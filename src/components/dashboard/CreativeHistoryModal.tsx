import { useMemo } from "react";
import { Campaign, Creative } from "@/data/mockMetaData";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { Trophy, RefreshCw, Layers, TrendingUp, Sparkles, Image as ImageIcon, Video } from "lucide-react";

interface Props {
  campaigns: Campaign[];
  currencySymbol: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreativeWithContext extends Creative {
  campaignName: string;
  campaignId: string;
  cpa: number;
}

export function CreativeHistoryModal({ campaigns, currencySymbol, isOpen, onOpenChange }: Props) {
  // Flatten and enrich creatives
  const allCreatives = useMemo(() => {
    const list: CreativeWithContext[] = [];
    campaigns.forEach(camp => {
      if (!camp.creatives) return;
      camp.creatives.forEach(cr => {
        if (cr.spend > 0) {
          list.push({
            ...cr,
            campaignName: camp.name,
            campaignId: camp.id,
            cpa: cr.conversions > 0 ? cr.spend / cr.conversions : 0,
          });
        }
      });
    });
    return list.sort((a, b) => b.spend - a.spend);
  }, [campaigns]);

  // Find top creatives to reactivate/scale
  const topInsights = useMemo(() => {
    // Requires at least 2 conversions to be considered "good" to avoid flukes
    const eligible = allCreatives.filter(c => c.conversions >= 2 && c.cpa > 0);
    return eligible.sort((a, b) => a.cpa - b.cpa).slice(0, 3);
  }, [allCreatives]);

  // Group by Campaign -> Adset
  const grouped = useMemo(() => {
    const map = new Map<string, { campaignName: string, adsets: Map<string, CreativeWithContext[]> }>();
    allCreatives.forEach(cr => {
      if (!map.has(cr.campaignId)) {
        map.set(cr.campaignId, { campaignName: cr.campaignName, adsets: new Map() });
      }
      const campGroup = map.get(cr.campaignId)!;
      const adsetName = cr.adsetName || "Conjunto Geral";
      if (!campGroup.adsets.has(adsetName)) {
        campGroup.adsets.set(adsetName, []);
      }
      campGroup.adsets.get(adsetName)!.push(cr);
    });
    return Array.from(map.entries());
  }, [allCreatives]);

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto p-0 border-l border-border bg-background">
        <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-6 py-5">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Layers className="h-5 w-5 text-primary" /> Histórico de Criativos
            </SheetTitle>
            <SheetDescription>
              Analise o desempenho histórico de todos os criativos e descubra quais reativar.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-8">
          {/* AI Insights Section */}
          {topInsights.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-card-foreground">Insights de Reativação</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Baseado no histórico, estes são os criativos mais eficientes (menor custo por resultado com bom volume). Considere reativá-los ou escalá-los.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topInsights.map((cr, idx) => (
                  <div key={cr.id} className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-3 overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      TOP {idx + 1}
                    </div>
                    <div className="flex items-start gap-3 mt-2">
                      <div className="h-14 w-14 rounded-md bg-muted overflow-hidden flex-shrink-0 border border-border/50">
                        {cr.thumbnail ? (
                          <img src={cr.thumbnail} alt={cr.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            {cr.type === "video" ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-card-foreground truncate" title={cr.name}>{cr.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate" title={cr.campaignName}>{cr.campaignName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border/40">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">CPA Histórico</p>
                        <p className="text-sm font-bold text-amber-500">{formatCurrency(cr.cpa, currencySymbol)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Resultados</p>
                        <p className="text-sm font-bold text-card-foreground">{cr.conversions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped History List */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-card-foreground">Desempenho por Campanha/Conjunto</h3>
            </div>

            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum criativo com investimento encontrado no período.</p>
            ) : (
              <div className="space-y-8">
                {grouped.map(([campId, campData]) => (
                  <div key={campId} className="space-y-4">
                    <h4 className="text-base font-bold text-card-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border">
                      {campData.campaignName}
                    </h4>
                    
                    <div className="space-y-6 pl-2 sm:pl-4 border-l-2 border-border/50">
                      {Array.from(campData.adsets.entries()).map(([adsetName, creatives]) => (
                        <div key={adsetName} className="space-y-3">
                          <h5 className="text-sm font-semibold text-muted-foreground">Conjunto: {adsetName}</h5>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {creatives.map(cr => (
                              <div key={cr.id} className="rounded-lg border border-border bg-card p-3 flex gap-3 hover:border-primary/30 transition-colors">
                                <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0 border border-border/50">
                                  {cr.thumbnail ? (
                                    <img src={cr.thumbnail} alt={cr.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                      {cr.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <p className="text-xs font-semibold text-card-foreground truncate" title={cr.name}>{cr.name}</p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <span className="text-[10px] text-muted-foreground">
                                      Invest: <strong className="text-foreground">{formatCurrency(cr.spend, currencySymbol)}</strong>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Result: <strong className="text-foreground">{cr.conversions}</strong>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      CPA: <strong className="text-primary">{cr.cpa > 0 ? formatCurrency(cr.cpa, currencySymbol) : "—"}</strong>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      CTR: <strong className="text-foreground">{cr.ctr}%</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
