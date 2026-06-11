import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Settings, Loader2, Share2, Check, RefreshCw, Zap,
} from "lucide-react";
import { Client, useClients } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const isStaff = !!(userRole?.isAdmin || userRole?.isEditor);
  const [datePreset, setDatePreset] = useState("last_7d");
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      if (tabParam === "como-estamos") return "diagnostico";
      if (tabParam === "visao-geral") return "overview";
      if (tabParam === "analise-de-funis") return "funnel";
      if (tabParam === "criativos") return "creatives";
      if (tabParam === "distribuicao") return "branding";
      if (tabParam === "planilha") return "spreadsheet";
      if (tabParam === "diario") return "diario";
      return tabParam;
    }
    return "overview";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    let tabParam = tab;
    if (tab === "diagnostico") tabParam = "como-estamos";
    else if (tab === "overview") tabParam = "visao-geral";
    else if (tab === "funnel") tabParam = "analise-de-funis";
    else if (tab === "creatives") tabParam = "criativos";
    else if (tab === "branding") tabParam = "distribuicao";
    else if (tab === "spreadsheet") tabParam = "planilha";
    else if (tab === "diario") tabParam = "diario";
    url.searchParams.set("tab", tabParam);
    window.history.replaceState({}, "", url.toString());
  };

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
      toast.success("Dados updates");
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

  const isLoading = clientLoading || roleLoading || clientsLoading;
  const isAllowed = userRole?.isAdmin || userRole?.isCeo || userRole?.isDiretor || clients.some((c) => c.id === clientId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client || !isAllowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Acesso não autorizado ou cliente não encontrado.</p>
        <Link to="/clients" className="text-primary underline">Voltar para a página inicial</Link>
      </div>
    );
  }

  const ALL_TABS: { id: string; label: string }[] = [
    { id: "overview", label: "Visão Geral" },
    { id: "diagnostico", label: "Como Estamos" },
    { id: "funnel", label: "Análise de Funis" },
    { id: "diario", label: "Diário" },
    { id: "creatives", label: "Criativos" },
    { id: "branding", label: "Distribuição" },
    { id: "analytics", label: "Analytics" },
    { id: "google-ads", label: "Google Ads" },
  ];
  const visibleTabs = ((client as any).visible_tabs as string[] | null) || null;
  const hasGAds = !!(client as any).google_ads_customer_id;
  const hasGA4 = !!(client as any).ga_property_id;
  const TABS = ALL_TABS.filter((t) => {
    // Admin/editor sempre veem todas as abas, independente de visible_tabs
    if (isStaff) {
      if (t.id === "google-ads") return hasGAds || true;
      if (t.id === "analytics") return hasGA4 || true;
      return true;
    }
    // Auto-show google-ads/analytics whenever their source is configured,
    // regardless of the saved visible_tabs list.
    if (t.id === "google-ads") return hasGAds || (visibleTabs ? visibleTabs.includes(t.id) : true);
    if (t.id === "analytics") return hasGA4 || (visibleTabs ? visibleTabs.includes(t.id) : true);
    return visibleTabs ? visibleTabs.includes(t.id) : true;
  });

  const header = (
    <DashboardTopBar
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      datePreset={datePreset}
      onDatePresetChange={setDatePreset}
      compareEnabled={compareEnabled}
      onToggleCompare={() => setCompareEnabled((v) => !v)}
      clientName={client.name}
      clientLogoUrl={(client as any).logo_url}
      onSources={() => window.dispatchEvent(new CustomEvent("overview:open-sources"))}
      onEdit={() => window.dispatchEvent(new CustomEvent("overview:open-sources"))}
      onTemplate={() => window.dispatchEvent(new CustomEvent("overview:open-template"))}
      rightExtra={
        <div className="flex items-center gap-1.5">
          <Link to="/" title="Voltar">
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost" size="sm"
            onClick={handleRefreshAll} disabled={refreshing}
            className="h-7 px-2 gap-1 text-muted-foreground"
            title="Atualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={handleShare}
            className="h-7 px-2 gap-1 text-muted-foreground"
            title="Compartilhar"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          </Button>
          {isStaff && (
            <Link to={`/tracking/${clientId}`} title="TrackingHub — CAPI + GA4">
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-muted-foreground" title="TrackingHub">
                <Zap className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
          <Link to={`/clients/${clientId}/settings`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-muted-foreground" title="Configurações">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      }
    />
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
        onActiveTabChange={handleTabChange}
        hideTabList
      />
    </AppShell>
  );
}
