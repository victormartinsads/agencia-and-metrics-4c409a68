import { Layout, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TEMPLATES, TemplateKey } from "@/hooks/useOverviewTemplate";

interface Props {
  value: TemplateKey;
  onChange: (key: TemplateKey) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  const current = TEMPLATES.find((t) => t.key === value) || TEMPLATES[TEMPLATES.length - 1];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Layout className="h-3.5 w-3.5" />
          Template: <span className="font-semibold">{current.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">Aplicar template à Visão Geral</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TEMPLATES.map((t) => (
          <DropdownMenuItem
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex items-start gap-2 py-2"
          >
            <div className="mt-0.5 w-4">
              {value === t.key && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{t.name}</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                {t.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}