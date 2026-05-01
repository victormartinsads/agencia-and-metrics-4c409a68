import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart3, Loader2 } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function SharedDashboard() {
  const { clientId: param } = useParams<{ clientId: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client-public", param],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param || "");
      const q = supabase.from("clients").select("id, name, currency_symbol, slug");
      const { data, error } = isUuid
        ? await q.eq("id", param!).single()
        : await q.eq("slug", param!).single();
      if (error) throw error;
      return data as Pick<Client, "id" | "name" | "currency_symbol" | "slug">;
    },
    enabled: !!param,
  });

  const clientId = client?.id;
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaAds(clientId, datePreset);

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
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase">{client.name}</h1>
              <p className="text-xs text-muted-foreground">Dashboard de Performance • Meta Ads</p>
            </div>
          </div>
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
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <DashboardContent
          clientId={clientId}
          datePreset={datePreset}
          metaData={metaData}
          metaLoading={metaLoading}
          metaError={metaError as Error | null}
          currencySymbol={client.currency_symbol || "R$"}
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
