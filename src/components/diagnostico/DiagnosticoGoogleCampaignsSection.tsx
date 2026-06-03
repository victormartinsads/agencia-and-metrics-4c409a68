import { useMemo, useState } from "react";
import { useGoogleAds, type GoogleAdsCampaign, type GoogleAdsKeyword, type GoogleAdsCreative } from "@/hooks/useGoogleAds";
import { useGoogleConnectionStatus } from "@/hooks/useGoogleAnalytics";
import { Target, Loader2, Play, Pause, Search, Image as ImageIcon, Video, Sparkles, Pencil, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useDiagnosticMetricsConfig, formatCustomValue, type MetricsConfig } from "@/hooks/useDiagnosticMetricsConfig";
import { EditableKpi } from "./EditableKpi";
import { MetricsCustomizer } from "./MetricsCustomizer";
import { useFunnelLabels, useSaveFunnelLabel } from "@/hooks/useFunnelLabels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  clientId?: string;
  datePreset?: string;
  campaigns?: GoogleAdsCampaign[];
  currencySymbol?: string;
  groupConfigs?: Record<string, MetricsConfig>;
  funnelLabels?: Record<string, string>;
}

export function DiagnosticoGoogleCampaignsSection({
  clientId,
  datePreset = "last_7d",
  campaigns: staticCampaigns,
  currencySymbol = "R$",
  groupConfigs,
  funnelLabels: staticFunnelLabels,
}: Props) {
  // Check connection status if loading live data
  const { data: status } = useGoogleConnectionStatus(
    clientId && !staticCampaigns ? clientId : undefined
  );
  const isConnected = staticCampaigns ? true : status?.connected === true;

  // Query Google Ads live data
  const { data: liveData, isLoading } = useGoogleAds(
    clientId && !staticCampaigns ? clientId : undefined,
    datePreset,
    isConnected && !staticCampaigns
  );

  const rawCampaigns = staticCampaigns || liveData?.campaigns || [];

  // Group campaigns by type (channel)
  const campaignsList = useMemo(() => {
    const validCampaigns = rawCampaigns.filter((c) => c.cost > 0 || c.impressions > 0);
    const channelMap = new Map<string, GoogleAdsCampaign>();

    for (const c of validCampaigns) {
      const type = c.type || "OUTROS";
      if (!channelMap.has(type)) {
        channelMap.set(type, {
          id: `channel-${type}`,
          name: `Campanhas de ${type}`,
          status: "mixed",
          type: type,
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          avgCpc: 0,
          keywords: [],
          creatives: [],
          conversionsBreakdown: [],
        });
      }
      
      const agg = channelMap.get(type)!;
      agg.cost += c.cost;
      agg.impressions += c.impressions;
      agg.clicks += c.clicks;
      agg.conversions += c.conversions;
      agg.revenue += c.revenue;
      
      if (c.keywords) agg.keywords!.push(...c.keywords);
      if (c.creatives) agg.creatives!.push(...c.creatives);
      if (c.conversionsBreakdown) {
        for (const cb of c.conversionsBreakdown) {
          const existingCb = agg.conversionsBreakdown!.find((x) => x.name === cb.name);
          if (existingCb) existingCb.count += cb.count;
          else agg.conversionsBreakdown!.push({ ...cb });
        }
      }
    }

    // Recalculate rates and sort child lists
    for (const agg of channelMap.values()) {
      agg.ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
      agg.avgCpc = agg.clicks > 0 ? agg.cost / agg.clicks : 0;
      
      agg.keywords = agg.keywords!.sort((a, b) => b.conversions - a.conversions || b.cost - a.cost).slice(0, 15);
      
      // Filter out duplicate creatives based on youtubeVideoId or imageUrl
      const uniqueCreatives = new Map<string, GoogleAdsCreative>();
      for (const cr of agg.creatives!) {
        const key = cr.youtubeVideoId || cr.imageUrl || cr.id;
        if (!uniqueCreatives.has(key)) {
          uniqueCreatives.set(key, { ...cr });
        } else {
          const existing = uniqueCreatives.get(key)!;
          existing.cost += cr.cost;
          existing.clicks += cr.clicks;
          existing.conversions += cr.conversions;
          if (cr.videoViews) existing.videoViews = (existing.videoViews || 0) + cr.videoViews;
          if (cr.videoP100Rate && cr.videoViews) {
            // weighted average could be done, but keeping highest or sum is complex, just max for now
            existing.videoP100Rate = Math.max(existing.videoP100Rate || 0, cr.videoP100Rate);
          }
        }
      }
      agg.creatives = Array.from(uniqueCreatives.values())
        .sort((a, b) => b.conversions - a.conversions || b.cost - a.cost)
        .slice(0, 12);
        
      agg.conversionsBreakdown!.sort((a, b) => b.count - a.count);
    }

    return Array.from(channelMap.values()).sort((a, b) => b.cost - a.cost);
  }, [rawCampaigns]);

  // Load custom funnel labels if not static
  const { data: liveFunnelLabels } = useFunnelLabels(clientId && !staticCampaigns ? clientId : undefined);
  const resolvedLabels = staticFunnelLabels || liveFunnelLabels || {};

  if (!isConnected || (liveData && (liveData.notConnected || liveData.needsCustomerId)) || (!isLoading && campaignsList.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Carregando campanhas do Google Ads...</span>
      </div>
    );
  }

  return (
    <>
      {campaignsList.map((campaign) => (
        <GoogleCampaignCard
          key={campaign.id}
          campaign={campaign}
          clientId={clientId}
          datePreset={datePreset}
          currencySymbol={currencySymbol}
          resolvedLabels={resolvedLabels}
          readOnly={!clientId || !!staticCampaigns}
          overrideConfig={groupConfigs?.[`google-ads-${campaign.id}`]}
        />
      ))}
    </>
  );
}

interface CardProps {
  campaign: GoogleAdsCampaign;
  clientId?: string;
  datePreset: string;
  currencySymbol: string;
  resolvedLabels: Record<string, string>;
  readOnly: boolean;
  overrideConfig?: MetricsConfig;
}

function GoogleCampaignCard({
  campaign,
  clientId,
  datePreset,
  currencySymbol,
  resolvedLabels,
  readOnly,
  overrideConfig,
}: CardProps) {
  const groupKey = `google-ads-${campaign.id}`;
  
  // Custom Metrics Config
  const { config: liveConfig, update } = useDiagnosticMetricsConfig(
    clientId || "",
    datePreset,
    groupKey
  );
  
  const config = overrideConfig || liveConfig;
  const saveLabelMutation = useSaveFunnelLabel();

  const campaignCreatives = useMemo(() => {
    return campaign.creatives || [];
  }, [campaign.creatives]);

  // Campaign Title logic
  const customCampaignName = resolvedLabels[groupKey] || campaign.name;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const handleEditTitleClick = () => {
    setTitleDraft(customCampaignName);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!clientId) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      toast.error("O nome não pode ser vazio");
      return;
    }
    try {
      await saveLabelMutation.mutateAsync({
        clientId,
        funnelCode: groupKey,
        label: trimmed,
      });
      setIsEditingTitle(false);
      toast.success("Nome da campanha atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar o nome");
    }
  };

  // Helper for metrics values (accounting for overrides)
  const getMetricValueAndOverride = (key: string) => {
    const override = config.custom_metrics.find((m) => m.id === key);
    const isOverridden = !!override;

    let originalRaw = 0;
    if (key === "spend" || key === "cost") originalRaw = campaign.cost;
    else if (key === "conversions") originalRaw = campaign.conversions;
    else if (key === "clicks") originalRaw = campaign.clicks;
    else if (key === "impressions") originalRaw = campaign.impressions;
    else if (key === "ctr") originalRaw = campaign.ctr || (campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0);
    else if (key === "avgCpc" || key === "cpc") originalRaw = campaign.avgCpc;
    else if (key === "cpa") originalRaw = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
    else if (key === "roas") originalRaw = campaign.cost > 0 ? campaign.revenue / campaign.cost : 0;
    else if (key === "revenue" || key === "purchaseValue") originalRaw = campaign.revenue;

    const rawValue = isOverridden ? Number(String(override.value).replace(",", ".")) : originalRaw;

    const formatValue = (val: number) => {
      if (["spend", "cost", "avgCpc", "cpc", "cpa", "revenue", "purchaseValue"].includes(key)) {
        return `${currencySymbol} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (key === "ctr") return `${val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
      if (key === "roas") return `${val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
      if (["impressions", "clicks"].includes(key)) return val.toLocaleString("pt-BR");
      return val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    };

    return {
      value: isOverridden ? (override.format === "text" ? override.value : formatValue(rawValue)) : formatValue(originalRaw),
      rawValue,
      originalValue: formatValue(originalRaw),
      isOverridden,
    };
  };

  const handleSaveOverride = (key: string, rawVal: string) => {
    const existingIndex = config.custom_metrics.findIndex((m) => m.id === key);
    let nextCustom: any[];

    if (rawVal.trim() === "") {
      nextCustom = config.custom_metrics.filter((m) => m.id !== key);
    } else {
      let format = "number";
      if (["spend", "cost", "avgCpc", "cpc", "cpa", "revenue", "purchaseValue"].includes(key)) format = "currency";
      else if (key === "ctr") format = "percent";
      else if (key === "roas") format = "number";

      let label = key;
      if (key === "spend" || key === "cost") label = "Investimento";
      else if (key === "conversions") label = "Conversões";
      else if (key === "clicks") label = "Cliques";
      else if (key === "impressions") label = "Impressões";
      else if (key === "ctr") label = "CTR";
      else if (key === "avgCpc") label = "CPC Médio";
      else if (key === "cpa") label = "CPA";
      else if (key === "roas") label = "ROAS";

      const updatedMetric = {
        id: key,
        label,
        value: rawVal,
        format,
      };

      if (existingIndex > -1) {
        nextCustom = config.custom_metrics.map((m, idx) => (idx === existingIndex ? updatedMetric : m));
      } else {
        nextCustom = [...config.custom_metrics, updatedMetric];
      }
    }

    update({ ...config, custom_metrics: nextCustom });
    toast.success("Métrica salva localmente!");
  };

  const handleResetOverride = (key: string) => {
    const nextCustom = config.custom_metrics.filter((m) => m.id !== key);
    update({ ...config, custom_metrics: nextCustom });
    toast.success("Valor original restaurado!");
  };

  const getMetricLabel = (key: string): string => {
    if (key === "spend" || key === "cost") return "Investimento";
    if (key === "conversions") return "Conversões";
    if (key === "clicks") return "Cliques";
    if (key === "impressions") return "Impressões";
    if (key === "ctr") return "CTR";
    if (key === "avgCpc" || key === "cpc") return "CPC Médio";
    if (key === "cpa") return "CPA";
    if (key === "roas") return "ROAS";
    return key;
  };

  const isHighlight = (key: string) => key === "spend" || key === "conversions";
  const isStatusActive = campaign.status?.toLowerCase() === "enabled" || campaign.status?.toLowerCase() === "active";

  // Match keyword formatting
  const getMatchTypeName = (type: string) => {
    switch (type?.toUpperCase()) {
      case "EXACT": return "[Exata]";
      case "PHRASE": return '"Frase"';
      case "BROAD": return "Ampla";
      default: return type || "Ampla";
    }
  };

  const getMatchTypeClass = (type: string) => {
    switch (type?.toUpperCase()) {
      case "EXACT": return "border-blue-500/25 bg-blue-500/10 text-blue-500";
      case "PHRASE": return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
      default: return "border-slate-500/25 bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-[50px]" />

      {/* Campaign Card Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1 flex-1 min-w-[250px]">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 max-w-md w-full">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="h-8 text-sm font-bold text-card-foreground bg-background border-primary/50 focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary hover:bg-primary/10 shrink-0"
                  onClick={handleSaveTitle}
                  disabled={saveLabelMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted shrink-0"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title max-w-full">
                <h3 className="text-lg font-bold text-card-foreground truncate max-w-[350px] md:max-w-[500px]">
                  {customCampaignName}
                </h3>
                {!readOnly && (
                  <button
                    onClick={handleEditTitleClick}
                    className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1 shrink-0"
                    title="Editar nome da campanha"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20`}
            >
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              Consolidado
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Canal: <span className="text-primary font-bold">{campaign.type}</span> • ID: {campaign.id}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-center">
          {!readOnly && clientId && (
            <MetricsCustomizer clientId={clientId} datePreset={datePreset} groupKey={groupKey} />
          )}
        </div>
      </header>

      {/* KPIs Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {config.visible_metrics.map((key) => {
          const { value, originalValue, isOverridden } = getMetricValueAndOverride(key);
          return (
            <EditableKpi
              key={key}
              label={getMetricLabel(key)}
              value={value}
              originalValue={originalValue}
              isOverridden={isOverridden}
              onSave={(val) => handleSaveOverride(key, val)}
              onReset={() => handleResetOverride(key)}
              readOnly={readOnly}
              highlight={isHighlight(key)}
            />
          );
        })}

        {/* Custom manual metrics */}
        {config.custom_metrics
          .filter((m) => !["spend", "cost", "conversions", "clicks", "impressions", "ctr", "avgCpc", "cpc", "cpa", "roas", "revenue", "purchaseValue"].includes(m.id))
          .map((m) => (
            <EditableKpi
              key={m.id}
              label={m.label}
              value={formatCustomValue(m, currencySymbol)}
              isOverridden={true}
              onSave={(val) => {
                const nextCustom = config.custom_metrics.map((item) => (item.id === m.id ? { ...item, value: val } : item));
                update({ ...config, custom_metrics: nextCustom });
              }}
              onReset={() => {
                const nextCustom = config.custom_metrics.filter((item) => item.id !== m.id);
                update({ ...config, custom_metrics: nextCustom });
              }}
              readOnly={readOnly}
            />
          ))}
      </div>

      {/* Conversões Breakdown */}
      {campaign.conversionsBreakdown && campaign.conversionsBreakdown.length > 0 && (() => {
        const getConversionBadgeStyle = (category: string, name: string) => {
          const cat = (category || "").toUpperCase();
          const nm = (name || "").toLowerCase();
          if (cat === "PURCHASE" || nm.includes("compra") || nm.includes("venda") || nm.includes("purchase")) {
            return "bg-purple-500/10 border-purple-500/25 text-purple-400";
          }
          if (cat === "LEAD" || cat === "SUBMIT_LEAD_FORM" || nm.includes("lead") || nm.includes("cadastro") || nm.includes("form")) {
            return "bg-sky-500/10 border-sky-500/25 text-sky-400";
          }
          if (cat === "CONTACT" || nm.includes("contato") || nm.includes("whatsapp") || nm.includes("click") || nm.includes("chamar")) {
            return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
          }
          return "bg-primary/5 border-primary/20 text-muted-foreground";
        };

        return (
          <div className="mt-4 p-3 rounded-xl border border-border bg-muted/5 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Detalhamento de Ações de Conversão
            </h4>
            <div className="flex flex-wrap gap-2">
              {campaign.conversionsBreakdown!.map((cb, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${getConversionBadgeStyle(cb.category, cb.name)}`}
                >
                  <span>{cb.name}</span>
                  <span className="font-bold border-l border-current/25 pl-1.5 ml-0.5">{cb.count.toLocaleString("pt-BR")}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Campaign Details (Keywords or Creatives) */}
      <div className="mt-6 pt-5 border-t border-border/50">
        {/* Case 1: Search Campaign (Top Keywords) */}
        {campaign.type === "SEARCH" && campaign.keywords && campaign.keywords.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-primary" /> Top Palavras-Chave de Busca
            </h4>
            <div className="rounded-xl border border-border/80 overflow-hidden bg-muted/5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-muted-foreground font-semibold">
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-2">Palavra-Chave</th>
                      <th className="text-center px-3 py-2 w-24">Correspondência</th>
                      <th className="text-right px-3 py-2">Investimento</th>
                      <th className="text-right px-3 py-2">Cliques</th>
                      <th className="text-right px-3 py-2">CTR</th>
                      <th className="text-right px-3 py-2">Conversões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.keywords.map((kw, idx) => {
                      const kwCtr = kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2 text-card-foreground font-semibold font-mono">
                            {kw.text}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-semibold tracking-wide ${getMatchTypeClass(kw.matchType)}`}>
                              {getMatchTypeName(kw.matchType)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-card-foreground font-mono">
                            {formatCurrency(kw.cost, currencySymbol)}
                          </td>
                          <td className="px-3 py-2 text-right text-card-foreground font-mono">
                            {kw.clicks.toLocaleString("pt-BR")}
                          </td>
                          <td className="px-3 py-2 text-right text-card-foreground font-mono">
                            {kwCtr.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2 text-right text-primary font-bold font-mono">
                            {kw.conversions.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Case 2: Display or PMax Campaign (Top Creatives - Excluding Video/Demand Gen) */}
        {campaign.type !== "DEMAND_GEN" && campaign.type !== "VIDEO" && campaignCreatives && campaignCreatives.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Top Criativos (Imagens & Vídeos)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {campaignCreatives.map((creative) => {
                const isVideo = !!creative.youtubeVideoId;
                const imageUrl = isVideo
                  ? `https://img.youtube.com/vi/${creative.youtubeVideoId}/hqdefault.jpg`
                  : creative.imageUrl;

                return (
                  <div
                    key={creative.id}
                    className="group/creative relative rounded-xl border border-border/80 bg-muted/5 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-md"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-video sm:aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover group-hover/creative:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement?.classList.add("fallback-bg");
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}

                      {/* Icon overlay for type */}
                      <span className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white backdrop-blur-sm border border-white/10 shrink-0">
                        {isVideo ? <Video className="h-3.5 w-3.5 text-red-500 fill-red-500" /> : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
                      </span>

                      {/* Hover stats overlay */}
                      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/creative:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 text-[10px] text-white/95">
                        <div className="font-semibold text-[11px] truncate text-white mb-1.5">{creative.name}</div>
                        <div className="flex justify-between border-b border-white/15 pb-0.5">
                          <span className="text-white/60">Investimento</span>
                          <span className="font-mono">{formatCurrency(creative.cost, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/15 py-0.5">
                          <span className="text-white/60">Cliques</span>
                          <span className="font-mono">{creative.clicks.toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="text-white/60 font-medium">Conversões</span>
                          <span className="text-primary font-bold font-mono">{creative.conversions.toFixed(0)}</span>
                        </div>
                        {isVideo && (creative.videoViews ? creative.videoViews > 0 : false) && (
                           <>
                             <div className="flex justify-between border-t border-white/15 py-0.5 mt-0.5">
                               <span className="text-white/60">Visualizações</span>
                               <span className="font-mono">{creative.videoViews!.toLocaleString("pt-BR")}</span>
                             </div>
                             <div className="flex justify-between py-0.5">
                               <span className="text-white/60">Retenção (100%)</span>
                               <span className="font-mono">{(creative.videoP100Rate! * 100).toFixed(1)}%</span>
                             </div>
                           </>
                        )}
                      </div>
                    </div>

                    {/* Inline display name & actions */}
                    <div className="p-2 space-y-1">
                      <div className="text-[10px] font-bold text-muted-foreground truncate" title={creative.name}>
                        {creative.name}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground/80">
                        <span>Conv: <span className="font-bold text-primary">{creative.conversions.toFixed(0)}</span></span>
                        {isVideo && (
                          <a
                            href={`https://www.youtube.com/watch?v=${creative.youtubeVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-400 font-semibold flex items-center gap-0.5 transition-colors"
                          >
                            Assistir
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback empty message for keywords/creatives */}
        {(!campaign.keywords || campaign.keywords.length === 0) && (!campaignCreatives || campaignCreatives.length === 0) && (
          <p className="text-[11px] text-muted-foreground/80 italic text-center py-2">
            Nenhuma palavra-chave ou criativo registrado no período para esta campanha.
          </p>
        )}
      </div>
    </section>
  );
}
