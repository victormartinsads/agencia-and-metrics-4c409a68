import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsService, WebhookToken } from "@/lib/crm-app";

export function useIntegrations(orgId?: string) {
  return useQuery({
    queryKey: ["webhook-integrations", orgId],
    enabled: !!orgId,
    queryFn: () => integrationsService.list(orgId!),
  });
}

export function useCreateIntegration(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { pipelineId: string | null; name: string; description?: string | null }) =>
      integrationsService.create({ orgId: orgId!, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-integrations", orgId] }),
  });
}

export function useUpdateIntegration(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WebhookToken> }) =>
      integrationsService.update(id, patch as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-integrations", orgId] }),
  });
}

export function useDeleteIntegration(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-integrations", orgId] }),
  });
}
