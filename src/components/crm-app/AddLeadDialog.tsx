import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLeadCustomFieldDefs } from "@/hooks/useLeadCustomFields";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { toast } from "sonner";

export function AddLeadDialog({ orgId, pipelineId = null, open, onClose }: { orgId: string; pipelineId?: string | null; open: boolean; onClose: () => void; }) {
  const qc = useQueryClient();
  const { data: defs = [] } = useLeadCustomFieldDefs(orgId, pipelineId);
  const { data: stages = [] } = usePipelineStages(pipelineId);
  const [form, setForm] = useState<any>({ name: "", email: "", phone: "", company: "", source: "manual", value: "", message: "", custom_fields: {} });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name && !form.email && !form.phone) { toast.error("Informe nome, email ou telefone"); return; }
    setSaving(true);
    try {
      const firstStage = stages[0];
      const payload: any = { 
        ...form, 
        organization_id: orgId, 
        pipeline_id: pipelineId,
        stage_id: firstStage?.id || null,
        status: firstStage ? (firstStage.is_won ? 'closed' : firstStage.is_lost ? 'lost' : 'new') : 'new'
      };
      payload.value = form.value ? Number(form.value) : null;
      payload.custom_fields = form.custom_fields || {};
      const { error } = await (supabase as any).from("leads").insert(payload);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["crm-app-leads", orgId] });
      toast.success("Lead criado");
      onClose();
      setForm({ name: "", email: "", phone: "", company: "", source: "manual", value: "", message: "", custom_fields: {} });
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Origem</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          <div className="col-span-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div className="col-span-2"><Label>Mensagem</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          {defs.map((d) => (
            <div key={d.id} className="col-span-2 md:col-span-1">
              <Label>{d.label}</Label>
              <Input
                type={d.field_type === "number" ? "number" : d.field_type === "date" ? "date" : "text"}
                value={(form.custom_fields?.[d.key]) ?? ""}
                onChange={(e) => setForm({
                  ...form,
                  custom_fields: { ...(form.custom_fields || {}), [d.key]: e.target.value },
                })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}