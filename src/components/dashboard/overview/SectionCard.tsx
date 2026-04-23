import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function SectionCard({ title, children, className, compact }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm", compact ? "p-4" : "p-5", className)}>
      {title && (
        <h3 className="text-[13px] font-bold text-card-foreground mb-4 tracking-tight">{title}</h3>
      )}
      {children}
    </div>
  );
}