import { useState, useEffect } from "react";
import { Database, Check, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Campaign } from "@/data/mockMetaData";
import {
  FunnelMetricSource,
  useSaveFunnelMetricSource,
} from "@/hooks/useFunnelMetricSources";
import { toast } from "sonner";

interface Props {
  clientId: string;
  funnelCode: string;
  metricKey: "revenue" | "sales";
  current?: FunnelMetricSource | null;
  campaigns: Campaign[];
  sheetProducts?: string[];
}

const FIELD_BY_METRIC: Record<string, string> = {
  revenue: "revenue",
  sales: "sales",
};

export function MetricSourceMenu({ clientId, funnelCode, metricKey, current, campaigns, sheetProducts = [] }: Props) {
  const save = useSaveFunnelMetricSource();
  const [type, setType] = useState(current?.source_type || "auto");
  const [campaignId, setCampaignId] = useState(current?.meta_campaign_id || "");
  const [productCode, setProductCode] = useState(current?.sheet_product_code || "");

  useEffect(() => {
    setType(current?.source_type || "auto");
    setCampaignId(current?.meta_campaign_id || "");
    setProductCode(current?.sheet_product_code || "");
  }, [current?.source_type, current?.meta_campaign_id, current?.sheet_product_code]);

  const onSave = async () => {
    try {
      await save.mutateAsync({
        client_id: clientId,
        funnel_code: funnelCode,
        metric_key: metricKey,
        source_type: type,
        meta_campaign_id: type === "meta" ? campaignId || null : null,
        meta_action_type: metricKey === "revenue" ? "purchase" : "purchase",
        sheet_product_code: type === "sheet" ? productCode || null : null,
        sheet_field: type === "sheet" ? FIELD_BY_METRIC[metricKey] : null,
      });
      toast.success("Fonte salva");
    } catch {
      toast.error("Erro ao salvar fonte");
    }
  };

  const badge = current && current.source_type !== "auto";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`absolute top-2 right-2 p-1 rounded transition-colors ${
            badge ? "text-primary" : "text-muted-foreground/60 hover:text-primary"
          }`}
          title="Definir fonte de dados"
          onClick={(e) => e.stopPropagation()}
        >
          <Database className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fonte de {metricKey === "revenue" ? "Faturamento" : "Vendas"}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Escolha de onde o valor é puxado neste funil.</p>
        </div>
        <Select value={type} onValueChange={(v: any) => setType(v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (soma das campanhas)</SelectItem>
            <SelectItem value="meta">Meta — escolher campanha</SelectItem>
            <SelectItem value="sheet">Planilha — escolher produto</SelectItem>
          </SelectContent>
        </Select>

        {type === "meta" && (
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a campanha…" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {type === "sheet" && (
          sheetProducts.length > 0 ? (
            <Select value={productCode} onValueChange={setProductCode}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o produto…" /></SelectTrigger>
              <SelectContent>
                {sheetProducts.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[11px] text-muted-foreground/70">Nenhum produto encontrado na planilha vinculada.</p>
          )
        )}

        <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={onSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salvar fonte
        </Button>
      </PopoverContent>
    </Popover>
  );
}