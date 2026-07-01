import React, { useState } from 'react';
import { AdSetData } from '../../../data/mockCampaigns';
import { AdSetDiagnostic } from '../../../utils/campaignRules';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Copy, ArrowUpRight, Rocket, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ScalingAssistantProps {
  adSets: AdSetData[];
  diagnostics: AdSetDiagnostic[];
}

export function ScalingAssistant({ adSets, diagnostics }: ScalingAssistantProps) {
  const [isScaling, setIsScaling] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleScale = async (id: string, name: string) => {
    setIsScaling(prev => ({ ...prev, [id]: true }));
    
    // Simula uma chamada à API (Meta Graph API) para aumentar a verba
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsScaling(prev => ({ ...prev, [id]: false }));
    
    toast({
      title: "Verba Aumentada",
      description: `Verba de "${name}" foi aumentada em 20% com sucesso.`,
      variant: "default",
    });
  };

  const scaleReadyDiagnostics = diagnostics.filter(d => d.level === 'success' && d.ruleName === 'Oportunidade de Escala');

  if (scaleReadyDiagnostics.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-card/50 h-full">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center h-full">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-sm text-muted-foreground px-4">
            Nenhum público atingiu os critérios de escala alta (CPA abaixo da meta) ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {scaleReadyDiagnostics.map((diagnostic, idx) => {
        const adSet = adSets.find(a => a.id === diagnostic.adSetId);
        if (!adSet) return null;

        return (
          <Card key={idx} className="border-emerald-200/50 dark:border-emerald-900/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-background to-emerald-50/30 dark:to-emerald-950/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Rocket className="h-24 w-24 text-emerald-500 -mr-8 -mt-8" />
            </div>
            <CardContent className="p-5 relative z-10">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground line-clamp-2 pr-4">{adSet.name}</h4>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm">
                    🚀 Público Quente
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {diagnostic.message}
                  </p>
                </div>
                
                <div className="bg-background/80 rounded-lg p-3 grid grid-cols-2 gap-2 border shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Verba Diária Atual</span>
                    <span className="font-mono text-sm font-semibold">R$ {adSet.budget.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Vendas</span>
                    <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{adSet.purchases}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all" 
                    size="sm"
                    onClick={() => handleScale(adSet.id, adSet.name)}
                    disabled={isScaling[adSet.id]}
                  >
                    {isScaling[adSet.id] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                    )}
                    {isScaling[adSet.id] ? "Aumentando Verba..." : "Aumentar Verba (+20%)"}
                  </Button>
                  <Button variant="outline" className="w-full shadow-sm" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar Público (Lookalike)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
