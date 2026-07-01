import React from 'react';
import { CreativeData } from '../../../data/mockCampaigns';
import { CreativeDiagnostic } from '../../../utils/campaignRules';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DiagnosticCenterProps {
  creatives: CreativeData[];
  diagnostics: CreativeDiagnostic[];
}

export function DiagnosticCenter({ creatives, diagnostics }: DiagnosticCenterProps) {
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'danger': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'danger': return <Badge variant="destructive" className="shadow-sm">Crítico</Badge>;
      case 'warning': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Atenção</Badge>;
      case 'success': return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Excelente</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  // Filtrar diagnósticos para a tabela geral (exclui sucesso de escala para evitar duplicação)
  const tableDiagnostics = diagnostics.filter(d => d.ruleName !== 'Pronto para Escala');

  if (tableDiagnostics.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhum diagnóstico estrutural no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[35%]">Criativo</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[20%]">Diagnóstico</TableHead>
                <TableHead className="w-[30%]">Sugestão de Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableDiagnostics.map((diagnostic, idx) => {
                const creative = creatives.find(c => c.id === diagnostic.creativeId);
                return (
                  <TableRow key={`${diagnostic.creativeId}-${idx}`} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded bg-muted border overflow-hidden">
                          {creative?.thumbnailUrl ? (
                            <img src={creative.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-secondary" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="line-clamp-2 text-sm leading-tight" title={creative?.name}>{creative?.name}</span>
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded-sm w-fit">ID: {creative?.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      {getLevelBadge(diagnostic.level)}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">{getLevelIcon(diagnostic.level)}</div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-foreground">{diagnostic.ruleName}</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{diagnostic.message}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {diagnostic.suggestion}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
