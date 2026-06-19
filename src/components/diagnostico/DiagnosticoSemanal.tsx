import { useMemo, useState, useRef, useEffect } from "react";
import { Campaign } from "@/data/mockMetaData";
import { groupCampaignsByFunnel, extractFunnelCode } from "@/lib/funnelGrouping";
import { useWeeklyDiagnostic } from "@/hooks/useWeeklyDiagnostic";
import { useWeeklyNotes } from "@/hooks/useWeeklyNotes";
import { useFunnelLabels } from "@/hooks/useFunnelLabels";
import { DiagnosticoFunnelSection } from "./DiagnosticoFunnelSection";
import { DiagnosticoGoogleFunnelSection } from "./DiagnosticoGoogleFunnelSection";
import { DiagnosticoBloco } from "./DiagnosticoBloco";
import { DiagnosticoPresentMode } from "./DiagnosticoPresentMode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, Loader2, Presentation, ClipboardList, ArrowRight, RefreshCw, Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRefreshMetaAds } from "@/hooks/useMetaAds";
import { getPeriodPair, presetLabel } from "@/lib/period";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useSaveDiagnostic } from "@/hooks/useSavedDiagnostics";
import { useGoogleConnectionStatus, useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { DiagnosticoGoogleCampaignsSection } from "./DiagnosticoGoogleCampaignsSection";
import { SavedDiagnosticsList } from "./SavedDiagnosticsList";
import { supabase } from "@/integrations/supabase/client";
import { GoogleAdsSummaryCard } from "@/components/dashboard/GoogleAdsSummaryCard";
import type { MetricsConfig } from "@/hooks/useDiagnosticMetricsConfig";
import { FunnelPreviewCard } from "@/components/funnel/FunnelPreviewCard";
import { FunnelPremiumDetailDialog } from "@/components/funnel/FunnelPremiumDetailDialog";
import { useManualFunnels, useCreateManualFunnel } from "@/hooks/useManualFunnels";
import { useFunnelPrimaryMetrics } from "@/hooks/useFunnelPrimaryMetric";
import { useAdaptedCampaigns } from "@/hooks/useAdaptedCampaigns";

function formatPeriodRange(preset: string): string {
  const { current } = getPeriodPair(preset);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(current.start)} – ${fmt(current.end)}`;
}

interface Props {
  clientId: string;
  clientName?: string;
  campaigns: Campaign[];
  datePreset: string;
  currencySymbol?: string;
}

const DATE_LABEL = new Proxy({} as Record<string, string>, {
  get: (_t, key: string) => presetLabel(key),
});

export function DiagnosticoSemanal({
  clientId,
  clientName = "Cliente",
  campaigns,
  datePreset,
  currencySymbol = "R$",
}: Props) {
  // Refresh forçado dos dados Meta (bypass cache)
  const refreshMeta = useRefreshMetaAds();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (!clientId) return;
    setRefreshing(true);
    try {
      await refreshMeta(clientId, datePreset);
      toast.success("Dados atualizados da Meta API!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar dados");
    } finally {
      setRefreshing(false);
    }
  };

  const periodRange = useMemo(() => formatPeriodRange(datePreset), [datePreset]);

  const { data: primaryMetrics } = useFunnelPrimaryMetrics(clientId);
  const adaptedCampaigns = useAdaptedCampaigns(campaigns, primaryMetrics);

  // Apenas campanhas com gasto no período
  const activeCampaigns = useMemo(
    () => adaptedCampaigns.filter(c => c.spend > 0),
    [adaptedCampaigns]
  );
  const groups = useMemo(() => groupCampaignsByFunnel(activeCampaigns), [activeCampaigns]);
  const { data: labelMap } = useFunnelLabels(clientId);
  const { data: googleStatus } = useGoogleConnectionStatus(clientId);
  const isGoogleConnected = googleStatus?.connected === true;
  const { data: gaData } = useGoogleAnalytics(clientId, datePreset, isGoogleConnected);
  const { data: gaAdsData } = useGoogleAds(clientId, datePreset, isGoogleConnected);

  // Apenas campanhas Google Ads com gasto ou impressões
  const googleCampaignsList = useMemo(() => {
    return (gaAdsData?.campaigns || [])
      .filter((c) => c.cost > 0 || c.impressions > 0);
  }, [gaAdsData]);

  // Se tem qualquer campanha (Meta ou Google Ads) ativa
  const hasActiveCampaigns = useMemo(() => {
    return activeCampaigns.length > 0 || googleCampaignsList.length > 0;
  }, [activeCampaigns, googleCampaignsList]);

  const { whatWeDid, setWhatWeDid, nextActions, setNextActions, save: saveNotes, saving: savingNotes } =
    useWeeklyNotes(clientId, datePreset);

  const { blocks, updateBlock, generating, generateWithAI, saving } =
    useWeeklyDiagnostic(clientId, datePreset);

  const [presenting, setPresenting] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const [createManualOpen, setCreateManualOpen] = useState(false);
  const [newManualCode, setNewManualCode] = useState("");
  const [newManualLabel, setNewManualLabel] = useState("");
  const [detailManual, setDetailManual] = useState<{ code: string; label: string } | null>(null);
  const { data: manualFunnels } = useManualFunnels(clientId);
  const createManual = useCreateManualFunnel();

  // Salvar snapshot
  const saveDiag = useSaveDiagnostic();
  const [saveOpen, setSaveOpen] = useState(false);
  const defaultTitle = `${clientName} — ${periodRange}`;
  const [saveTitle, setSaveTitle] = useState(defaultTitle);
  useEffect(() => { setSaveTitle(`${clientName} — ${periodRange}`); }, [clientName, periodRange]);

  const handleSaveSnapshot = async () => {
    if (!saveTitle.trim()) { toast.error("Dê um título ao diagnóstico"); return; }
    const { current } = getPeriodPair(datePreset);
    try {
      // Captura a config de métricas (visíveis + manuais) por funil/campanha
      // para que o diagnóstico salvo exiba exatamente o que o gestor editou.
      const { data: cfgRows } = await supabase
        .from("diagnostic_metrics_config")
        .select("group_key, visible_metrics, custom_metrics")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset);
      const metricsConfig: Record<string, MetricsConfig> = {};
      for (const row of (cfgRows || []) as any[]) {
        metricsConfig[row.group_key] = {
          visible_metrics: Array.isArray(row.visible_metrics) ? row.visible_metrics : [],
          custom_metrics: Array.isArray(row.custom_metrics) ? row.custom_metrics : [],
        };
      }

      // Busca os diagnósticos de saúde de funil para o snapshot
      const { data: diagRows } = await supabase
        .from("funnel_diagnostics")
        .select("funnel_code, health_score, diagnostics")
        .eq("client_id", clientId);
      const funnelDiagnostics: Record<string, any> = {};
      for (const row of (diagRows || []) as any[]) {
        funnelDiagnostics[row.funnel_code] = {
          health_score: row.health_score,
          diagnostics: row.diagnostics,
        };
      }

      await saveDiag.mutateAsync({
        client_id: clientId,
        title: saveTitle.trim(),
        date_preset: datePreset,
        period_start: current.start.toISOString().slice(0, 10),
        period_end: current.end.toISOString().slice(0, 10),
        snapshot: {
          campaigns: activeCampaigns,
          blocks,
          whatWeDid,
          nextActions,
          periodRange,
          clientName,
          currencySymbol,
          metricsConfig,
          funnelLabels: labelMap || {},
          googleAnalytics: isGoogleConnected ? gaData : null,
          googleAdsCampaigns: isGoogleConnected ? gaAdsData?.campaigns || [] : null,
          funnelDiagnostics,
        },
      });
      toast.success("Diagnóstico salvo!");
      setSaveOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  // Resumo enviado pra IA
  const summaryForAI = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# Cliente: ${clientName}`);
    lines.push(`Período: ${DATE_LABEL[datePreset] || datePreset}`);
    lines.push("");

    // --- Meta Ads Section ---
    if (activeCampaigns.length > 0) {
      const totals = activeCampaigns.reduce(
        (acc, c) => {
          acc.spend += c.spend;
          acc.impressions += c.impressions;
          acc.clicks += c.clicks;
          acc.conversions += c.conversions;
          acc.purchaseValue += c.purchaseValue || 0;
          return acc;
        },
        { spend: 0, impressions: 0, clicks: 0, conversions: 0, purchaseValue: 0 }
      );
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
      const roas = totals.spend > 0 && totals.purchaseValue > 0 ? totals.purchaseValue / totals.spend : 0;

      lines.push("## Meta Ads: Métricas Globais");
      lines.push(`- Investimento total: ${currencySymbol} ${totals.spend.toFixed(2)}`);
      lines.push(`- Resultados totais: ${totals.conversions}`);
      lines.push(`- CPA médio: ${currencySymbol} ${cpa.toFixed(2)}`);
      lines.push(`- CTR médio: ${ctr.toFixed(2)}%`);
      if (roas > 0) lines.push(`- ROAS: ${roas.toFixed(2)}x`);
      lines.push("");
      lines.push(`### Funis e campanhas ativas Meta (${groups.length})`);

      for (const g of groups) {
        const gSpend = g.campaigns.reduce((s, c) => s + c.spend, 0);
        const gConv = g.campaigns.reduce((s, c) => s + c.conversions, 0);
        const gImp = g.campaigns.reduce((s, c) => s + c.impressions, 0);
        const gClicks = g.campaigns.reduce((s, c) => s + c.clicks, 0);
        const gCtr = gImp > 0 ? (gClicks / gImp) * 100 : 0;
        const gCpa = gConv > 0 ? gSpend / gConv : 0;

        const rawTitle = (() => {
          if (g.isFunnel) {
            const code = extractFunnelCode(g.campaigns[0]?.name);
            return (code && labelMap?.[code]) || g.key;
          } else {
            const campaignId = g.campaigns[0]?.id;
            return (campaignId && labelMap?.[campaignId]) || g.key;
          }
        })();

        const label = g.isFunnel ? `Funil: ${rawTitle}` : `Campanha: ${rawTitle}`;

        lines.push("");
        lines.push(`#### ${label}`);
        lines.push(`- Investimento: ${currencySymbol} ${gSpend.toFixed(2)}`);
        lines.push(`- Resultados: ${gConv}`);
        lines.push(`- CTR: ${gCtr.toFixed(2)}% | CPA: ${currencySymbol} ${gCpa.toFixed(2)}`);

        // Top 3 criativos do grupo
        const allCreatives = g.campaigns.flatMap(c => {
          const customCName = labelMap?.[c.id] || c.name;
          return c.creatives.map(cr => ({ ...cr, _camp: customCName }));
        });
        const top = allCreatives
          .filter(cr => cr.spend > 0 || cr.impressions > 0)
          .sort((a, b) => (b.primaryResult ?? b.conversions) - (a.primaryResult ?? a.conversions) || b.ctr - a.ctr)
          .slice(0, 3);
        if (top.length > 0) {
          lines.push("- Top criativos:");
          for (const cr of top) {
            const r = cr.primaryResult ?? cr.conversions;
            const cCpa = r > 0 ? cr.spend / r : 0;
            lines.push(`  • ${cr.name} (conjunto ${cr.adsetName || "—"}): ${r} resultados, CPA ${currencySymbol} ${cCpa.toFixed(2)}, CTR ${cr.ctr.toFixed(2)}%`);
          }
        }
      }
      lines.push("");
    }

    // --- Google Ads Section ---
    if (googleCampaignsList.length > 0) {
      const gTotals = googleCampaignsList.reduce(
        (acc, c) => {
          acc.cost += c.cost;
          acc.impressions += c.impressions;
          acc.clicks += c.clicks;
          acc.conversions += c.conversions;
          acc.revenue += c.revenue || 0;
          return acc;
        },
        { cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
      );
      const gCtr = gTotals.impressions > 0 ? (gTotals.clicks / gTotals.impressions) * 100 : 0;
      const gCpa = gTotals.conversions > 0 ? gTotals.cost / gTotals.conversions : 0;
      const gRoas = gTotals.cost > 0 && gTotals.revenue > 0 ? gTotals.revenue / gTotals.cost : 0;

      lines.push("## Google Ads: Métricas Globais");
      lines.push(`- Investimento total: ${currencySymbol} ${gTotals.cost.toFixed(2)}`);
      lines.push(`- Resultados totais: ${gTotals.conversions}`);
      lines.push(`- CPA médio: ${currencySymbol} ${gCpa.toFixed(2)}`);
      lines.push(`- CTR médio: ${gCtr.toFixed(2)}%`);
      if (gRoas > 0) lines.push(`- ROAS: ${gRoas.toFixed(2)}x`);
      lines.push("");
      lines.push(`### Campanhas ativas Google Ads (${googleCampaignsList.length})`);

      for (const c of googleCampaignsList) {
        const cTitle = labelMap?.[`google-ads-${c.id}`] || c.name;
        const cCtr = c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0);
        const cCpa = c.conversions > 0 ? c.cost / c.conversions : 0;

        lines.push("");
        lines.push(`#### Campanha: ${cTitle} (${c.type})`);
        lines.push(`- Investimento: ${currencySymbol} ${c.cost.toFixed(2)}`);
        lines.push(`- Resultados: ${c.conversions}`);
        lines.push(`- CTR: ${cCtr.toFixed(2)}% | CPA: ${currencySymbol} ${cCpa.toFixed(2)}`);

        // Top keywords (Search)
        if (c.type === "SEARCH" && c.keywords && c.keywords.length > 0) {
          lines.push("- Top Palavras-Chave:");
          for (const kw of c.keywords.slice(0, 5)) {
            lines.push(`  • "${kw.text}" (${kw.matchType}): ${kw.conversions} conv, CPA ${currencySymbol} ${(kw.conversions > 0 ? kw.cost / kw.conversions : 0).toFixed(2)}, cost ${currencySymbol} ${kw.cost.toFixed(2)}`);
          }
        }
        // Top creatives (Display/Video/PMax)
        if (c.creatives && c.creatives.length > 0) {
          lines.push("- Top Criativos:");
          for (const cr of c.creatives.slice(0, 3)) {
            lines.push(`  • ${cr.name} (${cr.youtubeVideoId ? 'Vídeo YouTube' : 'Imagem'}): ${cr.conversions} conv, clicks ${cr.clicks}, cost ${currencySymbol} ${cr.cost.toFixed(2)}`);
          }
        }
      }
      lines.push("");
    }

    lines.push("## Anotações do gestor");
    lines.push(`### O que fizemos esta semana\n${whatWeDid || "(sem anotações)"}`);
    lines.push("");
    lines.push(`### Próximas ações planejadas\n${nextActions || "(sem anotações)"}`);

    return lines.join("\n");
  }, [activeCampaigns, googleCampaignsList, groups, whatWeDid, nextActions, clientName, datePreset, currencySymbol, labelMap]);

  const handleGenerateAI = () => {
    if (!hasActiveCampaigns) {
      toast.error("Sem campanhas com gasto no período para analisar.");
      return;
    }
    generateWithAI(summaryForAI);
  };

  const handleCreateManual = async () => {
    const code = newManualCode.trim().toUpperCase();
    const label = newManualLabel.trim();
    if (!code || !label) {
      toast.error("Informe código e nome");
      return;
    }
    try {
      await createManual.mutateAsync({ client_id: clientId, code, label });
      toast.success("Funil manual criado");
      setNewManualCode("");
      setNewManualLabel("");
      setCreateManualOpen(false);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Já existe um funil com esse código" : "Erro ao criar funil");
    }
  };

  // ESC fecha apresentação
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPresenting(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting]);

  return (
    <>
      <Tabs defaultValue="atual" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="atual">Como estamos agora</TabsTrigger>
            <TabsTrigger value="salvos" className="gap-1"><Archive className="h-3.5 w-3.5" /> Diagnósticos salvos</TabsTrigger>
          </TabsList>
          {hasActiveCampaigns && (
            <div className="flex flex-wrap items-center gap-1">
              <Button onClick={handleRefresh} disabled={refreshing} variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Atualizar
              </Button>
              <Button onClick={handleGenerateAI} disabled={generating} variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                IA
              </Button>
              <Button onClick={() => setPresenting(true)} variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Presentation className="h-3.5 w-3.5" /> Apresentar
              </Button>
              <Button onClick={() => setCreateManualOpen(true)} variant="outline" size="sm" className="h-8 px-3 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Funil manual
              </Button>
              <Button onClick={() => setSaveOpen(true)} size="sm" className="h-8 px-3 gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="salvos">
          <SavedDiagnosticsList clientId={clientId} clientName={clientName} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="atual" className="space-y-6">
          <GoogleAdsSummaryCard clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
          {!hasActiveCampaigns ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              Nenhuma campanha com gasto nos {DATE_LABEL[datePreset] || datePreset}.
            </div>
          ) : (<>
      {/* Compact header — buttons moved next to the tabs above */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-base font-bold text-card-foreground">
            Como Estamos — {periodRange}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {clientName} • {DATE_LABEL[datePreset] || datePreset} • {groups.length} funil(s)/campanha(s) ativos
            {saving && <span className="ml-2 text-primary">• salvando...</span>}
          </p>
        </div>
      </div>

      {/* Documento (vai pro PDF e pra apresentação) */}
      <div ref={docRef} className="space-y-6 mt-6 bg-background p-2">
        {/* Capa */}
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Como Estamos — {periodRange}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mt-2">{clientName}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {DATE_LABEL[datePreset] || datePreset} • {periodRange}
          </p>
        </section>

        {/* Anotações do gestor */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-card-foreground">📝 Anotações do gestor</h3>
            <Button onClick={saveNotes} disabled={savingNotes} size="sm" variant="outline" className="gap-2">
              {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <ClipboardList className="h-4 w-4 text-primary" /> O que fizemos esta semana
              </div>
              <Textarea
                value={whatWeDid}
                onChange={e => setWhatWeDid(e.target.value)}
                placeholder="Ex: Subimos 3 novos criativos UGC, ajustamos público da campanha X, pausamos conjunto Y..."
                className="min-h-[140px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <ArrowRight className="h-4 w-4 text-primary" /> Próximas ações planejadas
              </div>
              <Textarea
                value={nextActions}
                onChange={e => setNextActions(e.target.value)}
                placeholder="Ex: Escalar criativo X, testar nova oferta Y, gravar UGC Z..."
                className="min-h-[140px] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Funis manuais */}
        {(manualFunnels || []).length > 0 && (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-bold text-card-foreground">Funis Manuais</h3>
                <p className="text-xs text-muted-foreground">
                  Os valores editados aqui sincronizam com a aba Análise de Funis.
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateManualOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Novo funil manual
              </Button>
            </div>
            <div className="space-y-4">
              {(manualFunnels || []).map((m) => (
                <FunnelPreviewCard
                  key={m.id}
                  clientId={clientId}
                  funnelCode={m.code}
                  funnelLabel={m.label}
                  campaigns={[]}
                  currencySymbol={currencySymbol}
                  datePreset={datePreset}
                  isManual
                  manualId={m.id}
                  onOpenDetail={() => setDetailManual({ code: m.code, label: m.label })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Funis / Campanhas */}
        <div className="space-y-6">
          <DiagnosticoGoogleFunnelSection clientId={clientId} datePreset={datePreset} />
          <DiagnosticoGoogleCampaignsSection clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
          {groups.map(g => (
            <DiagnosticoFunnelSection
              key={g.key + (g.isFunnel ? "" : "-c")}
              group={g}
              clientId={clientId}
              currencySymbol={currencySymbol}
              datePreset={datePreset}
            />
          ))}
        </div>

        {/* Diagnóstico final em 4 blocos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-card-foreground">🎯 Diagnóstico Final</h3>
          </div>
          <div className="max-w-3xl">
            <DiagnosticoBloco
              title="Pedidos ao cliente"
              emoji="🤝"
              accentClass="border-amber-500/30 bg-amber-500/5"
              value={blocks.client_requests}
              onChange={v => updateBlock("client_requests", v)}
              placeholder="O que precisamos do cliente para destravar (depoimentos, oferta, validação)..."
            />
          </div>
        </section>
      </div>
          </>)}
        </TabsContent>
      </Tabs>

      {presenting && (
        <DiagnosticoPresentMode
          clientName={clientName}
          datePreset={DATE_LABEL[datePreset] || datePreset}
          periodRange={periodRange}
          datePresetKey={datePreset}
          groups={groups}
          manualFunnels={manualFunnels || []}
          blocks={blocks}
          whatWeDid={whatWeDid}
          nextActions={nextActions}
          currencySymbol={currencySymbol}
          onClose={() => setPresenting(false)}
          clientId={clientId}
          googleAnalyticsData={gaData || null}
          googleAdsCampaigns={gaAdsData?.campaigns || []}
        />
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar este diagnóstico</DialogTitle>
            <DialogDescription>
              Cria uma versão arquivada do diagnóstico atual ({periodRange}). Você pode revisitá-lo depois na aba "Diagnósticos salvos".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Título</label>
            <Input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="Ex: Semana 01–07/05" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSnapshot} disabled={saveDiag.isPending} className="gap-2">
              {saveDiag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detailManual && (
        <FunnelPremiumDetailDialog
          open={!!detailManual}
          onClose={() => setDetailManual(null)}
          clientId={clientId}
          funnelCode={detailManual.code}
          funnelLabel={detailManual.label}
          campaigns={[]}
          currencySymbol={currencySymbol}
          datePreset={datePreset}
          isManual
        />
      )}

      <Dialog open={createManualOpen} onOpenChange={setCreateManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo funil manual</DialogTitle>
            <DialogDescription>
              Crie um funil 100% manual para preencher dados como Google Ads e editar métricas no lápis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-card-foreground">Código curto</label>
              <Input
                value={newManualCode}
                onChange={(e) => setNewManualCode(e.target.value.toUpperCase())}
                placeholder="GADS"
                maxLength={12}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Identificador único (ex.: GADS, PMAX, SEARCH).</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-card-foreground">Nome de exibição</label>
              <Input
                value={newManualLabel}
                onChange={(e) => setNewManualLabel(e.target.value)}
                placeholder="Google Ads — Performance Max"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateManualOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateManual} disabled={createManual.isPending}>Criar funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
