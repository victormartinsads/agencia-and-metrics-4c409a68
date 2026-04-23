import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import {
  useSheetsConfig,
  useUpsertSheetsConfig,
  useSyncSheets,
  useWeeklyMetrics,
  extractSpreadsheetId,
} from "@/hooks/useSheetsSync";
import { SpreadsheetsManager } from "@/components/dashboard/overview/SpreadsheetsManager";

const METRIC_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "column_date", label: "Data (semana de referência)", required: true },
  { key: "column_investment", label: "Investimento total" },
  { key: "column_revenue", label: "Faturamento" },
  { key: "column_sales", label: "Vendas" },
  { key: "column_leads", label: "Leads" },
  { key: "column_mql", label: "MQL" },
  { key: "column_smql", label: "sMQL" },
  { key: "column_avg_ticket", label: "Ticket médio" },
  { key: "column_ltv", label: "LTV" },
  { key: "column_low_ticket_meta", label: "Low Ticket Meta" },
  { key: "column_low_ticket_google", label: "Low Ticket Google" },
  { key: "column_product_code", label: "Código do produto" },
  { key: "column_qualified_messages", label: "Mensagens qualificadas" },
  { key: "column_qualified_followers", label: "Seguidores qualificados" },
];

export default function ClientSheetsConfig() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: clients } = useClients();
  const client = clients?.find((c) => c.id === clientId);

  const { data: config, isLoading } = useSheetsConfig(clientId);
  const upsert = useUpsertSheetsConfig();
  const sync = useSyncSheets();
  const { data: metrics } = useWeeklyMetrics(clientId, 12);

  const [form, setForm] = useState({
    spreadsheet_url: "",
    sheet_name: "Página1",
    range_notation: "A1:Z1000",
    column_date: "",
    column_revenue: "",
    column_sales: "",
    column_mql: "",
    column_smql: "",
    column_avg_ticket: "",
    column_ltv: "",
    column_investment: "",
    column_leads: "",
    column_low_ticket_meta: "",
    column_low_ticket_google: "",
    column_product_code: "",
    column_qualified_messages: "",
    column_qualified_followers: "",
    monthly_revenue_goal: 0,
    monthly_investment_budget: 0,
    header_row: 1,
    decimal_separator: ",",
    date_format: "DD/MM/YYYY",
  });

  useEffect(() => {
    if (config) {
      setForm({
        spreadsheet_url: config.spreadsheet_url || "",
        sheet_name: config.sheet_name,
        range_notation: config.range_notation,
        column_date: config.column_date || "",
        column_revenue: config.column_revenue || "",
        column_sales: config.column_sales || "",
        column_mql: config.column_mql || "",
        column_smql: config.column_smql || "",
        column_avg_ticket: config.column_avg_ticket || "",
        column_ltv: config.column_ltv || "",
        column_investment: config.column_investment || "",
        column_leads: config.column_leads || "",
        column_low_ticket_meta: config.column_low_ticket_meta || "",
        column_low_ticket_google: config.column_low_ticket_google || "",
        column_product_code: config.column_product_code || "",
        column_qualified_messages: config.column_qualified_messages || "",
        column_qualified_followers: config.column_qualified_followers || "",
        monthly_revenue_goal: Number(config.monthly_revenue_goal || 0),
        monthly_investment_budget: Number(config.monthly_investment_budget || 0),
        header_row: config.header_row,
        decimal_separator: config.decimal_separator,
        date_format: config.date_format,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!clientId) return;
    const sid = extractSpreadsheetId(form.spreadsheet_url);
    if (!sid) {
      toast.error("Cole um link válido do Google Sheets");
      return;
    }
    if (!form.column_date) {
      toast.error("A coluna de data é obrigatória");
      return;
    }
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        spreadsheet_id: sid,
        spreadsheet_url: form.spreadsheet_url,
        sheet_name: form.sheet_name,
        range_notation: form.range_notation,
        column_date: form.column_date.toUpperCase() || null,
        column_revenue: form.column_revenue.toUpperCase() || null,
        column_sales: form.column_sales.toUpperCase() || null,
        column_mql: form.column_mql.toUpperCase() || null,
        column_smql: form.column_smql.toUpperCase() || null,
        column_avg_ticket: form.column_avg_ticket.toUpperCase() || null,
        column_ltv: form.column_ltv.toUpperCase() || null,
        column_investment: form.column_investment.toUpperCase() || null,
        column_leads: form.column_leads.toUpperCase() || null,
        column_low_ticket_meta: form.column_low_ticket_meta.toUpperCase() || null,
        column_low_ticket_google: form.column_low_ticket_google.toUpperCase() || null,
        column_product_code: form.column_product_code.toUpperCase() || null,
        column_qualified_messages: form.column_qualified_messages.toUpperCase() || null,
        column_qualified_followers: form.column_qualified_followers.toUpperCase() || null,
        monthly_revenue_goal: Number(form.monthly_revenue_goal) || 0,
        monthly_investment_budget: Number(form.monthly_investment_budget) || 0,
        header_row: Number(form.header_row),
        decimal_separator: form.decimal_separator,
        date_format: form.date_format,
      });
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleSync = async (action: "test" | "sync") => {
    if (!clientId) return;
    try {
      const r = await sync.mutateAsync({ clientId, action });
      if (action === "test") toast.success("Conexão OK!");
      else toast.success(`Sincronizado: ${r.synced || 0} linha(s)`);
    } catch (e: any) {
      if (e.message?.includes("Connectors")) {
        toast.warning(e.message, { duration: 8000 });
      } else {
        toast.error(e.message || "Erro");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link to={`/dashboard/${clientId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
          </Link>
          {client && (
            <h1 className="text-xl font-bold uppercase">{client.name}</h1>
          )}
        </div>

        {clientId && <SpreadsheetsManager clientId={clientId} />}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Configuração da Planilha Principal (legacy)</h2>
              <p className="text-xs text-muted-foreground">
                Mapeamento clássico de colunas. Você pode preferir usar o novo sistema de "Fontes de Dados" via cada bloco do dashboard.
              </p>
            </div>
          </div>

          {config?.last_sync_status === "pending_connection" && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium">Conector Google Sheets ainda não está ativo</p>
                <p className="text-muted-foreground mt-0.5">A configuração será salva e você pode sincronizar depois que um admin do workspace ativar o conector.</p>
              </div>
            </div>
          )}

          {config?.last_sync_status === "success" && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Última sincronização: {new Date(config.last_synced_at!).toLocaleString("pt-BR")}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Link da planilha</Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={form.spreadsheet_url}
                onChange={(e) => setForm({ ...form, spreadsheet_url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome da aba</Label>
                <Input value={form.sheet_name} onChange={(e) => setForm({ ...form, sheet_name: e.target.value })} />
              </div>
              <div>
                <Label>Intervalo (range)</Label>
                <Input value={form.range_notation} onChange={(e) => setForm({ ...form, range_notation: e.target.value })} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-semibold mb-3">Mapeamento de colunas</p>
              <p className="text-[11px] text-muted-foreground mb-3">Digite a letra da coluna (ex: A, B, C). Deixe vazio se a métrica não existe na planilha.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {METRIC_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label className="text-[11px]">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      maxLength={3}
                      placeholder="A"
                      className="uppercase"
                      value={form[f.key as keyof typeof form] as string}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value.toUpperCase() })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Linha do cabeçalho</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.header_row}
                  onChange={(e) => setForm({ ...form, header_row: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-[11px]">Separador decimal</Label>
                <Select value={form.decimal_separator} onValueChange={(v) => setForm({ ...form, decimal_separator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Vírgula (1.234,56)</SelectItem>
                    <SelectItem value=".">Ponto (1,234.56)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Formato de data</Label>
                <Select value={form.date_format} onValueChange={(v) => setForm({ ...form, date_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                    <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-semibold mb-3">Metas mensais (para barras de progresso)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Meta de Faturamento (mensal)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="28928.39"
                    value={form.monthly_revenue_goal}
                    onChange={(e) => setForm({ ...form, monthly_revenue_goal: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Orçamento de Investimento (mensal)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="21689.71"
                    value={form.monthly_investment_budget}
                    onChange={(e) => setForm({ ...form, monthly_investment_budget: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar configuração
              </Button>
              <Button variant="outline" onClick={() => handleSync("test")} disabled={sync.isPending || !config}>
                Testar conexão
              </Button>
              <Button variant="outline" onClick={() => handleSync("sync")} disabled={sync.isPending || !config}>
                {sync.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar agora
              </Button>
              {form.spreadsheet_url && (
                <Button variant="ghost" asChild>
                  <a href={form.spreadsheet_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir planilha
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {metrics && metrics.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Últimas semanas sincronizadas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-right py-2 px-2">Faturamento</th>
                    <th className="text-right py-2 px-2">Vendas</th>
                    <th className="text-right py-2 px-2">MQL</th>
                    <th className="text-right py-2 px-2">sMQL</th>
                    <th className="text-right py-2 px-2">Ticket médio</th>
                    <th className="text-right py-2 px-2">LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2 px-2">{new Date(m.reference_date).toLocaleDateString("pt-BR")}</td>
                      <td className="text-right py-2 px-2">R$ {Number(m.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-2 px-2">{m.sales}</td>
                      <td className="text-right py-2 px-2">{m.mql}</td>
                      <td className="text-right py-2 px-2">{m.smql}</td>
                      <td className="text-right py-2 px-2">R$ {Number(m.avg_ticket).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-2 px-2">R$ {Number(m.ltv).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}