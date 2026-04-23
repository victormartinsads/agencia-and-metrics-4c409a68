import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clicks: number;
  pageviews: number;
  leads: number;
  meetings: number;
  sales: number;
  prevClicks?: number;
  prevPageviews?: number;
  prevLeads?: number;
  prevMeetings?: number;
  prevSales?: number;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function pct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}
function rate(curr: number, prev: number): number | null {
  if (!prev) return null;
  return (curr / prev) * 100;
}

function DeltaPill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const positive = value >= 0;
  return (
    <div className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold", positive ? "text-primary" : "text-destructive")}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}

function ConvBox({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center min-w-[90px]">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-card-foreground mt-0.5">{value}</p>
      <DeltaPill value={delta} />
    </div>
  );
}

export function HorizontalFunnel({
  clicks, pageviews, leads, meetings, sales,
  prevClicks = 0, prevPageviews = 0, prevLeads = 0, prevMeetings = 0, prevSales = 0,
}: Props) {
  const max = Math.max(clicks, pageviews, leads, meetings, sales, 1);
  const steps = [
    { label: "Cliques", value: clicks, prev: prevClicks },
    { label: "Pageviews", value: pageviews, prev: prevPageviews },
    { label: "Leads", value: leads, prev: prevLeads },
    { label: "Reuniões", value: meetings, prev: prevMeetings },
    { label: "Vendas", value: sales, prev: prevSales },
  ];

  // conversion between consecutive steps
  const convs = [
    { label: "Connect Rate", value: rate(pageviews, clicks), delta: null as number | null },
    { label: "Tx. Conv. Leads", value: rate(leads, pageviews), delta: null as number | null },
    { label: "Tx. Reuniões", value: rate(meetings, leads), delta: null as number | null },
    { label: "Tx. Conv. Vendas", value: rate(sales, meetings), delta: null as number | null },
  ];

  return (
    <div className="grid grid-cols-[1fr_120px] gap-3 items-center">
      {/* Funnel bars + values */}
      <div className="space-y-2">
        {steps.map((s, i) => {
          const widthPct = Math.max(8, (s.value / max) * 100);
          const delta = pct(s.value, s.prev);
          return (
            <div key={s.label} className="grid grid-cols-[1fr_60px_50px] gap-3 items-center">
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${widthPct}%`, opacity: 1 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="h-9 rounded-lg bg-gradient-to-r from-primary via-primary/80 to-primary/40 flex items-center px-3"
                style={{ minWidth: "60px" }}
              >
                <span className="text-[11px] font-semibold text-primary-foreground/90">{s.label}</span>
              </motion.div>
              <p className="text-base font-bold text-card-foreground text-right">{fmt(s.value)}</p>
              <div className="text-right"><DeltaPill value={delta} /></div>
            </div>
          );
        })}
      </div>

      {/* Conversion side rates */}
      <div className="flex flex-col gap-3 items-stretch">
        {convs.map((c) => (
          <ConvBox key={c.label} label={c.label} value={c.value != null ? `${c.value.toFixed(2)}%` : "—"} delta={c.delta} />
        ))}
      </div>
    </div>
  );
}