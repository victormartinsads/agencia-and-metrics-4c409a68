import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, differenceInDays, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Selector de período híbrido: presets rápidos + calendário com range customizado.
 * - Limite máximo: 14 meses (~426 dias).
 * - Encode: presets nativos ("last_7d") ou "custom:YYYY-MM-DD:YYYY-MM-DD".
 */

const MAX_RANGE_DAYS = 426; // ~14 meses

const PRESETS: { value: string; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_3d", label: "Últimos 3 dias" },
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_14d", label: "Últimos 14 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
];

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function parseValue(value: string): { range?: DateRange; preset?: string } {
  const m = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (m) {
    return {
      range: {
        from: new Date(m[1] + "T00:00:00"),
        to: new Date(m[2] + "T00:00:00"),
      },
    };
  }
  return { preset: value };
}

function labelForValue(value: string): string {
  const { range, preset } = parseValue(value);
  if (range?.from && range?.to) {
    return `${format(range.from, "dd/MM/yy", { locale: ptBR })} – ${format(range.to, "dd/MM/yy", { locale: ptBR })}`;
  }
  return PRESETS.find((p) => p.value === preset)?.label ?? "Selecionar período";
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => parseValue(value), [value]);
  const [range, setRange] = useState<DateRange | undefined>(initial.range);

  const today = new Date();
  const minDate = subMonths(today, 14);

  const applyRange = (r: DateRange | undefined) => {
    if (!r?.from || !r?.to) {
      setRange(r);
      return;
    }
    const days = differenceInDays(r.to, r.from) + 1;
    if (days > MAX_RANGE_DAYS) {
      toast.error("Período máximo: 14 meses", {
        description: "Escolha um intervalo menor.",
      });
      return;
    }
    setRange(r);
    onChange(`custom:${fmt(r.from)}:${fmt(r.to)}`);
    setOpen(false);
  };

  const applyPreset = (preset: string) => {
    setRange(undefined);
    onChange(preset);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 text-xs font-normal min-w-[180px]",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{labelForValue(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0 flex flex-col md:flex-row"
      >
        <div className="flex md:flex-col gap-1 p-2 md:border-r border-border bg-card/50 overflow-x-auto md:overflow-visible md:min-w-[160px]">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md text-left whitespace-nowrap transition-colors",
                value === p.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => {
              const from = startOfMonth(subMonths(today, 1));
              const to = endOfMonth(subMonths(today, 1));
              applyRange({ from, to });
            }}
            className="text-xs px-3 py-1.5 rounded-md text-left hover:bg-accent text-foreground whitespace-nowrap"
          >
            Últimos 90 dias
          </button>
        </div>
        <div className="p-2">
          <Calendar
            mode="range"
            selected={range}
            onSelect={applyRange}
            numberOfMonths={2}
            defaultMonth={range?.from ?? subDays(today, 30)}
            disabled={{ before: minDate, after: today }}
            locale={ptBR}
            className="pointer-events-auto"
          />
          <p className="text-[10px] text-muted-foreground px-2 pt-1">
            Selecione duas datas. Máx. 14 meses.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
