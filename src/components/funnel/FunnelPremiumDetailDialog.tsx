import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelLabels } from "@/hooks/useFunnelLabels";
import { useFunnelPrimaryMetrics } from "@/hooks/useFunnelPrimaryMetric";
import { useAdaptedCampaigns } from "@/hooks/useAdaptedCampaigns";
import { useFunnelMetricOverrides, useSaveFunnelMetricOverride } from "@/hooks/useFunnelMetricOverrides";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics, DEFAULT_DIAGNOSTICS, getFunnelActiveDiagnostics } from "@/hooks/useFunnelDiagnostics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Search, RefreshCw, X, Check, Eye, ArrowUp, ArrowDown, Plus, Trash2, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { resolveMetricKey, getMetricValue } from "@/lib/metaMetricCatalog";
import { formatMetricValue } from "@/lib/metaMetrics";
import { useDiagnosticMetricsConfig } from "@/hooks/useDiagnosticMetricsConfig";
import { MetricsCustomizer } from "@/components/diagnostico/MetricsCustomizer";
import { useFunnelStages, useSaveFunnelStages, DEFAULT_STAGES } from "@/hooks/useFunnelStages";


interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol?: string;
  datePreset: string;
  readOnly?: boolean;
  isManual?: boolean;
}

export function FunnelPremiumDetailDialog({
  open,
  onClose,
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol = "R$",
  datePreset,
  readOnly = false,
  isManual = false,
}: Props) {
  const { data: labelMap } = useFunnelLabels(clientId);
  const displayLabel = (labelMap?.[funnelCode] || funnelLabel || funnelCode).replace(/^F\d+\s*[\-—]\s*/, "");

  const { data: primaryMetrics } = useFunnelPrimaryMetrics(clientId);
  const adaptedCampaigns = useAdaptedCampaigns(campaigns, primaryMetrics);

  const { data: overrides } = useFunnelMetricOverrides(clientId);
  const saveMetricOverride = useSaveFunnelMetricOverride();

  const { data: funnelDiag } = useFunnelDiagnostics(clientId, funnelCode);
  const saveFunnelDiag = useSaveFunnelDiagnostics();

  // Metrics customization configuration hook
  const {
    config: metricsConfig,
    update: updateMetricsConfig,
    availableMetrics,
  } = useDiagnosticMetricsConfig(clientId, datePreset, funnelCode);

  // Funnel stages config
  const { data: savedStages } = useFunnelStages(clientId, funnelCode);
  const saveStagesMutation = useSaveFunnelStages();

  const [editingJourney, setEditingJourney] = useState(false);
  const [journeyStages, setJourneyStages] = useState<{ name: string; metric_key: string; sort_order: number }[]>([]);

  useEffect(() => {
    if (savedStages && savedStages.length > 0) {
      setJourneyStages(savedStages.map(s => ({ name: s.name, metric_key: s.metric_key, sort_order: s.sort_order })));
    } else {
      setJourneyStages(DEFAULT_STAGES.map(s => ({ ...s })));
    }
  }, [savedStages]);

  // Dialog edit states
  const [editingItem, setEditingItem] = useState<{
    type: "primary" | "secondary" | "journey" | "curve" | "rate" | "diagnostic" | "health" | "custom";
    key: string;
    label: string;
    value: any;
  } | null>(null);

  const [editValue, setEditValue] = useState("");
  const [editScore, setEditScore] = useState(0);
  const [editText, setEditText] = useState("");
  const [editSuggestion, setEditSuggestion] = useState("");

  // Dynamic Indicator management states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newIndicatorTitle, setNewIndicatorTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const handleStartEdit = (type: any, key: string, label: string, currentVal: any) => {
    if (readOnly) return;
    setEditingItem({ type, key, label, value: currentVal });
    
    if (type === "diagnostic") {
      setEditScore(currentVal?.score ?? 0);
      setEditText(currentVal?.text ?? "");
      setEditSuggestion(currentVal?.suggestion ?? "");
      
      const metadata = getDiagnosticBlockMetadata(key, currentVal);
      setEditTitle(metadata.title);
      setEditPlaceholder(metadata.placeholder);
      setEditEnabled(currentVal?.enabled !== false);
    } else if (type === "health") {
      setEditScore(currentVal);
    } else {
      setEditValue(String(currentVal ?? ""));
    }
  };

  const handleDeleteDiagnostic = async () => {
    if (!editingItem || editingItem.type !== "diagnostic" || !clientId || !funnelCode) return;
    try {
      const currentDiags = { ...funnelDiag?.diagnostics };
      delete currentDiags[editingItem.key];
      await saveFunnelDiag.mutateAsync({
        clientId,
        funnelCode,
        patch: { diagnostics: currentDiags },
      });
      toast.success("Indicador removido!");
      setEditingItem(null);
    } catch (err) {
      toast.error("Erro ao remover indicador");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      if (editingItem.type === "diagnostic") {
        const currentDiags = { ...funnelDiag?.diagnostics };
        currentDiags[editingItem.key] = {
          score: Number(editScore),
          text: editText,
          suggestion: editSuggestion,
          title: editTitle,
          placeholder: editPlaceholder,
          enabled: editEnabled,
          isCustom: funnelDiag?.diagnostics?.[editingItem.key]?.isCustom || editingItem.key.startsWith("custom_"),
        };
        await saveFunnelDiag.mutateAsync({
          clientId,
          funnelCode,
          patch: { diagnostics: currentDiags },
        });
        toast.success("Diagnóstico atualizado!");
      } else if (editingItem.type === "health") {
        await saveFunnelDiag.mutateAsync({
          clientId,
          funnelCode,
          patch: { health_score: Number(editScore) },
        });
        toast.success("Saúde do funil atualizada!");
      } else if (editingItem.type === "curve") {
        const currentCurve = { ...funnelDiag?.curve_data };
        (currentCurve as any)[editingItem.key] = Number(editValue);
        await saveFunnelDiag.mutateAsync({
          clientId,
          funnelCode,
          patch: { curve_data: currentCurve },
        });
        toast.success("Métrica de criativo atualizada!");
      } else if (editingItem.type === "custom") {
        const nextCustom = metricsConfig.custom_metrics.map(m =>
          m.id === editingItem.key ? { ...m, value: editValue } : m
        );
        await updateMetricsConfig({ ...metricsConfig, custom_metrics: nextCustom });
        toast.success("Métrica manual atualizada!");
      } else {
        // Save metric override
        await saveMetricOverride.mutateAsync({
          clientId,
          funnelCode,
          metricKey: editingItem.key,
          metricValue: Number(editValue),
        });
        toast.success("Métrica atualizada!");
      }
      setEditingItem(null);
    } catch (err) {
      toast.error("Erro ao salvar alterações");
    }
  };

  // Base metrics aggregations helper
  const sumMetric = (k: string) => {
    const canonical = resolveMetricKey(k);
    return adaptedCampaigns.reduce((acc, c) => {
      if (c.actionBreakdown && c.actionBreakdown[k] !== undefined) return acc + Number(c.actionBreakdown[k] || 0);
      return acc + Number((c as any)[canonical] ?? (c as any)[k] ?? 0);
    }, 0);
  };

  // Derived overrides mapping
  const getMetricValueAndOverride = (key: string): number => {
    const ov = overrides?.[funnelCode]?.[key];
    if (ov !== undefined) return ov;

    switch (key) {
      case "spend":
        return adaptedCampaigns.reduce((acc, c) => acc + c.spend, 0);
      case "conversions":
        return sumMetric("conversions");
      case "purchases":
      case "sales":
        return sumMetric("purchases");
      case "clicks":
        return sumMetric("clicks");
      case "impressions":
        return sumMetric("impressions");
      case "revenue":
      case "purchaseValue":
        return sumMetric("purchaseValue");
      case "reach":
        return sumMetric("reach");
      case "landingPageViews":
      case "landing_page_views":
        return sumMetric("landingPageViews") || getMetricValueAndOverride("clicks") * 0.85;
      case "frequency": {
        const imp = getMetricValueAndOverride("impressions");
        const rch = getMetricValueAndOverride("reach");
        return rch > 0 ? imp / rch : 1.4;
      }
      case "cpa": {
        const sp = getMetricValueAndOverride("spend");
        const pur = getMetricValueAndOverride("purchases");
        return pur > 0 ? sp / pur : 0;
      }
      case "cpl":
      case "cpLead":
      case "costPerConversion": {
        const sp = getMetricValueAndOverride("spend");
        const conv = getMetricValueAndOverride("conversions");
        return conv > 0 ? sp / conv : 0;
      }
      case "roas": {
        const sp = getMetricValueAndOverride("spend");
        const rev = getMetricValueAndOverride("revenue");
        return sp > 0 ? rev / sp : 0;
      }
      case "profit": {
        const sp = getMetricValueAndOverride("spend");
        const rev = getMetricValueAndOverride("revenue");
        return rev - sp;
      }
      case "ctr": {
        const clk = getMetricValueAndOverride("clicks");
        const imp = getMetricValueAndOverride("impressions");
        return imp > 0 ? (clk / imp) * 100 : 0;
      }
      case "cpc": {
        const sp = getMetricValueAndOverride("spend");
        const clk = getMetricValueAndOverride("clicks");
        return clk > 0 ? sp / clk : 0;
      }
      case "cpm": {
        const sp = getMetricValueAndOverride("spend");
        const imp = getMetricValueAndOverride("impressions");
        return imp > 0 ? (sp / imp) * 1000 : 0;
      }
      case "oferta":
        return 10.00;
      default:
        return sumMetric(key);
    }
  };

  const spend = getMetricValueAndOverride("spend");
  const conversions = getMetricValueAndOverride("conversions");
  const purchases = getMetricValueAndOverride("purchases");
  const clicks = getMetricValueAndOverride("clicks");
  const impressions = getMetricValueAndOverride("impressions");
  const revenue = getMetricValueAndOverride("revenue");
  const reach = getMetricValueAndOverride("reach");

  // Recalculated primary metrics based on overrides
  const cpa = getMetricValueAndOverride("cpa");
  const cpl = getMetricValueAndOverride("cpl");
  const roas = getMetricValueAndOverride("roas");
  const profit = getMetricValueAndOverride("profit");
  const ctr = getMetricValueAndOverride("ctr");
  const oferta = getMetricValueAndOverride("oferta");

  const primaryKeys = metricsConfig?.visible_metrics?.slice(0, 9) || [];
  const secondaryKeys = metricsConfig?.visible_metrics?.slice(9) || [];

  const diags = funnelDiag?.diagnostics || DEFAULT_DIAGNOSTICS.diagnostics;
  const curve = funnelDiag?.curve_data || DEFAULT_DIAGNOSTICS.curve_data;

  // Calculate dynamic health score based on active diagnostics average
  const activeDiagnostics = getFunnelActiveDiagnostics(funnelCode);
  const calculatedHealthScore = (() => {
    const scores: number[] = [];
    Object.entries(activeDiagnostics).forEach(([key, isActive]) => {
      if (isActive) {
        const diagBlock = diags[key as keyof typeof diags];
        if (diagBlock && typeof diagBlock.score === 'number' && diagBlock.score > 0) {
          scores.push(diagBlock.score);
        }
      }
    });
    if (scores.length > 0) {
      const sum = scores.reduce((a, b) => a + b, 0);
      return Math.round((sum / scores.length) * 10) / 10;
    }
    return DEFAULT_DIAGNOSTICS.health_score;
  })();

  // Setup diagnostic values
  const healthScore = (funnelDiag?.health_score !== undefined && funnelDiag.health_score !== 7.5 && funnelDiag.health_score !== 0)
    ? funnelDiag.health_score
    : calculatedHealthScore;
  const healthLabel = healthScore === 0 ? "Não Avaliado" : healthScore >= 8.5 ? "Excelente" : healthScore >= 7.0 ? "Saudável" : healthScore >= 5.0 ? "Atenção" : "Crítico";
  const healthColor = healthScore === 0 ? "text-muted-foreground/80 fill-muted-foreground/30" : healthScore >= 8.5 ? "text-emerald-400 fill-emerald-500" : healthScore >= 7.0 ? "text-green-400 fill-green-500" : healthScore >= 5.0 ? "text-amber-400 fill-amber-500" : "text-red-400 fill-red-500";

  const getScoreDotClass = (score: number) => {
    if (score === 0) return "bg-muted-foreground/30 border border-muted-foreground/20";
    if (score >= 8.5) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
    if (score >= 7.0) return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
    if (score >= 5.0) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
    return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
  };

  const getScoreText = (score: number) => {
    if (score === 0) return "—";
    return score.toFixed(1);
  };

  // Video watch time and retention rates calculation
  const videoPlays = getMetricValueAndOverride("videoPlays");
  const videoP25 = getMetricValueAndOverride("videoP25");
  const videoP50 = getMetricValueAndOverride("videoP50");
  const videoP75 = getMetricValueAndOverride("videoP75");
  const videoP100 = getMetricValueAndOverride("videoP100");

  const liveImpressions = getMetricValueAndOverride("impressions");
  const liveVideoView3s = sumMetric("videoView3s") || sumMetric("video_view") || sumMetric("video_3s");
  const liveVideoP95 = sumMetric("videoP95") || sumMetric("video_p95_watched_actions");
  const liveThruplays = sumMetric("thruplays") || sumMetric("video_thruplay_watched_actions");
  const liveVideoPlays = sumMetric("videoPlays") || sumMetric("video_play");
  const liveSpend = getMetricValueAndOverride("spend");

  const liveHookRate = liveImpressions > 0 ? (liveVideoView3s / liveImpressions) * 100 : 0;
  const liveHoldRate = liveVideoView3s > 0 ? (liveVideoP95 / liveVideoView3s) * 100 : 0;
  const liveLinkCtr = liveImpressions > 0 ? (sumMetric("linkClicks") / liveImpressions) * 100 : 0;
  const liveAvgVideoTime = getMetricValueAndOverride("avgVideoTime") || 0;
  const liveCostPerPlay = liveVideoPlays > 0 ? liveSpend / liveVideoPlays : (liveThruplays > 0 ? liveSpend / liveThruplays : 0);

  const isMockHook = !curve || curve.hook_rate === 94.5;
  const isMockHold = !curve || curve.hold_rate === 17.5;
  const isMockCtr = !curve || curve.ctr_link === 2.74;
  const isMockAvgTime = !curve || curve.avgVideoTime === 5.4 || curve.avgVideoTime === 3.0;
  const isMockCostPlay = !curve || curve.cost_per_play === 0.05;

  const hookRateVal = isMockHook ? (liveHookRate || curve?.hook_rate || 94.5) : (curve?.hook_rate ?? 94.5);
  const holdRateVal = isMockHold ? (liveHoldRate || curve?.hold_rate || 17.5) : (curve?.hold_rate ?? 17.5);
  const ctrLinkVal = isMockCtr ? (liveLinkCtr || curve?.ctr_link || 2.74) : (curve?.ctr_link ?? 2.74);
  const avgVideoTimeVal = isMockAvgTime ? (liveAvgVideoTime || curve?.avgVideoTime || 5.4) : (curve?.avgVideoTime ?? 5.4);
  const costPerPlayVal = isMockCostPlay ? (liveCostPerPlay || curve?.cost_per_play || 0.05) : (curve?.cost_per_play ?? 0.05);

  const p25Rate = videoPlays > 0 ? (videoP25 / videoPlays) * 100 : hookRateVal;
  const p50Rate = videoPlays > 0 ? (videoP50 / videoPlays) * 100 : holdRateVal;
  const p75Rate = videoPlays > 0 ? (videoP75 / videoPlays) * 100 : 25;
  const p100Rate = videoPlays > 0 ? (videoP100 / videoPlays) * 100 : 12;

  const avgVideoTime = avgVideoTimeVal;

  const xPos = Math.min(95, Math.max(5, (avgVideoTime / 15) * 100));
  let yRate = 100;
  if (xPos < 25) {
    yRate = 100 - ((100 - p25Rate) * xPos) / 25;
  } else if (xPos < 50) {
    yRate = p25Rate - ((p25Rate - p50Rate) * (xPos - 25)) / 25;
  } else if (xPos < 75) {
    yRate = p50Rate - ((p50Rate - p75Rate) * (xPos - 50)) / 25;
  } else {
    yRate = p75Rate - ((p75Rate - p100Rate) * (xPos - 75)) / 25;
  }
  const yValAtAvgTime = 45 - (yRate / 100) * 40;

  const y0 = 5;
  const y1 = 45 - (p25Rate / 100) * 40;
  const y2 = 45 - (p50Rate / 100) * 40;
  const y3 = 45 - (p75Rate / 100) * 40;
  const y4 = 45 - (p100Rate / 100) * 40;
  
  const dPath = `M 0 ${y0} L 25 ${y1} L 50 ${y2} L 75 ${y3} L 100 ${y4}`;
  const dArea = `${dPath} L 100 50 L 0 50 Z`;

  // Search filter
  const [search, setSearch] = useState("");
  const matchesSearch = (label: string) => !search || label.toLowerCase().includes(search.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-none !w-screen !h-screen !left-0 !top-0 !translate-x-0 !translate-y-0 !rounded-none p-0 gap-0 border-0 bg-background overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-[#0a0a0c] border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: "'Syne', system-ui, sans-serif" }} className="text-xl font-bold uppercase tracking-[0.06em] text-card-foreground">
              {displayLabel}
            </span>
            {funnelCode.startsWith("GADS-") || funnelCode.startsWith("gads-") || funnelCode.startsWith("google-ads-") ? (
              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full select-none">Google Ads</span>
            ) : (
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">Meta Ads</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <MetricsCustomizer clientId={clientId} datePreset={datePreset} groupKey={funnelCode} />
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar métrica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/40 border-border focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-muted/20 border-border hover:bg-muted/40 cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </Button>
            <Button onClick={onClose} variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-muted/20 border-border hover:bg-muted/40 cursor-pointer">
              Voltar
            </Button>
          </div>
        </div>

        {/* Core content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-[#0c0c0e]">
          
          {/* Métricas Principais */}
          {matchesSearch("Métricas Principais") && primaryKeys.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Métricas Principais</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                {primaryKeys.map((key) => {
                  const meta = availableMetrics.find(m => m.key === key);
                  if (!meta) return null;
                  const value = getMetricValueAndOverride(key);
                  const formatted = formatMetricValue(key, value, currencySymbol);

                  return (
                    <div 
                      key={key}
                      className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                      onClick={() => handleStartEdit("primary", key, meta.label, value)}
                    >
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{meta.label}</span>
                      <span className="text-xl font-bold text-card-foreground mt-2">{formatted}</span>
                      <span className="text-[9px] text-green-400 font-medium mt-1">Estável</span>
                      <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Métricas Secundárias */}
          {matchesSearch("Métricas Secundárias") && (secondaryKeys.length > 0 || (metricsConfig?.custom_metrics && metricsConfig.custom_metrics.length > 0)) && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Métricas Secundárias</div>
              <div className="flex flex-wrap gap-3">
                {secondaryKeys.map((key) => {
                  const meta = availableMetrics.find(m => m.key === key);
                  if (!meta) return null;
                  const value = getMetricValueAndOverride(key);
                  const formatted = formatMetricValue(key, value, currencySymbol);

                  return (
                    <div 
                      key={key}
                      className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      onClick={() => handleStartEdit("secondary", key, meta.label, value)}
                    >
                      <span className="text-[10px] text-muted-foreground">{meta.label}:</span>
                      <span className="text-xs font-bold text-card-foreground">{formatted}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                    </div>
                  );
                })}

                {metricsConfig?.custom_metrics?.map((m) => (
                  <div 
                    key={m.id}
                    className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("custom", m.id, m.label, m.value)}
                  >
                    <span className="text-[10px] text-muted-foreground">{m.label}:</span>
                    <span className="text-xs font-bold text-card-foreground">{m.value}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Middle Row (Jornada, Qualidade, Taxas) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Jornada de Conversão */}
            <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 tracking-[0.03em]">
                    🔻 Jornada de Conversão
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Volume e queda entre etapas</p>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => setEditingJourney(!editingJourney)}
                    title="Editar etapas da jornada"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {editingJourney ? (
                <div className="space-y-2 flex-1 mt-4">
                  {journeyStages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/20 rounded-lg p-2 border border-border/50">
                      <Input
                        value={stage.name}
                        onChange={e => {
                          const next = [...journeyStages];
                          next[i].name = e.target.value;
                          setJourneyStages(next);
                        }}
                        className="h-8 text-xs flex-1 bg-background/50 border-border"
                        placeholder="Nome da etapa"
                      />
                      <Select
                        value={stage.metric_key}
                        onValueChange={v => {
                          const next = [...journeyStages];
                          next[i].metric_key = v;
                          setJourneyStages(next);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-[130px] bg-background/50 border-border">
                          <SelectValue placeholder="Métrica" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {availableMetrics.map(m => (
                            <SelectItem key={m.key} value={m.key} className="text-xs">{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...journeyStages];
                            [next[i], next[i - 1]] = [next[i - 1], next[i]];
                            setJourneyStages(next.map((s, idx) => ({ ...s, sort_order: idx })));
                          }}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={i === journeyStages.length - 1}
                          onClick={() => {
                            const next = [...journeyStages];
                            [next[i], next[i + 1]] = [next[i + 1], next[i]];
                            setJourneyStages(next.map((s, idx) => ({ ...s, sort_order: idx })));
                          }}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive/80"
                          onClick={() => {
                            setJourneyStages(journeyStages.filter((_, idx) => idx !== i));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setJourneyStages([...journeyStages, { name: "Nova Etapa", metric_key: availableMetrics[0]?.key || "spend", sort_order: journeyStages.length }]);
                      }}
                      className="text-[11px] h-8 flex-1 gap-1 border-border/80"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar etapa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setJourneyStages(DEFAULT_STAGES.map(s => ({ ...s })));
                      }}
                      className="text-[11px] h-8 gap-1 border-border/80 text-amber-500 hover:text-amber-500/90"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/60 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingJourney(false);
                        if (savedStages && savedStages.length > 0) {
                          setJourneyStages(savedStages.map(s => ({ name: s.name, metric_key: s.metric_key, sort_order: s.sort_order })));
                        } else {
                          setJourneyStages(DEFAULT_STAGES.map(s => ({ ...s })));
                        }
                      }}
                      className="text-[11px] h-8 flex-1 border-border/80"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await saveStagesMutation.mutateAsync({
                            clientId,
                            campaignId: funnelCode,
                            stages: journeyStages,
                          });
                          setEditingJourney(false);
                          toast.success("Jornada de conversão salva!");
                        } catch {
                          toast.error("Erro ao salvar jornada de conversão");
                        }
                      }}
                      disabled={saveStagesMutation.isPending}
                      className="text-[11px] h-8 flex-1"
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex-1 mt-4">
                  {journeyStages.map((stage, i) => {
                    const value = getMetricValueAndOverride(stage.metric_key);
                    const prevValue = i > 0 ? getMetricValueAndOverride(journeyStages[i - 1].metric_key) : 0;
                    const rate = prevValue > 0 ? (value / prevValue) * 100 : undefined;
                    const drop = rate !== undefined ? 100 - rate : 0;
                    const isBottleneck = rate !== undefined && rate < 20 && value > 0;

                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div 
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors ${
                            isBottleneck ? "border-red-500/20 bg-red-500/5 hover:border-red-500/30" : ""
                          }`}
                          onClick={() => handleStartEdit("journey", stage.metric_key, stage.name, value)}
                        >
                          <div>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">{stage.name}</span>
                            <p className="text-base font-extrabold text-card-foreground mt-0.5">{value.toLocaleString("pt-BR")}</p>
                          </div>
                          {rate !== undefined && (
                            <div className="text-right text-[10px]">
                              <span className={`font-bold uppercase tracking-wide ${isBottleneck ? "text-red-400" : "text-green-400"}`}>
                                {isBottleneck ? `GARGALO (${drop.toFixed(1)}% QUEDA)` : `↓ ${rate.toFixed(1)}% retidos`}
                              </span>
                              <p className="text-muted-foreground mt-0.5">{rate.toFixed(1)}% retidos</p>
                            </div>
                          )}
                        </div>
                        {i < journeyStages.length - 1 && (
                          <div className="h-3 w-px bg-border/60" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Qualidade de Criativo */}
            <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 flex flex-col justify-between relative group/box2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em] flex items-center gap-1.5">
                    🎬 Qualidade de Criativo
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1">Retenção de vídeos e atenção</p>
                </div>
                <div 
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border bg-[#0c0c0e] transition-all duration-300 ${
                    readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#10b981]/[0.01]"
                  }`}
                  onClick={() => handleStartEdit("diagnostic", "criativos", "Criativos", diags.criativos)}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${getScoreDotClass(diags.criativos.score)}`} />
                  <span className="text-[8px] uppercase font-bold text-muted-foreground">Nota:</span>
                  <span className="text-xs font-black text-primary font-display">{getScoreText(diags.criativos.score)}</span>
                  {!readOnly && (
                    <Pencil className="h-2 w-2 text-muted-foreground/60 ml-0.5" />
                  )}
                </div>
              </div>

              {/* Retention curve SVG */}
              <div className="h-36 w-full relative mt-6 border border-border/30 rounded-xl bg-black/20 p-2 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="curve-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={dArea} fill="url(#curve-grad)" />
                  <path d={dPath} fill="none" stroke="#10b981" strokeWidth="2" />

                  {/* Vertical line for avgVideoTime */}
                  {avgVideoTime > 0 && (
                    <g>
                      <line
                        x1={xPos}
                        y1="0"
                        x2={xPos}
                        y2="50"
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                      <circle cx={xPos} cy={yValAtAvgTime} r="3" fill="#3b82f6" className="animate-pulse" />
                    </g>
                  )}
                </svg>
                <span className="absolute top-2 left-2 text-[9px] font-mono text-muted-foreground/60 select-none">0s</span>
                <span className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/60 select-none">100%</span>
                {avgVideoTime > 0 && (
                  <div 
                    className="absolute top-2 bg-blue-600/95 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow border border-blue-400/30 transition-all select-none"
                    style={{ left: `calc(${xPos}% - 35px)` }}
                  >
                    Média: {avgVideoTime.toFixed(1)}s
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border/60">
                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "hook_rate", "Hook Rate (3s)", hookRateVal)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hook Rate (3s)</span>
                  <span className="text-sm font-bold text-primary mt-1">{hookRateVal.toFixed(1)}%</span>
                </div>
                
                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "hold_rate", "Hold Rate", holdRateVal)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hold Rate</span>
                  <span className="text-sm font-bold text-primary mt-1">{holdRateVal.toFixed(1)}%</span>
                </div>

                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "ctr_link", "CTR Link", ctrLinkVal)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">CTR Link</span>
                  <span className="text-sm font-bold text-primary mt-1">{ctrLinkVal.toFixed(2)}%</span>
                </div>

                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "avgVideoTime", "Tempo Médio", avgVideoTime)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Tempo Médio (s)</span>
                  <span className="text-sm font-bold text-primary mt-1">{avgVideoTime.toFixed(1)}s</span>
                </div>

                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20 col-span-2"
                  onClick={() => handleStartEdit("curve", "cost_per_play", "Custo por Play", costPerPlayVal)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Custo por Play</span>
                  <span className="text-sm font-bold text-primary mt-1">{currencySymbol} {costPerPlayVal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 3. Taxas de Conversão */}
            <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em]">
                  📊 Taxas de Conversão
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">Eficiência entre estágios</p>
              </div>

              <div className="space-y-4 mt-4 flex-1">
                {/* LP view rate */}
                {(() => {
                  const lpRate = clicks > 0 ? (getMetricValueAndOverride("landingPageViews") / clicks) * 100 : 0;
                  const isGood = lpRate >= 75;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-card-foreground">Clique para LP View</span>
                        <span className={isGood ? "text-green-400" : "text-amber-400"}>
                          {isGood ? "EXCELENTE" : "ATENÇÃO"} {lpRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isGood ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${lpRate}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground">Benchmark: 75%</div>
                    </div>
                  );
                })()}

                {/* LP view to Lead */}
                {(() => {
                  const lpViews = getMetricValueAndOverride("landingPageViews");
                  const leadRate = lpViews > 0 ? (conversions / lpViews) * 100 : 0;
                  const isGood = leadRate >= 20;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-card-foreground">LP View para Lead</span>
                        <span className={isGood ? "text-green-400" : "text-amber-400"}>
                          {isGood ? "EXCELENTE" : "ATENÇÃO"} {leadRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isGood ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${leadRate}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground">Benchmark: 20%</div>
                    </div>
                  );
                })()}

                {/* Lead to Reunião */}
                {(() => {
                  const rate = conversions > 0 ? (purchases / conversions) * 100 : 0;
                  const isGood = rate >= 8;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-card-foreground">Lead para Reunião</span>
                        <span className={isGood ? "text-green-400" : "text-amber-400"}>
                          {isGood ? "EXCELENTE" : "ATENÇÃO"} {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isGood ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${rate}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground">Benchmark: 8%</div>
                    </div>
                  );
                })()}

                {/* Reunião para Venda */}
                {(() => {
                  const isGood = true; // default benchmark
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-card-foreground">Reunião para Venda</span>
                        <span className="text-green-400">EXCELENTE 25.8%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: "25.8%" }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground">Benchmark: 10%</div>
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>

          {/* Saúde Geral do Funil & Diagnóstico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Circular Gauge */}
            <div 
              className="relative group border border-border bg-[#0f0f12] rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 cursor-pointer"
              onClick={() => handleStartEdit("health", "health_score", "Saúde Geral", healthScore)}
            >
              <h3 className="text-sm font-bold text-card-foreground self-start tracking-[0.03em]">
                🌟 Saúde Geral do Funil
              </h3>
              
              <div className="relative flex items-center justify-center h-40 w-40 mt-4 select-none">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="65" fill="transparent" stroke="#1c1c22" strokeWidth="8" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="65" 
                    fill="transparent" 
                    stroke="#10b981" 
                    strokeWidth="8" 
                    strokeDasharray="408" 
                    strokeDashoffset={408 - (408 * (healthScore / 10))} 
                    className="transition-all duration-500 ease-out stroke-primary"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-card-foreground tracking-tight">{healthScore.toFixed(1)}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${healthColor}`}>{healthLabel}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">Avaliação média do funil baseada nos indicadores principais.</p>
              <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
            </div>

            {/* Diagnostics Cards Grid */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Diagnóstico</div>
                {!readOnly && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/10 gap-1 px-2 border border-primary/20 rounded-lg"
                    onClick={() => setIsManageModalOpen(true)}
                  >
                    Gerenciar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {getSortedDiagnosticKeys(diags).map((key) => {
                  const diagBlock = diags[key];
                  const isEnabled = diagBlock?.enabled !== false && (
                    diagBlock?.enabled === true || 
                    (activeDiagnostics as any)[key] !== false
                  );
                  
                  if (!isEnabled) return null;
                  
                  const { title, placeholder } = getDiagnosticBlockMetadata(key, diagBlock);
                  const displayText = diagBlock.text || placeholder;
                  
                  return (
                    <div 
                      key={key}
                      className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                      onClick={() => handleStartEdit("diagnostic", key, title, diagBlock)}
                    >
                      <div>
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className="text-card-foreground">{title}</span>
                          <span className="text-primary">{getScoreText(diagBlock.score)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{displayText}</p>
                      </div>
                      {diagBlock.suggestion && (
                        <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                          {diagBlock.suggestion}
                        </Button>
                      )}
                      <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                    </div>
                  );
                })}

                {getSortedDiagnosticKeys(diags).filter((key) => {
                  const diagBlock = diags[key];
                  return diagBlock?.enabled !== false && (
                    diagBlock?.enabled === true || 
                    (activeDiagnostics as any)[key] !== false
                  );
                }).length === 0 && (
                  <div className="col-span-full text-center py-8 border border-dashed border-border/50 rounded-xl bg-black/10">
                    <p className="text-xs text-muted-foreground">Nenhum indicador ativo.</p>
                    {!readOnly && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs text-primary font-bold mt-1"
                        onClick={() => setIsManageModalOpen(true)}
                      >
                        Ativar Indicadores
                      </Button>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>

        {/* Modal Editor */}
        <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
          <DialogContent className="sm:max-w-md bg-popover border border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Editar: {editingItem?.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              
              {editingItem?.type === "diagnostic" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Nota (0 a 10)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texto explicativo</Label>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="text-sm bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Botão de sugestão (opcional)</Label>
                    <Input
                      value={editSuggestion}
                      onChange={(e) => setEditSuggestion(e.target.value)}
                      placeholder="Ex: Otimizar LP"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="border-t border-border/40 my-3 pt-3 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Configurações do Indicador</span>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome / Título</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder (quando vazio)</Label>
                      <Input
                        value={editPlaceholder}
                        onChange={(e) => setEditPlaceholder(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="checkbox"
                        checked={editEnabled}
                        onChange={(e) => setEditEnabled(e.target.checked)}
                        className="rounded border-border/80 text-primary focus:ring-primary h-3.5 w-3.5"
                        id="edit-enabled-cb"
                      />
                      <label htmlFor="edit-enabled-cb" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Exibir indicador no painel
                      </label>
                    </div>
                  </div>
                </>
              ) : editingItem?.type === "health" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Nota de Saúde (0 a 10)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="h-9 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Valor numérico</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}

            </div>
            <DialogFooter className="flex justify-between items-center w-full gap-2">
              {editingItem?.type === "diagnostic" && (editingItem.key.startsWith("custom_") || funnelDiag?.diagnostics?.[editingItem.key]?.isCustom) && (
                <Button variant="ghost" onClick={handleDeleteDiagnostic} className="h-9 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10 mr-auto">
                  Excluir Indicador
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setEditingItem(null)} className="h-9 text-xs">
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} className="h-9 text-xs">
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gerenciar Indicadores Modal */}
        <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
          <DialogContent className="max-w-md bg-[#0f0f12] border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-wider font-display flex items-center gap-1.5 text-card-foreground">
                🔧 Gerenciar Indicadores do Funil
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-[11px] text-muted-foreground">
                Ative, desative ou gerencie indicadores personalizados para este funil.
              </p>
              
              {/* List of current indicators */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {getSortedDiagnosticKeys(diags).map((key) => {
                  const diagBlock = diags[key];
                  const isEnabled = diagBlock?.enabled !== false && (
                    diagBlock?.enabled === true || 
                    (activeDiagnostics as any)[key] !== false
                  );
                  const { title } = getDiagnosticBlockMetadata(key, diagBlock);
                  const isCustom = diagBlock?.isCustom || key.startsWith("custom_");
                  
                  return (
                    <div key={key} className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-border/40">
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="checkbox"
                          checked={isEnabled}
                          onChange={async (e) => {
                            const currentDiags = { ...diags };
                            currentDiags[key] = {
                              ...(currentDiags[key] || {}),
                              enabled: e.target.checked
                            };
                            await saveFunnelDiag.mutateAsync({
                              clientId,
                              funnelCode,
                              patch: { diagnostics: currentDiags },
                            });
                            toast.success(`${title} ${e.target.checked ? "ativado" : "desativado"}!`);
                          }}
                          className="rounded border-border/80 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-xs font-semibold">{title}</span>
                        {isCustom && (
                          <span className="text-[8px] bg-primary/25 border border-primary/40 text-primary font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Pers.
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setIsManageModalOpen(false);
                            handleStartEdit("diagnostic", key, title, diagBlock);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        
                        {isCustom && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-400 hover:text-red-500"
                            onClick={async () => {
                              const currentDiags = { ...diags };
                              delete currentDiags[key];
                              await saveFunnelDiag.mutateAsync({
                                clientId,
                                funnelCode,
                                patch: { diagnostics: currentDiags },
                              });
                              toast.success("Indicador personalizado excluído!");
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Add Custom Indicator Form */}
              <div className="border-t border-border/50 pt-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Novo Indicador Personalizado</span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Ex: Taxa de Conversão da LP"
                    value={newIndicatorTitle}
                    onChange={(e) => setNewIndicatorTitle(e.target.value)}
                    className="h-8 text-xs flex-1 bg-background"
                  />
                  <Button 
                    size="sm" 
                    className="h-8 text-xs font-semibold"
                    onClick={async () => {
                      if (!newIndicatorTitle.trim()) {
                        toast.error("Insira o nome do indicador");
                        return;
                      }
                      const key = `custom_${Date.now()}`;
                      const currentDiags = { ...diags };
                      currentDiags[key] = {
                        score: 0,
                        text: "",
                        suggestion: "",
                        title: newIndicatorTitle.trim(),
                        placeholder: `Sem diagnóstico de ${newIndicatorTitle.trim().toLowerCase()} salvo. Clique para avaliar.`,
                        enabled: true,
                        isCustom: true
                      };
                      await saveFunnelDiag.mutateAsync({
                        clientId,
                        funnelCode,
                        patch: { diagnostics: currentDiags },
                      });
                      toast.success("Indicador personalizado criado!");
                      setNewIndicatorTitle("");
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setIsManageModalOpen(false)} className="h-8 text-xs font-semibold">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}