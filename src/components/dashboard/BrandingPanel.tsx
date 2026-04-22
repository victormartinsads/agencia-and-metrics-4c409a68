import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertCircle, Loader2, Users, MousePointerClick, Eye, Play,
  TrendingUp, Percent,
} from "lucide-react";
import { InstagramInsightsData } from "@/hooks/useInstagramInsights";
import { KpiCard } from "@/components/dashboard/KpiCard";

interface Props {
  data: InstagramInsightsData | undefined;
  isLoading: boolean;
  error: Error | null;
  currencySymbol?: string;
}

function MetricBar({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground w-28 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 bg-secondary rounded overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-primary rounded"
        />
      </div>
      <span className="text-sm font-bold text-card-foreground w-20 text-right">{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

function DayOfWeekChart({ data, title, color }: { data: { day: string; value: number }[]; title: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 46%)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(220, 10%, 46%)"
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(220, 20%, 20%)",
              background: "hsl(220, 25%, 12%)",
              color: "hsl(0, 0%, 93%)",
              fontSize: 13,
            }}
            formatter={(v: number) => [v.toLocaleString("pt-BR"), ""]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChart({ data, title, legend }: { data: { day: string; value: number }[]; title: string; legend: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">{legend}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 text-right">{d.day}</span>
            <div className="flex-1 h-6 bg-secondary rounded overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / maxVal) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="h-full bg-primary rounded"
              />
            </div>
            <span className="text-xs font-semibold text-card-foreground w-12 text-right">
              {d.value.toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandingPanel({ data, isLoading, error, currencySymbol = "R$" }: Props) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3"
      >
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">Erro ao carregar dados de Branding</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando dados de Branding...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Nenhum dado de branding encontrado.
      </div>
    );
  }

  const m = data.metrics;
  const maxBarValue = Math.max(m.totalClicks, m.totalVV50, m.totalVV75, m.totalVV95, m.totalThruplay, 1);

  return (
    <div className="space-y-6">
      {/* Row 1: Distribution + Metric Bars + Followers by Day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Distribuição</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground">Seguidores Totais</p>
              <p className="text-xl font-bold text-card-foreground">{data.followersCount.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Novos Seguidores</p>
              <p className="text-xl font-bold text-card-foreground">{data.newFollowers30d.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Novos Seguidores Nos Últimos 30 Dias</h4>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.dailyFollowers}>
              <defs>
                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(82, 85%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(82, 85%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(220, 20%, 20%)",
                  background: "hsl(220, 25%, 12%)",
                  color: "hsl(0, 0%, 93%)",
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(82, 85%, 55%)" fill="url(#followerGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Metric Bars */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">Métricas de Vídeo (30d)</h3>
          <MetricBar label="Cliques" value={m.totalClicks} maxValue={maxBarValue} />
          <MetricBar label="VideoView 50%" value={m.totalVV50} maxValue={maxBarValue} />
          <MetricBar label="VideoView 75%" value={m.totalVV75} maxValue={maxBarValue} />
          <MetricBar label="VideoView 95%" value={m.totalVV95} maxValue={maxBarValue} />
          <MetricBar label="Thruplay" value={m.totalThruplay} maxValue={maxBarValue} />
        </div>

        {/* Followers by Day of Week */}
        <HorizontalBarChart
          data={data.followersByDay}
          title="Seguidores Por Dia da Semana (30D)"
          legend="Novos Seguidores"
        />
      </div>

      {/* Row 2: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Video Plays" value={m.totalVideoPlays.toLocaleString("pt-BR")} icon={Play} delay={0} />
        <KpiCard title="C/Video Play" value={`${currencySymbol} ${m.costPerVideoPlay.toFixed(2)}`} icon={TrendingUp} delay={0.05} />
        <KpiCard title="Alcance Ads (30d)" value={m.totalAdReach >= 1000000 ? `${(m.totalAdReach / 1000000).toFixed(1)}M` : m.totalAdReach.toLocaleString("pt-BR")} icon={Users} delay={0.1} />
        <KpiCard title="CTR" value={`${m.avgCTR}%`} icon={Percent} delay={0.15} />
      </div>

      {/* Row 3: Charts by Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DayOfWeekChart
          data={data.videoViewsByDay}
          title="VideoViews Por Dia da Semana"
          color="hsl(82, 85%, 55%)"
        />
        <DayOfWeekChart
          data={data.adReachByDay}
          title="Alcance Por Dia da Semana"
          color="hsl(82, 85%, 55%)"
        />
        <DayOfWeekChart
          data={data.reachByDay}
          title="Alcance Orgânico Por Dia"
          color="hsl(152, 69%, 41%)"
        />
      </div>
    </div>
  );
}
