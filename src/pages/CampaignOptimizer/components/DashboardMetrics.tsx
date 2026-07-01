import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreativeData, Funnel } from '../../../data/mockCampaigns';
import { CreativeDiagnostic } from '../../../utils/campaignRules';
import { DollarSign, ShoppingCart, Users, Target } from 'lucide-react';

interface DashboardMetricsProps {
  creatives: CreativeData[];
  diagnostics?: CreativeDiagnostic[];
  funnel?: Funnel;
}

export function DashboardMetrics({ creatives }: DashboardMetricsProps) {
  const totalSpent = creatives.reduce((acc, curr) => acc + curr.spent, 0);
  const totalSales = creatives.reduce((acc, curr) => acc + curr.purchases, 0);
  const totalLeads = creatives.reduce((acc, curr) => acc + curr.leads, 0);
  
  const avgCPA = totalSales > 0 ? (totalSpent / totalSales) : 0;
  const avgCPL = totalLeads > 0 ? (totalSpent / totalLeads) : 0;

  const metrics = [
    {
      title: "Investimento",
      value: `R$ ${totalSpent.toFixed(2)}`,
      description: `Em ${creatives.length} criativos ativos`,
      icon: DollarSign,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10"
    },
    {
      title: "Vendas Geradas",
      value: totalSales.toString(),
      description: "Compras confirmadas",
      icon: ShoppingCart,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10"
    },
    {
      title: "CPA Médio",
      value: `R$ ${avgCPA.toFixed(2)}`,
      description: "Custo por Aquisição",
      icon: Target,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10"
    },
    {
      title: "Leads Capturados",
      value: totalLeads.toString(),
      description: `CPL Médio: R$ ${avgCPL.toFixed(2)}`,
      icon: Users,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="border-none shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground tracking-tight">
                {metric.title}
              </p>
              <div className={`p-2 rounded-full ${metric.bgClass}`}>
                <metric.icon className={`h-4 w-4 ${metric.colorClass}`} />
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{metric.value}</span>
              <p className="text-xs font-medium text-muted-foreground/80">
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
