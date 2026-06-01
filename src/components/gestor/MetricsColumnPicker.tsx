import { useMemo } from "react";
import { Check, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export interface MetricColumn {
  key: string;
  label: string;
  format?: "currency" | "number" | "percent";
  group?: string;
}

export const ALL_METRIC_COLUMNS: MetricColumn[] = [
  // Núcleo
  { key: "status", label: "Veiculação (Status)", group: "Núcleo" },
  { key: "spend", label: "Valor Usado (Gasto)", format: "currency", group: "Núcleo" },
  { key: "dailyBudget", label: "Orçamento", format: "currency", group: "Núcleo" },
  { key: "impressions", label: "Impressões", format: "number", group: "Núcleo" },
  { key: "reach", label: "Alcance", format: "number", group: "Núcleo" },
  { key: "frequency", label: "Frequência", format: "number", group: "Núcleo" },
  { key: "clicks", label: "Cliques no Link", format: "number", group: "Núcleo" },
  { key: "ctr", label: "CTR (taxa de cliques no link)", format: "percent", group: "Núcleo" },
  { key: "cpc", label: "CPC (custo por clique)", format: "currency", group: "Núcleo" },
  { key: "cpm", label: "CPM (custo por 1.000)", format: "currency", group: "Núcleo" },
  // Mensagens
  { key: "messaging_started", label: "Conversas por mensagem iniciadas", format: "number", group: "Mensagens" },
  { key: "cost_per_message", label: "Custo por conversa iniciada", format: "currency", group: "Mensagens" },
  // Conversões & Resultados
  { key: "conversions", label: "Resultados (Leads)", format: "number", group: "Conversões" },
  { key: "costPerConversion", label: "Custo por resultado (CPA)", format: "currency", group: "Conversões" },
  { key: "purchases", label: "Compras", format: "number", group: "Conversões" },
  { key: "purchaseValue", label: "Valor de compra", format: "currency", group: "Conversões" },
  { key: "profile_visits", label: "Visitas ao Perfil", format: "number", group: "Conversões" },
  // Vídeo
  { key: "videoPlays", label: "Reproduções 3s", format: "number", group: "Vídeo" },
  { key: "videoP25", label: "Reproduções 25%", format: "number", group: "Vídeo" },
  { key: "videoP50", label: "Reproduções 50%", format: "number", group: "Vídeo" },
  { key: "videoP75", label: "Reproduções 75%", format: "number", group: "Vídeo" },
  { key: "videoP95", label: "Reproduções 95%", format: "number", group: "Vídeo" },
  { key: "videoP100", label: "Reproduções 100% (ThruPlays)", format: "number", group: "Vídeo" },
  // Tráfego & LP Customizadas
  { key: "trafficUtilisationLp", label: "Aproveitamento do Tráfego - LP", format: "percent", group: "Tráfego" },
  { key: "trafficLossLp", label: "Perda do Tráfego - LP", format: "percent", group: "Tráfego" },
  { key: "trafficUtilisationForm", label: "Aproveitamento Tráfego - Formulário", format: "percent", group: "Tráfego" },
  { key: "trafficLossForm", label: "Perda de Tráfego - Formulário", format: "percent", group: "Tráfego" },
  { key: "pageConversionRate", label: "Conversão da página", format: "percent", group: "Tráfego" },
  // Formulário
  { key: "initiateCheckout", label: "Iniciou o Formulário", format: "number", group: "Formulário" },
  { key: "costPerInitiateCheckout", label: "Custo por iniciar o formulário", format: "currency", group: "Formulário" },
  { key: "formSubmitRate", label: "Tx. de Envios do formulário", format: "percent", group: "Formulário" },
  // Agendamento
  { key: "schedule", label: "Agendou reunião", format: "number", group: "Agendamento" },
  { key: "costPerSchedule", label: "Custo por agendar reunião", format: "currency", group: "Agendamento" },
  { key: "scheduleRate", label: "Tx. de Agendamento", format: "percent", group: "Agendamento" },
  // Outros
  { key: "objective", label: "Objetivo", group: "Outros" },
];

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
}

export function MetricsColumnPicker({ selected, onChange }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => ALL_METRIC_COLUMNS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const grouped = useMemo(() => {
    const m: Record<string, MetricColumn[]> = {};
    for (const c of filtered) {
      const g = c.group || "Outros";
      if (!m[g]) m[g] = [];
      m[g].push(c);
    }
    return m;
  }, [filtered]);

  const toggle = (k: string) => {
    if (selected.includes(k)) onChange(selected.filter((x) => x !== k));
    else onChange([...selected, k]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs">
          <Columns3 className="h-3.5 w-3.5 mr-1.5" /> Colunas ({selected.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-2 border-b border-border">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar métrica..." className="h-8 text-xs" />
        </div>
        <ScrollArea className="h-80">
          <div className="p-2 space-y-3">
            {Object.entries(grouped).map(([group, cols]) => (
              <div key={group}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">{group}</p>
                {cols.map((c) => {
                  const active = selected.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => toggle(c.key)}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-accent/40"
                    >
                      <span>{c.label}</span>
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function formatMetricValue(value: any, format?: string, currencySymbol = "R$") {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  const v = Number(value);
  if (Number.isNaN(v)) return String(value);
  if (format === "currency") return `${currencySymbol} ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
  if (format === "percent") return `${v.toFixed(2)}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}