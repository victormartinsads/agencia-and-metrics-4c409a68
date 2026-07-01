import React, { useState } from 'react';
import { AdSetData, CreativeData } from '../../../data/mockCampaigns';
import { CreativeDiagnostic } from '../../../utils/campaignRules';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Pause, Play, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface CampaignHierarchyViewProps {
  adSets: AdSetData[];
  creatives: CreativeData[];
  diagnostics: CreativeDiagnostic[];
}

export function CampaignHierarchyView({ adSets, creatives, diagnostics }: CampaignHierarchyViewProps) {
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set(adSets.map(a => a.id)));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isActing, setIsActing] = useState<Record<string, 'pausing' | 'scaling' | null>>({});
  const { toast } = useToast();

  const handleInlinePause = async (id: string, name: string) => {
    setIsActing(prev => ({ ...prev, [id]: 'pausing' }));
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    setIsActing(prev => ({ ...prev, [id]: null }));
    toast({ title: "Pausado", description: `"${name}" foi pausado.` });
  };

  const handleInlineScale = async (id: string, name: string) => {
    setIsActing(prev => ({ ...prev, [id]: 'scaling' }));
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    setIsActing(prev => ({ ...prev, [id]: null }));
    toast({ title: "Verba Aumentada", description: `Orçamento de "${name}" aumentado em 20%.` });
  };

  const toggleAdSet = (id: string) => {
    const newSet = new Set(expandedAdSets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAdSets(newSet);
  };

  const toggleSelection = (id: string, isAdSet: boolean) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
      // Se desmarcou um AdSet, desmarcar filhos opcionalmente? Vamos manter simples.
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleAllSelection = (id: string, creativeIds: string[]) => {
    const newSet = new Set(selectedItems);
    const allSelected = creativeIds.every(cid => newSet.has(cid)) && newSet.has(id);
    
    if (allSelected) {
      newSet.delete(id);
      creativeIds.forEach(cid => newSet.delete(cid));
    } else {
      newSet.add(id);
      creativeIds.forEach(cid => newSet.add(cid));
    }
    setSelectedItems(newSet);
  };

  const handleBulkAction = (action: string) => {
    alert(`Ação em massa '${action}' aplicada a ${selectedItems.size} itens! (Simulação)`);
    setSelectedItems(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Floating Action Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="font-semibold text-sm mr-4">{selectedItems.size} selecionados</span>
          <Button size="sm" variant="secondary" onClick={() => handleBulkAction('Pausar')} className="gap-2">
            <Pause className="h-4 w-4" /> Pausar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleBulkAction('Ativar')} className="gap-2">
            <Play className="h-4 w-4" /> Ativar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleBulkAction('Aumentar Orçamento')} className="gap-2">
            <DollarSign className="h-4 w-4" /> + Orçamento
          </Button>
        </div>
      )}

      <Card className="border-none shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <CardTitle className="text-lg font-bold">Estrutura e Métricas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">CPA (Compras)</TableHead>
                <TableHead className="text-right">CPL (Leads)</TableHead>
                <TableHead>Diagnóstico & Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adSets.map(adSet => {
                const adSetCreatives = creatives.filter(c => c.adSetId === adSet.id);
                const isExpanded = expandedAdSets.has(adSet.id);
                
                // Calculando CPA e CPL do AdSet
                const cpa = adSet.purchases > 0 ? (adSet.spent / adSet.purchases).toFixed(2) : '-';
                const cpl = adSet.leads > 0 ? (adSet.spent / adSet.leads).toFixed(2) : '-';
                
                const isAllSelected = selectedItems.has(adSet.id) && adSetCreatives.every(c => selectedItems.has(c.id));
                const isPartiallySelected = !isAllSelected && (selectedItems.has(adSet.id) || adSetCreatives.some(c => selectedItems.has(c.id)));

                return (
                  <React.Fragment key={adSet.id}>
                    {/* Linha do Conjunto de Anúncios */}
                    <TableRow className="bg-muted/10 hover:bg-muted/20 border-b-2 group">
                      <TableCell className="p-2 pl-4">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={isAllSelected ? true : (isPartiallySelected ? "indeterminate" : false)}
                            onCheckedChange={() => toggleAllSelection(adSet.id, adSetCreatives.map(c => c.id))}
                          />
                          <button onClick={() => toggleAdSet(adSet.id)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold">AdSet</span>
                          {adSet.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={adSet.status === 'active' ? 'default' : 'secondary'} className="capitalize">{adSet.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">R$ {adSet.spent.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div>{cpa !== '-' ? `R$ ${cpa}` : '-'}</div>
                        <div className="text-xs text-muted-foreground">{adSet.purchases} compras</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{cpl !== '-' ? `R$ ${cpl}` : '-'}</div>
                        <div className="text-xs text-muted-foreground">{adSet.leads} leads</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2 text-xs" 
                            onClick={() => handleInlinePause(adSet.id, adSet.name)}
                            disabled={isActing[adSet.id] === 'pausing'}
                          >
                            {isActing[adSet.id] === 'pausing' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                            Pausar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700" 
                            onClick={() => handleInlineScale(adSet.id, adSet.name)}
                            disabled={isActing[adSet.id] === 'scaling'}
                          >
                            {isActing[adSet.id] === 'scaling' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                            Escalar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Linhas dos Criativos (Anúncios) */}
                    {isExpanded && adSetCreatives.map(creative => {
                      const c_cpa = creative.purchases > 0 ? (creative.spent / creative.purchases).toFixed(2) : '-';
                      const c_cpl = creative.leads > 0 ? (creative.spent / creative.leads).toFixed(2) : '-';
                      
                      // Buscar diagnósticos críticos
                      const creativeDiags = diagnostics.filter(d => d.creativeId === creative.id);
                      const worstDiag = creativeDiags.sort((a,b) => (a.level === 'danger' ? -1 : 1))[0];

                      return (
                        <TableRow key={creative.id} className={cn("hover:bg-muted/5 group", creative.frequencyWeekly > 3 ? "bg-red-50/30 dark:bg-red-950/10" : "")}>
                          <TableCell className="pl-12 py-2">
                            <Checkbox 
                              checked={selectedItems.has(creative.id)}
                              onCheckedChange={() => toggleSelection(creative.id, false)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-3 pl-4">
                              <div className="h-10 w-10 bg-muted rounded border overflow-hidden flex-shrink-0 relative">
                                {creative.frequencyWeekly > 3 && (
                                  <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center backdrop-blur-[1px]" title="Fadiga Visual Detectada">
                                    <AlertCircle className="h-5 w-5 text-destructive drop-shadow-md" />
                                  </div>
                                )}
                                {creative.thumbnailUrl ? (
                                  <img src={creative.thumbnailUrl} className="w-full h-full object-cover" alt="thumb" />
                                ) : (
                                  <div className="w-full h-full bg-secondary" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium line-clamp-1">{creative.name}</span>
                                <span className="text-[10px] text-muted-foreground">ID: {creative.id}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={creative.status === 'active' ? 'outline' : 'secondary'} className="capitalize">{creative.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">R$ {creative.spent.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div>{c_cpa !== '-' ? `R$ ${c_cpa}` : '-'}</div>
                            <div className="text-xs text-muted-foreground">{creative.purchases} compras</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>{c_cpl !== '-' ? `R$ ${c_cpl}` : '-'}</div>
                            <div className="text-xs text-muted-foreground">{creative.leads} leads</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {worstDiag && (
                                  <div title={worstDiag.message}>
                                    {worstDiag.level === 'danger' ? (
                                      <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                                        <AlertCircle className="h-3 w-3" /> {worstDiag.ruleName}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400">
                                        {worstDiag.ruleName}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {creative.frequencyWeekly > 3 && (
                                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" title={`Frequência: ${creative.frequencyWeekly.toFixed(1)}x`}>
                                    Fadiga Visual
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 px-2 text-xs" 
                                  onClick={() => handleInlinePause(creative.id, creative.name)}
                                  disabled={isActing[creative.id] === 'pausing'}
                                >
                                  {isActing[creative.id] === 'pausing' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                                  Pausar
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
