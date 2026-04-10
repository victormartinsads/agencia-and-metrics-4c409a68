import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, ArrowLeft, Settings, Loader2, Share2, Check,
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${clientId}`;
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
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4 text-secondary-foreground" />
            </Link>
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground uppercase">{client.name}</h1>
              <p className="text-xs text-muted-foreground">
                {client.ad_account_ids.length} conta(s) de anúncio • Dashboard Meta Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              <Settings className="h-3.5 w-3.5" /> Configurações
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <DashboardContent
          metaData={metaData}
          metaLoading={metaLoading}
          metaError={metaError as Error | null}
        />
      </main>
    </div>
  );
}
