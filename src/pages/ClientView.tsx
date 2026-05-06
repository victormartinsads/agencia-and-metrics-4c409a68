import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, Eye, Trophy, FileText } from "lucide-react";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunnelAnalysisTab } from "@/components/funnel/FunnelAnalysisTab";
import { CreativeGrid, isCaptacaoSeguidores } from "@/components/dashboard/CreativeGrid";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { useSavedDiagnostics } from "@/hooks/useSavedDiagnostics";
import SavedDiagnosticPublic from "./SavedDiagnosticPublic";

export default function ClientView() {
  const { slug } = useParams<{ slug: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [openDiag, setOpenDiag] = useState<any>(null);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client-view-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, slug, currency_symbol")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const clientId = client?.id;
  const { data: metaData, isLoading: metaLoading } = useMetaAds(clientId, datePreset);
  const { data: diagnostics } = useSavedDiagnostics(clientId || "");

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Visão não encontrada</p>
      </div>
    );
  }

  const campaigns = metaData?.campaigns || [];
  const dailyMetrics = metaData?.dailyMetrics || [];
  const currencySymbol = client.currency_symbol || "R$";
  const eligibleCreatives = campaigns.filter(c => (c.status === "active" || c.spend > 0) && c.creatives.length > 0);
  const captacao = eligibleCreatives.filter(c => isCaptacaoSeguidores(c.name));
  const others = eligibleCreatives.filter(c => !isCaptacaoSeguidores(c.name));

  if (openDiag) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
          <button onClick={() => setOpenDiag(null)} className="text-sm text-primary hover:underline">
            ← Voltar
          </button>
          <span className="text-xs text-muted-foreground">{openDiag.title}</span>
        </div>
        <SavedDiagnosticPublic savedItem={openDiag} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground uppercase truncate">{client.name}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Visão do Cliente • Somente leitura</p>
            </div>
          </div>
          <DateRangePicker value={datePreset} onChange={setDatePreset} />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 md:py-6">
        {metaLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <Tabs defaultValue="funnel" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="funnel"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Análise de Funis</TabsTrigger>
              <TabsTrigger value="diagnostics"><FileText className="h-3.5 w-3.5 mr-1.5" />Diagnósticos</TabsTrigger>
              <TabsTrigger value="creatives"><Trophy className="h-3.5 w-3.5 mr-1.5" />Pódio de Criativos</TabsTrigger>
            </TabsList>

            <TabsContent value="funnel">
              <FunnelAnalysisTab
                clientId={clientId!}
                clientName={client.name}
                campaigns={campaigns}
                dailyMetrics={dailyMetrics}
                datePreset={datePreset}
                currencySymbol={currencySymbol}
                readOnly
              />
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-3">
              {(!diagnostics || diagnostics.length === 0) ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
                  Nenhum diagnóstico salvo disponível.
                </div>
              ) : diagnostics.map((d) => {
                const created = new Date(d.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                });
                return (
                  <button
                    key={d.id}
                    onClick={() => setOpenDiag(d)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-card-foreground truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {d.snapshot?.periodRange || d.date_preset} • {created}
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-primary shrink-0" />
                  </button>
                );
              })}
            </TabsContent>

            <TabsContent value="creatives" className="space-y-6">
              {captacao.length > 0 && (
                <AggregatedCreativeGrid
                  campaigns={captacao}
                  funnelLabel="Captação de Seguidores"
                  clientId={clientId}
                  currencySymbol={currencySymbol}
                  readOnly
                />
              )}
              {others.map(c => (
                <CreativeGrid key={c.id} campaign={c} clientId={clientId} currencySymbol={currencySymbol} readOnly />
              ))}
              {eligibleCreatives.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Nenhum criativo encontrado no período.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Visão do cliente • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </div>
  );
}