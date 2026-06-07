import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPeriodPair } from "@/lib/period";

export interface CrmUtmRow {
  source: string;
  medium: string;
  campaign: string;
  mqls: number;
  sales: number;
  revenue: number;
}

export interface CrmOverviewData {
  revenue: number;
  sales: number;
  mqls: number;
  utms: CrmUtmRow[];
}

export function useCrmOverviewData(clientId?: string, datePreset?: string) {
  const periods = useMemo(() => getPeriodPair(datePreset || "last_7d"), [datePreset]);

  return useQuery({
    queryKey: ["crm-overview", clientId, datePreset],
    queryFn: async (): Promise<CrmOverviewData> => {
      const startIso = periods.current.start.toISOString();
      const endIso = periods.current.end.toISOString();

      // Fetch Sales Events
      const { data: salesData, error: salesError } = await supabase
        .from("sales_events")
        .select("net_amount, status")
        .eq("client_id", clientId!)
        .eq("status", "approved")
        .gte("occurred_at", startIso)
        .lte("occurred_at", endIso);

      if (salesError) throw salesError;

      const revenue = (salesData || []).reduce((acc, s) => acc + Number(s.net_amount || 0), 0);
      const sales = (salesData || []).length;

      // Fetch CRM Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from("crm_leads")
        .select("id, value, source, custom_fields, tags, sales_event_id")
        .eq("client_id", clientId!)
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (leadsError) throw leadsError;

      const mqls = (leadsData || []).length;

      const utmMap = new Map<string, CrmUtmRow>();

      for (const lead of leadsData || []) {
        const cf = (lead.custom_fields as Record<string, any>) || {};
        
        let source = String(cf.utm_source || cf.source || lead.source || "Desconhecido").trim();
        let medium = String(cf.utm_medium || cf.medium || "Desconhecido").trim();
        let campaign = String(cf.utm_campaign || cf.campaign || "Desconhecida").trim();

        if (source === "undefined" || source === "null" || source === "") source = "Desconhecido";
        if (medium === "undefined" || medium === "null" || medium === "") medium = "Desconhecido";
        if (campaign === "undefined" || campaign === "null" || campaign === "") campaign = "Desconhecida";

        const key = `${source}|${medium}|${campaign}`;
        if (!utmMap.has(key)) {
          utmMap.set(key, { source, medium, campaign, mqls: 0, sales: 0, revenue: 0 });
        }

        const row = utmMap.get(key)!;
        row.mqls += 1;

        if (lead.sales_event_id) {
          row.sales += 1;
          row.revenue += Number(lead.value || 0);
        }
      }

      const utms = Array.from(utmMap.values()).sort((a, b) => b.revenue - a.revenue || b.mqls - a.mqls);

      return {
        revenue,
        sales,
        mqls,
        utms,
      };
    },
    enabled: !!clientId,
  });
}
