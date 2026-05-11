import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Rocket, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  useCampaignDrafts,
  useGenerateDraft,
  usePublishDraft,
  useDeleteDraft,
  type CampaignDraft,
} from "@/hooks/useGestorAlerts";

interface Props {
  clientId: string;
  adAccountIds: string[];
}

export function CampaignDraftDialog({ clientId, adAccountIds }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [adAccountId, setAdAccountId] = useState(adAccountIds[0] || "");
  const [currentDraft, setCurrentDraft] = useState<CampaignDraft | null>(null);

  const { data: drafts } = useCampaignDrafts(clientId);
  const gen = useGenerateDraft();
  const pub = usePublishDraft();
  const del = useDeleteDraft();

  const handleGenerate = async () => {
    if (!prompt.trim() || !adAccountId) return;
    try {
      const draft = await gen.mutateAsync({ clientId, adAccountId, prompt });
      setCurrentDraft(draft);
      toast.success("Rascunho gerado pela IA");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar rascunho");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await pub.mutateAsync(id);
      toast.success("Campanha publicada como PAUSADA na Meta");
      setCurrentDraft(null);
      setPrompt("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao publicar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
          <Rocket className="h-3.5 w-3.5" /> Nova campanha por prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar campanha via prompt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">Conta de anúncio</label>
            <Select value={adAccountId} onValueChange={setAdAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {adAccountIds.map((id) => <SelectItem key={id} value={id}>{id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Descreva a campanha</label>
            <Textarea
              rows={5}
              placeholder="Ex: Quero captar leads de corretores em SP, orçamento de R$ 100/dia, foco em interesses de mercado imobiliário, com 2 anúncios diferentes."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              A IA gera um rascunho. Nada é publicado até você revisar e clicar em <strong>Publicar</strong> (a campanha sobe como PAUSADA).
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={gen.isPending || !prompt.trim() || !adAccountId}>
            {gen.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Gerar rascunho
          </Button>

          {currentDraft && (
            <Card className="p-3 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">Pré-visualização</div>
                <Badge variant="outline" className="text-[10px]">{currentDraft.status}</Badge>
              </div>
              <pre className="text-[10px] bg-muted/40 p-2 rounded max-h-72 overflow-auto">
                {JSON.stringify(currentDraft.structure, null, 2)}
              </pre>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => handlePublish(currentDraft.id)} disabled={pub.isPending}>
                  {pub.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                  Publicar (PAUSADA)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { del.mutate(currentDraft.id); setCurrentDraft(null); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Descartar
                </Button>
              </div>
            </Card>
          )}

          {drafts && drafts.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-card-foreground">
                Rascunhos anteriores ({drafts.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 p-2 rounded border border-border">
                    <Badge variant="outline" className="text-[9px]">{d.status}</Badge>
                    <span className="truncate flex-1">{d.prompt.slice(0, 80)}</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCurrentDraft(d)}>Ver</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => del.mutate(d.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}