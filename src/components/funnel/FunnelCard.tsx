import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Settings2, NotebookPen, ChevronRight, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ALL_FUNNEL_METRICS,
  defaultMetricsFor,
  useFunnelCardConfig,
  useSaveFunnelCardConfig,
} from "@/hooks/useFunnelCardConfig";
import { FunnelNotesPanel } from "./FunnelNotesPanel";
import { FunnelDetailDialog } from "./FunnelDetailDialog";
import { formatCurrency } from "@/lib/format";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol: string;
  datePreset: string;
}

function aggregate(campaigns: Campaign[]) {
  const num = (k: keyof Campaign) =>
    campaigns.reduce((s, c) => s + Number((c as any)[k] || 0), 0);
  const spend = num("spend");
  const impressions = num("impressions");
  const clicks = num("clicks");
  const conversions = num("conversions");
  const purchases = num("purchases" as any);
  const purchaseValue = num("purchaseValue" as any);
  const reach = num("reach");

  return {
    spend,
    impressions,
    reach,
    frequency: reach > 0 ? impressions / reach : 0,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    landingPageViews: num("landingPageViews" as any),
    addToCart: num("addToCart" as any),
    initiateCheckout: num("initiateCheckout" as any),
    messages: 0,
    conversions,
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    cpa: purchases > 0 ? spend / purchases : conversions > 0 ? spend / conversions : 0,
    cpl: conversions > 0 ? spend / conversions : 0,
  };
}

function formatMetric(key: string, value: number, currency: string) {
  if (["spend", "purchaseValue", "cpc", "cpm", "cpa", "cpl"].includes(key)) {
    return formatCurrency(value, currency);
  }
  if (["ctr"].includes(key)) return `${value.toFixed(2)}%`;
  if (["roas"].includes(key)) return `${value.toFixed(2)}x`;
  if (["frequency"].includes(key)) return value.toFixed(2);
  return Math.round(value).toLocaleString("pt-BR");
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

  const { data: configMap } = useFunnelCardConfig(clientId);
  const saveCfg = useSaveFunnelCardConfig();

  const totals = useMemo(() => aggregate(campaigns), [campaigns]);
  const analysis = useFunnelAnalysis(campaigns);

  const selected = configMap?.[funnelCode] || defaultMetricsFor(funnelCode);

  const [draft, setDraft] = useState<string[]>(selected);
  // Sync draft when selected changes
  useMemo(() => setDraft(selected), [selected.join(",")]);

  // Cleaner label without the leading "F1 - " noise
  const cleanLabel = funnelLabel.replace(/^F\d+\s*[\-—]\s*/, "");

  // Health indicator: ROAS-based if revenue > 0, else CPA delta vs spend
  const health = (() => {
    if (totals.purchaseValue > 0) {
      if (totals.roas >= 2) return { label: "Saudável", tone: "bg-emerald-500/15 text-emerald-400" };
      if (totals.roas >= 1) return { label: "Atenção", tone: "bg-yellow-500/15 text-yellow-400" };
      return { label: "Crítico", tone: "bg-red-500/15 text-red-400" };
    }
    if (totals.conversions > 0) return { label: "Captando", tone: "bg-blue-500/15 text-blue-400" };
    return { label: "Sem dados", tone: "bg-muted text-muted-foreground" };
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden p-4 bg-gradient-to-br from-card to-card/60 border-border/60 hover:border-primary/40 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary">
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
            <Dialog open={openSettings} onOpenChange={setOpenSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar métricas">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Métricas do {funnelCode}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground -mt-2">
                  Escolha quais informações deseja exibir neste card.
                </p>
                <ScrollArea className="max-h-80 pr-3">
                  <div className="space-y-1.5">
                    {ALL_FUNNEL_METRICS.map((m) => {
                      const checked = draft.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
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
                          {m.group && (
                            <span className="text-[10px] text-muted-foreground capitalize">{m.group}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-2">
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
                  <DialogTitle>Notas — {funnelCode} {cleanLabel}</DialogTitle>
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
              <div
                key={key}
                className="rounded-lg bg-muted/30 border border-border/40 p-2"
              >
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
                  {meta.label}
                </p>
                <p className="text-sm font-bold tabular-nums truncate">
                  {formatMetric(key, value, currencySymbol)}
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

        {/* Detail dialog (full funnel view) */}
        <FunnelDetailDialog
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          clientId={clientId}
          funnelCode={funnelCode}
          funnelLabel={funnelLabel}
          campaigns={campaigns}
          currencySymbol={currencySymbol}
        />
      </Card>
    </motion.div>
  );
}