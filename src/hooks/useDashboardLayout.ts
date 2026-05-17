import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Layout } from "react-grid-layout";

const KEY = "dashboard-layout";

export function useDashboardLayout(clientId?: string, dashboardKey?: string) {
  return useQuery({
    queryKey: [KEY, clientId, dashboardKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dashboard_block_layouts")
        .select("layout")
        .eq("client_id", clientId!)
        .eq("dashboard_key", dashboardKey!)
        .maybeSingle();
      if (error) throw error;
      return (data?.layout as Layout[]) || [];
    },
    enabled: !!clientId && !!dashboardKey,
  });
}

export function useSaveDashboardLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { clientId: string; dashboardKey: string; layout: Layout[] }) => {
      const { error } = await (supabase as any)
        .from("dashboard_block_layouts")
        .upsert(
          {
            client_id: args.clientId,
            dashboard_key: args.dashboardKey,
            layout: args.layout,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,dashboard_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId, vars.dashboardKey] }),
  });
}