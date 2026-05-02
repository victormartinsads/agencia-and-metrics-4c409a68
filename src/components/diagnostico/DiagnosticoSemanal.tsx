import { useMemo, useState, useRef, useEffect } from "react";
import { Campaign } from "@/data/mockMetaData";
import { groupCampaignsByFunnel } from "@/lib/funnelGrouping";
import { useWeeklyDiagnostic } from "@/hooks/useWeeklyDiagnostic";
import { useWeeklyNotes } from "@/hooks/useWeeklyNotes";
import { DiagnosticoFunnelSection } from "./DiagnosticoFunnelSection";
import { DiagnosticoBloco } from "./DiagnosticoBloco";
import { DiagnosticoPresentMode } from "./DiagnosticoPresentMode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save, Loader2, Presentation, ClipboardList, ArrowRight, RefreshCw, Archive } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRefreshMetaAds } from "@/hooks/useMetaAds";
import { getPeriodPair, presetLabel } from "@/lib/period";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useSaveDiagnostic } from "@/hooks/useSavedDiagnostics";
import { SavedDiagnosticsList } from "./SavedDiagnosticsList";

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

  // Apenas campanhas com gasto no período
  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.spend > 0),
    [campaigns]
  );
  const groups = useMemo(() => groupCampaignsByFunnel(activeCampaigns), [activeCampaigns]);

  const { whatWeDid, setWhatWeDid, nextActions, setNextActions, save: saveNotes, saving: savingNotes } =
    useWeeklyNotes(clientId, datePreset);

  const { blocks, updateBlock, generating, generateWithAI, saving } =
    useWeeklyDiagnostic(clientId, datePreset);

  const [presenting, setPresenting] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

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

    const lines: string[] = [];
    lines.push(`# Cliente: ${clientName}`);
    lines.push(`Período: ${DATE_LABEL[datePreset] || datePreset}`);
    lines.push("");
    lines.push("## Métricas globais");
    lines.push(`- Investimento total: ${currencySymbol} ${totals.spend.toFixed(2)}`);
    lines.push(`- Resultados totais: ${totals.conversions}`);
    lines.push(`- CPA médio: ${currencySymbol} ${cpa.toFixed(2)}`);
    lines.push(`- CTR médio: ${ctr.toFixed(2)}%`);
    if (roas > 0) lines.push(`- ROAS: ${roas.toFixed(2)}x`);
    lines.push("");
    lines.push(`## Funis e campanhas ativas (${groups.length})`);

    for (const g of groups) {
      const gSpend = g.campaigns.reduce((s, c) => s + c.spend, 0);
      const gConv = g.campaigns.reduce((s, c) => s + c.conversions, 0);
      const gImp = g.campaigns.reduce((s, c) => s + c.impressions, 0);
      const gClicks = g.campaigns.reduce((s, c) => s + c.clicks, 0);
      const gCtr = gImp > 0 ? (gClicks / gImp) * 100 : 0;
      const gCpa = gConv > 0 ? gSpend / gConv : 0;
      const label = g.isFunnel ? `Funil: ${g.key}` : `Campanha: ${g.key}`;

      lines.push("");
      lines.push(`### ${label}`);
      lines.push(`- Investimento: ${currencySymbol} ${gSpend.toFixed(2)}`);
      lines.push(`- Resultados: ${gConv}`);
      lines.push(`- CTR: ${gCtr.toFixed(2)}% | CPA: ${currencySymbol} ${gCpa.toFixed(2)}`);

      // Top 3 criativos do grupo
      const allCreatives = g.campaigns.flatMap(c =>
        c.creatives.map(cr => ({ ...cr, _camp: c.name }))
      );
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
    lines.push("## Anotações do gestor");
    lines.push(`### O que fizemos esta semana\n${whatWeDid || "(sem anotações)"}`);
    lines.push("");
    lines.push(`### Próximas ações planejadas\n${nextActions || "(sem anotações)"}`);

    return lines.join("\n");
  }, [activeCampaigns, groups, whatWeDid, nextActions, clientName, datePreset, currencySymbol]);

  const handleGenerateAI = () => {
    if (activeCampaigns.length === 0) {
      toast.error("Sem campanhas com gasto no período para analisar.");
      return;
    }
    generateWithAI(summaryForAI);
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
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="atual">Como estamos agora</TabsTrigger>
          <TabsTrigger value="salvos" className="gap-1"><Archive className="h-3.5 w-3.5" /> Diagnósticos salvos</TabsTrigger>
        </TabsList>

        <TabsContent value="salvos">
          <SavedDiagnosticsList clientId={clientId} clientName={clientName} currencySymbol={currencySymbol} />
        </TabsContent>

        <TabsContent value="atual" className="space-y-6">
          {activeCampaigns.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              Nenhuma campanha com gasto nos {DATE_LABEL[datePreset] || datePreset}.
            </div>
          ) : (<>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sticky top-0 z-20">
        <div>
          <h2 className="text-lg font-bold text-card-foreground">
            📊 Como Estamos — {periodRange}
          </h2>
          <p className="text-xs text-muted-foreground">
            {clientName} • {DATE_LABEL[datePreset] || datePreset} • {groups.length} funil(s)/campanha(s) ativos
            {saving && <span className="ml-2 text-primary">• salvando...</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="gap-2">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {refreshing ? "Atualizando..." : "Atualizar dados"}
          </Button>
          <Button onClick={handleGenerateAI} disabled={generating} size="sm" className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Gerando..." : "Gerar diagnóstico com IA"}
          </Button>
          <Button onClick={() => setPresenting(true)} variant="outline" size="sm" className="gap-2">
            <Presentation className="h-4 w-4" /> Apresentar
          </Button>
          <Button onClick={() => setSaveOpen(true)} size="sm" className="gap-2" variant="default">
            <Save className="h-4 w-4" /> Salvar diagnóstico
          </Button>
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

        {/* Funis / Campanhas */}
        <div className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiagnosticoBloco
              title="O que foi positivo"
              emoji="✅"
              accentClass="border-green-500/30 bg-green-500/5"
              value={blocks.positives}
              onChange={v => updateBlock("positives", v)}
              placeholder="Resultados que melhoraram, criativos vencedores, funis saudáveis..."
            />
            <DiagnosticoBloco
              title="O que foi negativo"
              emoji="⚠️"
              accentClass="border-red-500/30 bg-red-500/5"
              value={blocks.negatives}
              onChange={v => updateBlock("negatives", v)}
              placeholder="Quedas de CTR, CPA alto, criativos com fadiga..."
            />
            <DiagnosticoBloco
              title="Ações do gestor"
              emoji="🛠️"
              accentClass="border-blue-500/30 bg-blue-500/5"
              value={blocks.manager_actions}
              onChange={v => updateBlock("manager_actions", v)}
              placeholder="O que vou executar nos próximos dias para destravar resultados..."
            />
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
          blocks={blocks}
          whatWeDid={whatWeDid}
          nextActions={nextActions}
          currencySymbol={currencySymbol}
          onClose={() => setPresenting(false)}
          clientId={clientId}
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
    </>
  );
}
