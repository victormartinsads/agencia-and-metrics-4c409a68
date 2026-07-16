import { useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Square,
  Mail,
  Phone,
  DollarSign,
  User,
  Link2,
  Video,
  Calendar,
  Target,
  Users,
  AlertCircle,
  BookOpen,
  Flag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpsertTeamMember, TeamMember } from "@/hooks/useGestorDiary";

// ─── Notion Property Row ─────────────────────────────────────────────────────
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
    <div className="flex items-center text-xs py-1 hover:bg-[#202020] px-2 rounded transition-colors group h-7">
      <div className="w-40 flex items-center gap-2 text-[#9b9a97] select-none shrink-0 font-medium">
        <span className="opacity-70">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        {canEdit ? (
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => local !== value && onSave(local)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="Vazio"
            className="w-full bg-transparent border-none outline-none focus:ring-0 rounded px-1 text-[#e3e2e0] hover:bg-[#252525] focus:bg-[#252525] transition-all placeholder:italic placeholder:opacity-30"
          />
        ) : isLink ? (
          <a href={local} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block px-1">
            {local}
          </a>
        ) : (
          <div className="px-1 text-[#e3e2e0] truncate">
            {local || <span className="text-[#5f5e5b] italic">Vazio</span>}
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
      <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
        <span className="text-primary select-none">{icon}</span>
        <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">{title}</span>
      </div>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 group">
              <button
                disabled={!canEdit}
                onClick={() => onToggle(item.id)}
                className="mt-0.5 shrink-0 text-[#9b9a97] hover:text-[#e3e2e0] transition-colors disabled:cursor-not-allowed"
              >
                {item.done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span
                className={`text-xs flex-1 break-words leading-relaxed ${
                  item.done ? "line-through text-[#5f5e5b] opacity-60" : "text-[#e3e2e0]"
                }`}
              >
                {item.text}
              </span>
              {canEdit && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-[#5f5e5b] hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-[#9b9a97] italic text-center py-4 bg-[#262625] border border-dashed border-[#2c2c2b] rounded-[6px]">
            Sem itens pendentes.
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2b]/30">
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
            className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px]"
          />
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white rounded-[4px]"
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
      <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
        <span className="text-primary select-none">{icon}</span>
        <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">{title}</span>
      </div>
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 group text-xs">
              <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
              <span className="flex-1 text-[#e3e2e0] leading-relaxed">
                {renderItem ? renderItem(item) : item}
              </span>
              {canEdit && (
                <button
                  onClick={() => onDelete(i)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-[#5f5e5b] hover:text-red-400 transition-all p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-[#9b9a97] italic text-center py-4 bg-[#262625] border border-dashed border-[#2c2c2b] rounded-[6px]">
            Nenhum item adicionado.
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2b]/30">
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
            className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px]"
          />
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white rounded-[4px]"
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
    <div className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded hover:bg-[#252525] group text-xs">
      <span className="font-medium text-[#e3e2e0] truncate flex-1">{client.name}</span>
      <span className={`text-[10px] font-mono font-bold shrink-0 ${hColor}`}>{client.health}/10</span>
      {client.status && (
        <span className="text-[9px] text-[#9b9a97] border border-[#2c2c2b] rounded px-1 py-0.5 shrink-0 bg-[#262625]">
          {client.status}
        </span>
      )}
      {canEdit && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-[#5f5e5b] hover:text-red-400 transition-all shrink-0 p-0.5">
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

  const data = member.notion_data || {};
  const props = data.properties || {};

  const makeId = () => Math.random().toString(36).slice(2);

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

  const saveProp = (key: string, value: string) => {
    save({ properties: { ...props, [key]: value } });
  };

  const tarefas = data.tarefas_diarias_checklist || [];
  const plano = data.plano_estrategico_checklist || [];

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

  const addToList = (key: string, value: string) => {
    const list = [...(data[key] || []), value];
    save({ [key]: list });
  };

  const deleteFromList = (key: string, i: number) => {
    const list = [...(data[key] || [])];
    list.splice(i, 1);
    save({ [key]: list });
  };

  const [newClientName, setNewClientName] = useState("");
  const [newClientHealth, setNewClientHealth] = useState("10");
  const clientesAtivos = data.clientes_ativos || [];

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="pb-4 border-b border-[#2c2c2b] space-y-4">
        {/* Large emoji icon above title */}
        <div className="text-4xl select-none filter drop-shadow-sm pb-1">👤</div>
        <h1 className="text-3xl font-bold tracking-tight text-[#e3e2e0] font-sans">
          {member.name}
        </h1>
        <span className="text-[10px] text-[#9b9a97] bg-[#262625] border border-[#2c2c2b] rounded px-2 py-0.5 uppercase tracking-wider font-semibold w-fit block">
          {member.role}
        </span>
      </div>

      {/* ── PROPERTIES ── */}
      <div className="max-w-xl space-y-0.5 pt-1">
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

      <div className="border-b border-[#2c2c2b] pt-2" />

      {/* ── Notion database blocks grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Tarefas Diárias */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4">
          <ChecklistSection
            title="Tarefas Diárias"
            icon={<Square className="h-4 w-4" />}
            items={tarefas}
            onToggle={(id) => toggleItem("tarefas_diarias_checklist", id)}
            onAdd={(text) => addItem("tarefas_diarias_checklist", text)}
            onDelete={(id) => deleteItem("tarefas_diarias_checklist", id)}
            canEdit={canEdit}
          />
        </div>

        {/* Plano Estratégico */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4">
          <ChecklistSection
            title="Plano Estratégico - Semanal"
            icon={<Target className="h-4 w-4" />}
            items={plano}
            onToggle={(id) => toggleItem("plano_estrategico_checklist", id)}
            onAdd={(text) => addItem("plano_estrategico_checklist", text)}
            onDelete={(id) => deleteItem("plano_estrategico_checklist", id)}
            canEdit={canEdit}
          />
        </div>

        {/* Clientes Ativos */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-3 flex flex-col h-full">
          <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">
              Clientes Ativos ({clientesAtivos.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto flex-1">
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
              <p className="text-xs text-[#9b9a97] italic text-center py-4 bg-[#262625] border border-dashed border-[#2c2c2b] rounded-[6px]">
                Nenhum cliente ativo.
              </p>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#2c2c2b]/30">
              <Input
                placeholder="Nome do cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px] flex-1"
              />
              <Input
                placeholder="Saúde (0-10)"
                value={newClientHealth}
                onChange={(e) => setNewClientHealth(e.target.value)}
                className="h-7 text-xs bg-[#202020] border-[#2c2c2b] focus-visible:ring-0 focus-visible:border-[#3f3f3e] rounded-[4px] w-24"
              />
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-primary hover:bg-primary/95 text-white rounded-[4px] shrink-0"
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
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4">
          <ListSection
            title="Reuniões"
            icon={<Calendar className="h-4 w-4" />}
            items={data.reunioes || []}
            onAdd={(v) => addToList("reunioes", v)}
            onDelete={(i) => deleteFromList("reunioes", i)}
            canEdit={canEdit}
          />
        </div>

        {/* Links Úteis */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4">
          <ListSection
            title="Links Úteis"
            icon={<Link2 className="h-4 w-4" />}
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
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
            <Video className="h-4 w-4 text-[#e3e2e0]" />
            <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">Gravação da Call</span>
          </div>
          {canEdit ? (
            <textarea
              className="w-full bg-[#202020] border border-[#2c2c2b] rounded-[6px] text-xs text-[#e3e2e0] p-2 resize-none focus:outline-none focus:ring-0 focus:border-[#3f3f3e] min-h-[80px]"
              defaultValue={data.gravacao || ""}
              onBlur={(e) => save({ gravacao: e.target.value })}
              placeholder="Link ou anotações da gravação..."
            />
          ) : (
            <p className="text-xs text-[#9b9a97] whitespace-pre-wrap leading-relaxed">
              {data.gravacao || <span className="italic opacity-50">Vazio</span>}
            </p>
          )}
        </div>

        {/* Inteligência de Tráfego */}
        <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4">
          <ListSection
            title="Inteligência de Tráfego"
            icon={<BookOpen className="h-4 w-4" />}
            items={data.inteligencia_trafego || []}
            onAdd={(v) => addToList("inteligencia_trafego", v)}
            onDelete={(i) => deleteFromList("inteligencia_trafego", i)}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* ── Conteúdo Principal / Observações ── */}
      <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#2c2c2b]/30 pb-2">
          <AlertCircle className="h-4 w-4 text-[#e3e2e0]" />
          <span className="text-[12px] font-semibold text-[#e3e2e0] tracking-wide">Observações Gerais</span>
        </div>
        {canEdit ? (
          <textarea
            className="w-full bg-[#202020] border border-[#2c2c2b] rounded-[6px] text-xs text-[#e3e2e0] p-2 resize-none focus:outline-none focus:ring-0 focus:border-[#3f3f3e] min-h-[120px]"
            defaultValue={data.conteudo_principal || ""}
            onBlur={(e) => save({ conteudo_principal: e.target.value })}
            placeholder="Observações, anotações gerais, contexto..."
          />
        ) : (
          <pre className="text-xs text-[#9b9a97] whitespace-pre-wrap leading-relaxed font-sans">
            {data.conteudo_principal || <span className="italic opacity-50">Vazio</span>}
          </pre>
        )}
      </div>

      {/* ── Subpáginas ── */}
      {(data.subpaginas || []).length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-semibold tracking-wider text-[#9b9a97] uppercase select-none">
            📁 Subpáginas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data.subpaginas || []).map((sp: any, i: number) => (
              <div key={i} className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-4 space-y-2">
                <p className="text-xs font-semibold text-[#e3e2e0]">{sp.titulo}</p>
                <pre className="text-xs text-[#9b9a97] whitespace-pre-wrap leading-relaxed font-sans">
                  {sp.conteudo}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
