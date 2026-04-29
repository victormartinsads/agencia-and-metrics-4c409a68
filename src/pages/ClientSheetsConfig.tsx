import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Loader2, Search, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import {
  DASHBOARD_FIELDS,
  useBrowseSheets,
  useDashboardSheet,
  useDeleteDashboardSheet,
  useSheetMeta,
  useSheetPreview,
  useSyncDashboardSheet,
  useUpsertDashboardSheet,
  useWeeklyMetrics,
} from "@/hooks/useDashboardSheet";

function extractSpreadsheetFromInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = urlMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed) ? trimmed : null);
  if (!id) return null;
  return {
    id,
    name: urlMatch ? "Planilha manual" : trimmed,
    url: urlMatch ? trimmed : `https://docs.google.com/spreadsheets/d/${id}/edit`,
  };
}

export default function ClientSheetsConfig() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: clients } = useClients();
  const client = clients?.find((c) => c.id === clientId);

  const { data: config } = useDashboardSheet(clientId);
  const upsert = useUpsertDashboardSheet();
  const sync = useSyncDashboardSheet();
  const del = useDeleteDashboardSheet();
  const { data: metrics } = useWeeklyMetrics(clientId, 12);

  const [search, setSearch] = useState("");
  const { data: browseRes, isFetching: browsing, refetch: refetchBrowse } = useBrowseSheets(search);
  const [manualSheetInput, setManualSheetInput] = useState("");

  const [picked, setPicked] = useState<{ id: string; name: string; url: string } | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [decimalSep, setDecimalSep] = useState<string>(",");
  const [dateFormat, setDateFormat] = useState<string>("DD/MM/YYYY");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [revGoal, setRevGoal] = useState<number>(0);
  const [invGoal, setInvGoal] = useState<number>(0);

  const { data: meta } = useSheetMeta(picked?.id);
  const { data: preview } = useSheetPreview(picked?.id, sheetName, headerRow);

  // Hydrate from saved config
  useEffect(() => {
    if (config) {
      setPicked({
        id: config.spreadsheet_id,
        name: config.spreadsheet_name || "",
        url: config.spreadsheet_url || "",
      });
      setSheetName(config.sheet_name);
      setHeaderRow(config.header_row);
      setDecimalSep(config.decimal_separator);
      setDateFormat(config.date_format);
      setMapping((config.field_mapping as Record<string, string>) || {});
      setRevGoal(Number(config.monthly_revenue_goal || 0));
      setInvGoal(Number(config.monthly_investment_budget || 0));
    }
  }, [config?.id]);

  // Default sheet to first tab when meta loads
  useEffect(() => {
    if (meta && !sheetName && meta.sheets[0]) setSheetName(meta.sheets[0].name);
  }, [meta]);

  const headers = preview?.headers || [];

  const handleSelectSpreadsheet = (file: { id: string; name: string; webViewLink: string }) => {
    setPicked({ id: file.id, name: file.name, url: file.webViewLink });
    setSheetName("");
    setMapping({});
  };

  const handleManualSpreadsheet = () => {
    const parsed = extractSpreadsheetFromInput(manualSheetInput);
    if (!parsed) {
      toast.error("Cole a URL completa da planilha ou o ID dela");
      return;
    }
    setPicked(parsed);
    setSheetName("");
    setMapping({});
    toast.success("Planilha definida manualmente");
  };

  const handleSave = async () => {
    if (!clientId || !picked) {
      toast.error("Selecione uma planilha");
      return;
    }
    if (!sheetName) {
      toast.error("Selecione a aba");
      return;
    }
    if (!mapping.date) {
      toast.error("Mapeie pelo menos a coluna de Data");
      return;
    }
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        spreadsheet_id: picked.id,
        spreadsheet_name: picked.name,
        spreadsheet_url: picked.url,
        sheet_name: sheetName,
        header_row: headerRow,
        decimal_separator: decimalSep,
        date_format: dateFormat,
        field_mapping: mapping,
        monthly_revenue_goal: revGoal,
        monthly_investment_budget: invGoal,
      } as any);
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleSync = async () => {
    if (!clientId) return;
    try {
      const r = await sync.mutateAsync(clientId);
      toast.success(`Sincronizado: ${r.synced} linha(s)`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao sincronizar");
    }
  };

  const handleDelete = async () => {
    if (!clientId) return;
    if (!confirm("Apagar configuração da planilha?")) return;
    await del.mutateAsync(clientId);
    setPicked(null);
    setMapping({});
    toast.success("Configuração removida");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to={`/dashboard/${clientId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
          </Link>
          {client && <h1 className="text-xl font-bold uppercase">{client.name}</h1>}
        </div>

        {/* Step 1 — Pick spreadsheet */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">1. Escolha a planilha</h2>
                <p className="text-xs text-muted-foreground">Lista as planilhas da conta Google conectada.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchBrowse()} disabled={browsing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${browsing ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          {picked && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{picked.name || picked.id}</p>
                <p className="text-[10px] text-muted-foreground truncate">{picked.id}</p>
              </div>
              {picked.url && (
                <a href={picked.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>Trocar</Button>
            </div>
          )}

          {!picked && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar planilha pelo nome…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {browseRes?.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <p className="text-xs text-destructive">A listagem automática falhou no conector. Use a URL/ID abaixo para continuar.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cole a URL do Google Sheets ou o ID da planilha"
                      value={manualSheetInput}
                      onChange={(e) => setManualSheetInput(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={handleManualSpreadsheet}>Usar</Button>
                  </div>
                </div>
              )}
              <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {browsing && <p className="text-xs text-muted-foreground p-2">Carregando…</p>}
                {!browsing && !browseRes?.error && (browseRes?.files.length || 0) === 0 && (
                  <p className="text-xs text-muted-foreground p-2">
                    Nenhuma planilha encontrada. Verifique se o conector Google Sheets está ativo.
                  </p>
                )}
                {browseRes?.files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectSpreadsheet(f)}
                    className="w-full text-left p-2 rounded-md hover:bg-muted/40 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(f.modifiedTime).toLocaleDateString("pt-BR")}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Step 2 — Choose sheet/tab + header row */}
        {picked && (
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">2. Aba e cabeçalho</h2>
              <p className="text-xs text-muted-foreground">Escolha qual aba e em qual linha está o cabeçalho.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Aba</Label>
                <Select value={sheetName} onValueChange={setSheetName}>
                  <SelectTrigger><SelectValue placeholder="Escolher aba…" /></SelectTrigger>
                  <SelectContent>
                    {meta?.sheets.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Linha do cabeçalho</Label>
                <Input type="number" min={1} value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-[11px]">Separador decimal</Label>
                <Select value={decimalSep} onValueChange={setDecimalSep}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Vírgula (1.234,56)</SelectItem>
                    <SelectItem value=".">Ponto (1,234.56)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Formato de data</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                    <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Meta de Faturamento (mensal)</Label>
                <Input type="number" value={revGoal} onChange={(e) => setRevGoal(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-[11px]">Orçamento de Investimento (mensal)</Label>
                <Input type="number" value={invGoal} onChange={(e) => setInvGoal(Number(e.target.value) || 0)} />
              </div>
            </div>

            {/* Preview */}
            {preview && headers.length > 0 && (
              <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
                <p className="text-[11px] font-semibold p-2 border-b border-border bg-muted/40">
                  Preview ({preview.rows.length} linhas)
                </p>
                <div className="overflow-x-auto">
                  <table className="text-[11px] w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {headers.map((h, i) => (
                          <th key={i} className="text-left p-2 font-semibold whitespace-nowrap">{h || `(col ${i + 1})`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b border-border/40">
                          {headers.map((_, j) => (
                            <td key={j} className="p-2 whitespace-nowrap text-muted-foreground">{r[j] || ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3 — Map fields */}
        {picked && headers.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">3. Mapeie os campos do dashboard</h2>
              <p className="text-xs text-muted-foreground">
                Para cada métrica do dashboard, selecione qual coluna da sua planilha tem esse dado.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DASHBOARD_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px]">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] || "__none__"}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Não usar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não usar —</SelectItem>
                      {headers.map((h, i) => (
                        h ? <SelectItem key={i} value={h}>{h}</SelectItem> : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        {picked && (
          <div className="flex flex-wrap gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-xl border border-border">
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={sync.isPending || !config}>
              {sync.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
            {config && (
              <Button variant="ghost" className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Apagar
              </Button>
            )}
          </div>
        )}

        {/* Status */}
        {config?.last_sync_status === "success" && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              Última sincronização: {new Date(config.last_synced_at!).toLocaleString("pt-BR")} ·{" "}
              {config.last_sync_rows} linha(s)
            </span>
          </div>
        )}
        {config?.last_sync_status === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <span>{config.last_sync_error || "Erro ao sincronizar"}</span>
          </div>
        )}

        {metrics && metrics.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-3">Últimos dias sincronizados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-right py-2 px-2">Faturamento</th>
                    <th className="text-right py-2 px-2">Vendas</th>
                    <th className="text-right py-2 px-2">Produto</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2 px-2">{new Date(m.reference_date).toLocaleDateString("pt-BR")}</td>
                      <td className="text-right py-2 px-2">R$ {Number(m.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-2 px-2">{m.sales}</td>
                      <td className="text-right py-2 px-2">{m.product_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
