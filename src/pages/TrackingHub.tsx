import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Settings, Code, Webhook, BarChart3, Activity,
  Zap, BookOpen, ListChecks, AlertTriangle, Copy, Check, RefreshCw,
} from "lucide-react";
import TrackingConfig from "@/components/tracking/TrackingConfig";
import TrackingScript from "@/components/tracking/TrackingScript";
import TrackingWebhooks from "@/components/tracking/TrackingWebhooks";
import TrackingDashboard from "@/components/tracking/TrackingDashboard";
import CapiLog from "@/components/tracking/CapiLog";
import TrackingGuide from "@/components/tracking/TrackingGuide";
import TrackingEvents from "@/components/tracking/TrackingEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TrackingHub() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState<string>("");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [activeTab, setActiveTab] = useState("guide");
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    fetchData();
  }, [clientId]);

  async function fetchData() {
    setLoading(true);
    setDbError(false);
    try {
      // Buscar nome do cliente (tabela sempre existente)
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .maybeSingle();
      if (client) setClientName(client.name);

      // Tentar buscar configuração de tracking (tabela nova — pode não existir ainda)
      const db = supabase as any;
      const { data: cfg, error: cfgError } = await db
        .from("tracking_config")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (cfgError) {
        // Tabela não existe ainda — migrations não foram aplicadas
        console.warn("tracking_config não encontrada:", cfgError.message);
        setDbError(true);
        return;
      }

      if (cfg) {
        setConfig(cfg);
      } else {
        // Criar config inicial
        const { data: newCfg, error: insertError } = await db
          .from("tracking_config")
          .insert({ client_id: clientId })
          .select("*")
          .single();
        if (insertError) {
          console.warn("Erro ao criar tracking_config:", insertError.message);
          setDbError(true);
          return;
        }
        setConfig(newCfg);
      }
    } catch (e) {
      console.error(e);
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }

  const sqlInstructions = `-- Cole no SQL Editor do Supabase Dashboard (Database → SQL Editor)
-- Arquivo: supabase/migrations/20260605120000_tracking_hub.sql
-- Execute os dois arquivos de migration em sequência.`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlInstructions);
    setCopiedSql(true);
    toast.success("Copiado!");
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando rastreamento...</p>
        </div>
      </div>
    );
  }

  // ── Header (sempre visível) ───────────────────────────────────────────────
  const header = (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">
              TrackingHub — {clientName || "Cliente"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Rastreamento server-side · Meta CAPI + GA4
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!dbError && (
            config?.active ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                Não configurado
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );

  // ── Erro: migrations não aplicadas ───────────────────────────────────────
  if (dbError) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Tabelas do banco ainda não foram criadas</p>
                  <p className="text-sm text-amber-700 mt-2">
                    O TrackingHub precisa de algumas tabelas novas no Supabase.
                    É necessário aplicar as migrations antes de usar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passo a passo */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <p className="font-semibold">Como aplicar as migrations:</p>

              <div className="space-y-4">
                {[
                  {
                    n: "1",
                    title: "Abra o Supabase Dashboard",
                    desc: "Acesse o projeto em",
                    link: "https://supabase.com/dashboard",
                    linkLabel: "supabase.com/dashboard",
                  },
                  {
                    n: "2",
                    title: "Vá em Database → SQL Editor",
                    desc: "No menu lateral esquerdo, clique em 'SQL Editor'",
                  },
                  {
                    n: "3",
                    title: "Execute o primeiro arquivo",
                    desc: "Abra o arquivo abaixo, copie o conteúdo e cole no SQL Editor → clique em 'Run':",
                    code: "supabase/migrations/20260605120000_tracking_hub.sql",
                  },
                  {
                    n: "4",
                    title: "Execute o segundo arquivo",
                    desc: "Repita o processo com:",
                    code: "supabase/migrations/20260605130000_tracking_events.sql",
                  },
                  {
                    n: "5",
                    title: "Volte aqui e recarregue",
                    desc: "Clique em 'Tentar novamente' abaixo.",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
                      {step.n}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.desc}{" "}
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {step.linkLabel}
                          </a>
                        )}
                      </p>
                      {step.code && (
                        <code className="mt-1 block text-xs bg-muted border rounded px-2 py-1 font-mono">
                          {step.code}
                        </code>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={fetchData} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
                  className="gap-2"
                >
                  Abrir Supabase
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alternativa: Supabase CLI */}
          <Card className="border-dashed">
            <CardContent className="pt-5">
              <p className="text-sm font-medium mb-2">Alternativa: via Supabase CLI</p>
              <p className="text-xs text-muted-foreground mb-3">
                Se você tem o Supabase CLI instalado e vinculado ao projeto:
              </p>
              <div className="relative">
                <pre className="bg-gray-950 text-gray-100 rounded-lg p-3 text-xs font-mono">
{`supabase db push`}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-1.5 right-1.5 h-7 gap-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText("supabase db push");
                    toast.success("Copiado!");
                  }}
                >
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Interface normal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {header}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="guide" className="gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Como usar
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <ListChecks className="h-3.5 w-3.5" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-3.5 w-3.5" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="script" className="gap-2">
              <Code className="h-3.5 w-3.5" />
              Script LP
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-3.5 w-3.5" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <Activity className="h-3.5 w-3.5" />
              Log CAPI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide">
            <TrackingGuide
              clientId={clientId!}
              config={config}
              onGoToTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="events">
            <TrackingEvents clientId={clientId!} />
          </TabsContent>

          <TabsContent value="config">
            {config && (
              <TrackingConfig clientId={clientId!} config={config} onSave={fetchData} />
            )}
          </TabsContent>

          <TabsContent value="script">
            {config && (
              <TrackingScript clientId={clientId!} config={config} />
            )}
          </TabsContent>

          <TabsContent value="webhooks">
            {config && (
              <TrackingWebhooks clientId={clientId!} config={config} />
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            <TrackingDashboard clientId={clientId!} />
          </TabsContent>

          <TabsContent value="log">
            <CapiLog clientId={clientId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
