import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelLabels } from "@/hooks/useFunnelLabels";
import { useFunnelPrimaryMetrics } from "@/hooks/useFunnelPrimaryMetric";
import { useAdaptedCampaigns } from "@/hooks/useAdaptedCampaigns";
import { useFunnelMetricOverrides, useSaveFunnelMetricOverride } from "@/hooks/useFunnelMetricOverrides";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics } from "@/hooks/useFunnelDiagnostics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Search, RefreshCw, X, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatMetricValue, resolveMetricKey, getMetricValue } from "@/lib/metaMetricCatalog";

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

  // Dialog edit states
  const [editingItem, setEditingItem] = useState<{
    type: "primary" | "secondary" | "journey" | "curve" | "rate" | "diagnostic" | "health";
    key: string;
    label: string;
    value: any;
  } | null>(null);

  const [editValue, setEditValue] = useState("");
  const [editScore, setEditScore] = useState(0);
  const [editText, setEditText] = useState("");
  const [editSuggestion, setEditSuggestion] = useState("");

  const handleStartEdit = (type: any, key: string, label: string, currentVal: any) => {
    if (readOnly) return;
    setEditingItem({ type, key, label, value: currentVal });
    
    if (type === "diagnostic") {
      setEditScore(currentVal.score);
      setEditText(currentVal.text);
      setEditSuggestion(currentVal.suggestion);
    } else if (type === "health") {
      setEditScore(currentVal);
    } else {
      setEditValue(String(currentVal));
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

  // Base metrics aggregations
  const metaTotals = useMemo(() => {
    const sum = (k: string) => {
      const canonical = resolveMetricKey(k);
      return adaptedCampaigns.reduce((acc, c) => {
        if (c.actionBreakdown && c.actionBreakdown[k] !== undefined) return acc + Number(c.actionBreakdown[k] || 0);
        return acc + Number((c as any)[canonical] ?? (c as any)[k] ?? 0);
      }, 0);
    };

    return {
      impressions: sum("impressions"),
      reach: sum("reach"),
      clicks: sum("clicks"),
      landingPageViews: sum("landingPageViews"),
      addToCart: sum("addToCart"),
      initiateCheckout: sum("initiateCheckout"),
      purchases: sum("purchases"),
      conversions: sum("conversions"),
      leads: sum("conversions"),
      revenue: sum("purchaseValue"),
    };
  }, [adaptedCampaigns]);

  // Derived overrides mapping
  const getMetric = (key: string, originalVal: number) => {
    const ov = overrides?.[funnelCode]?.[key];
    return ov !== undefined ? ov : originalVal;
  };

  const spend = getMetric("spend", adaptedCampaigns.reduce((acc, c) => acc + c.spend, 0));
  const conversions = getMetric("conversions", metaTotals.conversions);
  const purchases = getMetric("purchases", metaTotals.purchases);
  const clicks = getMetric("clicks", metaTotals.clicks);
  const impressions = getMetric("impressions", metaTotals.impressions);
  const revenue = getMetric("revenue", metaTotals.revenue);
  const reach = getMetric("reach", metaTotals.reach);

  // Recalculated primary metrics based on overrides
  const cpa = getMetric("cpa", purchases > 0 ? spend / purchases : 0);
  const cpl = getMetric("cpl", conversions > 0 ? spend / conversions : 0);
  const roas = getMetric("roas", spend > 0 ? revenue / spend : 0);
  const profit = getMetric("profit", revenue - spend);
  const ctr = getMetric("ctr", impressions > 0 ? (clicks / impressions) * 100 : 0);
  const oferta = getMetric("oferta", 10.00);

  // Setup diagnostic values
  const healthScore = funnelDiag?.health_score ?? 7.6;
  const healthLabel = healthScore >= 8.5 ? "Excelente" : healthScore >= 7.0 ? "Saudável" : healthScore >= 5.0 ? "Atenção" : "Crítico";
  const healthColor = healthScore >= 8.5 ? "text-emerald-400 fill-emerald-500" : healthScore >= 7.0 ? "text-green-400 fill-green-500" : healthScore >= 5.0 ? "text-amber-400 fill-amber-500" : "text-red-400 fill-red-500";

  const diags = funnelDiag?.diagnostics || DEFAULT_DIAGNOSTICS.diagnostics;
  const curve = funnelDiag?.curve_data || DEFAULT_DIAGNOSTICS.curve_data;

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
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">Meta Ads</span>
            <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full select-none">Google Ads</span>
          </div>
          
          <div className="flex items-center gap-3">
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
          {matchesSearch("Métricas Principais") && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Métricas Principais</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                
                {/* 1. Spend */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "spend", "Investido", spend)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Investido</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{currencySymbol} {spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-green-400 font-medium mt-1">+7.4% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 2. Oferta */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "oferta", "Oferta", oferta)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Oferta</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{currencySymbol} {oferta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-muted-foreground font-medium mt-1">Estável</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 3. ROAS */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "roas", "ROAS", roas)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">ROAS</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{roas.toFixed(2)}x</span>
                  <span className="text-[9px] text-red-400 font-medium mt-1">-2.0% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 4. Vendas */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "purchases", "Vendas (QTD)", purchases)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Vendas (Qtd)</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{Math.round(purchases)}</span>
                  <span className="text-[9px] text-red-400 font-medium mt-1">-3.0% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 5. Leads */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "conversions", "Leads Mapeados", conversions)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Leads (Mapeado)</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{Math.round(conversions)}</span>
                  <span className="text-[9px] text-green-400 font-medium mt-1">+0.8% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 6. CPL */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "cpl", "Custo por Lead (Mapeado)", cpl)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Custo por Lead</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{currencySymbol} {cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-green-400 font-medium mt-1">-1.1% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 7. CPA */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "cpa", "CPA", cpa)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">CPA</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{currencySymbol} {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-green-400 font-medium mt-1">-0.3% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 8. Lucro */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "profit", "Lucro Estimado", profit)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Lucro Estimado</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{currencySymbol} {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-red-400 font-medium mt-1">-11.5% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

                {/* 9. CTR */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/40 bg-card/65 p-4 rounded-xl flex flex-col justify-between h-28 cursor-pointer transition-all hover:scale-[1.01]" 
                  onClick={() => handleStartEdit("primary", "ctr", "CTR", ctr)}
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">CTR</span>
                  <span className="text-xl font-bold text-card-foreground mt-2">{ctr.toFixed(2)}%</span>
                  <span className="text-[9px] text-green-400 font-medium mt-1">+1.8% vs anterior</span>
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></span>
                </div>

              </div>
            </div>
          )}

          {/* Métricas Secundárias */}
          {matchesSearch("Métricas Secundárias") && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Métricas Secundárias</div>
              <div className="flex flex-wrap gap-3">
                
                {/* 1. Impressões */}
                <div 
                  className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("secondary", "impressions", "Impressões", impressions)}
                >
                  <span className="text-[10px] text-muted-foreground">Impressões:</span>
                  <span className="text-xs font-bold text-card-foreground">{impressions.toLocaleString("pt-BR")}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                </div>

                {/* 2. Cliques */}
                <div 
                  className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("secondary", "clicks", "Cliques", clicks)}
                >
                  <span className="text-[10px] text-muted-foreground">Cliques (todos):</span>
                  <span className="text-xs font-bold text-card-foreground">{clicks.toLocaleString("pt-BR")}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                </div>

                {/* 3. Frequência */}
                <div 
                  className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("secondary", "frequency", "Frequência", getMetric("frequency", reach > 0 ? impressions / reach : 1.4))}
                >
                  <span className="text-[10px] text-muted-foreground">Frequência:</span>
                  <span className="text-xs font-bold text-card-foreground">{getMetric("frequency", reach > 0 ? impressions / reach : 1.4).toFixed(2)}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                </div>

                {/* 4. Landing Page Views */}
                <div 
                  className="relative group border border-border/40 hover:border-primary/30 bg-card/40 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("secondary", "landing_page_views", "Landing Page Views", getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85))}
                >
                  <span className="text-[10px] text-muted-foreground">LP Views:</span>
                  <span className="text-xs font-bold text-card-foreground">{getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85).toLocaleString("pt-BR")}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></span>
                </div>

              </div>
            </div>
          )}

          {/* Middle Row (Jornada, Qualidade, Taxas) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Jornada de Conversão */}
            <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 tracking-[0.03em]">
                  🔻 Jornada de Conversão
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">Volume e queda entre etapas</p>
              </div>

              <div className="space-y-2 flex-1 mt-4">
                
                {/* 1.1 Impressões */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("secondary", "impressions", "Impressões", impressions)}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">Impressões</span>
                      <p className="text-base font-extrabold text-card-foreground mt-0.5">{impressions.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="h-3 w-px bg-border/60" />
                </div>

                {/* 1.2 Cliques */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("secondary", "clicks", "Cliques", clicks)}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">Cliques</span>
                      <p className="text-base font-extrabold text-card-foreground mt-0.5">{clicks.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <span className="text-red-400 font-bold uppercase tracking-wide">GARGALO (94.5% QUEDA)</span>
                      <p className="text-muted-foreground mt-0.5">{ctr.toFixed(2)}% retidos</p>
                    </div>
                  </div>
                  <div className="h-3 w-px bg-border/60" />
                </div>

                {/* 1.3 Page Views */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("secondary", "landing_page_views", "Page Views", getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85))}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">Page Views</span>
                      <p className="text-base font-extrabold text-card-foreground mt-0.5">{getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85).toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <span className="text-green-400 font-bold uppercase tracking-wide">89.0% OUTRA</span>
                      <p className="text-muted-foreground mt-0.5">{clicks > 0 ? ((getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85) / clicks) * 100).toFixed(2) : 0}% retidos</p>
                    </div>
                  </div>
                  <div className="h-3 w-px bg-border/60" />
                </div>

                {/* 1.4 Leads */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("primary", "conversions", "Leads", conversions)}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">Leads / Cadastros</span>
                      <p className="text-base font-extrabold text-card-foreground mt-0.5">{conversions.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <span className="text-red-400 font-bold uppercase tracking-wide">GARGALO (94.8% QUEDA)</span>
                      <p className="text-muted-foreground mt-0.5">{clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0}% retidos</p>
                    </div>
                  </div>
                  <div className="h-3 w-px bg-border/60" />
                </div>

                {/* 1.5 Vendas */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStartEdit("primary", "purchases", "Vendas", purchases)}
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wide">Vendas</span>
                      <p className="text-base font-extrabold text-card-foreground mt-0.5">{purchases.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <span className="text-green-400 font-bold uppercase tracking-wide">45.4% OUTRA</span>
                      <p className="text-muted-foreground mt-0.5">{conversions > 0 ? ((purchases / conversions) * 100).toFixed(2) : 0}% retidos</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Qualidade de Criativo */}
            <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em]">
                  🎬 Qualidade de Criativo
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">Retenção de vídeos e atenção</p>
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
                  <path d="M 0 5 Q 30 10, 50 35 T 100 45 L 100 50 L 0 50 Z" fill="url(#curve-grad)" />
                  <path d="M 0 5 Q 30 10, 50 35 T 100 45" fill="none" stroke="#10b981" strokeWidth="2" />
                </svg>
                <span className="absolute top-2 left-2 text-[9px] font-mono text-muted-foreground/60 select-none">0s</span>
                <span className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/60 select-none">100%</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border/60">
                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "hook_rate", "Hook Rate (3s)", curve.hook_rate)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hook Rate (3s)</span>
                  <span className="text-sm font-bold text-primary mt-1">{curve.hook_rate.toFixed(1)}%</span>
                </div>
                
                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "hold_rate", "Hold Rate", curve.hold_rate)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hold Rate</span>
                  <span className="text-sm font-bold text-primary mt-1">{curve.hold_rate.toFixed(1)}%</span>
                </div>

                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "ctr_link", "CTR Link", curve.ctr_link)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">CTR Link</span>
                  <span className="text-sm font-bold text-primary mt-1">{curve.ctr_link.toFixed(2)}%</span>
                </div>

                <div 
                  className="hover:bg-muted/10 p-2.5 rounded-xl cursor-pointer flex flex-col justify-between border border-border/20"
                  onClick={() => handleStartEdit("curve", "cost_per_play", "Custo por Play", curve.cost_per_play)}
                >
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Custo por Play</span>
                  <span className="text-sm font-bold text-primary mt-1">{currencySymbol} {curve.cost_per_play.toFixed(2)}</span>
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
                  const lpRate = clicks > 0 ? (getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85) / clicks) * 100 : 0;
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
                  const lpViews = getMetric("landing_page_views", metaTotals.landingPageViews || clicks * 0.85);
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
              <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Diagnóstico</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Criativos */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "criativos", "Criativos", diags.criativos)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Criativos</span>
                      <span className="text-primary">{diags.criativos.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.criativos.text}</p>
                  </div>
                  {diags.criativos.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.criativos.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

                {/* 2. Público */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "publico", "Público", diags.publico)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Público</span>
                      <span className="text-primary">{diags.publico.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.publico.text}</p>
                  </div>
                  {diags.publico.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.publico.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

                {/* 3. Conversão LP */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "conversao_lp", "Conversão LP", diags.conversao_lp)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Conversão LP</span>
                      <span className="text-primary">{diags.conversao_lp.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.conversao_lp.text}</p>
                  </div>
                  {diags.conversao_lp.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.conversao_lp.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

                {/* 4. Checkouts */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "checkouts", "Checkouts", diags.checkouts)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Checkouts</span>
                      <span className="text-primary">{diags.checkouts.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.checkouts.text}</p>
                  </div>
                  {diags.checkouts.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.checkouts.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

                {/* 5. Custos */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "custos", "Custos (CPA / CPL)", diags.custos)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Custos (CPA / CPL)</span>
                      <span className="text-primary">{diags.custos.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.custos.text}</p>
                  </div>
                  {diags.custos.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.custos.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

                {/* 6. Oferta */}
                <div 
                  className="relative group border border-border/60 hover:border-primary/30 bg-card/50 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors"
                  onClick={() => handleStartEdit("diagnostic", "oferta", "Oferta", diags.oferta)}
                >
                  <div>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-card-foreground">Oferta</span>
                      <span className="text-primary">{diags.oferta.score.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{diags.oferta.text}</p>
                  </div>
                  {diags.oferta.suggestion && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px] uppercase tracking-wide border-amber-500/30 text-amber-500 hover:bg-amber-500/10 mt-3 w-full cursor-pointer select-none">
                      {diags.oferta.suggestion}
                    </Button>
                  )}
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-2.5 w-2.5" /></span>
                </div>

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
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} className="h-9 text-xs">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}