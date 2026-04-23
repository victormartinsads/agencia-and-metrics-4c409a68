import { useState, useEffect } from "react";
import { Link as LinkIcon, Plus } from "lucide-react";
import { Link } from "react-router-dom";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricSourceEditor, MetricBinding } from "./MetricSourceEditor";
import { useMetricBindings } from "./MetricSourceEditor";

export interface MetricOption {
  key: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: BlockConfig | null;
  metricOptions?: MetricOption[];
  /** Bindings for source-mapping (optional). When provided, the "Fontes" tab is shown. */
  metricBindings?: MetricBinding[];
  clientId?: string;
  onSave: (patch: Partial<BlockConfig>) => void;
}

export function BlockSettingsDialog({
  open,
  onOpenChange,
  block,
  metricOptions,
  metricBindings,
  clientId,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const { spreadsheets, sources } = useMetricBindings(clientId);

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

  const showSources = !!(metricBindings && metricBindings.length > 0 && clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar bloco</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="layout">Layout & Métricas</TabsTrigger>
            <TabsTrigger value="sources" disabled={!showSources}>
              Fontes de Dados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="block-title">Título</Label>
              <Input
                id="block-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do bloco"
              />
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
          </TabsContent>

          {showSources && (
            <TabsContent value="sources" className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Defina <span className="text-foreground font-medium">de onde vem cada métrica</span>{" "}
                  deste bloco. Você pode misturar planilhas diferentes.
                </p>
                <Link to={`/dashboard/${clientId}/sheets`}>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                    <Plus className="h-3 w-3" /> Planilhas
                  </Button>
                </Link>
              </div>
              {spreadsheets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhuma planilha cadastrada ainda.
                  <br />
                  <Link
                    to={`/dashboard/${clientId}/sheets`}
                    className="inline-flex items-center gap-1 text-primary mt-2 underline"
                  >
                    <LinkIcon className="h-3 w-3" /> Cadastrar planilhas
                  </Link>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-2">
                    {metricBindings!
                      .filter((m) => picked.length === 0 || picked.includes(m.key))
                      .map((m) => (
                        <MetricSourceEditor
                          key={m.key}
                          clientId={clientId!}
                          metric={m}
                          spreadsheets={spreadsheets}
                          current={sources?.get(m.key)}
                        />
                      ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          )}
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}