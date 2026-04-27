import { useEffect, useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FunnelGroup } from "@/lib/funnelGrouping";
import { DiagnosticBlocks } from "@/hooks/useWeeklyDiagnostic";
import {
  AVAILABLE_METRICS,
  formatCustomValue,
  useDiagnosticMetricsConfig,
} from "@/hooks/useDiagnosticMetricsConfig";

interface Props {
  clientName: string;
  datePreset: string;
  groups: FunnelGroup[];
  blocks: DiagnosticBlocks;
  whatWeDid: string;
  nextActions: string;
  currencySymbol?: string;
  onClose?: () => void;
  clientId?: string;
  /** Chave bruta do período (ex: "last_7d") usada para ler/persistir config no banco. */
  datePresetKey?: string;
  /** Se true, esconde o botão "Sair" (uso em página pública compartilhada). */
  publicMode?: boolean;
}

type Slide =
  | { kind: "cover" }
  | { kind: "notes" }
  | { kind: "group"; group: FunnelGroup }
  | { kind: "diagnostic"; key: keyof DiagnosticBlocks; title: string; emoji: string; accent: string };

function fmtMoney(v: number, sym: string) {
  return `${sym} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Modo apresentação fullscreen — slide a slide.
 * Use ←/→/Space para navegar, ESC para sair.
 * Layout grande pra gravar vídeo lendo o conteúdo.
 */
export function DiagnosticoPresentMode({
  clientName, datePreset, groups, blocks, whatWeDid, nextActions, currencySymbol = "R$", onClose, clientId, datePresetKey, publicMode,
}: Props) {
  const slides = useMemo<Slide[]>(() => [
    { kind: "cover" },
    { kind: "notes" },
    ...groups.map(g => ({ kind: "group" as const, group: g })),
    { kind: "diagnostic", key: "positives", title: "O que foi positivo", emoji: "✅", accent: "from-green-500/20" },
    { kind: "diagnostic", key: "negatives", title: "O que foi negativo", emoji: "⚠️", accent: "from-red-500/20" },
    { kind: "diagnostic", key: "manager_actions", title: "Ações do gestor", emoji: "🛠️", accent: "from-blue-500/20" },
    { kind: "diagnostic", key: "client_requests", title: "Pedidos ao cliente", emoji: "🤝", accent: "from-amber-500/20" },
  ], [groups]);

  const [idx, setIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const next = () => setIdx(i => Math.min(i + 1, slides.length - 1));
  const prev = () => setIdx(i => Math.max(i - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  const enterFullscreen = async () => {
    try { await containerRef.current?.requestFullscreen?.(); } catch {}
  };

  const slide = slides[idx];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/40 backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {clientName} • {datePreset} • Slide {idx + 1} / {slides.length}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={enterFullscreen} className="gap-2">
            <Maximize2 className="h-4 w-4" /> Tela cheia
          </Button>
          {!publicMode && onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" /> Sair
            </Button>
          )}
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 overflow-auto flex items-stretch">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-6xl mx-auto px-10 py-12"
          >
            {slide.kind === "cover" && (
              <div className="h-full flex flex-col justify-center">
                <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Diagnóstico Semanal</p>
                <h1 className="text-6xl md:text-7xl font-extrabold text-card-foreground mt-4">{clientName}</h1>
                <p className="text-2xl text-muted-foreground mt-4">{datePreset}</p>
                <p className="text-base text-muted-foreground mt-12">{groups.length} funil(s) / campanha(s) com investimento no período</p>
              </div>
            )}

            {slide.kind === "notes" && (
              <div className="space-y-8">
                <h2 className="text-4xl font-bold text-card-foreground">📝 Anotações da semana</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-primary">O que fizemos</h3>
                    <pre className="mt-3 whitespace-pre-wrap text-base text-card-foreground font-sans leading-relaxed">
                      {whatWeDid || "(sem anotações)"}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-primary">Próximas ações</h3>
                    <pre className="mt-3 whitespace-pre-wrap text-base text-card-foreground font-sans leading-relaxed">
                      {nextActions || "(sem anotações)"}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {slide.kind === "group" && (
              <GroupSlide
                group={slide.group}
                currencySymbol={currencySymbol}
                clientId={clientId}
                datePreset={datePresetKey || datePreset}
              />
            )}

            {slide.kind === "diagnostic" && (
              <div className={`rounded-3xl bg-gradient-to-br ${slide.accent} to-transparent p-10 border border-border h-full`}>
                <h2 className="text-4xl font-bold text-card-foreground flex items-center gap-3">
                  <span className="text-5xl">{slide.emoji}</span> {slide.title}
                </h2>
                <div className="mt-8 prose prose-lg dark:prose-invert max-w-none text-card-foreground
                                prose-p:my-3 prose-li:my-2 prose-strong:text-card-foreground">
                  {blocks[slide.key]?.trim()
                    ? <ReactMarkdown>{blocks[slide.key]}</ReactMarkdown>
                    : <p className="text-muted-foreground italic">Sem conteúdo neste bloco.</p>}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/40 backdrop-blur">
        <Button size="sm" variant="outline" onClick={prev} disabled={idx === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="text-xs text-muted-foreground">Use ← → ou Espaço para navegar • ESC para sair</div>
        <Button size="sm" variant="outline" onClick={next} disabled={idx === slides.length - 1} className="gap-2">
          Próximo <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function GroupSlide({
  group,
  currencySymbol,
  clientId,
  datePreset,
}: {
  group: FunnelGroup;
  currencySymbol: string;
  clientId?: string;
  datePreset: string;
}) {
  const totals = group.campaigns.reduce(
    (acc, c) => {
      acc.spend += c.spend;
      acc.impressions += c.impressions;
      acc.clicks += c.clicks;
      acc.conversions += c.conversions;
      acc.reach += c.reach || 0;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 }
  );
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const purchaseValue = group.campaigns.reduce((s, c) => s + (c.purchaseValue || 0), 0);
  const roas = totals.spend > 0 && purchaseValue > 0 ? purchaseValue / totals.spend : 0;
  const resultLabel =
    group.campaigns.find(c => c.primaryResultLabel)?.primaryResultLabel || "Resultados";

  const { config } = useDiagnosticMetricsConfig(clientId || "", datePreset, group.key);

  const renderMetricValue = (key: string): string => {
    switch (key) {
      case "spend": return fmtMoney(totals.spend, currencySymbol);
      case "conversions": return totals.conversions.toLocaleString("pt-BR");
      case "cpa": return cpa > 0 ? fmtMoney(cpa, currencySymbol) : "—";
      case "ctr": return `${ctr.toFixed(2)}%`;
      case "cpc": return cpc > 0 ? fmtMoney(cpc, currencySymbol) : "—";
      case "cpm": return fmtMoney(cpm, currencySymbol);
      case "reach": return totals.reach.toLocaleString("pt-BR");
      case "impressions": return totals.impressions.toLocaleString("pt-BR");
      case "clicks": return totals.clicks.toLocaleString("pt-BR");
      case "roas": return roas > 0 ? `${roas.toFixed(2)}x` : "—";
      default: return "—";
    }
  };
  const metricLabel = (key: string) =>
    key === "conversions" ? resultLabel : AVAILABLE_METRICS.find(m => m.key === key)?.label || key;
  const isHighlight = (key: string) => key === "spend" || key === "conversions";

  // Top 3 criativos do grupo
  const top = group.campaigns
    .flatMap(c => c.creatives.map(cr => ({ ...cr, _camp: c.name })))
    .filter(cr => cr.spend > 0 || cr.impressions > 0)
    .sort((a, b) => (b.primaryResult ?? b.conversions) - (a.primaryResult ?? a.conversions))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          {group.isFunnel ? "Funil" : "Campanha"}
        </p>
        <h2 className="text-4xl font-bold text-card-foreground mt-1">{group.key}</h2>
        {group.isFunnel && (
          <p className="text-sm text-muted-foreground mt-1">
            {group.campaigns.length} campanhas agrupadas
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {config.visible_metrics.map(key => (
          <BigKpi
            key={key}
            label={metricLabel(key)}
            value={renderMetricValue(key)}
            highlight={isHighlight(key)}
          />
        ))}
        {config.custom_metrics.map(m => (
          <BigKpi
            key={m.id}
            label={m.label}
            value={formatCustomValue(m, currencySymbol)}
            custom
          />
        ))}
      </div>

      {top.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-card-foreground mb-3">🏆 Top criativos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top.map((cr, i) => {
              const r = cr.primaryResult ?? cr.conversions;
              const cCpa = r > 0 ? cr.spend / r : 0;
              return (
                <div key={cr.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={cr.thumbnail}
                      alt={cr.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const t = e.currentTarget;
                        if (t.dataset.fb === "1") return;
                        t.dataset.fb = "1";
                        t.src = `https://picsum.photos/seed/${cr.id}/600/600`;
                      }}
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-[10px] font-bold text-primary">TOP {i + 1}</div>
                    <div className="text-sm font-medium text-card-foreground truncate">{cr.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">Conjunto: {cr.adsetName || "—"}</div>
                    <div className="flex justify-between text-xs pt-2">
                      <span className="text-muted-foreground">{resultLabel}</span>
                      <span className="font-bold text-primary">{r}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">CPA</span>
                      <span className="font-semibold text-card-foreground">
                        {r > 0 ? fmtMoney(cCpa, currencySymbol) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BigKpi({
  label,
  value,
  highlight,
  custom,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  custom?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      custom
        ? "border-amber-500/40 bg-amber-500/10"
        : highlight
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-muted/30"
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {custom && <span className="text-amber-500">✦</span>}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${
        custom ? "text-amber-500" : highlight ? "text-primary" : "text-card-foreground"
      }`}>{value}</div>
    </div>
  );
}
