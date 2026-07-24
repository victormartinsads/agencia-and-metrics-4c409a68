import { useState } from "react";
import {
  Image,
  Smile,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Check,
  User,
  Tag,
  Calendar,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMOJI_PRESETS = [
  "📄", "📋", "⚡", "🎯", "🚀", "💡", "📁", "⚙️", 
  "🔥", "📊", "📝", "📌", "✨", "⭐", "🎨", "💻", 
  "🛠️", "🏆", "📈", "🤝", "🔍", "📅", "🔒", "💎", 
  "🔖", "🌐", "🏷️", "🧠", "💼", "🔑", "📦"
];

const COVER_PRESETS = [
  {
    name: "Fluido Industrial (AND)",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000",
  },
  {
    name: "Código e Workspace",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2000",
  },
  {
    name: "Textura Abstrata Dark",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000",
  },
  {
    name: "Gradiente Verde Mídia",
    url: "gradient:emerald",
  },
  {
    name: "Gradiente Deep Purple",
    url: "gradient:purple",
  },
];

const STATUS_OPTIONS = [
  { label: "Rascunho", value: "RASCUNHO", color: "bg-gray-500/20 text-gray-400 border-gray-500/40", icon: "⚪" },
  { label: "Em Andamento", value: "EM_ANDAMENTO", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", icon: "🟢" },
  { label: "Em Revisão", value: "EM_REVISAO", color: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: "🟡" },
  { label: "Concluído", value: "CONCLUIDO", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", icon: "✅" },
];

interface NotionPageHeaderProps {
  iconEmoji?: string | null;
  coverUrl?: string | null;
  title: string;
  onUpdateIcon: (emoji: string | null) => void;
  onUpdateCover: (url: string | null) => void;
  onUpdateTitle: (title: string) => void;
  onTitleBlur?: () => void;
  subtitle?: string;
  createdAt?: string;

  // New Notion Pro Properties
  status?: string | null;
  onUpdateStatus?: (status: string | null) => void;
  assignee?: string | null;
  onUpdateAssignee?: (assignee: string | null) => void;
  tags?: string[] | null;
  onUpdateTags?: (tags: string[] | null) => void;
  dueDate?: string | null;
  onUpdateDueDate?: (date: string | null) => void;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function NotionPageHeader({
  iconEmoji,
  coverUrl,
  title,
  onUpdateIcon,
  onUpdateCover,
  onUpdateTitle,
  onTitleBlur,
  subtitle = "Página de Processo Operacional",
  createdAt,
  status = "EM_ANDAMENTO",
  onUpdateStatus,
  assignee = "",
  onUpdateAssignee,
  tags = [],
  onUpdateTags,
  dueDate = "",
  onUpdateDueDate,
  isFullWidth = false,
  onToggleFullWidth,
}: NotionPageHeaderProps) {
  const [customUrl, setCustomUrl] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const currentStatusObj = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[1];

  const handleAddTag = () => {
    if (!newTagInput.trim() || !onUpdateTags) return;
    const currentTags = tags || [];
    if (!currentTags.includes(newTagInput.trim())) {
      onUpdateTags([...currentTags, newTagInput.trim()]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!onUpdateTags) return;
    const currentTags = tags || [];
    onUpdateTags(currentTags.filter((t) => t !== tagToRemove));
  };

  const renderCoverBg = () => {
    if (!coverUrl) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a9d96]/15 via-[#191919] to-[#191919]" />
      );
    }
    if (coverUrl === "gradient:emerald") {
      return (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-[#191919] to-teal-950/60" />
      );
    }
    if (coverUrl === "gradient:purple") {
      return (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950 via-[#191919] to-indigo-950/60" />
      );
    }
    return (
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: `url(${coverUrl})` }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Cover Image Banner */}
      <div className="h-44 md:h-52 w-full relative group overflow-hidden border-b border-[#2c2c2b]">
        {renderCoverBg()}

        {/* Top Controls on Banner */}
        <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 z-10">
          {onToggleFullWidth && (
            <Button
              size="sm"
              onClick={onToggleFullWidth}
              className="h-7 text-xs bg-black/70 hover:bg-black text-[#e3e2e0] border border-white/20 px-2.5 rounded-[4px] backdrop-blur-md"
              title={isFullWidth ? "Modo leitura (centralizado)" : "Modo largura total"}
            >
              {isFullWidth ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1 text-[#7a9d96]" /> Leitura
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1 text-[#7a9d96]" /> Largura Total
                </>
              )}
            </Button>
          )}

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                className="h-7 text-xs bg-black/70 hover:bg-black text-[#e3e2e0] border border-white/20 px-2.5 rounded-[4px] backdrop-blur-md"
              >
                <Image className="h-3.5 w-3.5 mr-1 text-[#7a9d96]" /> Alterar Capa
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3 bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#2c2c2b] pb-2">
                  <span className="text-xs font-bold text-[#e3e2e0] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#7a9d96]" /> Seleção de Capa
                  </span>
                </div>

                {/* Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#9b9a97] uppercase font-bold">Capas Predefinidas</span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {COVER_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        onClick={() => {
                          onUpdateCover(preset.url);
                          setPopoverOpen(false);
                        }}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#191919] hover:bg-[#2c2c2b] border border-[#2c2c2b] text-xs text-left transition-colors cursor-pointer"
                      >
                        <span className="truncate">{preset.name}</span>
                        {coverUrl === preset.url && <Check className="h-3.5 w-3.5 text-[#7a9d96] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL */}
                <div className="space-y-1.5 pt-1 border-t border-[#2c2c2b]">
                  <span className="text-[10px] text-[#9b9a97] uppercase font-bold">URL da Imagem</span>
                  <div className="flex gap-1.5">
                    <Input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.png"
                      className="h-7 text-xs bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b]"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customUrl.trim()) {
                          onUpdateCover(customUrl.trim());
                          setCustomUrl("");
                          setPopoverOpen(false);
                        }
                      }}
                      className="h-7 text-xs bg-[#7a9d96] hover:bg-[#7a9d96]/90 text-black font-bold px-2.5 shrink-0"
                    >
                      <LinkIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {coverUrl && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onUpdateCover(null)}
              className="h-7 text-xs bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-300 px-2.5 rounded-[4px] backdrop-blur-md font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover Capa
            </Button>
          )}
        </div>
      </div>

      {/* Main Title & Properties Section */}
      <div className={cn("mx-auto px-6 md:px-16 relative transition-all duration-300", isFullWidth ? "max-w-full" : "max-w-4xl")}>
        {/* Emoji Icon Container */}
        <div className="-mt-9 mb-4 flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-16 w-16 bg-[#202020] border-2 border-[#7a9d96]/40 hover:border-[#7a9d96] flex items-center justify-center rounded-2xl shadow-xl transition-all hover:scale-105 cursor-pointer group relative"
                title="Clique para alterar o ícone"
              >
                <span className="text-3xl select-none">
                  {iconEmoji || "📄"}
                </span>
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Smile className="h-5 w-5 text-[#7a9d96]" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3 bg-[#202020] border-[#2c2c2b] shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#2c2c2b] pb-2">
                  <span className="text-xs font-bold text-[#e3e2e0] uppercase tracking-wider">
                    Escolher Ícone
                  </span>
                  {iconEmoji && (
                    <button
                      onClick={() => onUpdateIcon(null)}
                      className="text-[10px] text-red-400 hover:underline font-semibold"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onUpdateIcon(emoji)}
                      className="h-8 w-8 text-xl flex items-center justify-center rounded hover:bg-[#2c2c2b] transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {!iconEmoji && (
            <button
              onClick={() => onUpdateIcon("📄")}
              className="text-xs text-[#9b9a97] hover:text-[#7a9d96] flex items-center gap-1 font-semibold transition-colors mt-4"
            >
              <Smile className="h-3.5 w-3.5" /> Adicionar Ícone
            </button>
          )}
        </div>

        {/* Title Input */}
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            onBlur={onTitleBlur}
            placeholder="Sem título"
            className="w-full bg-transparent border-none text-4xl font-bold text-white focus:ring-0 outline-none p-0 tracking-tight"
          />

          {/* Notion Pro Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y border-[#2c2c2b]/40 text-xs">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-[#5f5e5b] text-[11px] font-medium w-24 shrink-0 flex items-center gap-1">
                <Circle className="h-3 w-3 text-[#7a9d96]" /> Status:
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer",
                      currentStatusObj.color
                    )}
                  >
                    <span>{currentStatusObj.icon}</span>
                    <span>{currentStatusObj.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-44 p-1.5 bg-[#202020] border-[#2c2c2b] space-y-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onUpdateStatus?.(opt.value)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-[#e3e2e0] hover:bg-[#2c2c2b] transition-colors text-left"
                    >
                      <span>{opt.icon}</span>
                      <span className="font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Responsável */}
            <div className="flex items-center gap-2">
              <span className="text-[#5f5e5b] text-[11px] font-medium w-24 shrink-0 flex items-center gap-1">
                <User className="h-3 w-3 text-[#7a9d96]" /> Responsável:
              </span>
              <input
                type="text"
                value={assignee || ""}
                onChange={(e) => onUpdateAssignee?.(e.target.value)}
                placeholder="Definir..."
                className="bg-transparent border-b border-transparent hover:border-[#2c2c2b] focus:border-[#7a9d96] text-xs text-[#e3e2e0] focus:ring-0 outline-none px-1 py-0.5 transition-colors w-full"
              />
            </div>

            {/* Prazo / Due Date */}
            <div className="flex items-center gap-2">
              <span className="text-[#5f5e5b] text-[11px] font-medium w-24 shrink-0 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#7a9d96]" /> Prazo:
              </span>
              <input
                type="date"
                value={dueDate || ""}
                onChange={(e) => onUpdateDueDate?.(e.target.value)}
                className="bg-[#191919] border border-[#2c2c2b] rounded px-1.5 py-0.5 text-[11px] text-[#e3e2e0] focus:ring-0 outline-none"
              />
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2">
              <span className="text-[#5f5e5b] text-[11px] font-medium w-24 shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3 text-[#7a9d96]" /> Tags:
              </span>
              <div className="flex items-center gap-1 flex-wrap min-w-0">
                {(tags || []).map((t) => (
                  <span
                    key={t}
                    className="bg-[#7a9d96]/15 text-[#7a9d96] border border-[#7a9d96]/30 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                  >
                    <span>{t}</span>
                    <button onClick={() => handleRemoveTag(t)} className="hover:text-red-400">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 text-[#9b9a97] hover:text-[#7a9d96] rounded hover:bg-[#2c2c2b]">
                      <Plus className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-2 bg-[#202020] border-[#2c2c2b]">
                    <div className="flex gap-1">
                      <Input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                        placeholder="Nova tag..."
                        className="h-6 text-xs bg-[#191919] border-[#2c2c2b] text-[#e3e2e0]"
                      />
                      <Button size="sm" onClick={handleAddTag} className="h-6 text-xs bg-[#7a9d96] text-black font-bold px-2">
                        +
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
