import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Webhook, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface InboundWebhook {
  id: string;
  platform: string;
  status: string;
  error_details: string | null;
  raw_payload: any;
  created_at: string;
}

export default function InboundWebhooksTab({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<InboundWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      const { data } = await db
        .from("inbound_webhooks_log")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhooks Inbound (JSON Bruto)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Veja exatamente o que a Hotmart/Kiwify enviou, antes de qualquer processamento. Útil para debug.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum webhook recebido ainda.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex flex-col border-b last:border-0">
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3">
                    {expanded === log.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {log.platform}
                        </Badge>
                        <span className="text-sm font-medium">Webhook Recebido</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Badge variant={log.status === "error" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </div>
                </div>

                {expanded === log.id && (
                  <div className="bg-gray-950 p-4 border-t overflow-x-auto text-gray-100 text-xs font-mono">
                    {log.error_details && (
                      <div className="mb-3 text-red-400 bg-red-950/50 p-2 rounded border border-red-900">
                        <strong>Erro:</strong> {log.error_details}
                      </div>
                    )}
                    <pre>{JSON.stringify(log.raw_payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
