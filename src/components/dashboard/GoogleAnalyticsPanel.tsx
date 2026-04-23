import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGoogleConnectionStatus,
  useGoogleAnalytics,
  useConnectGoogle,
  useDisconnectGoogle,
} from "@/hooks/useGoogleAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getGoogleOAuthRedirectUri } from "@/lib/googleOAuth";
import {
  Users, Eye, Clock, TrendingUp, Loader2, Link2, Unlink,
  BarChart3, Globe, ArrowUpRight, MousePointerClick,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

interface Props {
  clientId?: string;
  datePreset?: string;
}

export function GoogleAnalyticsPanel({ clientId, datePreset }: Props) {
  const { data: status, isLoading: statusLoading } = useGoogleConnectionStatus(clientId);
  const isConnected = status?.connected === true;
  const { data: gaData, isLoading: gaLoading, error: gaError } = useGoogleAnalytics(
    clientId,
    datePreset,
    isConnected
  );
  const connectGoogle = useConnectGoogle();
  const disconnectGoogle = useDisconnectGoogle();
  const qc = useQueryClient();
  const [selectingProperty, setSelectingProperty] = useState(false);

  const handleConnect = async () => {
    if (!clientId) return;
    const redirectUri = getGoogleOAuthRedirectUri();
    try {
      const result = await connectGoogle.mutateAsync({ clientId, redirectUri });
      window.location.href = result.authUrl;
    } catch {
      toast.error("Erro ao iniciar conexão com Google");
    }
  };

  const handleDisconnect = async () => {
    if (!clientId) return;
    try {
      await disconnectGoogle.mutateAsync(clientId);
      toast.success("Google Analytics desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const handleSelectProperty = async (propertyId: string) => {
    if (!clientId) return;
    try {
      const { error } = await supabase
        .from("clients")
        .update({ ga_property_id: propertyId })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Propriedade GA4 vinculada!");
      setSelectingProperty(false);
      qc.invalidateQueries({ queryKey: ["google-analytics", clientId] });
    } catch {
      toast.error("Erro ao vincular propriedade");
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Verificando conexão...</span>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 space-y-4"
      >
        <Globe className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Google Analytics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte sua conta do Google para visualizar dados de tráfego e comportamento do site.
          </p>
        </div>
        <Button
          onClick={handleConnect}
          disabled={connectGoogle.isPending}
          className="gap-2"
        >
          {connectGoogle.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Conectar com Google
        </Button>
      </motion.div>
    );
  }

  if (gaLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando dados do Analytics...</span>
      </div>
    );
  }

  if (gaData?.needsPropertySelection && gaData.properties) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Selecionar Propriedade GA4</h3>
            <p className="text-sm text-muted-foreground">
              Escolha a propriedade do Google Analytics que deseja monitorar.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-1 text-destructive">
            <Unlink className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </div>
        {gaData.properties.length === 0 ? (
          gaData.apiError?.error ? (
            <Card className="p-6 space-y-3 border-dashed border-destructive/40">
              <p className="text-sm text-destructive font-semibold">
                A API Google Analytics Admin não está ativada no seu projeto do Google Cloud.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para listar suas propriedades GA4, você precisa habilitar a API <strong>Google Analytics Admin API</strong> no projeto Google Cloud que criou as credenciais OAuth.
              </p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 leading-relaxed">
                <li>Clique no botão abaixo para abrir a página da API.</li>
                <li>Clique em <strong>"Ativar"</strong> (Enable).</li>
                <li>Aguarde cerca de 1 minuto para propagar.</li>
                <li>Volte aqui e atualize a página.</li>
              </ol>
              <div className="flex gap-2 flex-wrap pt-1">
                <Button asChild size="sm" variant="default" className="gap-1">
                  <a
                    href={
                      gaData.apiError.error.details?.find((d: any) => d.metadata?.activationUrl)
                        ?.metadata?.activationUrl ||
                      "https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Ativar API no Google Cloud
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => qc.invalidateQueries({ queryKey: ["google-analytics", clientId] })}
                >
                  Tentar novamente
                </Button>
              </div>
            </Card>
          ) : (
          <Card className="p-6 space-y-3 border-dashed">
            <p className="text-sm text-foreground font-medium">
              Nenhuma propriedade GA4 encontrada nesta conta Google.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Possíveis causas:
              <br />• A conta Google autenticada não tem acesso a nenhuma propriedade do Google Analytics 4.
              <br />• A propriedade existe em outra conta Google — desconecte e reconecte com a conta correta.
              <br />• A conta tem apenas Universal Analytics (UA), que foi descontinuado. Crie uma propriedade GA4.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDisconnect} className="gap-1">
                <Unlink className="h-3.5 w-3.5" /> Desconectar e tentar outra conta
              </Button>
            </div>
          </Card>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gaData.properties.map((prop) => (
            <Card
              key={prop.id}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectProperty(prop.id)}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{prop.name}</p>
                  <p className="text-xs text-muted-foreground">{prop.account} • ID: {prop.id}</p>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  if (gaError || !gaData?.overview) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground text-sm">Erro ao carregar dados do Analytics</p>
        <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-1 text-destructive">
          <Unlink className="h-3.5 w-3.5" /> Desconectar e reconectar
        </Button>
      </div>
    );
  }

  const { overview, daily, sources } = gaData;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Google Analytics</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-1 text-xs text-muted-foreground">
          <Unlink className="h-3 w-3" /> Desconectar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Sessões" value={overview.sessions.toLocaleString("pt-BR")} icon={MousePointerClick} delay={0} />
        <KpiCard title="Usuários" value={overview.totalUsers.toLocaleString("pt-BR")} icon={Users} delay={0.05} />
        <KpiCard title="Novos Usuários" value={overview.newUsers.toLocaleString("pt-BR")} icon={ArrowUpRight} delay={0.1} />
        <KpiCard title="Page Views" value={overview.pageViews.toLocaleString("pt-BR")} icon={Eye} delay={0.15} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard title="Taxa de Rejeição" value={`${overview.bounceRate}%`} icon={TrendingUp} delay={0.2} />
        <KpiCard title="Duração Média" value={formatDuration(overview.avgSessionDuration)} icon={Clock} delay={0.25} />
        <KpiCard title="Sessões Engajadas" value={overview.engagedSessions.toLocaleString("pt-BR")} icon={BarChart3} delay={0.3} />
      </div>

      {/* Charts */}
      {daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions over time */}
          <Card className="p-5">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Sessões por Dia</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gaSessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="url(#gaSessionsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Users over time */}
          <Card className="p-5">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Usuários por Dia</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gaUsersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--accent-foreground))" fill="url(#gaUsersGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Traffic Sources */}
      {sources.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Fontes de Tráfego</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sources}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {sources.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div key={s.channel} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-card-foreground">{s.channel}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    {s.sessions.toLocaleString("pt-BR")} sessões
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
