import { useState } from "react";
import { Loader2, Trash2, Eye, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedDiagnostics, useDeleteSavedDiagnostic, SavedDiagnostic } from "@/hooks/useSavedDiagnostics";
import { groupCampaignsByFunnel } from "@/lib/funnelGrouping";
import { DiagnosticoPresentMode } from "./DiagnosticoPresentMode";
import { toast } from "sonner";
import { exportDiagnosticoPDF } from "./exportDiagnosticoPDF";
import { useRef } from "react";

interface Props {
  clientId: string;
  clientName?: string;
  currencySymbol?: string;
}

export function SavedDiagnosticsList({ clientId, clientName = "Cliente", currencySymbol = "R$" }: Props) {
  const { data: list, isLoading } = useSavedDiagnostics(clientId);
  const del = useDeleteSavedDiagnostic();
  const [viewing, setViewing] = useState<SavedDiagnostic | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando diagnósticos salvos...
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
        Nenhum diagnóstico salvo ainda. Use o botão <strong>"Salvar diagnóstico"</strong> na aba Como Estamos para arquivar uma versão.
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este diagnóstico salvo? Essa ação não pode ser desfeita.")) return;
    try {
      await del.mutateAsync({ id, client_id: clientId });
      toast.success("Diagnóstico excluído");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <>
      <div className="space-y-3">
        {list.map(item => {
          const created = new Date(item.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
          });
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-card-foreground truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.snapshot?.periodRange || item.date_preset} • Salvo em {created}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setViewing(item)}>
                  <Eye className="h-4 w-4" /> Visualizar
                </Button>
                <Button size="sm" variant="ghost" className="gap-2 text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {viewing && (
        <SavedDiagnosticViewer
          item={viewing}
          clientName={clientName}
          currencySymbol={currencySymbol}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

function SavedDiagnosticViewer({
  item, clientName, currencySymbol, onClose,
}: { item: SavedDiagnostic; clientName: string; currencySymbol: string; onClose: () => void }) {
  const snap = item.snapshot || {};
  const campaigns = snap.campaigns || [];
  const groups = groupCampaignsByFunnel(campaigns);
  const blocks = snap.blocks || { positives: "", negatives: "", manager_actions: "", client_requests: "" };
  const whatWeDid = snap.whatWeDid || "";
  const nextActions = snap.nextActions || "";
  const periodRange = snap.periodRange || item.date_preset;

  // Export PDF do modo apresentação não funciona facilmente; oferecemos
  // export do conteúdo renderizado em outro container. Vamos usar window.print
  // via um botão extra no PresentMode? Mantemos simples: o PresentMode tem fullscreen,
  // e adicionamos um botão extra para exportar PDF rasterizando o container.
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!containerRef.current) return;
    try {
      await exportDiagnosticoPDF(containerRef.current, `diagnostico-${item.title.replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF gerado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="text-sm text-card-foreground font-semibold truncate">{item.title}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
      <div ref={containerRef}>
        <DiagnosticoPresentMode
          clientName={clientName}
          datePreset={periodRange}
          periodRange={periodRange}
          groups={groups}
          blocks={blocks}
          whatWeDid={whatWeDid}
          nextActions={nextActions}
          currencySymbol={currencySymbol}
          publicMode
        />
      </div>
    </div>
  );
}