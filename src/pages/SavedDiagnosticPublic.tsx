import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { groupCampaignsByFunnel, extractFunnelCode } from "@/lib/funnelGrouping";
import { DiagnosticoPresentMode } from "@/components/diagnostico/DiagnosticoPresentMode";
import { AVAILABLE_METRICS, formatCustomValue, type MetricsConfig } from "@/hooks/useDiagnosticMetricsConfig";
import { aggregateCampaignMetrics, formatMetricValue } from "@/lib/metaMetrics";
import { findMetricDef, getMetricValue } from "@/lib/metaMetricCatalog";
import { DiagnosticoGoogleFunnelSection } from "@/components/diagnostico/DiagnosticoGoogleFunnelSection";
import { DiagnosticoGoogleCampaignsSection } from "@/components/diagnostico/DiagnosticoGoogleCampaignsSection";
import { FunnelHealthDiagnosticPanel } from "@/components/funnel/FunnelHealthDiagnosticPanel";

export default function SavedDiagnosticPublic({ savedItem }: { savedItem?: any } = {}) {
  const { id } = useParams<{ id: string }>();
  const [presenting, setPresenting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-saved-diagnostic", savedItem?.id || id],
    queryFn: async () => {
      let d: any = savedItem;
      if (!d) {
        const { data: diag, error } = await supabase
          .from("saved_diagnostics" as any)
          .select("*")
          .eq("id", id!)
          .maybeSingle();
        if (error) throw error;
        if (!diag) return null;
        d = diag;
      }
      const { data: client } = await supabase
        .from("clients")
        .select("name, currency_symbol")
        .eq("id", d.client_id)
        .maybeSingle();
      return { diag: d, client };
    },
    enabled: !!(savedItem || id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || !data.diag) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Diagnóstico não encontrado.</p>
      </div>
    );
  }

  const item = data.diag;
  const clientName = (data.client?.name || "Cliente").toUpperCase();
  const currencySymbol = data.client?.currency_symbol || "R$";
  const snap = item.snapshot || {};
  const campaigns = snap.campaigns || [];
  const groups = groupCampaignsByFunnel(campaigns);
  const blocks = snap.blocks || { positives: "", negatives: "", manager_actions: "", client_requests: "" };
  const whatWeDid = snap.whatWeDid || "";
  const periodRange = snap.periodRange || item.date_preset;
  const metricsConfig: Record<string, MetricsConfig> = snap.metricsConfig || {};
  const funnelLabels = snap.funnelLabels || {};

  const fmtMoney = (v: number) =>
    `${currencySymbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 flex items-center justify-end px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
        <Button size="sm" variant="default" className="gap-2" onClick={() => setPresenting(true)}>
          <Presentation className="h-4 w-4" /> Apresentar
        </Button>
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Como Estamos — {periodRange}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mt-2">{clientName}</h1>
          <p className="text-sm text-muted-foreground mt-2">{item.title}</p>
        </section>

        {whatWeDid && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-card-foreground">📝 Anotações do gestor</h3>
            <div>
              <div className="text-sm font-semibold text-primary mb-2">O que fizemos</div>
              <pre className="whitespace-pre-wrap text-sm text-card-foreground font-sans leading-relaxed">{whatWeDid}</pre>
            </div>
          </section>
        )}

        {snap.googleAnalytics && (
          <div className="space-y-4">
            <DiagnosticoGoogleFunnelSection gaData={snap.googleAnalytics} />
          </div>
        )}

        {snap.googleAdsCampaigns && snap.googleAdsCampaigns.length > 0 && (
          <div className="space-y-4">
            <DiagnosticoGoogleCampaignsSection
              campaigns={snap.googleAdsCampaigns}
              currencySymbol={currencySymbol}
              groupConfigs={metricsConfig}
              funnelLabels={funnelLabels}
            />
          </div>
        )}

        {groups.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-card-foreground">📊 Funis e campanhas</h3>
            {groups.map(g => {
              const totals = aggregateCampaignMetrics(g.campaigns);
              const resultLabel = g.campaigns.find((c: any) => c.primaryResultLabel)?.primaryResultLabel || "Resultados";
              const cfg = metricsConfig[g.key];
              
              const getMetricValueAndOverride = (key: string) => {
                const override = cfg?.custom_metrics?.find((m) => m.id === key);
                const isOverridden = !!override;
                const originalRaw = getMetricValue(totals, key);
                const rawValue = isOverridden ? Number(String(override.value).replace(",", ".")) : originalRaw;
                const value = isOverridden
                  ? (override.format === "text" ? override.value : formatMetricValue(key, rawValue, currencySymbol))
                  : formatMetricValue(key, originalRaw, currencySymbol);
                return { value, isOverridden };
              };

              const getCurrentRawValue = (key: string) => {
                const override = cfg?.custom_metrics?.find((m) => m.id === key);
                if (override) return Number(String(override.value).replace(",", "."));
                return getMetricValue(totals, key);
              };

              const labelOf = (key: string) =>
                key === "conversions"
                  ? resultLabel
                  : findMetricDef(key)?.label || AVAILABLE_METRICS.find(m => m.key === key)?.label || key;
              const customGroupTitle = (() => {
                if (g.isFunnel) {
                  const code = extractFunnelCode(g.campaigns[0]?.name);
                  return (code && funnelLabels[code]) || g.key;
                } else {
                  const campaignId = g.campaigns[0]?.id;
                  return (campaignId && funnelLabels[campaignId]) || g.key;
                }
              })();

              return (
                <div key={g.key} className="rounded-xl border border-border bg-card p-5">
                  <h4 className="text-base font-bold text-card-foreground">
                    {g.isFunnel ? `Funil: ${customGroupTitle}` : customGroupTitle}
                  </h4>
                  {cfg ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                      {cfg.visible_metrics.map(k => (
                        <Mini key={k} label={labelOf(k)} value={getMetricValueAndOverride(k).value} />
                      ))}
                      {cfg.custom_metrics
                        .filter(m => !AVAILABLE_METRICS.some(am => am.key === m.id))
                        .map(m => (
                          <Mini key={m.id} label={`✦ ${m.label}`} value={formatCustomValue(m, currencySymbol)} />
                        ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <Mini label="Investimento" value={getMetricValueAndOverride("spend").value} />
                      <Mini label={resultLabel} value={getMetricValueAndOverride("conversions").value} />
                      <Mini label="CPA" value={getMetricValueAndOverride("cpa").value} />
                      <Mini label="CTR" value={getMetricValueAndOverride("ctr").value} />
                    </div>
                  )}

                  {/* Funnel Health & Diagnostics */}
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <FunnelHealthDiagnosticPanel
                      clientId=""
                      funnelCode={g.isFunnel ? (extractFunnelCode(g.campaigns[0]?.name) || g.key) : (g.campaigns[0]?.id || g.key)}
                      readOnly={true}
                      snapshotData={snap.funnelDiagnostics?.[g.isFunnel ? (extractFunnelCode(g.campaigns[0]?.name) || g.key) : (g.campaigns[0]?.id || g.key)]}
                      liveCampaignMetrics={{
                        hookRate: getCurrentRawValue("hookRate"),
                        holdRate: getCurrentRawValue("holdRate"),
                        linkCtr: getCurrentRawValue("linkCtr"),
                        avgVideoTime: getCurrentRawValue("avgVideoTime"),
                        costPerPlay: (getCurrentRawValue("videoPlays") || getCurrentRawValue("thruplays")) > 0
                          ? getCurrentRawValue("spend") / (getCurrentRawValue("videoPlays") || getCurrentRawValue("thruplays"))
                          : 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-card-foreground">🎯 Diagnóstico Final</h3>
          <div className="max-w-3xl">
            <Block title="Pedidos ao cliente" emoji="🤝" accent="border-amber-500/30 bg-amber-500/5" value={blocks.client_requests} />
          </div>
        </section>
      </div>
      {presenting && (
        <DiagnosticoPresentMode
          clientName={clientName}
          datePreset={periodRange}
          periodRange={periodRange}
          groups={groups}
          blocks={blocks}
          whatWeDid={whatWeDid}
          nextActions=""
          currencySymbol={currencySymbol}
          onClose={() => setPresenting(false)}
          groupConfigs={metricsConfig}
          funnelLabels={funnelLabels}
          googleAnalyticsData={snap.googleAnalytics}
          googleAdsCampaigns={snap.googleAdsCampaigns}
          publicMode
          funnelDiagnostics={snap.funnelDiagnostics}
        />
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-bold text-card-foreground">{value}</div>
    </div>
  );
}

function Block({ title, emoji, accent, value }: { title: string; emoji: string; accent: string; value: string }) {
  const empty = !value?.trim();
  return (
    <div className={`rounded-xl border ${accent} p-5 space-y-2`}>
      <h4 className="text-base font-bold text-card-foreground flex items-center gap-2">
        <span className="text-xl">{emoji}</span> {title}
      </h4>
      {empty ? (
        <p className="text-sm text-muted-foreground italic">Sem conteúdo neste bloco.</p>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none text-card-foreground prose-p:my-2 prose-li:my-1">
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}