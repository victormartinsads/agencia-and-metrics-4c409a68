import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Webhook, Plus, Trash2, Pencil, Link2 } from "lucide-react";
import { webhookService, WebhookToken } from "@/lib/crm-app";
import { OutboundWebhooksPanel } from "./OutboundWebhooksPanel";
import { IntegrationWizardDialog } from "./IntegrationWizardDialog";
import {
  useLeadCustomFieldDefs,
  useUpsertLeadCustomFieldDef,
  useDeleteLeadCustomFieldDef,
  LeadCustomFieldDef,
} from "@/hooks/useLeadCustomFields";
import { useIntegrations, useDeleteIntegration } from "@/hooks/useWebhookIntegrations";
import { usePipelines } from "@/hooks/usePipelines";
import { toast } from "sonner";

export function WebhookPanel({
  orgId,
  pipelineId = null,
  pipelineName,
}: {
  orgId: string;
  pipelineId?: string | null;
  pipelineName?: string;
}) {
  const { data: integrations = [] } = useIntegrations(orgId);
  const { data: pipelines = [] } = usePipelines(orgId);
  const del = useDeleteIntegration(orgId);

  const filtered = useMemo(() => {
    if (pipelineId === null) return integrations;
    return integrations.filter((i) => i.pipeline_id === pipelineId);
  }, [integrations, pipelineId]);

  const pipelineMap = useMemo(
    () => Object.fromEntries(pipelines.map((p) => [p.id, p])),
    [pipelines],
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookToken | null>(null);

  const { data: defs = [] } = useLeadCustomFieldDefs(orgId, pipelineId);
  const upsert = useUpsertLeadCustomFieldDef(orgId, pipelineId);
  const delField = useDeleteLeadCustomFieldDef(orgId);
  const [draft, setDraft] = useState<{ key: string; label: string; field_type: LeadCustomFieldDef["field_type"] }>({
    key: "",
    label: "",
    field_type: "text",
  });

  const copy = (token: string) => {
    navigator.clipboard.writeText(webhookService.getWebhookUrl(token));
    toast.success("URL copiada");
  };

  const remove = async (i: WebhookToken) => {
    if (!confirm(`Excluir a integração "${i.name}"? O webhook deixará de funcionar.`)) return;
    try {
      await del.mutateAsync(i.id);
      toast.success("Integração excluída");
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };
  const openEdit = (i: WebhookToken) => {
    setEditing(i);
    setWizardOpen(true);
  };

  const addField = async () => {
    if (!draft.key || !draft.label) {
      toast.error("Informe chave e rótulo");
      return;
    }
    try {
      await upsert.mutateAsync({ key: draft.key, label: draft.label, field_type: draft.field_type });
      setDraft({ key: "", label: "", field_type: "text" });
      toast.success("Campo criado");
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Integrações de webhook
              {pipelineName && <Badge variant="outline">{pipelineName}</Badge>}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Cada integração gera um webhook exclusivo e permite mapear os campos da ferramenta de origem
              para os campos do CRM.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Nova integração
          </Button>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground italic border border-dashed border-border rounded-md p-6 text-center">
              Nenhuma integração criada ainda. Clique em <strong>Nova integração</strong> para começar.
            </div>
          )}
          {filtered.map((i) => {
            const url = webhookService.getWebhookUrl(i.token);
            const mappingCount = Object.keys(i.field_mapping || {}).length;
            const pip = i.pipeline_id ? pipelineMap[i.pipeline_id] : null;
            return (
              <div key={i.id} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{i.name}</span>
                      {pip ? (
                        <Badge variant="outline" className="gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: pip.color }}
                          />
                          {pip.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Organização</Badge>
                      )}
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Link2 className="h-3 w-3" />
                        {mappingCount} {mappingCount === 1 ? "campo mapeado" : "campos mapeados"}
                      </Badge>
                      {!i.active && <Badge variant="destructive">Inativa</Badge>}
                    </div>
                    {i.description && (
                      <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(i)} title="Editar / Mapeamento">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(i)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input value={url} readOnly className="text-xs font-mono" />
                  <Button size="sm" variant="outline" onClick={() => copy(i.token)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">
          Campos personalizados{pipelineName ? ` deste pipeline` : " globais"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {pipelineId
            ? "Campos específicos deste pipeline (somam-se aos campos globais)."
            : "Campos globais — disponíveis em todos os pipelines da organização."}
        </p>

        <div className="space-y-2">
          {defs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-sm border border-border rounded-md p-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.key}</code>
              <span className="flex-1">{d.label}</span>
              <span className="text-xs text-muted-foreground">{d.field_type}</span>
              <Button size="icon" variant="ghost" onClick={() => delField.mutate(d.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          {defs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum campo personalizado.</p>}
        </div>

        <div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-border">
          <div className="col-span-3">
            <Label className="text-xs">Chave</Label>
            <Input placeholder="ex: cidade" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          </div>
          <div className="col-span-5">
            <Label className="text-xs">Rótulo</Label>
            <Input placeholder="ex: Cidade" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Tipo</Label>
            <Select value={draft.field_type} onValueChange={(v) => setDraft({ ...draft, field_type: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="col-span-2 gap-1" onClick={addField} disabled={upsert.isPending}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </Card>

      <OutboundWebhooksPanel orgId={orgId} pipelineId={pipelineId} pipelineName={pipelineName} />

      <IntegrationWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        orgId={orgId}
        defaultPipelineId={pipelineId}
        editing={editing}
      />
    </div>
  );
}
