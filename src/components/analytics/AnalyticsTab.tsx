import { useEffect, useMemo, useState } from "react";
import {
  useGoogleConnectionStatus,
  useGoogleAnalytics,
} from "@/hooks/useGoogleAnalytics";
import { GoogleAnalyticsPanel } from "@/components/dashboard/GoogleAnalyticsPanel";
import { PanelCard } from "@/components/dashboard/overview/premium/PanelCard";
import { AgeBarsPanel } from "@/components/dashboard/overview/premium/AgeBarsPanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Pencil, Check, Eye, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#3b82f6",
];

const ALL_WIDGETS: { id: string; label: string }[] = [
  { id: "kpis_main", label: "KPIs principais" },
  { id: "kpis_engagement", label: "KPIs de engajamento" },
  { id: "sessions_chart", label: "Sessões por dia" },
  { id: "users_chart", label: "Usuários por dia" },
  { id: "sources_chart", label: "Fontes de tráfego" },
  { id: "age_demographics", label: "Faixa etária" },
  { id: "utms_table", label: "Campanhas UTM" },
];

interface Props {
  clientId?: string;
  datePreset?: string;
  currencySymbol?: string;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export function AnalyticsTab({ clientId, datePreset = "last_7d", currencySymbol = "R$" }: Props) {
  const { data: status, isLoading: statusLoading } = useGoogleConnectionStatus(clientId);
  const connected = status?.connected === true;
  const { data: ga, isLoading: gaLoading } = useGoogleAnalytics(clientId, datePreset, connected);

  const STORAGE_KEY = `analytics-hidden:${clientId || "default"}`;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hidden)));
  }, [hidden, STORAGE_KEY]);

  const visible = (id: string) => !hidden.has(id);
  const toggle = (id: string) => setHidden(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const hide = (id: string) => setHidden(prev => new Set(prev).add(id));

  const utms = useMemo(() => {
    const list = (ga?.utms || []).slice().sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
    return list.slice(0, 15);
  }, [ga?.utms]);

  // Fallbacks: not connected or needs setup → reuse existing panel (handles connect + property pick + API errors)
  if (statusLoading || !connected || ga?.needsPropertySelection || (!ga?.overview && !gaLoading)) {
    return <GoogleAnalyticsPanel clientId={clientId} datePreset={datePreset} />;
  }

  if (gaLoading || !ga?.overview) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando Analytics…</span>
      </div>
    );
  }

  const overview = ga.overview;
  const daily = ga.daily || [];
  const sources = ga.sources || [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão de tráfego, audiência e canais — dados do Google Analytics 4.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Blocos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Mostrar blocos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_WIDGETS.map(w => (
                <DropdownMenuCheckboxItem
                  key={w.id}
                  checked={visible(w.id)}
                  onCheckedChange={() => toggle(w.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {w.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(v => !v)}
            className="h-8 gap-1.5"
          >
            {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editMode ? "Concluir" : "Editar layout"}
          </Button>
        </div>
      </div>

      {/* KPIs principais */}
      {visible("kpis_main") && (
        <PanelCard title="Visão geral" panelId="kpis_main" editMode={editMode} onHide={hide}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sessões", value: overview.sessions },
              { label: "Usuários", value: overview.totalUsers },
              { label: "Novos usuários", value: overview.newUsers },
              { label: "Page views", value: overview.pageViews },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                <p
                  className="mt-1 text-2xl font-semibold tracking-tight text-foreground"
                  style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
                >
                  {k.value.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {/* KPIs engagement */}
      {visible("kpis_engagement") && (
        <PanelCard title="Engajamento" panelId="kpis_engagement" editMode={editMode} onHide={hide}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Taxa de rejeição", value: `${overview.bounceRate}%` },
              { label: "Duração média", value: formatDuration(overview.avgSessionDuration) },
              { label: "Sessões engajadas", value: overview.engagedSessions.toLocaleString("pt-BR") },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                <p
                  className="mt-1 text-2xl font-semibold tracking-tight text-foreground"
                  style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
                >
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {visible("sessions_chart") && daily.length > 0 && (
          <PanelCard title="Sessões por dia" panelId="sessions_chart" editMode={editMode} onHide={hide}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="anaSess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="url(#anaSess)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </PanelCard>
        )}

        {visible("users_chart") && daily.length > 0 && (
          <PanelCard title="Usuários por dia" panelId="users_chart" editMode={editMode} onHide={hide}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="anaUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="url(#anaUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </PanelCard>
        )}
      </div>

      {/* Sources */}
      {visible("sources_chart") && sources.length > 0 && (
        <PanelCard title="Fontes de tráfego" panelId="sources_chart" editMode={editMode} onHide={hide}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sources}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div key={s.channel} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-card-foreground">{s.channel}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">
                    {s.sessions.toLocaleString("pt-BR")} sessões
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      )}

      {/* Age demographics */}
      {visible("age_demographics") && (
        <PanelCard title="Faixa etária" panelId="age_demographics" editMode={editMode} onHide={hide}>
          <AgeBarsPanel clientId={clientId} datePreset={datePreset} currencySymbol={currencySymbol} />
        </PanelCard>
      )}

      {/* UTM Table */}
      {visible("utms_table") && utms.length > 0 && (
        <PanelCard title="Top campanhas (UTM)" panelId="utms_table" editMode={editMode} onHide={hide}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="text-left py-2 px-2 font-medium">Source</th>
                  <th className="text-left py-2 px-2 font-medium">Medium</th>
                  <th className="text-left py-2 px-2 font-medium">Campaign</th>
                  <th className="text-right py-2 px-2 font-medium">Sessões</th>
                  <th className="text-right py-2 px-2 font-medium">Usuários</th>
                  <th className="text-right py-2 px-2 font-medium">Engajadas</th>
                </tr>
              </thead>
              <tbody>
                {utms.map((u, i) => (
                  <tr key={`${u.source}-${u.medium}-${u.campaign}-${i}`} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-2 text-foreground">{u.source || "—"}</td>
                    <td className="py-2 px-2 text-muted-foreground">{u.medium || "—"}</td>
                    <td className="py-2 px-2 text-foreground">{u.campaign || "—"}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{u.sessions.toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{u.users.toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{(u.engagedSessions || 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}
    </div>
  );
}