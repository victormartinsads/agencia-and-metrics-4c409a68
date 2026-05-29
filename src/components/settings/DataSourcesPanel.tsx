import { Megaphone, Search, Globe, Instagram, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Client } from "@/hooks/useClients";

interface Props { client: Client }

function StatusDot({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-primary" />
    : <Circle className="h-4 w-4 text-muted-foreground/60" />;
}

function IntegrationCard({
  icon: Icon, title, status, description,
}: { icon: any; title: string; status: boolean; description: string }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusDot ok={status} />
              <span className="text-xs text-muted-foreground">{status ? "Conectado" : "Não configurado"}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

export function DataSourcesPanel({ client }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Integrações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={Megaphone} title="Meta Ads"
            status={!!client.meta_access_token && (client.ad_account_ids?.length || 0) > 0}
            description={`${client.ad_account_ids?.length || 0} conta(s) vinculada(s).`}
          />
          <IntegrationCard
            icon={Search} title="Google Ads"
            status={!!(client as any).google_ads_customer_id}
            description={(client as any).google_ads_customer_id ? `Customer ID: ${(client as any).google_ads_customer_id}` : "Adicione o Customer ID na aba Google."}
          />
          <IntegrationCard
            icon={Globe} title="Google Analytics 4"
            status={!!(client as any).ga_property_id}
            description={(client as any).ga_property_id ? `Property: ${(client as any).ga_property_id}` : "Adicione o Property ID na aba Google."}
          />
          <IntegrationCard
            icon={Instagram} title="Instagram"
            status={!!client.meta_access_token}
            description="Insights orgânicos vêm com o mesmo token do Meta Ads."
          />
        </div>
      </div>
    </div>
  );
}