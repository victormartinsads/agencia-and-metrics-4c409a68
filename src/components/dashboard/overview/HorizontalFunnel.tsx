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
  const clicksVal = Math.round(Number(clicks || 0));
  const pageviewsVal = Math.round(Number(pageviews || 0));
  const leadsVal = Math.round(Number(leads || 0));
  const meetingsVal = Math.round(Number(meetings || 0));
  const salesVal = Math.round(Number(sales || 0));

  const prevClicksVal = Math.round(Number(prevClicks || 0));
  const prevPageviewsVal = Math.round(Number(prevPageviews || 0));
  const prevLeadsVal = Math.round(Number(prevLeads || 0));
  const prevMeetingsVal = Math.round(Number(prevMeetings || 0));
  const prevSalesVal = Math.round(Number(prevSales || 0));

  const max = Math.max(clicksVal, pageviewsVal, leadsVal, meetingsVal, salesVal, 1);
  const steps = [
    { label: "Cliques", value: clicksVal, prev: prevClicksVal },
    { label: "Pageviews", value: pageviewsVal, prev: prevPageviewsVal },
    { label: "Leads", value: leadsVal, prev: prevLeadsVal },
    { label: "Reuniões", value: meetingsVal, prev: prevMeetingsVal },
    { label: "Vendas", value: salesVal, prev: prevSalesVal },
  ];

  // conversion between consecutive steps
  const convs = [
    { label: "Connect Rate", value: rate(pageviewsVal, clicksVal), delta: null as number | null },
    { label: "Tx. Conv. Leads", value: rate(leadsVal, pageviewsVal), delta: null as number | null },
    { label: "Tx. Reuniões", value: rate(meetingsVal, leadsVal), delta: null as number | null },
    { label: "Tx. Conv. Vendas", value: rate(salesVal, meetingsVal), delta: null as number | null },
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