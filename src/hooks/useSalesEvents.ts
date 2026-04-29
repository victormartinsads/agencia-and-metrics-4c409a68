import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SalesEvent {
  id: string;
  client_id: string;
  platform: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string | null;
  status: string;
  gross_amount: number;
  net_amount: number;
  currency: string;
  occurred_at: string;
}

export interface SalesWebhookConfig {
  id: string;
  client_id: string;
  webhook_token: string;
  product_filters: Record<string, string[]>;
}

export function useSalesWebhookConfig(clientId?: string) {
  return useQuery({
    queryKey: ["sales-webhook-config", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_webhook_config")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      // se não existe, cria automaticamente
      if (!data) {
        const { data: created, error: insErr } = await (supabase as any)
          .from("sales_webhook_config")
          .insert({ client_id: clientId })
          .select()
          .single();
        if (insErr) throw insErr;
        return created as SalesWebhookConfig;
      }
      return data as SalesWebhookConfig;
    },
  });
}

export function useUpdateSalesWebhookConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      product_filters,
    }: {
      clientId: string;
      product_filters: Record<string, string[]>;
    }) => {
      const { error } = await (supabase as any)
        .from("sales_webhook_config")
        .update({ product_filters })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["sales-webhook-config", v.clientId] }),
  });
}

export function useSalesEvents(
  clientId?: string,
  range?: { from: Date; to: Date },
) {
  return useQuery({
    queryKey: ["sales-events", clientId, range?.from?.toISOString(), range?.to?.toISOString()],
    enabled: !!clientId && !!range,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_events")
        .select("*")
        .eq("client_id", clientId!)
        .eq("status", "approved")
        .gte("occurred_at", range!.from.toISOString())
        .lte("occurred_at", range!.to.toISOString())
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return (data || []) as SalesEvent[];
    },
  });
}

/** Agrega vendas em totais para o período. */
export function aggregateSales(events: SalesEvent[] | undefined) {
  const list = events || [];
  const revenue = list.reduce((s, e) => s + Number(e.gross_amount || 0), 0);
  const sales = list.length;
  const products = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const e of list) {
    const key = e.product_id || e.product_name || "—";
    const cur = products.get(key) || { name: e.product_name || "—", sales: 0, revenue: 0 };
    cur.sales += 1;
    cur.revenue += Number(e.gross_amount || 0);
    products.set(key, cur);
  }
  return {
    revenue,
    sales,
    avgTicket: sales > 0 ? revenue / sales : 0,
    products: Array.from(products.entries()).map(([id, v]) => ({ id, ...v })),
  };
}

/** Série diária YYYY-MM-DD */
export function dailySalesSeries(events: SalesEvent[] | undefined) {
  const map = new Map<string, { sales: number; revenue: number }>();
  for (const e of events || []) {
    const d = e.occurred_at.slice(0, 10);
    const cur = map.get(d) || { sales: 0, revenue: 0 };
    cur.sales += 1;
    cur.revenue += Number(e.gross_amount || 0);
    map.set(d, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));
}