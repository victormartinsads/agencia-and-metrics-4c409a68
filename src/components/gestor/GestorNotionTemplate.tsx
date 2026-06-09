import { useState, useEffect, useMemo } from "react";
import { useGestorNotionData, useSaveGestorNotionData } from "@/hooks/useGestorDiary";
import { Loader2 } from "lucide-react";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { PartialBlock } from "@blocknote/core";

const SEED_BLOCKS: PartialBlock[] = [
  {
    type: "heading",
    props: { level: 3 },
    content: "O QUE FOI VENDIDO NOS PROJETOS?"
  },
  { type: "checkListItem", content: "O que foi vendido na semana?" },
  { type: "checkListItem", content: "Qual o principal produto / serviço que traz mais resultado" },
  { type: "checkListItem", content: "Como conseguimos aumentar o volume?" },
  { type: "checkListItem", content: "Como conseguimos aumentar o CAC?" },
  { type: "checkListItem", content: "Como conseguimos aumentar o LTV?" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3 },
    content: "ESTRUTURAS"
  },
  { type: "checkListItem", content: "Quais são as novas estruturas que vamos testar e em qual projeto?" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3 },
    content: "ROTINA DIÁRIA E SEMANAL"
  },
  { type: "checkListItem", content: "Campanha nova?" },
  { type: "checkListItem", content: "Criativos novos?" },
  { type: "checkListItem", content: "Públicos novos?" },
  { type: "checkListItem", content: "Copys novas?" },
  { type: "checkListItem", content: "Analise de Metricas (Primaria, Secundaria, Terciaria)" },
  { type: "checkListItem", content: "Reunião de Alinhamento com o Cliente" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3 },
    content: "ESTUDO PARA OS PROJETOS"
  },
  { type: "checkListItem", content: "Estudo e documentação" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3 },
    content: "ANALISE DAS METRICAS PRIMARIAS"
  },
  { type: "checkListItem", content: "Analisar conversões, compras, leads" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3 },
    content: "ANALISE DAS METRICAS SECUNDARIAS"
  },
  { type: "checkListItem", content: "Analisar CTR, CPC, CPA, CPM" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3, textColor: "red" },
    content: "FUNIL SEMPRE ATIVO"
  },
  { type: "checkListItem", content: "Verificar campanhas se estão rodando" },
  { type: "checkListItem", content: "Análise de orçamento gasto no dia" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3, textColor: "red" },
    content: "OFERTA / CRIATIVO"
  },
  { type: "checkListItem", content: "Revisar copys e CTAs" },
  { type: "checkListItem", content: "Feedback de criativos da semana" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3, textColor: "red" },
    content: "ESTEIRA DE PRODUTOS E FUNIL"
  },
  { type: "checkListItem", content: "Mapear upsell e downsell" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3, textColor: "red" },
    content: "DADOS DE RASTREAMENTO E PAGINA"
  },
  { type: "checkListItem", content: "GTM, Pixels, API de Conversão OK?" },
  { type: "checkListItem", content: "Velocidade da página" },
  { type: "paragraph" },
  {
    type: "heading",
    props: { level: 3, textColor: "red" },
    content: "PROCESSOS E FERRAMENTAS"
  },
  { type: "checkListItem", content: "Atualizar planilha de métricas" }
];

function InnerEditor({ initialContent, gestorId, canManage, saveNotionData }: any) {
  // Cria o editor apenas UMA VEZ na montagem usando o initialContent.
  // Sem array de dependências para não recriar e causar loop infinito no React Query.
  const editor = useCreateBlockNote({
    initialContent: initialContent,
  });

  const handleChange = () => {
    if (!editor) return;
    saveNotionData.mutate({ gestor_id: gestorId, data: editor.document });
  };

  return (
    <BlockNoteView
      editor={editor}
      editable={canManage}
      onChange={handleChange}
      theme="dark"
    />
  );
}

export default function GestorNotionTemplate({ gestorId, canManage }: { gestorId: string, canManage: boolean }) {
  const { data: notionData, isLoading } = useGestorNotionData(gestorId);
  const saveNotionData = useSaveGestorNotionData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando template...</span>
      </div>
    );
  }

  // Resolve o conteúdo inicial
  let initialContent = SEED_BLOCKS;
  if (Array.isArray(notionData) && notionData.length > 0) {
    initialContent = notionData;
  }

  return (
    <div className="min-h-[500px] border border-border/80 rounded-xl p-4 md:p-8 bg-card shadow-sm">
      <InnerEditor
        key={gestorId} // Força a recriação do editor ao mudar de gestor
        initialContent={initialContent}
        gestorId={gestorId}
        canManage={canManage}
        saveNotionData={saveNotionData}
      />
    </div>
  );
}
