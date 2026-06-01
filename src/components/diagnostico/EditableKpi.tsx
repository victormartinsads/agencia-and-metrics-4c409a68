import { useState, useEffect, useRef } from "react";
import { Pencil, Undo2, Check, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditableKpiProps {
  label: string;
  value: string; // Current formatted value
  originalValue?: string; // Original API formatted value
  isOverridden: boolean;
  onSave: (val: string) => void;
  onReset?: () => void;
  readOnly?: boolean;
  highlight?: boolean;
}

export function EditableKpi({
  label,
  value,
  originalValue,
  isOverridden,
  onSave,
  onReset,
  readOnly = false,
  highlight = false,
}: EditableKpiProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // Clean string from formatting symbols to make editing raw numbers easier
      // e.g. R$ 1.500,00 -> 1500.00 or similar
      const raw = value
        .replace(/[R$\s.%]/g, "") // removes R$, spaces, dots, percent signs
        .replace(",", ".");       // converts pt-BR decimal comma to dot
      setDraftValue(raw);
    }
  }, [isEditing, value]);

  const handleSave = () => {
    onSave(draftValue.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all duration-300 backdrop-blur-sm ${
        isOverridden
          ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 shadow-sm shadow-amber-500/5"
          : highlight
          ? "border-primary/30 bg-primary/5 hover:border-primary/50 shadow-sm shadow-primary/5"
          : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20"
      } ${!readOnly ? "cursor-pointer" : ""}`}
      onClick={() => {
        if (!readOnly && !isEditing) setIsEditing(true);
      }}
    >
      {/* Top Section: Label and badges */}
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="truncate max-w-[80%]">{label}</span>
        <div className="flex items-center gap-1">
          {isOverridden && (
            <span className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/10 px-1 py-0.5 rounded text-[8px]">
              <Sparkles className="h-2 w-2" /> Manual
            </span>
          )}
          {!readOnly && !isEditing && (
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-primary" />
          )}
        </div>
      </div>

      {/* Middle Section: Value or Input */}
      <div className="mt-2 min-h-[2rem] flex items-center">
        {isEditing ? (
          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <Input
              ref={inputRef}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-8 py-1 px-2 text-sm font-bold bg-background border-primary/40 focus-visible:ring-1 focus-visible:ring-primary w-full font-mono"
              autoFocus
              placeholder="0.00"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-primary hover:bg-primary/10 shrink-0"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:bg-muted shrink-0"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`text-lg font-bold font-mono tracking-tight ${
              isOverridden ? "text-amber-600 dark:text-amber-500" : highlight ? "text-primary" : "text-card-foreground"
            }`}
          >
            {value}
          </div>
        )}
      </div>

      {/* Bottom Section: Tooltip/Original Info */}
      {isOverridden && originalValue && !isEditing && (
        <div className="mt-1 text-[9px] text-muted-foreground/80 flex items-center justify-between">
          <span className="truncate">Original: {originalValue}</span>
          {!readOnly && onReset && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="text-amber-600 hover:text-amber-500 flex items-center gap-0.5 ml-1 transition-colors"
              title="Restaurar valor original"
            >
              <Undo2 className="h-2.5 w-2.5" /> restaurar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
