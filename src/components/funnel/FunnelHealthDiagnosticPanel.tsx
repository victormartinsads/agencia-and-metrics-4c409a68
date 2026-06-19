import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFunnelDiagnostics, useSaveFunnelDiagnostics, DEFAULT_DIAGNOSTICS, FunnelDiagnosticData } from "@/hooks/useFunnelDiagnostics";

interface Props {
  clientId: string;
  funnelCode: string;
  readOnly?: boolean;
  snapshotData?: {
    health_score: number;
    diagnostics: any;
  };
}

export function FunnelHealthDiagnosticPanel({ clientId, funnelCode, readOnly = false, snapshotData }: Props) {
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

  // Edit states
  const [editingItem, setEditingItem] = useState<{
    type: "health" | "diagnostic";
    key: string;
    label: string;
  } | null>(null);

  const [editScore, setEditScore] = useState(0);
  const [editText, setEditText] = useState("");
  const [editSuggestion, setEditSuggestion] = useState("");

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

  const handleStartEdit = (type: "health" | "diagnostic", key: string, label: string, currentVal: any) => {
    if (readOnly) return;
    setEditingItem({ type, key, label });
    if (type === "diagnostic") {
      setEditScore(currentVal.score);
      setEditText(currentVal.text);
      setEditSuggestion(currentVal.suggestion);
    } else {
      setEditScore(currentVal);
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
      }
      setEditingItem(null);
    } catch (err) {
      toast.error("Erro ao salvar alterações");
    }
  };

  return (
    <div className="space-y-4">
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

            {/* 2. Público */}
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

            {/* 3. Conversão LP */}
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

            {/* 4. Checkouts */}
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

            {/* 5. Custos */}
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

            {/* 6. Oferta */}
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
              ) : (
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
