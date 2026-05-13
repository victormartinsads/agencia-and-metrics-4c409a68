import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Webhook, Plus, Trash2 } from "lucide-react";
import { useWebhookTokens } from "@/hooks/useCrmAppLeads";
import { webhookService } from "@/lib/crm-app";
import { OutboundWebhooksPanel } from "./OutboundWebhooksPanel";
import {
  useLeadCustomFieldDefs,
  useUpsertLeadCustomFieldDef,
  useDeleteLeadCustomFieldDef,
  LeadCustomFieldDef,
} from "@/hooks/useLeadCustomFields";
import { toast } from "sonner";

export function WebhookPanel({ orgId, pipelineId = null, pipelineName }: { orgId: string; pipelineId?: string | null; pipelineName?: string }) {
  const { data: tokens = [] } = useWebhookTokens(orgId, pipelineId);
  const t = tokens[0];
  const url = t ? webhookService.getWebhookUrl(t.token) : "";
  const { data: defs = [] } = useLeadCustomFieldDefs(orgId, pipelineId);
  const upsert = useUpsertLeadCustomFieldDef(orgId, pipelineId);
  const del = useDeleteLeadCustomFieldDef(orgId);
  const [draft, setDraft] = useState<{ key: string; label: string; field_type: LeadCustomFieldDef["field_type"] }>({
    key: "", label: "", field_type: "text",
  });

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  const addField = async () => {
    if (!draft.key || !draft.label) { toast.error("Informe chave e rótulo"); return; }
    try {
      await upsert.mutateAsync({ key: draft.key, label: draft.label, field_type: draft.field_type });
      setDraft({ key: "", label: "", field_type: "text" });
      toast.success("Campo criado");
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Webhook className="h-4 w-4" /> Webhook de entrada{pipelineName ? ` — ${pipelineName}` : " (organização)"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {pipelineId
            ? "URL exclusiva deste pipeline. Leads recebidos aqui serão automaticamente associados a ele."
            : "URL geral da organização (leads ficam sem pipeline)."}{" "}
          Campos padrão: <code>name, email, phone, company, message, source, value, product, instagram, utm_*, fclid</code>.
          Qualquer outro parâmetro enviado será salvo automaticamente em <code>custom_fields</code> e exibido no lead se houver um campo personalizado correspondente (mesma <code>key</code>).
          Você também pode enviar <code>custom_fields</code> como objeto.
        </p>
        {url && (
          <div className="flex gap-2">
            <Input value={url} readOnly className="text-xs font-mono" />
            <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
        )}
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
              <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)}>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
    </div>
  );
}