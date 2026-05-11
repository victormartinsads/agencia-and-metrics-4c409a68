import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientName: string;
  clientSlug: string;
}

export function SendWhatsAppDialog({ clientName, clientSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [message, setMessage] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const clientViewUrl = `${baseUrl}/visao-cliente/${clientSlug}`;

  useEffect(() => {
    if (open) {
      setMessage(
`Olá! 👋

Segue o nosso diagnóstico semanal de tráfego:

📊 Painel completo (Como Estamos, Funis e Pódio de Criativos):
${clientViewUrl}

🎥 Gravação da análise:
${recordingUrl || "{cole o link da gravação acima}"}

Qualquer dúvida estamos à disposição. 🚀`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Atualiza mensagem quando o link de gravação muda (substitui placeholder/linha antiga)
  useEffect(() => {
    setMessage(prev => {
      if (!prev) return prev;
      const lines = prev.split("\n");
      const idx = lines.findIndex(l => l.startsWith("🎥"));
      if (idx >= 0 && lines[idx + 1] !== undefined) {
        lines[idx + 1] = recordingUrl || "{cole o link da gravação acima}";
        return lines.join("\n");
      }
      return prev;
    });
  }, [recordingUrl]);

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  const handleSend = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white">
          <MessageCircle className="h-4 w-4" />
          Enviar para WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar diagnóstico — {clientName.toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Link da visão do cliente</Label>
            <Input value={clientViewUrl} readOnly className="text-xs font-mono" />
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
              onChange={(e) => setMessage(e.target.value)}
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