import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Share2,
  RefreshCw,
  Loader2,
  Eye,
} from "lucide-react";
import { Client } from "@/hooks/useClients";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientDetailModal } from "./ClientDetailModal";
import { MetaEditorView } from "./MetaEditorView";

interface MetaAdsTabProps {
  clients: Client[];
  selectedClient: Client | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function num(v: any) { return Number(v || 0); }
function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchMetaAds(clientId: string, preset = "last_7d") {
  const { data, error } = await supabase.functions.invoke("meta-ads", {
    body: { clientId, datePreset: preset },
  });
  if (error) throw error;
  return data;
}

async function fetchAccountStatus(clientId: string) {
  const { data, error } = await supabase.functions.invoke("meta-account-status", {
    body: { clientId },
  });
  if (error) throw error;
  return data;
}

export function MetaAdsTab({ clients, selectedClient, isLoading: parentLoading, onRefresh }: MetaAdsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("gestao");
  const [selectedDetailClient, setSelectedDetailClient] = useState<Client | null>(null);
  const [editorClient, setEditorClient] = useState<Client | null>(null);
  const [editorDatePreset, setEditorDatePreset] = useState("last_7d");

  // Auto-open editor if URL has ?editor=clientId (coming from Home cards)
  useEffect(() => {
    const editorId = searchParams.get("editor");
    if (editorId && clients.length > 0) {
      const target = clients.find((c) => c.id === editorId);
      if (target && !editorClient) {
        openEditor(target);
        // Remove the param so browser back works cleanly
        setSearchParams((prev) => { prev.delete("editor"); return prev; }, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clients]);

  // Batch fetch meta-ads for all clients
  const metaQueries = useQueries({
    queries: clients.map((c) => ({
      queryKey: ["meta-ads", c.id, "last_7d"],
      queryFn: () => fetchMetaAds(c.id, "last_7d"),
      staleTime: 5 * 60 * 1000,
      enabled: clients.length > 0,
    })),
  });

  // Batch fetch account-status for all clients
  const statusQueries = useQueries({
    queries: clients.map((c) => ({
      queryKey: ["meta-account-status", c.id],
      queryFn: () => fetchAccountStatus(c.id),
      staleTime: 5 * 60 * 1000,
      enabled: clients.length > 0,
    })),
  });

  // Editor data (fetched on demand when opening editor with a specific preset)
  const [editorPresetLoading, setEditorPresetLoading] = useState(false);
  const [editorData, setEditorData] = useState<any>(null);

  const loadEditorData = async (client: Client, preset: string) => {
    setEditorPresetLoading(true);
    try {
      const data = await fetchMetaAds(client.id, preset);
      setEditorData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setEditorPresetLoading(false);
    }
  };

  const openEditor = async (client: Client) => {
    setEditorClient(client);
    // Use cached data from the table query first
    const idx = clients.findIndex((c) => c.id === client.id);
    const cached = metaQueries[idx]?.data;
    setEditorData(cached || null);
    // Load fresh data if preset changed
    await loadEditorData(client, editorDatePreset);
  };

  const handleEditorDateChange = async (preset: string) => {
    setEditorDatePreset(preset);
    if (editorClient) {
      await loadEditorData(editorClient, preset);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ad_account_ids?.some((id) => id.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  // If editor is open, show full-screen editor
  if (editorClient) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0c10]" style={{ top: 0, left: 0 }}>
        <MetaEditorView
          client={editorClient}
          metaData={editorData}
          isLoading={editorPresetLoading}
          datePreset={editorDatePreset}
          onDateChange={handleEditorDateChange}
          onBack={() => setEditorClient(null)}
          onRefresh={() => loadEditorData(editorClient, editorDatePreset)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-100">
      {/* Sub-tab bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
          {["gestao", "kanban"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition ${
                activeSubTab === tab
                  ? "bg-white/[0.08] text-white shadow"
                  : "text-muted-foreground hover:text-slate-300"
              }`}
            >
              {tab === "gestao" ? "Gestão" : "Kanban"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={parentLoading}
            className="border-border hover:bg-white/[0.05] text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`h-3 w-3 ${parentLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* ── GESTÃO TAB ── */}
      {activeSubTab === "gestao" && (
        <div className="space-y-4">
          {/* Search toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card/50 border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-border hover:bg-white/[0.05] text-xs h-9 font-semibold gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filtros
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-white/[0.05] text-xs h-9 font-semibold gap-1.5">
                <Share2 className="h-3.5 w-3.5" /> Exportar
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-white/[0.02] text-muted-foreground">
                    <th className="py-3 px-4 font-bold">Cliente</th>
                    <th className="py-3 px-4 font-bold">Status / Saldo</th>
                    <th className="py-3 px-4 text-right font-bold">Gasto (7d)</th>
                    <th className="py-3 px-4 text-right font-bold">Resultado</th>
                    <th className="py-3 px-4 text-right font-bold">CTR</th>
                    <th className="py-3 px-4 text-right font-bold">CPC</th>
                    <th className="py-3 px-4 text-right font-bold">CPM</th>
                    <th className="py-3 px-4 text-right font-bold">Impressões</th>
                    <th className="py-3 px-4 text-right font-bold">Alcance</th>
                    <th className="py-3 px-4 text-right font-bold">Freq.</th>
                    <th className="py-3 px-4 text-right font-bold">Cliques</th>
                    <th className="py-3 px-4 text-center font-bold">Editor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground">
                        {clients.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado para esta busca."}
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, idx) => {
                      const metaQ = metaQueries[clients.indexOf(client)];
                      const statusQ = statusQueries[clients.indexOf(client)];
                      const meta = metaQ?.data;
                      const status = statusQ?.data;
                      const isFetching = metaQ?.isLoading || metaQ?.isFetching;

                      const overview = meta?.overviewMetrics || {};
                      const campaigns: any[] = meta?.campaigns || [];
                      const activeCamps = campaigns.filter((c) => c.status === "active");
                      const balance = num(status?.balance);
                      const balanceOk = balance >= 0;

                      const totalSpend = num(overview.totalSpend);
                      const totalConversions = num(overview.totalConversions);
                      const avgCTR = num(overview.avgCTR);
                      const avgCPC = num(overview.avgCPC);
                      const totalImpressions = num(overview.totalImpressions);
                      const totalReach = num(overview.totalReach);
                      const totalClicks = num(overview.totalClicks);
                      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
                      const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;

                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                          onClick={() => setSelectedDetailClient(client)}
                        >
                          {/* Cliente */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-400 text-xs shrink-0">
                                {client.name?.[0]?.toUpperCase() || "C"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-200 truncate max-w-[180px] group-hover:text-white transition" title={client.name}>
                                  {client.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">
                                  {client.ad_account_ids?.[0] || "Sem conta vinculada"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status / Saldo */}
                          <td className="py-3.5 px-4">
                            {isFetching ? (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Badge
                                  className={`text-[9px] font-bold border rounded-full px-2 py-0.5 w-fit ${
                                    activeCamps.length > 0
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                  }`}
                                >
                                  {activeCamps.length > 0 ? `${activeCamps.length} ativas` : "Pausada"}
                                </Badge>
                                {status && (
                                  <span className={`text-[10px] font-semibold ${balanceOk ? "text-emerald-400" : "text-red-400"}`}>
                                    {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Gasto */}
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200 tabular-nums whitespace-nowrap">
                            {isFetching ? (
                              <div className="h-3 w-16 bg-white/5 rounded ml-auto animate-pulse" />
                            ) : fmtMoney(totalSpend)}
                          </td>

                          {/* Resultado */}
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-200 tabular-nums">
                            {isFetching ? (
                              <div className="h-3 w-10 bg-white/5 rounded ml-auto animate-pulse" />
                            ) : totalConversions || "—"}
                          </td>

                          {/* CTR */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                            {isFetching ? "..." : `${avgCTR.toFixed(2)}%`}
                          </td>

                          {/* CPC */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums whitespace-nowrap">
                            {isFetching ? "..." : fmtMoney(avgCPC)}
                          </td>

                          {/* CPM */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums whitespace-nowrap">
                            {isFetching ? "..." : fmtMoney(cpm)}
                          </td>

                          {/* Impressões */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                            {isFetching ? "..." : totalImpressions.toLocaleString("pt-BR")}
                          </td>

                          {/* Alcance */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                            {isFetching ? "..." : totalReach.toLocaleString("pt-BR")}
                          </td>

                          {/* Freq */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                            {isFetching ? "..." : frequency.toFixed(2)}
                          </td>

                          {/* Cliques */}
                          <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                            {isFetching ? "..." : totalClicks.toLocaleString("pt-BR")}
                          </td>

                          {/* Editor Button */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] font-bold gap-1 bg-[#b5f23d]/10 hover:bg-[#b5f23d] text-[#b5f23d] hover:text-black border border-[#b5f23d]/30 hover:border-transparent transition"
                              onClick={() => openEditor(client)}
                            >
                              <Eye className="h-3 w-3" />
                              Visão Editor
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── KANBAN TAB ── */}
      {activeSubTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {["Ativas", "Pausadas", "A Resolver"].map((colName) => {
            const colClients = filteredClients.filter((client) => {
              const idx = clients.indexOf(client);
              const meta = metaQueries[idx]?.data;
              const campaigns: any[] = meta?.campaigns || [];
              if (colName === "Ativas") return campaigns.some((c) => c.status === "active");
              if (colName === "Pausadas") return campaigns.every((c) => c.status !== "active") && campaigns.length > 0;
              return campaigns.length === 0;
            });

            return (
              <div key={colName} className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    {colName}
                  </h3>
                  <Badge className="bg-white/[0.03] text-muted-foreground border border-border/60 text-[10px] font-bold py-0">
                    {colClients.length}
                  </Badge>
                </div>
                <div className="space-y-3 min-h-[300px] bg-white/[0.01] border border-dashed border-border/60 rounded-2xl p-3">
                  {colClients.map((client) => {
                    const idx = clients.indexOf(client);
                    const meta = metaQueries[idx]?.data;
                    const overview = meta?.overviewMetrics || {};
                    return (
                      <Card
                        key={client.id}
                        className="bg-card border-border/60 hover:border-primary/40 transition-all rounded-xl p-4 space-y-3 shadow-md cursor-pointer"
                        onClick={() => setSelectedDetailClient(client)}
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">{client.name}</h4>
                          <p className="text-[10px] text-muted-foreground">{client.ad_account_ids?.[0] || "Sem conta"}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                          <span className="text-[10px] text-muted-foreground">Gasto:</span>
                          <span className="text-xs font-bold text-slate-200">
                            {fmtMoney(num(overview.totalSpend))}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                  {colClients.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-12">
                      Nenhum cliente aqui.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedDetailClient && (
        <ClientDetailModal
          open={!!selectedDetailClient}
          onOpenChange={(v) => !v && setSelectedDetailClient(null)}
          client={selectedDetailClient}
          metaData={metaQueries[clients.indexOf(selectedDetailClient)]?.data}
          accountStatus={statusQueries[clients.indexOf(selectedDetailClient)]?.data}
          isLoadingMeta={metaQueries[clients.indexOf(selectedDetailClient)]?.isLoading ?? false}
          isLoadingStatus={statusQueries[clients.indexOf(selectedDetailClient)]?.isLoading ?? false}
          onOpenEditor={() => openEditor(selectedDetailClient)}
          onRefreshStatus={() => statusQueries[clients.indexOf(selectedDetailClient)]?.refetch?.()}
        />
      )}
    </div>
  );
}
