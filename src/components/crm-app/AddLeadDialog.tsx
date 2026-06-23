import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLeadCustomFieldDefs } from "@/hooks/useLeadCustomFields";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { usePipelines } from "@/hooks/usePipelines";
import { toast } from "sonner";

export function AddLeadDialog({ orgId, pipelineId = null, open, onClose }: { orgId: string; pipelineId?: string | null; open: boolean; onClose: () => void; }) {
  const qc = useQueryClient();
  const { data: pipelines = [] } = usePipelines(orgId);
  const activePipelineId = pipelineId || pipelines[0]?.id || null;
  const { data: defs = [] } = useLeadCustomFieldDefs(orgId, activePipelineId);
  const { data: stages = [] } = usePipelineStages(activePipelineId);
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
        pipeline_id: activePipelineId,
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
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
        
        <Tabs defaultValue="principal" className="w-full">
          <TabsList className="grid grid-cols-2 bg-muted/40 p-1 rounded-xl w-full mb-4">
            <TabsTrigger value="principal">Principal</TabsTrigger>
            <TabsTrigger value="adicional">Adicionalmente</TabsTrigger>
          </TabsList>
          
          <TabsContent value="principal" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Nome da Oportunidade *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Consultoria em TI" />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">Origem</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="ex: Publicidade" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Mensagem / Requisitos</Label>
                <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Descreva os detalhes da oportunidade..." />
              </div>
              {defs.map((d) => (
                <div key={d.id} className="col-span-2 md:col-span-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">{d.label}</Label>
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
          </TabsContent>
          
          <TabsContent value="adicional" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Nome da Empresa</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa S.A." />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">E-mail de Contato</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="exemplo@empresa.com" />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase">Telefone / WhatsApp</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 (11) 99999-9999" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}