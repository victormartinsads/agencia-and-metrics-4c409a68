import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Check, X, ArrowRight, DollarSign, TrendingUp, Target, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
        <KpiCardPremium
          label="Investimento"
          value={formatCurrency(spend, currencySymbol)}
          sub="vs. período anterior"
          icon={<DollarSign className="h-3 w-3" />}
        />
        <KpiCardPremium
          label="Faturamento"
          value={formatCurrency(revenue, currencySymbol)}
          sub="vs. período anterior"
          emphasis
          icon={<TrendingUp className="h-3 w-3" />}
        />
        <KpiCardPremium
          label="ROAS"
          value={`${roas.toFixed(2)}x`}
          sub="Meta: 3.5x"
          icon={<Target className="h-3 w-3" />}
        />
        <KpiCardPremium
          label="Vendas"
          value={compact(sales)}
          sub={cpv > 0 ? `CPV ${formatCurrency(cpv, currencySymbol)}` : "—"}
          icon={<ShoppingCart className="h-3 w-3" />}
        />
        <KpiCardPremium
          label="Leads"
          value={compact(leads)}
          icon={<Users className="h-3 w-3" />}
        />
      </div>
    </motion.section>
  );
}