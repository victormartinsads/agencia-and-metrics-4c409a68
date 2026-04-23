import { useState, ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { MetricSourcePicker } from "./MetricSourcePicker";
import { cn } from "@/lib/utils";

interface Props {
  clientId?: string;
  metricKey: string;
  children: ReactNode;
  className?: string;
}

/** Wraps any metric block: shows a small gear on hover that opens the source picker. */
export function EditableMetric({ clientId, metricKey, children, className }: Props) {
  const [open, setOpen] = useState(false);

  if (!clientId) return <div className={className}>{children}</div>;

  return (
    <>
      <div className={cn("relative group", className)}>
        {children}
        <button
          onClick={() => setOpen(true)}
          className="absolute top-1 right-1 z-10 h-6 w-6 rounded-md bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card hover:border-primary"
          title="Editar fonte de dados"
          aria-label="Editar fonte de dados"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <MetricSourcePicker open={open} onOpenChange={setOpen} clientId={clientId} metricKey={metricKey} />
    </>
  );
}