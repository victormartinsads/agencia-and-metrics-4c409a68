import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALL_METRICS = [
  { key: "totalSpend", label: "Investimento Total", group: "resultados" },
  { key: "totalResults", label: "Resultados", group: "resultados" },
  { key: "totalLeads", label: "Leads", group: "resultados" },
  { key: "totalConversations", label: "Conversas Iniciadas", group: "conversas" },
  { key: "cpl", label: "CPL", group: "resultados" },
  { key: "cpa", label: "CPA", group: "resultados" },
  { key: "roas", label: "ROAS", group: "resultados" },
  { key: "ctr", label: "CTR", group: "trafego" },
  { key: "cpc", label: "CPC", group: "custos" },
  { key: "cpm", label: "CPM", group: "custos" },
  { key: "conversionRate", label: "Taxa de Conversão", group: "resultados" },
];

const TEMPLATES: Record<string, { label: string; metrics: string[] }> = {
  geral: { label: "Visão Geral", metrics: ["totalSpend", "totalResults", "totalLeads", "totalConversations", "cpl", "cpa", "roas", "ctr", "cpc", "cpm", "conversionRate"] },
  funil: { label: "Visão de Funil", metrics: ["totalSpend", "totalResults", "totalLeads", "cpa", "cpl", "conversionRate"] },
  escala: { label: "Visão de Escala", metrics: ["totalSpend", "totalResults", "roas", "cpa", "cpc", "cpm"] },
  criativos: { label: "Visão de Criativos", metrics: ["totalSpend", "ctr", "cpc", "cpm", "totalResults"] },
};

interface Props {
  selected: string[];
  onChange: (metrics: string[]) => void;
}

export function MetricSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Selecionar Métricas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Métricas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Templates</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <Button key={key} variant="outline" size="sm" onClick={() => onChange(t.metrics)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {ALL_METRICS.map(m => (
              <label key={m.key} className="flex items-center gap-2 cursor-pointer py-1">
                <Checkbox checked={selected.includes(m.key)} onCheckedChange={() => toggle(m.key)} />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
