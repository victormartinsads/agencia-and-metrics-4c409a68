import { useEffect, useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2, Globe, BarChart3, Sparkles, ArrowRight, Loader2, Target, Play, Pause, Search, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleConnectionStatus, useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { useGoogleAds, type GoogleAdsKeyword, type GoogleAdsCreative } from "@/hooks/useGoogleAds";
import { formatCurrency } from "@/lib/format";
import { FunnelGroup, extractFunnelCode } from "@/lib/funnelGrouping";
import { DiagnosticBlocks } from "@/hooks/useWeeklyDiagnostic";
import { useFunnelLabels } from "@/hooks/useFunnelLabels";
import { ManualFunnel } from "@/hooks/useManualFunnels";
import { FunnelPreviewCard } from "@/components/funnel/FunnelPreviewCard";
import {
  AVAILABLE_METRICS,
  formatCustomValue,
  useDiagnosticMetricsConfig,
  MetricsConfig,
} from "@/hooks/useDiagnosticMetricsConfig";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { findMetricDef, getMetricValue } from "@/lib/metaMetricCatalog";

interface Props {
  clientName: string;
  datePreset: string;
  /** Faixa de datas formatada (ex: "01/04 – 07/04"). */
  periodRange?: string;
  groups: FunnelGroup[];
  /** Funis manuais adicionados pelo usuário — apresentados como slides após os funis de campanha. */
  manualFunnels?: ManualFunnel[];
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
  /** Override de configuração de métricas por groupKey (usado em snapshots salvos). */
  groupConfigs?: Record<string, MetricsConfig>;
  /** Rótulos customizados de funis/campanhas vindos de snapshot salvo */
  funnelLabels?: Record<string, string>;
  /** Dados estáticos do Google Analytics para visualização pública offline */
  googleAnalyticsData?: any;
  /** Dados estáticos do Google Ads para visualização pública offline */
  googleAdsCampaigns?: any[];
}

type Slide =
  | { kind: "cover" }
  | { kind: "notes" }
  | { kind: "group"; group: FunnelGroup }
  | { kind: "manual"; manual: ManualFunnel }
  | { kind: "google-funnel" }
  | { kind: "google-ads" }
  | { kind: "google-ads-campaign"; campaign: any }
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
  clientName, datePreset, periodRange, groups, manualFunnels, blocks, whatWeDid, nextActions, currencySymbol = "R$", onClose, clientId, datePresetKey, publicMode, groupConfigs, funnelLabels, googleAnalyticsData, googleAdsCampaigns,
}: Props) {
  const { data: liveLabelMap } = useFunnelLabels(clientId);
  const resolvedLabels = funnelLabels || liveLabelMap || {};

  const { data: googleStatus } = useGoogleConnectionStatus(clientId && !googleAnalyticsData ? clientId : undefined);
  const isGoogleConnected = googleAnalyticsData ? true : (googleStatus?.connected === true);

  // Query Google Ads live data for Present Mode if live mode
  const { data: liveGaAdsData } = useGoogleAds(
    clientId && !googleAdsCampaigns ? clientId : undefined,
    datePresetKey || datePreset,
    isGoogleConnected && !googleAdsCampaigns
  );

  const rawGoogleAdsCampaigns = googleAdsCampaigns || liveGaAdsData?.campaigns || [];

  const campaignsList = useMemo(() => {
    return rawGoogleAdsCampaigns
      .filter((c) => c.cost > 0 || c.impressions > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [rawGoogleAdsCampaigns]);

  const slides = useMemo<Slide[]>(() => [
    { kind: "cover" },
    { kind: "notes" },
    ...groups.map(g => ({ kind: "group" as const, group: g })),
    ...(manualFunnels || []).map(m => ({ kind: "manual" as const, manual: m })),
    ...(campaignsList.length > 0 ? [
      { kind: "google-ads" as const },
      ...campaignsList.map(c => ({ kind: "google-ads-campaign" as const, campaign: c }))
    ] : []),
    { kind: "diagnostic", key: "positives", title: "O que foi positivo", emoji: "✅", accent: "from-green-500/20" },
    { kind: "diagnostic", key: "negatives", title: "O que foi negativo", emoji: "⚠️", accent: "from-red-500/20" },
    { kind: "diagnostic", key: "manager_actions", title: "Ações do gestor", emoji: "🛠️", accent: "from-blue-500/20" },
    { kind: "diagnostic", key: "client_requests", title: "Pedidos ao cliente", emoji: "🤝", accent: "from-amber-500/20" },
  ], [groups, manualFunnels, campaignsList]);

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
          {clientName} • {periodRange ? `${periodRange} (${datePreset})` : datePreset} • Slide {idx + 1} / {slides.length}
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
                <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">
                  {periodRange ? `Diagnóstico ${periodRange}` : "Diagnóstico Semanal"}
                </p>
                <h1 className="text-6xl md:text-7xl font-extrabold text-card-foreground mt-4">{clientName}</h1>
                <p className="text-2xl text-muted-foreground mt-4">
                  {periodRange ? `${datePreset} • ${periodRange}` : datePreset}
                </p>
                <p className="text-base text-muted-foreground mt-12">{groups.length} funil(s) / campanha(s) com investimento no período</p>
              </div>
            )}

            {slide.kind === "notes" && (
              <div className="space-y-8">
                <h2 className="text-4xl font-bold text-card-foreground">📝 Anotações da semana</h2>
                <div className="grid grid-cols-1 gap-6 max-w-3xl">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-primary">O que fizemos</h3>
                    <pre className="mt-3 whitespace-pre-wrap text-base text-card-foreground font-sans leading-relaxed">
                      {whatWeDid || "(sem anotações)"}
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
                overrideConfig={groupConfigs?.[slide.group.key]}
                resolvedLabels={resolvedLabels}
              />
            )}

            {slide.kind === "manual" && clientId && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary font-semibold">Funil manual</p>
                  <h2 className="text-4xl font-bold text-card-foreground mt-1">{slide.manual.label}</h2>
                </div>
                <FunnelPreviewCard
                  clientId={clientId}
                  funnelCode={slide.manual.code}
                  funnelLabel={slide.manual.label}
                  campaigns={[]}
                  currencySymbol={currencySymbol}
                  datePreset={datePresetKey || datePreset}
                  isManual
                  manualId={slide.manual.id}
                  readOnly
                  hideOpenDetail
                  onOpenDetail={() => {}}
                />
              </div>
            )}

            {slide.kind === "google-funnel" && (clientId || googleAnalyticsData) && (
              <GoogleFunnelSlide 
                clientId={clientId} 
                datePreset={datePresetKey || datePreset} 
                gaData={googleAnalyticsData}
              />
            )}

            {slide.kind === "google-ads" && (clientId || googleAdsCampaigns) && (
              <GoogleAdsCampaignsSlide
                clientId={clientId}
                datePreset={datePresetKey || datePreset}
                campaigns={googleAdsCampaigns}
                currencySymbol={currencySymbol}
              />
            )}

            {slide.kind === "google-ads-campaign" && (
              <GoogleAdsIndividualCampaignSlide
                campaign={slide.campaign}
                currencySymbol={currencySymbol}
                clientId={clientId}
                datePreset={datePresetKey || datePreset}
                overrideConfig={groupConfigs?.[`google-ads-${slide.campaign.id}`]}
                resolvedLabels={resolvedLabels}
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
  overrideConfig,
  resolvedLabels = {},
}: {
  group: FunnelGroup;
  currencySymbol: string;
  clientId?: string;
  datePreset: string;
  overrideConfig?: MetricsConfig;
  resolvedLabels?: Record<string, string>;
}) {
  const totals = aggregateCampaignMetrics(group.campaigns);
  const resultLabel =
    group.campaigns.find(c => c.primaryResultLabel)?.primaryResultLabel || "Resultados";

  const { config: liveConfig } = useDiagnosticMetricsConfig(clientId || "", datePreset, group.key);
  const config = overrideConfig || liveConfig;

  const renderMetricValue = (key: string): string =>
    formatMetricValue(key, getMetricValue(totals, key), currencySymbol);
  const metricLabel = (key: string) =>
    key === "conversions"
      ? resultLabel
      : findMetricDef(key)?.label || AVAILABLE_METRICS.find(m => m.key === key)?.label || key;
  const isHighlight = (key: string) => key === "spend" || key === "conversions";

  const displayTitle = useMemo(() => {
    if (group.isFunnel) {
      const code = extractFunnelCode(group.campaigns[0]?.name);
      return (code && resolvedLabels[code]) || group.key;
    } else {
      const campaignId = group.campaigns[0]?.id;
      return (campaignId && resolvedLabels[campaignId]) || group.key;
    }
  }, [group, resolvedLabels]);

  // Top 3 criativos do grupo
  const top = group.campaigns
    .flatMap(c => c.creatives.map(cr => ({ ...cr, _camp: resolvedLabels[c.id] || c.name })))
    .filter(cr => cr.spend > 0 || cr.impressions > 0)
    .sort((a, b) => (b.primaryResult ?? b.conversions) - (a.primaryResult ?? a.conversions))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          {group.isFunnel ? "Funil" : "Campanha"}
        </p>
        <h2 className="text-4xl font-bold text-card-foreground mt-1">{displayTitle}</h2>
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

function GoogleFunnelSlide({ clientId, datePreset, gaData }: { clientId?: string; datePreset?: string; gaData?: any }) {
  const { data: ga, isLoading } = useGoogleAnalytics(
    clientId && !gaData ? clientId : undefined, 
    datePreset && !gaData ? datePreset : undefined, 
    !gaData
  );

  const finalGa = gaData || ga;
  const overview = finalGa?.overview;
  const events = finalGa?.events || [];

  if (!overview) {
    return (
      <div className="h-full flex items-center justify-center py-16">
        <p className="text-lg text-muted-foreground italic">Nenhum dado do Google Analytics disponível para este período.</p>
      </div>
    );
  }

  const pageViews = overview.pageViews || 0;
  const sessions = overview.sessions || 0;
  const engaged = overview.engagedSessions || 0;

  const viewToSession = pageViews > 0 ? (sessions / pageViews) * 100 : 0;
  const sessionToEngaged = sessions > 0 ? (engaged / sessions) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
          <Globe className="h-4 w-4" /> Google Analytics (GA4)
        </p>
        <h2 className="text-4xl font-bold text-card-foreground mt-1">Funil de Acessos & Conversão</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Visualização de Funil */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Jornada do Usuário</h3>
          
          {/* Step 1: Page Views */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-card-foreground">1. Visualizações de Página (Pageviews)</span>
              <span className="text-primary text-lg font-bold">{pageViews.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-9 w-full bg-muted/40 rounded-xl overflow-hidden border border-border relative flex items-center px-4">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-xl transition-all" 
                style={{ width: "100%" }}
              />
              <span className="relative text-xs text-muted-foreground font-semibold z-10">Base Total de Visualizações</span>
            </div>
          </div>

          {/* Conversão Rate 1 */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Conversão em Sessão:</span>
            <span className="text-primary font-bold text-sm">{viewToSession.toFixed(1)}%</span>
            <ArrowRight className="h-3 w-3" />
          </div>

          {/* Step 2: Sessions */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-card-foreground">2. Sessões Totais</span>
              <span className="text-primary text-lg font-bold">{sessions.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-9 w-full bg-muted/40 rounded-xl overflow-hidden border border-border relative flex items-center px-4">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-xl transition-all" 
                style={{ width: `${Math.min(100, Math.max(5, viewToSession))}%` }}
              />
              <span className="relative text-xs text-muted-foreground font-semibold z-10">Visitas únicas ao site</span>
            </div>
          </div>

          {/* Conversão Rate 2 */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
            <span>Taxa de Engajamento:</span>
            <span className="text-primary font-bold text-sm">{sessionToEngaged.toFixed(1)}%</span>
            <ArrowRight className="h-3 w-3" />
          </div>

          {/* Step 3: Engaged Sessions */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-card-foreground">3. Sessões Engajadas</span>
              <span className="text-primary text-lg font-bold">{engaged.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-9 w-full bg-muted/40 rounded-xl overflow-hidden border border-border relative flex items-center px-4">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-xl transition-all" 
                style={{ width: `${Math.min(100, Math.max(5, (engaged / pageViews) * 100))}%` }}
              />
              <span className="relative text-xs text-muted-foreground font-semibold z-10">Sessões com interação real</span>
            </div>
          </div>
        </div>

        {/* Conversões/Eventos do Google */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-card-foreground uppercase tracking-wider">Ações de Conversão (Eventos)</h3>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">Nenhum evento registrado no período.</p>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {events.slice(0, 8).map((evt) => {
                const isConversion = ["generate_lead", "lead", "purchase", "contact", "whatsapp_click", "click"].includes(evt.name.toLowerCase());
                
                return (
                  <div 
                    key={evt.name} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-sm transition-colors ${
                      isConversion 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-background border-border/80"
                    }`}
                  >
                    <span className="font-semibold text-card-foreground flex items-center gap-2">
                      {isConversion && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {evt.name}
                    </span>
                    <span className="font-mono font-bold text-primary text-base">{evt.count.toLocaleString("pt-BR")}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground leading-normal">
            Exibindo os principais eventos detectados nas páginas do cliente.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleAdsCampaignsSlide({
  clientId,
  datePreset,
  campaigns,
  currencySymbol = "R$",
}: {
  clientId?: string;
  datePreset?: string;
  campaigns?: any[];
  currencySymbol?: string;
}) {
  const { data: status } = useGoogleConnectionStatus(
    clientId && !campaigns ? clientId : undefined
  );
  const isConnected = campaigns ? true : status?.connected === true;

  const { data: liveData, isLoading } = useGoogleAds(
    clientId && !campaigns ? clientId : undefined,
    datePreset,
    isConnected && !campaigns
  );

  const rawCampaigns = campaigns || liveData?.campaigns || [];

  const campaignsList = useMemo(() => {
    return rawCampaigns
      .filter((c) => c.cost > 0 || c.impressions > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [rawCampaigns]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center py-16 gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-semibold">Carregando Campanhas do Google Ads...</span>
      </div>
    );
  }

  if (campaignsList.length === 0) {
    return (
      <div className="h-full flex items-center justify-center py-16">
        <p className="text-lg text-muted-foreground italic">Nenhuma campanha do Google Ads disponível para este período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4" /> Google Ads
        </p>
        <h2 className="text-4xl font-bold text-card-foreground mt-1">Desempenho das Campanhas</h2>
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Campanha</th>
                <th className="text-right px-4 py-3 font-semibold">Investimento</th>
                <th className="text-right px-4 py-3 font-semibold">Cliques</th>
                <th className="text-right px-4 py-3 font-semibold">CTR</th>
                <th className="text-right px-4 py-3 font-semibold">Conversões</th>
                <th className="text-right px-4 py-3 font-semibold">CPA</th>
                <th className="text-right px-4 py-3 font-semibold">ROAS</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaignsList.map((c) => {
                const cpa = c.conversions > 0 ? c.cost / c.conversions : 0;
                const ctr = c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0);
                const roas = c.cost > 0 ? c.revenue / c.cost : 0;
                const isStatusActive = c.status?.toLowerCase() === "enabled" || c.status?.toLowerCase() === "active";

                return (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 text-card-foreground font-semibold truncate max-w-[280px]" title={c.name}>
                      {c.name}
                    </td>
                    <td className="px-4 py-4 text-right text-card-foreground font-mono font-medium">
                      {formatCurrency(c.cost, currencySymbol)}
                    </td>
                    <td className="px-4 py-4 text-right text-card-foreground font-mono font-medium">
                      {c.clicks.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 text-right text-card-foreground font-mono font-medium">
                      {ctr.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-right text-primary font-bold font-mono">
                      {c.conversions.toFixed(0)}
                    </td>
                    <td className="px-4 py-4 text-right text-card-foreground font-mono font-medium">
                      {cpa > 0 ? formatCurrency(cpa, currencySymbol) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-card-foreground font-mono font-medium">
                      {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                          isStatusActive
                            ? "bg-green-500/15 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isStatusActive ? (
                          <>
                            <Play className="h-2 w-2 fill-green-500" /> Ativa
                          </>
                        ) : (
                          <>
                            <Pause className="h-2 w-2 fill-muted-foreground" /> Pausada
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GoogleAdsIndividualCampaignSlide({
  campaign,
  currencySymbol,
  clientId,
  datePreset,
  overrideConfig,
  resolvedLabels = {},
}: {
  campaign: any;
  currencySymbol: string;
  clientId?: string;
  datePreset: string;
  overrideConfig?: MetricsConfig;
  resolvedLabels?: Record<string, string>;
}) {
  const groupKey = `google-ads-${campaign.id}`;
  
  // Custom metrics config
  const { config: liveConfig } = useDiagnosticMetricsConfig(
    clientId || "",
    datePreset,
    groupKey
  );
  
  const config = overrideConfig || liveConfig;
  const customCampaignName = resolvedLabels[groupKey] || campaign.name;

  const getMetricValueAndOverride = (key: string) => {
    const override = config.custom_metrics.find((m) => m.id === key);
    const isOverridden = !!override;

    let originalRaw = 0;
    if (key === "spend" || key === "cost") originalRaw = campaign.cost;
    else if (key === "conversions") originalRaw = campaign.conversions;
    else if (key === "clicks") originalRaw = campaign.clicks;
    else if (key === "impressions") originalRaw = campaign.impressions;
    else if (key === "ctr") originalRaw = campaign.ctr || (campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0);
    else if (key === "avgCpc" || key === "cpc") originalRaw = campaign.avgCpc;
    else if (key === "cpa") originalRaw = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
    else if (key === "roas") originalRaw = campaign.cost > 0 ? campaign.revenue / campaign.cost : 0;
    else if (key === "revenue" || key === "purchaseValue") originalRaw = campaign.revenue;

    const rawValue = isOverridden ? Number(String(override.value).replace(",", ".")) : originalRaw;

    const formatValue = (val: number) => {
      if (["spend", "cost", "avgCpc", "cpc", "cpa", "revenue", "purchaseValue"].includes(key)) {
        return `${currencySymbol} ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (key === "ctr") return `${val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
      if (key === "roas") return `${val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
      if (["impressions", "clicks"].includes(key)) return val.toLocaleString("pt-BR");
      return val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    };

    return {
      value: isOverridden ? (override.format === "text" ? override.value : formatValue(rawValue)) : formatValue(originalRaw),
      isOverridden,
    };
  };

  const getMetricLabel = (key: string): string => {
    if (key === "spend" || key === "cost") return "Investimento";
    if (key === "conversions") return "Conversões";
    if (key === "clicks") return "Cliques";
    if (key === "impressions") return "Impressões";
    if (key === "ctr") return "CTR";
    if (key === "avgCpc" || key === "cpc") return "CPC Médio";
    if (key === "cpa") return "CPA";
    if (key === "roas") return "ROAS";
    return key;
  };

  const isHighlight = (key: string) => key === "spend" || key === "conversions";

  const getMatchTypeName = (type: string) => {
    switch (type?.toUpperCase()) {
      case "EXACT": return "[Exata]";
      case "PHRASE": return '"Frase"';
      default: return "Ampla";
    }
  };

  const getMatchTypeClass = (type: string) => {
    switch (type?.toUpperCase()) {
      case "EXACT": return "border-blue-500/25 bg-blue-500/10 text-blue-500";
      case "PHRASE": return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
      default: return "border-slate-500/25 bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4" /> Google Ads • {campaign.type}
        </p>
        <h2 className="text-4xl font-bold text-card-foreground mt-1">{customCampaignName}</h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {config.visible_metrics.map((key) => {
          const { value, isOverridden } = getMetricValueAndOverride(key);
          return (
            <BigKpi
              key={key}
              label={getMetricLabel(key)}
              value={value}
              highlight={isHighlight(key)}
              custom={isOverridden}
            />
          );
        })}

        {/* Custom manual metrics */}
        {config.custom_metrics
          .filter((m) => !["spend", "cost", "conversions", "clicks", "impressions", "ctr", "avgCpc", "cpc", "cpa", "roas", "revenue", "purchaseValue"].includes(m.id))
          .map((m) => (
            <BigKpi
              key={m.id}
              label={m.label}
              value={formatCustomValue(m, currencySymbol)}
              custom
            />
          ))}
      </div>

      {/* Conversões Breakdown */}
      {campaign.conversionsBreakdown && campaign.conversionsBreakdown.length > 0 && (() => {
        const getConversionBadgeStyle = (category: string, name: string) => {
          const cat = (category || "").toUpperCase();
          const nm = (name || "").toLowerCase();
          if (cat === "PURCHASE" || nm.includes("compra") || nm.includes("venda") || nm.includes("purchase")) {
            return "bg-purple-500/10 border-purple-500/25 text-purple-400";
          }
          if (cat === "LEAD" || cat === "SUBMIT_LEAD_FORM" || nm.includes("lead") || nm.includes("cadastro") || nm.includes("form")) {
            return "bg-sky-500/10 border-sky-500/25 text-sky-400";
          }
          if (cat === "CONTACT" || nm.includes("contato") || nm.includes("whatsapp") || nm.includes("click") || nm.includes("chamar")) {
            return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
          }
          return "bg-primary/5 border-primary/20 text-muted-foreground";
        };

        return (
          <div className="mt-4 p-3 rounded-xl border border-border bg-muted/5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Detalhe das Ações de Conversão
            </h4>
            <div className="flex flex-wrap gap-2">
              {campaign.conversionsBreakdown.map((cb: any, idx: number) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold transition-all ${getConversionBadgeStyle(cb.category, cb.name)}`}
                >
                  <span>{cb.name}</span>
                  <span className="font-bold border-l border-current/25 pl-1.5 ml-0.5">{cb.count.toLocaleString("pt-BR")}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Keywords or creatives details */}
      <div className="mt-8 pt-6 border-t border-border">
        {campaign.type === "SEARCH" && campaign.keywords && campaign.keywords.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Top Palavras-Chave de Busca
            </h3>
            <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5">Palavra-Chave</th>
                    <th className="text-center px-4 py-2.5 w-28">Correspondência</th>
                    <th className="text-right px-4 py-2.5">Investimento</th>
                    <th className="text-right px-4 py-2.5">Cliques</th>
                    <th className="text-right px-4 py-2.5">CTR</th>
                    <th className="text-right px-4 py-2.5">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.keywords.slice(0, 5).map((kw: any, idx: number) => {
                    const kwCtr = kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0;
                    return (
                      <tr key={idx} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-2.5 text-card-foreground font-semibold font-mono">{kw.text}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${getMatchTypeClass(kw.matchType)}`}>
                            {getMatchTypeName(kw.matchType)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{fmtMoney(kw.cost, currencySymbol)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{kw.clicks.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{kwCtr.toFixed(2)}%</td>
                        <td className="px-4 py-2.5 text-right text-primary font-bold font-mono">{kw.conversions.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {campaign.creatives && campaign.creatives.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Top Criativos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {campaign.creatives.slice(0, 6).map((creative: any) => {
                const isVideo = !!creative.youtubeVideoId;
                const imageUrl = isVideo
                  ? `https://img.youtube.com/vi/${creative.youtubeVideoId}/hqdefault.jpg`
                  : creative.imageUrl;

                return (
                  <div key={creative.id} className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
                    <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = `https://picsum.photos/seed/${creative.id}/300/300`;
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}

                      <span className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white backdrop-blur-sm border border-white/10 shrink-0">
                        {isVideo ? <Video className="h-3.5 w-3.5 text-red-500 fill-red-500" /> : <ImageIcon className="h-3.5 w-3.5 text-primary" />}
                      </span>

                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-[11px] text-white">
                        <div className="font-semibold truncate mb-1 text-white">{creative.name}</div>
                        <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
                          <span className="text-white/60">Custo</span>
                          <span className="font-mono">{fmtMoney(creative.cost, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-0.5 mb-0.5">
                          <span className="text-white/60">Cliques</span>
                          <span className="font-mono">{creative.clicks.toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Conversões</span>
                          <span className="text-primary font-bold font-mono">{creative.conversions.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="text-[11px] font-bold text-muted-foreground truncate" title={creative.name}>
                        {creative.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between">
                        <span>Conv: <span className="font-bold text-primary">{creative.conversions.toFixed(0)}</span></span>
                        {isVideo && (
                          <span className="text-red-500 font-semibold flex items-center gap-0.5">Vídeo</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
