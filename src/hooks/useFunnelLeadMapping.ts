import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "funnel-lead-mapping";

/**
 * Catalogue of Meta action_types that commonly represent a "Lead".
 * Users can pick any of these (or add custom ones) per funnel to define
 * what counts as a lead for that funnel.
 */
export const LEAD_ACTION_CATALOG: { key: string; label: string }[] = [
  { key: "lead", label: "Lead (padrão pixel)" },
  { key: "onsite_conversion.lead_grouped", label: "Lead agrupado (Meta)" },
  { key: "onsite_conversion.messaging_conversation_started_7d", label: "Conversa iniciada (7d)" },
  { key: "complete_registration", label: "Cadastro completo" },
  { key: "submit_application", label: "Aplicação enviada" },
  { key: "subscribe", label: "Inscrição" },
  { key: "schedule", label: "Agendamento" },
  { key: "contact", label: "Contato" },
  { key: "view_content", label: "Visualização de conteúdo" },
  { key: "landing_page_view", label: "Visualização da página" },
  { key: "link_click", label: "Clique no link" },
  { key: "offsite_conversion.fb_pixel_lead", label: "Lead (Pixel offsite)" },
  { key: "offsite_conversion.fb_pixel_complete_registration", label: "Cadastro (Pixel offsite)" },
];

export function useFunnelLeadMapping(clientId?: string) {
  return useQuery({
    queryKey: [KEY, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_lead_mapping")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of (data || []) as any[]) {
        map[row.funnel_code] = (row.action_types as string[]) || [];
      }
      return map;
    },
    enabled: !!clientId,
  });
}

export function useSaveFunnelLeadMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      funnelCode,
      actionTypes,
    }: {
      clientId: string;
      funnelCode: string;
      actionTypes: string[];
    }) => {
      const { error } = await supabase
        .from("funnel_lead_mapping")
        .upsert(
          {
            client_id: clientId,
            funnel_code: funnelCode,
            action_types: actionTypes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,funnel_code" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY, vars.clientId] });
    },
  });
}

/**
 * Aggregate "leads" for a list of campaigns using the configured action_types.
 * Reads from each campaign's `actionBreakdown` (set by the meta-ads edge fn).
 */
export function aggregateLeadsFromMapping(
  campaigns: Array<{ actionBreakdown?: Record<string, number> }>,
  actionTypes: string[],
): number {
  if (!actionTypes || actionTypes.length === 0) return 0;
  let sum = 0;
  for (const c of campaigns) {
    const ab = c.actionBreakdown || {};
    for (const t of actionTypes) sum += Number(ab[t] || 0);
  }
  return sum;
}