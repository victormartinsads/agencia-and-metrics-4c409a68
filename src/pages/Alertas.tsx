import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import { useClients } from "@/hooks/useClients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  AlertCircle, 
  Coins, 
  Ban, 
  DollarSign, 
  TrendingUp, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle,
  Bell,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  clientId: string;
  clientName: string;
  category: "saldo" | "restricao" | "rejeitado" | "custo";
  severity: "critical" | "warning";
  title: string;
  description: string;
  metrics?: {
    current: string;
    target?: string;
    average?: string;
  };
  date: string;
}

export default function Alertas() {
  const { data: clients = [] } = useClients({ allClientsForStaff: true });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState("all");
  
  // Selected alert for modal detail view
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Dynamic realistic alerts linked to existing client list
  const mockAlerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [
      {
        id: "alert-1",
        clientId: clients[0]?.id || "client-1",
        clientName: clients[0]?.name || "BM 01 - Kairos",
        category: "rejeitado",
        severity: "critical",
        title: "Criativos Rejeitados",
        description: "2 anúncios em vídeo foram rejeitados pela Meta devido à política de 'Modelos de Negócios Inaceitáveis'. O criativo de gancho com promessa financeira agressiva foi sinalizado automaticamente pela moderação automática da plataforma.",
        metrics: { current: "2 rejeitados" },
        date: "Hoje, 10:15"
      },
      {
        id: "alert-2",
        clientId: clients[0]?.id || "client-1",
        clientName: clients[0]?.name || "BM 01 - Kairos",
        category: "custo",
        severity: "warning",
        title: "CPA de Compras Elevado",
        description: "O CPA médio de compras nas últimas 24 horas (R$ 112,50) superou em 40% a meta máxima estipulada da conta (R$ 80,00). O custo por initiate checkout também apresentou aumento significativo nas campanhas de escala de público frio.",
        metrics: { current: "R$ 112,50", target: "R$ 80,00" },
        date: "Hoje, 09:30"
      },
      {
        id: "alert-3",
        clientId: clients[1]?.id || "client-2",
        clientName: clients[1]?.name || "Advocacia Sul",
        category: "restricao",
        severity: "critical",
        title: "Conta de Anúncios Restrita",
        description: "A conta de anúncios do Facebook foi desativada temporariamente por 'atividade de pagamento incomum'. O pagamento via cartão de crédito falhou após 3 tentativas consecutivas de cobrança da Meta.",
        metrics: { current: "Restrita" },
        date: "Ontem, 16:45"
      },
      {
        id: "alert-4",
        clientId: clients[2]?.id || "client-3",
        clientName: clients[2]?.name || "Mentoria Advogados",
        category: "saldo",
        severity: "warning",
        title: "Saldo Pré-Pago Baixo",
        description: "O saldo restante na conta pré-paga é de R$ 92,00. Com a média de gasto diário da conta em R$ 180,00, as campanhas serão pausadas automaticamente por falta de fundos em aproximadamente 12 horas.",
        metrics: { current: "R$ 92,00", target: "R$ 500,00" },
        date: "Ontem, 11:20"
      },
      {
        id: "alert-5",
        clientId: clients[2]?.id || "client-3",
        clientName: clients[2]?.name || "Mentoria Advogados",
        category: "custo",
        severity: "warning",
        title: "Custo por Lead (CPL) Alto",
        description: "O custo por lead (R$ 22,40) está 49% acima da média estipulada de R$ 15,00 para este cliente. O CPC do link subiu de R$ 1,20 para R$ 2,10 na campanha principal de captação.",
        metrics: { current: "R$ 22,40", target: "R$ 15,00" },
        date: "Hoje, 08:10"
      },
      {
        id: "alert-6",
        clientId: clients[3]?.id || "client-4",
        clientName: clients[3]?.name || "Quartzo",
        category: "custo",
        severity: "warning",
        title: "Custo por Page View (LPV) Elevado",
        description: "O custo por visualização da página (R$ 4,80) está alto devido ao baixo Connect Rate da Landing Page (apenas 58% dos cliques no link resultam em visualização completa da página). Página lenta ou problemas com o pixel da Meta.",
        metrics: { current: "R$ 4,80", average: "R$ 2,50" },
        date: "Hoje, 07:15"
      },
      {
        id: "alert-7",
        clientId: clients[3]?.id || "client-4",
        clientName: clients[3]?.name || "Quartzo",
        category: "custo",
        severity: "warning",
        title: "Custo por Iniciação de Checkout (CPIC) Alto",
        description: "O custo por Iniciação de Checkout (CPIC) subiu para R$ 14,20 nas campanhas de remarketing dinâmico, enquanto a média da conta nos últimos 7 dias era R$ 8,50. Sugere-se verificar se o checkout está com problemas de carregamento ou cupons expirados.",
        metrics: { current: "R$ 14,20", average: "R$ 8,50" },
        date: "Ontem, 14:00"
      }
    ];

    // dynamically assign real client names to alerts if clients exist
    return list.map((a, i) => {
      const client = clients[i % clients.length];
      if (client) {
        return {
          ...a,
          clientId: client.id,
          clientName: client.name
        };
      }
      return a;
    });
  }, [clients]);

  // Handle dismiss alert
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  
  // Initialize alerts
  useMemo(() => {
    if (activeAlerts.length === 0 && mockAlerts.length > 0) {
      setActiveAlerts(mockAlerts);
    }
  }, [mockAlerts, activeAlerts]);

  const handleDismiss = (id: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
    setIsDetailOpen(false);
    toast.success("Alerta resolvido/ignorado com sucesso!");
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return activeAlerts.filter(a => {
      const matchSearch = a.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchClient = selectedClientFilter === "all" || a.clientId === selectedClientFilter;
      const matchCategory = selectedCategoryFilter === "all" || a.category === selectedCategoryFilter;
      const matchSeverity = selectedSeverityFilter === "all" || a.severity === selectedSeverityFilter;

      return matchSearch && matchClient && matchCategory && matchSeverity;
    });
  }, [activeAlerts, searchQuery, selectedClientFilter, selectedCategoryFilter, selectedSeverityFilter]);

  // Group alerts by Client
  const groupedClients = useMemo(() => {
    const groups: Record<string, { clientName: string; alerts: AlertItem[] }> = {};
    
    filteredAlerts.forEach(alert => {
      if (!groups[alert.clientId]) {
        groups[alert.clientId] = {
          clientName: alert.clientName,
          alerts: []
        };
      }
      groups[alert.clientId].alerts.push(alert);
    });

    return Object.entries(groups).map(([clientId, group]) => ({
      clientId,
      ...group
    }));
  }, [filteredAlerts]);

  // Counters
  const counters = useMemo(() => {
    return {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === "critical").length,
      warning: activeAlerts.filter(a => a.severity === "warning").length,
      restricted: activeAlerts.filter(a => a.category === "restricao").length,
    };
  }, [activeAlerts]);

  // Category Icon Mapper
  const getCategoryIcon = (category: string, severity: string) => {
    const baseColor = severity === "critical" ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20";
    
    switch (category) {
      case "saldo":
        return (
          <div className={`p-1.5 rounded-lg border ${baseColor} shrink-0`}>
            <Coins className="h-4 w-4" />
          </div>
        );
      case "restricao":
        return (
          <div className={`p-1.5 rounded-lg border ${baseColor} shrink-0`}>
            <Ban className="h-4 w-4" />
          </div>
        );
      case "rejeitado":
        return (
          <div className={`p-1.5 rounded-lg border ${baseColor} shrink-0`}>
            <ShieldAlert className="h-4 w-4" />
          </div>
        );
      case "custo":
        return (
          <div className={`p-1.5 rounded-lg border ${baseColor} shrink-0`}>
            <TrendingUp className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className={`p-1.5 rounded-lg border ${baseColor} shrink-0`}>
            <AlertCircle className="h-4 w-4" />
          </div>
        );
    }
  };

  const handleOpenAlertDetail = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsDetailOpen(true);
  };

  return (
    <AppShell currentPage="alerts" header={null}>
      <div className="min-h-screen bg-background pb-12">
        <div className="px-8 md:px-16 py-8 space-y-8">
          
          {/* Header Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight uppercase flex items-center gap-3">
                <Bell className="h-8 w-8 text-red-500 animate-pulse" /> Painel de Alertas
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Central de monitoramento e anomalias de campanhas, saldos de contas e criativos rejeitados.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 border-border/60 hover:bg-card" onClick={() => setActiveAlerts(mockAlerts)}>
                Resetar Alertas
              </Button>
            </div>
          </div>

          {/* Counters Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/40 border border-border/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Ativos</span>
                <h3 className="text-2xl font-black text-slate-100 mt-1">{counters.total}</h3>
              </div>
              <div className="p-2 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-xl">
                <Bell className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/40 border border-border/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Bloqueios & Críticos</span>
                <h3 className="text-2xl font-black text-red-500 mt-1">{counters.critical}</h3>
              </div>
              <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                <Ban className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/40 border border-border/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Alertas Ativos</span>
                <h3 className="text-2xl font-black text-amber-500 mt-1">{counters.warning}</h3>
              </div>
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </Card>

            <Card className="bg-card/40 border border-border/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Contas Bloqueadas</span>
                <h3 className="text-2xl font-black text-red-400 mt-1">{counters.restricted}</h3>
              </div>
              <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="bg-card/40 border border-border/40 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alertas ou clientes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                <Filter className="h-3.5 w-3.5" /> Filtrar:
              </div>
              
              {/* Client select filter */}
              <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                <SelectTrigger className="h-9 w-[180px] text-xs font-semibold bg-background">
                  <SelectValue placeholder="Clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Clientes</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category select filter */}
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs font-semibold bg-background">
                  <SelectValue placeholder="Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="saldo">Saldo</SelectItem>
                  <SelectItem value="restricao">Status Conta</SelectItem>
                  <SelectItem value="rejeitado">Criativos Rejeitados</SelectItem>
                  <SelectItem value="custo">Custos Elevados</SelectItem>
                </SelectContent>
              </Select>

              {/* Severity select filter */}
              <Select value={selectedSeverityFilter} onValueChange={setSelectedSeverityFilter}>
                <SelectTrigger className="h-9 w-[120px] text-xs font-semibold bg-background">
                  <SelectValue placeholder="Criticidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico (Red)</SelectItem>
                  <SelectItem value="warning">Alerta (Amber)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grouped Alerts by Client Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedClients.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground italic border border-dashed border-border/40 rounded-2xl bg-card/25">
                Nenhum alerta ativo encontrado com os filtros selecionados.
              </div>
            ) : (
              groupedClients.map((group) => {
                const hasCritical = group.alerts.some(a => a.severity === "critical");
                
                return (
                  <Card key={group.clientId} className="bg-card/45 border-border/40 hover:border-border/60 hover:bg-card/65 transition-all flex flex-col overflow-hidden rounded-2xl shadow-lg h-full">
                    {/* Client Card Header */}
                    <CardHeader className="pb-3 border-b border-border/30 bg-white/[0.01]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${hasCritical ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                          <CardTitle className="text-sm font-bold text-slate-100 truncate uppercase tracking-tight">{group.clientName}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-extrabold uppercase shrink-0 py-0.5 px-2 bg-muted text-muted-foreground border-border/40">
                          {group.alerts.length} {group.alerts.length === 1 ? "Alerta" : "Alertas"}
                        </Badge>
                      </div>
                    </CardHeader>

                    {/* Alerts Sublist inside Client Card */}
                    <CardContent className="p-4 flex-grow space-y-2">
                      {group.alerts.map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => handleOpenAlertDetail(alert)}
                          className="group/item flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-background border border-border/30 hover:border-border/80 cursor-pointer transition-all gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getCategoryIcon(alert.category, alert.severity)}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200 group-hover/item:text-primary transition-colors truncate">
                                {alert.title}
                              </p>
                              <span className="text-[9px] text-muted-foreground font-semibold mt-0.5 block truncate">
                                {alert.description}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover/item:translate-x-0.5 transition-transform" />
                        </div>
                      ))}
                    </CardContent>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-border/30 bg-white/[0.01] flex items-center justify-end mt-auto">
                      <a 
                        href={`/dashboard/${group.clientId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-8 text-[11px] font-bold px-3.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors gap-1.5"
                      >
                        Ver Dashboard <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Alert Details Dialog */}
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="bg-card border-border/50 max-w-lg rounded-2xl">
              {selectedAlert && (
                <>
                  <DialogHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(selectedAlert.category, selectedAlert.severity)}
                      <div>
                        <DialogTitle className="text-lg font-black text-slate-100 uppercase tracking-tight">
                          {selectedAlert.title}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                          {selectedAlert.clientName} &bull; {selectedAlert.date}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-5 py-4">
                    {/* Severity Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Nível de Gravidade:</span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-tight rounded-md py-0.5 px-2 ${
                        selectedAlert.severity === "critical" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {selectedAlert.severity === "critical" ? "Crítico / Ação Imediata" : "Alerta de Monitoramento"}
                      </Badge>
                    </div>

                    {/* Detailed Message */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Descrição Completa</span>
                      <div className="bg-[#0f1117]/40 border border-border/30 p-4 rounded-xl text-xs text-slate-200 leading-relaxed font-normal">
                        {selectedAlert.description}
                      </div>
                    </div>

                    {/* Metric Comparison widget */}
                    {selectedAlert.metrics && (
                      <div className="space-y-1.5">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Métricas Analisadas</span>
                        <div className="grid grid-cols-2 gap-4 bg-[#0f1117]/60 border border-border/40 p-4 rounded-xl text-center font-mono">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-0.5">Valor Atual</span>
                            <span className={`text-sm font-bold ${selectedAlert.severity === "critical" ? "text-red-400" : "text-amber-400"}`}>
                              {selectedAlert.metrics.current}
                            </span>
                          </div>
                          {selectedAlert.metrics.target && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-0.5">Meta / Limite</span>
                              <span className="text-sm font-bold text-slate-300">
                                {selectedAlert.metrics.target}
                              </span>
                            </div>
                          )}
                          {selectedAlert.metrics.average && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-0.5">Média da Conta</span>
                              <span className="text-sm font-bold text-slate-300">
                                {selectedAlert.metrics.average}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendation Box */}
                    <div className="bg-primary/5 border border-primary/10 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">Recomendação do Sistema:</span>
                      <p className="text-xs text-slate-300">
                        {selectedAlert.category === "custo" && "Recomenda-se reduzir o orçamento da campanha ofensora em 20% ou pausar criativos específicos com baixo CTR/retardo para reajustar o funil."}
                        {selectedAlert.category === "rejeitado" && "Envie uma contestação da política de privacidade no Painel de Qualidade da Conta do Facebook ou substitua o link de destino/copy para remover palavras sinalizadas."}
                        {selectedAlert.category === "restricao" && "Verifique o método de pagamento principal no Gerenciador de Negócios e efetue o pagamento manual da fatura para reativar os anúncios."}
                        {selectedAlert.category === "saldo" && "Gere uma guia Pix ou boleto de recarga de saldo no painel financeiro de anúncios para evitar a parada completa de tráfego."}
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="pt-3 border-t border-border/40 gap-2 flex-row justify-end">
                    <Button variant="ghost" size="sm" className="h-9 text-xs font-bold gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15" onClick={() => handleDismiss(selectedAlert.id)}>
                      <CheckCircle className="h-4 w-4" /> Marcar Resolvido
                    </Button>
                    
                    <a
                      href={`/ferramentas-do-gestor?tab=meta-ads&client=${selectedAlert.clientId}`}
                      onClick={() => setIsDetailOpen(false)}
                      className="inline-flex items-center justify-center h-9 text-xs font-bold px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors gap-1.5"
                    >
                      Acessar Gerenciador <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </AppShell>
  );
}
