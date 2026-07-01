import React, { useState, useMemo, useEffect } from 'react';
import { mockClients, mockFunnels, mockCreatives, mockAdSets } from '../../data/mockCampaigns';
import { analyzeCreatives, analyzeAdSets } from '../../utils/campaignRules';
import { DeactivationCenter } from './components/DeactivationCenter';
import { DiagnosticCenter } from './components/DiagnosticCenter';
import { ScalingAssistant } from './components/ScalingAssistant';
import { DashboardMetrics } from './components/DashboardMetrics';
import { FunnelSelector } from './components/FunnelSelector';
import { FunnelHealth } from './components/FunnelHealth';
import { CampaignHierarchyView } from './components/CampaignHierarchyView';

export default function CampaignOptimizer() {
  const [selectedClientId, setSelectedClientId] = useState(mockClients[0].id);
  
  // Get funnels for selected client
  const clientFunnels = mockFunnels.filter(f => f.clientId === selectedClientId);
  const [selectedFunnelId, setSelectedFunnelId] = useState(clientFunnels[0]?.id);

  // When client changes, reset funnel
  useEffect(() => {
    const newFunnels = mockFunnels.filter(f => f.clientId === selectedClientId);
    if (newFunnels.length > 0) {
      setSelectedFunnelId(newFunnels[0].id);
    }
  }, [selectedClientId]);

  // Derived state
  const selectedFunnel = mockFunnels.find(f => f.id === selectedFunnelId);
  
  const funnelCreatives = useMemo(() => 
    mockCreatives.filter(c => c.funnelId === selectedFunnelId),
  [selectedFunnelId]);

  const funnelAdSets = useMemo(() => 
    mockAdSets.filter(a => a.funnelId === selectedFunnelId),
  [selectedFunnelId]);

  const { creativeDiagnostics, adSetDiagnostics } = useMemo(() => {
    if (!selectedFunnel) return { creativeDiagnostics: [], adSetDiagnostics: [] };
    return {
      creativeDiagnostics: analyzeCreatives(funnelCreatives, selectedFunnel),
      adSetDiagnostics: analyzeAdSets(funnelAdSets, selectedFunnel)
    };
  }, [funnelCreatives, funnelAdSets, selectedFunnel]);

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
            clients={mockClients}
            funnels={mockFunnels}
            selectedClientId={selectedClientId}
            selectedFunnelId={selectedFunnelId}
            onClientChange={setSelectedClientId}
            onFunnelChange={setSelectedFunnelId}
          />
        </div>
      </div>

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
