import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Webhook } from "lucide-react";
import { useWebhookTokens } from "@/hooks/useCrmAppLeads";
import { webhookService } from "@/lib/crm-app";
import { toast } from "sonner";

export function WebhookPanel({ orgId }: { orgId: string }) {
  const { data: tokens = [] } = useWebhookTokens(orgId);
  const t = tokens[0];
  const url = t ? webhookService.getWebhookUrl(t.token) : "";

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Webhook className="h-4 w-4" /> Webhook de entrada
      </h2>
      <p className="text-xs text-muted-foreground">
        Envie POST para esta URL para criar leads automaticamente. Body JSON: <code>name, email, phone, company, message, source, value, product, utm_*</code>
      </p>
      {url && (
        <div className="flex gap-2">
          <Input value={url} readOnly className="text-xs font-mono" />
          <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </Card>
  );
}