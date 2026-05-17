import { motion } from "framer-motion";
import { Loader2, DollarSign, MousePointerClick, Eye, Target, TrendingUp, Link2 } from "lucide-react";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";

interface Props {
  clientId?: string;
  datePreset?: string;
  currencySymbol?: string;
}

export function GoogleAdsPanel({ clientId, datePreset = "last_7d", currencySymbol = "R$" }: Props) {
  const { data, isLoading, error } = useGoogleAds(clientId, datePreset);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando Google Ads…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <p className="text-sm text-destructive">Erro ao carregar dados do Google Ads.</p>
      </Card>
    );
  }

  if (data?.notConfigured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Google Ads ainda não configurado globalmente. Adicione o <code>GOOGLE_ADS_DEVELOPER_TOKEN</code> nas configurações da plataforma.
        </p>
      </Card>
    );
  }

  if (data?.needsCustomerId) {
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          Este cliente ainda não possui um <strong>Customer ID</strong> do Google Ads cadastrado.
        </p>
        {clientId && (
          <Link to={`/clients/${clientId}/settings`} className="text-primary text-sm underline">
            Cadastrar Customer ID
          </Link>
        )}
      </Card>
    );
  }

  if (data?.notConnected) {
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Conta Google ainda não conectada para este cliente.
        </p>
        {clientId && (
          <Link to={`/clients/${clientId}/settings`} className="text-primary text-sm underline">
            Conectar Google
          </Link>
        )}
      </Card>
    );
  }

  const totals = data?.totals;
  const campaigns = data?.campaigns || [];

  if (!totals || campaigns.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada no período.</p>
      </Card>
    );
  }

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
  const roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Investimento" value={formatCurrency(totals.cost, currencySymbol)} icon={DollarSign} />
        <KpiCard title="Impressões" value={totals.impressions.toLocaleString("pt-BR")} icon={Eye} />
        <KpiCard title="Cliques" value={totals.clicks.toLocaleString("pt-BR")} icon={MousePointerClick} />
        <KpiCard title="CTR" value={`${ctr.toFixed(2)}%`} icon={TrendingUp} />
        <KpiCard title="Conversões" value={totals.conversions.toLocaleString("pt-BR")} icon={Target} />
        <KpiCard title="CPA" value={formatCurrency(cpa, currencySymbol)} icon={DollarSign} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Campanhas Google Ads</h3>
          <span className="text-[11px] text-muted-foreground">
            ROAS médio: <span className="text-primary font-medium">{roas.toFixed(2)}x</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Campanha</th>
                <th className="text-right px-4 py-2">Investimento</th>
                <th className="text-right px-4 py-2">Impr.</th>
                <th className="text-right px-4 py-2">Cliques</th>
                <th className="text-right px-4 py-2">CTR</th>
                <th className="text-right px-4 py-2">Conv.</th>
                <th className="text-right px-4 py-2">CPA</th>
                <th className="text-right px-4 py-2">Receita</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cCpa = c.conversions > 0 ? c.cost / c.conversions : 0;
                const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                return (
                  <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2 truncate max-w-[260px]">{c.name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(c.cost, currencySymbol)}</td>
                    <td className="px-4 py-2 text-right">{c.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right">{c.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right">{cCtr.toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right">{c.conversions.toFixed(0)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(cCpa, currencySymbol)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(c.revenue, currencySymbol)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}