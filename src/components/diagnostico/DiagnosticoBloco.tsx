import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";

interface Props {
  title: string;
  emoji: string;
  accentClass: string; // ex: "border-green-500/40 bg-green-500/5"
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Bloco editável do diagnóstico semanal.
 * - Modo leitura: renderiza markdown (bom pra apresentar/gravar vídeo).
 * - Modo edição: textarea com auto-save (debounce vem do hook).
 */
export function DiagnosticoBloco({ title, emoji, accentClass, value, onChange, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const isEmpty = !value.trim();

  return (
    <div className={`rounded-xl border ${accentClass} p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-card-foreground flex items-center gap-2">
          <span className="text-xl">{emoji}</span> {title}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(e => !e)}
          className="h-7 px-2 text-xs gap-1"
        >
          {editing ? <><Check className="h-3.5 w-3.5" /> Pronto</> : <><Pencil className="h-3.5 w-3.5" /> Editar</>}
        </Button>
      </div>

      {editing ? (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[220px] resize-y text-sm leading-loose [&]:leading-loose"
          autoFocus
        />
      ) : isEmpty ? (
        <p className="text-sm text-muted-foreground italic">
          {placeholder || "Sem conteúdo. Gere com IA ou clique em Editar."}
        </p>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none text-card-foreground
                        prose-p:my-3 prose-ul:my-3 prose-li:my-2 prose-strong:text-card-foreground leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
