import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useMetaAds, useRefreshMetaAds } from "@/hooks/useMetaAds";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import AppShell from "@/components/layout/AppShell";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { OverviewTab } from "@/components/ferramentas-gestor/OverviewTab";
import { MetaAdsTab } from "@/components/ferramentas-gestor/MetaAdsTab";
import { GoogleAdsTab } from "@/components/ferramentas-gestor/GoogleAdsTab";
import { MeetingsTab } from "@/components/ferramentas-gestor/MeetingsTab";
import { ReportsTab } from "@/components/ferramentas-gestor/ReportsTab";
import { AutomationsTab } from "@/components/ferramentas-gestor/AutomationsTab";
import { TemplatesTab } from "@/components/ferramentas-gestor/TemplatesTab";
import { IntegrationsTab } from "@/components/ferramentas-gestor/IntegrationsTab";
import { UserSettingsTab } from "@/components/ferramentas-gestor/UserSettingsTab";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function FerramentasGestor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Sync with first client once loaded
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      const savedId = localStorage.getItem("fg:clientId");
      const exists = clients.some(c => c.id === savedId);
      const initialId = exists ? savedId! : clients[0].id;
      setSelectedClientId(initialId);
      localStorage.setItem("fg:clientId", initialId);
    }
  }, [clients, selectedClientId]);

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Fetch Meta Ads data
  const { 
    data: metaData = null, 
    isLoading: metaLoading, 
    refetch: refetchMeta 
  } = useMetaAds(selectedClient?.id || undefined);

  // Fetch Google Ads data
  const { 
    data: googleData = null, 
    isLoading: googleLoading, 
    refetch: refetchGoogle 
  } = useGoogleAds(selectedClient?.id || undefined);

  const refreshMeta = useRefreshMetaAds();

  const handleRefresh = async () => {
    if (!selectedClient) return;
    const toastId = toast.loading("Sincronizando dados dos canais...");
    try {
      await refreshMeta(selectedClient.id);
      await refetchGoogle();
      toast.success("Dados sincronizados com sucesso!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao sincronizar dados", { id: toastId });
    }
  };

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    localStorage.setItem("fg:clientId", id);
    toast.success(`Visualizando dados de: ${clients.find(c => c.id === id)?.name || "Cliente"}`);
  };

  const isDataLoading = metaLoading || googleLoading;

  const header = (
    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/60 backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent uppercase">
          Ferramentas do Gestor
        </h1>
      </div>
      
      {clients.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Cliente ativo:</span>
          <Select value={selectedClientId || ""} onValueChange={handleClientChange}>
            <SelectTrigger className="w-56 bg-card border-border/60 text-xs h-9 rounded-xl focus:ring-primary/40">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-slate-100 rounded-xl">
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs focus:bg-white/[0.03] cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <AppShell header={header} noContainer>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {clientsLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab 
                selectedClient={selectedClient} 
                clients={clients} 
                metaData={metaData} 
                googleData={googleData} 
                onSelectClient={handleClientChange}
              />
            )}
            
            {tab === "meta-ads" && (
              <MetaAdsTab 
                clients={clients}
                selectedClient={selectedClient} 
                isLoading={isDataLoading}
                onRefresh={handleRefresh}
              />
            )}

            {tab === "google-ads" && (
              <GoogleAdsTab 
                selectedClient={selectedClient} 
                googleData={googleData} 
                isLoading={isDataLoading}
                onRefresh={handleRefresh}
              />
            )}



            {tab === "meetings" && (
              <MeetingsTab />
            )}

            {tab === "reports" && (
              <ReportsTab 
                selectedClient={selectedClient} 
                clients={clients} 
              />
            )}

            {tab === "automations" && (
              <AutomationsTab />
            )}

            {tab === "templates" && (
              <TemplatesTab />
            )}

            {tab === "integrations" && (
              <IntegrationsTab 
                selectedClient={selectedClient} 
              />
            )}

            {tab === "settings" && (
              <UserSettingsTab />
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
