import { useState } from "react";
import { ActionCard, ActionAlert } from "./ActionCard";
import { Inbox as InboxIcon, CheckCircle, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRoboAlerts, useMyAssignedClients, useGenerateAlerts, useResolveAlert, OptimizationSuggestion } from "@/hooks/useRoboAlerts";

export function InboxView() {
  const { data: clients, isLoading: loadingClients } = useMyAssignedClients();
  const { data: suggestions, isLoading: loadingAlerts } = useRoboAlerts();
  const generateAlerts = useGenerateAlerts();
  const resolveAlert = useResolveAlert();

  const handleApprove = async (id: string) => {
    const suggestion = suggestions?.find(s => s.id === id);
    if (!suggestion) return;
    
    toast.info("Aplicando ação na Meta Ads...");
    try {
      await resolveAlert.mutateAsync({ alert: suggestion, resolution: "applied" });
      toast.success("Ação aplicada com sucesso na Meta Ads!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao aplicar na Meta.");
    }
  };

  const handleReject = (id: string) => {
    const suggestion = suggestions?.find(s => s.id === id);
    if (!suggestion) return;
    
    toast.info("Alerta ignorado.");
    resolveAlert.mutate({ alert: suggestion, resolution: "rejected" });
  };

  const handleRefresh = async () => {
    if (!clients || clients.length === 0) {
      toast.error("Nenhum cliente atribuído a você.");
      return;
    }
    toast.info("Analisando campanhas na Meta Ads... Isso pode levar alguns segundos.");
    const clientIds = clients.map(c => c.id);
    await generateAlerts.mutateAsync(clientIds);
    toast.success("Métricas atualizadas e analisadas!");
  };

  // Convert Suggestion to ActionAlert format for the UI
  const formatSuggestionToAlert = (s: OptimizationSuggestion): ActionAlert => {
    const meta = s.metadata || {};
    return {
      id: s.id,
      clientName: s.client?.name || "Cliente Desconhecido",
      campaignName: s.level === 'campaign' ? s.object_name : '', // Se tivermos id da campanha no metadata no futuro
      assetName: s.object_name,
      assetType: s.level === 'campaign' ? 'Campanha' : 'Criativo',
      type: s.severity === 'high' ? 'danger' : s.severity === 'medium' ? 'warning' : s.severity === 'low' ? 'success' : 'info',
      message: s.reason,
      metrics: {
        spend: meta.spend || 0,
        cpa: meta.cpa,
        cpl: meta.cpl,
        roas: meta.roas,
      },
      suggestedAction: s.action as any,
      timestamp: new Date(s.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const isLoading = loadingClients || loadingAlerts;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando seus alertas...</p>
      </div>
    );
  }

  const alerts = (suggestions || []).map(formatSuggestionToAlert);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Tudo Otimizado!</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Nenhuma anomalia detectada nas campanhas dos seus clientes atribuídos.
        </p>
        <Button onClick={handleRefresh} disabled={generateAlerts.isPending} variant="outline" className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${generateAlerts.isPending ? 'animate-spin' : ''}`} />
          Analisar Campanhas Agora
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-primary" />
            Caixa de Entrada ({alerts.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Anomalias detectadas pelo robô aguardando sua aprovação.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={generateAlerts.isPending} className="gap-2">
          <RefreshCcw className={`w-4 h-4 ${generateAlerts.isPending ? 'animate-spin' : ''}`} />
          {generateAlerts.isPending ? 'Analisando...' : 'Atualizar Análise'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {alerts.map((alert) => (
          <ActionCard 
            key={alert.id} 
            alert={alert} 
            onApprove={handleApprove} 
            onReject={handleReject} 
          />
        ))}
      </div>
    </div>
  );
}
