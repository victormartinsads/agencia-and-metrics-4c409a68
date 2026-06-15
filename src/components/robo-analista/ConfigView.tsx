import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMyAssignedClients } from "@/hooks/useRoboAlerts";
import { useUpdateClient } from "@/hooks/useClients";

export function ConfigView() {
  const { data: clients, isLoading } = useMyAssignedClients();
  const updateClient = useUpdateClient();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Local state to handle form inputs before saving
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  const handleChange = (clientId: string, field: string, value: any) => {
    setLocalValues(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value
      }
    }));
  };

  const handleSave = async (clientId: string) => {
    const updates = localValues[clientId];
    if (!updates) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }

    setSavingIds(prev => new Set(prev).add(clientId));
    try {
      await updateClient.mutateAsync({
        id: clientId,
        ...updates
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Você não possui clientes atribuídos no momento para configurar metas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Parâmetros de Otimização</h2>
          <p className="text-sm text-muted-foreground">
            Defina as metas dos seus clientes. O robô usará essas metas para analisar as campanhas na Meta/Google.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => {
          const isSaving = savingIds.has(client.id);
          const cpaLead = localValues[client.id]?.target_cpa_lead ?? client.target_cpa_lead ?? 0;
          const cpaPurchase = localValues[client.id]?.target_cpa_purchase ?? client.target_cpa_purchase ?? 0;
          const autoPause = false; // We can add an auto_pause flag to DB later if needed

          return (
            <Card key={client.id} className="border-border/50 hover:border-border transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">{client.name}</CardTitle>
                <CardDescription>Defina os tetos para alertas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Teto CPL / Cadastro (R$)</Label>
                  <Input 
                    type="number" 
                    value={cpaLead} 
                    onChange={(e) => handleChange(client.id, 'target_cpa_lead', Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teto CPA / Venda (R$)</Label>
                  <Input 
                    type="number" 
                    value={cpaPurchase} 
                    onChange={(e) => handleChange(client.id, 'target_cpa_purchase', Number(e.target.value))} 
                  />
                </div>
                
                <div className="pt-4 border-t flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => handleSave(client.id)}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Metas
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
