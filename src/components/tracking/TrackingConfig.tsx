import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Save, FlaskConical, CheckCircle2, AlertCircle } from "lucide-react";

const schema = z.object({
  pixel_id: z.string().optional(),
  capi_token: z.string().optional(),
  test_event_code: z.string().optional(),
  ga4_measurement_id: z.string().optional(),
  ga4_api_secret: z.string().optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  clientId: string;
  config: any;
  onSave: () => void;
}

export default function TrackingConfig({ clientId, config, onSave }: Props) {
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [showGa4Secret, setShowGa4Secret] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pixel_id: config?.pixel_id || "",
      capi_token: config?.capi_token || "",
      test_event_code: config?.test_event_code || "",
      ga4_measurement_id: config?.ga4_measurement_id || "",
      ga4_api_secret: config?.ga4_api_secret || "",
      active: config?.active ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const db = supabase as any;
      const { error } = await db
        .from("tracking_config")
        .update({
          pixel_id: data.pixel_id || null,
          capi_token: data.capi_token || null,
          test_event_code: data.test_event_code || null,
          ga4_measurement_id: data.ga4_measurement_id || null,
          ga4_api_secret: data.ga4_api_secret || null,
          active: data.active,
        })
        .eq("client_id", clientId);

      if (error) throw error;
      toast.success("Configuração salva com sucesso!");
      onSave();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const values = form.getValues();
      if (!values.pixel_id || !values.capi_token) {
        toast.error("Preencha o Pixel ID e o CAPI Token antes de testar.");
        return;
      }

      // Dispara um evento de teste via tracking-collect
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/tracking-collect/${clientId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          page_url: window.location.href,
          event_name: "PageView",
          utm_source: "tracking_test",
          utm_campaign: "configuracao",
        }),
      });
      const json = await res.json();
      setTestResult(json);
      if (json.capi?.success) {
        toast.success("Evento de teste enviado! Verifique no Meta Events Manager.");
      } else {
        toast.error("Erro no envio. Verifique o Pixel ID e CAPI Token.");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Meta CAPI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-blue-500 font-bold text-sm bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">META</span>
              Conversions API (CAPI)
            </CardTitle>
            <CardDescription>
              Configure o pixel e token para disparos server-side. O token deve ser de um System User no Meta Business Manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pixel_id">Pixel ID</Label>
              <Input
                id="pixel_id"
                placeholder="123456789012345"
                {...form.register("pixel_id")}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Meta Business Suite → Gerenciador de Eventos → Configurações
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capi_token">CAPI Access Token</Label>
              <div className="relative">
                <Input
                  id="capi_token"
                  type={showCapiToken ? "text" : "password"}
                  placeholder="EAAxxxxxxxx..."
                  {...form.register("capi_token")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowCapiToken(!showCapiToken)}
                >
                  {showCapiToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Crie em: Business Settings → System Users → Gerar Token. Não use token pessoal.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test_event_code">Test Event Code (opcional)</Label>
              <Input
                id="test_event_code"
                placeholder="TEST12345"
                {...form.register("test_event_code")}
              />
              <p className="text-xs text-muted-foreground">
                Use durante os testes. Remova em produção para não poluir os dados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GA4 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-orange-500 font-bold text-sm bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">GA4</span>
              Google Analytics 4 — Measurement Protocol
            </CardTitle>
            <CardDescription>
              Dispara Purchase e PageView server-side para o GA4, sem depender de cookies do browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ga4_measurement_id">Measurement ID</Label>
              <Input
                id="ga4_measurement_id"
                placeholder="G-XXXXXXXXXX"
                {...form.register("ga4_measurement_id")}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: GA4 → Admin → Streams de Dados → ID de Medição
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ga4_api_secret">API Secret</Label>
              <div className="relative">
                <Input
                  id="ga4_api_secret"
                  type={showGa4Secret ? "text" : "password"}
                  placeholder="xxxxxxxxxxxxxxxxxx"
                  {...form.register("ga4_api_secret")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowGa4Secret(!showGa4Secret)}
                >
                  {showGa4Secret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encontre em: GA4 → Admin → Streams de Dados → Measurement Protocol → Criar Secret
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Rastreamento ativo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quando desativado, webhooks são aceitos mas CAPI/GA4 não são disparados.
                </p>
              </div>
              <Switch
                checked={form.watch("active")}
                onCheckedChange={(v) => form.setValue("active", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Configuração"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testLoading}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {testLoading ? "Testando..." : "Enviar evento de teste"}
          </Button>
        </div>

        {/* Resultado do teste */}
        {testResult && (
          <div className={`rounded-lg border p-4 text-sm font-mono whitespace-pre-wrap ${
            testResult.capi?.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.capi?.success
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <AlertCircle className="h-4 w-4 text-red-600" />}
              <span className="font-semibold">
                {testResult.capi?.success ? "CAPI: Sucesso" : "CAPI: Erro"}
                {testResult.ga4?.success !== undefined && (` · GA4: ${testResult.ga4.success ? "Sucesso" : "Erro"}`)}
              </span>
            </div>
            {JSON.stringify(testResult, null, 2)}
          </div>
        )}
      </form>
    </div>
  );
}
