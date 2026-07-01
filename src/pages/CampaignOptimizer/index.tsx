import React, { useState, useMemo, useEffect } from 'react';
import { analyzeCreatives, analyzeAdSets } from '../../utils/campaignRules';
import { DeactivationCenter } from './components/DeactivationCenter';
import { ScalingAssistant } from './components/ScalingAssistant';
import { DashboardMetrics } from './components/DashboardMetrics';
import { FunnelSelector } from './components/FunnelSelector';
import { FunnelHealth } from './components/FunnelHealth';
import { CampaignHierarchyView } from './components/CampaignHierarchyView';
import { useClients } from '../../hooks/useClients';
import { useMetaAds } from '../../hooks/useMetaAds';
import { transformMetaToOptimizer } from '../../utils/transformMetaToOptimizer';
import { Loader2 } from 'lucide-react';

export default function CampaignOptimizer() {
  const { data: clients, isLoading: loadingClients } = useClients({ includeArchived: false });
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Set initial client
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo(() => 
    clients?.find(c => c.id === selectedClientId),
  [clients, selectedClientId]);

  // Fetch real meta data
  const { data: metaData, isLoading: loadingMeta, error: metaError } = useMetaAds(selectedClientId);

  // Transform Meta campaigns to our Optimizer structure
  const { funnels, adSets, creatives } = useMemo(() => {
    if (!selectedClientId || !metaData?.campaigns) {
      return { funnels: [], adSets: [], creatives: [] };
    }
    return transformMetaToOptimizer(selectedClientId, selectedClient, metaData.campaigns);
  }, [selectedClientId, selectedClient, metaData]);

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');

  // When client changes, reset funnel
  useEffect(() => {
    if (funnels.length > 0) {
      setSelectedFunnelId(funnels[0].id);
    } else {
      setSelectedFunnelId('');
    }
  }, [funnels]);

  // Derived state
  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  
  const funnelCreatives = useMemo(() => 
    creatives.filter(c => c.funnelId === selectedFunnelId),
  [selectedFunnelId, creatives]);

  const funnelAdSets = useMemo(() => 
    adSets.filter(a => a.funnelId === selectedFunnelId),
  [selectedFunnelId, adSets]);

  const { creativeDiagnostics, adSetDiagnostics } = useMemo(() => {
    if (!selectedFunnel) return { creativeDiagnostics: [], adSetDiagnostics: [] };
    return {
      creativeDiagnostics: analyzeCreatives(funnelCreatives, selectedFunnel),
      adSetDiagnostics: analyzeAdSets(funnelAdSets, selectedFunnel)
    };
  }, [funnelCreatives, funnelAdSets, selectedFunnel]);

  if (loadingClients || (selectedClientId && loadingMeta && funnels.length === 0)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados das campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 1. Header Fixo (Global Selectors) */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Otimizador de Campanhas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie a escala e os cortes baseado em CPA e Roas.</p>
          </div>
          
          <FunnelSelector 
            clients={clients || []}
            funnels={funnels}
            selectedClientId={selectedClientId}
            selectedFunnelId={selectedFunnelId}
            onClientChange={setSelectedClientId}
            onFunnelChange={setSelectedFunnelId}
          />
        </div>
      </div>

      {/* Error state */}
      {metaError && (
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md">
            Erro ao carregar dados da Meta: {(metaError as Error).message}
          </div>
        </div>
      )}

      {/* 2. Conteúdo Rolável */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
          
          {/* Métricas Globais do Funil */}
          <section>
            <DashboardMetrics 
              creatives={funnelCreatives} 
              diagnostics={creativeDiagnostics} 
              funnel={selectedFunnel} 
            />
          </section>

          {/* Saúde do Funil e Gargalos */}
          <section>
            <FunnelHealth creatives={funnelCreatives} />
          </section>

          {/* Escala e Testes de Públicos */}
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Ações Necessárias (Hoje)</h2>
              <p className="text-muted-foreground text-sm mt-1">Criativos que excederam limites e precisam ser desativados para conter sangramento.</p>
            </div>
            <DeactivationCenter 
              creatives={funnelCreatives} 
              diagnostics={creativeDiagnostics} 
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 4. Visão Hierárquica (Substitui Diagnóstico Estrutural) */}
            <section className="lg:col-span-2">
              <CampaignHierarchyView 
                adSets={funnelAdSets}
                creatives={funnelCreatives} 
                diagnostics={creativeDiagnostics} 
              />
            </section>

            {/* 5. Escala & Públicos (Spoke 3) */}
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Oportunidades de Escala</h2>
                <p className="text-muted-foreground text-sm mt-1">Aumentar orçamento em conjuntos (públicos) vencedores.</p>
              </div>
              <ScalingAssistant 
                adSets={funnelAdSets} 
                diagnostics={adSetDiagnostics} 
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
