import { motion } from "framer-motion";
import {
  Loader2,
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  TrendingUp,
  Link2,
  Sparkles,
  AlertTriangle,
  Award,
  ShieldAlert,
  Percent,
  Play,
  Pause
} from "lucide-react";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

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
  const avgCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;

  // Recommendations logic
  const recommendations = campaigns.map(c => {
    const cCpa = c.conversions > 0 ? c.cost / c.conversions : 0;
    const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cRoas = c.cost > 0 ? c.revenue / c.cost : 0;

    if (c.status === "ENABLED" && cCpa > cpa * 1.3 && c.conversions > 0) {
      return {
        campaignName: c.name,
        type: "cpa_alert",
        title: "CPA Crítico Detectado",
        description: `CPA de ${formatCurrency(cCpa, currencySymbol)} está 30% acima da média da conta. Recomendamos rever segmentações ou termos de pesquisa negativos.`,
        severity: "critical",
        icon: ShieldAlert
      };
    }
    if (c.status === "ENABLED" && cCtr < 1.2 && c.impressions > 100) {
      return {
        campaignName: c.name,
        type: "ctr_alert",
        title: "CTR Abaixo da Média",
        description: `Taxa de cliques (${cCtr.toFixed(2)}%) está baixa. Recomendamos realizar testes A/B de anúncios e extensões para melhorar a atratividade.`,
        severity: "warning",
        icon: AlertTriangle
      };
    }
    if (c.status === "ENABLED" && (cRoas > 3 || (c.conversions > 5 && cCpa < cpa * 0.7))) {
      return {
        campaignName: c.name,
        type: "scale_alert",
        title: "Oportunidade de Escalar",
        description: `Excelente eficiência! ROAS de ${cRoas.toFixed(1)}x e CPA de ${formatCurrency(cCpa, currencySymbol)}. Aumente o orçamento diário para obter mais conversões.`,
        severity: "success",
        icon: Award
      };
    }
    return null;
  }).filter(Boolean);

  const maxCampaignCost = Math.max(...campaigns.map(c => c.cost), 1);

  const chartData = campaigns.map(c => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name,
    "Investimento": c.cost,
    "Conversões": c.conversions
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Investimento" value={formatCurrency(totals.cost, currencySymbol)} icon={DollarSign} />
        <KpiCard title="Conversões" value={totals.conversions.toLocaleString("pt-BR")} icon={Target} />
        <KpiCard title="CPA Médio" value={formatCurrency(cpa, currencySymbol)} icon={DollarSign} />
        <KpiCard title="ROAS Geral" value={`${roas.toFixed(2)}x`} icon={TrendingUp} />
        <KpiCard title="CTR Geral" value={`${ctr.toFixed(2)}%`} icon={Percent} />
        <KpiCard title="CPC Médio" value={formatCurrency(avgCpc, currencySymbol)} icon={MousePointerClick} />
      </div>

      {/* IA Insights Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Oportunidades de Otimização
        </h4>
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.slice(0, 4).map((rec: any, idx) => (
              <Card key={idx} className={`p-4 border flex gap-3.5 transition-all hover:scale-[1.01] ${
                rec.severity === "critical" ? "border-destructive/20 bg-destructive/5" :
                rec.severity === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                "border-emerald-500/20 bg-emerald-500/5"
              }`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  rec.severity === "critical" ? "bg-destructive/10 text-destructive" :
                  rec.severity === "warning" ? "bg-amber-500/10 text-amber-500" :
                  "bg-emerald-500/10 text-emerald-500"
                }`}>
                  <rec.icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{rec.title}</span>
                    <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0 font-mono">
                      {rec.campaignName}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Campanhas Saudáveis</p>
              <p className="text-[11px] text-muted-foreground">Todas as campanhas estão operando dentro das métricas de eficiência esperadas.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Chart */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">Relação de Investimento vs. Conversões por Campanha</h4>
            <span className="text-[11px] text-muted-foreground">Distribuição de verba e conversões absolutas</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="Investimento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Conversões" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Campaigns List */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Análise Individual de Campanhas</h3>
          <span className="text-[11px] text-muted-foreground">
            ROAS médio: <span className="text-primary font-medium">{roas.toFixed(2)}x</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Campanha</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Investimento (%)</th>
                <th className="text-right px-4 py-3">Cliques / CPC</th>
                <th className="text-right px-4 py-3">CTR</th>
                <th className="text-right px-4 py-3">Conv.</th>
                <th className="text-right px-4 py-3">CPA</th>
                <th className="text-right px-4 py-3">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cCpa = c.conversions > 0 ? c.cost / c.conversions : 0;
                const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                const cRoas = c.cost > 0 ? c.revenue / c.cost : 0;
                const percentSpend = (c.cost / totals.cost) * 100;
                const isEnabled = c.status === "ENABLED" || c.status === "enabled";

                // Metrics warning colors
                const isCpaWarning = cCpa > cpa * 1.25;
                const isCtrWarning = cCtr < 1.2;

                return (
                  <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground truncate max-w-[200px]" title={c.name}>
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={`gap-1 ${
                        isEnabled 
                          ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" 
                          : "border-muted text-muted-foreground"
                      }`}>
                        {isEnabled ? <Play className="h-2 w-2 fill-emerald-500" /> : <Pause className="h-2 w-2" />}
                        {isEnabled ? "Ativa" : "Pausada"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-foreground">{formatCurrency(c.cost, currencySymbol)}</span>
                        <div className="w-20 bg-muted-foreground/10 h-1 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${percentSpend}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-foreground">{c.clicks.toLocaleString("pt-BR")}</span>
                        <span className="text-[10px] text-muted-foreground">CPC: {formatCurrency(c.avgCpc, currencySymbol)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={isCtrWarning ? "text-amber-500" : "text-emerald-500"}>
                        {cCtr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {c.conversions.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={isCpaWarning ? "text-destructive" : cCpa > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                        {cCpa > 0 ? formatCurrency(cCpa, currencySymbol) : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {cRoas > 0 ? `${cRoas.toFixed(2)}x` : "-"}
                    </td>
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