import { useState, useEffect } from "react";
import { Lead, LeadStatus, STATUS_CONFIG } from "@/lib/crm-app";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateLead, useDeleteLead, useUpdateLeadStatus } from "@/hooks/useCrmAppLeads";
import { useLeadCustomFieldDefs } from "@/hooks/useLeadCustomFields";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Trash2, MessageSquare, Instagram, Eye } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lead: Lead | null;
  orgId: string;
  open: boolean;
  onClose: () => void;
}

export function LeadDetail({ lead, orgId, open, onClose }: Props) {
  const update = useUpdateLead(orgId);
  const del = useDeleteLead(orgId);
  const updStatus = useUpdateLeadStatus(orgId);
  const { data: defs = [] } = useLeadCustomFieldDefs(orgId);
  const { data: stages = [] } = usePipelineStages(lead?.pipeline_id);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead?.id]);

  if (!lead) return null;

  const save = async () => {
    const patch: any = {
      name: form.name, email: form.email, phone: form.phone, company: form.company,
      instagram: form.instagram, source: form.source, product: form.product,
      value: form.value ?? null, notes: form.notes,
      custom_fields: form.custom_fields || {},
    };
    try {
      await update.mutateAsync({ id: lead.id, patch });
      if (form.status && form.status !== lead.status) {
        await updStatus.mutateAsync({ id: lead.id, status: form.status as LeadStatus, oldStatus: lead.status });
      }
      toast.success("Lead atualizado");
      onClose();
    } catch (e: any) { toast.error(e.message || "Erro"); }
  };

  const remove = async () => {
    if (!confirm("Excluir este lead?")) return;
    try { await del.mutateAsync(lead.id); toast.success("Excluído"); onClose(); }
    catch (e: any) { toast.error(e.message || "Erro"); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Status</Label>
            <Select value={form.status || lead.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                  <SelectItem key={k} value={k}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Empresa</Label><Input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Telefone</Label>
            <div className="flex gap-2">
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!form.phone}
                onClick={() => {
                  if (form.phone) {
                    const cleaned = form.phone.replace(/\D/g, "");
                    if (cleaned) {
                      const link = cleaned.length <= 11 && !cleaned.startsWith("55")
                        ? `https://wa.me/55${cleaned}`
                        : `https://wa.me/${cleaned}`;
                      window.open(link, "_blank");
                    }
                  }
                }}
                title="Abrir WhatsApp"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Instagram</Label>
            <div className="flex gap-2">
              <Input
                value={form.instagram || ""}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!form.instagram}
                onClick={() => {
                  if (form.instagram) {
                    const cleaned = form.instagram.trim().replace(/^@/, "").toLowerCase();
                    if (cleaned) {
                      window.open(`https://instagram.com/${cleaned}`, "_blank");
                    }
                  }
                }}
                title="Abrir Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div><Label>Origem</Label><Input value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          <div><Label>Produto</Label><Input value={form.product || ""} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="col-span-2"><Label>Mensagem</Label><Textarea readOnly value={form.message || lead.message || ""} className="bg-muted/40" /></div>
          {lead.raw_data && Object.keys(lead.raw_data).length > 0 && (
            <div className="col-span-2 flex items-center justify-between bg-muted/20 border border-border/60 p-2.5 rounded-xl mt-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                Este lead contém dados brutos recebidos via Webhook.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                onClick={() => setShowRawData(true)}
              >
                <Eye className="h-3.5 w-3.5" /> Ver Respostas
              </Button>
            </div>
          )}
          <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} /></div>
          {defs.length > 0 && (
            <div className="col-span-2 border-t border-border pt-3 mt-1">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Campos personalizados</h4>
              <div className="grid grid-cols-2 gap-3">
                {defs.map((d) => {
                  const cf = (form.custom_fields || {}) as Record<string, any>;
                  const val = cf[d.key] ?? "";
                  return (
                    <div key={d.id}>
                      <Label>{d.label}</Label>
                      <Input
                        type={d.field_type === "number" ? "number" : d.field_type === "date" ? "date" : "text"}
                        value={val}
                        onChange={(e) => setForm({
                          ...form,
                          custom_fields: { ...cf, [d.key]: e.target.value },
                        })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linha do Tempo e Estágios */}
          <div className="col-span-2 border-t border-border pt-3 mt-1">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Histórico de Estágios do Lead</h4>
            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/40 mb-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Criado em</span>
                <span className="font-medium text-foreground">
                  {lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR") : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Última atualização</span>
                <span className="font-medium text-foreground">
                  {lead.updated_at ? new Date(lead.updated_at).toLocaleString("pt-BR") : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Entrada nos Estágios</span>
              {stages.length > 0 ? (
                <div className="relative pl-4 border-l border-border/80 ml-1.5 space-y-3">
                  {stages.map((stage) => {
                    const entryDateStr = lead.stage_history?.[stage.id];
                    const entryDate = entryDateStr ? new Date(entryDateStr) : null;
                    const isCurrent = lead.stage_id === stage.id;

                    return (
                      <div key={stage.id} className="relative flex items-center justify-between text-xs py-0.5">
                        {/* Timeline dot */}
                        <span
                          className={`absolute -left-[21px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-background ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                          style={{ backgroundColor: stage.color || '#22c55e' }}
                        />

                        <span className={`font-medium ${isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          {stage.name} {isCurrent && <span className="text-[9px] ml-1.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Atual</span>}
                        </span>

                        <span className="text-muted-foreground font-mono">
                          {entryDate ? entryDate.toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhum estágio configurado para este pipeline.</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <Button variant="ghost" onClick={remove} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={update.isPending}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Dialog Ver Respostas Webhook */}
      <Dialog open={showRawData} onOpenChange={setShowRawData}>
        <DialogContent className="max-w-md bg-[#0f0f12] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider font-display flex items-center gap-1.5 text-card-foreground">
              📝 Respostas do Formulário (Webhook)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Abaixo estão listados todos os campos e valores recebidos na requisição original do webhook.
            </p>
            <div className="border border-border/40 rounded-xl bg-black/40 overflow-hidden divide-y divide-border/20 max-h-[60vh] overflow-y-auto">
              {Object.entries(lead.raw_data || {}).map(([key, val]) => {
                const displayValue = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
                return (
                  <div key={key} className="p-3 text-xs space-y-1">
                    <span className="font-bold text-primary block uppercase tracking-wider text-[9px]">{key}</span>
                    <span className="text-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowRawData(false)} className="h-8 text-xs font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}