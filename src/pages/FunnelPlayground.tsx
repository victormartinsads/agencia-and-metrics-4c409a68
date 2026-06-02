import { useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Award, Zap, Sliders, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data matching the presentation client
const clicksVal = 62896;
const pageviewsVal = 85200;
const leadsVal = 1591;
const meetingsVal = 320;
const salesVal = 96;

const prevClicksVal = 48381;
const prevPageviewsVal = 68160;
const prevLeadsVal = 2222;
const prevMeetingsVal = 447;
const prevSalesVal = 73;

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

// Subcomponents for the Playground
function DeltaPill({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className="text-[10px] text-muted-foreground/50">—</span>;
  const positive = value >= 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 border",
        positive ? "text-[#9eff36] border-[#9eff36]/20 bg-[#9eff36]/5" : "text-rose-500 border-rose-500/20 bg-rose-500/5",
        className
      )}
    >
      <span>{positive ? "↗" : "↘"}</span>
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

// -------------------------------------------------------------
// OPÇÃO A: Minimalista Glassmorphic (Linear Style)
// -------------------------------------------------------------
function FunnelOptionA() {
  const steps = [
    { label: "Cliques", value: clicksVal, prev: prevClicksVal },
    { label: "Visualização de página", value: pageviewsVal, prev: prevPageviewsVal },
    { label: "Leads", value: leadsVal, prev: prevLeadsVal },
    { label: "Reuniões", value: meetingsVal, prev: prevMeetingsVal },
    { label: "Compras", value: salesVal, prev: prevSalesVal },
  ];

  const convs = [
    { label: "Connect Rate", val: rate(pageviewsVal, clicksVal), prevVal: rate(prevPageviewsVal, prevClicksVal) },
    { label: "Tx. Conv. Leads", val: rate(leadsVal, pageviewsVal), prevVal: rate(prevLeadsVal, prevPageviewsVal) },
    { label: "Tx. Reuniões", val: rate(meetingsVal, leadsVal), prevVal: rate(prevMeetingsVal, prevLeadsVal) },
    { label: "Tx. Conv. Vendas", val: rate(salesVal, meetingsVal), prevVal: rate(prevSalesVal, prevMeetingsVal) },
  ];

  return (
    <div className="w-full h-[320px] grid grid-cols-[1.3fr_1fr] gap-4 p-4 bg-zinc-950 rounded-2xl border border-white/[0.05] overflow-hidden">
      {/* Steps list */}
      <div className="flex flex-col justify-between h-full py-1">
        {steps.map((s, i) => {
          const delta = pct(s.value, s.prev);
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center justify-between hover:border-white/15 transition-colors duration-200"
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
      <div className="flex flex-col justify-between h-full py-1 pl-3 border-l border-white/[0.06]">
        {convs.map((c, i) => {
          const delta = pct(c.val ?? 0, c.prevVal ?? 0);
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 + 0.1 }}
              className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-2.5 flex flex-col justify-center"
            >
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wide">{c.label}</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xs font-bold text-white font-mono">{c.val != null ? `${c.val.toFixed(2)}%` : "—"}</span>
                <DeltaPill value={delta} className="scale-[0.8] origin-right" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// OPÇÃO B: Arcos Concéntricos e Indicadores Radiais (Luxury Watch)
// -------------------------------------------------------------
function FunnelOptionB() {
  const steps = [
    { label: "Cliques", value: clicksVal, prev: prevClicksVal, pctOfTotal: 100 },
    { label: "Vis. Página", value: pageviewsVal, prev: prevPageviewsVal, pctOfTotal: 85 },
    { label: "Leads", value: leadsVal, prev: prevLeadsVal, pctOfTotal: 35 },
    { label: "Reuniões", value: meetingsVal, prev: prevMeetingsVal, pctOfTotal: 18 },
    { label: "Compras", value: salesVal, prev: prevSalesVal, pctOfTotal: 8 },
  ];

  return (
    <div className="w-full h-[320px] flex items-center justify-between gap-6 p-5 bg-zinc-950 rounded-2xl border border-white/[0.05] overflow-hidden select-none">
      {/* Visual Circle Gauge area */}
      <div className="relative w-[150px] h-[150px] flex items-center justify-center shrink-0">
        {/* Layered concentric rings using pure CSS borders */}
        {steps.map((s, i) => {
          const size = 150 - i * 26;
          const strokeDash = (2 * Math.PI * (size / 2)) * (s.pctOfTotal / 100);
          return (
            <div
              key={s.label}
              className="absolute rounded-full border border-white/[0.03] flex items-center justify-center"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
            >
              <svg className="absolute inset-0 -rotate-90 w-full h-full">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2 - 2}
                  className="fill-none stroke-[#9eff36] opacity-80"
                  strokeWidth="2.5"
                  strokeDasharray={`${strokeDash} 999`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          );
        })}
        {/* Inner core display */}
        <div className="w-[40px] h-[40px] rounded-full bg-zinc-900 border border-white/10 flex flex-col items-center justify-center shadow-lg">
          <Zap className="h-3.5 w-3.5 text-[#9eff36] animate-pulse" />
        </div>
      </div>

      {/* Labels List */}
      <div className="flex-1 flex flex-col justify-between h-full py-1">
        {steps.map((s, i) => {
          const delta = pct(s.value, s.prev);
          return (
            <div key={s.label} className="flex items-center justify-between border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                {/* Colored mini circle badge indicator */}
                <div className="w-2.5 h-2.5 rounded-full border border-[#9eff36]/30 bg-[#9eff36]/10 shrink-0" style={{ opacity: 1 - i * 0.18 }} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-bold">{s.label}</span>
                  <span className="text-xs font-bold text-white font-mono mt-0.5">{fmt(s.value)}</span>
                </div>
              </div>
              <DeltaPill value={delta} className="scale-[0.8] origin-right" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// OPÇÃO C: Visual Trapeze Pipeline (Sankey Flow / Connected Chevrons)
// -------------------------------------------------------------
function FunnelOptionC() {
  const steps = [
    { label: "Cliques", value: clicksVal, wPct: 100 },
    { label: "Visualização", value: pageviewsVal, wPct: 84 },
    { label: "Leads", value: leadsVal, wPct: 68 },
    { label: "Reuniões", value: meetingsVal, wPct: 52 },
    { label: "Compras", value: salesVal, wPct: 36 },
  ];

  return (
    <div className="w-full h-[320px] flex flex-col justify-between p-4 bg-zinc-950 rounded-2xl border border-white/[0.05] overflow-hidden">
      <div className="flex flex-col items-center gap-1.5 w-full flex-1 justify-center">
        {steps.map((s, i) => {
          // Classic smooth funnel block structure
          return (
            <div key={s.label} className="w-full flex flex-col items-center">
              {/* Funnel Segment */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative h-[32px] rounded-lg bg-gradient-to-r from-[#9eff36]/5 to-[#9eff36]/20 border border-[#9eff36]/20 hover:border-[#9eff36]/40 flex items-center justify-between px-4 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                style={{ width: `${s.wPct}%` }}
              >
                <span className="text-[10px] font-bold text-zinc-300 truncate mr-2">{s.label}</span>
                <span className="text-[11px] font-bold text-[#9eff36] font-mono shrink-0">{fmt(s.value)}</span>
              </motion.div>

              {/* Spacing gap connecting arrow */}
              {i < steps.length - 1 && (
                <div className="h-1 flex items-center justify-center">
                  <div className="w-[1px] h-full bg-[#9eff36]/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic Summary bar at bottom */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] mt-2">
        <div className="bg-white/[0.01] rounded-lg px-3 py-1 text-center border border-white/[0.03]">
          <span className="text-[7.5px] uppercase font-bold text-zinc-500">Taxa de Conversão Total</span>
          <p className="text-xs font-bold text-[#9eff36] font-mono mt-0.5">{((salesVal / clicksVal) * 100).toFixed(3)}%</p>
        </div>
        <div className="bg-white/[0.01] rounded-lg px-3 py-1 text-center border border-white/[0.03]">
          <span className="text-[7.5px] uppercase font-bold text-zinc-500">Aproveitamento LP</span>
          <p className="text-xs font-bold text-white font-mono mt-0.5">{((pageviewsVal / clicksVal) * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// OPÇÃO D: Timeline Grid Analítica (SaaS Analytics Table)
// -------------------------------------------------------------
function FunnelOptionD() {
  const steps = [
    { label: "Cliques no Link", value: clicksVal, rate: "100%", delta: pct(clicksVal, prevClicksVal) },
    { label: "Visualização Página (LP)", value: pageviewsVal, rate: `${((pageviewsVal / clicksVal) * 100).toFixed(1)}%`, delta: pct(pageviewsVal, prevPageviewsVal) },
    { label: "Leads Gerados", value: leadsVal, rate: `${((leadsVal / pageviewsVal) * 100).toFixed(1)}%`, delta: pct(leadsVal, prevLeadsVal) },
    { label: "Reuniões Agendadas", value: meetingsVal, rate: `${((meetingsVal / leadsVal) * 100).toFixed(1)}%`, delta: pct(meetingsVal, prevMeetingsVal) },
    { label: "Vendas Realizadas", value: salesVal, rate: `${((salesVal / meetingsVal) * 100).toFixed(1)}%`, delta: pct(salesVal, prevSalesVal) },
  ];

  return (
    <div className="w-full h-[320px] flex flex-col justify-between p-4 bg-zinc-950 rounded-2xl border border-white/[0.05] overflow-hidden font-sans">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] pb-1">
            <th className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider pb-1.5">Etapa</th>
            <th className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider pb-1.5 text-right">Volume</th>
            <th className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider pb-1.5 text-right">Passo %</th>
            <th className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider pb-1.5 text-right">Delta MTD</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.label} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] transition-colors">
              <td className="py-2.5 text-[11px] font-semibold text-zinc-300 max-w-[120px] truncate">{s.label}</td>
              <td className="py-2.5 text-[11px] font-bold text-white font-mono text-right">{fmt(s.value)}</td>
              <td className="py-2.5 text-[11px] font-bold text-[#9eff36] font-mono text-right">{s.rate}</td>
              <td className="py-2.5 py-0.5 text-right">
                <DeltaPill value={s.delta} className="scale-[0.8] origin-right" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN PAGE VIEW
// -------------------------------------------------------------
export default function FunnelPlayground() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 max-w-[1400px] mx-auto space-y-8 select-none">
      {/* Header Cockpit */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-[#9eff36]" />
            Playground de Funis de Conversão
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Analise e escolha qual layout se integra melhor à identidade visual do seu dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/gestor"
            className="text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center gap-1.5"
          >
            ← Voltar ao Gestor
          </Link>
        </div>
      </div>

      {/* Grid of the 4 design options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* OPÇÃO A */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#9eff36] text-[10px] font-bold flex items-center justify-center border border-[#9eff36]/20">A</span>
              Opção A: Minimalista Glassmorphic (Split View)
            </h3>
            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">Estilo Linear</span>
          </div>
          <FunnelOptionA />
          <button
            onClick={() => setSelectedOption("A")}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5",
              selectedOption === "A"
                ? "bg-[#9eff36] text-black border-[#9eff36]"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
            )}
          >
            {selectedOption === "A" ? "✓ Opção A Selecionada!" : "Escolher Opção A"}
          </button>
        </div>

        {/* OPÇÃO B */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#9eff36] text-[10px] font-bold flex items-center justify-center border border-[#9eff36]/20">B</span>
              Opção B: Arcos Concéntricos (Watch Dial)
            </h3>
            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">Retenção de Área</span>
          </div>
          <FunnelOptionB />
          <button
            onClick={() => setSelectedOption("B")}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5",
              selectedOption === "B"
                ? "bg-[#9eff36] text-black border-[#9eff36]"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
            )}
          >
            {selectedOption === "B" ? "✓ Opção B Selecionada!" : "Escolher Opção B"}
          </button>
        </div>

        {/* OPÇÃO C */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#9eff36] text-[10px] font-bold flex items-center justify-center border border-[#9eff36]/20">C</span>
              Opção C: Visual Trapeze Pipeline
            </h3>
            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">Estilo Clássico</span>
          </div>
          <FunnelOptionC />
          <button
            onClick={() => setSelectedOption("C")}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5",
              selectedOption === "C"
                ? "bg-[#9eff36] text-black border-[#9eff36]"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
            )}
          >
            {selectedOption === "C" ? "✓ Opção C Selecionada!" : "Escolher Opção C"}
          </button>
        </div>

        {/* OPÇÃO D */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-[#9eff36] text-[10px] font-bold flex items-center justify-center border border-[#9eff36]/20">D</span>
              Opção D: Timeline Grid Analítica (SaaS Grid)
            </h3>
            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">Compacta e Analítica</span>
          </div>
          <FunnelOptionD />
          <button
            onClick={() => setSelectedOption("D")}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5",
              selectedOption === "D"
                ? "bg-[#9eff36] text-black border-[#9eff36]"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
            )}
          >
            {selectedOption === "D" ? "✓ Opção D Selecionada!" : "Escolher Opção D"}
          </button>
        </div>

      </div>

      {/* Selected Action Panel */}
      {selectedOption && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#9eff36]/30 bg-[#9eff36]/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#9eff36]/10 flex items-center justify-center border border-[#9eff36]/20">
              <Award className="h-5 w-5 text-[#9eff36]" />
            </div>
            <div>
              <p className="text-sm font-bold">Layout "Opção {selectedOption}" escolhido!</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Responda no chat da IA confirmando sua escolha para que eu implemente esta versão permanentemente no seu dashboard principal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-500 font-bold">Pronto para aplicar?</span>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-[#9eff36] flex items-center gap-1">
              Confirmar Opção {selectedOption} <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
