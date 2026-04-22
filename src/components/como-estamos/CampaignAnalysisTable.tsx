import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClassifiedCampaign, CampaignClassification } from "@/hooks/useComoEstamos";

const CLASSIFICATION_CONFIG: Record<CampaignClassification, { emoji: string; label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  escalar: { emoji: "🟢", label: "Escalar", variant: "default" },
  manter: { emoji: "🟡", label: "Manter", variant: "secondary" },
  revisar: { emoji: "🔴", label: "Revisar", variant: "destructive" },
  pausar: { emoji: "⚫", label: "Pausar", variant: "outline" },
};

interface Props {
  campaigns: ClassifiedCampaign[];
  currencySymbol?: string;
}

type SortKey = "name" | "spend" | "conversions" | "ctr" | "cpc" | "cpm" | "costPerConversion" | "roas" | "reach" | "frequency";

export function CampaignAnalysisTable({ campaigns, currencySymbol = "R$" }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = campaigns;
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (classFilter !== "all") result = result.filter(c => c.classification === classFilter);
    return result.sort((a, b) => {
      const av = a[sortKey] as number || 0;
      const bv = b[sortKey] as number || 0;
      return sortAsc ? av - bv : bv - av;
    });
  }, [campaigns, search, statusFilter, classFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(field)}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-bold text-card-foreground">📊 Análise Detalhada por Campanhas</h3>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar campanha..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="escalar">🟢 Escalar</SelectItem>
            <SelectItem value="manter">🟡 Manter</SelectItem>
            <SelectItem value="revisar">🔴 Revisar</SelectItem>
            <SelectItem value="pausar">⚫ Pausar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Campanha</TableHead>
                <TableHead>Class.</TableHead>
                <TableHead>Status</TableHead>
                <SortHeader label="Invest." field="spend" />
                <SortHeader label="Result." field="conversions" />
                <SortHeader label="CTR" field="ctr" />
                <SortHeader label="CPC" field="cpc" />
                <SortHeader label="CPM" field="cpm" />
                <SortHeader label="CPA" field="costPerConversion" />
                <SortHeader label="ROAS" field="roas" />
                <SortHeader label="Alcance" field="reach" />
                <SortHeader label="Freq." field="frequency" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const cls = CLASSIFICATION_CONFIG[c.classification];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={cls.variant} className="text-xs whitespace-nowrap">
                        {cls.emoji} {cls.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${c.status === "active" ? "text-green-400" : c.status === "paused" ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : "Concluída"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{currencySymbol} {c.spend.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{c.conversions}</TableCell>
                    <TableCell className="text-sm">{c.ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-sm">{currencySymbol} {c.cpc.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{currencySymbol} {(c.cpm || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{currencySymbol} {c.costPerConversion.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{c.roas.toFixed(2)}x</TableCell>
                    <TableCell className="text-sm">{c.reach.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{c.frequency.toFixed(1)}x</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Nenhuma campanha encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}
