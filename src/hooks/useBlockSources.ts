import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlockSourceType =
  | "auto"
  | "ga4"
  | "meta"
  | "google_ads"
  | "sheet"
  | "instagram"
  | "manual";

export interface BlockSource {
  id?: string;
  client_id: string;
  dashboard_key: string;
  block_id: string;
  source_type: BlockSourceType;
  config: Record<string, any>;
}

const KEY = "dashboard-block-sources";

export function useBlockSources(clientId?: string, dashboardKey?: string) {
  return useQuery({
    queryKey: [KEY, clientId, dashboardKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dashboard_block_sources")
        .select("*")
        .eq("client_id", clientId!)
        .eq("dashboard_key", dashboardKey!);
      if (error) throw error;
      const map: Record<string, BlockSource> = {};
      for (const row of (data || []) as BlockSource[]) map[row.block_id] = row;
      return map;
    },
    enabled: !!clientId && !!dashboardKey,
  });
}

export function useSaveBlockSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (src: BlockSource) => {
      const { error } = await (supabase as any)
        .from("dashboard_block_sources")
        .upsert(
          {
            client_id: src.client_id,
            dashboard_key: src.dashboard_key,
            block_id: src.block_id,
            source_type: src.source_type,
            config: src.config || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,dashboard_key,block_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [KEY, vars.client_id, vars.dashboard_key] }),
  });
}

export function useDeleteBlockSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { clientId: string; dashboardKey: string; blockId: string }) => {
      const { error } = await (supabase as any)
        .from("dashboard_block_sources")
        .delete()
        .eq("client_id", args.clientId)
        .eq("dashboard_key", args.dashboardKey)
        .eq("block_id", args.blockId);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId, vars.dashboardKey] }),
  });
}