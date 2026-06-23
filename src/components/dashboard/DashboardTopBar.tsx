import { Pencil, LayoutTemplate, Database, CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { toast } from "sonner";

export interface DashboardTab {
  id: string;
  label: string;
}

interface Props {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  datePreset: string;
  onDatePresetChange: (v: string) => void;
  compareEnabled?: boolean;
  onToggleCompare?: () => void;
  onEdit?: () => void;
  onTemplate?: () => void;
  onSources?: () => void;
  clientName?: string;
  clientLogoUrl?: string | null;
  rightExtra?: React.ReactNode;
}

function fmtPreset(value: string): string {
  // Try parse custom range
  const m = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (m) {
    const from = new Date(m[1] + "T00:00:00");
    const to = new Date(m[2] + "T00:00:00");
    const sameMonth = from.getMonth() === to.getMonth();
    if (sameMonth) {
      return `${format(from, "dd")} – ${format(to, "dd MMM", { locale: ptBR })}`;
    }
    return `${format(from, "dd MMM", { locale: ptBR })} – ${format(to, "dd MMM", { locale: ptBR })}`;
  }
  const today = new Date();
  if (value === "today") return format(today, "dd MMM", { locale: ptBR });
  if (value === "yesterday") return format(subDays(today, 1), "dd MMM", { locale: ptBR });
  if (value === "last_7d") {
    const from = subDays(today, 6);
    return `${format(from, "dd")} – ${format(today, "dd MMM", { locale: ptBR })}`;
  }
  if (value === "last_14d") return "Últimos 14d";
  if (value === "last_30d") return "Últimos 30d";
  if (value === "this_month") return format(today, "MMMM", { locale: ptBR });
  if (value === "last_month") return "Mês passado";
  return "Período";
}

export function DashboardTopBar({
  tabs, activeTab, onTabChange,
  datePreset, onDatePresetChange,
  compareEnabled = false, onToggleCompare,
  onEdit, onTemplate, onSources,
  clientName, clientLogoUrl, rightExtra,
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  const presetIsWeek = datePreset === "last_7d";
  const presetIsMonth = datePreset === "this_month";
  const presetIsCustom = datePreset.startsWith("custom:") || (!presetIsWeek && !presetIsMonth);

  const currentChipLabel = fmtPreset(datePreset);

  return (
    <div className="bg-background/80 backdrop-blur-2xl border-b border-white/5 relative z-10">
      {/* Row 1 — logo + nav + actions */}
      <div className="h-[68px] flex items-center gap-6 px-5">
        {/* Client identity */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0 max-w-[260px]">
          {clientLogoUrl ? (
            <img
              src={clientLogoUrl}
              alt={clientName || "Cliente"}
              className="h-9 w-9 rounded-md object-cover bg-black ring-1 ring-primary/30 shrink-0"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30 shrink-0">
              <span className="text-[11px] font-extrabold text-primary tracking-wider">
                {(clientName || "·").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </span>
          )}
          {clientName && (
            <span
              className="text-[14px] font-extrabold tracking-[0.12em] text-foreground uppercase truncate"
              style={{ fontFamily: "'Syne',sans-serif" }}
              title={clientName}
            >
              {clientName}
            </span>
          )}
        </div>

        {/* Tabs */}
        <nav
          className="flex-1 flex items-center gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "relative h-[68px] px-4 text-[14px] font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                {t.label}
                {active && (
                  <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-primary/80 to-emerald-400 shadow-[0_0_16px_hsl(var(--primary)/0.7)]" />
                )}
              </button>
            );
          })}
        </nav>


      </div>

      {/* Row 2 — período chips */}
      <div className="h-12 flex items-center gap-3 px-5 border-t border-white/5 bg-black/20">
        <span className="text-[10px] tracking-[0.2em] font-semibold text-muted-foreground/60 uppercase mr-1">
          Período
        </span>

        {/* Active main chip */}
        <button
          onClick={() => { /* no-op when already active */ }}
          className={cn(
            "h-8 px-4 rounded-full text-[12px] font-bold transition-all border shadow-sm",
            "border-primary/50 bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(var(--primary-rgb),0.2)]"
          )}
        >
          {currentChipLabel}
        </button>

        <button
          onClick={() => onDatePresetChange("last_7d")}
          className={cn(
            "h-8 px-4 rounded-full text-[12px] font-medium border transition-all",
            presetIsWeek && !presetIsCustom
              ? "border-primary/40 text-primary bg-primary/5"
              : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/10"
          )}
        >
          Semana
        </button>
        <button
          onClick={() => onDatePresetChange("this_month")}
          className={cn(
            "h-8 px-4 rounded-full text-[12px] font-medium border transition-all",
            presetIsMonth
              ? "border-primary/40 text-primary bg-primary/5"
              : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/10"
          )}
        >
          Mês
        </button>

        <div className="relative">
          <button
            onClick={() => setCustomOpen((o) => !o)}
            className={cn(
              "h-8 px-4 rounded-full text-[12px] font-medium border transition-all flex items-center gap-2",
              datePreset.startsWith("custom:")
                ? "border-primary/40 text-primary bg-primary/5"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/10"
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Personalizado
          </button>
          {customOpen && (
            <div className="absolute left-0 top-10 z-30">
              <DateRangePicker
                value={datePreset}
                onChange={(v) => { onDatePresetChange(v); setCustomOpen(false); }}
              />
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {rightExtra}
          <button
            onClick={() => onToggleCompare?.()}
            className={cn(
              "text-[12px] font-medium transition-colors",
              compareEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Comparar com período anterior
          </button>
        </div>
      </div>
    </div>
  );
}
