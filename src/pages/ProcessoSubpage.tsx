import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSubpage, useUpsertSubpage, useDeleteSubpage } from "@/hooks/useSubpages";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import * as locales from "@blocknote/core/locales";
import "@blocknote/shadcn/style.css";
import { v4 as uuidv4 } from "uuid";

// Editor component for sub-page content
function SubpageEditor({
  initialContent,
  onSave,
}: {
  initialContent: any;
  onSave: (content: any) => void;
}) {
  const editor = useCreateBlockNote({
    initialContent:
      initialContent && Array.isArray(initialContent) && initialContent.length > 0
        ? initialContent
        : [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Escreva aqui o conteúdo desta página...",
                  styles: { italic: true },
                },
              ],
            },
          ],
    dictionary: locales.pt,
  });

  return (
    <div className="blocknote-editor-wrapper text-sm">
      <BlockNoteView
        editor={editor}
        editable={true}
        onChange={() => onSave(editor.document)}
        theme="dark"
        onCompositionStart={undefined}
        linkToolbar={false}
      />
    </div>
  );
}

export default function ProcessoSubpage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = useSubpage(pageId);
  const upsert = useUpsertSubpage();
  const deleteSubpage = useDeleteSubpage();

  const [title, setTitle] = useState("");
  const [titleInitialized, setTitleInitialized] = useState(false);

  // Sync title from loaded page
  if (page && !titleInitialized) {
    setTitle(page.title || "");
    setTitleInitialized(true);
  }

  const handleSaveContent = useCallback(
    (content: any) => {
      if (!page) return;
      upsert.mutate({ ...page, title: title || page.title, content });
    },
    [page, title, upsert]
  );

  const handleTitleBlur = () => {
    if (!page || !title.trim()) return;
    upsert.mutate({ ...page, title });
  };

  const handleDelete = async () => {
    if (!pageId) return;
    if (confirm(`Excluir permanentemente esta página "${title}"?`)) {
      await deleteSubpage.mutateAsync(pageId);
      toast.success("Página excluída");
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#7a9d96]" />
            <span className="text-xs text-[#9b9a97]">Carregando página...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!page) {
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <FileText className="h-10 w-10 text-[#5f5e5b]" />
            <div>
              <p className="text-[#e3e2e0] font-semibold">Página não encontrada</p>
              <p className="text-xs text-[#9b9a97] mt-1">
                Esta página pode ter sido excluída ou ainda não foi importada.
              </p>
            </div>
            <Button
              onClick={() => navigate("/processos")}
              className="h-8 text-xs bg-[#7a9d96] hover:bg-[#7a9d96]/90 text-[#191919] font-bold px-4 rounded-[4px]"
            >
              Voltar aos Processos
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPage="notion" header={null} noContainer>
      <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-24 selection:bg-[#2c2c2b]">
        {/* Top Navigation */}
        <div className="sticky top-0 bg-[#191919]/95 backdrop-blur-sm z-30 border-b border-[#2c2c2b]/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs text-[#9b9a97] hover:text-[#e3e2e0] transition-colors p-1 rounded hover:bg-[#2c2c2b] font-medium shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
            <span className="text-[#5f5e5b] text-xs shrink-0">/</span>
            <button
              onClick={() => navigate("/processos")}
              className="text-xs text-[#9b9a97] hover:text-[#e3e2e0] transition-colors font-medium truncate"
            >
              Processos
            </button>
            <span className="text-[#5f5e5b] text-xs shrink-0">/</span>
            <span className="text-xs text-[#e3e2e0] font-semibold truncate">
              {title || page.title || "Sem título"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {upsert.isPending && (
              <span className="text-[10px] text-[#5f5e5b] flex items-center gap-1">
                <Save className="h-3 w-3 animate-pulse" /> Salvando...
              </span>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="h-7 text-xs bg-red-950/20 hover:bg-red-900 border border-red-900 text-red-400 hover:text-white px-2.5 rounded-[4px] font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
            </Button>
          </div>
        </div>

        {/* Cover */}
        <div className="h-36 w-full relative overflow-hidden border-b border-[#2c2c2b]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7a9d96]/10 via-[#191919] to-[#191919]" />
          <div className="absolute bottom-0 left-16 md:left-24 h-12 w-12 bg-[#7a9d96]/10 border border-[#7a9d96]/40 flex items-center justify-center rounded-full shadow-lg mb-4">
            <FileText className="h-6 w-6 text-[#7a9d96]" />
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-4xl mx-auto px-6 md:px-16 pt-10 space-y-6">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Sem título"
            className="w-full bg-transparent border-none text-4xl font-bold text-white focus:ring-0 outline-none p-0 tracking-tight"
          />

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-[#5f5e5b] border-b border-[#2c2c2b]/30 pb-4">
            <span>
              📄 Sub-página de Processo
            </span>
            {page.created_at && (
              <span>
                Criado em {new Date(page.created_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>

          {/* Editor */}
          <div className="pt-2">
            <SubpageEditor
              key={page.id}
              initialContent={page.content}
              onSave={handleSaveContent}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
