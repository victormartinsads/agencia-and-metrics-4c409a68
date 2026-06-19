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

export function FunnelHealthDiagnosticPanel({ clientId, funnelCode, readOnly = false, currencySymbol = "R$", snapshotData }: Props) {
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

  if (!snapshotData && isLoading) {
    return (
      <div className="flex items-center justify-center p-8 gap-2 bg-[#0f0f12]/50 border border-border/50 rounded-2xl">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Carregando diagnóstico de saúde...</span>
      </div>
    );
  }

  const healthLabel = healthScore >= 8.5 ? "Excelente" : healthScore >= 7.0 ? "Saudável" : healthScore >= 5.0 ? "Atenção" : "Crítico";
  const healthColor = healthScore >= 8.5 ? "text-emerald-400 fill-emerald-500" : healthScore >= 7.0 ? "text-green-400 fill-green-500" : healthScore >= 5.0 ? "text-amber-400 fill-amber-500" : "text-red-400 fill-red-500";

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
  const hookRate = curve?.hook_rate ?? 94.5;
  const holdRate = curve?.hold_rate ?? 17.5;
  const avgVideoTime = curve?.avgVideoTime ?? 3.0;

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Box 1: Saúde Geral do Funil & Diagnóstico */}
      <div className="border border-border/50 bg-[#09090b] rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em] flex items-center gap-1.5 mb-1 font-display">
            <span>🌟 Saúde Geral do Funil</span>
          </h3>
          <p className="text-[10px] text-muted-foreground">Avaliação média do funil baseada nos indicadores ativos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Circular Gauge */}
          <div 
            className={`col-span-1 relative group border border-border/50 bg-[#0c0c0e] rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 select-none transition-all duration-300 hover:border-primary/20 ${
              readOnly ? "" : "cursor-pointer"
            }`}
            onClick={() => handleStartEdit("health", "health_score", "Saúde Geral", healthScore)}
          >
            <div className="relative flex items-center justify-center h-32 w-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="52" fill="transparent" stroke="#141416" strokeWidth="6" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="52" 
                  fill="transparent" 
                  stroke={healthScore >= 8.5 ? "#10b981" : healthScore >= 7.0 ? "#22c55e" : healthScore >= 5.0 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="6" 
                  strokeDasharray="326" 
                  strokeDashoffset={326 - (326 * (healthScore / 10))} 
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3.5xl font-black text-card-foreground tracking-tight font-display">{healthScore.toFixed(1)}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${healthColor}`}>{healthLabel}</span>
              </div>
            </div>
            {!readOnly && (
              <span className="absolute top-2.5 right-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Diagnostics Cards Grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Criativos */}
            {activeDiagnostics.criativos && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "criativos", "Criativos", diags.criativos)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Criativos</span>
                    <span className="text-[#c5ff1a] font-display">{diags.criativos.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.criativos.text}</p>
                </div>
                {diags.criativos.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.criativos.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Público */}
            {activeDiagnostics.publico && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "publico", "Público", diags.publico)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Público</span>
                    <span className="text-[#c5ff1a] font-display">{diags.publico.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.publico.text}</p>
                </div>
                {diags.publico.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.publico.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Conversão LP */}
            {activeDiagnostics.conversao_lp && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "conversao_lp", "Conversão LP", diags.conversao_lp)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Conversão LP</span>
                    <span className="text-[#c5ff1a] font-display">{diags.conversao_lp.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.conversao_lp.text}</p>
                </div>
                {diags.conversao_lp.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.conversao_lp.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Checkouts */}
            {activeDiagnostics.checkouts && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "checkouts", "Checkouts", diags.checkouts)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Checkouts</span>
                    <span className="text-[#c5ff1a] font-display">{diags.checkouts.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.checkouts.text}</p>
                </div>
                {diags.checkouts.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.checkouts.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Custos */}
            {activeDiagnostics.custos && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "custos", "Custos (CPA / CPL)", diags.custos)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Custos</span>
                    <span className="text-[#c5ff1a] font-display">{diags.custos.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.custos.text}</p>
                </div>
                {diags.custos.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.custos.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

            {/* Oferta */}
            {activeDiagnostics.oferta && (
              <div 
                className={`relative group border border-border/50 bg-[#0c0c0e] p-3.5 rounded-xl flex flex-col justify-between transition-all duration-300 min-h-[95px] ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer hover:bg-[#c5ff1a]/[0.01]"
                }`}
                onClick={() => handleStartEdit("diagnostic", "oferta", "Oferta", diags.oferta)}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-card-foreground">Oferta</span>
                    <span className="text-[#c5ff1a] font-display">{diags.oferta.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{diags.oferta.text}</p>
                </div>
                {diags.oferta.suggestion && (
                  <Button size="sm" variant="outline" className="h-5 text-[8px] uppercase tracking-wide border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 mt-2.5 w-full cursor-pointer select-none">
                    {diags.oferta.suggestion}
                  </Button>
                )}
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2 w-2" />
                  </span>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Box 2: Qualidade de Criativo */}
      <div className="border border-border/50 bg-[#09090b] rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em] flex items-center gap-1.5 mb-1 font-display">
            🎬 Qualidade de Criativo
          </h3>
          <p className="text-[10px] text-muted-foreground">Retenção de vídeos e nível de atenção.</p>
        </div>

        {/* Retention curve SVG */}
        <div className="h-36 w-full relative border border-border bg-[#030304] rounded-xl p-3 overflow-hidden select-none">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curve-grad-lime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c5ff1a" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#c5ff1a" stopOpacity="0.0" />
              </linearGradient>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1="15.5" x2="100" y2="15.5" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />
            <line x1="0" y1="34.5" x2="100" y2="34.5" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" strokeDasharray="1,2" />

            {/* Area under curve */}
            <path d={dArea} fill="url(#curve-grad-lime)" />

            {/* Curve line */}
            <path d={dPath} fill="none" stroke="#c5ff1a" strokeWidth="2" strokeLinecap="round" filter="url(#neon-glow)" />

            {/* Average time dashed line */}
            {avgVideoTime > 0 && (
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
                <circle cx={xPos} cy={yValAtAvgTime} r="5" fill="#3b82f6" fillOpacity="0.3" />
                <circle cx={xPos} cy={yValAtAvgTime} r="2.5" fill="#3b82f6" />
              </g>
            )}
          </svg>

          {/* Curve text labels */}
          <span className="absolute top-2 left-3 text-[9px] font-semibold text-muted-foreground/40 font-mono">0s</span>
          <span className="absolute bottom-2 right-3 text-[9px] font-semibold text-muted-foreground/40 font-mono">100%</span>

          {/* Average time pill */}
          {avgVideoTime > 0 && (
            <div 
              className="absolute top-2 bg-[#2563eb] text-white font-sans text-[8px] font-extrabold px-2 py-0.5 rounded shadow border border-blue-400/20 transition-all select-none whitespace-nowrap"
              style={{ left: `${pillX}%`, transform: 'translateX(-50%)' }}
            >
              Média: {avgVideoTime.toFixed(1)}s
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
            onClick={() => handleStartEdit("curve", "ctr_link", "CTR Link", curve?.ctr_link)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">CTR Link</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{(curve?.ctr_link ?? 0).toFixed(2)}%</span>
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
            onClick={() => handleStartEdit("curve", "cost_per_play", "Custo por Play", curve?.cost_per_play)}
          >
            <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">Custo por Play</span>
            <span className="text-2xl font-extrabold text-[#c5ff1a] font-display tracking-tight mt-1">{currencySymbol} {(curve?.cost_per_play ?? 0).toFixed(2)}</span>
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
