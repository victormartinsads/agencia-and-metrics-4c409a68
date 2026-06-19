import { useState, useMemo, useEffect } from "react";
import { Campaign, Creative } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers, ExternalLink, Pencil } from "lucide-react";
import { useCreativeOverrides, applyOverrides } from "@/hooks/useCreativeOverrides";
import { CreativeEditModal } from "@/components/dashboard/CreativeEditModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreativeMetricKey } from "@/components/dashboard/CreativeGrid";
import { PRIMARY_METRIC_OPTIONS } from "@/hooks/useFunnelPrimaryMetric";
import { getCustomPrimaryMetricValue } from "@/hooks/useAdaptedCampaigns";

const typeIcon = { image: Image, video: Video, carousel: Layers };
const rankBadge = [
  { label: "🏆 TOP 1", className: "bg-primary text-primary-foreground font-bold" },
  { label: "🥈 TOP 2", className: "bg-primary/80 text-primary-foreground font-bold" },
  { label: "🥉 TOP 3", className: "bg-primary/60 text-primary-foreground font-bold" },
];

interface Props {
  campaigns: Campaign[];
  funnelLabel: string;
  clientId?: string;
  currencySymbol?: string;
  readOnly?: boolean;
  selectedMetricKey?: CreativeMetricKey;
  showAll?: boolean;
  statusFilter?: "all" | "active" | "paused";
}

/**
 * Pódio agregado: junta criativos de várias campanhas do mesmo funil
 * (ex: 4 campanhas de Captação de Seguidores -> 1 pódio com top 3 dentre todos os criativos).
 * Mesma lógica de ranking em cascata do CreativeGrid (resultado -> CPA -> impressões -> cliques).
 */
export function AggregatedCreativeGrid({ campaigns, funnelLabel, clientId, currencySymbol = "R$", readOnly = false, selectedMetricKey, showAll = false, statusFilter = "all" }: Props) {
  const { data: overrides = [] } = useCreativeOverrides(clientId);
  const [editingCreative, setEditingCreative] = useState<string | null>(null);
  
  const storageKey = `aggregated-grid-metric-${clientId}-${funnelLabel}`;
  const [localMetric, setLocalMetric] = useState<string>(() => {
    return localStorage.getItem(storageKey) || "auto";
  });

  useEffect(() => {
    if (selectedMetricKey && localMetric === "auto") {
      setLocalMetric(selectedMetricKey);
    }
  }, [selectedMetricKey, localMetric]);

  const activeMetric = localMetric === "auto" ? "conversions" : localMetric;
  const activeOption = PRIMARY_METRIC_OPTIONS.find(o => o.key === activeMetric);

  const getMetricLabel = () => {
    if (activeOption) return activeOption.label;
    if (activeMetric === "clicks") return "Cliques";
    if (activeMetric === "impressions") return "Impressões";
    if (activeMetric === "spend") return "Investimento";
    if (activeMetric === "roas") return "ROAS";
    return campaigns[0]?.primaryResultLabel || "Conversões";
  };
  const resultLabel = getMetricLabel();

  const getMetricValue = (ov: any) => {
    if (activeMetric === "clicks") return ov.clicks;
    if (activeMetric === "impressions") return ov.impressions;
    if (activeMetric === "spend") return ov.spend;
    if (activeMetric === "roas") return ov.roas;
    if (activeMetric === "conversions") return ov.conversions;
    return ov.conversions;
  };

  // Junta criativos de TODAS as campanhas, calculando a métrica customizada se necessário
  const allCreatives = useMemo(() => {
    return campaigns.flatMap(camp =>
      camp.creatives.map(cr => {
        let computedConversions = cr.conversions;
        if (activeMetric !== "clicks" && activeMetric !== "impressions" && activeMetric !== "spend" && activeMetric !== "roas" && activeMetric !== "conversions") {
           const campaignTotal = getCustomPrimaryMetricValue(camp, activeMetric);
           const campaignConvs = camp.conversions || 1;
           const campaignClicks = camp.clicks || 1;
           if (campaignTotal === 0) {
             computedConversions = 0;
           } else {
             computedConversions = cr.conversions > 0 
               ? (cr.conversions / campaignConvs) * campaignTotal
               : (cr.clicks / campaignClicks) * campaignTotal;
           }
        }
        
        return {
          ...cr,
          _campaignName: camp.name,
          _campaignId: camp.id,
          _computedConversions: Math.round(computedConversions),
        };
      })
    );
  }, [campaigns, activeMetric]);

  const sorted = allCreatives
    .map((cr) => {
      const baseline = { ...cr, conversions: (cr as any)._computedConversions };
      const baseConversions = localMetric === "auto" ? (baseline.primaryResult ?? baseline.conversions) : baseline.conversions;
      const ov = applyOverrides(cr.id, {
        conversions: baseConversions,
        spend: cr.spend,
        ctr: cr.ctr,
        impressions: cr.impressions,
        clicks: cr.clicks,
        roas: cr.roas,
      }, overrides);
      return { ...cr, _ov: ov };
    })
    .filter((cr) => {
      if (!showAll) {
        const hasDelivery =
          (cr._ov.impressions || 0) > 0 ||
          (cr._ov.clicks || 0) > 0 ||
          (cr._ov.conversions || 0) > 0 ||
          (cr._ov.spend || 0) > 0;
        return hasDelivery;
      }
      if (statusFilter === "active") {
        return cr.status !== "paused";
      }
      if (statusFilter === "paused") {
        return cr.status === "paused";
      }
      return true;
    })
    .sort((a, b) => {
      const valA = getMetricValue(a._ov);
      const valB = getMetricValue(b._ov);
      if (valA !== valB) return valB - valA; // Maior primeiro

      if (b._ov.conversions !== a._ov.conversions) return b._ov.conversions - a._ov.conversions;
      const aCpa = a._ov.conversions > 0 ? a._ov.spend / a._ov.conversions : Infinity;
      const bCpa = b._ov.conversions > 0 ? b._ov.spend / b._ov.conversions : Infinity;
      if (aCpa !== bCpa) return aCpa - bCpa;
      if (b._ov.impressions !== a._ov.impressions) return b._ov.impressions - a._ov.impressions;
      return b._ov.clicks - a._ov.clicks;
    })
    .slice(0, showAll ? undefined : 3);

  const totalMetric = allCreatives.reduce((sum, cr) => {
    const baseline = { ...cr, conversions: (cr as any)._computedConversions };
    const baseConversions = localMetric === "auto" ? (baseline.primaryResult ?? baseline.conversions) : baseline.conversions;
    const ov = applyOverrides(cr.id, {
      conversions: baseConversions,
      spend: cr.spend, ctr: cr.ctr, impressions: cr.impressions, clicks: cr.clicks, roas: cr.roas
    }, overrides);
    return sum + getMetricValue(ov);
  }, 0);
  const top3Total = sorted.reduce((sum, cr) => sum + getMetricValue(cr._ov), 0);
  const remainingResults = Math.max(totalMetric - top3Total, 0);

  if (sorted.length === 0) return null;

  const editCreative = sorted.find(s => s.id === editingCreative);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              Funil: {funnelLabel}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {showAll
                ? `${campaigns.length} campanhas agrupadas • ${sorted.length} criativos`
                : `${campaigns.length} campanhas agrupadas • Top 3 somam ${activeMetric === "spend" || activeMetric === "roas" ? "" : top3Total.toLocaleString("pt-BR")} de ${activeMetric === "spend" || activeMetric === "roas" ? "" : totalMetric.toLocaleString("pt-BR")} ${resultLabel.toLowerCase()}${remainingResults > 0 && activeMetric !== "spend" && activeMetric !== "roas" ? ` • outros criativos: ${remainingResults.toLocaleString("pt-BR")}` : ""}`
              }
            </p>
          </div>
          <Select 
            value={localMetric} 
            onValueChange={(v) => {
              setLocalMetric(v);
              localStorage.setItem(storageKey, v);
            }}
          >
            <SelectTrigger className="h-6 text-[10px] font-medium bg-primary/15 hover:bg-primary/20 text-primary border-0 rounded-full px-2.5 py-0 focus:ring-0 focus:ring-offset-0 flex items-center gap-1 select-none cursor-pointer w-auto min-w-[120px]">
              <SelectValue placeholder="Métrica" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="auto" className="text-xs">Métrica: Padrão ({campaigns[0]?.primaryResultLabel || "Conversões"})</SelectItem>
              <SelectItem value="impressions" className="text-xs">Métrica: Impressões</SelectItem>
              <SelectItem value="spend" className="text-xs">Métrica: Investimento</SelectItem>
              <SelectItem value="roas" className="text-xs">Métrica: ROAS</SelectItem>
              {PRIMARY_METRIC_OPTIONS.map(opt => (
                <SelectItem key={opt.key} value={opt.key} className="text-xs">
                  Métrica: {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`p-5 grid gap-4 ${showAll ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {sorted.map((cr, i) => {
            const Icon = typeIcon[cr.type];
            const ov = cr._ov;
            const cpa = ov.conversions > 0 ? (ov.spend / ov.conversions) : 0;
            const badge = i < 3 ? rankBadge[i] : null;
            const hasOverride = overrides.some(o => o.creative_id === cr.id);

            return (
              <motion.div
                key={cr.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-lg border overflow-hidden transition-shadow group relative ${
                  i === 0 ? "border-primary/40 shadow-md" : "border-border hover:shadow-md"
                }`}
              >
                {clientId && !readOnly && (
                  <button
                    onClick={() => setEditingCreative(cr.id)}
                    className="absolute top-2 right-10 z-10 bg-card/80 backdrop-blur-sm rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
                    title="Editar métricas"
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </button>
                )}
                {hasOverride && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">editado</span>
                  </div>
                )}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img
                    src={cr.thumbnail}
                    alt={cr.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                      cr.status === "paused" ? "grayscale opacity-75 contrast-[0.95]" : ""
                    }`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.dataset.fallbackApplied === "true") return;
                      target.dataset.fallbackApplied = "true";
                      target.src = `https://picsum.photos/seed/${cr.id}/600/600`;
                    }}
                  />
                  {badge && (
                    <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </div>
                  )}
                  {!badge && (
                    <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      #{i + 1}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {cr.status === "paused" && (
                      <span className="text-[8px] bg-red-600/90 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm select-none">
                        Pausado
                      </span>
                    )}
                    <div className="bg-card/80 backdrop-blur-sm rounded-md p-1">
                      <Icon className="h-3.5 w-3.5 text-card-foreground/70" />
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-card-foreground truncate">{cr.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate" title={cr.adsetName || undefined}>
                    Conjunto: {cr.adsetName || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate" title={cr._campaignName}>
                    Campanha: {cr._campaignName}
                  </p>
                  {cr.permalinkUrl && (
                    <a
                      href={cr.permalinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" /> Ver publicação
                    </a>
                  )}
                  <div className="space-y-1.5">
                    <div className="bg-primary/10 rounded-md p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{resultLabel}</span>
                      <p className="font-bold text-primary text-base">
                        {activeMetric === "spend"
                          ? `${currencySymbol} ${getMetricValue(ov).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : activeMetric === "roas"
                            ? `${getMetricValue(ov).toFixed(2)}x`
                            : getMetricValue(ov).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">CPA</span>
                      <p className="font-semibold text-card-foreground text-sm">
                        {currencySymbol} {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-muted/30 rounded p-1.5">
                        <span className="text-muted-foreground">Invest.</span>
                        <p className="font-semibold text-card-foreground">{currencySymbol} {ov.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <span className="text-muted-foreground">CTR</span>
                        <p className="font-semibold text-card-foreground">{ov.ctr}%</p>
                      </div>
                    </div>
                    {/* Gráfico de proporção Impressões vs Cliques */}
                    <div className="bg-muted/20 border border-border/40 rounded-md p-2 space-y-1 text-[10px]">
                      <div className="flex justify-between text-muted-foreground font-medium">
                        <span>Cliques ({ov.clicks.toLocaleString("pt-BR")})</span>
                        <span>Impressões ({ov.impressions.toLocaleString("pt-BR")})</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full relative overflow-hidden">
                        <div 
                          className="h-full bg-primary/20 rounded-full" 
                          style={{ width: "100%" }} 
                        />
                        <div 
                          className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all" 
                          style={{ width: `${Math.min(100, Math.max(2, (ov.clicks / (ov.impressions || 1)) * 100 * 20))}%` }} 
                          title={`Proporção: ${((ov.clicks / (ov.impressions || 1)) * 100).toFixed(2)}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground/80">
                        <span>CTR: {ov.ctr}%</span>
                        <span>Proporção Cliques/Imp. (x20)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {editCreative && clientId && (
        <CreativeEditModal
          open={!!editingCreative}
          onOpenChange={(open) => !open && setEditingCreative(null)}
          clientId={clientId}
          creativeId={editCreative.id}
          creativeName={editCreative.name}
          existingOverrides={overrides}
          metrics={[
            { key: "conversions", label: resultLabel, original: editCreative.primaryResult ?? editCreative.conversions },
            { key: "spend", label: "Investimento", original: editCreative.spend },
            { key: "ctr", label: "CTR (%)", original: editCreative.ctr },
            { key: "impressions", label: "Impressões", original: editCreative.impressions },
            { key: "clicks", label: "Cliques", original: editCreative.clicks },
            { key: "roas", label: "ROAS", original: editCreative.roas },
          ]}
        />
      )}
    </>
  );
}
