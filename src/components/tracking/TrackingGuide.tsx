import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code2, Webhook, Zap, CheckCircle2, ArrowRight,
  Globe, Tag, ShoppingCart, MousePointerClick
} from "lucide-react";

interface Props {
  clientId: string;
  config: any;
  onGoToTab: (tab: string) => void;
}

const steps = [
  {
    num: "1",
    icon: <Code2 className="h-5 w-5" />,
    title: "Instale o Script na Landing Page",
    color: "blue",
    tab: "script",
    label: "Ver Script",
    description: "Um único <script> no <head> da sua LP. Captura automaticamente fbclid, _fbp, UTMs e injeta os parâmetros nos links de checkout.",
    automático: [
      "Captura fbclid → gera fbc automaticamente",
      "Lê ou cria cookie _fbp (90 dias)",
      "Salva UTMs em cookies (30 dias)",
      "Injeta src= na Hotmart / utm_* na Kiwify / utm_* na Eduzz",
      "Dispara PageView no Meta Pixel + CAPI (deduplicado pelo mesmo event_id)",
    ],
    gtm: "No GTM: crie uma Tag HTML Personalizado → cole o snippet → Disparo: All Pages",
  },
  {
    num: "2",
    icon: <Webhook className="h-5 w-5" />,
    title: "Configure o Webhook na Plataforma",
    color: "orange",
    tab: "webhooks",
    label: "Ver URLs",
    description: "Registre a URL do webhook no painel da Hotmart, Kiwify ou Eduzz. O sistema aceita os três ao mesmo tempo.",
    automático: [
      "Cada plataforma tem uma URL diferente (gerada automaticamente com seu token)",
      "Hotmart: suporta order bumps automaticamente",
      "Kiwify: suporta order_bumps[] do payload",
      "Eduzz: normaliza o formato antigo e novo da API",
      "Token de segurança protege contra chamadas indevidas",
    ],
    gtm: null,
  },
  {
    num: "3",
    icon: <Zap className="h-5 w-5" />,
    title: "Configure Pixel ID e CAPI Token",
    color: "purple",
    tab: "config",
    label: "Configurar",
    description: "Insira o Pixel ID e o CAPI Token do cliente (System User). Opcional: GA4 Measurement ID + API Secret.",
    automático: [
      "Pixel ID: encontre no Gerenciador de Eventos do Meta",
      "CAPI Token: crie um System User em Business Settings → Gerar Token",
      "GA4: Measurement ID (G-XXX) + API Secret do stream de dados",
      "Test Event Code: use durante os testes, retire em produção",
    ],
    gtm: null,
  },
  {
    num: "4",
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Teste e Valide",
    color: "green",
    tab: "config",
    label: "Ir para testes",
    description: "Clique em 'Enviar evento de teste' na aba Configuração. Verifique no Meta Events Manager → Test Events que o Purchase chegou com score alto.",
    automático: [
      "Confirme que o evento aparece no Meta Events Manager",
      "Score EMQ deve ser 7+ (idealmente 9+)",
      "Verifique a aba 'Log CAPI' para ver o resultado de cada disparo",
      "Após validar, remova o Test Event Code para produção",
    ],
    gtm: null,
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; numBg: string }> = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    numBg: "bg-blue-600",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    numBg: "bg-orange-600",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    numBg: "bg-purple-600",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    numBg: "bg-emerald-600",
  },
};

export default function TrackingGuide({ clientId, config, onGoToTab }: Props) {
  const hasConfig = !!(config?.pixel_id && config?.capi_token);
  const hasActive = !!config?.active;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Status geral */}
      <Card className={hasConfig && hasActive ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}>
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            {hasConfig && hasActive ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {hasConfig && hasActive
                  ? "TrackingHub configurado e ativo"
                  : "Configure o TrackingHub em 4 passos simples"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasConfig && hasActive
                  ? `Pixel: ${config.pixel_id} · Rastreamento ativo. Siga os passos abaixo para instalar o script e configurar os webhooks.`
                  : "O client ID já está embutido em todas as URLs geradas — você não precisa copiar ou configurar nada manualmente."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Como funciona — visual simples */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider text-xs">Como funciona a jornada</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { icon: <Globe className="h-3.5 w-3.5" />, label: "Visitante chega na LP" },
            { icon: <MousePointerClick className="h-3.5 w-3.5" />, label: "Script captura fbclid + UTMs" },
            { icon: <ShoppingCart className="h-3.5 w-3.5" />, label: "Clica no checkout" },
            { icon: <Tag className="h-3.5 w-3.5" />, label: "Webhook chega da plataforma" },
            { icon: <Zap className="h-3.5 w-3.5" />, label: "CAPI dispara Purchase" },
            { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Meta atribui a conversão" },
          ].map((item, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted border rounded-lg px-2.5 py-1.5">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* 4 passos */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider text-xs">Configuração em 4 passos</p>
        {steps.map((step) => {
          const c = colorMap[step.color];
          return (
            <Card key={step.num} className={`border ${c.border}`}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  {/* Número */}
                  <div className={`${c.numBg} text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0`}>
                    {step.num}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Título */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={c.text}>{step.icon}</span>
                        <p className="font-semibold text-sm">{step.title}</p>
                      </div>
                      <button
                        onClick={() => onGoToTab(step.tab)}
                        className={`text-xs font-medium ${c.text} ${c.bg} border ${c.border} rounded-full px-3 py-1 hover:opacity-80 transition-opacity`}
                      >
                        {step.label} →
                      </button>
                    </div>

                    {/* Descrição */}
                    <p className="text-xs text-muted-foreground mt-2">{step.description}</p>

                    {/* GTM hint */}
                    {step.gtm && (
                      <div className="mt-2 bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground border border-dashed">
                        💡 <strong>GTM:</strong> {step.gtm}
                      </div>
                    )}

                    {/* O que acontece automaticamente */}
                    <ul className="mt-3 space-y-1">
                      {step.automático.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sobre o client ID */}
      <Card className="border-dashed">
        <CardContent className="pt-5">
          <p className="text-sm font-semibold mb-2">❓ Sobre o Client ID</p>
          <p className="text-xs text-muted-foreground">
            O <strong>Client ID</strong> é o identificador único deste cliente no sistema ({clientId.slice(0, 8)}...).
            Você <strong>não precisa copiar ou gerenciar</strong> esse ID — ele já está embutido automaticamente em todas
            as URLs que o sistema gera: URL do script, URL dos webhooks e endpoint de coleta.
            Basta navegar para a aba correta e copiar a URL pronta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
