import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, ShoppingCart, Crosshair,
  RefreshCw, Search, ChevronLeft, ChevronRight
} from "lucide-react";

interface SaleEvent {
  id: string;
  platform: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string | null;
  buyer_email: string | null;
  status: string;
  gross_amount: number;
  currency: string;
  occurred_at: string;
  is_order_bump: boolean;
  capi_dispatched: boolean;
  ga4_dispatched: boolean;
  tracking_lead?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    fbclid?: string;
  } | null;
}

interface Props {
  clientId: string;
}

const PAGE_SIZE = 25;

const statusColors: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  refunded: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  chargeback: "bg-orange-100 text-orange-700 border-orange-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

const platformColors: Record<string, string> = {
  hotmart: "bg-orange-100 text-orange-700 border-orange-200",
  kiwify: "bg-emerald-100 text-emerald-700 border-emerald-200",
  eduzz: "bg-blue-100 text-blue-700 border-blue-200",
  crm: "bg-purple-100 text-purple-700 border-purple-200",
  csv: "bg-gray-100 text-gray-600 border-gray-200",
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local[0] + "***@" + domain;
}

export default function TrackingDashboard({ clientId }: Props) {
  const [events, setEvents] = useState<SaleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    capiRate: 0,
    utmRate: 0,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      let query = db
        .from("sales_events")
        .select(`
          id, platform, transaction_id, product_id, product_name,
          buyer_email, status, gross_amount, currency, occurred_at,
          is_order_bump, capi_dispatched, ga4_dispatched,
          tracking_leads (utm_source, utm_medium, utm_campaign, utm_content, fbclid)
        `, { count: "exact" })
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (platformFilter !== "all") query = query.eq("platform", platformFilter);
      if (search) query = query.ilike("buyer_email", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;

      setEvents((data || []).map((e: any) => ({
        ...e,
        tracking_lead: e.tracking_leads,
      })));
      setTotal(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, search, statusFilter, platformFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const db = supabase as any;
      const { data } = await db
        .from("sales_events")
        .select("gross_amount, status, capi_dispatched, tracking_lead_id")
        .eq("client_id", clientId)
        .eq("is_order_bump", false);

      if (!data) return;
      const approved = data.filter((e: any) => e.status === "approved");
      const totalRevenue = approved.reduce((s: number, e: any) => s + (e.gross_amount || 0), 0);
      const capiCount = approved.filter((e: any) => e.capi_dispatched).length;
      const utmCount = approved.filter((e: any) => e.tracking_lead_id).length;
      setStats({
        totalRevenue,
        totalSales: approved.length,
        capiRate: approved.length > 0 ? Math.round((capiCount / approved.length) * 100) : 0,
        utmRate: approved.length > 0 ? Math.round((utmCount / approved.length) * 100) : 0,
      });
    } catch (e) {
      console.error(e);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Total"
          value={`R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Vendas Aprovadas"
          value={stats.totalSales.toString()}
          icon={<ShoppingCart className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Taxa CAPI"
          value={`${stats.capiRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          color={stats.capiRate >= 80 ? "emerald" : stats.capiRate >= 50 ? "amber" : "red"}
          subtitle="vendas com disparo CAPI"
        />
        <StatCard
          label="Taxa UTM"
          value={`${stats.utmRate}%`}
          icon={<Crosshair className="h-4 w-4" />}
          color={stats.utmRate >= 70 ? "emerald" : stats.utmRate >= 40 ? "amber" : "red"}
          subtitle="vendas com UTMs rastreados"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="refunded">Reembolso</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="hotmart">Hotmart</SelectItem>
            <SelectItem value="kiwify">Kiwify</SelectItem>
            <SelectItem value="eduzz">Eduzz</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plataforma</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Comprador</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">UTM</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">CAPI</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhuma venda encontrada
                    </td>
                  </tr>
                ) : events.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.occurred_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-xs ${platformColors[e.platform] || ""}`}>
                          {e.platform}
                        </Badge>
                        {e.is_order_bump && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                            bump
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-40">
                      <p className="truncate text-xs">{e.product_name || e.product_id || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {e.buyer_email ? maskEmail(e.buyer_email) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">
                      {e.currency === "BRL" ? "R$ " : e.currency + " "}
                      {e.gross_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${statusColors[e.status] || ""}`}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {e.tracking_lead?.utm_source ? (
                        <div className="text-xs">
                          <span className="font-medium">{e.tracking_lead.utm_source}</span>
                          {e.tracking_lead.utm_campaign && (
                            <span className="text-muted-foreground"> / {e.tracking_lead.utm_campaign}</span>
                          )}
                          {e.tracking_lead.fbclid && (
                            <span className="ml-1 text-blue-500 font-mono">fbclid ✓</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CAPIBadge dispatched={e.capi_dispatched} label="M" title="Meta CAPI" />
                        <CAPIBadge dispatched={e.ga4_dispatched} label="G" title="GA4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {total} resultado{total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, color, subtitle }: {
  label: string; value: string; icon: React.ReactNode; color: string; subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CAPIBadge({ dispatched, label, title }: { dispatched: boolean; label: string; title: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold cursor-default
        ${dispatched
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-400 border border-gray-200"
        }`}
    >
      {label}
    </span>
  );
}
