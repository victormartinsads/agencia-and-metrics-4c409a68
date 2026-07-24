import { Trash2, RotateCcw, AlertCircle, FileText, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTrashSubpages, useRestoreSubpage, useDeleteSubpage } from "@/hooks/useSubpages";
import { toast } from "sonner";

interface NotionTrashModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotionTrashModal({ open, onOpenChange }: NotionTrashModalProps) {
  const { data: trashedPages = [], isLoading } = useTrashSubpages();
  const restoreSubpage = useRestoreSubpage();
  const deleteSubpage = useDeleteSubpage();

  const handleRestore = async (id: string, title: string) => {
    try {
      await restoreSubpage.mutateAsync(id);
      toast.success(`Página "${title}" restaurada!`);
    } catch {
      toast.error("Erro ao restaurar página");
    }
  };

  const handlePermanentDelete = async (id: string, title: string) => {
    if (confirm(`Excluir permanentemente "${title}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteSubpage.mutateAsync(id);
        toast.success("Página removida definitivamente");
      } catch {
        toast.error("Erro ao excluir página");
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm(`Esvaziar lixeira? ${trashedPages.length} página(s) serão excluídas permanentemente.`)) {
      try {
        for (const page of trashedPages) {
          await deleteSubpage.mutateAsync(page.id);
        }
        toast.success("Lixeira esvaziada!");
      } catch {
        toast.error("Erro ao esvaziar lixeira");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-[#2c2c2b] pb-3">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white">
              <Trash2 className="h-4 w-4 text-red-400" /> Lixeira do Notion
            </DialogTitle>
            {trashedPages.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEmptyTrash}
                className="h-6 text-[10px] bg-red-950/40 hover:bg-red-900 border border-red-900 text-red-400 font-bold px-2 rounded"
              >
                Esvaziar Lixeira
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-[#9b9a97] pt-1">
            Páginas na lixeira podem ser restauradas para a árvore de documentos ou excluídas permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-xs text-[#9b9a97]">
              <Loader2 className="h-4 w-4 animate-spin text-[#7a9d96]" /> Carregando lixeira...
            </div>
          ) : trashedPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Sparkles className="h-8 w-8 text-[#5f5e5b]" />
              <p className="text-xs font-semibold text-[#e3e2e0]">A lixeira está vazia</p>
              <p className="text-[10px] text-[#9b9a97]">
                Páginas excluídas aparecerão aqui para fácil restauração.
              </p>
            </div>
          ) : (
            trashedPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#202020] border border-[#2c2c2b] hover:border-[#7a9d96]/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0 select-none">
                    {page.icon_emoji || "📄"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e3e2e0] truncate">
                      {page.title || "Sem título"}
                    </p>
                    {page.deleted_at && (
                      <p className="text-[9px] text-[#5f5e5b]">
                        Excluído em {new Date(page.deleted_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleRestore(page.id, page.title || "Página")}
                    disabled={restoreSubpage.isPending}
                    className="h-6 text-[10px] bg-[#7a9d96]/20 hover:bg-[#7a9d96]/30 text-[#7a9d96] border border-[#7a9d96]/40 px-2 rounded font-bold"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handlePermanentDelete(page.id, page.title || "Página")}
                    disabled={deleteSubpage.isPending}
                    className="h-6 text-[10px] bg-red-950/20 hover:bg-red-900 border border-red-900 text-red-400 px-2 rounded font-bold"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
