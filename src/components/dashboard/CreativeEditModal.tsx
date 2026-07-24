import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertCreativeOverride, CreativeOverride } from "@/hooks/useCreativeOverrides";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";

interface MetricField {
  key: string;
  label: string;
  original: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  creativeId: string;
  creativeName: string;
  metrics: MetricField[];
  existingOverrides: CreativeOverride[];
}

export function CreativeEditModal({ open, onOpenChange, clientId, creativeId, creativeName, metrics, existingOverrides }: Props) {
  const upsert = useUpsertCreativeOverride();

  const getOverrideValue = (key: string, original: number) => {
    const ov = existingOverrides.find(o => o.creative_id === creativeId && o.metric_name === key);
    return ov ? ov.metric_value : original;
  };

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const m of metrics) {
      const rawVal = getOverrideValue(m.key, m.original);
      const num = Number(rawVal);
      init[m.key] = !isNaN(num) && !Number.isInteger(num)
        ? String(Number(num.toFixed(2)))
        : String(rawVal);
    }
    return init;
  });

  const [rankValue, setRankValue] = useState<string>(() => {
    return String(getOverrideValue("custom_rank", 0));
  });

  const handleSave = async () => {
    try {
      if (nameOverride.trim() && nameOverride.trim() !== creativeName) {
        localStorage.setItem(`creative_name_${creativeId}`, nameOverride.trim());
      } else {
        localStorage.removeItem(`creative_name_${creativeId}`);
      }

      // Save metric overrides
      for (const m of metrics) {
        const num = parseFloat(values[m.key]);
        if (isNaN(num)) continue;
        if (num !== m.original) {
          await upsert.mutateAsync({
            client_id: clientId,
            creative_id: creativeId,
            metric_name: m.key,
            metric_value: num,
          });
        }
      }

      // Save custom_rank override if selected
      const numRank = Number(rankValue);
      await upsert.mutateAsync({
        client_id: clientId,
        creative_id: creativeId,
        metric_name: "custom_rank",
        metric_value: numRank,
      });

      toast.success("Métricas e posição atualizadas!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleReset = (key: string, original: number) => {
    const num = Number(original);
    const formatted = !isNaN(num) && !Number.isInteger(num)
      ? String(Number(num.toFixed(2)))
      : String(original);
    setValues(prev => ({ ...prev, [key]: formatted }));
  };

  const handleResetName = () => {
    setNameOverride(creativeName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Editar Criativo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>Nome do Criativo</span>
              <button
                type="button"
                onClick={handleResetName}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Restaurar original
              </button>
            </Label>
            <Input
              type="text"
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              className="h-8 text-sm"
              placeholder="Nome do criativo..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-card-foreground">
              Posição no Destaque (Ranking)
            </Label>
            <Select value={rankValue} onValueChange={setRankValue}>
              <SelectTrigger className="h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Automático (por desempenho)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-xs">Automático (por desempenho)</SelectItem>
                <SelectItem value="1" className="text-xs">🥇 Forçar TOP 1</SelectItem>
                <SelectItem value="2" className="text-xs">🥈 Forçar TOP 2</SelectItem>
                <SelectItem value="3" className="text-xs">🥉 Forçar TOP 3</SelectItem>
                <SelectItem value="4" className="text-xs">4º Lugar</SelectItem>
                <SelectItem value="5" className="text-xs">5º Lugar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="pt-2 border-t border-border mt-2 mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Métricas</p>
          </div>

          {metrics.map((m) => (
            <div key={m.key} className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                <span>{m.label}</span>
                <button
                  type="button"
                  onClick={() => handleReset(m.key, m.original)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Original: {m.original.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                </button>
              </Label>
              <Input
                type="number"
                step="any"
                value={values[m.key]}
                onChange={(e) => setValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <Button onClick={handleSave} disabled={upsert.isPending} className="w-full mt-2" size="sm">
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
