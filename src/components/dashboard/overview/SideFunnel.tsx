import { motion } from "framer-motion";
import { MousePointerClick, Eye, UserPlus, Users, ShoppingBag, ChevronDown } from "lucide-react";

interface FunnelStep {
  label: string;
  value: number;
  icon: typeof MousePointerClick;
}

interface Props {
  clicks: number;
  pageviews: number;
  leads: number;
  meetings: number;
  sales: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
}

function rate(curr: number, prev: number): string {
  if (!prev) return "—";
  return `${((curr / prev) * 100).toFixed(1)}%`;
}

export function SideFunnel({ clicks, pageviews, leads, meetings, sales }: Props) {
  const steps: FunnelStep[] = [
    { label: "Cliques", value: clicks, icon: MousePointerClick },
    { label: "Pageviews", value: pageviews, icon: Eye },
    { label: "Leads", value: leads, icon: UserPlus },
    { label: "Reuniões", value: meetings, icon: Users },
    { label: "Vendas", value: sales, icon: ShoppingBag },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-card-foreground">Funil de Conversão</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Cliques → Vendas (taxa entre etapas)</p>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const prev = i > 0 ? steps[i - 1].value : null;
          const conv = prev != null ? rate(step.value, prev) : null;
          return (
            <div key={step.label}>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-border bg-background/50 p-3 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{step.label}</p>
                  <p className="text-lg font-bold text-card-foreground leading-tight">{fmt(step.value)}</p>
                </div>
              </motion.div>
              {conv && i < steps.length - 1 && (
                <div className="flex items-center justify-center py-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <ChevronDown className="h-3 w-3" />
                    {conv}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}