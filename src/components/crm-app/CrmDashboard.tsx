import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead, LeadStatus, STATUS_CONFIG } from "@/lib/crm-app";
import { TrendingUp, Users, DollarSign, Target, Calendar, Activity } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";

interface Props {
  leads: Lead[];
}

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "closed", "lost"];

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function CrmDashboard({ leads }: Props) {
  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => (byStatus[s] = 0));
    let pipelineValue = 0;
    let closedValue = 0;
    const last7 = daysAgo(7);
    const last30 = daysAgo(30);
    let last7Count = 0;
    let last30Count = 0;

    leads.forEach((l) => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      const v = Number(l.value || 0);
      if (l.status === "closed") closedValue += v;
      else if (l.status !== "lost") pipelineValue += v;
      const created = new Date(l.created_at);
      if (created >= last7) last7Count++;
      if (created >= last30) last30Count++;
    });

    const closed = byStatus.closed || 0;
    const lost = byStatus.lost || 0;
    const conversionRate = total > 0 ? (closed / total) * 100 : 0;
    const winRate = (closed + lost) > 0 ? (closed / (closed + lost)) * 100 : 0;

    return { total, byStatus, pipelineValue, closedValue, last7Count, last30Count, conversionRate, winRate };
  }, [leads]);

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    leads.forEach((l) => {
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({
      date: date.slice(5),
      leads: count,
    }));
  }, [leads]);

  const funnelData = useMemo(
    () => STATUS_ORDER.filter((s) => s !== "lost").map((s) => ({
      name: STATUS_CONFIG[s].label,
      value: stats.byStatus[s] || 0,
      color: STATUS_CONFIG[s].color,
    })),
    [stats.byStatus],
  );

  const topSources = useMemo(() => {
    const src = new Map<string, number>();
    leads.forEach((l) => {
      const key = l.source || "direto";
      src.set(key, (src.get(key) || 0) + 1);
    });
    return Array.from(src.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [leads]);

  const topCampaigns = useMemo(() => {
    const src = new Map<string, number>();
    leads.forEach((l) => {
      const key = l.utm_campaign;
      if (!key) return;
      src.set(key, (src.get(key) || 0) + 1);
    });
    return Array.from(src.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [leads]);

  const KPI = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
    <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="font-display text-2xl font-extrabold mt-1 tabular-nums tracking-tight">{value}</p>
          {sub && <p className="text-[10.5px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </Card>
  );

  if (leads.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Sem dados ainda</h3>
        <p className="text-sm text-muted-foreground">Adicione leads para ver o dashboard.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPI icon={Users} label="Total de leads" value={stats.total.toLocaleString("pt-BR")} />
        <KPI icon={Calendar} label="Últimos 7 dias" value={stats.last7Count.toString()} sub={`${stats.last30Count} em 30d`} />
        <KPI icon={TrendingUp} label="Conversão" value={`${stats.conversionRate.toFixed(1)}%`} sub={`Win rate ${stats.winRate.toFixed(1)}%`} />
        <KPI icon={Target} label="Em pipeline" value={fmtCurrency(stats.pipelineValue)} />
        <KPI icon={DollarSign} label="Fechado" value={fmtCurrency(stats.closedValue)} />
        <KPI icon={Activity} label="Qualificados" value={(stats.byStatus.qualified || 0).toString()} sub={`${stats.byStatus.proposal || 0} em proposta`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden p-4 lg:col-span-2 rounded-2xl border-border/60">
          <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight mb-3">Leads por dia (30d)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60">
          <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight mb-3">Funil</h3>
          <div className="space-y-2">
            {funnelData.map((s) => {
              const max = Math.max(...funnelData.map((x) => x.value), 1);
              const pct = (s.value / max) * 100;
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60">
          <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight mb-3">Top fontes</h3>
          {topSources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados de fonte.</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSources} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border-border/60">
          <div className="absolute inset-x-0 top-0 h-px bg-[image:var(--gradient-hero)] opacity-70" />
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight mb-3">Top campanhas (UTM)</h3>
          {topCampaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados de campanha.</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCampaigns} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topCampaigns.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.6 + (i * 0.08)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}