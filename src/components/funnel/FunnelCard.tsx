import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Campaign, Creative } from "@/data/mockMetaData";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Settings2,
  NotebookPen,
  ChevronRight,
  TrendingUp,
  LineChart as LineChartIcon,
  Trophy,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_FUNNEL_METRICS,
  defaultMetricsFor,
  useFunnelCardConfig,
  useSaveFunnelCardConfig,
} from "@/hooks/useFunnelCardConfig";
import {
  useFunnelManualMetrics,
  useSaveManualMetric,
  useDeleteManualMetric,
  formatManualMetric,
  type ManualMetric,
  type ManualMetricFormat,
} from "@/hooks/useFunnelManualMetrics";
import { FunnelNotesPanel } from "./FunnelNotesPanel";
import { FunnelDetailDialog } from "./FunnelDetailDialog";
import { FunnelComparisonDialog } from "./FunnelComparisonDialog";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { formatCurrency } from "@/lib/format";
import { useFunnelTemplateGlobal } from "@/hooks/useFunnelTemplateGlobal";
import {
  useFunnelLeadMapping,
  useSaveFunnelLeadMapping,
  LEAD_ACTION_CATALOG,
} from "@/hooks/useFunnelLeadMapping";
import {
  useFunnelFollowMapping,
  useSaveFunnelFollowMapping,
  FOLLOW_ACTION_CATALOG,
} from "@/hooks/useFunnelFollowMapping";
import {
  useFunnelMetricOverrides,
  useSaveFunnelMetricOverride,
  useDeleteFunnelMetricOverride,
} from "@/hooks/useFunnelMetricOverrides";
import { useMetaCustomConversions } from "@/hooks/useMetaCustomConversions";
import { Tag, UserPlus, RotateCcw } from "lucide-react";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol: string;
  datePreset: string;
  readOnly?: boolean;
}

interface CreativeRow extends Creative {
  campaignName: string;
}

function topCreatives(campaigns: Campaign[], limit = 3): CreativeRow[] {
  const all: CreativeRow[] = [];
  for (const c of campaigns) {
    for (const cr of c.creatives || []) {
      all.push({ ...cr, campaignName: c.name });
    }
  }
  // Rank by primaryResult or conversions volume; tiebreak by ROAS desc
  return all
    .sort((a, b) => {
      const ra = (a.primaryResult ?? a.conversions) || 0;
      const rb = (b.primaryResult ?? b.conversions) || 0;
      if (rb !== ra) return rb - ra;
      return (b.roas || 0) - (a.roas || 0);
    })
    .slice(0, limit);
}

export function FunnelCard({
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol,
  datePreset,
  readOnly = false,
}: Props) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openComparison, setOpenComparison] = useState(false);
  const [showCreatives, setShowCreatives] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [openLeadMap, setOpenLeadMap] = useState(false);
  const [openFollowMap, setOpenFollowMap] = useState(false);
  const [editingMetric, setEditingMetric] = useState<{
    key: string;
    label: string;
    value: string;
  } | null>(null);
  const [manualDraft, setManualDraft] = useState<{
    id?: string;
    metric_label: string;
    metric_value: number;
    metric_format: ManualMetricFormat;
  }>({ metric_label: "", metric_value: 0, metric_format: "number" });

  const { data: configMap } = useFunnelCardConfig(clientId);
  const saveCfg = useSaveFunnelCardConfig();
  const { data: globalMap } = useFunnelTemplateGlobal();
  const { data: leadMap } = useFunnelLeadMapping(clientId);
  const saveLeadMap = useSaveFunnelLeadMapping();
  const { data: followMap } = useFunnelFollowMapping(clientId);
  const saveFollowMap = useSaveFunnelFollowMapping();
  const { data: overridesMap } = useFunnelMetricOverrides(clientId);
  const saveOverride = useSaveFunnelMetricOverride();
  const deleteOverride = useDeleteFunnelMetricOverride();
  const overrides = overridesMap?.[funnelCode] || {};
  const { data: customConversions } = useMetaCustomConversions(
    openLeadMap || openFollowMap ? clientId : undefined,
  );
  const { data: manualMap } = useFunnelManualMetrics(clientId);
  const saveManual = useSaveManualMetric();
  const deleteManual = useDeleteManualMetric();
  const manualMetrics: ManualMetric[] = manualMap?.[funnelCode] || [];

  const leadActionTypes = leadMap?.[funnelCode] || [];
  const followActionTypes = followMap?.[funnelCode] || [];
  const totals = useMemo(
    () => aggregateCampaignMetrics(campaigns, { leadActionTypes, followActionTypes }),
    [campaigns, leadActionTypes.join(","), followActionTypes.join(",")],
  );
  const analysis = useFunnelAnalysis(campaigns);
  const top3 = useMemo(() => topCreatives(campaigns, 3), [campaigns]);

  // Priority: client override > global template > hardcoded default
  const selected =
    configMap?.[funnelCode] ||
    globalMap?.[funnelCode] ||
    defaultMetricsFor(funnelCode);

  const [draftLeadTypes, setDraftLeadTypes] = useState<string[]>(leadActionTypes);
  useMemo(() => setDraftLeadTypes(leadActionTypes), [leadActionTypes.join(",")]);
  const [draftFollowTypes, setDraftFollowTypes] = useState<string[]>(followActionTypes);
  useMemo(() => setDraftFollowTypes(followActionTypes), [followActionTypes.join(",")]);

  const [draft, setDraft] = useState<string[]>(selected);
  useMemo(() => setDraft(selected), [selected.join(",")]);

  const cleanLabel = funnelLabel.replace(/^F\d+\s*[\-—]\s*/, "");

  // Group metrics by category for the picker
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, typeof ALL_FUNNEL_METRICS> = {};
    for (const m of ALL_FUNNEL_METRICS) {
      const g = m.group || "outros";
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }
    return groups;
  }, []);

  const groupLabels: Record<string, string> = {
    performance: "Performance",
    alcance: "Alcance",
    trafego: "Tráfego",
    engajamento: "Engajamento",
    video: "Vídeo",
    leads: "Leads / Conversões",
    vendas: "Vendas",
    custos: "Custos",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden p-4 bg-gradient-to-br from-card to-card/60 border-border/60 hover:border-primary/40 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge
                variant="outline"
                className="font-mono text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary"
              >
                {funnelCode}
              </Badge>
            </div>
            <h3 className="text-sm font-bold leading-tight truncate" title={cleanLabel}>
              {cleanLabel}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {campaigns.length} campanha{campaigns.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Comparar períodos"
              onClick={() => setOpenComparison(true)}
            >
              <LineChartIcon className="h-3.5 w-3.5" />
            </Button>

            <Dialog open={openSettings} onOpenChange={setOpenSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar métricas">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Métricas do {funnelCode}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">
                  Catálogo completo da Meta — escolha as métricas que fazem sentido para esse funil.
                </p>
                <ScrollArea className="max-h-[60vh] pr-3">
                  <div className="space-y-3">
                    {Object.entries(groupedMetrics).map(([group, items]) => (
                      <div key={group}>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          {groupLabels[group] || group}
                        </p>
                        <div className="space-y-0.5">
                          {items.map((m) => {
                            const checked = draft.includes(m.key);
                            return (
                              <label
                                key={m.key}
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    setDraft((prev) =>
                                      v ? [...prev, m.key] : prev.filter((k) => k !== m.key),
                                    );
                                  }}
                                />
                                <span className="flex-1">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {m.key}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-between gap-2 pt-2">
                  <p className="text-[11px] text-muted-foreground self-center">
                    {draft.length} selecionada{draft.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpenSettings(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await saveCfg.mutateAsync({ clientId, funnelCode, metrics: draft });
                        setOpenSettings(false);
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openNotes} onOpenChange={setOpenNotes}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Notas do gestor">
                  <NotebookPen className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    Notas — {funnelCode} {cleanLabel}
                  </DialogTitle>
                </DialogHeader>
                <FunnelNotesPanel clientId={clientId} funnelCode={funnelCode} />
              </DialogContent>
            </Dialog>

            <Dialog open={openLeadMap} onOpenChange={setOpenLeadMap}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mapear evento de Lead">
                  <Tag className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Mapear "Lead" — {funnelCode}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">
                  Escolha quais eventos da Meta contam como "Lead" neste funil.
                  A métrica <b>Leads (mapeamento configurado)</b> e o <b>Custo por Lead</b>
                  passam a usar a soma desses eventos.
                </p>
                <ScrollArea className="max-h-[55vh] pr-3">
                  <div className="space-y-1">
                    {(() => {
                      // Build full list: catalog + all action_types seen in campaigns + named Custom Conversions
                      const seen = new Set<string>();
                      const items: { key: string; label: string; group: string }[] = [];
                      for (const opt of LEAD_ACTION_CATALOG) {
                        items.push({ ...opt, group: "Catálogo" });
                        seen.add(opt.key);
                      }
                      // Named Custom Conversions (action_type = offsite_conversion.custom.<id>)
                      for (const cc of customConversions || []) {
                        const key = `offsite_conversion.custom.${cc.id}`;
                        if (seen.has(key)) continue;
                        items.push({
                          key,
                          label: `★ ${cc.name}${cc.custom_event_type ? ` (${cc.custom_event_type})` : ""}`,
                          group: "Eventos personalizados (nomeados)",
                        });
                        seen.add(key);
                      }
                      // Any remaining action_types found in campaigns
                      const allKeys = new Set<string>();
                      for (const c of campaigns) {
                        const ab = (c as any).actionBreakdown || {};
                        for (const k of Object.keys(ab)) allKeys.add(k);
                      }
                      for (const k of Array.from(allKeys).sort()) {
                        if (seen.has(k)) continue;
                        items.push({ key: k, label: k, group: "Outros (detectados)" });
                        seen.add(k);
                      }
                      // Group render
                      const groups: Record<string, typeof items> = {};
                      for (const it of items) {
                        (groups[it.group] = groups[it.group] || []).push(it);
                      }
                      return Object.entries(groups).map(([gname, arr]) => (
                        <div key={gname} className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mt-2 mb-1">
                            {gname}
                          </p>
                          {arr.map((opt) => {
                      const checked = draftLeadTypes.includes(opt.key);
                      // Show count from current campaigns to help picking right
                      const count = campaigns.reduce(
                        (s, c) => s + Number((c.actionBreakdown || {})[opt.key] || 0),
                        0,
                      );
                      return (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setDraftLeadTypes((prev) =>
                                v ? [...prev, opt.key] : prev.filter((k) => k !== opt.key),
                              )
                            }
                          />
                          <span className="flex-1">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {count.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                            {opt.key}
                          </span>
                        </label>
                      );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenLeadMap(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await saveLeadMap.mutateAsync({
                        clientId,
                        funnelCode,
                        actionTypes: draftLeadTypes,
                      });
                      setOpenLeadMap(false);
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openFollowMap} onOpenChange={setOpenFollowMap}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mapear evento de Seguidor">
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Mapear "Seguidor" — {funnelCode}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">
                  Escolha quais eventos da Meta contam como "Seguidor" neste funil.
                  As métricas <b>Seguidores</b> e <b>Custo por seguidor</b> usarão a soma desses eventos.
                </p>
                <ScrollArea className="max-h-[55vh] pr-3">
                  <div className="space-y-1">
                    {(() => {
                      const seen = new Set<string>();
                      const items: { key: string; label: string; group: string }[] = [];
                      for (const opt of FOLLOW_ACTION_CATALOG) {
                        items.push({ ...opt, group: "Catálogo" });
                        seen.add(opt.key);
                      }
                      for (const cc of customConversions || []) {
                        const key = `offsite_conversion.custom.${cc.id}`;
                        if (seen.has(key)) continue;
                        items.push({
                          key,
                          label: `★ ${cc.name}${cc.custom_event_type ? ` (${cc.custom_event_type})` : ""}`,
                          group: "Eventos personalizados (nomeados)",
                        });
                        seen.add(key);
                      }
                      const allKeys = new Set<string>();
                      for (const c of campaigns) {
                        const ab = (c as any).actionBreakdown || {};
                        for (const k of Object.keys(ab)) allKeys.add(k);
                      }
                      for (const k of Array.from(allKeys).sort()) {
                        if (seen.has(k)) continue;
                        items.push({ key: k, label: k, group: "Outros (detectados)" });
                        seen.add(k);
                      }
                      const groups: Record<string, typeof items> = {};
                      for (const it of items) {
                        (groups[it.group] = groups[it.group] || []).push(it);
                      }
                      return Object.entries(groups).map(([gname, arr]) => (
                        <div key={gname} className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mt-2 mb-1">
                            {gname}
                          </p>
                          {arr.map((opt) => {
                            const checked = draftFollowTypes.includes(opt.key);
                            const count = campaigns.reduce(
                              (s, c) => s + Number(((c as any).actionBreakdown || {})[opt.key] || 0),
                              0,
                            );
                            return (
                              <label
                                key={opt.key}
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    setDraftFollowTypes((prev) =>
                                      v ? [...prev, opt.key] : prev.filter((k) => k !== opt.key),
                                    )
                                  }
                                />
                                <span className="flex-1">{opt.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  {count.toLocaleString("pt-BR")}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                                  {opt.key}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenFollowMap(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await saveFollowMap.mutateAsync({
                        clientId,
                        funnelCode,
                        actionTypes: draftFollowTypes,
                      });
                      setOpenFollowMap(false);
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {selected.map((key) => {
            const meta = ALL_FUNNEL_METRICS.find((m) => m.key === key);
            if (!meta) return null;
            const rawValue = (totals as any)[key] ?? 0;
            const hasOverride = overrides[key] !== undefined;
            const value = hasOverride ? overrides[key] : rawValue;
            return (
              <div
                key={key}
                className={`group relative rounded-lg border p-2 ${
                  hasOverride
                    ? "bg-amber-500/5 border-amber-500/30"
                    : "bg-muted/30 border-border/40"
                }`}
              >
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate flex items-center gap-1">
                  {hasOverride && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                  {meta.label}
                </p>
                <p className="text-sm font-bold tabular-nums truncate">
                  {formatMetricValue(key, value, currencySymbol)}
                </p>
                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    className="p-0.5 rounded hover:bg-muted/60"
                    title="Editar valor manualmente"
                    onClick={() =>
                      setEditingMetric({ key, label: meta.label, value: String(value) })
                    }
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  {hasOverride && (
                    <button
                      className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                      title="Voltar ao valor automático"
                      onClick={() =>
                        deleteOverride.mutate({ clientId, funnelCode, metricKey: key })
                      }
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {manualMetrics.map((m) => (
            <div
              key={m.id}
              className="group relative rounded-lg bg-primary/5 border border-primary/30 p-2"
            >
              <p className="text-[9px] uppercase tracking-wide text-primary/80 truncate flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-primary" /> {m.metric_label}
              </p>
              <p className="text-sm font-bold tabular-nums truncate">
                {formatManualMetric(Number(m.metric_value), m.metric_format, currencySymbol)}
              </p>
              <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button
                  className="p-0.5 rounded hover:bg-muted/60"
                  title="Editar"
                  onClick={() => {
                    setManualDraft({
                      id: m.id,
                      metric_label: m.metric_label,
                      metric_value: Number(m.metric_value),
                      metric_format: m.metric_format,
                    });
                    setOpenManual(true);
                  }}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                  title="Excluir"
                  onClick={() => deleteManual.mutate({ id: m.id, clientId })}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
          {selected.length === 0 && manualMetrics.length === 0 && (
            <p className="col-span-2 text-xs text-muted-foreground italic text-center py-3">
              Nenhuma métrica selecionada — clique no ⚙️ para escolher.
            </p>
          )}
        </div>

        {/* Add manual metric button */}
        <Dialog open={openManual} onOpenChange={(v) => {
          setOpenManual(v);
          if (!v) setManualDraft({ metric_label: "", metric_value: 0, metric_format: "number" });
        }}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1.5 h-7 text-[11px] gap-1 text-muted-foreground hover:text-primary border border-dashed border-border/50 hover:border-primary/40"
              onClick={() => setManualDraft({ metric_label: "", metric_value: 0, metric_format: "number" })}
            >
              <Plus className="h-3 w-3" /> Adicionar métrica manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {manualDraft.id ? "Editar" : "Nova"} métrica manual — {funnelCode}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Nome</label>
                <Input
                  placeholder="Ex: Vendas reais, Meta, Leads offline"
                  value={manualDraft.metric_label}
                  maxLength={60}
                  onChange={(e) =>
                    setManualDraft({ ...manualDraft, metric_label: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">Valor</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualDraft.metric_value}
                    onChange={(e) =>
                      setManualDraft({
                        ...manualDraft,
                        metric_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Formato</label>
                  <Select
                    value={manualDraft.metric_format}
                    onValueChange={(v) =>
                      setManualDraft({ ...manualDraft, metric_format: v as ManualMetricFormat })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="currency">Moeda</SelectItem>
                      <SelectItem value="percent">Percentual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setOpenManual(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!manualDraft.metric_label.trim()}
                  onClick={async () => {
                    await saveManual.mutateAsync({
                      id: manualDraft.id,
                      client_id: clientId,
                      funnel_code: funnelCode,
                      metric_label: manualDraft.metric_label.trim(),
                      metric_value: manualDraft.metric_value,
                      metric_format: manualDraft.metric_format,
                      display_order: manualMetrics.length,
                    });
                    setOpenManual(false);
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Top creatives */}
        {top3.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40">
            <button
              onClick={() => setShowCreatives((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground w-full mb-2"
            >
              <Trophy className="h-3 w-3 text-yellow-400" />
              Top criativos
              <ChevronRight
                className={`h-3 w-3 ml-auto transition-transform ${showCreatives ? "rotate-90" : ""}`}
              />
            </button>
            {showCreatives && (
              <div className="space-y-1.5">
                {top3.map((cr, idx) => (
                  <div
                    key={cr.id}
                    className="flex items-center gap-2 p-1.5 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-[10px] font-bold w-4 text-center text-yellow-400">
                      {idx + 1}
                    </span>
                    {cr.thumbnail ? (
                      <img
                        src={cr.thumbnail}
                        alt=""
                        className="h-9 w-9 rounded object-cover ring-1 ring-border/60"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" title={cr.name}>
                        {cr.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
                        <span>
                          {(cr.primaryResult ?? cr.conversions ?? 0).toLocaleString("pt-BR")} result.
                        </span>
                        <span>•</span>
                        <span>{formatCurrency(cr.spend, currencySymbol)}</span>
                        {cr.roas > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-primary">{cr.roas.toFixed(1)}x</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
          {totals.purchaseValue > 0 ? (
            <div className="flex items-center gap-1 text-[11px]">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">ROAS</span>
              <span className="font-bold text-primary">{totals.roas.toFixed(2)}x</span>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              {analysis.metrics.ctrRate.toFixed(2)}% CTR
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
            onClick={() => setOpenDetail(true)}
          >
            <Sparkles className="h-3 w-3" /> Detalhes
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Edit metric override dialog */}
        <Dialog open={!!editingMetric} onOpenChange={(v) => !v && setEditingMetric(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Editar valor — {editingMetric?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Sobrescreve o valor calculado automaticamente. Útil para métricas como
                Seguidores ou Custo por seguidor que precisam ser ajustadas manualmente.
              </p>
              <div>
                <label className="text-xs font-medium mb-1 block">Valor</label>
                <Input
                  type="number"
                  step="any"
                  autoFocus
                  value={editingMetric?.value ?? ""}
                  onChange={(e) =>
                    setEditingMetric((prev) =>
                      prev ? { ...prev, value: e.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingMetric(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!editingMetric) return;
                    const num = parseFloat(editingMetric.value);
                    if (isNaN(num)) return;
                    await saveOverride.mutateAsync({
                      clientId,
                      funnelCode,
                      metricKey: editingMetric.key,
                      metricValue: num,
                    });
                    setEditingMetric(null);
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail dialog */}
        <FunnelDetailDialog
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          clientId={clientId}
          funnelCode={funnelCode}
          funnelLabel={funnelLabel}
          campaigns={campaigns}
          currencySymbol={currencySymbol}
        />

        {/* Comparison dialog */}
        <FunnelComparisonDialog
          open={openComparison}
          onClose={() => setOpenComparison(false)}
          funnelCode={funnelCode}
          funnelLabel={cleanLabel}
          campaigns={campaigns}
          selectedMetrics={selected}
          currencySymbol={currencySymbol}
        />
      </Card>
    </motion.div>
  );
}
