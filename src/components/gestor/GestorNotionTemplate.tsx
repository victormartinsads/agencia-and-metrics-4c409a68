import { useState, useEffect } from "react";
import { useGestorNotionData, useSaveGestorNotionData } from "@/hooks/useGestorDiary";
import { ChevronRight, ChevronDown, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper components for Notion-like UI
const ToggleSection = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left font-bold text-sm text-foreground hover:bg-muted/50 p-1.5 rounded transition-colors"
      >
        <span className="text-muted-foreground w-4 flex justify-center">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        {title}
      </button>
      {open && (
        <div className="pl-6 pt-1 pb-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default function GestorNotionTemplate({ gestorId, canManage }: { gestorId: string, canManage: boolean }) {
  const { data: notionData, isLoading } = useGestorNotionData(gestorId);
  const saveNotionData = useSaveGestorNotionData();
  const [localState, setLocalState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (notionData) {
      setLocalState(notionData);
    }
  }, [notionData]);

  const toggleCheckbox = (key: string) => {
    // If not admin/gestor owner, they can still view, but shouldn't toggle?
    // Actually, canManage = admin/ceo/gerente. The gestor themselves might not have canManage=true, but they CAN manage their own.
    // We assume if this component is rendered, they have write access.
    const newState = { ...localState, [key]: !localState[key] };
    setLocalState(newState);
    saveNotionData.mutate({ gestor_id: gestorId, data: newState });
  };

  const CheckboxItem = ({ id, label, bold = false, color = "default" }: { id: string, label: string, bold?: boolean, color?: "default" | "red" }) => {
    const isChecked = !!localState[id];
    return (
      <div 
        className={cn(
          "flex items-start gap-2.5 py-1 px-1.5 hover:bg-muted/30 rounded cursor-pointer transition-colors",
          isChecked && "opacity-70"
        )}
        onClick={() => toggleCheckbox(id)}
      >
        <button className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {isChecked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
        </button>
        <span className={cn(
          "text-[13px] leading-snug",
          isChecked && "line-through text-muted-foreground",
          bold && "font-bold",
          color === "red" && "text-red-500",
          !isChecked && color !== "red" && "text-foreground"
        )}>
          {label}
        </span>
      </div>
    );
  };

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando template...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
      
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        
        <ToggleSection title="O QUE FOI VENDIDO NOS PROJETOS?">
          <CheckboxItem id="vendido_1" label="O que foi vendido na semana?" />
          <CheckboxItem id="vendido_2" label="Qual o principal produto / serviço que traz mais resultado" />
          <CheckboxItem id="vendido_3" label="Como conseguimos aumentar o volume?" />
          <CheckboxItem id="vendido_4" label="Como conseguimos aumentar o CAC?" />
          <CheckboxItem id="vendido_5" label="Como conseguimos aumentar o LTV?" />
        </ToggleSection>

        <ToggleSection title="ESTRUTURAS">
          <CheckboxItem id="estruturas_1" label="Quais são as novas estruturas que vamos testar e em qual projeto?" />
        </ToggleSection>

        <ToggleSection title="ROTINA DIÁRIA E SEMANAL" defaultOpen={true}>
          <CheckboxItem id="rotina_1" label="Campanha nova?" />
          <CheckboxItem id="rotina_2" label="Criativos novos?" />
          <CheckboxItem id="rotina_3" label="Públicos novos?" />
          <CheckboxItem id="rotina_4" label="Copys novas?" />
          <CheckboxItem id="rotina_5" label="Analise de Metricas (Primaria, Secundaria, Terciaria)" />
          <CheckboxItem id="rotina_6" label="Reunião de Alinhamento com o Cliente" />
        </ToggleSection>

        <ToggleSection title="ESTUDO PARA OS PROJETOS">
          <CheckboxItem id="estudo_1" label="Estudo e documentação" />
        </ToggleSection>

        <ToggleSection title="ANALISE DAS METRICAS PRIMARIAS">
          <CheckboxItem id="metricas_primarias" label="Analisar conversões, compras, leads" />
        </ToggleSection>

        <ToggleSection title="ANALISE DAS METRICAS SECUNDARIAS">
          <CheckboxItem id="metricas_secundarias" label="Analisar CTR, CPC, CPA, CPM" />
        </ToggleSection>

        <ToggleSection title="Melhoria de CTR / Criativos e Públicos">
          <CheckboxItem id="melhoria_ctr" label="Testes de CTR e melhorias" />
        </ToggleSection>

        <ToggleSection title="Melhoria do Custo por Aquisição">
          <CheckboxItem id="melhoria_cpa" label="Ações para reduzir CPA" />
        </ToggleSection>

      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        
        <div className="space-y-1">
          <CheckboxItem id="funil_ativo" label="FUNIL SEMPRE ATIVO" bold color="red" />
          <div className="pl-6">
            <CheckboxItem id="funil_ativo_1" label="Verificar campanhas se estão rodando" />
            <CheckboxItem id="funil_ativo_2" label="Análise de orçamento gasto no dia" />
          </div>
        </div>

        <div className="space-y-1">
          <CheckboxItem id="oferta_criativo" label="OFERTA / CRIATIVO" bold color="red" />
          <div className="pl-6">
            <CheckboxItem id="oferta_criativo_1" label="Revisar copys e CTAs" />
            <CheckboxItem id="oferta_criativo_2" label="Feedback de criativos da semana" />
          </div>
        </div>

        <div className="space-y-1">
          <CheckboxItem id="esteira_produtos" label="ESTEIRA DE PRODUTOS E FUNIL" bold color="red" />
          <div className="pl-6">
            <CheckboxItem id="esteira_produtos_1" label="Mapear upsell e downsell" />
          </div>
        </div>

        <div className="space-y-1">
          <CheckboxItem id="dados_rastreamento" label="DADOS DE RASTREAMENTO E PAGINA" bold color="red" />
          <div className="pl-6">
            <CheckboxItem id="dados_rastreamento_1" label="GTM, Pixels, API de Conversão OK?" />
            <CheckboxItem id="dados_rastreamento_2" label="Velocidade da página" />
          </div>
        </div>

        <div className="space-y-1">
          <CheckboxItem id="processos_ferramentas" label="PROCESSOS E FERRAMENTAS" bold color="red" />
          <div className="pl-6">
            <CheckboxItem id="processos_ferramentas_1" label="Atualizar planilha de métricas" />
          </div>
        </div>

      </div>

    </div>
  );
}
