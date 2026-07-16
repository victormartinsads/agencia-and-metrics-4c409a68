import { useState } from "react";
import {
  Loader2, Plus, Trash2, CheckCircle, Square, Mail,
  Phone, DollarSign, User, Briefcase, Link2, Video,
  Calendar, Target, Users, AlertCircle, BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUpsertTeamMember, TeamMember } from "@/hooks/useGestorDiary";
import { useQueryClient } from "@tanstack/react-query";

// ─── Inline editable field ──────────────────────────────────────────────────
function PropField({
  icon,
  label,
  value,
  onSave,
  canEdit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onSave: (v: string) => void;
  canEdit: boolean;
}) {
  const [local, setLocal] = useState(value || "");
  const isLink = local.startsWith("http");
  return (
    <div className="grid grid-cols-3 py-1.5 items-center hover:bg-accent/10 px-2 rounded-md transition-colors text-xs border-b border-border/10">
      <div className="flex items-center gap-2 text-muted-foreground select-none">
        {icon}
        <span>{label}</span>
      </div>
      <div className="col-span-2">
        {canEdit ? (
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => local !== value && onSave(local)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="Vazio"
            className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary/20 rounded px-1.5 py-0.5 text-foreground hover:bg-accent/30 transition-all placeholder:italic placeholder:opacity-50"
          />
        ) : isLink ? (
          <a href={local} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block px-1.5 py-0.5">
            {local || <span className="text-muted-foreground/30 italic">Vazio</span>}
          </a>
        ) : (
          <div className="px-1.5 py-0.5 text-foreground min-h-[20px] truncate">
            {local || <span className="text-muted-foreground/30 italic">Vazio</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Checklist section ───────────────────────────────────────────────────────
function ChecklistSection({
  title,
  icon,
  items,
  onToggle,
  onAdd,
  onDelete,
  canEdit,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; text: string; done: boolean }>;
  onToggle: (id: string) => void;
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const [newItem, setNewItem] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        {icon}
        <span className="text-sm font-bold uppercase tracking-tight">{title}</span>
      </div>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 group">
              <button
                disabled={!canEdit}
                onClick={() => onToggle(item.id)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:cursor-not-allowed"
              >
                {item.done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span
                className={`text-sm flex-1 break-words leading-tight ${
                  item.done ? "line-through text-muted-foreground opacity-60" : "text-foreground"
                }`}
              >
                {item.text}
              </span>
              {canEdit && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground/60 italic text-center py-4 bg-muted/10 rounded-lg border border-dashed border-border/50">
            Nenhum item.
          </div>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Input
            placeholder="Novo item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
            className="h-7 text-xs bg-muted/30 border-border/40 focus-visible:ring-primary/30"
          />
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => {
              if (newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Text list section ───────────────────────────────────────────────────────
function ListSection({
  title,
  icon,
  items,
  onAdd,
  onDelete,
  canEdit,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  onAdd: (v: string) => void;
  onDelete: (i: number) => void;
  canEdit: boolean;
  renderItem?: (item: string) => React.ReactNode;
}) {
  const [newItem, setNewItem] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        {icon}
        <span className="text-sm font-bold uppercase tracking-tight">{title}</span>
      </div>
      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 group text-sm">
              <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
              <span className="flex-1 text-foreground leading-snug">
                {renderItem ? renderItem(item) : item}
              </span>
              {canEdit && (
                <button
                  onClick={() => onDelete(i)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground/60 italic text-center py-4 bg-muted/10 rounded-lg border border-dashed border-border/50">
            Nenhum item.
          </div>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Input
            placeholder="Novo item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
            className="h-7 text-xs bg-muted/30 border-border/40 focus-visible:ring-primary/30"
          />
          <Button size="sm" className="h-7 px-3 text-xs" onClick={() => {
            if (newItem.trim()) { onAdd(newItem.trim()); setNewItem(""); }
          }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Client health item ──────────────────────────────────────────────────────
function ClientHealthItem({
  client,
  onDelete,
  canEdit,
}: {
  client: { name: string; health: number; status?: string };
  onDelete: () => void;
  canEdit: boolean;
}) {
  const hColor =
    client.health <= 3 ? "text-red-400" : client.health <= 6 ? "text-yellow-400" : "text-emerald-400";
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/20 group text-xs">
      <span className="font-medium text-foreground truncate flex-1">{client.name}</span>
      <Badge className={`text-[9px] font-bold shrink-0 ${hColor}`}>{client.health}/10</Badge>
      {client.status && (
        <Badge variant="outline" className="text-[9px] shrink-0">{client.status}</Badge>
      )}
      {canEdit && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
interface TeamMemberNotionTemplateProps {
  member: TeamMember;
  canEdit: boolean;
}

export default function TeamMemberNotionTemplate({
  member,
  canEdit,
}: TeamMemberNotionTemplateProps) {
  const upsert = useUpsertTeamMember();
  const qc = useQueryClient();

  const data = member.notion_data || {};
  const props = data.properties || {};

  const makeId = () => Math.random().toString(36).slice(2);

  // Helper to save notion_data changes
  const save = async (patch: Partial<typeof data>) => {
    try {
      await upsert.mutateAsync({
        id: member.id,
        name: member.name,
        role: member.role,
        notion_data: { ...data, ...patch },
      });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  // Helper to save a single property
  const saveProp = (key: string, value: string) => {
    save({ properties: { ...props, [key]: value } });
  };

  // Checklist helpers
  const tarefas: Array<{ id: string; text: string; done: boolean }> =
    data.tarefas_diarias_checklist || [];
  const plano: Array<{ id: string; text: string; done: boolean }> =
    data.plano_estrategico_checklist || [];

  const toggleItem = (
    key: "tarefas_diarias_checklist" | "plano_estrategico_checklist",
    id: string
  ) => {
    const list = (data[key] || []).map((x: any) =>
      x.id === id ? { ...x, done: !x.done } : x
    );
    save({ [key]: list });
  };

  const addItem = (
    key: "tarefas_diarias_checklist" | "plano_estrategico_checklist",
    text: string
  ) => {
    const list = [...(data[key] || []), { id: makeId(), text, done: false }];
    save({ [key]: list });
  };

  const deleteItem = (
    key: "tarefas_diarias_checklist" | "plano_estrategico_checklist",
    id: string
  ) => {
    const list = (data[key] || []).filter((x: any) => x.id !== id);
    save({ [key]: list });
  };

  // List helpers (plain string arrays)
  const addToList = (key: string, value: string) => {
    const list = [...(data[key] || []), value];
    save({ [key]: list });
  };
  const deleteFromList = (key: string, i: number) => {
    const list = [...(data[key] || [])];
    list.splice(i, 1);
    save({ [key]: list });
  };

  // Client list
  const [newClientName, setNewClientName] = useState("");
  const [newClientHealth, setNewClientHealth] = useState("10");
  const clientesAtivos: Array<{ name: string; health: number; status?: string }> =
    data.clientes_ativos || [];

  return (
    <div className="space-y-2">
      {/* ── HEADER ── */}
      <div className="pb-2 border-b border-border/30 space-y-1">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
          {member.name}
        </h2>
        <Badge
          variant="outline"
          className="text-[10px] font-bold uppercase tracking-wider px-2"
        >
          {member.role}
        </Badge>
      </div>

      {/* ── PROPERTIES ── */}
      <div className="bg-muted/20 rounded-lg border border-border/30 divide-y divide-border/10 overflow-hidden">
        <PropField
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email Contato"
          value={props.email_contato || ""}
          onSave={(v) => saveProp("email_contato", v)}
          canEdit={canEdit}
        />
        <PropField
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email Meta"
          value={props.email_meta || ""}
          onSave={(v) => saveProp("email_meta", v)}
          canEdit={canEdit}
        />
        <PropField
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email Google"
          value={props.email_google || ""}
          onSave={(v) => saveProp("email_google", v)}
          canEdit={canEdit}
        />
        <PropField
          icon={<Phone className="h-3.5 w-3.5" />}
          label="WhatsApp"
          value={props.whatsapp || ""}
          onSave={(v) => saveProp("whatsapp", v)}
          canEdit={canEdit}
        />
        <PropField
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Salário"
          value={props.salario || ""}
          onSave={(v) => saveProp("salario", v)}
          canEdit={canEdit}
        />
        <PropField
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Comissão"
          value={props.comissao || ""}
          onSave={(v) => saveProp("comissao", v)}
          canEdit={canEdit}
        />
      </div>

      {/* ── 2-col grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

        {/* Tarefas Diárias */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <ChecklistSection
            title="Tarefas Diárias"
            icon={<Square className="h-4 w-4 text-primary" />}
            items={tarefas}
            onToggle={(id) => toggleItem("tarefas_diarias_checklist", id)}
            onAdd={(text) => addItem("tarefas_diarias_checklist", text)}
            onDelete={(id) => deleteItem("tarefas_diarias_checklist", id)}
            canEdit={canEdit}
          />
        </div>

        {/* Plano Estratégico */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <ChecklistSection
            title="Plano Estratégico - Semanal"
            icon={<Target className="h-4 w-4 text-primary" />}
            items={plano}
            onToggle={(id) => toggleItem("plano_estrategico_checklist", id)}
            onAdd={(text) => addItem("plano_estrategico_checklist", text)}
            onDelete={(id) => deleteItem("plano_estrategico_checklist", id)}
            canEdit={canEdit}
          />
        </div>

        {/* Clientes Ativos */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold uppercase tracking-tight">
              Clientes Ativos ({clientesAtivos.length})
            </span>
          </div>
          <div className="space-y-1 max-h-[260px] overflow-y-auto">
            {clientesAtivos.length > 0 ? (
              clientesAtivos.map((c, i) => (
                <ClientHealthItem
                  key={i}
                  client={c}
                  onDelete={() => {
                    const list = clientesAtivos.filter((_, j) => j !== i);
                    save({ clientes_ativos: list });
                  }}
                  canEdit={canEdit}
                />
              ))
            ) : (
              <div className="text-xs text-muted-foreground/60 italic text-center py-4 bg-muted/10 rounded-lg border border-dashed border-border/50">
                Nenhum cliente ativo.
              </div>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Input
                placeholder="Nome do cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="h-7 text-xs bg-muted/30 border-border/40 flex-1"
              />
              <Input
                placeholder="Saúde (0-10)"
                value={newClientHealth}
                onChange={(e) => setNewClientHealth(e.target.value)}
                className="h-7 text-xs bg-muted/30 border-border/40 w-24"
              />
              <Button
                size="sm"
                className="h-7 px-3 text-xs shrink-0"
                onClick={() => {
                  if (!newClientName.trim()) return;
                  const list = [
                    ...clientesAtivos,
                    {
                      name: newClientName.trim(),
                      health: Number(newClientHealth) || 10,
                      status: "Ativo",
                    },
                  ];
                  save({ clientes_ativos: list });
                  setNewClientName("");
                  setNewClientHealth("10");
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Reuniões */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <ListSection
            title="Reuniões"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            items={data.reunioes || []}
            onAdd={(v) => addToList("reunioes", v)}
            onDelete={(i) => deleteFromList("reunioes", i)}
            canEdit={canEdit}
          />
        </div>

        {/* Links Úteis */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <ListSection
            title="Links Úteis"
            icon={<Link2 className="h-4 w-4 text-primary" />}
            items={data.links || []}
            onAdd={(v) => addToList("links", v)}
            onDelete={(i) => deleteFromList("links", i)}
            canEdit={canEdit}
            renderItem={(item) =>
              item.startsWith("http") ? (
                <a href={item} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {item}
                </a>
              ) : (
                <span>{item}</span>
              )
            }
          />
        </div>

        {/* Gravação / Anotações de Call */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Video className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold uppercase tracking-tight">Gravação da Call</span>
          </div>
          {canEdit ? (
            <textarea
              className="w-full bg-muted/30 border border-border/40 rounded-md text-xs text-foreground p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[80px]"
              value={data.gravacao || ""}
              onChange={(e) => {/* debounce handled on blur */}}
              onBlur={(e) => save({ gravacao: e.target.value })}
              defaultValue={data.gravacao || ""}
              placeholder="Link ou anotações da gravação..."
            />
          ) : (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {data.gravacao || <span className="italic opacity-50">Vazio</span>}
            </p>
          )}
        </div>

        {/* Inteligência de Tráfego */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <ListSection
            title="Inteligência de Tráfego"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            items={data.inteligencia_trafego || []}
            onAdd={(v) => addToList("inteligencia_trafego", v)}
            onDelete={(i) => deleteFromList("inteligencia_trafego", i)}
            canEdit={canEdit}
          />
        </div>

      </div>

      {/* ── Conteúdo Principal / Observações ── */}
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-tight">Observações Gerais</span>
        </div>
        {canEdit ? (
          <textarea
            className="w-full bg-muted/30 border border-border/40 rounded-md text-xs text-foreground p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[120px]"
            onBlur={(e) => save({ conteudo_principal: e.target.value })}
            defaultValue={data.conteudo_principal || ""}
            placeholder="Observações, anotações gerais, contexto..."
          />
        ) : (
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
            {data.conteudo_principal || <span className="italic opacity-50">Vazio</span>}
          </pre>
        )}
      </div>

      {/* ── Subpáginas ── */}
      {(data.subpaginas || []).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            📁 Subpáginas
          </p>
          {(data.subpaginas || []).map((sp: any, i: number) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">{sp.titulo}</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                {sp.conteudo}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
