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
import { Trash2 } from "lucide-react";
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
  const [form, setForm] = useState<Partial<Lead>>({});

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
          <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Instagram</Label><Input value={form.instagram || ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
          <div><Label>Origem</Label><Input value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          <div><Label>Produto</Label><Input value={form.product || ""} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="col-span-2"><Label>Mensagem</Label><Textarea readOnly value={form.message || lead.message || ""} className="bg-muted/40" /></div>
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
  );
}