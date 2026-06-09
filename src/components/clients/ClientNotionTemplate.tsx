import { useClientNotionData, useSaveClientNotionData } from "@/hooks/useGestorDiary";
import { Loader2 } from "lucide-react";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";

function InnerEditor({ initialContent, clientId, canManage, saveNotionData }: any) {
  // Cria o editor apenas UMA VEZ na montagem usando o initialContent.
  const options = initialContent ? { initialContent } : {};
  const editor = useCreateBlockNote(options);

  const handleChange = () => {
    if (!editor) return;
    saveNotionData.mutate({ client_id: clientId, data: editor.document });
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

export default function ClientNotionTemplate({ clientId, canManage }: { clientId: string, canManage: boolean }) {
  const { data: notionData, isLoading } = useClientNotionData(clientId);
  const saveNotionData = useSaveClientNotionData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando diário do cliente...</span>
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
        key={clientId} // Força a recriação do editor ao mudar de cliente
        initialContent={initialContent}
        clientId={clientId}
        canManage={canManage}
        saveNotionData={saveNotionData}
      />
    </div>
  );
}
