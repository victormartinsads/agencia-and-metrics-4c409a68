import { useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  clientId: string;
  clientName: string;
  logoUrl?: string | null;
  onChange: (url: string | null) => void;
}

/** Avatar uploader for a single client. Stores the file in the public `client-logos` bucket. */
export function ClientLogoUploader({ clientId, clientName, logoUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Tamanho máximo 5MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${clientId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
      const url = data.publicUrl;
      onChange(url);
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar imagem");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    toast.success("Foto removida");
  };

  const initials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border border-border bg-black grid place-items-center">
        {logoUrl ? (
          <img src={logoUrl} alt={clientName} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-2xl font-bold text-primary">{initials}</span>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePick} disabled={busy}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> {logoUrl ? "Trocar foto" : "Enviar foto"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">PNG, JPG ou WEBP · até 5MB · ideal 1:1</p>
      </div>
    </div>
  );
}