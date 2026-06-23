import { useCrmOverviewData, CrmUtmRow } from "@/hooks/useCrmOverviewData";
import { formatCurrency } from "@/lib/format";
import { Database, TrendingUp, Users } from "lucide-react";

interface Props {
  clientId?: string;
  datePreset?: string;
  currencySymbol?: string;
}

export function CrmUtmPerformanceBlock({ clientId, datePreset, currencySymbol = "R$" }: Props) {
  const { data, isLoading, error } = useCrmOverviewData(clientId, datePreset);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Carregando UTMs do CRM...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-destructive">
        Erro ao carregar dados do CRM.
      </div>
    );
  }

  const utms = data?.utms || [];

  if (utms.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
        <Database className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground font-medium">Sem dados de UTM</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Nenhum lead com UTM registrado no período.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-black/40 backdrop-blur-md z-10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <th className="px-4 py-3">Origem / Campanha</th>
            <th className="px-4 py-3 text-right">MQLs</th>
            <th className="px-4 py-3 text-right">Vendas</th>
            <th className="px-4 py-3 text-right">Faturamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {utms.map((row: CrmUtmRow, i: number) => {
            const hasRevenue = row.revenue > 0;
            return (
              <tr key={i} className="hover:bg-white/5 transition-colors group">
                <td className="px-4 py-3 max-w-[180px] truncate">
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {row.campaign !== "Desconhecida" ? row.campaign : row.source}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {row.source} / {row.medium}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.mqls}
                    <Users className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.sales}
                    {row.sales > 0 && <TrendingUp className="h-3 w-3 text-emerald-500/70" />}
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${hasRevenue ? "text-primary" : "text-muted-foreground"}`}>
                  {hasRevenue ? formatCurrency(row.revenue, currencySymbol) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
