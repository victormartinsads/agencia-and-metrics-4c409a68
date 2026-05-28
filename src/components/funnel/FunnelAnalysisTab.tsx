import { useMemo, useState } from "react";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { extractFunnelCode, FUNNEL_DEFINITIONS } from "@/lib/funnelGrouping";
import { FunnelPreviewCard } from "@/components/funnel/FunnelPreviewCard";
import { FunnelPremiumDetailDialog } from "@/components/funnel/FunnelPremiumDetailDialog";
import { FunnelChatWidget } from "@/components/funnel/FunnelChatWidget";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { GoogleAdsSummaryCard } from "@/components/dashboard/GoogleAdsSummaryCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useManualFunnels, useCreateManualFunnel } from "@/hooks/useManualFunnels";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { googleAdsToCampaign } from "@/lib/googleAdsAdapter";
import { toast } from "sonner";

interface Props {
  clientId: string;
  clientName?: string;
  campaigns: Campaign[];
  dailyMetrics: DailyMetric[];
  datePreset: string;
  currencySymbol?: string;
  readOnly?: boolean;
}

export function FunnelAnalysisTab({
  clientId,
  clientName = "",
  campaigns,
  datePreset,
  currencySymbol = "R$",
  readOnly = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [detailFunnel, setDetailFunnel] = useState<{ code: string; label: string; isManual?: boolean; campaigns?: Campaign[] } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [viewMode, setViewMode] = useState<"funnel" | "campaign">("funnel");
  const [source, setSource] = useState<"meta" | "google" | "all">("meta");
  const { data: manualFunnels } = useManualFunnels(clientId);
  const createManual = useCreateManualFunnel();
  const { data: googleData } = useGoogleAds(clientId, datePreset, source !== "meta");

  const googleCampaigns: Campaign[] = useMemo(() => {
    if (!googleData?.campaigns) return [];
    return googleData.campaigns.map(googleAdsToCampaign);
  }, [googleData]);

  function buildFunnelGroups(items: Campaign[], codePrefix = ""): { code: string; label: string; campaigns: Campaign[] }[] {
    const map = new Map<string, Campaign[]>();
    for (const c of items) {
      const code = extractFunnelCode(c.name);
      if (!code && c.spend <= 0) continue;
      const fallbackCode = code || `CAMP-${c.id}`;
      const arr = map.get(fallbackCode) || [];
      arr.push(c);
      map.set(fallbackCode, arr);
    }
    const ordered = FUNNEL_DEFINITIONS.filter((d) => map.has(d.code)).map((d) => ({
      code: codePrefix + d.code,
      label: d.label,
      campaigns: map.get(d.code) || [],
    }));
    const fallback = Array.from(map.entries())
      .filter(([key]) => !FUNNEL_DEFINITIONS.some((d) => d.code === key))
      .map(([key, list]) => ({
        code: codePrefix + key,
        label: list[0]?.name || key,
        campaigns: list,
      }))
      .sort((a, b) => b.campaigns.reduce((s, c) => s + c.spend, 0) - a.campaigns.reduce((s, c) => s + c.spend, 0));
    return [...ordered, ...fallback];
  }

  const metaFunnelGroups = useMemo(() => buildFunnelGroups(campaigns), [campaigns]);
  const googleFunnelGroups = useMemo(() => buildFunnelGroups(googleCampaigns, "GADS-"), [googleCampaigns]);

  function buildCampaignCards(items: Campaign[], codePrefix = ""): { code: string; label: string; campaigns: Campaign[] }[] {
    return items
      .filter((c) => (c.spend || 0) > 0)
      .sort((a, b) => b.spend - a.spend)
      .map((c) => ({ code: `${codePrefix}CAMP-${c.id}`, label: c.name, campaigns: [c] }));
  }

  const metaCampaignCards = useMemo(() => buildCampaignCards(campaigns), [campaigns]);
  const googleCampaignCards = useMemo(() => buildCampaignCards(googleCampaigns, "GADS-"), [googleCampaigns]);

  const metaActive = useMemo(
    () => (viewMode === "funnel" ? metaFunnelGroups : metaCampaignCards).filter((g) => g.campaigns.some((c) => (c.spend || 0) > 0)),
    [viewMode, metaFunnelGroups, metaCampaignCards],
  );
  const googleActive = useMemo(
    () => (viewMode === "funnel" ? googleFunnelGroups : googleCampaignCards).filter((g) => g.campaigns.some((c) => (c.spend || 0) > 0)),
    [viewMode, googleFunnelGroups, googleCampaignCards],
  );

  const filterFn = (g: { code: string; label: string }) =>
    !search ||
    g.code.toLowerCase().includes(search.toLowerCase()) ||
    g.label.toLowerCase().includes(search.toLowerCase());

  const filteredMeta = source === "google" ? [] : metaActive.filter(filterFn);
  const filteredGoogle = source === "meta" ? [] : googleActive.filter(filterFn);

  const filteredManual = viewMode === "campaign" ? [] : (manualFunnels || []).filter(
    (g) =>
      !search ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.label.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    const label = newLabel.trim();
    if (!code || !label) { toast.error("Informe código e nome"); return; }
    try {
      await createManual.mutateAsync({ client_id: clientId, code, label });
      toast.success("Funil manual criado");
      setNewCode(""); setNewLabel(""); setCreateOpen(false);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Já existe um funil com esse código" : "Erro ao criar funil");
    }
  };

  return (
    <div className="space-y-5 relative">
      <GoogleAdsSummaryCard clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
      {/* Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold">Análise por Funil</h2>
          <p className="text-xs text-muted-foreground">
            Cada card mostra as métricas relevantes do funil. Personalize com o ⚙️, edite valores no lápis ou crie um funil manual (ex.: Google Ads).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden text-xs">
            <button
              onClick={() => setViewMode("funnel")}
              className={`px-2.5 h-8 ${viewMode === "funnel" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
            >Por Funil</button>
            <button
              onClick={() => setViewMode("campaign")}
              className={`px-2.5 h-8 border-l border-border/60 ${viewMode === "campaign" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
            >Por Campanha</button>
          </div>
          <div className="inline-flex rounded-md border border-border/60 overflow-hidden text-xs">
            {(["meta", "google", "all"] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-2.5 h-8 ${i > 0 ? "border-l border-border/60" : ""} ${source === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
              >{s === "meta" ? "Meta" : s === "google" ? "Google" : "Todos"}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar funil…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo funil manual
            </Button>
          )}
        </div>
      </div>

      {/* Funnel previews — mesmo padrão visual da Visão Geral */}
      {filteredMeta.length === 0 && filteredGoogle.length === 0 && filteredManual.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum {viewMode === "funnel" ? "funil" : "campanha"} ativo com gasto encontrado para esse período.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Você pode criar um funil 100% manual (ex.: Google Ads) usando o botão acima.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredMeta.length > 0 && (
            <div className="space-y-4">
              {source === "all" && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Meta Ads</p>
              )}
              {filteredMeta.map((g) => (
                <FunnelPreviewCard
                  key={g.code}
                  clientId={clientId}
                  funnelCode={g.code}
                  funnelLabel={g.label}
                  campaigns={g.campaigns}
                  currencySymbol={currencySymbol}
                  readOnly={readOnly}
                  datePreset={datePreset}
                  onOpenDetail={() => setDetailFunnel({ code: g.code, label: g.label, campaigns: g.campaigns })}
                />
              ))}
            </div>
          )}
          {filteredGoogle.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Google Ads</p>
              {filteredGoogle.map((g) => (
                <FunnelPreviewCard
                  key={g.code}
                  clientId={clientId}
                  funnelCode={g.code}
                  funnelLabel={g.label}
                  campaigns={g.campaigns}
                  currencySymbol={currencySymbol}
                  readOnly={readOnly}
                  datePreset={datePreset}
                  onOpenDetail={() => setDetailFunnel({ code: g.code, label: g.label, campaigns: g.campaigns })}
                />
              ))}
            </div>
          )}
          {filteredManual.map((m) => (
            <FunnelPreviewCard
              key={m.id}
              clientId={clientId}
              funnelCode={m.code}
              funnelLabel={m.label}
              campaigns={[]}
              currencySymbol={currencySymbol}
              readOnly={readOnly}
              datePreset={datePreset}
              isManual
              manualId={m.id}
              onOpenDetail={() => setDetailFunnel({ code: m.code, label: m.label, isManual: true })}
            />
          ))}
        </div>
      )}

      {detailFunnel && (
        <FunnelPremiumDetailDialog
          open={!!detailFunnel}
          onClose={() => setDetailFunnel(null)}
          clientId={clientId}
          funnelCode={detailFunnel.code}
          funnelLabel={detailFunnel.label}
          campaigns={detailFunnel.isManual ? [] : (detailFunnel.campaigns || [])}
          currencySymbol={currencySymbol}
          datePreset={datePreset}
          readOnly={readOnly}
          isManual={detailFunnel.isManual}
        />
      )}

      {/* Floating AI chat */}
      {!readOnly && (<FunnelChatWidget
        clientId={clientId}
        clientName={clientName}
        campaigns={campaigns}
        datePreset={datePreset}
        currencySymbol={currencySymbol}
      />)}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo funil manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Código curto</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="GADS"
                maxLength={12}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Identificador único do funil (ex.: GADS, ORG, OUTROS).</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome de exibição</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Google Ads — Performance Max"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createManual.isPending}>Criar funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
