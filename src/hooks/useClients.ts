import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface Client {
  id: string;
  name: string;
  slug: string;
  meta_access_token: string;
  ad_account_ids: string[];
  currency_symbol: string;
  created_at: string;
  updated_at: string;
  lead_action_types?: string[];
  target_cpa_lead?: number;
  target_cpa_purchase?: number;
  cpa_alert_multiplier?: number;
  budget_alert_threshold_pct?: number;
  archived_at?: string | null;
  logo_url?: string | null;
}

export type ClientInsert = {
  name: string;
  meta_access_token: string;
  ad_account_ids: string[];
  currency_symbol?: string;
  google_ads_customer_id?: string;
  target_cpa_lead?: number;
  target_cpa_purchase?: number;
  cpa_alert_multiplier?: number;
  budget_alert_threshold_pct?: number;
};

function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function useClients(opts?: { includeArchived?: boolean; onlyArchived?: boolean; allClientsForStaff?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", opts?.includeArchived ? "all" : opts?.onlyArchived ? "archived" : "active", user?.id, opts?.allClientsForStaff],
    queryFn: async () => {
      if (!user) return [] as Client[];

      // Fetch user email override
      const isMasterAdmin = user.email?.toLowerCase() === "victordbmartins@gmail.com";

      // Fetch staff roles
      const { data: staffRolesData } = await (supabase as any)
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const staffRole = staffRolesData?.role || null;

      // Fetch system roles
      const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const systemRoles = (userRolesData || []).map((r) => r.role);

      const isAdmin = isMasterAdmin || staffRole === "admin" || systemRoles.includes("admin");
      const isCeo = !isMasterAdmin && staffRole === "ceo";
      const isDiretor = !isMasterAdmin && (staffRole === "diretor" || staffRole === "gerente");
      const isGestor = !isMasterAdmin && staffRole === "gestor";

      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (opts?.onlyArchived) {
        q = q.not("archived_at", "is", null);
      } else if (!opts?.includeArchived) {
        q = q.is("archived_at", null);
      }
      const { data, error } = await q;
      if (error) throw error;

      return data as Client[];
    },
    enabled: !!user,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({ ...client, slug: generateSlug(client.name) })
        .select()
        .single();
      if (clientErr) throw clientErr;

      const clientId = newClient.id;

      // Create default dashboard sheet config
      const { error: configErr } = await (supabase as any)
        .from("dashboard_sheet_config")
        .insert({
          client_id: clientId,
          spreadsheet_id: "placeholder",
        });
      if (configErr) {
        console.error("Error creating default dashboard_sheet_config:", configErr);
      }

      // Create default client notion diary
      const defaultNotionData = {
        properties: {
          assinatura: "Vazio",
          whatsapp: "Vazio",
          vencimento: "Vazio",
          prioridade: "BAIXA",
          email: "Vazio",
          mes_trafego: "R$ 0,00",
          dia_trafego: "R$ 0,00",
          instagram1: "Vazio",
          instagram2: "Vazio"
        },
        plano_cliente: [],
        plano_equipe: [],
        documentos: [],
        estrategias_ativas: [],
        material_de_apoio: [],
        gravacao: [],
        trilha_semanal: [],
        processos: [],
        metas: [],
        paginas: [],
        icp: [],
        produtos: [],
        criativos: [],
        inteligencia_trafego: []
      };

      const { error: diaryErr } = await supabase
        .from("client_diary_notion")
        .insert({
          client_id: clientId,
          notion_data: defaultNotionData,
        });
      if (diaryErr) {
        console.error("Error creating default client_diary_notion:", diaryErr);
      }

      return newClient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["account-status", vars.id] });
      qc.invalidateQueries({ queryKey: ["gestor-overview", vars.id] });
      qc.invalidateQueries({ queryKey: ["google-analytics", vars.id] });
      qc.invalidateQueries({ queryKey: ["google-ads", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/** Soft-archive (move to "Desativados") or unarchive a client. */
export function useArchiveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
