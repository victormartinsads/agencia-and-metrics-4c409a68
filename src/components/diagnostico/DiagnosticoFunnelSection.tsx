import { useMemo, useState } from "react";
import { Campaign } from "@/data/mockMetaData";
import { FunnelGroup, extractFunnelCode } from "@/lib/funnelGrouping";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { CreativeGrid, CreativeMetricKey } from "@/components/dashboard/CreativeGrid";
import { Layers, Target, Eye, EyeOff, Pencil, Check, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricsCustomizer } from "./MetricsCustomizer";
import { EditableKpi } from "./EditableKpi";
import {
  AVAILABLE_METRICS,
  formatCustomValue,
  useDiagnosticMetricsConfig,
  type MetricFormat,
} from "@/hooks/useDiagnosticMetricsConfig";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { findMetricDef, getMetricValue } from "@/lib/metaMetricCatalog";
import { useFunnelLabels, useSaveFunnelLabel } from "@/hooks/useFunnelLabels";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFunnelPrimaryMetrics, useSaveFunnelPrimaryMetric, PRIMARY_METRIC_OPTIONS } from "@/hooks/useFunnelPrimaryMetric";
import { useAdaptedCampaigns } from "@/hooks/useAdaptedCampaigns";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { FunnelAIInsights } from "@/components/funnel/FunnelAIInsights";
import { CampaignDrillDown } from "@/components/gestor/CampaignDrillDown";


interface Props {
  group: FunnelGroup;
  clientId?: string;
  currencySymbol?: string;
  datePreset?: string;
  selectedMetricKey?: CreativeMetricKey;
}

function formatMoney(v: number, symbol: string) {
  return `${symbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


function aggregateAdsets(campaigns: Campaign[]) {
  const map = new Map<string, { name: string; spend: number; impressions: number; clicks: number; conversions: number }>();
  for (const c of campaigns) {
    for (const cr of c.creatives) {
      const name = cr.adsetName || "—";
      const ex = map.get(name);
      if (ex) {
        ex.spend += cr.spend;
        ex.impressions += cr.impressions;
        ex.clicks += cr.clicks;
        ex.conversions += (cr.primaryResult ?? cr.conversions);
      } else {
        map.set(name, {
          name,
          spend: cr.spend,
          impressions: cr.impressions,
          clicks: cr.clicks,
          conversions: cr.primaryResult ?? cr.conversions,
        });
      }
    }
  }
  return Array.from(map.values())
    .map(a => ({
      ...a,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpa: a.conversions > 0 ? a.spend / a.conversions : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export function DiagnosticoFunnelSection({ group, clientId, currencySymbol = "R$", datePreset = "last_7d", selectedMetricKey }: Props) {
  const { data: primaryMetrics } = useFunnelPrimaryMetrics(clientId);
  const savePrimaryMetric = useSaveFunnelPrimaryMetric();

  const sectionCode = useMemo(() => {
    if (group.isFunnel) {
      return extractFunnelCode(group.campaigns[0]?.name) || group.key;
    } else {
      return group.campaigns[0]?.id || group.key;
    }
  }, [group]);

  const adaptedCampaigns = useAdaptedCampaigns(group.campaigns, primaryMetrics);

  const { classified, metrics, totalSpend, totalPurchaseValue } = useFunnelAnalysis(adaptedCampaigns);

  const totals = useMemo(() => aggregateCampaignMetrics(adaptedCampaigns), [adaptedCampaigns]);
  const adsets = useMemo(() => aggregateAdsets(adaptedCampaigns), [adaptedCampaigns]);
  const [showAdsets, setShowAdsets] = useState(false);
  const resultLabel =
    adaptedCampaigns.find(c => c.primaryResultLabel)?.primaryResultLabel || "Resultados";

  const { config, update } = useDiagnosticMetricsConfig(
    clientId || "",
    datePreset,
    group.key,
  );

  const { data: labelMap } = useFunnelLabels(clientId);
  const saveLabelMutation = useSaveFunnelLabel();

  const rawSectionTitle = useMemo(() => {
    if (group.isFunnel) {
      const code = extractFunnelCode(group.campaigns[0]?.name);
      return (code && labelMap?.[code]) || group.key;
    } else {
      const campaignId = group.campaigns[0]?.id;
      return (campaignId && labelMap?.[campaignId]) || group.key;
    }
  }, [group, labelMap]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const handleEditTitleClick = () => {
    setTitleDraft(rawSectionTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!clientId) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      toast.error("O nome não pode ser vazio");
      return;
    }
    try {
      await saveLabelMutation.mutateAsync({
        clientId,
        funnelCode: sectionCode,
        label: trimmed,
      });
      setIsEditingTitle(false);
      toast.success("Nome atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar o nome");
    }
  };

  const [drillDownCampaign, setDrillDownCampaign] = useState<{ id: string; name: string } | null>(null);

  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignDraft, setCampaignDraft] = useState("");

  const handleStartEditCampaign = (campaignId: string, currentName: string) => {
    setCampaignDraft(currentName);
    setEditingCampaignId(campaignId);
  };

  const handleSaveCampaign = async (campaignId: string) => {
    if (!clientId) return;
    const trimmed = campaignDraft.trim();
    if (!trimmed) {
      toast.error("O nome não pode ser vazio");
      return;
    }
    try {
      await saveLabelMutation.mutateAsync({
        clientId,
        funnelCode: campaignId,
        label: trimmed,
      });
      setEditingCampaignId(null);
      toast.success("Nome da campanha atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar nome da campanha");
    }
  };

  const displaySectionTitle = group.isFunnel ? `Funil: ${rawSectionTitle}` : rawSectionTitle;

  const getMetricLabel = (key: string): string => {
    if (key === "conversions") return resultLabel;
    return findMetricDef(key)?.label || AVAILABLE_METRICS.find(m => m.key === key)?.label || key;
  };

  const isHighlight = (key: string) => key === "spend" || key === "conversions";

  const getCurrentRawValue = (key: string): number => {
    const override = config.custom_metrics.find((m) => m.id === key);
    if (override) {
      return Number(String(override.value).replace(",", "."));
    }
    return getMetricValue(totals, key);
  };

  const getMetricValueAndOverride = (key: string) => {
    const originalRaw = getMetricValue(totals, key);
    
    if (key === "cpFollow") {
      const currentSpend = getCurrentRawValue("spend");
      const currentFollows = getCurrentRawValue("follows");
      const rawValue = currentFollows > 0 ? currentSpend / currentFollows : 0;
      
      const isSpendOverridden = !!config.custom_metrics.find((m) => m.id === "spend");
      const isFollowsOverridden = !!config.custom_metrics.find((m) => m.id === "follows");
      const isOverridden = isSpendOverridden || isFollowsOverridden;

      return {
        value: formatMetricValue("cpFollow", rawValue, currencySymbol),
        rawValue,
        originalValue: formatMetricValue("cpFollow", originalRaw, currencySymbol),
        isOverridden,
      };
    }

    const override = config.custom_metrics.find((m) => m.id === key);
    const isOverridden = !!override;
    const rawValue = isOverridden ? Number(String(override.value).replace(",", ".")) : originalRaw;

    return {
      value: isOverridden 
        ? (override.format === "text" ? override.value : formatMetricValue(key, rawValue, currencySymbol)) 
        : formatMetricValue(key, originalRaw, currencySymbol),
      rawValue,
      originalValue: formatMetricValue(key, originalRaw, currencySymbol),
      isOverridden,
    };
  };

  const handleSaveOverride = (key: string, rawVal: string) => {
    const existingIndex = config.custom_metrics.findIndex((m) => m.id === key);
    let nextCustom: any[];

    if (rawVal.trim() === "") {
      nextCustom = config.custom_metrics.filter((m) => m.id !== key);
    } else {
      let format: MetricFormat = "number";
      if (["spend", "purchaseValue", "profit", "cpc", "cpm", "cpcLink", "cpa", "cpl", "cpLead", "cpFollow", "cpThruplay", "cpLpv", "cpAddToCart", "cpInitiateCheckout", "cpMessage"].includes(key)) {
        format = "currency";
      } else if (["ctr", "linkCtr", "uniqueCtr", "lpvRate", "hookRate", "holdRate", "checkoutRate"].includes(key)) {
        format = "percent";
      } else if (["roas", "frequency", "avgVideoTime"].includes(key)) {
        format = "number";
      }

      const label = getMetricLabel(key);

      const updatedMetric = {
        id: key,
        label,
        value: rawVal,
        format,
      };

      if (existingIndex > -1) {
        nextCustom = config.custom_metrics.map((m, idx) => (idx === existingIndex ? updatedMetric : m));
      } else {
        nextCustom = [...config.custom_metrics, updatedMetric];
      }
    }

    update({ ...config, custom_metrics: nextCustom });
    toast.success("Métrica salva localmente!");
  };

  const handleResetOverride = (key: string) => {
    const nextCustom = config.custom_metrics.filter((m) => m.id !== key);
    update({ ...config, custom_metrics: nextCustom });
    toast.success("Valor original restaurado!");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            {group.isFunnel ? (
              <Layers className="h-5 w-5 text-primary" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            {isEditingTitle ? (
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="h-8 text-sm font-bold text-card-foreground bg-background border-primary/50 focus:border-primary"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-primary hover:bg-primary/10"
                  onClick={handleSaveTitle}
                  disabled={saveLabelMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:bg-muted"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h3 className="text-xl font-bold text-card-foreground">
                  {displaySectionTitle}
                </h3>
                {clientId && (
                  <>
                    <button
                      onClick={handleEditTitleClick}
                      className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1"
                      title="Editar nome"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!group.isFunnel && group.campaigns[0] && (
                      <button
                        onClick={() => setDrillDownCampaign({ id: group.campaigns[0].id, name: group.campaigns[0].name })}
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1"
                        title="Gerenciar Campanha"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {group.isFunnel
              ? `${adaptedCampaigns.length} campanha(s) agrupadas • dados consolidados`
              : "Campanha individual"}
          </p>
         </div>
         <div className="flex items-center gap-2 self-start">
          {clientId ? (
            <Select
              value={primaryMetrics?.[sectionCode] || "conversions"}
              onValueChange={async (val) => {
                try {
                  await savePrimaryMetric.mutateAsync({
                    clientId,
                    funnelCode: sectionCode,
                    metricKey: val,
                  });
                  toast.success("Métrica primária atualizada!");
                } catch (err: any) {
                  toast.error(err?.message || "Erro ao salvar métrica primária");
                }
              }}
            >
              <SelectTrigger className="h-7 text-[10px] font-medium bg-primary/15 hover:bg-primary/20 text-primary border-0 rounded-full px-2.5 py-1 focus:ring-0 focus:ring-offset-0 flex items-center gap-1 select-none cursor-pointer">
                <SelectValue placeholder="Métrica primária" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                {PRIMARY_METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key} className="text-xs">
                    Métrica primária: {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-1 rounded-full">
              Métrica primária: {resultLabel}
            </span>
          )}
          {clientId && (
            <MetricsCustomizer clientId={clientId} datePreset={datePreset} groupKey={group.key} />
          )}
         </div>
      </header>

      {/* KPIs consolidados — personalizáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {config.visible_metrics.map(key => {
          const { value, originalValue, isOverridden } = getMetricValueAndOverride(key);
          return (
            <EditableKpi
              key={key}
              label={getMetricLabel(key)}
              value={value}
              originalValue={originalValue}
              isOverridden={isOverridden}
              onSave={(val) => handleSaveOverride(key, val)}
              onReset={() => handleResetOverride(key)}
              readOnly={!clientId || key === "cpFollow"}
              highlight={isHighlight(key)}
            />
          );
        })}
        {config.custom_metrics
          .filter(m => !AVAILABLE_METRICS.some(am => am.key === m.id))
          .map(m => (
            <EditableKpi
              key={m.id}
              label={m.label}
              value={formatCustomValue(m, currencySymbol)}
              isOverridden={true}
              onSave={(val) => {
                const nextCustom = config.custom_metrics.map((item) => (item.id === m.id ? { ...item, value: val } : item));
                update({ ...config, custom_metrics: nextCustom });
              }}
              onReset={() => {
                const nextCustom = config.custom_metrics.filter((item) => item.id !== m.id);
                update({ ...config, custom_metrics: nextCustom });
              }}
              readOnly={!clientId}
            />
          ))}
      </div>

      {/* Quando é funil agrupando várias campanhas, lista as campanhas */}
      {group.isFunnel && adaptedCampaigns.length > 1 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-card-foreground">
            Campanhas deste funil
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Campanha</th>
                  <th className="text-right px-3 py-2 font-medium">Invest.</th>
                  <th className="text-right px-3 py-2 font-medium">{resultLabel}</th>
                  <th className="text-right px-3 py-2 font-medium">CPA</th>
                  <th className="text-right px-3 py-2 font-medium">CTR</th>
                  <th className="text-right px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {adaptedCampaigns
                  .slice()
                  .sort((a, b) => b.spend - a.spend)
                  .map(c => {
                    const customCampName = labelMap?.[c.id] || c.name;
                    const isEditingCamp = editingCampaignId === c.id;

                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/10">
                        <td className="px-3 py-2 text-card-foreground truncate max-w-[280px]" title={c.name}>
                          {isEditingCamp ? (
                            <div className="flex items-center gap-1.5 max-w-full">
                              <Input
                                value={campaignDraft}
                                onChange={(e) => setCampaignDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveCampaign(c.id);
                                  if (e.key === "Escape") setEditingCampaignId(null);
                                }}
                                className="h-7 text-xs py-1 px-2 flex-1 bg-background border-primary/50 focus:border-primary"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-primary hover:bg-primary/10"
                                onClick={() => handleSaveCampaign(c.id)}
                                disabled={saveLabelMutation.isPending}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted"
                                onClick={() => setEditingCampaignId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/camp">
                              <span className="truncate max-w-[230px] block">{customCampName}</span>
                              {clientId && (
                                <>
                                  <button
                                    onClick={() => handleStartEditCampaign(c.id, customCampName)}
                                    className="opacity-0 group-hover/camp:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-0.5"
                                    title="Editar nome"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => setDrillDownCampaign({ id: c.id, name: customCampName })}
                                    className="opacity-0 group-hover/camp:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-0.5"
                                    title="Gerenciar Campanha"
                                  >
                                    <Settings2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-card-foreground">{formatMoney(c.spend, currencySymbol)}</td>
                        <td className="px-3 py-2 text-right text-card-foreground font-semibold">{c.conversions}</td>
                        <td className="px-3 py-2 text-right text-card-foreground">
                          {c.conversions > 0 ? formatMoney(c.spend / c.conversions, currencySymbol) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-card-foreground">{c.ctr.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            c.status === "active" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                          }`}>{c.status}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conjuntos (adsets) consolidados */}
      {adsets.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-card-foreground flex items-center justify-between">
            <span>Conjuntos de anúncios ({adsets.length})</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={() => setShowAdsets(s => !s)}
            >
              {showAdsets ? <><EyeOff className="h-3 w-3" /> Ocultar</> : <><Eye className="h-3 w-3" /> Exibir</>}
            </Button>
          </div>
          {showAdsets && <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Conjunto</th>
                  <th className="text-right px-3 py-2 font-medium">Invest.</th>
                  <th className="text-right px-3 py-2 font-medium">{resultLabel}</th>
                  <th className="text-right px-3 py-2 font-medium">CPA</th>
                  <th className="text-right px-3 py-2 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {adsets.slice(0, 10).map(a => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="px-3 py-2 text-card-foreground truncate max-w-[280px]" title={a.name}>{a.name}</td>
                    <td className="px-3 py-2 text-right text-card-foreground">{formatMoney(a.spend, currencySymbol)}</td>
                    <td className="px-3 py-2 text-right text-card-foreground font-semibold">{a.conversions}</td>
                    <td className="px-3 py-2 text-right text-card-foreground">
                      {a.conversions > 0 ? formatMoney(a.cpa, currencySymbol) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-card-foreground">{a.ctr.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {/* Pódio de criativos: agregado quando funil, individual quando campanha solta */}
      <div>
        {group.isFunnel ? (
          <AggregatedCreativeGrid
            campaigns={adaptedCampaigns}
            funnelLabel={rawSectionTitle}
            clientId={clientId}
            currencySymbol={currencySymbol}
            selectedMetricKey={selectedMetricKey}
          />
        ) : (
          <CreativeGrid campaign={adaptedCampaigns[0]} clientId={clientId} currencySymbol={currencySymbol} selectedMetricKey={selectedMetricKey} />
        )}
      </div>

      <div className="print:hidden mt-6">
        <FunnelAIInsights 
          campaigns={classified}
          metrics={metrics}
          totalSpend={totalSpend}
          totalPurchaseValue={totalPurchaseValue}
        />
      </div>

      {drillDownCampaign && clientId && (
        <CampaignDrillDown
          open={!!drillDownCampaign}
          onOpenChange={(v) => !v && setDrillDownCampaign(null)}
          clientId={clientId}
          campaignId={drillDownCampaign.id}
          campaignName={drillDownCampaign.name}
          datePreset={datePreset}
          currencySymbol={currencySymbol}
        />
      )}
    </section>
  );
}

function Kpi({ label, value, highlight, custom }: { label: string; value: string; highlight?: boolean; custom?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      custom
        ? "border-amber-500/30 bg-amber-500/5"
        : highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-muted/20"
    }`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {custom && <span className="text-amber-500">✦</span>}
        {label}
      </div>
      <div className={`mt-1 text-base font-bold ${
        custom ? "text-amber-500" : highlight ? "text-primary" : "text-card-foreground"
      }`}>{value}</div>
    </div>
  );
}
