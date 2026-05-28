import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, Save, RotateCcw, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campaign } from "@/data/mockMetaData";
import { useFunnelStages, useSaveFunnelStages, AVAILABLE_METRICS, DEFAULT_STAGES, FunnelStage } from "@/hooks/useFunnelStages";
import { useFunnelLabels, useSaveFunnelLabel } from "@/hooks/useFunnelLabels";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";

interface StageRow {
  name: string;
  metric_key: string;
  sort_order: number;
}

interface Props {
  clientId: string;
  campaigns: Campaign[];
  selectedCampaignId?: string | null;
  currencySymbol?: string;
}

function getMetricValue(campaigns: Campaign[], metricKey: string): number {
  const active = campaigns.filter(c => c.spend > 0);
  switch (metricKey) {
    case "impressions": return active.reduce((s, c) => s + c.impressions, 0);
    case "reach": return active.reduce((s, c) => s + c.reach, 0);
    case "clicks": return active.reduce((s, c) => s + c.clicks, 0);
    case "landing_page_views": return active.reduce((s, c) => s + (c.landingPageViews || 0), 0);
    case "messaging_conversations_started":
      return active.filter(c => c.primaryResultKey?.includes("messaging") || c.name.toLowerCase().includes("whatsapp"))
        .reduce((s, c) => s + c.conversions, 0);
    case "leads":
      return active.filter(c => c.primaryResultKey === "lead" || c.objective?.toLowerCase().includes("lead"))
        .reduce((s, c) => s + c.conversions, 0);
    case "add_to_cart": return active.reduce((s, c) => s + (c.addToCart || 0), 0);
    case "initiate_checkout": return active.reduce((s, c) => s + (c.initiateCheckout || 0), 0);
    case "purchases": return active.reduce((s, c) => s + (c.purchases || 0), 0);
    case "conversions": return active.reduce((s, c) => s + c.conversions, 0);
    default: return 0;
  }
}

function getMetricCost(campaigns: Campaign[], metricKey: string): number {
  const value = getMetricValue(campaigns, metricKey);
  if (value === 0) return 0;
  const totalSpend = campaigns.filter(c => c.spend > 0).reduce((s, c) => s + c.spend, 0);
  return totalSpend / value;
}

export function EditableFunnel({ clientId, campaigns, selectedCampaignId, currencySymbol = "R$" }: Props) {
  const { data: savedStages } = useFunnelStages(clientId, selectedCampaignId);
  const saveMutation = useSaveFunnelStages();
  const [stages, setStages] = useState<StageRow[]>([]);
  const [editing, setEditing] = useState(false);

  // Editable funnel title (persisted in funnel_custom_labels under a sentinel code)
  const TITLE_CODE = "__como_estamos__";
  const { data: labelMap } = useFunnelLabels(clientId);
  const saveLabel = useSaveFunnelLabel();
  const savedTitle = labelMap?.[TITLE_CODE] || "Funil de Conversão";
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(savedTitle);
  useEffect(() => setTitleDraft(savedTitle), [savedTitle]);

  const handleSaveTitle = async () => {
    const v = titleDraft.trim();
    if (!v) return;
    try {
      await saveLabel.mutateAsync({ clientId, funnelCode: TITLE_CODE, label: v });
      setTitleEditing(false);
      toast.success("Nome do funil salvo");
    } catch {
      toast.error("Erro ao salvar nome");
    }
  };

  // Filter campaigns for selected campaign
  const filteredCampaigns = useMemo(() => {
    if (!selectedCampaignId) return campaigns;
    return campaigns.filter(c => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (savedStages && savedStages.length > 0) {
      setStages(savedStages.map(s => ({ name: s.name, metric_key: s.metric_key, sort_order: s.sort_order })));
    } else {
      setStages(DEFAULT_STAGES.map(s => ({ ...s })));
    }
  }, [savedStages]);

  const addStage = () => {
    setStages(prev => [...prev, { name: "Nova Etapa", metric_key: "conversions", sort_order: prev.length }]);
    setEditing(true);
  };

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= stages.length) return;
    setStages(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((s, i) => ({ ...s, sort_order: i }));
    });
  };

  const updateStage = (idx: number, field: "name" | "metric_key", value: string) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        clientId,
        campaignId: selectedCampaignId || null,
        stages,
      });
      setEditing(false);
      toast.success("Funil salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar funil");
    }
  };

  const handleReset = () => {
    setStages(DEFAULT_STAGES.map(s => ({ ...s })));
    setEditing(true);
  };

  // Build visualization data
  const stepsData = stages.map(s => {
    const value = getMetricValue(filteredCampaigns, s.metric_key);
    const cost = getMetricCost(filteredCampaigns, s.metric_key);
    return { ...s, value, cost };
  });

  const maxValue = Math.max(...stepsData.map(s => s.value), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        {titleEditing ? (
          <div className="flex items-center gap-1 flex-1 max-w-md">
            <span className="text-lg">🔻</span>
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") { setTitleDraft(savedTitle); setTitleEditing(false); }
              }}
              className="h-8 text-base font-bold"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
              <Check className="h-3.5 w-3.5 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setTitleDraft(savedTitle); setTitleEditing(false); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2 group">
            <span>🔻 {savedTitle}</span>
            <button
              onClick={() => setTitleEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              title="Editar nome"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </h3>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="text-xs">
            {editing ? "Visualizar" : "Editar"}
          </Button>
          {editing && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1">
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="text-xs gap-1">
                <Save className="h-3 w-3" /> Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {editing ? (
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  value={stage.name}
                  onChange={e => updateStage(i, "name", e.target.value)}
                  className="h-8 text-xs flex-1"
                  placeholder="Nome da etapa"
                />
                <Select value={stage.metric_key} onValueChange={v => updateStage(i, "metric_key", v)}>
                  <SelectTrigger className="h-8 text-xs w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_METRICS.map(m => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => removeStage(i)} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStage} className="w-full text-xs gap-1 mt-2">
              <Plus className="h-3 w-3" /> Adicionar etapa
            </Button>
          </div>
        ) : (
          <div className="space-y-1 max-w-lg mx-auto">
            {stepsData.map((step, i) => {
              const width = Math.max(20, (step.value / maxValue) * 100);
              const prevValue = i > 0 ? stepsData[i - 1].value : 0;
              const rate = prevValue > 0 ? (step.value / prevValue) * 100 : undefined;
              const isBottleneck = rate !== undefined && rate < 2 && step.value > 0;

              return (
                <div key={i} className="flex flex-col items-center">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className={`rounded-lg py-3 px-4 text-center ${isBottleneck ? "bg-red-500/20 border border-red-500/30" : "bg-primary/15 border border-primary/20"}`}
                  >
                    <p className="text-xs font-semibold text-card-foreground">{step.name}</p>
                    <p className="text-lg font-bold text-primary">{step.value.toLocaleString("pt-BR")}</p>
                    {step.cost > 0 && (
                      <p className="text-[10px] text-muted-foreground">{currencySymbol} {step.cost.toFixed(2)} / {step.name.toLowerCase()}</p>
                    )}
                  </motion.div>
                  {i < stepsData.length - 1 && (
                    <div className="flex items-center gap-2 py-0.5">
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      {rate !== undefined && (
                        <span className={`text-[10px] font-medium ${isBottleneck ? "text-red-400" : "text-muted-foreground"}`}>
                          ↓ {rate.toFixed(1)}% {isBottleneck && "⚠️ Gargalo"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
