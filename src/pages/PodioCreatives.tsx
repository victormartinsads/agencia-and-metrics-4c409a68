import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Trophy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/hooks/useClients";
import { useMetaAds, useRefreshMetaAds } from "@/hooks/useMetaAds";
import { CreativeGrid, isCaptacaoSeguidores } from "@/components/dashboard/CreativeGrid";
import { AggregatedCreativeGrid } from "@/components/dashboard/AggregatedCreativeGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupCampaignsByFunnel } from "@/lib/funnelGrouping";
import { friendlyError } from "@/lib/friendlyError";

const DATE_PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_3d", label: "Últimos 3 dias" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

export default function PodioCreatives() {
  const { slug } = useParams<{ slug: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [refreshing, setRefreshing] = useState(false);
  const refreshMetaAds = useRefreshMetaAds();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client-by-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, slug, currency_symbol")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data as Pick<Client, "id" | "name" | "slug" | "currency_symbol">;
    },
    enabled: !!slug,
  });

  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds(client?.id, datePreset);

  const handleRefresh = async () => {
    if (!client?.id || refreshing) return;
    setRefreshing(true);
    try {
      await refreshMetaAds(client.id, datePreset);
      toast.success("Dados atualizados!");
    } catch (e: any) {
      toast.error("Erro ao atualizar", { description: friendlyError(e) });
    } finally {
      setRefreshing(false);
    }
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Dashboard não encontrado</p>
      </div>
    );
  }

  const campaigns = metaData?.campaigns || [];
  const campaignsWithCreatives = campaigns
    .filter((c) => c.creatives && c.creatives.length > 0 && c.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase">{client.name}</h1>
              <p className="text-xs text-muted-foreground">Ranking de Criativos • Meta Ads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || metaLoading}
              className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Forçar atualização dos dados (ignora cache)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {metaLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {metaError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center"
          >
            <p className="text-sm text-destructive">{friendlyError(metaError, "Erro ao carregar dados dos criativos")}</p>
          </motion.div>
        )}

        {!metaLoading && metaData?.accountErrors && metaData.accountErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2"
          >
            <p className="text-sm font-semibold text-yellow-400">⚠️ Problemas de acesso à Meta Ads</p>
            {metaData.accountErrors.map((e, i) => (
              <p key={i} className="text-xs text-yellow-200/80">
                <strong>{e.accountId}:</strong> {friendlyError(e.message, e.message)}
              </p>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              O token de acesso pode ter expirado ou perdido as permissões necessárias. Acesse as configurações do cliente para renovar.
            </p>
          </motion.div>
        )}

        {!metaLoading && !metaError && campaignsWithCreatives.length === 0 && (!metaData?.accountErrors || metaData.accountErrors.length === 0) && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Nenhum criativo encontrado para campanhas ativas no período
          </div>
        )}

        {(() => {
          const groups = groupCampaignsByFunnel(campaignsWithCreatives);
          return (
            <>
              {groups.map((g) => {
                if (g.isFunnel) {
                  return (
                    <AggregatedCreativeGrid
                      key={g.key}
                      campaigns={g.campaigns}
                      funnelLabel={g.key}
                      clientId={client.id}
                      currencySymbol={client.currency_symbol || "R$"}
                    />
                  );
                }
                const campaign = g.campaigns[0];
                return (
                  <CreativeGrid
                    key={campaign.id}
                    campaign={campaign}
                    clientId={client.id}
                    currencySymbol={client.currency_symbol || "R$"}
                  />
                );
              })}
            </>
          );
        })()}
      </main>

      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Relatório gerado automaticamente • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </div>
  );
}
