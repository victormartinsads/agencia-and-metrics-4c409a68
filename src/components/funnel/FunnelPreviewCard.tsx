import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Check, X, ArrowRight, DollarSign, TrendingUp, Target, ShoppingCart, Users, Settings2, MousePointerClick, Eye, BarChart3, Percent, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Campaign } from "@/data/mockMetaData";
import { aggregateCampaignMetrics } from "@/lib/metaMetrics";
import { formatCurrency } from "@/lib/format";
import { KpiCardPremium } from "@/components/dashboard/overview/premium/KpiCardPremium";
import { useFunnelLabels, useSaveFunnelLabel } from "@/hooks/useFunnelLabels";
import {
  useFunnelLeadMapping,
} from "@/hooks/useFunnelLeadMapping";
import { toast } from "sonner";

interface Props {
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol?: string;
  readOnly?: boolean;
  onOpenDetail: () => void;
}

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString("pt-BR");
}

const DEFAULT_KPIS = ["spend", "revenue", "roas", "sales", "leads"];

export function FunnelPreviewCard({
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol = "R$",
  readOnly = false,
  onOpenDetail,
}: Props) {
  const { data: labelMap } = useFunnelLabels(clientId);
  const saveLabel = useSaveFunnelLabel();
  const { data: leadMap } = useFunnelLeadMapping(clientId);

  const leadActionTypes = leadMap?.[funnelCode] || [];
  const totals = aggregateCampaignMetrics(campaigns, { leadActionTypes });

  const baseLabel = (labelMap?.[funnelCode] || funnelLabel || funnelCode).replace(/^F\d+\s*[\-—]\s*/, "");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(baseLabel);
  useEffect(() => setDraft(baseLabel), [baseLabel]);

  const onSave = async () => {
    const v = draft.trim();
    if (!v) return;
    try {
      await saveLabel.mutateAsync({ clientId, funnelCode, label: v });
      toast.success("Nome do funil salvo");
      setEditing(false);
    } catch {
      toast.error("Erro ao salvar nome");
    }
  };

  const spend = totals.spend || 0;
  const revenue = totals.purchaseValue || 0;
  const roas = totals.roas || (spend > 0 ? revenue / spend : 0);
  const sales = totals.purchases || 0;
  const leads = totals.leads || totals.conversions || 0;
  const cpv = sales > 0 ? spend / sales : 0;
  const impressions = (totals as any).impressions || 0;
  const clicks = (totals as any).clicks || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpl = leads > 0 ? spend / leads : 0;

  const KPI_CATALOG: Record<string, { label: string; value: string; sub?: string; icon: JSX.Element; emphasis?: boolean }> = {
    spend:      { label: "Investimento", value: formatCurrency(spend, currencySymbol), sub: "vs. período anterior", icon: <DollarSign className="h-3 w-3" /> },
    revenue:    { label: "Faturamento", value: formatCurrency(revenue, currencySymbol), sub: "vs. período anterior", emphasis: true, icon: <TrendingUp className="h-3 w-3" /> },
    roas:       { label: "ROAS", value: `${roas.toFixed(2)}x`, sub: "Meta: 3.5x", icon: <Target className="h-3 w-3" /> },
    sales:      { label: "Vendas", value: compact(sales), sub: cpv > 0 ? `CPV ${formatCurrency(cpv, currencySymbol)}` : "—", icon: <ShoppingCart className="h-3 w-3" /> },
    leads:      { label: "Leads", value: compact(leads), sub: cpl > 0 ? `CPL ${formatCurrency(cpl, currencySymbol)}` : undefined, icon: <Users className="h-3 w-3" /> },
    impressions:{ label: "Impressões", value: compact(impressions), icon: <Eye className="h-3 w-3" /> },
    clicks:     { label: "Cliques", value: compact(clicks), icon: <MousePointerClick className="h-3 w-3" /> },
    ctr:        { label: "CTR", value: `${ctr.toFixed(2)}%`, icon: <Percent className="h-3 w-3" /> },
    cpc:        { label: "CPC", value: formatCurrency(cpc, currencySymbol), icon: <BarChart3 className="h-3 w-3" /> },
    cpm:        { label: "CPM", value: formatCurrency(cpm, currencySymbol), icon: <Activity className="h-3 w-3" /> },
    cpa:        { label: "CPA", value: formatCurrency(sales > 0 ? spend / sales : 0, currencySymbol), icon: <Target className="h-3 w-3" /> },
    cpl:        { label: "CPL", value: formatCurrency(cpl, currencySymbol), icon: <Users className="h-3 w-3" /> },
  };

  const storageKey = `funnel-preview-kpis:${clientId}:${funnelCode}`;
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_KPIS;
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch {}
  }, [storageKey, selected]);

  const toggleKpi = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= 6) {
        toast.info("Máximo de 6 métricas");
        return prev;
      }
      return [...prev, key];
    });
  };

  const visible = useMemo(() => selected.filter((k) => KPI_CATALOG[k]), [selected, KPI_CATALOG]);
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
          <span
            className="text-[10px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-primary/40 text-primary"
          >
            {funnelCode}
          </span>
          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                  if (e.key === "Escape") {
                    setDraft(baseLabel);
                    setEditing(false);
                  }
                }}
                className="h-7 text-sm flex-1 max-w-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSave}>
                <Check className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  setDraft(baseLabel);
                  setEditing(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <h3
                className="text-sm font-bold uppercase tracking-[0.06em] truncate"
                style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
                title={baseLabel}
              >
                {baseLabel}
              </h3>
              {!readOnly && (
                <button
                  className="text-muted-foreground hover:text-primary p-1 rounded"
                  onClick={() => setEditing(true)}
                  title="Renomear funil"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
            {campaigns.length} campanha{campaigns.length > 1 ? "s" : ""}
          </span>
          {!readOnly && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Escolher métricas">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Métricas visíveis</p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {Object.entries(KPI_CATALOG).map(([key, cfg]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer py-1 text-xs">
                      <Checkbox
                        checked={selected.includes(key)}
                        onCheckedChange={() => toggleKpi(key)}
                      />
                      <span>{cfg.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Selecione entre 1 e 6 métricas.</p>
              </PopoverContent>
            </Popover>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={onOpenDetail}
          >
            Análise completa <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </header>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridCols} gap-3 p-4`}>
        {visible.map((key) => {
          const cfg = KPI_CATALOG[key];
          return (
            <KpiCardPremium
              key={key}
              label={cfg.label}
              value={cfg.value}
              sub={cfg.sub}
              emphasis={cfg.emphasis}
              icon={cfg.icon}
            />
          );
        })}
      </div>
    </motion.section>
  );
}