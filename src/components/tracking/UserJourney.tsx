import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, ChevronDown, ChevronRight, Activity, ShoppingCart, UserPlus } from "lucide-react";

interface Lead {
  id: string;
  email: string;
  created_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
  country: string | null;
  os: string | null;
  browser: string | null;
}

export default function UserJourney({ clientId }: { clientId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [journeyData, setJourneyData] = useState<any[]>([]);
  const [loadingJourney, setLoadingJourney] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [clientId]);

  const fetchLeads = async (query = "") => {
    setLoading(true);
    try {
      const db = supabase as any;
      let q = db
        .from("tracking_leads")
        .select("id, email, created_at, utm_source, utm_campaign, country, os, browser")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (query) {
        q = q.ilike("email", `%${query}%`);
      }
      const { data } = await q;
      if (data) setLeads(data);
    } finally {
      setLoading(false);
    }
  };

  const loadJourney = async (email: string) => {
    setLoadingJourney(true);
    try {
      const db = supabase as any;
      // Fetch PageViews / Custom Events from CAPI log matching email
      const { data: events } = await db
        .from("capi_events_log")
        .select("event_name, created_at, platform")
        .eq("client_id", clientId)
        .eq("buyer_email_masked", email.split('@')[0] + "***@" + email.split('@')[1]); // aproximado
      
      // Fetch Purchases
      const { data: sales } = await db
        .from("sales_events")
        .select("status, product_name, gross_amount, currency, occurred_at")
        .eq("client_id", clientId)
        .eq("buyer_email", email);

      const timeline = [];
      
      if (events) {
        events.forEach((e: any) => timeline.push({
          type: "event", title: e.event_name, date: e.created_at, details: e.platform
        }));
      }
      
      if (sales) {
        sales.forEach((s: any) => timeline.push({
          type: "sale", title: `Compra: ${s.product_name || 'Produto'}`, date: s.occurred_at, details: `${s.currency} ${s.gross_amount} (${s.status})`
        }));
      }

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setJourneyData(timeline);
    } finally {
      setLoadingJourney(false);
    }
  };

  const handleExpand = (lead: Lead) => {
    if (expanded === lead.id) {
      setExpanded(null);
    } else {
      setExpanded(lead.id);
      loadJourney(lead.email);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Jornada / CRM Leads
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input 
            placeholder="Buscar por e-mail..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads(search)}
          />
          <Button onClick={() => fetchLeads(search)} disabled={loading}>
            <Search className="h-4 w-4 mr-2" /> Buscar
          </Button>
        </div>

        <div className="divide-y border rounded-lg overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum lead encontrado.</div>
          ) : leads.map(lead => (
            <div key={lead.id} className="flex flex-col">
              <div 
                className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => handleExpand(lead)}
              >
                <div className="flex items-center gap-3">
                  {expanded === lead.id ? <ChevronDown className="h-4 w-4 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                  <div>
                    <div className="font-medium">{lead.email}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                      <span>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                      {lead.country && <span>📍 {lead.country}</span>}
                      {lead.os && <span>💻 {lead.os}</span>}
                      {lead.utm_source && <span className="text-primary">UTM: {lead.utm_source}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {expanded === lead.id && (
                <div className="bg-muted/10 p-6 border-t">
                  <h4 className="text-sm font-semibold mb-4">Linha do Tempo</h4>
                  {loadingJourney ? (
                    <div className="text-sm text-muted-foreground">Carregando jornada...</div>
                  ) : journeyData.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sem eventos mapeados. O e-mail pode ser diferente no cookie.</div>
                  ) : (
                    <div className="relative border-l ml-2 pl-4 space-y-4">
                      {/* Evento de Cadastro (Lead) */}
                      <div className="relative">
                        <div className="absolute -left-[23px] bg-primary p-1 rounded-full border border-background">
                          <UserPlus className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="text-sm font-medium">Tornou-se Lead</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>

                      {journeyData.map((j, i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[23px] p-1 rounded-full border border-background ${j.type === 'sale' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                            {j.type === 'sale' ? <ShoppingCart className="h-3 w-3 text-white" /> : <Activity className="h-3 w-3 text-white" />}
                          </div>
                          <div className="text-sm font-medium">{j.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(j.date).toLocaleString("pt-BR")} — {j.details}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
