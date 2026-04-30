import { useState } from "react";
import {
  useFunnelDatedNotes,
  useAddFunnelDatedNote,
  useDeleteFunnelDatedNote,
} from "@/hooks/useFunnelDatedNotes";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clientId: string;
  funnelCode: string;
}

export function FunnelNotesPanel({ clientId, funnelCode }: Props) {
  const { data: notes = [] } = useFunnelDatedNotes(clientId, funnelCode);
  const add = useAddFunnelDatedNote();
  const del = useDeleteFunnelDatedNote();

  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleAdd = async () => {
    if (!content.trim()) return;
    await add.mutateAsync({ clientId, funnelCode, content: content.trim(), noteDate: date });
    setContent("");
  };

  return (
    <div className="space-y-3">
      {/* New note */}
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 text-xs w-auto"
          />
        </div>
        <Textarea
          placeholder="Anote insights, ações tomadas, próximos passos…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
        <Button size="sm" onClick={handleAdd} disabled={!content.trim() || add.isPending} className="w-full gap-1">
          <Plus className="h-3.5 w-3.5" /> Adicionar nota
        </Button>
      </div>

      {/* History */}
      <ScrollArea className="max-h-72 pr-2">
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            Nenhuma nota ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-2.5 rounded-md bg-card border border-border/50 group relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                    {format(parseISO(n.note_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={() => del.mutate({ id: n.id, clientId, funnelCode })}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}