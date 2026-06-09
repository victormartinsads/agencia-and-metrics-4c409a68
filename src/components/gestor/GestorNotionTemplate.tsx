import { useState, useEffect, useMemo } from "react";
import { useGestorNotionData, useSaveGestorNotionData } from "@/hooks/useGestorDiary";
import { Loader2 } from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { PartialBlock } from "@blocknote/core";


function InnerEditor({ initialContent, gestorId, canManage, saveNotionData }: any) {
  // Cria o editor apenas UMA VEZ na montagem usando o initialContent.
  // Sem array de dependências para não recriar e causar loop infinito no React Query.
  const options = initialContent ? { initialContent } : {};
  const editor = useCreateBlockNote(options);

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
  let initialContent = undefined;
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
