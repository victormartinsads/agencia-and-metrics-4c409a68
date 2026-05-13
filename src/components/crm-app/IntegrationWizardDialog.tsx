import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2, Webhook, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePipelines } from "@/hooks/usePipelines";
import { useCreateIntegration, useUpdateIntegration } from "@/hooks/useWebhookIntegrations";
import { useLeadCustomFieldDefs, useUpsertLeadCustomFieldDef } from "@/hooks/useLeadCustomFields";
import { webhookService, WebhookToken } from "@/lib/crm-app";
import { cn } from "@/lib/utils";

const STANDARD_FIELDS: { key: string; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "message", label: "Mensagem" },
  { key: "source", label: "Origem (source)" },
  { key: "product", label: "Produto" },
  { key: "instagram", label: "Instagram" },
  { key: "value", label: "Valor" },
  { key: "utm_campaign", label: "UTM Campaign" },
  { key: "utm_medium", label: "UTM Medium" },
  { key: "utm_term", label: "UTM Term" },
  { key: "utm_content", label: "UTM Content" },
  { key: "fclid", label: "FCLID" },
];

interface MappingRow { id: string; from: string; to: string }

export function IntegrationWizardDialog({
  open,
  onOpenChange,
  orgId,
  defaultPipelineId,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  defaultPipelineId: string | null;
  editing?: WebhookToken | null;
}) {
  const { data: pipelines = [] } = usePipelines(orgId);
  const create = useCreateIntegration(orgId);
  const update = useUpdateIntegration(orgId);

  const [step, setStep] = useState(1);
  const [pipelineId, setPipelineId] = useState<string | null>(defaultPipelineId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [token, setToken] = useState<WebhookToken | null>(null);
  const [rows, setRows] = useState<MappingRow[]>([]);

  const { data: customFields = [] } = useLeadCustomFieldDefs(orgId, pipelineId);
  const upsertField = useUpsertLeadCustomFieldDef(orgId, pipelineId);

  // New custom field inline state
  const [newFieldRowId, setNewFieldRowId] = useState<string | null>(null);
  const [newField, setNewField] = useState({ key: "", label: "", field_type: "text" as const });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setStep(2);
      setPipelineId(editing.pipeline_id ?? null);
      setName(editing.name);
      setDescription(editing.description || "");
      setToken(editing);
      const m = (editing.field_mapping || {}) as Record<string, string>;
      setRows(Object.entries(m).map(([from, to], i) => ({ id: `r${i}`, from, to })));
    } else {
      setStep(1);
      setPipelineId(defaultPipelineId);
      setName("");
      setDescription("");
      setToken(null);
      setRows([]);
    }
  }, [open, editing, defaultPipelineId]);

  const allTargets = useMemo(() => {
    const customs = customFields.map((f) => ({ key: f.key, label: `${f.label} (custom)` }));
    return [...STANDARD_FIELDS, ...customs];
  }, [customFields]);

  const url = token ? webhookService.getWebhookUrl(token.token) : "";

  const goCreate = async () => {
    if (!name.trim()) return toast.error("Informe um nome para a integração");
    try {
      const t = await create.mutateAsync({
        pipelineId,
        name: name.trim(),
        description: description.trim() || null,
      });
      setToken(t);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), from: "", to: "" }]);
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  const updateRow = (id: string, patch: Partial<MappingRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const saveNewField = async (rowId: string) => {
    if (!newField.key.trim() || !newField.label.trim()) {
      return toast.error("Informe chave e rótulo");
    }
    try {
      await upsertField.mutateAsync({
        key: newField.key,
        label: newField.label,
        field_type: newField.field_type,
      });
      const cleanKey = newField.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      updateRow(rowId, { to: cleanKey });
      setNewFieldRowId(null);
      setNewField({ key: "", label: "", field_type: "text" });
      toast.success("Campo criado e mapeado");
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const saveMapping = async () => {
    if (!token) return;
    const mapping: Record<string, string> = {};
    for (const r of rows) {
      const from = r.from.trim();
      if (!from || !r.to) continue;
      mapping[from] = r.to;
    }
    try {
      await update.mutateAsync({ id: token.id, patch: { field_mapping: mapping, name, description } as any });
      toast.success("Integração salva");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  const Stepper = () => (
    <div className="flex items-center justify-center gap-2 py-2">
      {[
        { n: 1, label: "Criação" },
        { n: 2, label: "Mapeamento" },
      ].map((s, i, arr) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
              step === s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              step > s.n && "bg-primary/20 text-primary",
            )}
          >
            {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
          </div>
          <span className={cn("text-sm", step === s.n ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
          {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            {editing ? "Editar integração" : "Nova integração de webhook"}
          </DialogTitle>
        </DialogHeader>

        <Stepper />

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Pipeline</Label>
              <Select
                value={pipelineId ?? "__none__"}
                onValueChange={(v) => setPipelineId(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (organização)</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Os leads recebidos por este webhook serão associados ao pipeline selecionado.
              </p>
            </div>
            <div>
              <Label>Nome da integração</Label>
              <Input
                placeholder="Ex: Formulário do site, Meta Lead Ads, RD Station..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Para que serve essa integração"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && token && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
              <Label className="text-xs">Link do webhook (envie POST com JSON para esta URL)</Label>
              <div className="flex gap-2">
                <Input value={url} readOnly className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={copyUrl}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Mapeamento de campos</h3>
                <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar campo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Mapeie o nome do campo enviado pela ferramenta de origem para um campo do CRM.
                Campos não mapeados serão salvos automaticamente em <code>custom_fields</code>.
              </p>

              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 mb-1">
                <div className="col-span-5">Nome do campo na origem</div>
                <div className="col-span-6">Mapear para</div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-2">
                    Nenhum mapeamento. A integração funcionará usando os nomes padrão (name, email, phone...).
                  </p>
                )}
                {rows.map((r) => (
                  <div key={r.id} className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-5"
                        placeholder="ex: contact_name"
                        value={r.from}
                        onChange={(e) => updateRow(r.id, { from: e.target.value })}
                      />
                      <div className="col-span-6">
                        <Select
                          value={r.to || ""}
                          onValueChange={(v) => {
                            if (v === "__new__") {
                              setNewFieldRowId(r.id);
                              setNewField({ key: "", label: "", field_type: "text" });
                            } else {
                              updateRow(r.id, { to: v });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um campo do CRM" />
                          </SelectTrigger>
                          <SelectContent>
                            {allTargets.map((t) => (
                              <SelectItem key={t.key} value={t.key}>
                                {t.label} <span className="text-muted-foreground ml-1 text-xs">({t.key})</span>
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__">
                              <span className="text-primary">+ Criar novo campo personalizado</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="col-span-1"
                        onClick={() => removeRow(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    {newFieldRowId === r.id && (
                      <div className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border border-dashed border-primary/40 bg-primary/5">
                        <div className="col-span-3">
                          <Label className="text-xs">Chave</Label>
                          <Input
                            placeholder="ex: cidade"
                            value={newField.key}
                            onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs">Rótulo</Label>
                          <Input
                            placeholder="ex: Cidade"
                            value={newField.label}
                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={newField.field_type}
                            onValueChange={(v) => setNewField({ ...newField, field_type: v as any })}
                          >
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
                        <Button className="col-span-2" onClick={() => saveNewField(r.id)} disabled={upsertField.isPending}>
                          Criar
                        </Button>
                        <Button
                          variant="ghost"
                          className="col-span-1"
                          onClick={() => setNewFieldRowId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && !editing && (
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {step === 1 ? (
            <Button onClick={goCreate} disabled={create.isPending} className="gap-1">
              Continuar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={saveMapping} disabled={update.isPending}>
              Salvar integração
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
