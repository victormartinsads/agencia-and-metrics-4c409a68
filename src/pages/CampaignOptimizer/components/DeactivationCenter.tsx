import React, { useState } from 'react';
import { CreativeData } from '../../../data/mockCampaigns';
import { CreativeDiagnostic } from '../../../utils/campaignRules';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Ban, PartyPopper, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useToast } from "@/hooks/use-toast";

interface DeactivationCenterProps {
  creatives: CreativeData[];
  diagnostics: CreativeDiagnostic[];
}

export function DeactivationCenter({ creatives, diagnostics }: DeactivationCenterProps) {
  const [disabledCreatives, setDisabledCreatives] = useState<Set<string>>(new Set());
  const [isDisabling, setIsDisabling] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Filter only dangerous diagnostics (bleeding cost)
  const dangerDiagnostics = diagnostics.filter(d => 
    d.level === 'danger' && !disabledCreatives.has(d.creativeId)
  );

  const handleDisable = async (id: string, name: string) => {
    setIsDisabling(prev => ({ ...prev, [id]: true }));
    
    // Simula uma chamada à API (Meta Graph API)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setDisabledCreatives(prev => new Set(prev).add(id));
    setIsDisabling(prev => ({ ...prev, [id]: false }));
    
    toast({
      title: "Anúncio Pausado",
      description: `"${name}" foi pausado com sucesso e o sangramento foi contido.`,
      variant: "default",
    });
  };

  if (dangerDiagnostics.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="py-16 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <PartyPopper className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">Inbox Zero!</h3>
          <p className="text-emerald-700 dark:text-emerald-400 max-w-sm">
            Nenhum criativo está sangrando caixa neste funil. Suas campanhas estão rodando dentro das metas estabelecidas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {dangerDiagnostics.map((diagnostic, idx) => {
        const creative = creatives.find(c => c.id === diagnostic.creativeId);
        if (!creative) return null;

        // Calculate progress bar logic
        const currentCost = diagnostic.currentCost || 0;
        const goalCost = diagnostic.goalCost || 1;
        const percentage = Math.min((currentCost / goalCost) * 100, 100);
        const isOverLimit = currentCost >= goalCost;

        return (
          <Card key={idx} className="border-destructive/20 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-background">
            <CardContent className="p-0">
              <div className="p-5 flex gap-4">
                {/* Thumbnail Section */}
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted border">
                  {creative.thumbnailUrl ? (
                    <img 
                      src={creative.thumbnailUrl} 
                      alt={creative.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <span className="text-xs text-muted-foreground">Sem imagem</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground line-clamp-2 leading-tight">
                      {creative.name}
                    </h4>
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  </div>
                  
                  <div className="mt-2 inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                    {diagnostic.ruleName}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{diagnostic.metricFailing} Atual</span>
                    <span className={cn("font-medium", isOverLimit ? "text-destructive" : "text-amber-600")}>
                      R$ {currentCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className={cn("h-2", isOverLimit ? "[&>div]:bg-destructive" : "[&>div]:bg-amber-500")}
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Meta: R$ {goalCost.toFixed(2)}</span>
                    <span>{percentage.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-sm bg-muted/30 p-2 rounded-lg border">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Compras / CPA</span>
                    <span className="font-semibold">
                      {creative.purchases} / {creative.purchases > 0 ? `R$ ${(creative.spent / creative.purchases).toFixed(2)}` : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Leads / CPL</span>
                    <span className="font-semibold">
                      {creative.leads} / {creative.leads > 0 ? `R$ ${(creative.spent / creative.leads).toFixed(2)}` : '-'}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-muted">
                  {diagnostic.message}
                </p>

                <Button 
                  variant="destructive" 
                  className="w-full shadow-sm font-semibold transition-all"
                  onClick={() => handleDisable(creative.id, creative.name)}
                  disabled={isDisabling[creative.id]}
                >
                  {isDisabling[creative.id] ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  {isDisabling[creative.id] ? "Pausando..." : "Desativar Imediatamente"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
