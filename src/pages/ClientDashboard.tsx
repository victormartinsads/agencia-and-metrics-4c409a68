import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Settings, Loader2, Share2, Check, RefreshCw,
} from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [compareEnabled, setCompareEnabled] = useState(false);
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

  const TABS = [
    { id: "overview", label: "Visão Geral" },
    { id: "diagnostico", label: "Como Estamos" },
    { id: "funnel", label: "Análise de Funis" },
    { id: "creatives", label: "Criativos" },
    { id: "branding", label: "Distribuição" },
    { id: "spreadsheet", label: "Planilha" },
  ];

  const header = (
    <div className="flex flex-col">
      {/* Mini context bar: client + utility actions */}
      <div className="flex items-center justify-between gap-3 px-5 pt-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/"
            className="h-7 w-7 rounded-md bg-secondary/60 hover:bg-secondary flex items-center justify-center shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-secondary-foreground" />
          </Link>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cliente</span>
          <span className="text-[13px] font-bold text-foreground uppercase truncate">{client.name}</span>
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            · {client.ad_account_ids.length} conta(s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="gap-1.5 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button onClick={handleShare} size="sm" variant="outline" className="gap-1.5 h-8">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Compartilhar"}
          </Button>
          <Link to={`/clients/${clientId}/settings`}>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configurações</span>
            </Button>
          </Link>
        </div>
      </div>

      <DashboardTopBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        compareEnabled={compareEnabled}
        onToggleCompare={() => setCompareEnabled((v) => !v)}
      />
    </div>
  );

  return (
    <AppShell currentPage="dashboard" header={header}>
      <DashboardContent
        clientId={clientId}
        datePreset={datePreset}
        metaData={metaData}
        metaLoading={metaLoading}
        metaError={metaError as Error | null}
        currencySymbol={client.currency_symbol || "R$"}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        hideTabList
      />
    </AppShell>
  );
}
