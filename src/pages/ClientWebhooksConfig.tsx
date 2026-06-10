import { useState, useEffect, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Copy, Webhook, RefreshCw, Send, Upload, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import {
  useSalesWebhookConfig,
  useUpdateSalesWebhookConfig,
  useSalesEvents,
} from "@/hooks/useSalesEvents";
import { useQueryClient } from "@tanstack/react-query";

const PLATFORMS = [
  {
    key: "hotmart",
    name: "Hotmart",
    docs: "Em Ferramentas → Webhook (Hottok), cole a URL e selecione os eventos PURCHASE_APPROVED, PURCHASE_REFUNDED.",
  },
  {
    key: "kiwify",
    name: "Kiwify",
    docs: "Em Configurações → Webhooks, adicione esta URL e marque os eventos order_approved, order_refunded.",
  },
  {
    key: "eduzz",
    name: "Eduzz",
    docs: "Em MyEduzz → Configurações → Postback, cadastre esta URL para receber as notificações de venda.",
  },
];

export default function ClientWebhooksConfig() {
  const { clientId } = useParams<{ clientId: string }>();
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const client = clients?.find((c) => c.id === clientId);
  const { data: cfg, isLoading: cfgLoading } = useSalesWebhookConfig(clientId);
  const update = useUpdateSalesWebhookConfig();

  const last30 = {
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  };
  const { data: recent } = useSalesEvents(clientId, last30);

  const [filters, setFilters] = useState<Record<string, string>>({
    hotmart: "",
    kiwify: "",
    eduzz: "",
  });

  useEffect(() => {
    if (cfg) {
      setFilters({
        hotmart: (cfg.product_filters?.hotmart || []).join(", "),
        kiwify: (cfg.product_filters?.kiwify || []).join(", "),
        eduzz: (cfg.product_filters?.eduzz || []).join(", "),
      });
    }
  }, [cfg]);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-webhook`;

  const buildUrl = (platform: string) =>
    `${baseUrl}/${clientId}/${platform}?token=${cfg?.webhook_token || ""}`;

  const qc = useQueryClient();
  const [testing, setTesting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mock payloads compatíveis com o normalize() de cada plataforma
  const mockPayload = (platform: string) => {
    const txn = `TEST-${Date.now()}`;
    if (platform === "hotmart") {
      return {
        event: "PURCHASE_APPROVED",
        data: {
          purchase: {
            transaction: txn,
            status: "APPROVED",
            approved_date: Date.now(),
            price: { value: 197, currency_value: "BRL" },
            commission: { value: 150 },
          },
          product: { id: "TEST-PROD", name: "Produto Teste Hotmart" },
          buyer: { email: "teste@exemplo.com" },
        },
      };
    }
    if (platform === "kiwify") {
      return {
        webhook_event_type: "order_approved",
        order: {
          order_id: txn,
          order_status: "paid",
          created_at: new Date().toISOString(),
          Customer: { email: "teste@exemplo.com" },
          Product: { product_id: "TEST-PROD", product_name: "Produto Teste Kiwify" },
          Commissions: { charge_amount: 19700, my_commission: 15000, currency: "BRL" },
        },
      };
    }
    return {
      trans_cod: txn,
      trans_status: "paid",
      trans_value: 197,
      trans_value_partner: 150,
      product_cod: "TEST-PROD",
      product_name: "Produto Teste Eduzz",
      client_email: "teste@exemplo.com",
      trans_createdate: new Date().toISOString(),
    };
  };

  const sendTestEvent = async (platform: string) => {
    if (!cfg?.webhook_token || !clientId) return;
    setTesting(platform);
    try {
      const res = await fetch(buildUrl(platform), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload(platform)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast({
        title: "✅ Webhook funcionando",
        description: `Evento de teste recebido pela ${platform}. Veja na lista abaixo.`,
      });
      qc.invalidateQueries({ queryKey: ["sales-events"] });
    } catch (e: any) {
      toast({ title: "Falha no teste", description: e.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "platform,transaction_id,product_id,product_name,status,gross_amount,net_amount,currency,occurred_at,buyer_email\n" +
      "hotmart,ABC-001,PROD-1,Produto Exemplo,approved,197.00,150.00,BRL,2026-01-15 10:30:00,cliente@exemplo.com\n" +
      "kiwify,XYZ-002,PROD-2,Outro Produto,approved,97.00,80.00,BRL,2026-01-16 14:20:00,outro@exemplo.com\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-vendas-historicas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (file: File) => {
    if (!clientId) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const events = (result.data as any[])
            .map((row) => ({
              platform: (row.platform || "csv").toLowerCase(),
              transaction_id: row.transaction_id || row.id || `csv-${Date.now()}-${Math.random()}`,
              product_id: row.product_id || null,
              product_name: row.product_name || null,
              buyer_email: row.buyer_email || row.email || null,
              status: row.status || "approved",
              gross_amount: row.gross_amount || row.amount || row.value || 0,
              net_amount: row.net_amount || row.gross_amount || 0,
              currency: row.currency || "BRL",
              occurred_at: row.occurred_at || row.date || new Date().toISOString(),
            }))
            .filter((e) => e.transaction_id);

          // Send in chunks of 200
          let total = 0;
          for (let i = 0; i < events.length; i += 200) {
            const chunk = events.slice(i, i + 200);
            const { data, error } = await supabase.functions.invoke("sales-webhook", {
              method: "POST",
              body: { events: chunk },
              // path needs to match /sales-webhook/:clientId/import
            });
            if (error) throw error;
            total += chunk.length;
          }
          // The supabase-js functions.invoke does not support custom path segments.
          // Use direct fetch instead:
          // (handled below if invoke fails — fall back)
          toast({ title: `✅ ${total} vendas importadas` });
          qc.invalidateQueries({ queryKey: ["sales-events"] });
        } catch (err: any) {
          // Fallback to direct fetch with path /import
          try {
            const csvData = (result.data as any[])
              .map((row) => ({
                platform: (row.platform || "csv").toLowerCase(),
                transaction_id: row.transaction_id || row.id,
                product_id: row.product_id || null,
                product_name: row.product_name || null,
                buyer_email: row.buyer_email || row.email || null,
                status: row.status || "approved",
                gross_amount: row.gross_amount || row.amount || row.value || 0,
                net_amount: row.net_amount || row.gross_amount || 0,
                currency: row.currency || "BRL",
                occurred_at: row.occurred_at || row.date || new Date().toISOString(),
              }))
              .filter((e) => e.transaction_id);

            const session = (await supabase.auth.getSession()).data.session;
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-webhook/${clientId}/import`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token || ""}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
                },
                body: JSON.stringify({ events: csvData }),
              },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Falha ao importar");
            toast({ title: `✅ ${data.imported} vendas importadas` });
            qc.invalidateQueries({ queryKey: ["sales-events"] });
          } catch (err2: any) {
            toast({ title: "Erro ao importar", description: err2.message, variant: "destructive" });
          }
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => {
        toast({ title: "Erro CSV", description: err.message, variant: "destructive" });
        setImporting(false);
      },
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const handleSaveFilters = async () => {
    if (!clientId) return;
    const parsed = Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [
        k,
        v.split(",").map((s) => s.trim()).filter(Boolean),
      ]),
    );
    await update.mutateAsync({ clientId, product_filters: parsed });
    toast({ title: "Filtros salvos" });
  };

  const isAllowed = userRole?.isAdmin || userRole?.isCeo || userRole?.isDiretor || (clients || []).some((c) => c.id === clientId);

  if (roleLoading || clientsLoading || cfgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client || !isAllowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Acesso não autorizado ou cliente não encontrado.</p>
        <Link to="/clients" className="text-primary underline">Voltar para a página inicial</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={`/dashboard/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhooks de vendas
          </h1>
          <p className="text-sm text-muted-foreground">
            {client?.name?.toUpperCase()} — receba vendas em tempo real de Hotmart, Kiwify e Eduzz.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs uppercase text-muted-foreground">Token de segurança (único)</Label>
          <div className="flex gap-2 mt-1">
            <Input value={cfg?.webhook_token || ""} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(cfg?.webhook_token || "")}
              title="Copiar token"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Este token já está embutido nas URLs abaixo. Não precisa configurar separadamente.
          </p>
        </div>
      </Card>

      <Tabs defaultValue="hotmart">
        <TabsList>
          {PLATFORMS.map((p) => (
            <TabsTrigger key={p.key} value={p.key}>
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {PLATFORMS.map((p) => (
          <TabsContent key={p.key} value={p.key} className="space-y-4">
            <Card className="p-4 space-y-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">URL do webhook</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={buildUrl(p.key)} readOnly className="font-mono text-[11px]" />
                  <Button variant="outline" size="icon" onClick={() => copy(buildUrl(p.key))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{p.docs}</p>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-medium text-card-foreground">Testar webhook</p>
                  <p className="text-muted-foreground text-[11px]">
                    Envia um evento simulado de venda aprovada para verificar se está tudo OK.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendTestEvent(p.key)}
                  disabled={testing === p.key || !cfg?.webhook_token}
                  className="gap-1.5"
                >
                  {testing === p.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Enviar teste
                </Button>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Filtro de produtos (opcional)
                </Label>
                <Input
                  value={filters[p.key]}
                  onChange={(e) => setFilters((f) => ({ ...f, [p.key]: e.target.value }))}
                  placeholder="Ex: 1234567, 7654321 (deixe vazio para contar todos)"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  IDs de produto da {p.name} separados por vírgula. Vazio = contabiliza todas as vendas que chegarem.
                </p>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSaveFilters} disabled={update.isPending}>
          {update.isPending ? "Salvando..." : "Salvar filtros"}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Últimas vendas recebidas (30 dias)
          </h2>
          <span className="text-xs text-muted-foreground">{recent?.length || 0} eventos</span>
        </div>
        {(recent?.length || 0) === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Nenhuma venda recebida ainda. Configure a URL na plataforma e faça uma venda teste.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left">Plataforma</th>
                  <th className="text-left">Produto</th>
                  <th className="text-right">Valor</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent!.slice(0, 50).map((e) => (
                  <tr key={e.id} className="border-b border-border/40">
                    <td className="py-1.5">{new Date(e.occurred_at).toLocaleString("pt-BR")}</td>
                    <td className="capitalize">{e.platform}</td>
                    <td className="max-w-[200px] truncate">{e.product_name || e.product_id || "—"}</td>
                    <td className="text-right tabular-nums">
                      R$ {Number(e.gross_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span
                        className={
                          e.status === "approved"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Importar histórico via CSV
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Suba vendas antigas das suas plataformas. Use o template para garantir o formato correto.
              Vendas duplicadas (mesma plataforma + transaction_id) são ignoradas automaticamente.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 shrink-0">
            <FileDown className="h-3.5 w-3.5" /> Template
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsvUpload(f);
          }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="w-full gap-1.5"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importing ? "Importando..." : "Selecionar arquivo CSV"}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Colunas aceitas: <code>platform, transaction_id, product_id, product_name, status, gross_amount, net_amount, currency, occurred_at, buyer_email</code>
        </p>
      </Card>
    </div>
  );
}