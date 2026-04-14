import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdSetPerformance } from "@/hooks/useComoEstamos";

interface Props {
  adSets: AdSetPerformance[];
}

export function WinningAdSets({ adSets }: Props) {
  if (adSets.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
        🏆 Conjuntos Vencedores
      </h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Conjunto</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Investimento</TableHead>
              <TableHead>Resultados</TableHead>
              <TableHead>CPA</TableHead>
              <TableHead>CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adSets.map((a, i) => (
              <TableRow key={a.name + i}>
                <TableCell>
                  {i === 0 && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Trophy className="h-3 w-3 mr-1" />1º</Badge>}
                  {i === 1 && <Badge variant="secondary">2º</Badge>}
                  {i === 2 && <Badge variant="outline">3º</Badge>}
                  {i > 2 && <span className="text-xs text-muted-foreground">{i + 1}º</span>}
                </TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{a.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{a.campaignName}</TableCell>
                <TableCell className="text-sm">R$ {a.spend.toFixed(2)}</TableCell>
                <TableCell className="text-sm">{a.conversions}</TableCell>
                <TableCell className="text-sm">R$ {a.cpa.toFixed(2)}</TableCell>
                <TableCell className="text-sm">{a.ctr.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
