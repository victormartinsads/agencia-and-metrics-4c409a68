import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Client } from "@/hooks/useClients";

interface OverviewTabProps {
  selectedClient: Client | null;
  clients: Client[];
  metaData: any;
  googleData: any;
  onSelectClient: (id: string) => void;
}

export function OverviewTab({ selectedClient, clients, metaData, googleData, onSelectClient }: OverviewTabProps) {
  const [showValues, setShowValues] = useState(true);
  const [tasks, setTasks] = useState([
    { id: 1, text: "Revisar saldo da conta BM - 01 KAIROS", done: false },
    { id: 2, text: "Otimizar orçamento de campanha Meta Ads Advocacia", done: true },
    { id: 3, text: "Configurar automação de relatório diário", done: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    // Capitalize each word
    return dateStr.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  }, []);

  const totalSpend = useMemo(() => {
    const metaSpend = metaData?.overviewMetrics?.totalSpend || 0;
    const googleSpend = googleData?.totals?.cost || 0;
    return metaSpend + googleSpend;
  }, [metaData, googleData]);

  const activeCampaignsCount = useMemo(() => {
    const metaCount = metaData?.campaigns?.filter((c: any) => c.status === "ACTIVE" || c.status === "active")?.length || 0;
    const googleCount = googleData?.campaigns?.filter((c: any) => c.status === "ENABLED" || c.status === "enabled")?.length || 0;
    return metaCount + googleCount;
  }, [metaData, googleData]);

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      {/* Trial Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-lg backdrop-blur-sm">
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-10 bg-radial-gradient from-amber-500/80 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider mb-2">
              Período de Testes
            </Badge>
            <h3 className="text-lg font-extrabold tracking-tight text-amber-200">Você está no período de teste gratuito de 7 dias.</h3>
            <p className="text-sm text-slate-300 max-w-xl">Configure suas integrações de WhatsApp, Meta e Google Ads para extrair o máximo das automações e alertas diários.</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0 shadow-[0_4px_20px_rgba(245,158,11,0.3)]">
            Fazer Upgrade Pro
          </Button>
        </div>
      </div>

      {/* Client Selector Grid (similar to Clientes page) */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Meus Clientes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {clients.map(c => {
            const isSelected = selectedClient?.id === c.id;
            const initials = c.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            return (
              <Card 
                key={c.id} 
                onClick={() => onSelectClient(c.id)}
                className={`group relative overflow-hidden border transition-all cursor-pointer p-4 ${
                  isSelected 
                    ? "bg-primary/10 border-primary shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.08)] scale-[1.02]" 
                    : "bg-card/80 border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-9 w-9 shrink-0 rounded-md object-cover bg-black border border-border/40" />
                  ) : (
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md font-mono text-xs font-bold ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                    }`}>
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black uppercase text-slate-200">{c.name}</p>
                    <p className="truncate font-mono text-[9px] text-muted-foreground">/{c.slug || c.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2 text-[9px] text-muted-foreground">
                  <span>{c.ad_account_ids?.length || 0} conta(s)</span>
                  <Badge variant="outline" className={`text-[8px] font-bold px-1.5 py-0 rounded ${
                    isSelected ? "border-primary text-primary bg-primary/10" : "border-transparent bg-white/5 text-slate-300"
                  }`}>
                    {isSelected ? "Ativo" : "Selecionar"}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* AdsDaily Header Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-card border border-border/40 rounded-2xl overflow-hidden shadow-xl p-6 relative">
        <div className="lg:col-span-2 flex flex-col justify-center space-y-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight max-w-md text-white">
            Sua operação <span className="text-primary">360°</span> em um só lugar, com o <span className="text-primary font-black">AdsDaily</span>.
          </h2>
          <div className="w-fit px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">
            Período de teste gratuito
          </div>
        </div>
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border/40 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{formattedDate}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowValues(!showValues)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
            >
              {showValues ? <EyeOff className="h-3.5 w-3.5 text-primary" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          </div>
          <div className="mt-4 space-y-1">
            <h1 className="text-xl font-black text-white tracking-tight">Fala, {selectedClient?.name.split(" ")[0] || "Gestor"}! 👋</h1>
            <p className="text-xs text-muted-foreground leading-snug">Aqui está o que importa na sua operação agora.</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Investimento em anúncios */}
        <Card className="bg-card border border-border/40 shadow-xl rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5 shrink-0">
              <div className="h-7 w-7 rounded-full bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center shadow-inner">
                <span className="text-xs text-[#1877f2] font-black">∞</span>
              </div>
              <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                <span className="text-[10px] text-primary font-black">▲</span>
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investimento em anúncios</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black tracking-tight text-white">
              {showValues ? (
                totalSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              ) : (
                "••••••"
              )}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">Meta e Google Ads</span>
          </div>
        </Card>

        {/* Campanhas ativas */}
        <Card className="bg-card border border-border/40 shadow-xl rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campanhas ativas</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black tracking-tight text-white">{activeCampaignsCount}</span>
            <span className="text-[10px] text-muted-foreground font-semibold">{activeCampaignsCount} na carteira</span>
          </div>
        </Card>

        {/* Ações necessárias */}
        <Card className="bg-card border border-amber-500/20 shadow-xl rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações necessárias</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black tracking-tight text-white">2</span>
            <span className="text-[10px] text-muted-foreground font-semibold">2 saldos · 0 revisões</span>
          </div>
        </Card>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Media Channels & Attention */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Media Channels */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Canais de Mídia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/80 border-border/60 hover:border-primary/30 transition-all rounded-2xl cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Meta Ads
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metaData?.campaigns?.length || 0} campanhas integradas
                    </div>
                    <div className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-fit mt-1">
                      1 conta precisa de revisão
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </CardContent>
              </Card>

              <Card className="bg-card/80 border-border/60 hover:border-primary/30 transition-all rounded-2xl cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Google Ads <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] scale-90 rounded-sm font-bold py-0">BETA</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {googleData?.campaigns?.length || 0} campanhas integradas
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit mt-1">
                      Conexão estável e ativa
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Attention / Warnings */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Precisa de Atenção</h3>
            <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-lg">
              <div className="divide-y divide-white/[0.06]">
                <div className="p-4 flex items-center justify-between bg-amber-500/5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Conta BM - 01 KAIROS (Meta Ads)</h4>
                      <p className="text-xs text-muted-foreground">Saldo atual: R$ 0,00</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-amber-500/20 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 font-semibold text-xs">
                    Revisar Saldo
                  </Button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">WhatsApp Desconectado</h4>
                      <p className="text-xs text-muted-foreground">Conecte um número nas Integrações para enviar automações</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-border hover:bg-white/[0.05] text-xs font-semibold">
                    Conectar
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>

        {/* Tasks & Meetings */}
        <div className="space-y-6">
          
          {/* Tasks Widget */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Minhas Tarefas</h3>
              <Button variant="link" className="text-xs p-0 h-auto font-bold text-primary flex items-center gap-0.5">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-lg p-4">
              <div className="space-y-3">
                {tasks.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => toggleTask(t.id)}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className={`h-5 w-5 shrink-0 transition-colors ${t.done ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`} />
                    <span className={`text-xs font-medium leading-tight ${t.done ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Meetings Widget */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Próximas Reuniões</h3>
              <Button variant="link" className="text-xs p-0 h-auto font-bold text-primary flex items-center gap-0.5">
                Agenda <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-lg p-5 text-center">
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="h-12 w-12 rounded-full bg-white/[0.03] border border-border/60 flex items-center justify-center text-muted-foreground/60">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Nenhuma reunião programada</h4>
                  <p className="text-[10px] text-muted-foreground max-w-[180px] mx-auto">Sua agenda está livre para hoje. Conecte sua conta Google para sincronizar reuniões.</p>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
