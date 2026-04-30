import { useWebhookConfig } from "@/hooks/useCRM";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Webhook } from "lucide-react";
import { toast } from "sonner";

export function WebhookCard({ clientId }: { clientId: string }) {
  const { data } = useWebhookConfig(clientId);
  if (!data) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/crm-webhook?token=${data.webhook_token}`;
  const example = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"João","email":"j@x.com","phone":"+55...","value":1500,"tags":["lp"]}'`;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Webhook para automações</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Use esta URL em Zapier, n8n, formulários ou qualquer ferramenta que envie POST com JSON.
      </p>
      <div className="flex gap-2">
        <code className="flex-1 px-2 py-1.5 bg-secondary rounded text-[11px] truncate">{url}</code>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copiada"); }}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver exemplo (curl)</summary>
        <pre className="mt-2 p-2 bg-secondary rounded text-[10px] overflow-auto whitespace-pre">{example}</pre>
      </details>
    </Card>
  );
}