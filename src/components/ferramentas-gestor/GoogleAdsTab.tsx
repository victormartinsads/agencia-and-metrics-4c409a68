import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  ChevronRight,
  TrendingUp,
  Lock
} from "lucide-react";
import { Client } from "@/hooks/useClients";

interface GoogleAdsTabProps {
  selectedClient: Client | null;
  googleData: any;
  isLoading: boolean;
  onRefresh: () => void;
}

export function GoogleAdsTab({ selectedClient, googleData, isLoading, onRefresh }: GoogleAdsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("gestao");

  const campaigns = useMemo(() => {
    return googleData?.campaigns || [];
  }, [googleData]);

  const totals = useMemo(() => {
    return googleData?.totals || {
      cost: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0
    };
  }, [googleData]);

  // Kanban Columns
  const kanbanColumns = useMemo(() => {
    const active = campaigns.filter((c: any) => c.status === "ENABLED" || c.status === "enabled");
    const inactive = campaigns.filter((c: any) => c.status === "PAUSED" || c.status === "paused" || c.status === "REMOVED");
    const attention = campaigns.filter((c: any) => c.cost === 0 && (c.status === "ENABLED" || c.status === "enabled"));
    
    return {
      ATIVAS: active,
      INATIVAS: inactive,
      "A RESOLVER": attention
    };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (!searchTerm) return campaigns;
    return campaigns.filter((c: any) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [campaigns, searchTerm]);

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-fit">
          <TabsList className="bg-card/80 border border-border/60 p-1 rounded-xl">
            <TabsTrigger value="gestao" className="px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer">Gestão</TabsTrigger>
            <TabsTrigger value="kanban" className="px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer">Kanban</TabsTrigger>
            <TabsTrigger value="resultados" className="px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer">Resultados (Beta)</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="border-border hover:bg-white/[0.05] text-xs font-semibold gap-1.5 h-9 shrink-0">
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} /> Sincronizar
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold gap-1.5 h-9 shrink-0 shadow-lg">
            <Plus className="h-3.5 w-3.5" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Main Area based on sub-tab */}
      {activeSubTab === "gestao" && (
        <div className="space-y-4">
          {/* Table filters toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanha Google Ads..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-card/50 border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-border hover:bg-white/[0.05] text-xs h-9 font-semibold gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filtrar por tags
              </Button>
            </div>
          </div>

          {/* Gestão Table */}
          <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-white/[0.02] text-muted-foreground font-bold">
                    <th className="p-4">Cliente / Campanha</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Investimento</th>
                    <th className="p-4 text-right">Conversões</th>
                    <th className="p-4 text-right">CTR / Cliques</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {selectedClient ? (
                    filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((c: any) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                              G
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {c.id}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`border text-[10px] font-bold py-0.5 rounded-full ${
                              c.status === "ENABLED" || c.status === "enabled" 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-white/[0.03] text-muted-foreground border-border"
                            }`}>
                              {c.status === "ENABLED" || c.status === "enabled" ? "Ativa" : "Pausada"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[9px] border-border text-slate-300 rounded-md font-medium uppercase">
                              {c.type || "Search"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-200">
                            {Number(c.cost || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-200">
                            {c.conversions || 0}
                          </td>
                          <td className="p-4 text-right">
                            <div>{(c.ctr * 100).toFixed(2)}%</div>
                            <div className="text-[10px] text-muted-foreground">{c.clicks || 0} cliques</div>
                          </td>
                          <td className="p-4 text-right">
                            <Link to={`/gestor/${selectedClient.id}`} className="inline-flex items-center justify-center rounded-md text-xs font-bold text-primary hover:text-primary/95 transition-colors h-7 px-2 hover:bg-white/[0.04] gap-0.5">
                              Gerenciar <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Nenhuma campanha encontrada no Google Ads para {selectedClient.name}.
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Selecione um cliente no cabeçalho superior para ver seus dados Google Ads.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(kanbanColumns) as Array<keyof typeof kanbanColumns>).map(colName => {
            const list = kanbanColumns[colName];
            return (
              <div key={colName} className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">{colName}</h3>
                  <Badge className="bg-white/[0.03] text-muted-foreground border border-border/60 text-[10px] font-bold py-0">
                    {list.length}
                  </Badge>
                </div>
                <div className="space-y-3 min-h-[300px] bg-white/[0.01] border border-dashed border-border/60 rounded-2xl p-3">
                  {list.map((c: any) => (
                    <Link key={c.id} to={`/gestor/${selectedClient?.id}`} className="block">
                      <Card className="bg-card border-border/60 hover:border-primary/40 transition-all rounded-xl p-4 space-y-3 shadow-md cursor-pointer">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">{c.name}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase">{c.type || "Search"}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground">Gasto:</span>
                          <span className="text-xs font-bold text-slate-200">
                            {Number(c.cost || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                  {list.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-12">Nenhuma campanha neste status.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSubTab === "resultados" && (
        <div className="relative rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-xl min-h-[350px] flex items-center justify-center">
          <div className="absolute inset-0 bg-cover bg-center filter blur-md opacity-20 pointer-events-none" />
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md gap-4 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight text-slate-200">Resultados Google Ads</h3>
              <p className="text-xs text-muted-foreground">O módulo de relatórios e resultados detalhados de performance do Google Ads está em fase final de testes internos e estará disponível em breve no plano Agency.</p>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs">
              Solicitar Acesso Antecipado
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
