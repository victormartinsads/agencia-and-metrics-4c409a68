import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useMetaAds } from "@/hooks/useMetaAds";
import { groupCampaignsByFunnel } from "@/lib/funnelGrouping";
import { DiagnosticoPresentMode } from "@/components/diagnostico/DiagnosticoPresentMode";
import SavedDiagnosticPublic from "./SavedDiagnosticPublic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiagnosticBlocks } from "@/hooks/useWeeklyDiagnostic";
import { getPeriodPair } from "@/lib/period";

const DATE_PRESETS = [
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Mês atual" },
  { value: "last_month", label: "Mês passado" },
];

const DATE_LABEL: Record<string, string> = Object.fromEntries(
  DATE_PRESETS.map(p => [p.value, p.label])
);

function formatPeriodRange(preset: string): string {
  const { current } = getPeriodPair(preset);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(current.start)} – ${fmt(current.end)}`;
}

export default function ComoEstamosPublic() {
  const { slug } = useParams<{ slug: string }>();

  // 1) Tenta resolver como "diagnóstico salvo" pelo slug
  const { data: saved, isLoading: savedLoading } = useQuery({
    queryKey: ["public-saved-diagnostic-by-slug", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_diagnostics" as any)
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!slug,
  });

  if (savedLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (saved) {
    return <SavedDiagnosticPublic savedItem={saved} />;
  }

  return <LiveClientView />;
}

function LiveClientView() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreset = searchParams.get("p") || "last_7d";
  const [datePreset, setDatePreset] = useState(initialPreset);

  const handleChangePreset = (v: string) => {
    setDatePreset(v);
    const next = new URLSearchParams(searchParams);
    next.set("p", v);
    setSearchParams(next, { replace: true });
  };

  const periodRange = useMemo(() => formatPeriodRange(datePreset), [datePreset]);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client-by-slug-public", slug],
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

  const { data: metaData, isLoading: metaLoading } = useMetaAds(client?.id, datePreset);

  const { data: diagnostic } = useQuery({
    queryKey: ["public-weekly-diagnostic", client?.id, datePreset],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_diagnostics")
        .select("*")
        .eq("client_id", client!.id)
        .eq("date_preset", datePreset)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  const { data: notes } = useQuery({
    queryKey: ["public-weekly-notes", client?.id, datePreset],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_notes")
        .select("*")
        .eq("client_id", client!.id)
        .eq("date_preset", datePreset)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  const groups = useMemo(() => {
    const camps = (metaData?.campaigns || []).filter(c => c.spend > 0);
    return groupCampaignsByFunnel(camps);
  }, [metaData]);

  const blocks: DiagnosticBlocks = {
    positives: diagnostic?.positives || "",
    negatives: diagnostic?.negatives || "",
    manager_actions: diagnostic?.manager_actions || "",
    client_requests: diagnostic?.client_requests || "",
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Diagnóstico não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Seletor de período fixo no topo */}
      <div className="fixed top-3 right-3 z-[110]">
        <Select value={datePreset} onValueChange={handleChangePreset}>
          <SelectTrigger className="w-[180px] h-8 text-xs bg-card/80 backdrop-blur">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.label} ({formatPeriodRange(p.value)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {metaLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Nenhuma campanha com gasto no período selecionado.
        </div>
      ) : (
        <DiagnosticoPresentMode
          clientName={client.name.toUpperCase()}
          datePreset={DATE_LABEL[datePreset] || datePreset}
          periodRange={periodRange}
          datePresetKey={datePreset}
          groups={groups}
          blocks={blocks}
          whatWeDid={notes?.what_we_did || ""}
          nextActions={notes?.next_actions || ""}
          currencySymbol={client.currency_symbol || "R$"}
          clientId={client.id}
          publicMode
        />
      )}
    </div>
  );
}


