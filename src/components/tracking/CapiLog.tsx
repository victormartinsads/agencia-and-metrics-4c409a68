import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Activity, TrendingUp
} from "lucide-react";

interface LogEntry {
  id: string;
  event_name: string;
  event_id: string | null;
  platform: string;
  pixel_id: string | null;
  ga4_measurement_id: string | null;
  status: string;
  match_quality_score: number | null;
  buyer_email_masked: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  had_fbclid: boolean;
  had_fbp: boolean;
  error_message: string | null;
  created_at: string;
}

interface Props {
  clientId: string;
}

const PAGE_SIZE = 30;

const statusIcon: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  skipped: <Activity className="h-4 w-4 text-gray-400" />,
  deduplicated: <Activity className="h-4 w-4 text-blue-400" />,
};

function QualityScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 9 ? "text-emerald-600" : score >= 7 ? "text-amber-600" : "text-red-600";
  const bg = score >= 9 ? "bg-emerald-50 border-emerald-200" : score >= 7 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 border ${color} ${bg}`}>
      {score.toFixed(1)}
    </span>
  );
}

export default function CapiLog({ clientId }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [avgScore, setAvgScore] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      let query = db
        .from("capi_events_log")
        .select(
          `id, event_name, event_id, platform, pixel_id, ga4_measurement_id,
           status, match_quality_score, buyer_email_masked, utm_source, utm_campaign,
           had_fbclid, had_fbp, error_message, created_at`,
          { count: "exact" }
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (platformFilter !== "all") query = query.eq("platform", platformFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, count, error } = await query;
      if (error) throw error;

      setEntries((data || []) as LogEntry[]);
      setTotal(count || 0);

      // Calcular score médio dos eventos sent da última página
      const withScore = (data || []).filter((e: any) => e.match_quality_score !== null);
      if (withScore.length > 0) {
        const avg = withScore.reduce((s: number, e: any) => s + (e.match_quality_score || 0), 0) / withScore.length;
        setAvgScore(Math.round(avg * 10) / 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, platformFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            <strong>{total}</strong> disparo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
          {avgScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Score médio EMQ:</span>
              <QualityScore score={avgScore} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas plataformas</SelectItem>
              <SelectItem value="meta_capi">Meta CAPI</SelectItem>
              <SelectItem value="ga4">GA4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="skipped">Ignorados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Evento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Plataforma</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">UTM</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Dados</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Score EMQ</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Carregando logs...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      Nenhum disparo registrado ainda
                    </td>
                  </tr>
                ) : entries.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-muted/20 transition-colors ${e.status === "error" ? "bg-red-50/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      {statusIcon[e.status] || <Activity className="h-4 w-4 text-gray-400" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit",
                      })}
                      {" "}
                      {new Date(e.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit", second: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${e.event_name === "Purchase"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {e.event_name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {e.platform === "meta_capi" ? "Meta CAPI" : e.platform === "ga4" ? "GA4" : e.platform}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {e.buyer_email_masked || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.utm_source ? (
                        <div>
                          <span className="font-medium">{e.utm_source}</span>
                          {e.utm_campaign && <span className="text-muted-foreground"> / {e.utm_campaign}</span>}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <DataPoint label="fbclid" active={e.had_fbclid} />
                        <DataPoint label="fbp" active={e.had_fbp} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <QualityScore score={e.match_quality_score} />
                    </td>
                    <td className="px-4 py-3">
                      {e.status === "error" && e.error_message ? (
                        <span className="text-xs text-red-600 truncate max-w-32 block" title={e.error_message}>
                          {e.error_message.slice(0, 40)}...
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`text-xs ${e.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {e.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">{total} registros</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
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

function DataPoint({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-mono border ${
        active
          ? "bg-blue-50 text-blue-600 border-blue-200"
          : "bg-gray-50 text-gray-300 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}
