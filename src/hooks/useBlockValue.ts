import { useMemo } from "react";
import { useBlockSources } from "@/hooks/useBlockSources";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";

/**
 * Resolves the value/data for a dashboard block based on its persisted source config.
 * If no override is saved, returns `{ source: "auto", value: undefined }` so the
 * caller falls back to its default rendering.
 */
export function useBlockValue(params: {
  clientId?: string;
  dashboardKey: string;
  blockId: string;
  datePreset?: string;
}) {
  const { clientId, dashboardKey, blockId, datePreset } = params;
  const { data: sources } = useBlockSources(clientId, dashboardKey);
  const cfg = sources?.[blockId];

  const type = cfg?.source_type || "auto";
  const config = cfg?.config || {};

  const meta = useMetaAds(type === "meta" ? clientId : undefined, datePreset);
  const gAds = useGoogleAds(clientId, datePreset, type === "google_ads");
  const ga4  = useGoogleAnalytics(clientId, datePreset, type === "ga4");
  const ig   = useInstagramInsights(type === "instagram" ? clientId : undefined);

  return useMemo(() => {
    if (!cfg || type === "auto") return { source: "auto" as const, value: undefined, loading: false };

    if (type === "manual") {
      return { source: type, value: Number(config.value) || 0, label: config.label, loading: false };
    }

    if (type === "meta") {
      const o = meta.data?.overviewMetrics as any;
      const v = o?.[config.metric];
      return { source: type, value: typeof v === "number" ? v : undefined, loading: meta.isLoading };
    }

    if (type === "google_ads") {
      const t = gAds.data?.totals as any;
      return { source: type, value: t?.[config.metric], loading: gAds.isLoading };
    }

    if (type === "ga4") {
      const k = ga4.data?.overview as any;
      return { source: type, value: k?.[config.metric], loading: ga4.isLoading };
    }

    if (type === "instagram") {
      const k = ig.data as any;
      return { source: type, value: k?.[config.metric], loading: ig.isLoading };
    }

    if (type === "sheet") {
      return { source: type, value: undefined, loading: false, note: "Conecte a planilha em Configurações → Fontes de dados" };
    }

    return { source: type, value: undefined, loading: false };
  }, [cfg, type, config, meta, gAds, ga4, ig]);
}