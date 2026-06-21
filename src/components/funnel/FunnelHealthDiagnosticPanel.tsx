import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics, DEFAULT_DIAGNOSTICS } from "@/hooks/useFunnelDiagnostics";
import { extractFunnelCode } from "@/lib/funnelGrouping";

interface Props {
  clientId: string;
  funnelCode: string;
  readOnly?: boolean;
  currencySymbol?: string;
  snapshotData?: {
    health_score: number;
    diagnostics: any;
    curve_data?: any;
  };
  liveCampaignMetrics?: {
    hookRate?: number;
    holdRate?: number;
    linkCtr?: number;
    avgVideoTime?: number;
    costPerPlay?: number;
  };
}

export function getFunnelActiveDiagnostics(funnelCode: string | undefined) {
  const allEnabled = {
    criativos: true,
    publico: true,
    conversao_lp: true,
    checkouts: true,
    custos: true,
    oferta: true,
  };
  
  if (!funnelCode) return allEnabled;
  
  const cleanCode = funnelCode.replace(/^(GADS-|CAMP-)/i, "");
  const extracted = extractFunnelCode(cleanCode) || cleanCode;
  
  if (extracted === "F1") {
    // F1 - Captação de Seguidores
    return {
      criativos: true,
      publico: true,
      conversao_lp: false,
      checkouts: false,
      custos: true,
      oferta: false,
    };
  }
  
  if (extracted === "F3" || extracted === "F7") {
    // F3 - Call de Vendas | Mensagens, F7 - Serviços | Mensagens
    return {
      criativos: true,
      publico: true,
      conversao_lp: false,
      checkouts: false,
      custos: true,
      oferta: true,
    };
  }

  if (extracted === "F10") {
    // F10 - Formulário Nativo
    return {
      criativos: true,
      publico: true,
      conversao_lp: false,
      checkouts: false,
      custos: true,
      oferta: false,
    };
  }

  if (extracted === "F15") {
    // F15 - Engajamento / Interação
    return {
      criativos: true,
      publico: true,
      conversao_lp: false,
      checkouts: false,
      custos: true,
      oferta: false,
    };
  }

  if (extracted === "F4" || extracted === "F5" || extracted === "F6" || extracted === "F12" || extracted === "F13") {
    // Página de captura, iscas, workshops gratuitos
    return {
      criativos: true,
      publico: true,
      conversao_lp: true,
      checkouts: false,
      custos: true,
      oferta: false,
    };
  }
  
  return allEnabled;
}

export function FunnelHealthDiagnosticPanel({ clientId, funnelCode, readOnly = false, currencySymbol = "R$", snapshotData, liveCampaignMetrics }: Props) {
  // Live query hook
  const { data: funnelDiag, isLoading } = useFunnelDiagnostics(
    snapshotData ? undefined : clientId,
    snapshotData ? undefined : funnelCode
  );

  const saveFunnelDiag = useSaveFunnelDiagnostics();

  // Selected values (either from snapshot, live query, or default fallback)
  const healthScore = snapshotData
    ? snapshotData.health_score
    : funnelDiag?.health_score ?? DEFAULT_DIAGNOSTICS.health_score;

  const diags = snapshotData
    ? snapshotData.diagnostics || DEFAULT_DIAGNOSTICS.diagnostics
    : funnelDiag?.diagnostics ?? DEFAULT_DIAGNOSTICS.diagnostics;

  const curve = snapshotData
    ? snapshotData.curve_data || DEFAULT_DIAGNOSTICS.curve_data
    : funnelDiag?.curve_data ?? DEFAULT_DIAGNOSTICS.curve_data;

  const activeDiagnostics = getFunnelActiveDiagnostics(funnelCode);

  // Edit states
  const [editingItem, setEditingItem] = useState<{
    type: "health" | "diagnostic" | "curve";
    key: string;
    label: string;
  } | null>(null);

  const [editScore, setEditScore] = useState(0);
  const [editText, setEditText] = useState("");
  const [editSuggestion, setEditSuggestion] = useState("");
  const [editValue, setEditValue] = useState("");

  // Hover states for the retention curve interactivity
  const [hoveredPct, setHoveredPct] = useState<number | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number>(0);
  const [hoveredRate, setHoveredRate] = useState<number>(0);

  if (!snapshotData && isLoading) {
    return (
      <div className="flex items-center justify-center p-8 gap-2 bg-[#0f0f12]/50 border border-border/50 rounded-2xl">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Carregando diagnóstico de saúde...</span>
      </div>
    );
  }

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

  const handleStartEdit = (type: "health" | "diagnostic" | "curve", key: string, label: string, currentVal: any) => {
    if (readOnly) return;
    setEditingItem({ type, key, label });
    if (type === "diagnostic") {
      setEditScore(currentVal.score);
      setEditText(currentVal.text);
      setEditSuggestion(currentVal.suggestion);
    } else if (type === "health") {
      setEditScore(currentVal);
    } else {
      setEditValue(String(currentVal ?? ""));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || readOnly || !clientId || !funnelCode) return;
    try {
      if (editingItem.type === "diagnostic") {
        const currentDiags = { ...diags };
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
        const currentCurve = { ...curve };
        (currentCurve as any)[editingItem.key] = Number(editValue);
        await saveFunnelDiag.mutateAsync({
          clientId,
          funnelCode,
          patch: { curve_data: currentCurve },
        });
        toast.success("Métrica de criativo atualizada!");
      }
      setEditingItem(null);
    } catch (err) {
      toast.error("Erro ao salvar alterações");
    }
  };

  // Video watch time graph calculations (matches the brand style)
  const isSnapshot = !!snapshotData;
  const isMockHook = !isSnapshot && (!curve || curve.hook_rate === 94.5);
  const isMockHold = !isSnapshot && (!curve || curve.hold_rate === 17.5);
  const isMockCtr = !isSnapshot && (!curve || curve.ctr_link === 2.74);
  const isMockAvgTime = !isSnapshot && (!curve || curve.avgVideoTime === 5.4 || curve.avgVideoTime === 3.0);
  const isMockCostPlay = !isSnapshot && (!curve || curve.cost_per_play === 0.05);

  const hookRate = isMockHook ? (liveCampaignMetrics?.hookRate ?? curve?.hook_rate ?? 94.5) : (curve?.hook_rate ?? 94.5);
  const holdRate = isMockHold ? (liveCampaignMetrics?.holdRate ?? curve?.hold_rate ?? 17.5) : (curve?.hold_rate ?? 17.5);
  const ctrLink = isMockCtr ? (liveCampaignMetrics?.linkCtr ?? curve?.ctr_link ?? 2.74) : (curve?.ctr_link ?? 2.74);
  const avgVideoTime = isMockAvgTime ? (liveCampaignMetrics?.avgVideoTime ?? curve?.avgVideoTime ?? 3.0) : (curve?.avgVideoTime ?? 3.0);
  const costPerPlay = isMockCostPlay ? (liveCampaignMetrics?.costPerPlay ?? curve?.cost_per_play ?? 0.05) : (curve?.cost_per_play ?? 0.05);

  // Let's assume the full width of the graph represents 15s (standard duration for Instagram story/reel).
  const maxVideoTime = 15.0;
  // X position of the average video time indicator
  const xPos = Math.min(95, Math.max(5, (avgVideoTime / maxVideoTime) * 100));

  // Visual SVG coordinates (viewBox 0 0 100 50)
  // Retention goes from 0% (y = 44) to 100% (y = 6)
  const yMin = 6;
  const yMax = 44;
  const yHeight = yMax - yMin;

  const y0 = yMin; // At 0s, retention is 100% (so y = yMin)
  const y1 = yMin + yHeight * (100 - hookRate) / 100; // At 3s (which is at 20% of 15s), retention is hookRate
  const y2 = yMin + yHeight * (100 - holdRate) / 100; // At 15s (100% of graph), retention is holdRate

  // Piecewise linear path representing the retention curve (starts at 100% -> drops to hookRate at 3s -> drops to holdRate at 15s)
  // 3s is at x = 20% (since 3 / 15 * 100 = 20)
  const dPath = `M 0 ${y0} L 20 ${y1} L 100 ${y2}`;
  const dArea = `${dPath} L 100 50 L 0 50 Z`;

  // Interpolated y-coordinate for the average time dot
  let yValAtAvgTime = y1;
  if (xPos < 20) {
    // interpolation between 0s and 3s
    yValAtAvgTime = y0 + (y1 - y0) * (xPos / 20);
  } else {
    // interpolation between 3s and 15s
    yValAtAvgTime = y1 + (y2 - y1) * ((xPos - 20) / 80);
  }

  // Safe horizontal positioning for the pill to prevent boundary clipping
  const pillX = Math.min(85, Math.max(15, xPos));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      
      {/* Box 1: Saúde Geral do Funil & Diagnóstico */}
      <div className="border border-border/50 bg-[#09090b] rounded-2xl p-6 flex flex-col h-full shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em] flex items-center gap-1.5 mb-1 font-display">
            <span>🌟 Saúde Geral do Funil</span>
          </h3>
          <p className="text-[10px] text-muted-foreground">Avaliação média do funil baseada nos indicadores ativos.</p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 mt-5 items-stretch">
          {/* Circular Gauge */}
          <div 
            className={`md:col-span-5 relative group border border-border/50 bg-[#0c0c0e] rounded-xl p-5 flex flex-col items-center justify-center space-y-4 select-none transition-all duration-300 hover:border-primary/20 h-full min-h-[180px] ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("health", "health_score", "Saúde Geral", healthScore)}
          >
            <div className="relative flex items-center justify-center h-28 w-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="46" fill="transparent" stroke="#141416" strokeWidth="6" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="46" 
                  fill="transparent" 
                  stroke={healthScore === 0 ? "#27272a" : healthScore >= 8.5 ? "#10b981" : healthScore >= 7.0 ? "#22c55e" : healthScore >= 5.0 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="6" 
                  strokeDasharray="289" 
                  strokeDashoffset={289 - (289 * (healthScore / 10))} 
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-card-foreground tracking-tight font-display">{healthScore === 0 ? "—" : healthScore.toFixed(1)}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${healthColor}`}>{healthLabel}</span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Saúde do Funil</span>
            {!readOnly && (
              <span className="absolute top-2.5 right-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Diagnostics Cards Grid */}
          <div className="md:col-span-7 flex flex-col gap-2.5 justify-center h-full">
            
            {/* Criativos */}
            {activeDiagnostics.criativos && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "criativos", "Criativos", diags.criativos)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.criativos.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Criativos</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.criativos.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.criativos.text}</p>
                  </div>
                </div>

                {diags.criativos.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.criativos.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Público */}
            {activeDiagnostics.publico && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "publico", "Público", diags.publico)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.publico.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Público</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.publico.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.publico.text}</p>
                  </div>
                </div>

                {diags.publico.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.publico.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Conversão LP */}
            {activeDiagnostics.conversao_lp && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "conversao_lp", "Conversão LP", diags.conversao_lp)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.conversao_lp.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Conversão LP</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.conversao_lp.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.conversao_lp.text}</p>
                  </div>
                </div>

                {diags.conversao_lp.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.conversao_lp.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Checkouts */}
            {activeDiagnostics.checkouts && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "checkouts", "Checkouts", diags.checkouts)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.checkouts.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Checkouts</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.checkouts.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.checkouts.text}</p>
                  </div>
                </div>

                {diags.checkouts.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.checkouts.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Custos */}
            {activeDiagnostics.custos && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "custos", "Custos (CPA / CPL)", diags.custos)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.custos.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Custos</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.custos.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.custos.text}</p>
                  </div>
                </div>

                {diags.custos.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.custos.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Oferta */}
            {activeDiagnostics.oferta && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "oferta", "Oferta", diags.oferta)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diags.oferta.score)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-card-foreground">Oferta</span>
                      <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diags.oferta.score)}</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{diags.oferta.text}</p>
                  </div>
                </div>

                {diags.oferta.suggestion && (
                  <div className="ml-2.5 flex-shrink-0">
                    <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                      {diags.oferta.suggestion}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Box 2: Qualidade de Criativo */}
      <div className="border border-border/50 bg-[#09090b] rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-lg relative group/box2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em] flex items-center gap-1.5 mb-1 font-display">
              🎬 Qualidade de Criativo
            </h3>
            <p className="text-[10px] text-muted-foreground">Retenção de vídeos e nível de atenção.</p>
          </div>
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-[#0c0c0e] transition-all duration-300 ${
              readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
            }`}
            onClick={() => handleStartEdit("diagnostic", "criativos", "Criativos", diags.criativos)}
          >
            <div className={`h-2 w-2 rounded-full ${getScoreDotClass(diags.criativos.score)}`} />
            <span className="text-[10px] uppercase font-bold text-muted-foreground/80">Nota:</span>
            <span className="text-xs font-black text-[#c5ff1a] font-display">{getScoreText(diags.criativos.score)}</span>
            {!readOnly && (
              <Pencil className="h-2 w-2 text-muted-foreground/60 ml-0.5" />
            )}
          </div>
        </div>

        {/* Retention curve SVG */}
        <div 
          className="h-36 w-full relative border border-border bg-[#030304] rounded-xl p-3 select-none cursor-crosshair overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            // 12px padding left/right
            const paddingX = 12;
            const contentWidth = rect.width - paddingX * 2;
            const mouseX = e.clientX - rect.left - paddingX;
            const pct = Math.min(100, Math.max(0, (mouseX / contentWidth) * 100));
            
            const time = (pct / 100) * maxVideoTime;
            let rate = 100;
            if (pct < 20) {
              rate = 100 - ((100 - hookRate) * pct) / 20;
            } else {
              rate = hookRate - ((hookRate - holdRate) * (pct - 20)) / 80;
            }
            
            setHoveredPct(pct);
            setHoveredTime(time);
            setHoveredRate(rate);
          }}
          onMouseLeave={() => {
            setHoveredPct(null);
          }}
        >
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curve-grad-lime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c5ff1a" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#c5ff1a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1="15.5" x2="100" y2="15.5" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="0" y1="34.5" x2="100" y2="34.5" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />

            {/* Area under curve */}
            <path d={dArea} fill="url(#curve-grad-lime)" />

            {/* Curve line (Sharp, thin, non-scaling stroke to avoid coarseness) */}
            <path 
              d={dPath} 
              fill="none" 
              stroke="#c5ff1a" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              vectorEffect="non-scaling-stroke" 
            />

            {/* Average time dashed line (visible when not hovering) */}
            {avgVideoTime > 0 && hoveredPct === null && (
              <g>
                <line
                  x1={xPos}
                  y1="0"
                  x2={xPos}
                  y2="50"
                  stroke="#3b82f6"
                  strokeWidth="0.75"
                  strokeDasharray="2,2"
                />
                {/* Intersection dot */}
                <circle cx={xPos} cy={yValAtAvgTime} r="5" fill="#3b82f6" fillOpacity="0.25" />
                <circle cx={xPos} cy={yValAtAvgTime} r="2" fill="#3b82f6" />
              </g>
            )}

            {/* Interactive hover line and dot */}
            {hoveredPct !== null && (
              <g>
                <line
                  x1={hoveredPct}
                  y1="0"
                  x2={hoveredPct}
                  y2="50"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="0.75"
                  strokeDasharray="2,2"
                />
                {/* Intersection dot */}
                {(() => {
                  const yVal = yMin + yHeight * (100 - hoveredRate) / 100;
                  return (
                    <g>
                      <circle cx={hoveredPct} cy={yVal} r="5" fill="#c5ff1a" fillOpacity="0.25" />
                      <circle cx={hoveredPct} cy={yVal} r="2" fill="#c5ff1a" />
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>

          {/* Curve text labels */}
          <span className="absolute top-2 left-3 text-[9px] font-semibold text-muted-foreground/30 font-mono">0s</span>
          <span className="absolute bottom-2 right-3 text-[9px] font-semibold text-muted-foreground/30 font-mono">100%</span>

          {/* Average time pill (visible when not hovering) */}
          {avgVideoTime > 0 && hoveredPct === null && (
            <div 
              className="absolute top-2 bg-[#2563eb] text-white font-sans text-[8px] font-extrabold px-2 py-0.5 rounded shadow border border-blue-400/20 transition-all select-none whitespace-nowrap"
              style={{ left: `${pillX}%`, transform: 'translateX(-50%)' }}
            >
              Média: {avgVideoTime.toFixed(1)}s
            </div>
          )}

          {/* Interactive Hover Tooltip Pill */}
          {hoveredPct !== null && (
            <div 
              className="absolute bg-[#09090b]/95 border border-border text-card-foreground font-sans text-[9px] p-2 rounded shadow-2xl pointer-events-none transition-all duration-75 flex flex-col gap-0.5 z-10"
              style={{ 
                left: `${Math.min(82, Math.max(18, hoveredPct))}%`, 
                top: '25%', 
                transform: 'translate(-50%, -50%)' 
              }}
            >
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span className="text-muted-foreground">Tempo:</span>
                <span className="text-card-foreground font-mono">{hoveredTime.toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span className="text-muted-foreground">Retenção:</span>
                <span className="text-[#c5ff1a] font-mono">{hoveredRate.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Creative Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Hook Rate */}
          <div 
            className={`bg-[#0c0c0e] p-3.5 rounded-xl border border-border/50 relative group transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 hover:bg-[#c5ff1a]/[0.02] flex flex-col justify-between min-h-[60px] ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("curve", "hook_rate", "Hook Rate (3s)", hookRate)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">Hook Rate (3s)</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{hookRate.toFixed(1)}%</span>
            {!readOnly && (
              <span className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Hold Rate */}
          <div 
            className={`bg-[#0c0c0e] p-3.5 rounded-xl border border-border/50 relative group transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 hover:bg-[#c5ff1a]/[0.02] flex flex-col justify-between min-h-[60px] ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("curve", "hold_rate", "Hold Rate", holdRate)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">Hold Rate</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{holdRate.toFixed(1)}%</span>
            {!readOnly && (
              <span className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* CTR Link */}
          <div 
            className={`bg-[#0c0c0e] p-3.5 rounded-xl border border-border/50 relative group transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 hover:bg-[#c5ff1a]/[0.02] flex flex-col justify-between min-h-[60px] ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("curve", "ctr_link", "CTR Link", ctrLink)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">CTR Link</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{ctrLink.toFixed(2)}%</span>
            {!readOnly && (
              <span className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Tempo Médio */}
          <div 
            className={`bg-[#0c0c0e] p-3.5 rounded-xl border border-border/50 relative group transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 hover:bg-[#c5ff1a]/[0.02] flex flex-col justify-between min-h-[60px] ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("curve", "avgVideoTime", "Tempo Médio", avgVideoTime)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">Tempo Médio</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{avgVideoTime.toFixed(1)}s</span>
            {!readOnly && (
              <span className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Custo por Play */}
          <div 
            className={`bg-[#0c0c0e] p-3.5 rounded-xl border border-border/50 relative group transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 hover:bg-[#c5ff1a]/[0.02] flex flex-col justify-between min-h-[60px] col-span-2 ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("curve", "cost_per_play", "Custo por Play", costPerPlay)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">Custo por Play</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{currencySymbol} {costPerPlay.toFixed(2)}</span>
            {!readOnly && (
              <span className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Modal Editor */}
      {!readOnly && (
        <Dialog open={!!editingItem} onOpenChange={(v) => !v && setEditingItem(null)}>
          <DialogContent className="sm:max-w-md bg-popover border border-border text-card-foreground">
            <DialogHeader>
              <DialogTitle>Editar: {editingItem?.label}</DialogTitle>
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
      )}
    </div>
  );
}
