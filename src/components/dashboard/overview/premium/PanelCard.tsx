import { ReactNode } from "react";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  subtitle?: ReactNode;
}

export function PanelCard({ title, actions, children, className, noPadding, subtitle }: Props) {
  return (
    <section className={`rounded-2xl bg-card border border-border/60 overflow-hidden flex flex-col ${className || ""}`}>
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <h3
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            {title}
          </h3>
          {subtitle && <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </header>
      <div className={`flex-1 ${noPadding ? "" : "p-5"}`}>{children}</div>
    </section>
  );
}