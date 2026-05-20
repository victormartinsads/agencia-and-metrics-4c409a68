import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart3, Loader2 } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export default function SharedDashboard() {
  const { clientId: param } = useParams<{ clientId: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client-public", param],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param || "");
      const q = supabase.from("clients").select("id, name, currency_symbol, slug, visible_tabs");
      const { data, error } = isUuid
        ? await q.eq("id", param!).single()
        : await q.eq("slug", param!).single();
      if (error) throw error;
      return data as Pick<Client, "id" | "name" | "currency_symbol" | "slug"> & { visible_tabs?: string[] };
    },
    enabled: !!param,
  });

  const clientId = client?.id;
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds(clientId, datePreset, client?.slug);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground uppercase truncate">{client.name}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Dashboard de Performance • Meta Ads</p>
            </div>
          </div>
          <DateRangePicker value={datePreset} onChange={setDatePreset} />
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
          hideDiagnostico
          visibleTabs={(client as any).visible_tabs || ["overview","funnel","spreadsheet","creatives","branding"]}
        />
      </main>

      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Relatório gerado automaticamente • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </div>
  );
}
