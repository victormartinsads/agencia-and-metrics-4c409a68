import { useMemo } from "react";
import { useGoogleConnectionStatus, useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import { Globe, Users, TrendingUp, BarChart3, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  clientId?: string;
  datePreset?: string;
  gaData?: any;
}

export function DiagnosticoGoogleFunnelSection({ clientId, datePreset, gaData }: Props) {
  const { data: status } = useGoogleConnectionStatus(clientId && !gaData ? clientId : undefined);
  const connected = gaData ? true : (status?.connected === true);

  const { data: ga, isLoading } = useGoogleAnalytics(
    clientId && !gaData ? clientId : undefined,
    datePreset && !gaData ? datePreset : undefined,
    connected && !gaData
  );

  const finalGa = gaData || ga;
  const overview = finalGa?.overview;
  const events = finalGa?.events || [];

  const funnelData = useMemo(() => {
    if (!overview) return null;

    const pageViews = overview.pageViews || 0;
    const sessions = overview.sessions || 0;
    const engaged = overview.engagedSessions || 0;

    // Calculate rates
    const viewToSession = pageViews > 0 ? (sessions / pageViews) * 100 : 0;
    const sessionToEngaged = sessions > 0 ? (engaged / sessions) * 100 : 0;

    return {
      pageViews,
      sessions,
      engaged,
      viewToSession,
      sessionToEngaged,
    };
  }, [overview]);

  if (!connected || ga?.notConnected || ga?.needsPropertySelection || (!isLoading && !overview)) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6 border border-border bg-card flex items-center justify-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Carregando Funil do Google Analytics...</span>
      </Card>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      
      {/* Cabeçalho */}
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-card-foreground">Funil do Google Analytics (GA4)</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dados de tráfego, engajamento e conversão coletados do site
          </p>
        </div>
        <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Conectado
        </span>
      </header>

      {/* Visualização de Funil */}
      {funnelData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
          
          {/* Gráfico Visual do Funil (Esquerda) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapas de Acesso</h4>
            
            {/* Step 1: Page Views */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-card-foreground">1. Visualizações de Página (Pageviews)</span>
                <span className="text-primary font-bold">{funnelData.pageViews.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-7 w-full bg-muted/40 rounded-lg overflow-hidden border border-border relative flex items-center px-3">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-lg transition-all" 
                  style={{ width: "100%" }}
                />
                <span className="relative text-[10px] text-muted-foreground font-medium z-10">Base de Acessos</span>
              </div>
            </div>

            {/* Conversão Step 1 -> Step 2 */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span>Conversão em Sessão:</span>
              <span className="text-primary font-bold">{funnelData.viewToSession.toFixed(1)}%</span>
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Step 2: Sessions */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-card-foreground">2. Sessões Iniciadas</span>
                <span className="text-primary font-bold">{funnelData.sessions.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-7 w-full bg-muted/40 rounded-lg overflow-hidden border border-border relative flex items-center px-3">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-lg transition-all" 
                  style={{ width: `${Math.min(100, Math.max(5, funnelData.viewToSession))}%` }}
                />
                <span className="relative text-[10px] text-muted-foreground font-medium z-10">Sessões Totais</span>
              </div>
            </div>

            {/* Conversão Step 2 -> Step 3 */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span>Taxa de Engajamento:</span>
              <span className="text-primary font-bold">{funnelData.sessionToEngaged.toFixed(1)}%</span>
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Step 3: Engaged Sessions */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-card-foreground">3. Sessões Engajadas</span>
                <span className="text-primary font-bold">{funnelData.engaged.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-7 w-full bg-muted/40 rounded-lg overflow-hidden border border-border relative flex items-center px-3">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-l-lg transition-all" 
                  style={{ width: `${Math.min(100, Math.max(5, (funnelData.engaged / funnelData.pageViews) * 100))}%` }}
                />
                <span className="relative text-[10px] text-muted-foreground font-medium z-10">Sessões com interação real (+10s ou +2 páginas)</span>
              </div>
            </div>
          </div>

          {/* Lista de Conversões/Eventos do Google (Direita) */}
          <div className="lg:col-span-5 rounded-xl border border-border bg-muted/20 p-4 space-y-3.5">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-card-foreground uppercase tracking-wider">Eventos e Conversões (GA4)</h4>
            </div>

            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhum evento registrado no período.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {events.map((evt) => {
                  // Standardize labels for key conversion markers
                  const isConversion = ["generate_lead", "lead", "purchase", "contact", "whatsapp_click", "click"].includes(evt.name.toLowerCase());
                  
                  return (
                    <div 
                      key={evt.name} 
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                        isConversion 
                          ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                          : "bg-background border-border/60 hover:border-muted-foreground/30"
                      }`}
                    >
                      <span className="font-medium text-card-foreground truncate max-w-[180px] flex items-center gap-1.5">
                        {isConversion && <Sparkles className="h-3 w-3 text-primary animate-pulse shrink-0" />}
                        {evt.name}
                      </span>
                      <span className="font-mono font-bold text-primary">{evt.count.toLocaleString("pt-BR")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              * Eventos destacados com <span className="text-primary font-semibold">brilho</span> representam metas e ações-chave do usuário no site.
            </p>
          </div>

        </div>
      )}
    </section>
  );
}
