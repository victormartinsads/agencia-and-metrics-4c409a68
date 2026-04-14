import { motion } from "framer-motion";
import type { ObjectiveGroup } from "@/hooks/useComoEstamos";

interface Props {
  groups: ObjectiveGroup[];
}

export function ObjectiveAnalysis({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-bold text-card-foreground">🎯 Análise por Objetivo</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.objective} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-card-foreground">{g.objective}</h4>
              <span className="text-xs text-muted-foreground">{g.campaigns.length} campanha(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Investimento</p>
                <p className="font-semibold">R$ {g.totalSpend.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultados</p>
                <p className="font-semibold">{g.totalResults}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPA Médio</p>
                <p className="font-semibold">R$ {g.avgCPA.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CTR Médio</p>
                <p className="font-semibold">{g.avgCTR.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
