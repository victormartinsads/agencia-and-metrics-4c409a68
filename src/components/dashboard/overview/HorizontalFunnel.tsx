import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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

function DeltaPill({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const positive = value >= 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 border leading-none shrink-0",
        positive ? "text-[#9eff36] border-[#9eff36]/20 bg-[#9eff36]/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5",
        className
      )}
    >
      <span>{positive ? "↗" : "↘"}</span>
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

function ConvBox({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  const isPositive = delta != null && delta >= 0;
  const isNegative = delta != null && delta < 0;

  return (
    <div
      className={cn(
        "w-full rounded-xl border px-2.5 py-1.5 flex flex-col justify-center h-[46px] shrink-0 transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.15)]",
        isPositive && "border-[#9eff36]/20 bg-[#9eff36]/[0.02] hover:border-[#9eff36]/30 hover:bg-[#9eff36]/[0.04]",
        isNegative && "border-rose-500/20 bg-rose-500/[0.02] hover:border-rose-500/30 hover:bg-rose-500/[0.04]",
        delta == null && "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]"
      )}
    >
      <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-wide leading-none">{label}</span>
      <div className="flex items-center justify-between mt-1.5 leading-none">
        <span className="text-[11px] font-bold text-white font-mono leading-none">{value}</span>
        <DeltaPill value={delta} className="scale-[0.75] origin-right" />
      </div>
    </div>
  );
}

export function HorizontalFunnel({
  clicks, pageviews, leads, meetings, sales,
  prevClicks = 0, prevPageviews = 0, prevLeads = 0, prevMeetings = 0, prevSales = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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

  const steps = [
    { label: "Cliques", value: clicksVal, prev: prevClicksVal },
    { label: "Visualização de página", value: pageviewsVal, prev: prevPageviewsVal },
    { label: "Leads", value: leadsVal, prev: prevLeadsVal },
    { label: "Reuniões", value: meetingsVal, prev: prevMeetingsVal },
    { label: "Compras", value: salesVal, prev: prevSalesVal },
  ];

  // conversion rates
  const convConnect = rate(pageviewsVal, clicksVal);
  const convLeads = rate(leadsVal, pageviewsVal);
  const convMeetings = rate(meetingsVal, leadsVal);
  const convSales = rate(salesVal, meetingsVal);

  const prevConvConnect = rate(prevPageviewsVal, prevClicksVal);
  const prevConvLeads = rate(prevLeadsVal, prevPageviewsVal);
  const prevConvMeetings = rate(prevMeetingsVal, prevLeadsVal);
  const prevConvSales = rate(prevSalesVal, prevMeetingsVal);

  const convs = [
    { label: "Connect Rate", val: convConnect, prevVal: prevConvConnect },
    { label: "Tx. Conv. Leads", val: convLeads, prevVal: prevConvLeads },
    { label: "Tx. Reuniões", val: convMeetings, prevVal: prevConvMeetings },
    { label: "Tx. Conv. Vendas", val: convSales, prevVal: prevConvSales },
  ];

  const isCompact = width < 450;

  if (isCompact) {
    return (
      <div ref={containerRef} className="w-full flex flex-col gap-4 p-4 select-none">
        {/* Steps List */}
        <div className="flex flex-col gap-2">
          {steps.map((s, i) => {
            const delta = pct(s.value, s.prev);
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="border border-white/[0.06] bg-white/[0.02] hover:border-white/15 px-3 py-2 flex items-center justify-between rounded-xl"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5">{fmt(s.value)}</span>
                </div>
                <DeltaPill value={delta} />
              </motion.div>
            );
          })}
        </div>

        {/* Conversion Grid */}
        <div className="grid grid-cols-2 gap-2">
          {convs.map((c, i) => {
            const delta = pct(c.val ?? 0, c.prevVal ?? 0);
            return (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 + 0.2, duration: 0.3 }}
              >
                <ConvBox
                  label={c.label}
                  value={c.val != null ? `${c.val.toFixed(2)}%` : "—"}
                  delta={delta}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full grid grid-cols-[1.3fr_1fr] gap-4 p-4 bg-zinc-950/20 select-none overflow-hidden"
    >
      {/* Steps list */}
      <div className="flex flex-col justify-between h-full py-0.5">
        {steps.map((s, i) => {
          const delta = pct(s.value, s.prev);
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border border-white/[0.06] bg-white/[0.02] hover:border-white/15 px-3 py-2 flex items-center justify-between rounded-xl transition-all duration-200"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5">{fmt(s.value)}</span>
              </div>
              <DeltaPill value={delta} />
            </motion.div>
          );
        })}
      </div>

      {/* Conversion Boxes */}
      <div className="flex flex-col justify-between h-full py-0.5 pl-4 border-l border-white/[0.06]">
        {convs.map((c, i) => {
          const delta = pct(c.val ?? 0, c.prevVal ?? 0);
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 + 0.1 }}
            >
              <ConvBox
                label={c.label}
                value={c.val != null ? `${c.val.toFixed(2)}%` : "—"}
                delta={delta}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}