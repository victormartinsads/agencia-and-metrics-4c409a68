import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics, DEFAULT_DIAGNOSTICS, FunnelDiagnosticData } from "@/hooks/useFunnelDiagnostics";
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

  // Videowatch time graph calculations
  const hookRate = curve?.hook_rate ?? 60;
  const holdRate = curve?.hold_rate ?? 40;
  const p75Rate = 25;
  const p100Rate = 12;
  const avgVideoTime = curve?.avgVideoTime ?? 5.4;

  const xPos = Math.min(95, Math.max(5, (avgVideoTime / 15) * 100));
  let yRate = 100;
  if (xPos < 25) {
    yRate = 100 - ((100 - hookRate) * xPos) / 25;
  } else if (xPos < 50) {
    yRate = hookRate - ((hookRate - holdRate) * (xPos - 25)) / 25;
  } else if (xPos < 75) {
    yRate = holdRate - ((holdRate - p75Rate) * (xPos - 50)) / 25;
  } else {
    yRate = p75Rate - ((p75Rate - p100Rate) * (xPos - 75)) / 25;
  }
  const yValAtAvgTime = 45 - (yRate / 100) * 40;

  const y0 = 5;
  const y1 = 45 - (hookRate / 100) * 40;
  const y2 = 45 - (holdRate / 100) * 40;
  const y3 = 45 - (p75Rate / 100) * 40;
  const y4 = 45 - (p100Rate / 100) * 40;
  
  const dPath = `M 0 ${y0} L 25 ${y1} L 50 ${y2} L 75 ${y3} L 100 ${y4}`;
  const dArea = `${dPath} L 100 50 L 0 50 Z`;

  return (
    <div className="space-y-6">
      {/* Saúde Geral do Funil & Diagnóstico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Circular Gauge */}
        <div 
          className={`relative group border border-border bg-[#0f0f12] rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 ${
            readOnly ? "" : "cursor-pointer hover:border-primary/20 transition-colors"
          }`}
          onClick={() => handleStartEdit("health", "health_score", "Saúde Geral", healthScore)}
        >
          <h3 className="text-sm font-bold text-card-foreground self-start tracking-[0.03em] flex items-center gap-1.5">
            <span>🌟 Saúde Geral do Funil</span>
          </h3>
          
          <div className="relative flex items-center justify-center h-40 w-40 mt-4 select-none">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="65" fill="transparent" stroke="#1c1c22" strokeWidth="8" />
              <circle 
                cx="80" 
                cy="80" 
                r="65" 
                fill="transparent" 
                stroke={healthScore >= 8.5 ? "#10b981" : healthScore >= 7.0 ? "#22c55e" : healthScore >= 5.0 ? "#f59e0b" : "#ef4444"} 
                strokeWidth="8" 
                strokeDasharray="408" 
                strokeDashoffset={408 - (408 * (healthScore / 10))} 
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-card-foreground tracking-tight">{healthScore.toFixed(1)}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${healthColor}`}>{healthLabel}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
            Avaliação média do funil baseada nos indicadores principais.
          </p>
          {!readOnly && (
            <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Diagnostics Cards Grid */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Diagnóstico</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 1. Criativos */}
            {activeDiagnostics.criativos && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* 2. Público */}
            {activeDiagnostics.publico && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* 3. Conversão LP */}
            {activeDiagnostics.conversao_lp && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* 4. Checkouts */}
            {activeDiagnostics.checkouts && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* 5. Custos */}
            {activeDiagnostics.custos && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* 6. Oferta */}
            {activeDiagnostics.oferta && (
              <div 
                className={`relative group border border-border/60 bg-card/50 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                  readOnly ? "" : "hover:border-primary/30 cursor-pointer"
                }`}
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
                {!readOnly && (
                  <span className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Qualidade de Criativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-border/40 pt-5">
        {/* Left: Retention Curve */}
        <div className="border border-border bg-[#0f0f12] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-card-foreground tracking-[0.03em]">
              🎬 Qualidade de Criativo
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Retenção de vídeos e atenção</p>
          </div>

          <div className="h-36 w-full relative mt-6 border border-border/30 rounded-xl bg-black/20 p-2 overflow-hidden select-none">
            <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="curve-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={dArea} fill="url(#curve-grad)" />
              <path d={dPath} fill="none" stroke="#10b981" strokeWidth="2" />

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
            <span className="absolute top-2 left-2 text-[9px] font-mono text-muted-foreground/60">0s</span>
            <span className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/60">100%</span>
            {avgVideoTime > 0 && (
              <div 
                className="absolute top-2 bg-blue-600/95 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow border border-blue-400/30 transition-all"
                style={{ left: `calc(${xPos}% - 35px)` }}
              >
                Média: {avgVideoTime.toFixed(1)}s
              </div>
            )}
          </div>
        </div>

        {/* Right: Retention metrics grid */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Métricas do Vídeo</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* Hook Rate */}
            <div 
              className={`hover:bg-muted/10 p-2.5 rounded-xl flex flex-col justify-between border border-border/20 relative group transition-colors ${
                readOnly ? "" : "cursor-pointer hover:border-primary/20"
              }`}
              onClick={() => handleStartEdit("curve", "hook_rate", "Hook Rate (3s)", hookRate)}
            >
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hook Rate (3s)</span>
              <span className="text-sm font-bold text-primary mt-1">{hookRate.toFixed(1)}%</span>
              {!readOnly && (
                <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2 w-2" />
                </span>
              )}
            </div>

            {/* Hold Rate */}
            <div 
              className={`hover:bg-muted/10 p-2.5 rounded-xl flex flex-col justify-between border border-border/20 relative group transition-colors ${
                readOnly ? "" : "cursor-pointer hover:border-primary/20"
              }`}
              onClick={() => handleStartEdit("curve", "hold_rate", "Hold Rate", holdRate)}
            >
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Hold Rate</span>
              <span className="text-sm font-bold text-primary mt-1">{holdRate.toFixed(1)}%</span>
              {!readOnly && (
                <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2 w-2" />
                </span>
              )}
            </div>

            {/* CTR Link */}
            <div 
              className={`hover:bg-muted/10 p-2.5 rounded-xl flex flex-col justify-between border border-border/20 relative group transition-colors ${
                readOnly ? "" : "cursor-pointer hover:border-primary/20"
              }`}
              onClick={() => handleStartEdit("curve", "ctr_link", "CTR Link", curve?.ctr_link)}
            >
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">CTR Link</span>
              <span className="text-sm font-bold text-primary mt-1">{(curve?.ctr_link ?? 0).toFixed(2)}%</span>
              {!readOnly && (
                <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2 w-2" />
                </span>
              )}
            </div>

            {/* Tempo Médio */}
            <div 
              className={`hover:bg-muted/10 p-2.5 rounded-xl flex flex-col justify-between border border-border/20 relative group transition-colors ${
                readOnly ? "" : "cursor-pointer hover:border-primary/20"
              }`}
              onClick={() => handleStartEdit("curve", "avgVideoTime", "Tempo Médio", avgVideoTime)}
            >
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Tempo Médio</span>
              <span className="text-sm font-bold text-primary mt-1">{avgVideoTime.toFixed(1)}s</span>
              {!readOnly && (
                <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2 w-2" />
                </span>
              )}
            </div>

            {/* Custo por Play */}
            <div 
              className={`hover:bg-muted/10 p-2.5 rounded-xl flex flex-col justify-between border border-border/20 relative group transition-colors ${
                readOnly ? "" : "cursor-pointer hover:border-primary/20"
              }`}
              onClick={() => handleStartEdit("curve", "cost_per_play", "Custo por Play", curve?.cost_per_play)}
            >
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Custo por Play</span>
              <span className="text-sm font-bold text-primary mt-1">{currencySymbol} {(curve?.cost_per_play ?? 0).toFixed(2)}</span>
              {!readOnly && (
                <span className="absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2 w-2" />
                </span>
              )}
            </div>

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
