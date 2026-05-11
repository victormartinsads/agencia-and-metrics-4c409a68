import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  diagnosticUrl: string;
  diagnosticTitle: string;
}

function buildTemplate(recordingUrl: string, docUrl: string) {
  return `Olá, pessoal, tudo certo? Segue a nossa análise semanal de como estamos e como iremos melhorar os nossos resultados.

🚨 Gravamos um vídeo de análise de 1-6 minutos em que nós estamos apresentando todos os pontos de métricas, alerta e tarefas de melhorias.

🎥 Segue o link da gravação: ${recordingUrl || "{cole o link da gravação acima}"}

📄 Segue o link do doc escrito: ${docUrl}`;
}

export function SendDiagnosticWhatsAppDialog({ open, onOpenChange, diagnosticUrl, diagnosticTitle }: Props) {
  const [recordingUrl, setRecordingUrl] = useState("");
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setRecordingUrl("");
      setEdited(false);
      setMessage(buildTemplate("", diagnosticUrl));
    }
  }, [open, diagnosticUrl]);

  // Auto-update message when recording URL changes (only if user hasn't manually edited)
  useEffect(() => {
    if (!edited && open) {
      setMessage(buildTemplate(recordingUrl, diagnosticUrl));
    }
  }, [recordingUrl, diagnosticUrl, edited, open]);

  const waUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(message)}`,
    [message]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  const handleSend = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Enviar para WhatsApp — {diagnosticTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Link do diagnóstico (já embutido)</Label>
            <Input value={diagnosticUrl} readOnly className="text-xs font-mono" />
          </div>

          <div>
            <Label className="text-xs">Link da gravação (cole aqui)</Label>
            <Input
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="https://..."
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setEdited(true); }}
              rows={12}
              className="text-xs font-mono leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Edite livremente. Ao enviar, o WhatsApp abrirá e você escolhe o grupo do cliente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button size="sm" onClick={handleSend} className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white">
            <ExternalLink className="h-4 w-4" /> Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}