import { useState, useEffect } from "react";
import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers, ExternalLink, Pencil } from "lucide-react";
import { useCreativeOverrides, applyOverrides } from "@/hooks/useCreativeOverrides";
import { CreativeEditModal } from "@/components/dashboard/CreativeEditModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIMARY_METRIC_OPTIONS } from "@/hooks/useFunnelPrimaryMetric";
import { getCustomPrimaryMetricValue } from "@/hooks/useAdaptedCampaigns";

const typeIcon = { image: Image, video: Video, carousel: Layers };
const rankBadge = [
  { label: "🏆 TOP 1", className: "bg-primary text-primary-foreground font-bold" },
  { label: "🥈 TOP 2", className: "bg-primary/80 text-primary-foreground font-bold" },
  { label: "🥉 TOP 3", className: "bg-primary/60 text-primary-foreground font-bold" },
];

const FUNNEL_MAP: [RegExp, string][] = [
  [/CAPTACAO_?(?:DE_)?SEGUIDORES|CAPTAÇÃO_?(?:DE_)?SEGUIDORES/i, "Captação de Seguidores"],
  [/CORREDOR_?JAPONES|CORREDOR_?JAPONÊS/i, "Corredor Japonês"],
  [/CALL_?MENSAGEM_?IG/i, "Call de Vendas | Mensagens"],
  [/CALL_?PC/i, "Call de Vendas | Página de Captura"],
  [/MINI_?TREINAMENTO_?PC/i, "Mini Treinamento | Página de Captura"],
  [/ISCA_?PC/i, "Isca | Página de Captura"],
  [/SERVICOS_?MENSAGENS_?WPP|SERVIÇOS_?MENSAGENS_?WPP/i, "Serviços | Mensagens"],
  [/MEDIUM_?TICKET_?PV/i, "Medium Ticket | Página de Vendas"],
  [/LOW_?TICKET_?PV/i, "Low Ticket | Página de Vendas"],
  [/FORMS_?NATIVO/i, "Formulário Nativo"],
  [/IMERSÃO_?PAGA|IMERSAO_?PAGA/i, "Imersão Paga"],
  [/WORKSHOP/i, "Workshop"],
];

function getFunnelLabel(campaignName: string): string {
  for (const [regex, label] of FUNNEL_MAP) {
    if (regex.test(campaignName)) return `Funil: ${label}`;
  }
  return campaignName;
}

// Helper para identificar campanhas de Captação de Seguidores (usado para agrupar pódio)
export function isCaptacaoSeguidores(campaignName: string): boolean {
  return /CAPTACAO_?(?:DE_)?SEGUIDORES|CAPTAÇÃO_?(?:DE_)?SEGUIDORES/i.test(campaignName);
}

export type CreativeMetricKey = "conversions" | "clicks" | "impressions" | "spend" | "roas";

interface Props {
  campaign: Campaign;
  clientId?: string;
  currencySymbol?: string;
  readOnly?: boolean;
  selectedMetricKey?: CreativeMetricKey;
  showAll?: boolean;
  statusFilter?: "all" | "active" | "paused";
}

export function CreativeGrid({ campaign, clientId, currencySymbol = "R$", readOnly = false, selectedMetricKey, showAll = false, statusFilter = "all" }: Props) {
  const { data: overrides = [] } = useCreativeOverrides(clientId);
  const [editingCreative, setEditingCreative] = useState<string | null>(null);
  
  const storageKey = `creative-grid-metric-${clientId}-${campaign.id}`;
  const [localMetric, setLocalMetric] = useState<string>(() => {
    return localStorage.getItem(storageKey) || "auto";
  });

  const [localShowAll, setLocalShowAll] = useState(showAll);
  const [localStatusFilter, setLocalStatusFilter] = useState<"all" | "active" | "paused">(statusFilter);

  useEffect(() => {
    setLocalShowAll(showAll);
  }, [showAll]);

  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

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
    return campaign.primaryResultLabel || "Conversões";
  };
  const resultLabel = getMetricLabel();

  const getMetricValue = (ov: any) => {
    if (activeMetric === "clicks") return ov.clicks;
    if (activeMetric === "impressions") return ov.impressions;
    if (activeMetric === "spend") return ov.spend;
    if (activeMetric === "roas") return ov.roas;
    return ov.conversions;
  };

  const getComputedConversions = (cr: any) => {
    if (activeMetric === "clicks" || activeMetric === "impressions" || activeMetric === "spend" || activeMetric === "roas" || activeMetric === "conversions") {
      return cr.conversions;
    }
    const campaignTotal = getCustomPrimaryMetricValue(campaign, activeMetric);
    const campaignConvs = campaign.conversions || 1;
    const campaignClicks = campaign.clicks || 1;
    if (campaignTotal === 0) return 0;
    return cr.conversions > 0
      ? (cr.conversions / campaignConvs) * campaignTotal
      : (cr.clicks / campaignClicks) * campaignTotal;
  };

  const campaignClicksForRatio = campaign.clicks || 1;
  const campaignLinkClicks = (campaign as any).linkClicks || campaign.clicks || 0;
  const linkRatio = campaign.clicks > 0 ? campaignLinkClicks / campaignClicksForRatio : 0.74;

  const sortedAll = [...campaign.creatives]
    .map((cr) => {
      const computedConv = Math.round(getComputedConversions(cr));
      const baseConversions = localMetric === "auto" ? (cr.primaryResult ?? cr.conversions) : computedConv;
      
      const crLinkClicks = (cr as any).linkClicks !== undefined 
        ? (cr as any).linkClicks 
        : Math.round((cr.clicks || 0) * linkRatio);
      
      const crLinkCtr = (cr as any).linkCtr !== undefined 
        ? (cr as any).linkCtr 
        : (cr.impressions > 0 ? (crLinkClicks / cr.impressions) * 100 : 0);

      const ov = applyOverrides(cr.id, {
        conversions: baseConversions,
        spend: cr.spend,
        ctr: cr.ctr,
        impressions: cr.impressions,
        clicks: cr.clicks,
        roas: cr.roas,
        linkClicks: crLinkClicks,
        linkCtr: crLinkCtr,
      }, overrides);
      return { ...cr, _ov: ov, _computedConversions: computedConv };
    })
    // Só entram criativos que tiveram entrega real (impressões/cliques/conversões/investimento > 0).
    // Evita "pódio zerado" quando criativos pausados sem entrega seriam preenchidos só pra completar 3.
    .filter((cr) => {
      // 1. Filtro de status ativo/pausado
      if (localStatusFilter === "active" && cr.status === "paused") {
        return false;
      }
      if (localStatusFilter === "paused" && cr.status !== "paused") {
        return false;
      }
      // 2. Se exibindo apenas o Top 3, exige entrega real
      if (!localShowAll) {
        const hasDelivery =
          (cr._ov.impressions || 0) > 0 ||
          (cr._ov.clicks || 0) > 0 ||
          (cr._ov.conversions || 0) > 0 ||
          (cr._ov.spend || 0) > 0;
        return hasDelivery;
      }
      return true;
    })
    .sort((a, b) => {
      const valA = getMetricValue(a._ov);
      const valB = getMetricValue(b._ov);
      if (valA !== valB) return valB - valA; // Maior primeiro
      
      // Desempate:
      if (b._ov.conversions !== a._ov.conversions) return b._ov.conversions - a._ov.conversions;
      const aCpa = a._ov.conversions > 0 ? a._ov.spend / a._ov.conversions : Infinity;
      const bCpa = b._ov.conversions > 0 ? b._ov.spend / b._ov.conversions : Infinity;
      if (aCpa !== bCpa) return aCpa - bCpa;
      if (b._ov.impressions !== a._ov.impressions) return b._ov.impressions - a._ov.impressions;
      return b._ov.clicks - a._ov.clicks;
    });

  const displayCreatives = localShowAll ? sortedAll : sortedAll.slice(0, 3);

  const top3Total = displayCreatives.reduce((sum, cr) => sum + getMetricValue(cr._ov), 0);
  const totalMetric = campaign.creatives.reduce((sum, cr) => {
    const computedConv = Math.round(getComputedConversions(cr));
    const baseConversions = localMetric === "auto" ? (cr.primaryResult ?? cr.conversions) : computedConv;
    const ov = applyOverrides(cr.id, {
      conversions: baseConversions,
      spend: cr.spend, ctr: cr.ctr, impressions: cr.impressions, clicks: cr.clicks, roas: cr.roas
    }, overrides);
    return sum + getMetricValue(ov);
  }, 0);
  const remainingResults = Math.max(totalMetric - top3Total, 0);

  if (displayCreatives.length === 0) return null;

  const editCreative = displayCreatives.find(s => s.id === editingCreative);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              {getFunnelLabel(campaign.name)}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {localShowAll ? `${displayCreatives.length} criativos` : `Top 3 somam ${activeMetric === "spend" || activeMetric === "roas" ? "" : top3Total.toLocaleString("pt-BR")} de ${activeMetric === "spend" || activeMetric === "roas" ? "" : totalMetric.toLocaleString("pt-BR")} ${resultLabel.toLowerCase()}`}
              {!localShowAll && remainingResults > 0 && activeMetric !== "spend" && activeMetric !== "roas" ? ` • outros criativos: ${remainingResults.toLocaleString("pt-BR")}` : ""}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Status Ativo/Pausado */}
            <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border">
              <button 
                onClick={() => setLocalStatusFilter("all")} 
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition-all ${localStatusFilter === "all" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setLocalStatusFilter("active")} 
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition-all ${localStatusFilter === "active" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Ativos
              </button>
              <button 
                onClick={() => setLocalStatusFilter("paused")} 
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition-all ${localStatusFilter === "paused" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Pausados
              </button>
            </div>

            {/* Alternador Ver Todos / Ver Top 3 */}
            <button
              onClick={() => setLocalShowAll(prev => !prev)}
              className={`h-6 px-2.5 py-0 text-[10px] font-medium rounded-full transition-all border flex items-center justify-center cursor-pointer select-none ${
                localShowAll 
                  ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20" 
                  : "bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {localShowAll ? "Ver Top 3" : "Ver Todos"}
            </button>

            {/* Seletor de Métrica */}
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
                <SelectItem value="auto" className="text-xs">Métrica: Padrão ({campaign.primaryResultLabel || "Conversões"})</SelectItem>
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
        </div>
        <div className={`p-5 grid gap-4 ${localShowAll ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {displayCreatives.map((cr, i) => {
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
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="bg-muted/30 rounded p-1">
                        <span className="text-muted-foreground block truncate">Invest.</span>
                        <p className="font-semibold text-card-foreground truncate">{currencySymbol} {ov.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-muted/30 rounded p-1">
                        <span className="text-muted-foreground block truncate">CTR (todos)</span>
                        <p className="font-semibold text-card-foreground truncate">{ov.ctr}%</p>
                      </div>
                      <div className="bg-muted/30 rounded p-1">
                        <span className="text-muted-foreground block truncate">CTR (link)</span>
                        <p className="font-semibold text-card-foreground truncate">{(ov.linkCtr ?? 0).toFixed(2)}%</p>
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
                        <span>CTR (todos): {ov.ctr}% • CTR (link): {(ov.linkCtr ?? 0).toFixed(2)}%</span>
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
