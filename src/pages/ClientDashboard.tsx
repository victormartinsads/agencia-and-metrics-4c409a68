import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, ArrowLeft, Settings, Loader2, Share2, Check, RefreshCw,
} from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });

  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds(clientId, datePreset);

  const handleRefreshAll = async () => {
    if (!clientId) return;
    setRefreshing(true);
    try {
      // Trigger sheet sync (best-effort) and refetch all dashboard queries
      const tasks: Promise<unknown>[] = [];
      tasks.push(
        supabase.functions
          .invoke("sheets-sync-v2", { body: { client_id: clientId } })
          .catch(() => null),
      );
      tasks.push(
        supabase.functions
          .invoke("meta-ads", { body: { clientId, datePreset, forceRefresh: true } })
          .catch(() => null),
      );
      await Promise.all(tasks);
      // Invalidate all client-scoped caches
      await queryClient.invalidateQueries();
      toast.success("Dados atualizados");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar");
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${client?.slug || clientId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!", {
        description: `Link de visualização para ${client?.name} copiado para a área de transferência.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
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
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Link to="/clients" className="text-primary underline">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4 text-secondary-foreground" />
            </Link>
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground uppercase truncate">{client.name}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                {client.ad_account_ids.length} conta(s) de anúncio • Dashboard Meta Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-accent transition-colors flex items-center gap-1.5 disabled:opacity-60"
              title="Buscar novamente API, webhook e planilhas"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-[140px] md:w-[180px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={handleShare}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Compartilhar"}
            </button>
            <Link
              to="/clients"
              className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-accent transition-colors flex items-center gap-1"
            >
              <Settings className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Configurações</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 md:py-6">
        <DashboardContent
          clientId={clientId}
          datePreset={datePreset}
          metaData={metaData}
          metaLoading={metaLoading}
          metaError={metaError as Error | null}
          currencySymbol={client.currency_symbol || "R$"}
        />
      </main>
    </div>
  );
}
