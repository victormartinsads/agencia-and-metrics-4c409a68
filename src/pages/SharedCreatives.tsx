import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Trophy } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useMetaAds } from "@/hooks/useMetaAds";
import { CreativeGrid } from "@/components/dashboard/CreativeGrid";
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

export default function SharedCreatives() {
  const { clientId } = useParams<{ clientId: string }>();
  const [datePreset, setDatePreset] = useState("last_7d");

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data as Pick<Client, "id" | "name">;
    },
    enabled: !!clientId,
  });

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
            <p className="text-sm text-destructive">Erro ao carregar dados dos criativos</p>
          </motion.div>
        )}

        {!metaLoading && !metaError && campaignsWithCreatives.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Nenhum criativo encontrado para campanhas ativas no período
          </div>
        )}

        {campaignsWithCreatives.map((campaign) => (
          <CreativeGrid key={campaign.id} campaign={campaign} />
        ))}
      </main>

      <footer className="border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Relatório gerado automaticamente • {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </div>
  );
}
