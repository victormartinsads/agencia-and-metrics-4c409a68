import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Radio, CheckCircle2, XCircle } from "lucide-react";

interface LogEntry {
  id: string;
  event_name: string;
  platform: string;
  status: string;
  buyer_email_masked: string | null;
  created_at: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  skipped: <Activity className="h-4 w-4 text-gray-400" />,
  deduplicated: <Activity className="h-4 w-4 text-blue-400" />,
};

export default function LiveEvents({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Buscar os últimos 20 iniciais
    const fetchInitial = async () => {
      const db = supabase as any;
      const { data } = await db
        .from("capi_events_log")
        .select("id, event_name, platform, status, buyer_email_masked, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setEvents(data);
    };

    fetchInitial();

    // Iniciar Realtime
    const channel = supabase
      .channel('live-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'capi_events_log', filter: `client_id=eq.${clientId}` },
        (payload) => {
          setEvents((prev) => [payload.new as LogEntry, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50/50 border-b border-blue-100 flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-blue-900">
          <Radio className="h-5 w-5 text-red-500 animate-pulse" />
          Eventos ao Vivo
        </CardTitle>
        <Badge variant="outline" className="bg-white">Aguardando eventos...</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 text-gray-300" />
              <p>Nenhum evento registrado ainda.</p>
              <p className="text-xs">Acesse sua Landing Page para ver os eventos aparecendo aqui em tempo real.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => (
                <div key={e.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="bg-background rounded-full p-2 border shadow-sm shrink-0">
                      {statusIcon[e.status] || <Activity className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{e.event_name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {e.platform === "meta_capi" ? "Meta CAPI" : e.platform}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {e.buyer_email_masked || "Visitante Anônimo"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
