import { useMemo } from "react";
import { useBlockSources } from "@/hooks/useBlockSources";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { useInstagramInsights } from "@/hooks/useInstagramInsights";
import { useWeeklyMetrics, useDashboardSheet } from "@/hooks/useDashboardSheet";
import { getPeriodPair } from "@/lib/period";

function inRange(dateStr: string, start: Date, end: Date) {
  const d = String(dateStr).slice(0, 10);
  const toKey = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return d >= toKey(start) && d <= toKey(end);
}

function normalizeFieldKey(field: string, mapping: Record<string, string>): string {
  const f = String(field || "").trim().toLowerCase();
  // 1. Try to find by matching sheet column header name
  const matchedKey = Object.keys(mapping).find(
    (k) => String(mapping[k]).trim().toLowerCase() === f
  );
  if (matchedKey) return matchedKey;

  // 2. Direct normalization fallback
  if (f === "faturamento" || f === "receita" || f === "revenue") return "revenue";
  if (f === "vendas" || f === "sales") return "sales";
  if (f === "leads") return "leads";
  if (f === "investimento" || f === "custo" || f === "spend" || f === "investment") return "investment";
  if (f === "mql") return "mql";
  if (f === "smql") return "smql";
  return f;
}

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
  const weekly = useWeeklyMetrics(type === "sheet" ? clientId : undefined, 365);
  const sheetCfg = useDashboardSheet(type === "sheet" ? clientId : undefined);

  const periods = useMemo(() => getPeriodPair(datePreset || "last_7d"), [datePreset]);

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
      const weeklyData = weekly.data || [];
      const mapping = sheetCfg.data?.field_mapping || {};
      const fieldKey = normalizeFieldKey(config.field || "", mapping);

      const filtered = weeklyData.filter((m) =>
        inRange(m.reference_date, periods.current.start, periods.current.end)
      );

      if (filtered.length === 0) {
        return {
          source: type,
          value: 0,
          loading: weekly.isLoading || sheetCfg.isLoading,
        };
      }

      const values = filtered.map((r) => Number((r as any)[fieldKey] || 0));
      const agg = config.agg || "sum";

      let finalValue = 0;
      if (agg === "sum") {
        finalValue = values.reduce((acc, v) => acc + v, 0);
      } else if (agg === "avg") {
        const sum = values.reduce((acc, v) => acc + v, 0);
        finalValue = sum / values.length;
      } else if (agg === "count") {
        finalValue = values.length;
      } else if (agg === "last") {
        // Sort by date descending and pick first
        const sorted = [...filtered].sort((a, b) =>
          b.reference_date.localeCompare(a.reference_date)
        );
        finalValue = Number((sorted[0] as any)[fieldKey] || 0);
      }

      return {
        source: type,
        value: finalValue,
        loading: weekly.isLoading || sheetCfg.isLoading,
      };
    }

    return { source: type, value: undefined, loading: false };
  }, [cfg, type, config, meta, gAds, ga4, ig, weekly, sheetCfg, periods]);
}