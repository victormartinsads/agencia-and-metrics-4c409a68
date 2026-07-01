import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics, DEFAULT_DIAGNOSTICS, getFunnelActiveDiagnostics, getSortedDiagnosticKeys, getDiagnosticBlockMetadata } from "@/hooks/useFunnelDiagnostics";
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

export function FunnelHealthDiagnosticPanel({ clientId, funnelCode, readOnly = false, currencySymbol = "R$", snapshotData, liveCampaignMetrics }: Props) {
  // Live query hook
  const { data: funnelDiag, isLoading } = useFunnelDiagnostics(
    snapshotData ? undefined : clientId,
    snapshotData ? undefined : funnelCode
  );

  const saveFunnelDiag = useSaveFunnelDiagnostics();

  const diags = snapshotData
    ? snapshotData.diagnostics || DEFAULT_DIAGNOSTICS.diagnostics
    : funnelDiag?.diagnostics ?? DEFAULT_DIAGNOSTICS.diagnostics;

  const curve = snapshotData
    ? snapshotData.curve_data || DEFAULT_DIAGNOSTICS.curve_data
    : funnelDiag?.curve_data ?? DEFAULT_DIAGNOSTICS.curve_data;

  const activeDiagnostics = getFunnelActiveDiagnostics(funnelCode);

  // Calculate dynamic health score based on active diagnostics average
  const calculatedHealthScore = (() => {
    const scores: number[] = [];
    getSortedDiagnosticKeys(diags).forEach((key) => {
      const diagBlock = diags[key];
      const isEnabled = diagBlock?.enabled !== false && (
        diagBlock?.enabled === true || 
        (activeDiagnostics as any)[key] !== false
      );
      if (isEnabled) {
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

  // Selected values (either from snapshot, live query, or default fallback)
  const healthScore = snapshotData
    ? snapshotData.health_score
    : (funnelDiag?.health_score !== undefined && funnelDiag.health_score !== 7.5 && funnelDiag.health_score !== 0)
      ? funnelDiag.health_score
      : calculatedHealthScore;

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

  // Dynamic Indicator management states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newIndicatorTitle, setNewIndicatorTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

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
      const currentDiags = { ...diags };
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
    if (!editingItem || readOnly || !clientId || !funnelCode) return;
    try {
      if (editingItem.type === "diagnostic") {
        const currentDiags = { ...diags };
        currentDiags[editingItem.key] = {
          score: Number(editScore),
          text: editText,
          suggestion: editSuggestion,
          title: editTitle,
          placeholder: editPlaceholder,
          enabled: editEnabled,
          isCustom: diags[editingItem.key]?.isCustom || editingItem.key.startsWith("custom_"),
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
  const isMockHook = (!curve || curve.hook_rate === 94.5 || curve.hook_rate == null);
  const isMockHold = (!curve || curve.hold_rate === 17.5 || curve.hold_rate == null);
  const isMockCtr = (!curve || curve.ctr_link === 2.74 || curve.ctr_link == null);
  const isMockAvgTime = (!curve || curve.avgVideoTime === 5.4 || curve.avgVideoTime === 3.0 || curve.avgVideoTime == null);
  const isMockCostPlay = (!curve || curve.cost_per_play === 0.05 || curve.cost_per_play == null);

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
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Indicadores</span>
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
                  className={`relative group border border-border/50 bg-[#0c0c0e] p-3 rounded-xl flex items-center justify-between transition-all duration-300 ${
                    readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                  }`}
                  onClick={() => handleStartEdit("diagnostic", key, title, diagBlock)}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${getScoreDotClass(diagBlock.score)}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-card-foreground">{title}</span>
                        <span className="text-[11px] font-black text-[#c5ff1a] font-display">{getScoreText(diagBlock.score)}</span>
                      </div>
                      <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{displayText}</p>
                    </div>
                  </div>

                  {diagBlock.suggestion && (
                    <div className="ml-2.5 flex-shrink-0">
                      <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shadow-sm">
                        {diagBlock.suggestion}
                      </span>
                    </div>
                  )}
                  {!readOnly && (
                    <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-2 w-2" />
                    </span>
                  )}
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
              <div className="text-center py-6 border border-dashed border-border/50 rounded-xl bg-black/10">
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
              {editingItem?.type === "diagnostic" && (editingItem.key.startsWith("custom_") || diags[editingItem.key]?.isCustom) && (
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
      )}

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
    </div>
  );
}
