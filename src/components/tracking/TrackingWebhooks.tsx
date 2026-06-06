import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";

interface Props {
  clientId: string;
  config: any;
}

type Platform = "hotmart" | "kiwify" | "eduzz";

export default function TrackingWebhooks({ clientId, config }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://SEU_PROJETO.supabase.co";
  const token = config?.webhook_token || "TOKEN_NAO_CONFIGURADO";

  const webhookUrl = (platform: Platform) =>
    `${supabaseUrl}/functions/v1/sales-webhook/${clientId}/${platform}?token=${token}`;

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(null), 2000);
  }

  const platforms: { id: Platform; name: string; color: string; steps: string[]; docsUrl: string }[] = [
    {
      id: "hotmart",
      name: "Hotmart",
      color: "orange",
      docsUrl: "https://developers.hotmart.com/docs/pt-BR/v2/",
      steps: [
        "Acesse sua conta Hotmart e vá em Ferramentas → Webhook (API e Notificações)",
        "Clique em '+ Adicionar URL'",
        "Cole a URL do webhook abaixo no campo 'URL de destino'",
        "Selecione o produto desejado (ou 'Todos os produtos')",
        "Ative os eventos: PURCHASE_APPROVED, PURCHASE_REFUNDED, PURCHASE_CANCELLED",
        "Clique em 'Salvar' e depois em 'Enviar evento de teste' para validar",
        "Verifique na aba 'Log CAPI' se o evento foi recebido e disparado",
      ],
    },
    {
      id: "kiwify",
      name: "Kiwify",
      color: "green",
      docsUrl: "https://ajuda.kiwify.com.br/",
      steps: [
        "Acesse sua conta Kiwify e vá em Aplicativos → Webhooks",
        "Clique em 'Adicionar Webhook'",
        "Cole a URL do webhook abaixo no campo 'URL'",
        "Selecione o produto desejado",
        "Ative os eventos: compra_aprovada, compra_reembolsada, compra_cancelada",
        "Clique em 'Salvar'",
        "Use o botão 'Testar Webhook' para validar a integração",
      ],
    },
    {
      id: "eduzz",
      name: "Eduzz",
      color: "blue",
      docsUrl: "https://developers.eduzz.com/",
      steps: [
        "Acesse sua conta Eduzz e vá em Configurações → Webhooks / Notificações",
        "Clique em 'Criar Webhook' ou 'Adicionar URL'",
        "Cole a URL do webhook abaixo",
        "Selecione os eventos: Venda Aprovada, Reembolso",
        "Salve e faça um pedido de teste ou use o simulador de webhook",
        "Verifique na aba 'Log CAPI' se o evento foi recebido",
      ],
    },
  ];

  const colorMap: Record<string, string> = {
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Token de segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Token de Segurança
          </CardTitle>
          <CardDescription>
            Este token é único e autentica os webhooks recebidos. Não compartilhe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 font-mono break-all select-all">
              {token}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => copyText(token, "token")}
            >
              {copied === "token" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URLs dos Webhooks</CardTitle>
          <CardDescription>
            Configure cada plataforma com sua URL específica. Os parâmetros de rastreamento serão cruzados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hotmart">
            <TabsList>
              {platforms.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
              ))}
            </TabsList>

            {platforms.map((p) => (
              <TabsContent key={p.id} value={p.id} className="mt-4 space-y-4">
                {/* URL */}
                <div>
                  <p className="text-sm font-medium mb-2">URL do Webhook ({p.name})</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 font-mono break-all select-all">
                      {webhookUrl(p.id)}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyText(webhookUrl(p.id), p.id)}
                    >
                      {copied === p.id
                        ? <Check className="h-4 w-4 text-emerald-600" />
                        : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Passo a passo */}
                <div className={`rounded-lg border p-4 ${colorMap[p.color]}`}>
                  <p className="font-medium text-sm mb-3">Como configurar:</p>
                  <ol className="space-y-2">
                    {p.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="font-bold shrink-0 w-5">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => window.open(p.docsUrl, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Documentação {p.name}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Informativo */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <p className="text-sm font-medium mb-3">O que acontece quando um webhook é recebido:</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>O servidor valida o token de segurança</li>
            <li>O payload é normalizado (funciona com qualquer versão da API)</li>
            <li>Produto principal e order bumps são separados automaticamente</li>
            <li>O email do comprador é cruzado com a tabela de leads rastreados (fbclid, UTMs, IP)</li>
            <li>O evento Purchase é disparado via Meta CAPI com todos os dados disponíveis</li>
            <li>O evento Purchase é disparado no GA4 via Measurement Protocol</li>
            <li>O resultado (score EMQ, resposta) é salvo no log para auditoria</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
