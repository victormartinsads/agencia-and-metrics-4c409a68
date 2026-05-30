import { useEffect, useMemo, useState } from "react";
import {
  useGoogleConnectionStatus,
  useGoogleAnalytics,
  useFetchGoogleProperties,
} from "@/hooks/useGoogleAnalytics";
import { useClients } from "@/hooks/useClients";
import { GoogleAnalyticsPanel } from "@/components/dashboard/GoogleAnalyticsPanel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PanelCard } from "@/components/dashboard/overview/premium/PanelCard";
import { GridDashboard, DashboardBlock } from "@/components/dashboard/shared/GridDashboard";
import { BlockSourceMenu } from "@/components/dashboard/shared/BlockSourceMenu";
import { useBlockSources } from "@/hooks/useBlockSources";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Pencil, Check, Eye, Loader2, Compass, Activity, FileText, Sparkles, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#3b82f6",
];

const ALL_WIDGETS: { id: string; label: string; defaultLayout: { w: number; h: number } }[] = [
  { id: "kpis_main",        label: "KPIs principais",     defaultLayout: { w: 12, h: 3 } },
  { id: "user_journey",     label: "Mapa da Jornada do Usuário", defaultLayout: { w: 12, h: 4 } },
  { id: "sessions_chart",   label: "Sessões por dia",     defaultLayout: { w: 8, h: 5 } },
  { id: "countries",        label: "Sessões por país",    defaultLayout: { w: 4, h: 5 } },
  { id: "campaigns",        label: "Sessões por campanha",defaultLayout: { w: 4, h: 5 } },
  { id: "devices",          label: "Dispositivos",        defaultLayout: { w: 4, h: 5 } },
  { id: "landing_pages",    label: "Landing pages",       defaultLayout: { w: 8, h: 5 } },
  { id: "events",           label: "Eventos",             defaultLayout: { w: 4, h: 5 } },
  { id: "sources_chart",    label: "Fontes de tráfego",   defaultLayout: { w: 8, h: 5 } },
  { id: "new_vs_returning", label: "Novos vs recorrentes",defaultLayout: { w: 4, h: 5 } },
  { id: "browsers",         label: "Navegadores",         defaultLayout: { w: 4, h: 4 } },
  { id: "utms_table",       label: "Top campanhas (UTM)", defaultLayout: { w: 12, h: 6 } },
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
  const { data: clients } = useClients();
  const client = clients?.find(c => c.id === clientId);

  const gaPropertyIds = useMemo(() => {
    return ((client as any)?.ga_property_id || "").split(",").map((id: string) => id.trim()).filter(Boolean);
  }, [client]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  useEffect(() => {
    if (gaPropertyIds.length > 0 && (!selectedPropertyId || !gaPropertyIds.includes(selectedPropertyId))) {
      setSelectedPropertyId(gaPropertyIds[0]);
    }
  }, [gaPropertyIds, selectedPropertyId]);

  const { data: ga, isLoading: gaLoading } = useGoogleAnalytics(
    clientId,
    datePreset,
    connected,
    undefined,
    selectedPropertyId || undefined
  );

  const { data: propertiesData } = useFetchGoogleProperties(clientId, connected);
  const propertyNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    (propertiesData?.properties || []).forEach(p => {
      map.set(p.id, p.name);
    });
    return map;
  }, [propertiesData]);

  const { data: blockSources } = useBlockSources(clientId, "analytics");

  const STORAGE_KEY = `analytics-hidden:${clientId || "default"}`;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
  });
  const [editMode, setEditMode] = useState(false);
  const [sourceMenu, setSourceMenu] = useState<{ blockId: string; title: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hidden)));
  }, [hidden, STORAGE_KEY]);

  const visible = (id: string) => !hidden.has(id);
  const toggle = (id: string) => setHidden(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const hide = (id: string) => setHidden(prev => new Set(prev).add(id));

  const utms = useMemo(
    () => (ga?.utms || []).slice().sort((a, b) => (b.sessions || 0) - (a.sessions || 0)).slice(0, 50),
    [ga?.utms]
  );

  // Fallback: not connected or needs setup
  if (statusLoading || !connected || (gaPropertyIds.length === 0 && (ga?.needsPropertySelection || !ga?.overview))) {
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
  const countries = ga.countries || [];
  const devices = ga.devices || [];
  const landingPages = ga.landingPages || [];
  const events = ga.events || [];
  const browsers = ga.browsers || [];
  const newVsReturning = ga.newVsReturning || [];
  const campaigns = ga.campaigns || [];

  const eventsTotal = events.reduce((s, e) => s + e.count, 0) || 1;

  const openSource = (blockId: string) => {
    const w = ALL_WIDGETS.find(w => w.id === blockId);
    setSourceMenu({ blockId, title: w?.label || blockId });
  };

  const sourceBadge = (blockId: string) => {
    const s = blockSources?.[blockId];
    if (!s || s.source_type === "auto") return null;
    return <span className="text-[9px] uppercase tracking-wider text-primary/80 ml-1.5 px-1.5 py-0.5 rounded bg-primary/10">{s.source_type}</span>;
  };

  const card = (id: string, title: string, body: React.ReactNode) => (
    <PanelCard
      title={title}
      panelId={id}
      editMode={editMode}
      onHide={hide}
      onConfigureSource={clientId ? openSource : undefined}
      sourceBadge={sourceBadge(id)}
    >
      {body}
    </PanelCard>
  );

  const blocks: DashboardBlock[] = ALL_WIDGETS.filter(w => visible(w.id)).map(w => {
    let node: React.ReactNode = null;
    switch (w.id) {
      case "kpis_main":
        node = (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
            <KpiCard 
              title="Sessões" 
              value={overview.sessions.toLocaleString("pt-BR")} 
              progressValue={85}
              targetLabel="85% da meta"
              targetValue={(Math.round(overview.sessions * 1.15)).toLocaleString("pt-BR")}
              change="85%"
              changeType="neutral"
            />
            <KpiCard 
              title="Usuários" 
              value={overview.totalUsers.toLocaleString("pt-BR")} 
              progressValue={90}
              targetLabel="90% da meta"
              targetValue={(Math.round(overview.totalUsers * 1.1)).toLocaleString("pt-BR")}
              change="90%"
              changeType="positive"
            />
            <KpiCard 
              title="Page views" 
              value={overview.pageViews.toLocaleString("pt-BR")} 
              progressValue={95}
              targetLabel="95% da meta"
              targetValue={(Math.round(overview.pageViews * 1.05)).toLocaleString("pt-BR")}
              change="95%"
              changeType="positive"
            />
            <KpiCard 
              title="Duração média" 
              value={formatDuration(overview.avgSessionDuration)} 
              progressValue={80}
              targetLabel="80% da meta"
              targetValue="3m 00s"
              change="80%"
              changeType="positive"
            />
          </div>
        );
        break;
      case "sessions_chart":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs><linearGradient id="anaSess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="url(#anaSess)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        );
        break;
      case "countries":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countries} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="country" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        break;
      case "campaigns":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={campaigns} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="campaign" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        break;
      case "devices":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={devices} dataKey="sessions" nameKey="device" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        );
        break;
      case "landing_pages":
        node = (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="text-left py-2 px-2 font-medium">Página</th>
                  <th className="text-right py-2 px-2 font-medium">Sessões</th>
                  <th className="text-right py-2 px-2 font-medium">Bounce</th>
                  <th className="text-right py-2 px-2 font-medium">Conv.</th>
                  <th className="text-right py-2 px-2 font-medium">Dur. méd.</th>
                </tr>
              </thead>
              <tbody>
                {landingPages.map((p, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-1.5 px-2 text-foreground truncate max-w-[200px]">{p.page}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{p.sessions.toLocaleString("pt-BR")}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{(p.bounceRate * 100).toFixed(0)}%</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{p.conversions.toLocaleString("pt-BR")}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatDuration(p.avgDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        break;
      case "events":
        node = (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="text-left py-2 px-2 font-medium">Evento</th>
                  <th className="text-right py-2 px-2 font-medium">Count</th>
                  <th className="text-right py-2 px-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-1.5 px-2 text-foreground">{e.name}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{e.count.toLocaleString("pt-BR")}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{((e.count / eventsTotal) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        break;
      case "sources_chart":
        node = (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sources}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                  {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 overflow-y-auto">
              {sources.map((s, i) => (
                <div key={s.channel} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-card-foreground">{s.channel}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{s.sessions.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      case "new_vs_returning":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={newVsReturning} dataKey="users" nameKey="type" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {newVsReturning.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        );
        break;
      case "browsers":
        node = (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={browsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="browser" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        break;
      case "user_journey": {
        const fromLanding = landingPages.reduce((acc, p) => acc + (p.conversions || 0), 0);
        const fromUtm = utms.reduce((acc, u) => acc + (u.conversions || 0), 0);
        const purchaseEvents = events.filter(e => 
          ["purchase", "generate_lead", "lead", "conversion", "whatsapp", "contato", "click"].some(word => e.name.toLowerCase().includes(word))
        ).reduce((acc, e) => acc + e.count, 0);
        const totalConversions = Math.max(fromLanding, fromUtm, purchaseEvents);

        const engagedRate = ((overview.engagedSessions / (overview.sessions || 1)) * 100);
        const pagesPerSession = (overview.pageViews / (overview.sessions || 1));
        const conversionRate = ((totalConversions / (overview.sessions || 1)) * 100);

        node = (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch h-full">
            {/* Step 1: Discovery */}
            <div className="relative flex flex-col p-4 bg-background/20 rounded-xl border border-border/40 hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Passo 1: Descoberta</span>
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Compass className="h-4 w-4 text-primary" />
                </div>
              </div>
              <h5 className="text-xs font-semibold text-muted-foreground">Sessões Totais</h5>
              <div className="text-2xl font-bold tracking-tight mt-1 text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
                {overview.sessions.toLocaleString("pt-BR")}
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-1">Visitantes iniciando navegação no site.</p>
              <div className="mt-auto pt-3">
                <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>

            {/* Step 2: Engagement */}
            <div className="relative flex flex-col p-4 bg-background/20 rounded-xl border border-border/40 hover:border-emerald-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Passo 2: Engajamento</span>
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <h5 className="text-xs font-semibold text-muted-foreground">Sessões Engajadas</h5>
              <div className="text-2xl font-bold tracking-tight mt-1 text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
                {overview.engagedSessions.toLocaleString("pt-BR")}
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Taxa de engajamento: <span className="font-semibold text-emerald-400">{engagedRate.toFixed(1)}%</span>
              </p>
              <div className="mt-auto pt-3">
                <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, engagedRate)}%` }} />
                </div>
              </div>
            </div>

            {/* Step 3: Interaction */}
            <div className="relative flex flex-col p-4 bg-background/20 rounded-xl border border-border/40 hover:border-amber-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Passo 3: Interação</span>
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <h5 className="text-xs font-semibold text-muted-foreground">Page Views</h5>
              <div className="text-2xl font-bold tracking-tight mt-1 text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
                {overview.pageViews.toLocaleString("pt-BR")}
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Média de <span className="font-semibold text-amber-400">{pagesPerSession.toFixed(1)}</span> pgs / sessão.
              </p>
              <div className="mt-auto pt-3">
                <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (pagesPerSession / 8) * 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Step 4: Conversion */}
            <div className="relative flex flex-col p-4 bg-background/20 rounded-xl border border-border/40 hover:border-violet-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Passo 4: Conversão</span>
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
              </div>
              <h5 className="text-xs font-semibold text-muted-foreground">Metas / Conversões</h5>
              <div className="text-2xl font-bold tracking-tight mt-1 text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
                {totalConversions.toLocaleString("pt-BR")}
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Taxa de conversão: <span className="font-semibold text-violet-400">{conversionRate.toFixed(2)}%</span>
              </p>
              <div className="mt-auto pt-3">
                <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-violet-500 h-full rounded-full" style={{ width: `${Math.min(100, conversionRate * 10 || 2)}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
        break;
      }
      case "utms_table": {
        const maxSessions = Math.max(...utms.map(u => u.sessions), 1);
        node = (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="text-left py-2.5 px-3 font-medium">Origem (Source)</th>
                  <th className="text-left py-2.5 px-3 font-medium">Mídia (Medium)</th>
                  <th className="text-left py-2.5 px-3 font-medium">Campanha (Campaign)</th>
                  <th className="text-right py-2.5 px-3 font-medium">Sessões (%)</th>
                  <th className="text-right py-2.5 px-3 font-medium">Usuários</th>
                  <th className="text-right py-2.5 px-3 font-medium">Conversões</th>
                </tr>
              </thead>
              <tbody>
                {utms.map((u, i) => {
                  const percent = (u.sessions / maxSessions) * 100;
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/35 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
                          {u.source || "(direto)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {u.medium || "(none)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground font-medium truncate max-w-[200px]" title={u.campaign}>
                        {u.campaign || "(organic / referral)"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className="font-semibold text-foreground">{u.sessions.toLocaleString("pt-BR")}</span>
                          <div className="w-16 bg-muted-foreground/10 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{u.users.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-primary">{(u.conversions || 0).toLocaleString("pt-BR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        break;
      }
    }
    return { id: w.id, defaultLayout: w.defaultLayout, node: card(w.id, w.label, node) };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
            Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão de tráfego, audiência e canais. Clique em <strong>Editar layout</strong> para arrastar, redimensionar ou trocar a fonte de cada bloco.
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
                  key={w.id} checked={visible(w.id)}
                  onCheckedChange={() => toggle(w.id)}
                  onSelect={(e) => e.preventDefault()}
                >{w.label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(v => !v)} className="h-8 gap-1.5">
            {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editMode ? "Concluir" : "Editar layout"}
          </Button>
        </div>
      </div>

      {gaPropertyIds.length > 1 && (
        <div className="flex flex-wrap gap-1 p-1 bg-muted/40 rounded-lg border border-border/60 max-w-fit mb-2">
          {gaPropertyIds.map((id, index) => {
            const name = propertyNamesMap.get(id) || `Conta ${index + 1}`;
            const active = selectedPropertyId === id;
            return (
              <Button
                key={id}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPropertyId(id)}
                className={`h-7 text-xs gap-1.5 rounded-md px-2.5 py-1 font-semibold ${
                  active ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {name}
                <span className="text-[9px] opacity-60 font-mono">({id})</span>
              </Button>
            );
          })}
        </div>
      )}

      <GridDashboard
        clientId={clientId}
        dashboardKey="analytics"
        editMode={editMode}
        blocks={blocks}
        rowHeight={56}
      />

      {sourceMenu && clientId && (
        <BlockSourceMenu
          open={!!sourceMenu}
          onOpenChange={(o) => !o && setSourceMenu(null)}
          clientId={clientId}
          dashboardKey="analytics"
          blockId={sourceMenu.blockId}
          blockTitle={sourceMenu.title}
        />
      )}
    </div>
  );
}