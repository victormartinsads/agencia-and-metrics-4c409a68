import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Webhook, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import {
  useSalesWebhookConfig,
  useUpdateSalesWebhookConfig,
  useSalesEvents,
} from "@/hooks/useSalesEvents";

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
  const { data: clients } = useClients();
  const client = clients?.find((c) => c.id === clientId);
  const { data: cfg, isLoading } = useSalesWebhookConfig(clientId);
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

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
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

      <Card className="p-4 bg-muted/20">
        <h3 className="font-semibold text-sm mb-2">Importar histórico via CSV</h3>
        <p className="text-xs text-muted-foreground">
          Em breve: faça upload do export de vendas da Hotmart/Kiwify/Eduzz para popular o histórico anterior à ativação do webhook.
        </p>
      </Card>
    </div>
  );
}