import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BlockConfig } from "@/hooks/useOverviewLayout";

export interface MetricOption {
  key: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: BlockConfig | null;
  metricOptions?: MetricOption[];
  onSave: (patch: Partial<BlockConfig>) => void;
}

export function BlockSettingsDialog({ open, onOpenChange, block, metricOptions, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (block) {
      setTitle(block.title || "");
      setPicked(block.metrics || []);
    }
  }, [block]);

  if (!block) return null;

  const togglePick = (key: string) => {
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = () => {
    onSave({ title: title.trim() || undefined, metrics: picked });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar bloco</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-title">Título</Label>
            <Input id="block-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do bloco" />
          </div>

          {metricOptions && metricOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Métricas exibidas</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {metricOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={picked.includes(opt.key)}
                      onCheckedChange={() => togglePick(opt.key)}
                    />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Selecione quais métricas devem aparecer neste bloco.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}