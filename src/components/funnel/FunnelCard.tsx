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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ALL_FUNNEL_METRICS,
  defaultMetricsFor,
  useFunnelCardConfig,
  useSaveFunnelCardConfig,
} from "@/hooks/useFunnelCardConfig";
import { FunnelNotesPanel } from "./FunnelNotesPanel";
import { FunnelDetailDialog } from "./FunnelDetailDialog";
import { FunnelComparisonDialog } from "./FunnelComparisonDialog";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { formatCurrency } from "@/lib/format";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol: string;
  datePreset: string;
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
}: Props) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openComparison, setOpenComparison] = useState(false);
  const [showCreatives, setShowCreatives] = useState(true);

  const { data: configMap } = useFunnelCardConfig(clientId);
  const saveCfg = useSaveFunnelCardConfig();

  const totals = useMemo(() => aggregateCampaignMetrics(campaigns), [campaigns]);
  const analysis = useFunnelAnalysis(campaigns);
  const top3 = useMemo(() => topCreatives(campaigns, 3), [campaigns]);

  const selected = configMap?.[funnelCode] || defaultMetricsFor(funnelCode);

  const [draft, setDraft] = useState<string[]>(selected);
  useMemo(() => setDraft(selected), [selected.join(",")]);

  const cleanLabel = funnelLabel.replace(/^F\d+\s*[\-—]\s*/, "");

  const health = (() => {
    if (totals.purchaseValue > 0) {
      if (totals.roas >= 2) return { label: "Saudável", tone: "bg-emerald-500/15 text-emerald-400" };
      if (totals.roas >= 1) return { label: "Atenção", tone: "bg-yellow-500/15 text-yellow-400" };
      return { label: "Crítico", tone: "bg-red-500/15 text-red-400" };
    }
    if (totals.conversions > 0) return { label: "Captando", tone: "bg-blue-500/15 text-blue-400" };
    return { label: "Sem dados", tone: "bg-muted text-muted-foreground" };
  })();

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
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${health.tone}`}>
                {health.label}
              </span>
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
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {selected.map((key) => {
            const meta = ALL_FUNNEL_METRICS.find((m) => m.key === key);
            if (!meta) return null;
            const value = (totals as any)[key] ?? 0;
            return (
              <div key={key} className="rounded-lg bg-muted/30 border border-border/40 p-2">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
                  {meta.label}
                </p>
                <p className="text-sm font-bold tabular-nums truncate">
                  {formatMetricValue(key, value, currencySymbol)}
                </p>
              </div>
            );
          })}
          {selected.length === 0 && (
            <p className="col-span-2 text-xs text-muted-foreground italic text-center py-3">
              Nenhuma métrica selecionada — clique no ⚙️ para escolher.
            </p>
          )}
        </div>

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
