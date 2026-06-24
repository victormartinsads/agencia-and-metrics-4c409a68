import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Activity, Users, ShoppingCart, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomAnalyticsProps {
  clientId: string;
}

export default function CustomAnalytics({ clientId }: CustomAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    pageViews: 0,
    uniqueUsers: 0,
    purchases: 0,
    revenue: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);

  useEffect(() => {
    if (clientId) {
      fetchAnalytics();
    }
  }, [clientId]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // 1. Fetch raw events
      const { data: events, error } = await supabase
        .from("tracking_raw_events")
        .select("event_name, and_id, value, referrer, created_at")
        .eq("client_id", clientId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!events) {
        setLoading(false);
        return;
      }

      // 2. Calculate KPI Metrics
      let pViews = 0;
      let purchases = 0;
      let rev = 0;
      const uniqueIds = new Set<string>();
      const refCount: Record<string, number> = {};

      // Data for Chart (grouped by Day)
      const daysMap: Record<string, { date: string; pageViews: number; purchases: number }> = {};
      
      for (let i = 0; i <= 30; i++) {
        const d = format(subDays(new Date(), i), "MMM dd", { locale: ptBR });
        daysMap[d] = { date: d, pageViews: 0, purchases: 0 };
      }

      events.forEach((ev) => {
        uniqueIds.add(ev.and_id);
        
        const dayStr = format(new Date(ev.created_at), "MMM dd", { locale: ptBR });
        if (!daysMap[dayStr]) {
            daysMap[dayStr] = { date: dayStr, pageViews: 0, purchases: 0 };
        }

        if (ev.event_name === "PageView") {
          pViews++;
          daysMap[dayStr].pageViews++;
          
          if (ev.referrer) {
              try {
                  const url = new URL(ev.referrer);
                  const host = url.hostname;
                  refCount[host] = (refCount[host] || 0) + 1;
              } catch(e) {
                  refCount[ev.referrer] = (refCount[ev.referrer] || 0) + 1;
              }
          }
        } else if (ev.event_name === "Purchase") {
          purchases++;
          daysMap[dayStr].purchases++;
          if (ev.value) rev += Number(ev.value);
        }
      });

      setMetrics({
        pageViews: pViews,
        uniqueUsers: uniqueIds.size,
        purchases,
        revenue: rev,
      });

      // Format Chart Data
      const cData = Object.values(daysMap).reverse();
      setChartData(cData);

      // Format Referrers
      const topRefs = Object.entries(refCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }));
        
      setTopReferrers(topRefs);

    } catch (err) {
      console.error("Error fetching analytics", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Custom Analytics</h2>
        <p className="text-muted-foreground">Substituto GA4/Amplitude com dados Server-Side blindados.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uniqueUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Perfis rastreados (and_id)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões (Compras)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.purchases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Taxa de Conv: {metrics.uniqueUsers > 0 ? ((metrics.purchases / metrics.uniqueUsers) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Rastreada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">Via Webhooks de Checkout</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Tráfego e Conversões</CardTitle>
            <CardDescription>Eventos processados pelo Super-Pixel nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
                  <Area type="monotone" dataKey="purchases" name="Compras" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPur)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Referrers */}
        <Card className="md:col-span-3 lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Referências</CardTitle>
            <CardDescription>De onde vieram os acessos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topReferrers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de referência</p>
              ) : (
                topReferrers.map((ref, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{ref.domain || "Direto"}</p>
                      <p className="text-sm text-muted-foreground">
                        {ref.count} page views
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {((ref.count / metrics.pageViews) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
