import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface GAOverview {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagedSessions: number;
}

export interface GADaily {
  date: string;
  sessions: number;
  users: number;
  pageViews: number;
}

export interface GASource {
  channel: string;
  sessions: number;
  users: number;
}

export interface GAUtm {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  conversions?: number;
  revenue?: number;
}

export interface GAProperty {
  id: string;
  name: string;
  account: string;
}

export interface GAData {
  overview: GAOverview;
  daily: GADaily[];
  sources: GASource[];
  utms?: GAUtm[];
  ageDemographics?: { age: string; gender?: string; sessions: number; users: number }[];
  countries?: { country: string; sessions: number; users: number }[];
  devices?: { device: string; sessions: number; users: number }[];
  landingPages?: { page: string; sessions: number; bounceRate: number; conversions: number; avgDuration: number }[];
  events?: { name: string; count: number }[];
  browsers?: { browser: string; sessions: number }[];
  newVsReturning?: { type: string; users: number }[];
  campaigns?: { campaign: string; sessions: number }[];
  engagementBuckets?: { bucket: string; sessions: number }[];
  needsPropertySelection?: boolean;
  properties?: GAProperty[];
  notConnected?: boolean;
  apiError?: { error?: { message?: string; status?: string; details?: any[] } };
  scopes?: string[];
}

export function useGoogleConnectionStatus(clientId?: string) {
  return useQuery({
    queryKey: ["google-status", clientId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-oauth", {
          body: { action: "check_status", clientId },
        });
        if (error) throw error;
        return (data || { connected: false }) as { connected: boolean };
      } catch (err) {
        console.error("Error checking Google status:", err);
        return { connected: false };
      }
    },
    enabled: !!clientId,
  });
}

export function useGoogleAnalytics(clientId?: string, dateRange?: string, enabled = true, publicSlug?: string, propertyId?: string) {
  return useQuery({
    queryKey: ["google-analytics", clientId, dateRange, publicSlug || "", propertyId || ""],
    queryFn: async () => {
      const dateMap: Record<string, { startDate: string; endDate: string }> = {
        today: { startDate: "today", endDate: "today" },
        yesterday: { startDate: "yesterday", endDate: "yesterday" },
        last_3d: { startDate: "3daysAgo", endDate: "today" },
        last_7d: { startDate: "7daysAgo", endDate: "today" },
        last_14d: { startDate: "14daysAgo", endDate: "today" },
        last_30d: { startDate: "30daysAgo", endDate: "today" },
        this_month: { startDate: "30daysAgo", endDate: "today" },
        last_month: { startDate: "60daysAgo", endDate: "30daysAgo" },
      };

      // Custom range: "custom:YYYY-MM-DD:YYYY-MM-DD" → GA aceita ISO direto
      const customMatch = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(dateRange || "");
      const resolvedRange = customMatch
        ? { startDate: customMatch[1], endDate: customMatch[2] }
        : (dateMap[dateRange || "last_7d"] || dateMap.last_7d);

      const { data, error } = await supabase.functions.invoke("google-analytics", {
        body: {
          clientId,
          propertyId,
          dateRange: resolvedRange,
          publicSlug,
        },
      });
      if (error) throw error;
      return data as GAData;
    },
    enabled: !!clientId && enabled,
  });
}

export function useFetchGoogleProperties(clientId?: string, enabled = true) {
  return useQuery({
    queryKey: ["google-properties", clientId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-analytics", {
          body: {
            clientId,
            fetchPropertiesList: true,
          },
        });
        if (error) throw error;
        return (data || { properties: [] }) as { properties: GAProperty[]; notConnected?: boolean; needsPropertySelection?: boolean; apiError?: any };
      } catch (err) {
        console.error("Error fetching Google properties:", err);
        return { properties: [], notConnected: true };
      }
    },
    enabled: !!clientId && enabled,
  });
}

export function useConnectGoogle() {
  return useMutation({
    mutationFn: async ({ clientId, redirectUri }: { clientId: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get_auth_url", clientId, redirectUri },
      });
      if (error) throw error;
      return data as { authUrl: string };
    },
  });
}

export function useExchangeGoogleCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, code, redirectUri }: { clientId: string; code: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "exchange_code", clientId, code, redirectUri },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["google-status", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["google-analytics", vars.clientId] });
    },
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "disconnect", clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, clientId) => {
      qc.invalidateQueries({ queryKey: ["google-status", clientId] });
      qc.invalidateQueries({ queryKey: ["google-analytics", clientId] });
    },
  });
}
