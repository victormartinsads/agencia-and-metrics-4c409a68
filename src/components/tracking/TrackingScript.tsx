import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Code, AlertCircle, Activity } from "lucide-react";

interface Props {
  clientId: string;
  config: any;
}

export default function TrackingScript({ clientId, config }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://SEU_PROJETO.supabase.co";
  const scriptUrl = `${supabaseUrl}/functions/v1/tracking-script/${clientId}`;

  const htmlTag = `<!-- TrackingHub -->
<script>(function(w,d,s,u){
var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
j.async=true;j.src=u;f.parentNode.insertBefore(j,f);
})(window,document,'script','${scriptUrl}');</script>
<!-- End TrackingHub -->`;

  const gtmSnippet = `<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${scriptUrl}';
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`;

  const wordpressSnippet = `// Adicione no functions.php do seu tema:
function tracking_hub_script() {
  wp_enqueue_script(
    'tracking-hub',
    '${scriptUrl}',
    array(),
    null,
    false // importante: carregar no <head>
  );
}
add_action('wp_enqueue_scripts', 'tracking_hub_script');`;

  const identifySnippet = `<!-- Chame após o usuário preencher o formulário de captação -->
<script>
  // Identifica o lead para cruzamento com a compra
  if (window.__TrackingHub) {
    __TrackingHub.identify('email@exemplo.com', '+5511999999999');
  }
</script>`;

  const viewContentSnippet = `<!-- Chame quando o usuário visualiza a oferta (VSL, página de vendas) -->
<script>
  if (window.__TrackingHub) {
    __TrackingHub.viewContent(
      'Nome do Produto', // content_name
      'PRODUCT_ID_123',  // content_id (ID do produto na Hotmart/Kiwify)
      297.00,            // valor
      'BRL'              // moeda
    );
  }
</script>`;

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  }

  if (!config?.pixel_id || !config?.capi_token) {
    return (
      <div className="max-w-2xl">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Configure o Pixel ID e o CAPI Token primeiro</p>
                <p className="text-sm text-amber-700 mt-1">
                  Acesse a aba <strong>Configuração</strong> e preencha pelo menos o Pixel ID e o CAPI Token para que o script funcione corretamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* URL do Script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            URL do Script
          </CardTitle>
          <CardDescription>
            Este script é único para este cliente. Inclua-o em todas as landing pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 font-mono break-all select-all">
              {scriptUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => copyText(scriptUrl, "url")}
            >
              {copied === "url" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => window.open(scriptUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Testador de Eventos (Debug Mode) */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-900">
            <Activity className="h-4 w-4" />
            Testador de Eventos (Log na Página)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 mb-3">
            Para testar se os eventos estão sendo disparados corretamente na sua Landing Page, adicione <code className="bg-blue-100 px-1 rounded font-bold">?th_debug=true</code> ao final da URL da sua página.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <code className="text-xs bg-blue-100/50 text-blue-900 rounded px-2 py-1.5 break-all">
              https://seu-dominio.com.br/?th_debug=true
            </code>
          </div>
          <p className="text-sm text-blue-800">
            Isso ativará um <strong>painel visual flutuante</strong> na sua página que mostrará em tempo real todos os eventos capturados (Cliques, Scroll, Forms, etc.) e os dados enviados para o servidor.
          </p>
        </CardContent>
      </Card>

      {/* Instruções por plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como instalar</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML Puro</TabsTrigger>
              <TabsTrigger value="gtm">Google Tag Manager</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Cole o código abaixo dentro do <code className="text-xs bg-muted px-1 rounded">&lt;head&gt;</code> de todas as suas landing pages:
              </p>
              <div className="relative">
                <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                  {htmlTag}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
                  onClick={() => copyText(htmlTag, "html")}
                >
                  {copied === "html" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="gtm" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                No GTM, crie uma tag do tipo <strong>HTML Personalizado</strong> com o código abaixo. Disparo: <strong>All Pages</strong>.
              </p>
              <div className="relative">
                <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                  {gtmSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
                  onClick={() => copyText(gtmSnippet, "gtm")}
                >
                  {copied === "gtm" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="wordpress" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Adicione no <code className="text-xs bg-muted px-1 rounded">functions.php</code> do tema ativo:
              </p>
              <div className="relative">
                <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                  {wordpressSnippet}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
                  onClick={() => copyText(wordpressSnippet, "wp")}
                >
                  {copied === "wp" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* API pública do script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API JavaScript — Eventos Avançados</CardTitle>
          <CardDescription>
            Use estas funções para disparar eventos específicos na jornada do usuário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identify */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-mono">__TrackingHub.identify(email, phone)</Badge>
              <span className="text-xs text-muted-foreground">— Após captura de lead</span>
            </div>
            <div className="relative">
              <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                {identifySnippet}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
                onClick={() => copyText(identifySnippet, "identify")}
              >
                {copied === "identify" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
          </div>

          {/* ViewContent */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-mono">__TrackingHub.viewContent(...)</Badge>
              <span className="text-xs text-muted-foreground">— Ao exibir oferta/VSL</span>
            </div>
            <div className="relative">
              <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                {viewContentSnippet}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 gap-1.5 h-7 text-xs"
                onClick={() => copyText(viewContentSnippet, "viewcontent")}
              >
                {copied === "viewcontent" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O que o script faz */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <p className="text-sm font-medium mb-3">O que o script faz automaticamente:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Captura fbclid da URL e constrói o parâmetro fbc",
              "Lê ou gera o cookie _fbp (90 dias)",
              "Captura todos UTMs da URL e persiste em cookies (30 dias)",
              "Injeta parâmetros de rastreamento em todos os links de checkout (Hotmart, Kiwify, Eduzz)",
              "Dispara PageView via Meta Pixel (browser) + CAPI (servidor) — deduplicados pelo mesmo event_id",
              "Dispara PageView no GA4 via Measurement Protocol",
              "Observa novos links adicionados dinamicamente na página (countdowns, pop-ups)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
