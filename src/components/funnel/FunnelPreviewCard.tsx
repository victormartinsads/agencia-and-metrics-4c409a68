import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Pencil, Check, X, ArrowRight, DollarSign, TrendingUp, Target, ShoppingCart, Users,
  Settings2, MousePointerClick, Eye, BarChart3, Percent, Activity, UserPlus, Plus, Trash2,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Campaign } from "@/data/mockMetaData";
import { aggregateCampaignMetrics } from "@/lib/metaMetrics";
import { formatCurrency } from "@/lib/format";
import { EditableKpiCell } from "@/components/funnel/EditableKpiCell";
import {
  useFunnelLabels, useSaveFunnelLabel,
} from "@/hooks/useFunnelLabels";
import { useFunnelLeadMapping } from "@/hooks/useFunnelLeadMapping";
import {
  useFunnelPeriodMetrics,
  useSaveFunnelPeriodMetric,
  presetToRange,
} from "@/hooks/useFunnelPeriodMetrics";
import { useUpdateManualFunnel, useDeleteManualFunnel } from "@/hooks/useManualFunnels";
import { toast } from "sonner";
import { META_METRIC_CATALOG, getMetricValue, resolveMetricKey } from "@/lib/metaMetricCatalog";
import { useFunnelCardConfig, useSaveFunnelCardConfig, defaultMetricsFor } from "@/hooks/useFunnelCardConfig";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol?: string;
  readOnly?: boolean;
  onOpenDetail: () => void;
  datePreset?: string;
  /** When true, no Meta auto-values are computed; everything comes from manual overrides. */
  isManual?: boolean;
  /** ID of the manual funnel row, used for rename/delete. */
  manualId?: string;
  /** When true, hides the "Análise completa" button (used when embedded inside the dialog). */
  hideOpenDetail?: boolean;
}

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString("pt-BR");
}

const DEFAULT_KPIS = ["spend", "revenue", "roas", "sales", "leads"];

/**
 * Presets de visualização por tipo de funil (detectado pelo label/código).
 * Aplicados apenas quando o usuário ainda não personalizou (sem localStorage).
 * Usuário continua livre para editar e a escolha é persistida.
 */
function detectFunnelPreset(label: string, code: string): string[] | null {
  const l = `${label || ""} ${code || ""}`.toLowerCase();
  if (/corredor\s*japon/.test(l)) {
    return ["spend", "impressions", "thruplays"];
  }
  if (/capta[cç][aã]o|seguidor/.test(l)) {
    return ["spend", "reach", "profileVisits"];
  }
  if (/low\s*ticket|medium\s*ticket|mid\s*ticket|high\s*ticket|\bticket\b/.test(l)) {
    return ["spend", "reach", "clicks", "landingPageViews", "initiateCheckout", "purchases", "leads"];
  }
  if (/formul[áa]rio\s*nativo|sess[aã]o\s*estrat[ée]gica|sess[aã]o\s*estrategica/.test(l)) {
    if (/site|p[áa]gina|landing|\blp\b|lead.*site/.test(l)) {
      return ["spend", "reach", "linkClicks", "landingPageViews", "leads"];
    }
    return ["spend", "reach", "linkClicks", "leads"];
  }
  return null;
}

const MAX_VISIBLE_KPIS = 8;

type Format = "currency" | "number" | "percent" | "multiplier";
interface MetricSpec {
  key: string;
  label: string;
  format: Format;
  icon: JSX.Element;
  sub?: string;
  emphasis?: boolean;
  /** Whether the value comes from a manual override. */
  isManualOverride: boolean;
  /** Raw numeric value. */
  value: number;
  /** Whether this is a fully user-added (custom) metric. */
  isCustom?: boolean;
}

function formatValue(v: number, fmt: Format, currencySymbol: string, blankWhenZero = false) {
  if (blankWhenZero && (!v || v === 0)) return "—";
  switch (fmt) {
    case "currency": return formatCurrency(v, currencySymbol);
    case "percent":  return `${v.toFixed(2)}%`;
    case "multiplier": return `${v.toFixed(2)}x`;
    default: return compact(v);
  }
}

export function FunnelPreviewCard({
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol = "R$",
  readOnly = false,
  onOpenDetail,
  datePreset,
  isManual = false,
  manualId,
  hideOpenDetail = false,
}: Props) {
  const { data: labelMap } = useFunnelLabels(clientId);
  const saveLabel = useSaveFunnelLabel();
  const { data: leadMap } = useFunnelLeadMapping(clientId);
  const { data: periodMetrics } = useFunnelPeriodMetrics(clientId, funnelCode, datePreset);
  const saveMetric = useSaveFunnelPeriodMetric();
  const updateManual = useUpdateManualFunnel();
  const deleteManual = useDeleteManualFunnel();

  const leadActionTypes = leadMap?.[funnelCode] || [];
  const totals = isManual
    ? { spend: 0, purchaseValue: 0, purchases: 0, leads: 0, conversions: 0, impressions: 0, clicks: 0 } as any
    : aggregateCampaignMetrics(campaigns, { leadActionTypes });

  const baseLabel = (labelMap?.[funnelCode] || funnelLabel || funnelCode).replace(/^F\d+\s*[\-—]\s*/, "");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(baseLabel);
  useEffect(() => setDraft(baseLabel), [baseLabel]);

  // ---------- helpers to read overrides ----------
  const overrideMap = useMemo(() => {
    const m: Record<string, { value: number; label: string }> = {};
    for (const r of periodMetrics || []) {
      m[r.metric_key] = { value: Number(r.metric_value) || 0, label: r.metric_label || r.metric_key };
    }
    return m;
  }, [periodMetrics]);

  const getOverride = (key: string) => overrideMap[key];
  const resolve = (key: string, auto: number) => {
    const o = getOverride(key);
    return o ? { value: o.value, isManualOverride: true } : { value: auto, isManualOverride: false };
  };

  // ---------- base metric values ----------
  const spendR = resolve("spend", totals.spend || 0);
  const revenueR = resolve("revenue", totals.purchaseValue || 0);
  const salesR = resolve("sales", totals.purchases || 0);
  const leadsR = resolve("leads", totals.leads || totals.conversions || 0);
  const impressionsR = resolve("impressions", (totals as any).impressions || 0);
  const clicksR = resolve("clicks", (totals as any).clicks || 0);
  const followersR = resolve("followers", 0);

  // derived (allow override too)
  const spend = spendR.value, revenue = revenueR.value, sales = salesR.value, leads = leadsR.value;
  const impressions = impressionsR.value, clicks = clicksR.value, followers = followersR.value;

  const autoRoas = spend > 0 ? revenue / spend : 0;
  const autoCtr  = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const autoCpc  = clicks > 0 ? spend / clicks : 0;
  const autoCpm  = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const autoCpl  = leads > 0 ? spend / leads : 0;
  const autoCpa  = sales > 0 ? spend / sales : 0;
  const autoCps  = followers > 0 ? spend / followers : 0;

  const roasR = resolve("roas", autoRoas);
  const ctrR  = resolve("ctr",  autoCtr);
  const cpcR  = resolve("cpc",  autoCpc);
  const cpmR  = resolve("cpm",  autoCpm);
  const cplR  = resolve("cpl",  autoCpl);
  const cpaR  = resolve("cpa",  autoCpa);
  const cpsR  = resolve("cps",  autoCps);

  const isCaptacao = funnelCode === "F1";

  const KPI_CATALOG: Record<string, MetricSpec> = {
    spend:       { key: "spend", label: "Investimento", format: "currency", value: spend, isManualOverride: spendR.isManualOverride, sub: "vs. período anterior", icon: <DollarSign className="h-3 w-3" /> },
    revenue:     { key: "revenue", label: "Faturamento", format: "currency", value: revenue, isManualOverride: revenueR.isManualOverride, emphasis: true, sub: "vs. período anterior", icon: <TrendingUp className="h-3 w-3" /> },
    roas:        { key: "roas", label: "ROAS", format: "multiplier", value: roasR.value, isManualOverride: roasR.isManualOverride, sub: "Meta: 3.5x", icon: <Target className="h-3 w-3" /> },
    sales:       { key: "sales", label: "Vendas", format: "number", value: sales, isManualOverride: salesR.isManualOverride, sub: cpaR.value > 0 ? `CPV ${formatCurrency(cpaR.value, currencySymbol)}` : "—", icon: <ShoppingCart className="h-3 w-3" /> },
    leads:       { key: "leads", label: "Leads", format: "number", value: leads, isManualOverride: leadsR.isManualOverride, sub: cplR.value > 0 ? `CPL ${formatCurrency(cplR.value, currencySymbol)}` : undefined, icon: <Users className="h-3 w-3" /> },
    impressions: { key: "impressions", label: "Impressões", format: "number", value: impressions, isManualOverride: impressionsR.isManualOverride, icon: <Eye className="h-3 w-3" /> },
    clicks:      { key: "clicks", label: "Cliques", format: "number", value: clicks, isManualOverride: clicksR.isManualOverride, icon: <MousePointerClick className="h-3 w-3" /> },
    ctr:         { key: "ctr", label: "CTR", format: "percent", value: ctrR.value, isManualOverride: ctrR.isManualOverride, icon: <Percent className="h-3 w-3" /> },
    cpc:         { key: "cpc", label: "CPC", format: "currency", value: cpcR.value, isManualOverride: cpcR.isManualOverride, icon: <BarChart3 className="h-3 w-3" /> },
    cpm:         { key: "cpm", label: "CPM", format: "currency", value: cpmR.value, isManualOverride: cpmR.isManualOverride, icon: <Activity className="h-3 w-3" /> },
    cpa:         { key: "cpa", label: "CPA", format: "currency", value: cpaR.value, isManualOverride: cpaR.isManualOverride, icon: <Target className="h-3 w-3" /> },
    cpl:         { key: "cpl", label: "CPL", format: "currency", value: cplR.value, isManualOverride: cplR.isManualOverride, icon: <Users className="h-3 w-3" /> },
    followers:   { key: "followers", label: "Seguidores", format: "number", value: followers, isManualOverride: followersR.isManualOverride, sub: followers > 0 ? "input manual" : "sem input", icon: <UserPlus className="h-3 w-3" /> },
    cps:         { key: "cps", label: "Custo / Seguidor", format: "currency", value: cpsR.value, isManualOverride: cpsR.isManualOverride, emphasis: true, sub: followers > 0 ? `${compact(followers)} seguidores` : "defina seguidores", icon: <UserPlus className="h-3 w-3" /> },
  };

  // Custom user-added metrics (any periodMetric with key starting custom:)
  const customMetrics: MetricSpec[] = useMemo(() => {
    return (periodMetrics || [])
      .filter((m) => m.metric_key.startsWith("custom:"))
      .map((m) => ({
        key: m.metric_key,
        label: m.metric_label || m.metric_key.replace("custom:", ""),
        format: "number" as Format,
        value: Number(m.metric_value) || 0,
        isManualOverride: true,
        isCustom: true,
        icon: <Activity className="h-3 w-3" />,
      }));
  }, [periodMetrics]);

  const fullCatalog: Record<string, MetricSpec> = { ...KPI_CATALOG };
  for (const c of customMetrics) fullCatalog[c.key] = c;

  // Inclui TODAS as métricas Meta do catálogo unificado (vídeo, engajamento, etc.)
  // que ainda não estão presentes no KPI_CATALOG curado deste card.
  for (const def of META_METRIC_CATALOG) {
    if (fullCatalog[def.key]) continue;
    const auto = isManual ? 0 : getMetricValue(totals, def.key);
    const r = resolve(def.key, auto);
    const fmt: Format =
      def.format === "decimal" ? "number" : (def.format as Format);
    fullCatalog[def.key] = {
      key: def.key,
      label: def.label,
      format: fmt,
      value: r.value,
      isManualOverride: r.isManualOverride,
      icon: <Activity className="h-3 w-3" />,
    };
  }

  // ---------- visible selection ----------
  const storageKey = `funnel-preview-kpis:${clientId}:${funnelCode}`;
  const { data: dbConfigMap } = useFunnelCardConfig(clientId);
  const saveDbConfig = useSaveFunnelCardConfig();
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    if (isManual) return ["spend", "leads", "revenue", "roas"];
    return defaultMetricsFor(funnelCode);
  });
  // Hydrate from DB (funnel_card_config) once it loads — overrides localStorage/defaults.
  const [hydratedFromDb, setHydratedFromDb] = useState(false);
  useEffect(() => {
    if (hydratedFromDb) return;
    if (!dbConfigMap) return;
    const dbSel = dbConfigMap[funnelCode];
    if (dbSel && dbSel.length > 0) {
      setSelected(dbSel);
    }
    setHydratedFromDb(true);
  }, [dbConfigMap, funnelCode, hydratedFromDb]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch {}
    // Persist to DB so config survives across devices/deploys.
    if (hydratedFromDb && clientId && funnelCode) {
      saveDbConfig.mutate({ clientId, funnelCode, metrics: selected });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, selected, hydratedFromDb]);

  // Auto-include any custom metric not yet in selection
  useEffect(() => {
    if (!customMetrics.length) return;
    setSelected((prev) => {
      const next = [...prev];
      for (const c of customMetrics) if (!next.includes(c.key)) next.push(c.key);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customMetrics.length]);

  const visibleKeys = useMemo(() => {
    const base = selected.filter((k) => fullCatalog[k]);
    return base.slice(0, MAX_VISIBLE_KPIS);
  }, [selected, fullCatalog]);

  const toggleKpi = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_VISIBLE_KPIS) { toast.info(`Máximo de ${MAX_VISIBLE_KPIS} métricas`); return prev; }
      return [...prev, key];
    });
  };

  const moveKpi = (key: string, dir: -1 | 1) => {
    setSelected((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // ---------- label save ----------
  const onSaveLabel = async () => {
    const v = draft.trim();
    if (!v) return;
    try {
      if (isManual && manualId) {
        await updateManual.mutateAsync({ id: manualId, client_id: clientId, label: v });
      } else {
        await saveLabel.mutateAsync({ clientId, funnelCode, label: v });
      }
      toast.success("Nome do funil salvo");
      setEditing(false);
    } catch { toast.error("Erro ao salvar nome"); }
  };

  // ---------- add custom metric ----------
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const handleAddCustom = async () => {
    const name = newName.trim();
    if (!name) { toast.error("Informe um nome"); return; }
    const v = Number(String(newValue).replace(",", "."));
    if (!Number.isFinite(v)) { toast.error("Valor inválido"); return; }
    if (!datePreset) return;
    const range = presetToRange(datePreset);
    const key = `custom:${name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}`;
    try {
      await saveMetric.mutateAsync({
        client_id: clientId,
        funnel_code: funnelCode,
        metric_key: key,
        metric_label: name,
        metric_value: v,
        period_start: range.start,
        period_end: range.end,
        source: "manual_custom",
      });
      toast.success("Métrica adicionada");
      setNewName(""); setNewValue("");
      setSelected((prev) => prev.includes(key) ? prev : [...prev, key]);
    } catch { toast.error("Erro ao adicionar métrica"); }
  };

  // ---------- delete manual funnel ----------
  const handleDeleteManual = async () => {
    if (!manualId) return;
    if (!confirm("Remover este funil manual? Os valores salvos serão mantidos no histórico.")) return;
    try {
      await deleteManual.mutateAsync({ id: manualId, client_id: clientId });
      toast.success("Funil removido");
    } catch { toast.error("Erro ao remover"); }
  };

  const visible = visibleKeys;
  const gridCols = visible.length >= 5 ? "lg:grid-cols-5" : visible.length === 4 ? "lg:grid-cols-4" : visible.length === 3 ? "lg:grid-cols-3" : visible.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-6";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border/60 overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-primary/40 text-primary">
            {funnelCode}
          </span>
          {isManual && (
            <span className="text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
              Manual
            </span>
          )}
          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                autoFocus value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveLabel();
                  if (e.key === "Escape") { setDraft(baseLabel); setEditing(false); }
                }}
                className="h-7 text-sm flex-1 max-w-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSaveLabel}>
                <Check className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDraft(baseLabel); setEditing(false); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold uppercase tracking-[0.06em] truncate"
                  style={{ fontFamily: "'Syne', system-ui, sans-serif" }} title={baseLabel}>
                {baseLabel}
              </h3>
              {!readOnly && (
                <button className="text-muted-foreground hover:text-primary p-1 rounded" onClick={() => setEditing(true)} title="Renomear funil">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
            {isManual ? "manual" : `${campaigns.length} campanha${campaigns.length !== 1 ? "s" : ""}`}
          </span>
          {!readOnly && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Escolher / adicionar métricas">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Métricas visíveis ({visibleKeys.length}/6)
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {(() => {
                    const selectedOrdered = selected.filter((k) => fullCatalog[k]);
                    const unselected = Object.keys(fullCatalog).filter((k) => !selected.includes(k));
                    return (
                      <>
                        {selectedOrdered.map((key, idx) => {
                          const cfg = fullCatalog[key];
                          return (
                            <div key={key} className="flex items-center gap-1 py-0.5 text-xs">
                              <Checkbox checked onCheckedChange={() => toggleKpi(key)} />
                              <span className="flex-1 truncate">{cfg.label}</span>
                              {cfg.isCustom && (
                                <span className="text-[9px] uppercase text-primary/80">custom</span>
                              )}
                              <button
                                className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                disabled={idx === 0}
                                onClick={() => moveKpi(key, -1)}
                                title="Mover para cima"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                disabled={idx === selectedOrdered.length - 1}
                                onClick={() => moveKpi(key, 1)}
                                title="Mover para baixo"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                        {unselected.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-border/60">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">
                              Disponíveis
                            </p>
                            {unselected.map((key) => {
                              const cfg = fullCatalog[key];
                              return (
                                <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 text-xs">
                                  <Checkbox checked={false} onCheckedChange={() => toggleKpi(key)} />
                                  <span className="flex-1 truncate">{cfg.label}</span>
                                  {cfg.isCustom && (
                                    <span className="text-[9px] uppercase text-primary/80">custom</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Adicionar métrica personalizada
                  </p>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome (ex.: Inscritos)" className="h-7 text-xs" />
                  <Input type="number" step="0.01" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Valor" className="h-7 text-xs" />
                  <Button size="sm" onClick={handleAddCustom} disabled={saveMetric.isPending} className="w-full h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">1 a 6 métricas visíveis. Valores ligados ao período selecionado.</p>
              </PopoverContent>
            </Popover>
          )}
          {isManual && manualId && !readOnly && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover funil manual" onClick={handleDeleteManual}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {!hideOpenDetail && (
          <Button
            size="sm" variant="outline"
            className="h-7 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={onOpenDetail}
          >
            Análise completa <ArrowRight className="h-3 w-3" />
          </Button>)}
        </div>
      </header>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridCols} gap-3 p-4`}>
        {visible.map((key) => {
          const cfg = fullCatalog[key];
          if (!cfg) return null;
          const display = formatValue(cfg.value, cfg.format, currencySymbol, isManual && !cfg.isManualOverride);
          return (
            <EditableKpiCell
              key={key}
              clientId={clientId}
              funnelCode={funnelCode}
              metricKey={cfg.key}
              metricLabel={cfg.label}
              displayLabel={cfg.label}
              displayValue={display}
              sub={cfg.sub}
              icon={cfg.icon}
              emphasis={cfg.emphasis}
              rawValue={cfg.value}
              isManualOverride={cfg.isManualOverride}
              isCustomMetric={cfg.isCustom}
              onCustomRemoved={() => setSelected((p) => p.filter((k) => k !== cfg.key))}
              datePreset={datePreset}
              readOnly={readOnly}
            />
          );
        })}
      </div>
    </motion.section>
  );
}